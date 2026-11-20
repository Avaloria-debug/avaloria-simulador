// Corpus: frases de jugador escritas por Groq sobre estados muestreados de partidas por reglas.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearPartida, idsCasos, intenciones, versionNarrador, normalizar, formasConocidas } from './adaptador.js';
import { crearPoliticaPerfil } from './politicas.js';
import { cargarPerfiles } from './perfiles.js';
import { conAzarDeterminista, mulberry32 } from './rng.js';
import { leerConfig, nuevoLoteId } from './lote.js';
import { prepararIa } from './ia/preparar.js';
import { SYSTEM_JUGADOR } from './ia/groq.js';
import { validarFrase, describirPerfil, describirEstado } from './ia/jugador.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;
export const INSTRUCCION_VOSEO = 'Las acciones van en primera persona ("viajo al norte", "defiendo el campamento", "hablo con Brenn"). El voseo rioplatense se usa solo cuando el jugador le habla a un NPC o a otro personaje ("¿podés negociar?", "Brenn, decime qué sabés"). Nunca usar tú ni usted.';
export const EJEMPLOS_VOSEO = Object.freeze([
  'viajo al puerto antes de que oscurezca',
  'examino la mesa con cuidado',
  'me escondo detrás de los barriles',
  'Brenn, decime qué sabés del robo',
  'che, ¿podés bajarme el precio de la capa?',
  'mirá, Maren, tenés que ayudarme con esto',
]);
export const SYSTEM_CORPUS = `${SYSTEM_JUGADOR} ${INSTRUCCION_VOSEO}\nEjemplos de cómo escribís:\n${EJEMPLOS_VOSEO.map((e) => `- ${e}`).join('\n')}`;
export const PEDIDO = 'Devolvé solo un JSON: [{"frase":"...","intencion":"<id>"}]. Mezclá frases cortas y largas, con y sin errores de tipeo, nombrando o no al NPC, y palabras sueltas.';
export const CONSULTA = { id: 'consulta_tema', ejemplo: '¿qué sabés de <tema>?' };
const NO_ENTENDIDAS = new Set(['reformula', 'no_entendido']);
const TURNOS_POR_PARTIDA = 60;
// Tokens estimados por frase pedida (salida) y por llamada (razonamiento del modelo).
export const TOKENS_POR_FRASE = 30;
export const TOKENS_RAZONAMIENTO = 300;

const FLAGS = { '--perfiles': 'perfiles', '--frases': 'frases', '--max-estados': 'maxEstados', '--max-llamadas-ia': 'maxLlamadasIa', '--seed-base': 'seedBase', '--casos': 'casos', '--salida': 'salida', '--estimar': 'estimar' };
export function leerArgsCorpus(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const k = FLAGS[argv[i]];
    if (!k) throw new Error(`parámetro desconocido: ${argv[i]}`);
    if (k === 'estimar') { out.estimar = true; continue; }
    const v = argv[++i];
    if (v === undefined || v.startsWith('--')) throw new Error(`falta el valor de ${argv[i - 1]}`);
    out[k] = v;
  }
  return out;
}

const entero = (n, v) => { const x = Number(v); if (!Number.isInteger(x) || x <= 0) throw new Error(`${n} tiene que ser un entero > 0 (recibido: ${JSON.stringify(v)})`); return x; };
export function resolverCorpus(cli = {}, config = {}, disponibles = cargarPerfiles()) {
  const ids = String(cli.perfiles ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!ids.length) throw new Error('perfiles vacío (ej. --perfiles curioso,torpe,primerizo)');
  for (const id of ids) if (!disponibles.has(id)) throw new Error(`perfil inexistente: "${id}". Disponibles: ${[...disponibles.keys()].join(', ')}`);
  if (new Set(ids).size !== ids.length) throw new Error('perfiles: un perfil aparece dos veces');
  const casos = !cli.casos || cli.casos === 'todos' ? [...idsCasos] : String(cli.casos).split(',').map((s) => s.trim()).filter(Boolean);
  const malos = casos.filter((c) => !idsCasos.includes(c));
  if (!casos.length || malos.length) throw new Error(`casos inexistentes: ${malos.join(', ') || '(vacío)'}`);
  const frases = entero('frases', cli.frases ?? 30);
  if (frases > 100) throw new Error('frases: máximo 100 por llamada');
  return {
    perfiles: ids, frases, maxEstados: entero('max-estados', cli.maxEstados ?? 200), maxLlamadasIa: entero('max-llamadas-ia', cli.maxLlamadasIa ?? 300),
    seedBase: entero('seed-base', cli.seedBase ?? config.seedBase ?? 1), casos, salida: cli.salida ?? config.salida ?? 'simulaciones',
  };
}

// JSON de la IA: saca fences ```json``` y basura alrededor. Devuelve lista de {frase, intencion} o null.
export function parsearFrasesJson(texto) {
  if (typeof texto !== 'string') return null;
  let t = texto.replace(/```(?:json)?/gi, '');
  const a = t.indexOf('['); const b = t.lastIndexOf(']');
  if (a < 0 || b <= a) return null;
  t = t.slice(a, b + 1);
  let d;
  try { d = JSON.parse(t); } catch { return null; }
  if (!Array.isArray(d)) return null;
  return d.filter((x) => x && typeof x === 'object').map((x) => ({ frase: x.frase, intencion: typeof x.intencion === 'string' ? x.intencion : null }));
}

// Detector único de tipo de frase (línea base y validación).
const FORMAS_VOSEO = new Set(['vos', 'sos', 'tenés', 'tenes', 'querés', 'queres', 'podés', 'podes', 'decime', 'mirá', 'fijate', 'fijá', 'hacé', 'andá']);
// Terminadas en -ás/-és/-ís con tilde que no son verbos de vos.
const NO_VOSEO_S = new Set(['más', 'además', 'jamás', 'atrás', 'detrás', 'demás', 'quizás', 'compás', 'después', 'través', 'inglés', 'francés', 'interés', 'revés', 'cortés', 'marqués', 'portugués', 'estrés', 'ciprés', 'país', 'maíz', 'raíz', 'anís']);
// Terminadas en -á/-é/-í con tilde que no son imperativos de vos: adverbios, tercera persona, futuros, pretéritos y sustantivos.
const NO_IMPERATIVO = new Set(['aquí', 'acá', 'allá', 'así', 'ahí', 'allí', 'está', 'quizá', 'café', 'papá', 'mamá', 'sofá', 'bebé', 'jabalí', 'rubí', 'será', 'estará', 'habrá', 'podrá', 'tendrá', 'hará', 'dirá', 'irá', 'vendrá', 'sabrá', 'dará', 'querrá', 'saldrá', 'pondrá', 'valdrá', 'llegará', 'pasará', 'quedará', 'volverá', 'fui', 'vi']);
// Imperativo de vos con pronombre enclítico sin tilde (contame, fijate, rendime); en tú llevaría tilde.
const NO_ENCLITICO = new Set(['tomate', 'chocolate', 'debate', 'combate', 'rescate', 'remate', 'disparate', 'aguacate', 'quilate', 'primate', 'magnate', 'escondite', 'aceite', 'deleite', 'derrame']);
const palabras = (f) => String(f).toLowerCase().match(/[a-záéíóúüñ]+/g) ?? [];

export function tieneVoseo(frase) {
  return palabras(frase).some((w) => FORMAS_VOSEO.has(w)
    || (w.length > 3 && /(ás|és|ís)$/.test(w) && !NO_VOSEO_S.has(w))
    || (w.length > 2 && /[áéí]$/.test(w) && !NO_IMPERATIVO.has(w))
    || (w.length >= 6 && /(ame|ime|ate|ite)$/.test(w) && !/[áéíóú]/.test(w) && !NO_ENCLITICO.has(w)));
}

// Primera persona de acción: después de un vocativo opcional ("Maren,") y de muletillas ("che", "bueno", "yo"),
// la frase empieza con un verbo en primera persona del presente, con o sin pronombre átono ("me escondo").
const ARRANQUES = new Set(['che', 'bueno', 'ok', 'dale', 'listo', 'ahora', 'entonces', 'y', 'yo', 'primero', 'despacio', 'rapido', 'rápido']);
const CLITICOS = new Set(['me', 'te', 'le', 'les', 'lo', 'la', 'los', 'las', 'se', 'nos']);
const NO_VERBO_O = new Set(['como', 'pero', 'todo', 'algo', 'eso', 'esto', 'aquello', 'cuanto', 'tanto', 'mucho', 'poco', 'nuestro', 'vuestro', 'otro', 'mismo', 'luego', 'cuando', 'donde', 'adonde', 'medio', 'centro', 'libro', 'mercado', 'puerto', 'pueblo', 'camino', 'grupo', 'nuevo', 'viejo', 'cerro', 'barco', 'cielo', 'suelo', 'palo', 'tipo', 'caso', 'lado', 'cuarto', 'segundo', 'tercero', 'ultimo', 'último', 'ojo', 'banco', 'templo', 'precio', 'dinero', 'oro', 'puesto', 'sello', 'archivo', 'no', 'hmm']);
const IRREGULARES = new Set(['voy', 'doy', 'estoy', 'soy']);
// Palabra en posición de verbo: la primera después de un vocativo ("Maren,"), muletillas y un pronombre átono.
export function palabraDeVerbo(frase) {
  const t = String(frase).replace(/^\s*[A-ZÁÉÍÓÚÑ][\wáéíóúñ]*(\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)?\s*,/, '');
  const ws = palabras(t);
  let i = 0;
  while (i < ws.length && ARRANQUES.has(ws[i])) i++;
  if (i < ws.length && CLITICOS.has(ws[i])) i++;
  return ws[i] ?? null;
}

export function esPrimeraPersonaAccion(frase) {
  const w = palabraDeVerbo(frase);
  if (!w) return false;
  return IRREGULARES.has(w) || (w.length >= 3 && /o$/.test(w) && !NO_VERBO_O.has(w));
}

// Conjugación dudosa: el verbo en primera persona lleva tilde donde no va.
// Presente regular de primera persona: termina en -o sin tilde, salvo í/ú justo antes de la -o (envío, actúo).
// Se marca si termina en -ó ("avanzó") o si lleva á/é/ó en cualquier lugar ("leéo").
export function conjugacionDudosa(frase) {
  const w = palabraDeVerbo(frase);
  if (!w || w.length < 3 || NO_VERBO_O.has(w)) return false;
  if (/ó$/.test(w)) return true;
  return /o$/.test(w) && /[áéó]/.test(w);
}

export function tipoFrase(frase) {
  if (tieneVoseo(frase)) return 'voseo_dialogo';
  if (esPrimeraPersonaAccion(frase)) return 'primera_persona_accion';
  return 'no_valida';
}

const claveEstado = (d) => `${d.escena}|${d.npcs.map((n) => n.id).sort().join(',')}|${d.objetos.map((o) => o.id).sort().join(',')}`;

// Muestrea estados distintos por (escena, NPC presentes, objetos). Cada estado guarda cómo reproducirlo.
export async function muestrearEstados({ maxEstados, seedBase, casos, perfilReglas }) {
  const vistos = new Set(); const estados = [];
  for (let i = 0; estados.length < maxEstados && i < maxEstados * 4; i++) {
    const seed = seedBase + i; const casoId = casos[i % casos.length];
    let nuevos = 0;
    await conAzarDeterminista(seed, async () => {
      const sim = await crearPartida({ seed, casoId, partidaId: `corpus-${seed}` });
      try {
        const pol = crearPoliticaPerfil(perfilReglas);
        const rng = mulberry32(seed ^ 0x9e3779b9);
        const prefijo = [];
        for (let t = 0; t < TURNOS_POR_PARTIDA && estados.length < maxEstados; t++) {
          const d = sim.detalle();
          const k = claveEstado(d);
          if (!vistos.has(k)) { vistos.add(k); nuevos++; estados.push({ seed, casoId, prefijo: [...prefijo], escena: d.escena, npcs: d.npcs.map((n) => n.id), objetos: d.objetos.map((o) => o.id), hora: sim.estado().hora }); }
          const e = pol.elegir(sim, rng, { idx: i, turno: t + 1 });
          const r = await sim.aplicar(e);
          pol.observar(e, r);
          prefijo.push(e.tipo === 'boton' ? { tipo: 'boton', intencion: e.intencion, parametros: e.parametros } : { tipo: 'texto', texto: e.texto });
          if (r.desenlace) break;
        }
      } finally { await sim.cerrar(); }
    });
    if (i >= casos.length * 3 && nuevos === 0 && estados.length) break;
  }
  return estados;
}

// Reproduce el estado y llama a fn(sim) dentro del mismo azar determinista.
async function enEstado(est, fn) {
  return conAzarDeterminista(est.seed, async () => {
    const sim = await crearPartida({ seed: est.seed, casoId: est.casoId, partidaId: `corpus-${est.seed}` });
    try { for (const e of est.prefijo) await sim.aplicar(e); return await fn(sim); } finally { await sim.cerrar(); }
  });
}

export function intencionesDisponibles(sim) {
  const ids = new Set(sim.acciones().map((a) => a.intencion));
  const lista = intenciones.filter((i) => ids.has(i.id)).map((i) => ({ id: i.id, ejemplo: i.formas?.[0] ?? i.verbo }));
  if (sim.detalle().npcs.length) lista.push(CONSULTA);
  return lista;
}

export function armarPedido(perfil, sim, frases) {
  const lista = intencionesDisponibles(sim);
  const user = `${describirPerfil(perfil)}\n${describirEstado(sim.detalle(), sim.estado().hora)}\nIntenciones disponibles (id: forma de ejemplo):\n${lista.map((i) => `- ${i.id}: ${i.ejemplo}`).join('\n')}\nEscribí ${frases} frases de jugador repartidas entre esas intenciones. ${INSTRUCCION_VOSEO} ${PEDIDO}`;
  return { system: SYSTEM_CORPUS, user, intenciones: lista.map((i) => i.id) };
}

export function estimar({ estados, perfiles, frases, maxLlamadasIa, caracteresPedido }) {
  const llamadas = estados * perfiles;
  const entrada = Math.ceil(caracteresPedido / 4);
  const salida = frases * TOKENS_POR_FRASE + TOKENS_RAZONAMIENTO;
  return { estados, llamadas, llamadasEfectivas: Math.min(llamadas, maxLlamadasIa), tokensPorLlamada: entrada + salida, tokens: Math.min(llamadas, maxLlamadasIa) * (entrada + salida), superaTope: llamadas > maxLlamadasIa };
}

const coincide = (objetivo, motor) => (objetivo === CONSULTA.id ? ['consulta', 'negativa_relacion'].includes(motor.resultado) : motor.intencion === objetivo && motor.resultado === 'ejecuta');

export function agrupar(frases, conocidas = formasConocidas) {
  const grupos = {};
  for (const f of frases) {
    if (!(NO_ENTENDIDAS.has(f.motor.resultado) || !coincide(f.intencionObjetivo, f.motor))) continue;
    const n = normalizar(f.frase);
    if (!n || conocidas.has(n)) continue;
    const g = (grupos[f.intencionObjetivo ?? '(sin intención)'] ??= {});
    const x = (g[n] ??= { normalizada: n, frecuencia: 0, ejemplos: [], resultados: {}, perfiles: [] });
    x.frecuencia += 1;
    if (x.ejemplos.length < 3 && !x.ejemplos.includes(f.frase)) x.ejemplos.push(f.frase);
    const clave = `${f.motor.resultado}${f.motor.intencion ? `:${f.motor.intencion}` : ''}`;
    x.resultados[clave] = (x.resultados[clave] ?? 0) + 1;
    if (!x.perfiles.includes(f.perfil)) x.perfiles.push(f.perfil);
  }
  return Object.fromEntries(Object.entries(grupos).sort().map(([k, g]) => [k, Object.values(g).sort((a, b) => b.frecuencia - a.frecuencia || a.normalizada.localeCompare(b.normalizada))]));
}

export async function ejecutarCorpus(cli = {}, { config = leerConfig(), raiz = RAIZ, fetch, env, archivoKeys, progreso = () => {}, avisar = () => {}, alEstimar = () => true } = {}) {
  const perfiles = cargarPerfiles();
  const p = resolverCorpus(cli, config, perfiles);
  const estados = await muestrearEstados({ maxEstados: p.maxEstados, seedBase: p.seedBase, casos: p.casos, perfilReglas: perfiles.get('aleatorio') });
  let caracteres = 0;
  if (estados.length) await enEstado(estados[0], async (sim) => { const x = armarPedido(perfiles.get(p.perfiles[0]), sim, p.frases); caracteres = x.system.length + x.user.length; });
  const est = estimar({ estados: estados.length, perfiles: p.perfiles.length, frases: p.frases, maxLlamadasIa: p.maxLlamadasIa, caracteresPedido: caracteres });
  if (cli.estimar || !(await alEstimar(est))) return { estimacion: est, parametros: p };
  const ia = prepararIa({ config, maxLlamadas: p.maxLlamadasIa, fetch, env, archivoKeys, raiz, log: avisar });
  if (!ia) throw Object.assign(new Error('no hay keys de Groq (GROQ_API_KEY o config/keys.json): el corpus necesita la IA'), { codigo: 'sin_keys' });

  const base = path.resolve(raiz, p.salida);
  let loteId = `${nuevoLoteId(p.seedBase)}-corpus`;
  for (let n = 2; fs.existsSync(path.join(base, loteId)); n++) loteId = `${nuevoLoteId(p.seedBase)}-corpus-${n}`;
  const dir = path.join(base, loteId); const dirC = path.join(dir, 'candidatos');
  fs.mkdirSync(dirC, { recursive: true });
  const modelo = ia.cliente.modelo;
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ loteId, tipo: 'corpus', version: VERSION, narrador: versionNarrador, fecha: new Date().toISOString(), modelo, parametros: p, estimacion: est }, null, 2));
  const archivo = path.join(dirC, 'frases.jsonl');
  const todas = []; const fallasParseo = []; let pedidas = 0; let invalidas = 0; let corte = null; let idFrase = 0;
  const total = est.llamadasEfectivas; let hechas = 0;
  fuera: for (const [ie, e] of estados.entries()) {
    for (const pid of p.perfiles) {
      const perfil = perfiles.get(pid);
      const pedido = await enEstado(e, async (sim) => armarPedido(perfil, sim, p.frases));
      let r;
      try { r = await ia.cliente.llamar({ system: pedido.system, user: pedido.user, maxTokens: p.frases * 60 + 1000 }); } catch (err) {
        if (err.name === 'TopeAlcanzado' || err.name === 'SinKeys') { corte = err.message; break fuera; }
        fallasParseo.push({ estado: ie, perfil: pid, error: err.message }); progreso(++hechas, total); continue;
      }
      const lista = parsearFrasesJson(r.texto);
      progreso(++hechas, total);
      if (!lista) { fallasParseo.push({ estado: ie, perfil: pid, error: 'JSON ilegible', crudo: String(r.texto).slice(0, 300) }); continue; }
      pedidas += lista.length;
      const validas = lista.map((x) => ({ ...x, frase: validarFrase(x.frase) })).filter((x) => { if (!x.frase) invalidas++; return x.frase; });
      const motor = await enEstado(e, async (sim) => validas.map((x) => { const c = sim.clasificar(x.frase); return { intencion: c.intencionId, regla: c.motivo, resultado: c.resultado }; }));
      for (const [i, x] of validas.entries()) {
        const fila = { id: `f${String(++idFrase).padStart(5, '0')}`, frase: x.frase, tipo: tipoFrase(x.frase), perfil: pid, estadoJuego: { escena: e.escena, npcs: e.npcs, objetos: e.objetos }, intencionObjetivo: x.intencion, motor: motor[i], modelo, seed: e.seed, fecha: new Date().toISOString(), versionNarrador: versionNarrador.version, estado: 'pendiente' };
        todas.push(fila);
        fs.appendFileSync(archivo, `${JSON.stringify(fila)}\n`);
      }
    }
  }
  if (!fs.existsSync(archivo)) fs.writeFileSync(archivo, '');
  const validasTodas = todas.filter((f) => f.tipo !== 'no_valida');
  const agrupadas = agrupar(validasTodas);
  fs.writeFileSync(path.join(dirC, 'frases-agrupadas.json'), JSON.stringify(agrupadas, null, 2));
  const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
  const cuenta = (t) => todas.filter((f) => f.tipo === t).length;
  const noEnt = validasTodas.filter((f) => NO_ENTENDIDAS.has(f.motor.resultado)).length;
  const resumen = {
    loteId, modelo, estados: estados.length, llamadas: ia.cliente.llamadas, tokens: ia.cliente.tokens, tokensEntrada: ia.cliente.tokensEntrada, tokensSalida: ia.cliente.tokensSalida,
    frasesPedidas: pedidas, frasesFormato: todas.length, invalidas,
    voseoDialogo: cuenta('voseo_dialogo'), pctVoseo: pct(cuenta('voseo_dialogo'), todas.length),
    primeraPersonaAccion: cuenta('primera_persona_accion'), pctPrimeraPersona: pct(cuenta('primera_persona_accion'), todas.length),
    noValidas: cuenta('no_valida'), frasesValidas: validasTodas.length, pctValidas: pct(validasTodas.length, pedidas),
    noEntendidas: noEnt, pctNoEntendidas: pct(noEnt, validasTodas.length),
    distintaDeObjetivo: validasTodas.filter((f) => !coincide(f.intencionObjetivo, f.motor)).length, gruposCandidatos: Object.values(agrupadas).reduce((a, g) => a + g.length, 0),
    fallasParseo, corte, keys: ia.pool.resumen(), estimacion: est,
  };
  fs.writeFileSync(path.join(dir, 'corpus.json'), JSON.stringify(resumen, null, 2));
  return { ...resumen, dir };
}
