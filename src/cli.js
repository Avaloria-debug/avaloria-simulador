import { ejecutarLote, leerArgs } from './lote.js';
import { ejecutarCorpus, leerArgsCorpus } from './corpus.js';

const avisar = (m) => process.stderr.write(`Aviso: ${m}\n`);
const args = process.argv.slice(2);
try {
  if (args[0] === 'corpus') {
    const r = await ejecutarCorpus(leerArgsCorpus(args.slice(1)), {
      avisar,
      progreso: (n, total) => process.stderr.write(`\rLlamadas ${n}/${total}   `),
      alEstimar: (e) => {
        console.log(`Estimación: ${e.estados} estados × perfiles = ${e.llamadas} llamadas (${e.llamadasEfectivas} con el tope), ~${e.tokensPorLlamada} tokens por llamada, ~${e.tokens} tokens en total.`);
        if (e.superaTope) avisar(`la estimación supera el tope de llamadas; se corta en ${e.llamadasEfectivas}`);
        return true;
      },
    });
    process.stderr.write('\n');
    if (r.loteId) {
      console.log(`Corpus ${r.loteId} en ${r.dir} · modelo ${r.modelo}`);
      console.log(`${r.llamadas} llamadas, ${r.tokens} tokens · frases válidas ${r.frasesValidas}/${r.frasesPedidas} (${r.pctValidas} %) · no entendidas por el motor ${r.noEntendidas} (${r.pctNoEntendidas} %) · grupos candidatos ${r.gruposCandidatos}`);
      if (r.corte) avisar(`corte: ${r.corte}`);
      if (r.fallasParseo.length) avisar(`${r.fallasParseo.length} respuestas sin JSON legible o con error`);
    }
  } else {
    const r = await ejecutarLote(leerArgs(args), {
      avisar,
      progreso: (n, total, run) => process.stderr.write(`\rRuns ${n}/${total} · último: ${run.runId} [${run.perfil}] ${run.cierre} (${run.turnos} turnos)   `),
    });
    process.stderr.write('\n');
    console.log(`Lote ${r.loteId} en ${r.dir}`);
    console.log(`${r.parametros.runs} runs en ${r.segundos.toFixed(2)} s (${(r.parametros.runs / r.segundos).toFixed(2)} runs/seg)`);
  }
} catch (e) {
  console.error(`Error: ${e.message}`);
  process.exitCode = e.codigo === 'sin_keys' ? 3 : 1;
}
