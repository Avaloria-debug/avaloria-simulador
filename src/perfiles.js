import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verbos } from './adaptador.js';

export const DIR_PERFILES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'config', 'perfiles');
export const OBJETIVOS = ['ninguno', 'agotar_conocimientos', 'visitar_todas_las_escenas', 'seguir_pistas', 'desenlace_directo', 'reparar_relaciones'];
export const PERFIL_POR_DEFECTO = 'aleatorio';

const esNum = (v) => typeof v === 'number' && Number.isFinite(v);
const esProb = (v) => esNum(v) && v >= 0 && v <= 1;

// Devuelve el perfil normalizado o lanza con archivo y campo.
export function validarPerfil(p, archivo = '(perfil)') {
  const falla = (campo, msg) => { throw new Error(`perfil inválido en ${archivo}, campo ${campo}: ${msg}`); };
  if (!p || typeof p !== 'object') falla('(raíz)', 'no es un objeto');
  if (typeof p.id !== 'string' || !/^[a-z0-9_-]+$/.test(p.id)) falla('id', 'texto en minúsculas sin espacios');
  if (!p.pesos || typeof p.pesos !== 'object' || Array.isArray(p.pesos)) falla('pesos', 'objeto requerido');
  const validas = new Set(['consulta_tema', ...verbos]);
  for (const [k, v] of Object.entries(p.pesos)) {
    if (!validas.has(k)) falla(`pesos.${k}`, 'no es consulta_tema ni un verbo del catálogo');
    if (!esNum(v) || v < 0) falla(`pesos.${k}`, 'peso negativo o no numérico');
  }
  if (!Object.values(p.pesos).some((v) => v > 0)) falla('pesos', 'al menos un peso > 0');
  const objetivo = p.objetivo ?? { tipo: 'ninguno' };
  if (!OBJETIVOS.includes(objetivo.tipo)) falla('objetivo.tipo', `desconocido "${objetivo.tipo}"`);
  if (objetivo.sesgo !== undefined && (!esNum(objetivo.sesgo) || objetivo.sesgo < 0)) falla('objetivo.sesgo', 'número >= 0');
  const entrada = { pBoton: 0.5, pGenerico: 0, genericoHastaTurno: 0, ...(p.entrada ?? {}) };
  for (const k of ['pBoton', 'pGenerico']) if (!esProb(entrada[k])) falla(`entrada.${k}`, 'probabilidad fuera de 0..1');
  if (!Number.isInteger(entrada.genericoHastaTurno) || entrada.genericoHastaTurno < 0) falla('entrada.genericoHastaTurno', 'entero >= 0');
  const ruido = { typos: 0, mayusculas: 0, incompletas: 0, nombraNpc: 0, adversarial: 0, ...(p.ruido ?? {}) };
  for (const [k, v] of Object.entries(ruido)) if (!esProb(v)) falla(`ruido.${k}`, 'probabilidad fuera de 0..1');
  const paciencia = p.paciencia ?? null;
  if (paciencia !== null && (!Number.isInteger(paciencia) || paciencia <= 0)) falla('paciencia', 'entero > 0 o null');
  const repiteSiFalla = p.repiteSiFalla ?? 0;
  if (!esProb(repiteSiFalla)) falla('repiteSiFalla', 'probabilidad fuera de 0..1');
  if (p.aprendeDeRespuestas !== undefined && typeof p.aprendeDeRespuestas !== 'boolean') falla('aprendeDeRespuestas', 'booleano');
  const ev = p.evolucion ?? null;
  if (ev !== null) {
    if (!Number.isInteger(ev.cadaTurnos) || ev.cadaTurnos <= 0) falla('evolucion.cadaTurnos', 'entero > 0');
    if (!esNum(ev.pBoton) || ev.pBoton < -1 || ev.pBoton > 1) falla('evolucion.pBoton', 'número entre -1 y 1');
    if (!esProb(ev.minPBoton)) falla('evolucion.minPBoton', 'probabilidad fuera de 0..1');
  }
  if (p.haiku !== undefined && p.haiku !== null && !esProb(p.haiku.p)) falla('haiku.p', 'probabilidad fuera de 0..1');
  return {
    id: p.id, nombre: p.nombre ?? p.id, descripcion: p.descripcion ?? '',
    pesos: { ...p.pesos }, objetivo: { tipo: objetivo.tipo, sesgo: objetivo.sesgo ?? 1 },
    entrada, ruido, paciencia, repiteSiFalla, aprendeDeRespuestas: p.aprendeDeRespuestas === true, evolucion: ev, haiku: p.haiku ?? null,
  };
}

export function cargarPerfiles(dir = DIR_PERFILES) {
  const perfiles = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
    const archivo = path.join(dir, f);
    let crudo;
    try { crudo = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch (e) { throw new Error(`perfil inválido en ${f}: JSON ilegible (${e.message})`); }
    const p = validarPerfil(crudo, f);
    if (perfiles.has(p.id)) throw new Error(`perfil inválido en ${f}, campo id: "${p.id}" repetido`);
    perfiles.set(p.id, p);
  }
  return perfiles;
}
