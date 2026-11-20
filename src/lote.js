import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idsCasos, versionNarrador } from './adaptador.js';
import { correrRun } from './runner.js';
import { abrirRegistro } from './registro.js';
import { generarInforme } from './informe.js';
import { mulberry32 } from './rng.js';
import { PERFIL_POR_DEFECTO, cargarPerfiles } from './perfiles.js';
import { prepararIa } from './ia/preparar.js';
import { crearIaNarrador } from './ia/narrador.js';
import { extraerTextos } from './textos.js';
import { leerKeysGroq } from './ia/keys.js';
import { crearJugadorIa } from './ia/jugador.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULTS = Object.freeze({ runs: 20, mezcla: { codigo: 40, ia: 60 }, trabada: 15, maxTurnos: 400, seedBase: 1, casos: 'todos', salida: 'simulaciones' });
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

const FLAGS = { '--runs': 'runs', '--mezcla': 'mezcla', '--trabada': 'trabada', '--max-turnos': 'maxTurnos', '--seed-base': 'seedBase', '--casos': 'casos', '--salida': 'salida', '--reanudar': 'reanudar', '--perfiles': 'perfiles', '--jugador-ia': 'jugadorIa', '--max-llamadas-ia': 'maxLlamadasIa', '--estimar': 'estimar' };

export function leerArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const clave = FLAGS[argv[i]];
    if (!clave) throw new Error(`parámetro desconocido: ${argv[i]}`);
    if (clave === 'estimar') { out.estimar = true; continue; }
    const v = argv[++i];
    if (v === undefined || v.startsWith('--')) throw new Error(`falta el valor de ${argv[i - 1]}`);
    out[clave] = v;
  }
  return out;
}

export function leerConfig(archivo = path.join(RAIZ, 'config', 'config.json')) {
  return fs.existsSync(archivo) ? JSON.parse(fs.readFileSync(archivo, 'utf8')) : {};
}

function entero(nombre, v) {
  const n = typeof v === 'string' && /^-?\d+$/.test(v.trim()) ? Number(v) : v;
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${nombre} tiene que ser un entero > 0 (recibido: ${JSON.stringify(v)})`);
  return n;
}

// Precedencia: CLI > config.json > defaults.
export function resolverPerfiles(texto, disponibles) {
  const lista = String(texto).split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
    const [id, n, ...resto] = x.split(':');
    if (resto.length || !id) throw new Error(`perfiles inválido: "${x}" (formato id:cantidad)`);
    if (!disponibles.has(id)) throw new Error(`perfil inexistente: "${id}". Disponibles: ${[...disponibles.keys()].join(', ')}`);
    return { id, agentes: entero(`agentes de ${id}`, n ?? '') };
  });
  if (!lista.length) throw new Error('perfiles vacío');
  const ids = lista.map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw new Error('perfiles: un perfil aparece dos veces');
  return lista;
}

export function resolverParametros(cli = {}, config = {}, disponibles = cargarPerfiles()) {
  const p = { ...DEFAULTS, ...config, ...cli };
  if (p.perfiles !== undefined && p.perfiles !== null) {
    p.perfiles = Array.isArray(p.perfiles) ? p.perfiles : resolverPerfiles(p.perfiles, disponibles);
    const suma = p.perfiles.reduce((a, x) => a + x.agentes, 0);
    if (cli.runs !== undefined && entero('runs', cli.runs) !== suma) throw new Error(`--runs ${cli.runs} no coincide con la suma de --perfiles (${suma})`);
    p.runs = suma;
  } else {
    p.perfiles = [{ id: PERFIL_POR_DEFECTO, agentes: entero('runs', p.runs) }];
  }
  for (const x of p.perfiles) if (!disponibles.has(x.id)) throw new Error(`perfil inexistente: "${x.id}"`);
  for (const k of ['runs', 'trabada', 'maxTurnos', 'seedBase']) p[k] = entero(k, p[k]);
  let m = p.mezcla;
  if (typeof m === 'string') {
    const partes = m.split('/');
    if (partes.length !== 2) throw new Error(`mezcla inválida: "${m}" (formato codigo/ia, ej. 100/0)`);
    m = { codigo: Number(partes[0]), ia: Number(partes[1]) };
  }
  if (![m?.codigo, m?.ia].every((x) => Number.isInteger(x) && x >= 0) || m.codigo + m.ia !== 100) throw new Error('mezcla inválida: codigo e ia enteros >= 0 que sumen 100');
  p.mezcla = { codigo: m.codigo, ia: m.ia };
  const casos = p.casos === 'todos' ? [...idsCasos] : (Array.isArray(p.casos) ? p.casos : String(p.casos).split(',')).map((s) => s.trim()).filter(Boolean);
  const malos = casos.filter((c) => !idsCasos.includes(c));
  if (casos.length === 0 || malos.length) throw new Error(`casos inexistentes: ${malos.join(', ') || '(vacío)'}. Disponibles: ${idsCasos.join(', ')}`);
  p.casos = casos;
  if (typeof p.salida !== 'string' || !p.salida) throw new Error('salida inválida');
  p.maxLlamadasIa = entero('max-llamadas-ia', p.maxLlamadasIa ?? 300);
  const j = p.jugadorIa ?? 'no';
  if (![true, false, 'si', 'no'].includes(j)) throw new Error('jugador-ia inválido: si o no');
  p.jugadorIa = j === true || j === 'si';
  return p;
}

export function asignarModos(runs, mezcla, seed) {
  const nCodigo = Math.round((runs * mezcla.codigo) / 100);
  const modos = Array.from({ length: runs }, (_, i) => (i < nCodigo ? 'codigo' : 'ia'));
  const rng = mulberry32(seed);
  for (let i = modos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [modos[i], modos[j]] = [modos[j], modos[i]];
  }
  return modos;
}

const dos = (n) => String(n).padStart(2, '0');
export function nuevoLoteId(seedBase, fecha = new Date()) {
  const f = fecha;
  return `${f.getFullYear()}${dos(f.getMonth() + 1)}${dos(f.getDate())}-${dos(f.getHours())}${dos(f.getMinutes())}${dos(f.getSeconds())}-${seedBase}`;
}

export async function ejecutarLote(cli = {}, { config = leerConfig(), politica = null, progreso = () => {}, raiz = RAIZ, fetch: f, env, archivoKeys, esperarIa = null, avisar = (m) => process.stderr.write(`Aviso: ${m}\n`) } = {}) {
  let p;
  let loteId;
  let dir;
  if (cli.reanudar) {
    const base = path.resolve(raiz, cli.salida ?? config.salida ?? DEFAULTS.salida);
    dir = path.join(base, cli.reanudar);
    if (!fs.existsSync(path.join(dir, 'estado.json'))) throw new Error(`no hay lote para reanudar en ${dir}`);
    const guardada = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
    p = resolverParametros({}, guardada.parametros);
    loteId = cli.reanudar;
  } else {
    p = resolverParametros(cli, config);
    const base = path.resolve(raiz, p.salida);
    loteId = nuevoLoteId(p.seedBase);
    let n = 2;
    while (fs.existsSync(path.join(base, loteId))) loteId = `${nuevoLoteId(p.seedBase)}-${n++}`;
    dir = path.join(base, loteId);
  }
  const reg = abrirRegistro(dir, { reanudar: Boolean(cli.reanudar) });
  if (!cli.reanudar) reg.config({ loteId, version: VERSION, narrador: versionNarrador, fecha: new Date().toISOString(), parametros: p });
  const modos = asignarModos(p.runs, p.mezcla, p.seedBase);
  const perfiles = cargarPerfiles();
  const perfilDe = p.perfiles.flatMap((x) => Array(x.agentes).fill(perfiles.get(x.id)));
  // Un solo pool y una sola cuenta de llamadas para el jugador IA y la IA del narrador.
  const cuenta = { llamadas: 0, tokens: 0, max: p.maxLlamadasIa };
  const hayIa = p.jugadorIa || modos.includes('ia');
  const ia = hayIa ? prepararIa({ config, maxLlamadas: p.maxLlamadasIa, cuenta, fetch: f, env, archivoKeys, raiz, log: avisar }) : null;
  let jugadorIa = null;
  if (p.jugadorIa) { if (ia) jugadorIa = crearJugadorIa(ia.cliente); else avisar('jugador IA pedido sin keys de Groq: todos los perfiles usan reglas'); }
  const iaNarrador = ia ? crearIaNarrador({ pool: ia.pool, cuenta, ...(f ? { fetch: f } : {}), esperar: esperarIa, log: avisar }) : { tomarKey: async () => { throw Object.assign(new Error('no hay keys de Groq disponibles'), { name: 'SinKeys' }); } };
  const inicio = performance.now();
  let hechos = reg.completados.size;
  let cuota = null;
  for (let i = 0; i < p.runs; i++) {
    if (reg.completados.has(i)) continue;
    const base = { idx: i, seed: p.seedBase + i, casoId: p.casos[i % p.casos.length], perfil: perfilDe[i], modo: modos[i] };
    if (cuota) { reg.run({ runId: `r${String(i).padStart(4, '0')}-s${base.seed}`, ...base, perfil: base.perfil.id, caso: base.casoId, casoId: undefined, cierre: 'cuota', turnos: 0, hitos: [], motivoCuota: cuota }); progreso(hechos, p.runs, { cierre: 'cuota', runId: '', perfil: base.perfil.id, turnos: 0 }); continue; }
    const run = await correrRun({ ...base, trabada: p.trabada, maxTurnos: p.maxTurnos, politica, alTurno: reg.turno, jugadorIa, iaNarrador, avisar });
    reg.run(run);
    if (run.cierre === 'cuota') { cuota = run.motivoCuota; avisar(`${cuota}: los runs pendientes se cierran como cuota`); }
    progreso(run.cierre === 'cuota' ? hechos : ++hechos, p.runs, run);
  }
  const segundos = (performance.now() - inicio) / 1000;
  const informe = generarInforme(dir);
  const textos = extraerTextos(dir, { modelo: config.modelos?.groq ?? null });
  return { loteId, dir, parametros: p, segundos, informe, cuota, ia: { llamadas: cuenta.llamadas, tokens: cuenta.tokens, keys: ia ? ia.pool.resumen() : [] }, textos };
}

// Estimación previa: runs ia × llamadas por run × tokens por llamada, más el jugador IA, contra keys × límite diario.
export const LLAMADAS_POR_RUN_IA = 5;
export const TOKENS_POR_LLAMADA = 560;
export const TURNOS_POR_RUN = 20;
export function estimarLote(cli = {}, { config = leerConfig(), env, archivoKeys } = {}) {
  const p = resolverParametros(cli, config);
  const perfiles = cargarPerfiles();
  const modos = asignarModos(p.runs, p.mezcla, p.seedBase);
  const runsIa = modos.filter((m) => m === 'ia').length;
  const narrador = runsIa * (config.groq?.llamadasPorRun ?? LLAMADAS_POR_RUN_IA);
  const jugador = p.jugadorIa ? Math.round(p.perfiles.reduce((a, x) => a + x.agentes * (perfiles.get(x.id).ia?.p ?? 0) * TURNOS_POR_RUN, 0)) : 0;
  const llamadas = narrador + jugador;
  const keys = leerKeysGroq({ env, ...(archivoKeys ? { archivo: archivoKeys } : {}) }).length;
  const limite = config.groq?.limiteDiarioPorKey ?? 250;
  return {
    runs: p.runs, runsIa, llamadasNarrador: narrador, llamadasJugador: jugador, llamadas, llamadasConTope: Math.min(llamadas, p.maxLlamadasIa),
    tokens: llamadas * TOKENS_POR_LLAMADA, keys, limiteDiarioPorKey: limite, capacidad: keys * limite, superaCapacidad: llamadas > keys * limite,
  };
}
