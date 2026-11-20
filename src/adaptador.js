// Única fachada del narrador.
import { createRequire } from 'node:module';
import { IDBFactory } from 'fake-indexeddb';
import { crearPartida as crearPartidaNarrador, cargarPartida, narrar, contenido, diccionarios } from 'narrador/narrador/index.js';
import { ejecutarTurno } from 'narrador/narrador/turno.js';
import { crearRng } from 'narrador/narrador/azar.js';
import { armarInstancia } from 'narrador/narrador/casos/instancias.js';
import { abrirPersistenciaCasos } from 'narrador/narrador/casos/persistencia.js';
import { opcionesDeEscena } from 'narrador/narrador/prueba/panel.js';
import { VERSION } from 'narrador/narrador/version.js';
import { escenasDeEntrega } from 'narrador/narrador/casos/hitos.js';
import { TIPOS_TAG } from 'narrador/narrador/casos/tags.js';
import { posicionesDeNpcs } from 'narrador/narrador/movimientoNpcs.js';
import { normalizar } from 'narrador/narrador/comprension.js';

const requerir = createRequire(import.meta.url);
const archivoCasos = requerir('narrador/data/contenido/casos.json');
const lock = (() => { try { return requerir('../package-lock.json'); } catch { return null; } })();

export const casos = archivoCasos.casos;
export const idsCasos = casos.map((c) => c.id);
export const intenciones = contenido.intenciones;
export { normalizar };
// Formas ya conocidas por el narrador (normalizadas): las del contenido y las del léxico de comprensión.
export const formasConocidas = new Set([...contenido.intenciones, ...(diccionarios.intencionesLexico ?? [])].flatMap((i) => i.formas ?? []).map(normalizar));
export const versionNarrador = {
  version: VERSION,
  contenido: contenido.version,
  casos: archivoCasos.version,
  commit: (lock?.packages?.['node_modules/narrador']?.resolved ?? '').split('#')[1] ?? null,
};

export const tiposTag = [...TIPOS_TAG];
export const idsEscenas = contenido.escenas.map((x) => x.id);
export const verbos = contenido.intenciones.map((i) => i.verbo);
export const intencionDeVerbo = new Map(contenido.intenciones.map((i) => [i.verbo, i]));
export const escenas = new Map(contenido.escenas.map((x) => [x.id, { id: x.id, nombre: x.nombre, salidas: x.salidas ?? [] }]));
export const npcsDef = new Map(contenido.npcs.map((n) => [n.id, n]));
export const conocimientos = contenido.npcs.flatMap((n) => (n.conocimientos ?? []).map((k) => ({ id: k.id, npcId: n.id, palabrasClave: k.palabrasClave ?? [] })));
export const palabrasClave = new Set(conocimientos.flatMap((k) => k.palabrasClave));

const nombres = new Map([...contenido.npcs, ...contenido.objetos, ...contenido.escenas].map((x) => [x.id, x.nombre]));
export const nombreDe = (id) => nombres.get(id) ?? id;

const claveTag = (t) => `${t.tipo}|${t.objetivo}|${t.nivel}`;
const RESULTADO = { accion: 'ejecuta', consulta: 'consulta', saludo: 'consulta', reconocimiento: 'consulta', reformular: 'reformula', ia: 'no_entendido', error: 'no_entendido' };

function estadoCasoInicial(caso, seed, escena) {
  return {
    casoId: caso.id,
    instancia: armarInstancia(caso, {}, seed, { contenido }),
    tags: [], contadorHitos: 0,
    hitoPrevio: { id: null, hora: 8, escena, contador: 0 },
    hitosAlcanzados: [], hitosListos: [], hitosBloqueados: [],
  };
}

// `ia` (modo ia): {tomarKey, http} de src/ia/narrador.js. Sin `ia` el narrador no recibe key (modo código).
export async function crearPartida({ seed, casoId, partidaId = `sim-${seed}`, ia = null }) {
  const caso = casos.find((c) => c.id === casoId);
  if (!caso) throw new Error(`caso inexistente: ${casoId}`);
  const persistencia = await abrirPersistenciaCasos({ versionContenido: contenido.version, indexedDB: new IDBFactory(), nombreBD: partidaId });
  let e = crearPartidaNarrador({ semilla: seed });
  e = { ...e, caso: estadoCasoInicial(caso, seed, e.jugador.escenaId) };
  const opciones = { casos, persistenciaCasos: persistencia, jugadorId: 'simulador', partidaId, ahora: () => Date.now() };

  const clasificar = (entrada) => {
    const partida = cargarPartida(e);
    const t = ejecutarTurno(partida, typeof entrada === 'string' ? { tipo: 'texto', texto: entrada } : entrada, { contenido, rng: crearRng(partida.semilla), diccionarios });
    return { tipo: t.tipo, intencionId: t.intencionId ?? t.accion?.intencionId ?? null, parametros: t.accion?.parametros ?? {}, motivo: t.motivo ?? null, consulta: t.consulta ? { npcId: t.consulta.npcId, conocimientoId: t.consulta.conocimientoId, resultado: t.consulta.resultado, motivo: t.consulta.motivo ?? null } : null, resultado: t.consulta?.motivo === 'umbral' ? 'negativa_relacion' : (RESULTADO[t.tipo] ?? 'no_entendido') };
  };

  return {
    estado() {
      const o = opcionesDeEscena(e, contenido);
      return {
        escena: e.jugador.escenaId,
        hora: `d${e.reloj.dia} ${e.reloj.hora}`,
        npcsPresentes: o.npcs.map((n) => n.id),
        objetos: o.objetos.map((x) => x.id),
        tags: (e.caso?.tags ?? []).map(claveTag),
        hitos: [...(e.caso?.hitosAlcanzados ?? [])],
        caso: e.caso?.casoId ?? null,
        desenlace: e.caso?.desenlaceId ?? null,
      };
    },
    acciones() {
      const o = opcionesDeEscena(e, contenido);
      const lista = [];
      for (const i of intenciones) {
        const p = String(i.parametros ?? '').toLowerCase();
        const nivel2 = [];
        if (p.includes('npc')) for (const n of o.npcs) nivel2.push({ npcId: n.id });
        if (p.includes('objeto')) for (const x of o.objetos) nivel2.push({ objetoId: x.id });
        if (i.verbo === 'viajar' || p.includes('destino')) for (const d of o.destinos) nivel2.push({ destino: d.id });
        lista.push({ nivel: 1, intencion: i.id, parametros: {} });
        for (const parametros of nivel2) lista.push({ nivel: 2, intencion: i.id, parametros });
      }
      return lista;
    },
    clasificar,
    // Lo que necesitan las políticas con objetivo. Lectura pura del estado.
    detalle() {
      const o = opcionesDeEscena(e, contenido);
      const revelados = new Set(Object.values(e.npcs).flatMap((n) => n.conocimientosRevelados ?? []));
      const posiciones = posicionesDeNpcs(e.reloj, contenido);
      const c = e.caso ?? {};
      const caso = casos.find((x) => x.id === c.casoId);
      const mundo = { escena: e.jugador.escenaId, npcs: Object.fromEntries(Object.entries(posiciones).map(([id, escena]) => [id, { escena }])) };
      const alcanzados = new Set(c.hitosAlcanzados ?? []);
      const escenasPendientes = new Set();
      for (const h of caso?.hitos ?? []) {
        if (alcanzados.has(h.id)) continue;
        try { for (const x of escenasDeEntrega(h, c, mundo) ?? []) if (x) escenasPendientes.add(x); } catch { /* ranura ausente */ }
      }
      return {
        escena: e.jugador.escenaId,
        destinos: o.destinos.map((d) => d.id),
        npcs: o.npcs.map((n) => ({ id: n.id, nombre: n.nombre })),
        objetos: o.objetos.map((x) => ({ id: x.id, nombre: x.nombre })),
        revelados: [...revelados],
        tagsCaso: (c.tags ?? []).map(({ tipo, objetivo, nivel }) => ({ tipo, objetivo, nivel })),
        pistas: (c.instancia?.pistas ?? []).map((p) => ({ conocimientoId: p.conocimientoId, npcId: p.npcId, escena: posiciones[p.npcId] ?? null, revelado: revelados.has(p.conocimientoId) })),
        escenasPendientes: [...escenasPendientes],
      };
    },
    async aplicar(entrada) {
      const ent = entrada.tipo === 'boton'
        ? { tipo: 'boton', intencionId: entrada.intencion, parametros: entrada.parametros ?? {} }
        : { tipo: 'texto', texto: entrada.texto };
      const d = clasificar(ent);
      const antes = e.caso ?? {};
      const turnoIa = { llamadas: 0, tokens: 0, limitada: false };
      let op = opciones;
      if (ia && d.tipo === 'ia') {
        const k = await ia.tomarKey();
        op = { ...opciones, groqKey: k.key, http: ia.http(k, turnoIa), ...(ia.esperar ? { esperar: ia.esperar } : {}) };
      }
      const npcsPresentes = opcionesDeEscena(e, contenido).npcs.map((n) => ({ id: n.id, nombre: n.nombre }));
      const eventosActivos = (e.eventosActivos ?? []).map((a) => ({ id: a.id, escena: a.escenaId }));
      const r = await narrar(e, ent, op);
      if (r.tipo === 'error' && r.errores.some((x) => x.startsWith('error_interno'))) throw new Error(`narrador: ${r.errores.join('; ')}`);
      e = r.estado;
      const despues = e.caso ?? {};
      const tAntes = new Set((antes.tags ?? []).map(claveTag));
      const tDespues = new Set((despues.tags ?? []).map(claveTag));
      const hitosAntes = new Set(antes.hitosAlcanzados ?? []);
      const usados = new Set(antes.textosUsados ?? []);
      const desenlace = !antes.cerrado && despues.cerrado ? despues.desenlaceId : null;
      const caso = casos.find((c) => c.id === despues.casoId);
      return {
        intencion: d.intencionId,
        regla: d.motivo,
        resultado: r.tipo === 'dialogo_ia' ? 'ia' : d.resultado,
        texto: r.texto,
        textoId: (despues.textosUsados ?? []).find((t) => !usados.has(t)) ?? null,
        tagsEscritos: [...tDespues].filter((t) => !tAntes.has(t)),
        tagsBorrados: [...tAntes].filter((t) => !tDespues.has(t)),
        hito: (despues.hitosAlcanzados ?? []).find((h) => !hitosAntes.has(h)) ?? null,
        desenlace,
        tipoDesenlace: desenlace ? caso?.desenlaces?.find((x) => x.id === desenlace)?.tipo ?? null : null,
        iaLlamadas: turnoIa.llamadas,
        iaTokens: turnoIa.tokens,
        iaLimitada: turnoIa.limitada,
        tipoSalida: r.tipo,
        consulta: d.consulta,
        npcsPresentes,
        eventosActivos,
        errores: r.errores,
      };
    },
    cerrar: () => persistencia.cerrar(),
  };
}
