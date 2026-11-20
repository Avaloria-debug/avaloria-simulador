// Consolida las tres tandas de F4 en frases-agrupadas.json (sin llamar a la IA). Todo queda pendiente.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { consolidar, leerTanda, escribir } from '../src/consolidar.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIM = path.join(RAIZ, 'simulaciones');
const TANDAS = [
  { nombre: 'tanda1', dir: '20261120-061945-1-corpus' },
  // En la 2.ª tanda solo valían las frases con voseo (criterio de esa tanda): las 24 reportadas.
  { nombre: 'tanda2', dir: '20261120-062635-1-corpus', filtro: (f) => f.validacion === 'ok' },
  // En la 3.ª entran también las no entendidas de frases no válidas, que el reporte no listó.
  { nombre: 'tanda3', dir: '20261120-063343-1-corpus' },
];
const r = consolidar(TANDAS.map((t) => ({ ...t, filas: leerTanda(path.join(SIM, t.dir)) })));
const datos = { generado: new Date().toISOString(), fuente: TANDAS.map((t) => t.dir), ...r };
escribir(path.join(SIM, 'f4-consolidado', 'candidatos', 'frases-agrupadas.json'), datos);
escribir(path.join(RAIZ, 'docs', 'candidatos', 'F4-frases-agrupadas.json'), datos);
console.log(JSON.stringify(r.resumen, null, 1));
