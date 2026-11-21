import path from 'node:path';
import fs from 'node:fs';
import { replayLote } from '../src/replay.js';

const [loteId, runId] = process.argv.slice(2);
if (!loteId) { console.error('Uso: npm run replay -- <loteId> [runId]'); process.exit(2); }
const dir = fs.existsSync(loteId) ? loteId : path.join('simulaciones', loteId);
try {
  const r = await replayLote(dir, runId ?? null);
  if (!r.mismaVersion) console.error(`Aviso: el lote se corrió con el narrador ${r.version.version} (${String(r.version.commit).slice(0, 7)}) y el instalado es ${r.versionActual.version} (${String(r.versionActual.commit).slice(0, 7)}); las divergencias pueden venir del cambio de versión.`);
  let con = 0;
  for (const x of r.resultados) {
    if (x.primera) {
      con += 1;
      console.log(`${x.runId}: ${x.divergencias} turnos divergentes de ${x.turnos}. Primero: turno ${x.primera.turno}, campo ${x.primera.campo}. Esperado: ${JSON.stringify(x.primera.esperado)}. Real: ${JSON.stringify(x.primera.real)}.`);
    } else console.log(`${x.runId}: 0 divergencias en ${x.turnos} turnos.`);
  }
  console.log(`Replay de ${r.resultados.length} runs: ${con} con divergencias.`);
  process.exitCode = con ? 1 : 0;
} catch (e) { console.error(`Error: ${e.message}`); process.exitCode = 2; }
