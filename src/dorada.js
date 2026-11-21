import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { correrRun } from './runner.js';
import { cargarPerfiles } from './perfiles.js';
import { idsCasos, casos, versionNarrador } from './adaptador.js';
import { leerConfig } from './lote.js';
import { metricasF2 } from './informe-f2.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ARCHIVO_DORADA = path.join(RAIZ, 'config', 'dorada.json');
export const DIR_DORADA = path.join(RAIZ, 'simulaciones', 'dorada');
// 12 perfiles reales (SUPUESTO en docs/SUPUESTOS.md): los de F2 sin `aleatorio` ni `adversarial`, más `seguidor_pistas`.
export const PERFILES_REALES = ['agresivo', 'amable', 'aventurero', 'comerciante', 'curioso', 'directo', 'investigador', 'pasivo', 'primerizo', 'seguidor_pistas', 'sigiloso', 'torpe'];
export const SEED_DORADA = 7000;

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const r3 = (x) => Math.round(x * 1000) / 1000;
export const claveEntrada = (e) => `${e.perfil}|${e.caso}|${e.seed}`;

/** Lista fija: cada perfil × 3 seeds, con los casos por rotación. */
export function generarDorada(perfiles = PERFILES_REALES, ids = idsCasos, seedBase = SEED_DORADA) {
  const entradas = [];
  perfiles.forEach((perfil, i) => {
    for (let s = 0; s < 3; s++) {
      const n = i * 3 + s;
      entradas.push({ perfil, caso: ids[n % ids.length], seed: seedBase + n });
    }
  });
  return { version: 1, descripcion: 'Partidas fijas de regresión: 12 perfiles reales × 3 seeds, casos por rotación. Se corren en modo codigo.', entradas };
}

export function leerDorada(archivo = ARCHIVO_DORADA) {
  const d = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(d.entradas) || !d.entradas.length) throw new Error(`${archivo}: falta la lista "entradas"`);
  for (const [i, e] of d.entradas.entries()) {
    if (typeof e.perfil !== 'string' || typeof e.caso !== 'string' || !Number.isInteger(e.seed)) throw new Error(`${archivo}: entrada ${i} inválida (perfil, caso y seed entera)`);
  }
  return d;
}

/** Resumen de regresión a partir de runs y turnos (lo que guarda la dorada y lee comparar). */
export function resumirDorada(runs, turnos, { version = versionNarrador, segundos = null, fecha = new Date().toISOString() } = {}) {
  const m = metricasF2(runs, turnos);
  const totalHitos = (casoId) => casos.find((c) => c.id === casoId)?.hitos.length ?? 0;
  const posibles = runs.reduce((a, r) => a + totalHitos(r.caso), 0);
  const alcanzados = runs.reduce((a, r) => a + new Set(r.hitos).size, 0);
  const sims = Object.values(m.similitud).filter((s) => s.pares > 0).map((s) => s.jaccard.media);
  return {
    version, fecha, segundos,
    runs: runs.map((r) => ({ clave: claveEntrada({ perfil: r.perfil, caso: r.caso, seed: r.seed }), runId: r.runId, perfil: r.perfil, caso: r.caso, seed: r.seed, cierre: r.cierre, turnos: r.turnos, hitos: r.hitos, error: r.error ? r.error.split('\n')[0] : null })),
    hitosAlcanzados: [...new Set(runs.flatMap((r) => r.hitos.map((h) => `${r.caso}:${h}`)))].sort(),
    trabadas: runs.filter((r) => r.cierre === 'trabada').map((r) => claveEntrada(r)).sort(),
    excepciones: runs.filter((r) => r.cierre === 'excepcion').map((r) => claveEntrada(r)).sort(),
    similitudMedia: sims.length ? r3(sims.reduce((a, b) => a + b, 0) / sims.length) : 0,
    pctReformulacion: pct(turnos.filter((t) => t.decision.resultado === 'reformula').length, turnos.length),
    pctHitosAlcanzados: pct(alcanzados, posibles),
    pctRepeticiones: m.repeticiones.pctTurnosTextoRepetido,
  };
}

/** Corre la dorada en modo codigo y guarda simulaciones/dorada/<version>.json. */
export async function correrDorada({ archivo = ARCHIVO_DORADA, dirSalida = DIR_DORADA, config = leerConfig(), progreso = () => {} } = {}) {
  const dorada = leerDorada(archivo);
  const perfiles = cargarPerfiles();
  const runs = []; const turnos = [];
  const inicio = Date.now();
  for (const [idx, e] of dorada.entradas.entries()) {
    const perfil = perfiles.get(e.perfil);
    if (!perfil) throw new Error(`dorada: perfil inexistente "${e.perfil}"`);
    if (!idsCasos.includes(e.caso)) throw new Error(`dorada: caso inexistente "${e.caso}"`);
    const run = await correrRun({ idx, seed: e.seed, casoId: e.caso, perfil, modo: 'codigo', trabada: config.trabada ?? 15, maxTurnos: config.maxTurnos ?? 400, alTurno: (t) => turnos.push(t) });
    runs.push(run);
    progreso(idx + 1, dorada.entradas.length, run);
  }
  const resumen = resumirDorada(runs, turnos, { segundos: (Date.now() - inicio) / 1000 });
  fs.mkdirSync(dirSalida, { recursive: true });
  const salida = path.join(dirSalida, `${versionNarrador.version}.json`);
  fs.writeFileSync(salida, JSON.stringify(resumen, null, 2));
  return { salida, resumen };
}

export function listarDoradas(dir = DIR_DORADA) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    return { id: f.replace(/\.json$/, ''), version: r.version, fecha: r.fecha, segundos: r.segundos, runs: r.runs.length, pctHitosAlcanzados: r.pctHitosAlcanzados, trabadas: r.trabadas.length, excepciones: r.excepciones.length };
  });
}
