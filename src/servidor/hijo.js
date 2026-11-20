// Proceso hijo: corre un lote y manda progreso al servidor por IPC.
import fs from 'node:fs';
import path from 'node:path';
import { ejecutarLote } from '../lote.js';

const cli = JSON.parse(process.argv[2]);
try {
  const r = await ejecutarLote(cli, {
    progreso: (n, total, run) => process.send({ tipo: 'run', n, total, runId: run.runId, cierre: run.cierre, loteId: run.loteId }),
  });
  fs.writeFileSync(path.join(r.dir, 'tiempo.json'), JSON.stringify({ runs: r.parametros.runs, segundos: r.segundos }));
  process.send({ tipo: 'fin', loteId: r.loteId, segundos: r.segundos, runs: r.parametros.runs });
} catch (e) {
  process.send({ tipo: 'error', mensaje: e.message });
}
process.disconnect();
