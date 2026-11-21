import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Candidatos de F7: frases y textos, en jsonl (uno por línea) o en un json consolidado con `candidatos` por grupo.
// Las acciones solo tocan `estado`, `textoEditado` e `intencionAprobada`; el resto de cada línea queda igual.
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR_SIM = path.join(RAIZ, 'simulaciones');
export const DIR_DOCS = path.join(RAIZ, 'docs', 'candidatos');
export const ACCIONES = Object.freeze({ aprobar: 'aprobado', rechazar: 'rechazado', pendiente: 'pendiente', editar: null });
export const APROBADO = 'aprobado';

/** Fuentes: `docs` (docs/candidatos) y cada lote con carpeta `candidatos/`. */
export function listarFuentes({ dirSim = DIR_SIM, dirDocs = DIR_DOCS } = {}) {
  const fuentes = [];
  if (fs.existsSync(dirDocs)) fuentes.push({ id: 'docs', dir: dirDocs });
  if (fs.existsSync(dirSim)) {
    for (const d of fs.readdirSync(dirSim).sort()) {
      const c = path.join(dirSim, d, 'candidatos');
      if (fs.existsSync(c)) fuentes.push({ id: d, dir: c });
    }
  }
  return fuentes;
}

const leerJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const esCandidato = (x) => x && typeof x.id === 'string' && typeof x.estado === 'string' && (typeof x.frase === 'string' || typeof x.texto === 'string');

/** Lee un archivo de candidatos: {tipo: 'jsonl'|'json', datos, items} o null si no es de candidatos. */
function abrir(archivo) {
  if (archivo.endsWith('.jsonl')) {
    const datos = leerJsonl(archivo);
    return { tipo: 'jsonl', datos, items: datos.filter(esCandidato) };
  }
  if (archivo.endsWith('.json') && path.basename(archivo) !== 'revision.json') {
    const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
    if (!datos?.candidatos || typeof datos.candidatos !== 'object' || Array.isArray(datos.candidatos)) return null;
    return { tipo: 'json', datos, items: Object.values(datos.candidatos).flat().filter(esCandidato) };
  }
  return null;
}

function guardar(archivo, a) {
  const texto = a.tipo === 'jsonl' ? a.datos.map((x) => JSON.stringify(x) + '\n').join('') : JSON.stringify(a.datos, null, 2) + '\n';
  fs.writeFileSync(archivo, texto);
}

/** Vista plana de un candidato. `ref` = fuente/archivo#id (los ids se repiten entre archivos). */
function plano(fuente, archivo, x, grupo = null) {
  const frase = typeof x.frase === 'string';
  return {
    ref: `${fuente}/${archivo}#${x.id}`, fuente, archivo, id: x.id, clase: frase ? 'frase' : 'texto', estado: x.estado,
    texto: frase ? x.frase : x.texto, textoEditado: x.textoEditado ?? null,
    intencion: x.intencionAprobada ?? x.intencionObjetivo ?? x.motorIntencion ?? x.motor?.intencion ?? x.contexto?.intencion ?? (grupo && !grupo.startsWith('(') ? grupo : null),
    lote: x.lote ?? x.tandas?.[0] ?? (fuente === 'docs' ? null : fuente),
    perfil: x.perfil ?? x.perfiles?.join(',') ?? null,
    frecuencia: x.frecuencia ?? 1,
    npc: x.contexto?.npc ?? null, escena: x.contexto?.escena ?? x.estadoJuego?.escena ?? null,
    fraseJugador: x.contexto?.frase ?? null, tipo: x.tipo ?? null, nota: x.nota ?? null, versionNarrador: x.versionNarrador ?? null,
  };
}

/** Todos los candidatos de las fuentes elegidas (todas si `ids` es null). */
export function leerCandidatos({ ids = null, ...dirs } = {}) {
  const out = [];
  for (const f of listarFuentes(dirs)) {
    if (ids && !ids.includes(f.id)) continue;
    for (const archivo of fs.readdirSync(f.dir).sort()) {
      const a = abrir(path.join(f.dir, archivo));
      if (!a) continue;
      if (a.tipo === 'json') {
        for (const [grupo, xs] of Object.entries(a.datos.candidatos)) for (const x of xs) if (esCandidato(x)) out.push(plano(f.id, archivo, x, grupo));
      } else for (const x of a.items) out.push(plano(f.id, archivo, x));
    }
  }
  return out;
}

export function contarPorEstado(items) {
  const c = {};
  for (const x of items) c[x.estado] = (c[x.estado] ?? 0) + 1;
  return c;
}

const partirRef = (ref) => {
  const m = /^([^/]+)\/([^/#]+)#(.+)$/.exec(ref ?? '');
  if (!m || !/^[\w.-]+$/.test(m[2])) throw new Error(`referencia inválida: ${ref}`);
  return { fuente: m[1], archivo: m[2], id: m[3] };
};

/**
 * Aplica una acción a uno o varios candidatos y la anota en `revision.json` de cada fuente, con fecha.
 * `editar` cambia el texto (y, en frases, la intención) sin cambiar el estado.
 * @returns {{cambiados: number, revisiones: object[]}}
 */
export function aplicarAccion(refs, accion, { texto = null, intencion = null, fecha = new Date().toISOString(), ...dirs } = {}) {
  if (!Object.hasOwn(ACCIONES, accion)) throw new Error(`acción desconocida: ${accion}`);
  if (accion === 'editar' && refs.length !== 1) throw new Error('editar va de a un candidato');
  if (accion === 'editar' && !(typeof texto === 'string' && texto.trim())) throw new Error('editar necesita el texto corregido');
  const fuentes = new Map(listarFuentes(dirs).map((f) => [f.id, f.dir]));
  const porArchivo = new Map();
  for (const ref of refs) {
    const r = partirRef(ref);
    const dir = fuentes.get(r.fuente);
    if (!dir) throw new Error(`fuente inexistente: ${r.fuente}`);
    const k = path.join(dir, r.archivo);
    if (!porArchivo.has(k)) porArchivo.set(k, { dir, fuente: r.fuente, archivo: r.archivo, ids: new Set() });
    porArchivo.get(k).ids.add(r.id);
  }
  const revisiones = [];
  for (const [archivo, g] of porArchivo) {
    if (!fs.existsSync(archivo)) throw new Error(`archivo inexistente: ${g.fuente}/${g.archivo}`);
    const a = abrir(archivo);
    if (!a) throw new Error(`no es un archivo de candidatos: ${g.fuente}/${g.archivo}`);
    const encontrados = a.items.filter((x) => g.ids.has(x.id));
    const faltan = [...g.ids].filter((id) => !encontrados.some((x) => x.id === id));
    if (faltan.length) throw new Error(`candidatos inexistentes en ${g.fuente}/${g.archivo}: ${faltan.join(', ')}`);
    const locales = [];
    for (const x of encontrados) {
      const de = x.estado;
      const rev = { fecha, ref: `${g.fuente}/${g.archivo}#${x.id}`, accion, de };
      if (accion === 'editar') {
        x.textoEditado = texto.trim();
        rev.texto = x.textoEditado;
        if (intencion && typeof x.frase === 'string') { x.intencionAprobada = intencion; rev.intencion = intencion; }
      } else x.estado = ACCIONES[accion];
      rev.a = x.estado;
      locales.push(rev);
    }
    guardar(archivo, a);
    const fRev = path.join(g.dir, 'revision.json');
    const log = fs.existsSync(fRev) ? JSON.parse(fs.readFileSync(fRev, 'utf8')) : { revisiones: [] };
    log.revisiones.push(...locales);
    fs.writeFileSync(fRev, JSON.stringify(log, null, 2) + '\n');
    revisiones.push(...locales);
  }
  return { cambiados: revisiones.length, revisiones };
}
