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

const requerir = createRequire(import.meta.url);
const archivoCasos = requerir('narrador/data/contenido/casos.json');
const lock = (() => { try { return requerir('../package-lock.json'); } catch { return null; } })();

export const casos = archivoCasos.casos;
export const idsCasos = casos.map((c) => c.id);
export const intenciones = contenido.intenciones;
export const versionNarrador = {
  version: VERSION,
  contenido: contenido.version,
  casos: archivoCasos.version,
  commit: (lock?.packages?.['node_modules/narrador']?.resolved ?? '').split('#')[1] ?? null,
};

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

export async function crearPartida({ seed, casoId, partidaId = `sim-${seed}` }) {
  const caso = casos.find((c) => c.id === casoId);
  if (!caso) throw new Error(`caso inexistente: ${casoId}`);
  const persistencia = await abrirPersistenciaCasos({ versionContenido: contenido.version, indexedDB: new IDBFactory(), nombreBD: partidaId });
  let e = crearPartidaNarrador({ semilla: seed });
  e = { ...e, caso: estadoCasoInicial(caso, seed, e.jugador.escenaId) };
  const opciones = { casos, persistenciaCasos: persistencia, jugadorId: 'simulador', partidaId, ahora: () => Date.now() };

  const clasificar = (entrada) => {
    const partida = cargarPartida(e);
    const t = ejecutarTurno(partida, typeof entrada === 'string' ? { tipo: 'texto', texto: entrada } : entrada, { contenido, rng: crearRng(partida.semilla), diccionarios });
    return { tipo: t.tipo, intencionId: t.intencionId ?? t.accion?.intencionId ?? null, parametros: t.accion?.parametros ?? {}, motivo: t.motivo ?? null, resultado: RESULTADO[t.tipo] ?? 'no_entendido' };
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
    async aplicar(entrada) {
      const ent = entrada.tipo === 'boton'
        ? { tipo: 'boton', intencionId: entrada.intencion, parametros: entrada.parametros ?? {} }
        : { tipo: 'texto', texto: entrada.texto };
      const d = clasificar(ent);
      const antes = e.caso ?? {};
      const r = await narrar(e, ent, opciones);
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
        iaLlamadas: 0,
        iaTokens: 0,
        errores: r.errores,
      };
    },
    cerrar: () => persistencia.cerrar(),
  };
}
