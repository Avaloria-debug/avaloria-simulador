import { exportar } from '../src/exportar.js';

// Uso: npm run exportar -- [--fuentes docs,<loteId>,...] [--salida <dir>]
const args = process.argv.slice(2);
const valor = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
try {
  const fuentes = valor('--fuentes')?.split(',').map((x) => x.trim()).filter(Boolean) ?? null;
  const { dir, archivos, resumen } = exportar({ fuentes, dirSalida: valor('--salida') });
  console.log(`Exportación en ${dir}: ${archivos.join(', ')}.`);
  console.log(`Aprobados ${resumen.aprobados} · léxico ${resumen.exportados['diccionario-lexico']} · patrones ${resumen.exportados['frases-patrones']} · textos ${resumen.exportados.textos} · descartados por duplicado ${resumen.duplicados} · sin intención ${resumen.sinIntencion}.`);
} catch (e) { console.error(`Error: ${e.message}`); process.exitCode = 1; }
