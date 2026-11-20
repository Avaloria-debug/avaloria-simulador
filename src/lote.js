import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { idsCasos, versionNarrador } from './adaptador.js';
import { correrRun } from './runner.js';
import { abrirRegistro } from './registro.js';
import { generarInforme } from './informe.js';
import { mulberry32 } from './rng.js';
import { PERFIL_POR_DEFECTO } from './perfiles.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULTS = Object.freeze({ runs: 20, mezcla: { codigo: 100, ia: 0 }, trabada: 15, maxTurnos: 400, seedBase: 1, casos: 'todos', salida: 'simulaciones' });
const VERSION = JSON.parse(fs.readFileSync(path.join(RAIZ, 'package.json'), 'utf8')).version;

const FLAGS = { '--runs': 'runs', '--mezcla': 'mezcla', '--trabada': 'trabada', '--max-turnos': 'maxTurnos', '--seed-base': 'seedBase', '--casos': 'casos', '--salida': 'salida', '--reanudar': 'reanudar' };

export function leerArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const clave = FLAGS[argv[i]];
    if (!clave) throw new Error(`parámetro desconocido: ${argv[i]}`);
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
export function resolverParametros(cli = {}, config = {}) {
  const p = { ...DEFAULTS, ...config, ...cli };
  for (const k of ['runs', 'trabada', 'maxTurnos', 'seedBase']) p[k] = entero(k, p[k]);
  let m = p.mezcla;
  if (typeof m === 'string') {
    const partes = m.split('/');
    if (partes.length !== 2) throw new Error(`mezcla inválida: "${m}" (formato codigo/ia, ej. 100/0)`);
    m = { codigo: Number(partes[0]), ia: Number(partes[1]) };
  }
  if (![m?.codigo, m?.ia].every((x) => Number.isInteger(x) && x >= 0) || m.codigo + m.ia !== 100) throw new Error('mezcla inválida: codigo e ia enteros >= 0 que sumen 100');
  if (m.ia !== 0) throw new Error('mezcla inválida: en esta versión el modo ia no está disponible (ia debe ser 0)');
  p.mezcla = { codigo: m.codigo, ia: m.ia };
  const casos = p.casos === 'todos' ? [...idsCasos] : (Array.isArray(p.casos) ? p.casos : String(p.casos).split(',')).map((s) => s.trim()).filter(Boolean);
  const malos = casos.filter((c) => !idsCasos.includes(c));
  if (casos.length === 0 || malos.length) throw new Error(`casos inexistentes: ${malos.join(', ') || '(vacío)'}. Disponibles: ${idsCasos.join(', ')}`);
  p.casos = casos;
  if (typeof p.salida !== 'string' || !p.salida) throw new Error('salida inválida');
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

export async function ejecutarLote(cli = {}, { config = leerConfig(), politica = null, progreso = () => {}, raiz = RAIZ } = {}) {
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
  const inicio = performance.now();
  let hechos = reg.completados.size;
  for (let i = 0; i < p.runs; i++) {
    if (reg.completados.has(i)) continue;
    const run = await correrRun({
      idx: i, seed: p.seedBase + i, casoId: p.casos[i % p.casos.length], perfil: PERFIL_POR_DEFECTO, modo: modos[i],
      trabada: p.trabada, maxTurnos: p.maxTurnos, politica, alTurno: reg.turno,
    });
    reg.run(run);
    progreso(++hechos, p.runs, run);
  }
  const segundos = (performance.now() - inicio) / 1000;
  const informe = generarInforme(dir);
  return { loteId, dir, parametros: p, segundos, informe };
}
