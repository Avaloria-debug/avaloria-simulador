// Proceso hijo: corre un lote o un corpus y manda progreso al servidor por IPC.
import fs from 'node:fs';
import path from 'node:path';
import { ejecutarLote } from '../lote.js';
import { ejecutarCorpus } from '../corpus.js';

const { modo = 'lote', cli } = JSON.parse(process.argv[2]);
const avisar = (m) => process.send({ tipo: 'aviso', mensaje: m });
try {
  if (modo === 'corpus') {
    const r = await ejecutarCorpus(cli, { avisar, progreso: (n, total) => process.send({ tipo: 'run', n, total, cierre: 'llamada' }) });
    process.send({ tipo: 'fin', loteId: r.loteId, runs: r.llamadas, mensaje: r.corte ?? null });
  } else {
    const r = await ejecutarLote(cli, { avisar, progreso: (n, total, run) => process.send({ tipo: 'run', n, total, cierre: run.cierre }) });
    fs.writeFileSync(path.join(r.dir, 'tiempo.json'), JSON.stringify({ runs: r.parametros.runs, segundos: r.segundos }));
    process.send({ tipo: 'fin', loteId: r.loteId, segundos: r.segundos, runs: r.parametros.runs });
  }
} catch (e) {
  process.send({ tipo: 'error', mensaje: e.message });
}
process.disconnect();
