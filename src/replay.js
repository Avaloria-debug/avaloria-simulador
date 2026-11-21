import fs from 'node:fs';
import path from 'node:path';
import { conAzarDeterminista } from './rng.js';
import { crearPartida, versionNarrador } from './adaptador.js';
import { leerJsonl } from './registro.js';

// Campos que se comparan turno a turno, en este orden. El texto solo se compara si el turno no usó IA:
// sin IA el replay no puede reproducir una respuesta de Groq (SUPUESTO en docs/SUPUESTOS.md).
const CAMPOS = ['hora', 'escena', 'decision.intencion', 'decision.regla', 'decision.resultado', 'salida.textoId', 'salida.texto', 'tagsEscritos', 'tagsBorrados', 'hito'];
const leer = (o, ruta) => ruta.split('.').reduce((x, k) => x?.[k], o);
const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const usoIa = (t) => (t.iaLlamadas ?? 0) > 0 || t.salida?.tipo === 'dialogo_ia';

/** Entrada del registro, tal como se le pasa al adaptador. */
export const entradaDe = (t) => (t.entrada.tipo === 'boton'
  ? { tipo: 'boton', intencion: t.entrada.intencion, parametros: t.entrada.parametros }
  : { tipo: 'texto', texto: t.entrada.texto });

/** Turno re-ejecutado con la misma forma que el registro (los campos de CAMPOS). */
function turnoDe(r, est) {
  return {
    hora: est.hora, escena: est.escena,
    decision: { intencion: r.intencion, regla: r.regla, resultado: r.resultado },
    salida: { texto: r.texto, textoId: r.textoId, tipo: r.tipoSalida ?? null },
    tagsEscritos: r.tagsEscritos, tagsBorrados: r.tagsBorrados, hito: r.hito,
  };
}

/** Diferencias de un turno: [{campo, esperado, real}]. */
export function compararTurno(registrado, real) {
  const difs = [];
  for (const c of CAMPOS) {
    if (c === 'salida.texto' && usoIa(registrado)) continue;
    if (c === 'decision.resultado' && usoIa(registrado)) continue;
    const a = leer(registrado, c); const b = leer(real, c);
    if (!igual(a, b)) difs.push({ campo: c, esperado: a ?? null, real: b ?? null });
  }
  return difs;
}

/**
 * Re-ejecuta un run con su seed y las entradas registradas, y lo compara contra los turnos.
 * @returns {{runId, turnos, divergencias, primera: {turno, campo, esperado, real}|null, pasos: object[]}}
 */
export async function replayRun(run, turnos) {
  const ts = turnos.filter((t) => t.runId === run.runId).sort((a, b) => a.turno - b.turno);
  const pasos = [];
  let primera = null; let divergencias = 0;
  await conAzarDeterminista(run.seed, async () => {
    const sim = await crearPartida({ seed: run.seed, casoId: run.caso, partidaId: `replay-${run.runId}` });
    try {
      for (const t of ts) {
        const r = await sim.aplicar(entradaDe(t));
        const real = turnoDe(r, sim.estado());
        const difs = compararTurno(t, real);
        if (difs.length) { divergencias += 1; primera ??= { turno: t.turno, ...difs[0] }; }
        pasos.push({ turno: t.turno, difs });
      }
    } finally {
      try { await sim.cerrar(); } catch { /* sin efecto */ }
    }
  });
  return { runId: run.runId, turnos: ts.length, divergencias, primera, pasos };
}

/** Lee el lote y hace el replay de un run (o de todos, si runId es null). */
export async function replayLote(dir, runId = null) {
  const runs = leerJsonl(path.join(dir, 'runs.jsonl'));
  const turnos = leerJsonl(path.join(dir, 'turnos.jsonl'));
  const elegidos = runId ? runs.filter((r) => r.runId === runId) : runs;
  if (runId && !elegidos.length) throw new Error(`run inexistente en el lote: ${runId}`);
  let version = null;
  try { version = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')).narrador ?? null; } catch { /* sin config */ }
  const resultados = [];
  for (const r of elegidos) if (r.cierre !== 'cuota' && r.turnos > 0) resultados.push(await replayRun(r, turnos));
  return { version, versionActual: versionNarrador, mismaVersion: !version || version.commit === versionNarrador.commit, resultados };
}

/** Datos del visor: los turnos del run con sus campos y los índices de "primer turno trabado" y "primer hito". */
export function visorRun(run, turnos, trabada = 15) {
  const ts = turnos.filter((t) => t.runId === run.runId).sort((a, b) => a.turno - b.turno);
  const primerHito = ts.findIndex((t) => t.hito);
  // Primer turno de la racha sin hito que terminó en trabada (o la primera racha de `trabada` turnos sin hito).
  let primerTrabado = -1; let racha = 0;
  for (let i = 0; i < ts.length; i++) {
    racha = ts[i].hito ? 0 : racha + 1;
    if (racha >= trabada) { primerTrabado = i - trabada + 1; break; }
  }
  return {
    run: { runId: run.runId, perfil: run.perfil, caso: run.caso, seed: run.seed, modo: run.modo, cierre: run.cierre, turnos: run.turnos },
    primerHito, primerTrabado,
    turnos: ts.map((t) => ({
      turno: t.turno, frase: t.entrada.tipo === 'boton' ? `[${t.entrada.intencion}] ${JSON.stringify(t.entrada.parametros ?? {})}` : t.entrada.texto,
      intencion: t.decision.intencion, regla: t.decision.regla, resultado: t.decision.resultado, texto: t.salida.texto,
      tagsEscritos: t.tagsEscritos, tagsBorrados: t.tagsBorrados, hito: t.hito, escena: t.escena, hora: t.hora,
    })),
  };
}
