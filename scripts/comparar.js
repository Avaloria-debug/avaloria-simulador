import { leerResumen, comparar, textoComparacion } from '../src/comparar.js';

const args = process.argv.slice(2);
const estricto = args.includes('--estricto');
const [a, b] = args.filter((x) => x !== '--estricto');
if (!a || !b) { console.error('Uso: npm run comparar -- <a> <b> [--estricto]  (versión de simulaciones/dorada o ruta a un resumen)'); process.exit(2); }
try {
  const c = comparar(leerResumen(a), leerResumen(b));
  console.log(textoComparacion(c));
  if (estricto && c.regresion) process.exitCode = 1;
} catch (e) { console.error(`Error: ${e.message}`); process.exitCode = 2; }
