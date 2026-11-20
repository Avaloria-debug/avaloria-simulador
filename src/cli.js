import { ejecutarLote, leerArgs } from './lote.js';

try {
  const r = await ejecutarLote(leerArgs(process.argv.slice(2)), {
    progreso: (n, total, run) => process.stderr.write(`\rRuns ${n}/${total} · último: ${run.runId} [${run.perfil}] ${run.cierre} (${run.turnos} turnos)   `),
  });
  process.stderr.write('\n');
  console.log(`Lote ${r.loteId} en ${r.dir}`);
  console.log(`${r.parametros.runs} runs en ${r.segundos.toFixed(2)} s (${(r.parametros.runs / r.segundos).toFixed(2)} runs/seg)`);
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exitCode = 1;
}
