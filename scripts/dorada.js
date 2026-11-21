import fs from 'node:fs';
import { correrDorada, generarDorada, ARCHIVO_DORADA } from '../src/dorada.js';

try {
  if (process.argv.includes('--generar')) {
    if (fs.existsSync(ARCHIVO_DORADA)) { console.error(`Ya existe ${ARCHIVO_DORADA}; no se sobrescribe.`); process.exit(2); }
    fs.writeFileSync(ARCHIVO_DORADA, JSON.stringify(generarDorada(), null, 2) + '\n');
    console.log(`Generado ${ARCHIVO_DORADA}.`);
    process.exit(0);
  }
  const { salida, resumen } = await correrDorada({ progreso: (n, t) => process.stderr.write(`\rDorada ${n}/${t}   `) });
  process.stderr.write('\n');
  console.log(`Dorada ${resumen.version.version}: ${resumen.runs.length} runs en ${resumen.segundos.toFixed(2)} s · hitos alcanzados ${resumen.pctHitosAlcanzados} % · trabadas ${resumen.trabadas.length} · excepciones ${resumen.excepciones.length}. Guardado en ${salida}`);
} catch (e) { console.error(`Error: ${e.message}`); process.exitCode = 1; }
