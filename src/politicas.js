import { elegir } from './rng.js';
import { intenciones, nombreDe } from './adaptador.js';

// 50% botón al azar, 50% texto con una forma del catálogo y un parámetro presente.
export function aleatoria(sim, rng) {
  if (rng() < 0.5) {
    const a = elegir(rng, sim.acciones());
    return { tipo: 'boton', intencion: a.intencion, parametros: a.parametros };
  }
  const i = elegir(rng, intenciones);
  const forma = elegir(rng, i.formas);
  const est = sim.estado();
  const candidatos = [...est.npcsPresentes, ...est.objetos, est.escena];
  const extra = rng() < 0.7 ? nombreDe(elegir(rng, candidatos)) : '';
  return { tipo: 'texto', texto: `${forma} ${extra}`.trim(), intencion: i.id };
}

export const politicas = { aleatoria };

// ---- F2: política por perfil ----
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { verbos, intencionDeVerbo, escenas, conocimientos, palabrasClave, leerPistaCamino } from './adaptador.js';

const leerConfig = (n) => JSON.parse(fs.readFileSync(fileURLToPath(new URL(`../config/${n}`, import.meta.url)), 'utf8'));
export const FRASES_PRIMERIZO = leerConfig('frases-primerizo.json');
export const ADVERSARIAL = leerConfig('adversarial.json');
export const PLANTILLAS_CONSULTA = ['{kw}', 'hablame sobre {kw}', 'contame de {kw}', 'qué sabés de {kw}', '{npc}, {kw}?'];

const REQUIERE_NPC = new Set(['hablar_con', 'ayudar', 'presionar', 'emboscar', 'negociar']);
const NPC_OPCIONAL = new Set(['observar', 'distraer', 'defender', 'usar']);
const TAGS_A_REPARAR = new Set(['desconfianza', 'rencor', 'miedo']);
const FALLOS = new Set(['reformula', 'no_entendido']);

const FILAS = ['qwertyuiop', 'asdfghjklñ', 'zxcvbnm'];
function vecina(c, rng) {
  for (let f = 0; f < FILAS.length; f++) {
    const i = FILAS[f].indexOf(c);
    if (i < 0) continue;
    const op = [FILAS[f][i - 1], FILAS[f][i + 1], FILAS[f - 1]?.[i], FILAS[f + 1]?.[i]].filter(Boolean);
    return elegir(rng, op);
  }
  return c;
}

export function conTypo(palabra, rng) {
  if (palabra.length < 2) return palabra;
  const i = Math.floor(rng() * palabra.length);
  switch (Math.floor(rng() * 4)) {
    case 0: { const j = Math.min(i, palabra.length - 2); return palabra.slice(0, j) + palabra[j + 1] + palabra[j] + palabra.slice(j + 2); }
    case 1: return palabra.slice(0, i) + palabra.slice(i + 1);
    case 2: return palabra.slice(0, i + 1) + palabra[i] + palabra.slice(i + 1);
    default: return palabra.slice(0, i) + vecina(palabra[i].toLowerCase(), rng) + palabra.slice(i + 1);
  }
}

export function aplicarRuido(texto, ruido, rng) {
  let t = texto.split(' ').map((w) => (rng() < ruido.typos ? conTypo(w, rng) : w)).join(' ');
  if (rng() < ruido.mayusculas) t = t.toUpperCase();
  if (rng() < ruido.incompletas && t.length > 3) t = t.slice(0, Math.max(1, Math.floor(t.length * (0.3 + 0.5 * rng())))).trimEnd();
  return t;
}

export function elegirPonderado(pesos, rng) {
  const items = Object.entries(pesos).filter(([, w]) => w > 0);
  const total = items.reduce((a, [, w]) => a + w, 0);
  if (total <= 0) return null;
  let x = rng() * total;
  for (const [k, w] of items) { x -= w; if (x < 0) return k; }
  return items[items.length - 1][0];
}

// Próximo paso (salida) hacia la escena más cercana de `destinos`, por BFS sobre las salidas.
export function siguientePaso(origen, destinos) {
  const metas = new Set(destinos);
  if (metas.size === 0 || metas.has(origen)) return null;
  const previo = new Map([[origen, null]]);
  const cola = [origen];
  while (cola.length) {
    const x = cola.shift();
    for (const s of escenas.get(x)?.salidas ?? []) {
      if (previo.has(s)) continue;
      previo.set(s, x);
      if (metas.has(s)) {
        let paso = s;
        while (previo.get(paso) !== origen) paso = previo.get(paso);
        return paso;
      }
      cola.push(s);
    }
  }
  return null;
}

const disponible = (verbo, d, pool) => {
  if (verbo === 'consulta_tema') return d.npcs.length > 0 && pool.length > 0;
  if (REQUIERE_NPC.has(verbo)) return d.npcs.length > 0;
  if (verbo === 'usar') return d.objetos.length > 0;
  if (verbo === 'atacar') return d.npcs.length > 0 || d.objetos.length > 0;
  if (verbo === 'viajar') return d.destinos.length > 0;
  return true;
};

// Pesos efectivos del turno: solo acciones disponibles, con el sesgo del objetivo. Devuelve también los parámetros preferidos.
export function pesosDelTurno(perfil, d, mem) {
  const pool = poolDeTemas(perfil, d, mem);
  const pesos = {};
  for (const [v, w] of Object.entries(perfil.pesos)) if (w > 0 && disponible(v, d, pool)) pesos[v] = w;
  const pref = { destino: null, npcId: null, temas: null };
  const s = perfil.objetivo.sesgo;
  const por = (v) => { if (pesos[v] !== undefined) pesos[v] *= s; };
  const temasCaso = () => d.pistas.filter((p) => !p.revelado && d.npcs.some((n) => n.id === p.npcId))
    .flatMap((p) => conocimientos.find((k) => k.id === p.conocimientoId)?.palabrasClave ?? []);
  switch (perfil.objetivo.tipo) {
    case 'agotar_conocimientos': {
      const sinPreguntar = pool.filter((kw) => !mem.preguntadas.has(kw));
      if (sinPreguntar.length) { por('consulta_tema'); delete pesos.viajar; pref.temas = sinPreguntar; }
      break;
    }
    case 'visitar_todas_las_escenas': {
      const nuevas = d.destinos.filter((x) => !mem.visitadas.has(x));
      if (nuevas.length) { por('viajar'); pref.destino = nuevas; }
      break;
    }
    case 'seguir_pistas':
      // Fuente "narracion": solo sigue la pista de camino leída en el texto narrado; no mira el estado del caso.
      if (perfil.objetivo.fuente === 'narracion') {
        const pista = mem.pistaCamino;
        if (!pista) break;
        if (d.escena === pista.escena) {
          const temas = conocimientos.filter((k) => k.npcId === pista.npcId).flatMap((k) => k.palabrasClave);
          if (d.npcs.some((n) => n.id === pista.npcId)) {
            pref.npcId = pista.npcId;
            if (temas.length) pref.temas = temas;
          }
          por('consulta_tema'); por('hablar_con'); por('ayudar');
        } else {
          const paso = siguientePaso(d.escena, [pista.escena]);
          if (paso && d.destinos.includes(paso)) { por('viajar'); pref.destino = [paso]; }
        }
        break;
      }
    // falls through
    case 'desenlace_directo': {
      const metas = perfil.objetivo.tipo === 'seguir_pistas'
        ? [...d.escenasPendientes, ...d.pistas.filter((p) => !p.revelado && p.escena).map((p) => p.escena)]
        : d.escenasPendientes;
      const temas = temasCaso();
      if (metas.includes(d.escena) || temas.length) {
        if (temas.length && pesos.consulta_tema === undefined && d.npcs.length) pesos.consulta_tema = perfil.pesos.consulta_tema ?? 0;
        por('consulta_tema'); por('hablar_con');
        if (temas.length) pref.temas = temas;
      } else {
        const paso = siguientePaso(d.escena, metas);
        if (paso && d.destinos.includes(paso)) { por('viajar'); pref.destino = [paso]; }
      }
      break;
    }
    case 'reparar_relaciones': {
      const npc = d.npcs.find((n) => d.tagsCaso.some((t) => t.objetivo === n.id && TAGS_A_REPARAR.has(t.tipo)));
      if (npc) { por('ayudar'); por('calmar_la_situacion'); pref.npcId = npc.id; }
      break;
    }
    default:
  }
  return { pesos, pref, pool };
}

function poolDeTemas(perfil, d, mem) {
  if (perfil.aprendeDeRespuestas) return [...mem.aprendidas];
  const presentes = new Set(d.npcs.map((n) => n.id));
  return conocimientos.filter((k) => presentes.has(k.npcId)).flatMap((k) => k.palabrasClave);
}

function pBotonDe(perfil, turno) {
  const ev = perfil.evolucion;
  if (!ev) return perfil.entrada.pBoton;
  const p = perfil.entrada.pBoton + Math.floor((turno - 1) / ev.cadaTurnos) * ev.pBoton;
  return Math.min(1, Math.max(ev.minPBoton, p));
}

function armarAccion(verbo, d, pref, rng) {
  const npc = (pref.npcId && d.npcs.find((n) => n.id === pref.npcId)) || (d.npcs.length ? elegir(rng, d.npcs) : null);
  const objeto = d.objetos.length ? elegir(rng, d.objetos) : null;
  const parametros = {};
  if (verbo === 'viajar') parametros.destino = pref.destino ? elegir(rng, pref.destino) : elegir(rng, d.destinos);
  else if (REQUIERE_NPC.has(verbo) && npc) parametros.npcId = npc.id;
  else if (verbo === 'atacar') { if (npc) parametros.npcId = npc.id; else if (objeto) parametros.objetoId = objeto.id; }
  if (['usar', 'examinar', 'comprar', 'negociar'].includes(verbo) && objeto && (verbo === 'usar' || rng() < 0.5)) parametros.objetoId = objeto.id;
  if (NPC_OPCIONAL.has(verbo) && npc && !parametros.npcId && rng() < 0.5) parametros.npcId = npc.id;
  return parametros;
}

function textoDeAccion(verbo, parametros, d, perfil, rng) {
  const intencion = intencionDeVerbo.get(verbo);
  const partes = [elegir(rng, intencion.formas)];
  const npc = d.npcs.find((n) => n.id === parametros.npcId);
  if (npc && (verbo !== 'hablar_con' || rng() < perfil.ruido.nombraNpc)) partes.push(npc.nombre);
  const objeto = d.objetos.find((x) => x.id === parametros.objetoId);
  if (objeto) partes.push(objeto.nombre);
  if (parametros.destino) partes.push(escenas.get(parametros.destino)?.nombre ?? '');
  return partes.join(' ').trim();
}

function textoDeConsulta(d, pref, pool, perfil, rng) {
  const kw = elegir(rng, pref.temas?.length ? pref.temas : pool);
  const npc = d.npcs.length ? elegir(rng, d.npcs) : null;
  let plantilla = elegir(rng, PLANTILLAS_CONSULTA);
  const nombra = npc && rng() < perfil.ruido.nombraNpc;
  if (plantilla.includes('{npc}') && !nombra) plantilla = 'qué sabés de {kw}';
  let t = plantilla.replace('{kw}', kw).replace('{npc}', npc?.nombre ?? '');
  if (nombra && !plantilla.includes('{npc}')) t = `${npc.nombre}, ${t}`;
  return { texto: t, kw };
}

const claveAccion = (e) => `${e.intencion}|${JSON.stringify(e.parametros ?? {})}|${e.tipo === 'boton' ? '' : e.verbo}`;

// Política con memoria para un run. `elegir(sim, rng, ctx)` y `observar(entrada, resultado)`.
export function crearPoliticaPerfil(perfil) {
  const mem = { visitadas: new Set(), preguntadas: new Set(), aprendidas: new Set(), ultimas: [], ultimoFallo: null, pistaCamino: null };
  return {
    elegir(sim, rng, { turno }) {
      const d = sim.detalle();
      mem.visitadas.add(d.escena);
      if (turno <= perfil.entrada.genericoHastaTurno && rng() < perfil.entrada.pGenerico) {
        return { tipo: 'texto', texto: aplicarRuido(elegir(rng, FRASES_PRIMERIZO), perfil.ruido, rng), intencion: 'generico' };
      }
      if (rng() < perfil.ruido.adversarial) return { tipo: 'texto', texto: elegir(rng, ADVERSARIAL), intencion: 'adversarial' };
      const { pesos, pref, pool } = pesosDelTurno(perfil, d, mem);
      let verbo = null;
      if (mem.ultimoFallo && rng() < perfil.repiteSiFalla && (pesos[mem.ultimoFallo] !== undefined)) verbo = mem.ultimoFallo;
      verbo ??= elegirPonderado(pesos, rng);
      let sinAccion = false;
      if (!verbo) { sinAccion = true; verbo = 'observar'; }
      let entrada = this.construir(verbo, d, pref, pool, rng, turno);
      // Sin repetir la misma acción exacta más de 2 veces seguidas (salvo reintento por fallo).
      const k = claveAccion(entrada);
      if (verbo !== mem.ultimoFallo && mem.ultimas.length >= 2 && mem.ultimas.slice(-2).every((x) => x === k)) {
        const otros = { ...pesos };
        delete otros[verbo];
        const v2 = elegirPonderado(otros, rng);
        if (v2) entrada = this.construir(v2, d, pref, pool, rng, turno);
      }
      if (sinAccion) entrada.sinAccion = true;
      return entrada;
    },
    construir(verbo, d, pref, pool, rng, turno) {
      if (verbo === 'consulta_tema') {
        const { texto, kw } = textoDeConsulta(d, pref, pool, perfil, rng);
        mem.preguntadas.add(kw);
        return { tipo: 'texto', texto: aplicarRuido(texto, perfil.ruido, rng), intencion: 'consulta_tema', verbo };
      }
      const parametros = armarAccion(verbo, d, pref, rng);
      const intencion = intencionDeVerbo.get(verbo).id;
      if (rng() < pBotonDe(perfil, turno)) return { tipo: 'boton', intencion, parametros, verbo };
      return { tipo: 'texto', texto: aplicarRuido(textoDeAccion(verbo, parametros, d, perfil, rng), perfil.ruido, rng), intencion, verbo, parametros };
    },
    observar(entrada, r) {
      mem.ultimas.push(claveAccion(entrada));
      if (mem.ultimas.length > 3) mem.ultimas.shift();
      mem.ultimoFallo = FALLOS.has(r.resultado) && entrada.verbo ? entrada.verbo : null;
      if (perfil.objetivo.fuente === 'narracion') mem.pistaCamino = leerPistaCamino(r.texto) ?? mem.pistaCamino;
      if (perfil.aprendeDeRespuestas && typeof r.texto === 'string') {
        const palabras = r.texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-zñ]+/);
        for (const w of palabras) if (palabrasClave.has(w)) mem.aprendidas.add(w);
      }
    },
  };
}
export { verbos };
