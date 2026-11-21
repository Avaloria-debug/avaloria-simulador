import fs from 'node:fs';
import path from 'node:path';
import { DIR_DORADA } from './dorada.js';

// Umbrales de F6. Repeticiones: FASES no da umbral; se toma un aumento de más de 1 punto (SUPUESTO).
export const UMBRALES = Object.freeze({ similitudMedia: 0.05, pctReformulacion: 3, pctHitosAlcanzados: 5, pctRepeticiones: 1 });
const r = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d;
const nuevos = (a, b) => b.filter((x) => !a.includes(x));

/** Lee un resumen por ruta o por versión (simulaciones/dorada/<version>.json). */
export function leerResumen(ref, dir = DIR_DORADA) {
  const f = fs.existsSync(ref) ? ref : path.join(dir, ref.endsWith('.json') ? ref : `${ref}.json`);
  if (!fs.existsSync(f)) throw new Error(`resumen inexistente: ${ref}`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

/**
 * Compara dos resúmenes (a = base, b = nueva).
 * @returns {{regresion: boolean, regresiones: object[], cambios: object[]}}
 */
export function comparar(a, b) {
  const regresiones = []; const cambios = [];
  const lista = (tipo, items) => { if (items.length) regresiones.push({ tipo, items }); };
  lista('hitos_perdidos', nuevos(b.hitosAlcanzados, a.hitosAlcanzados));
  lista('trabadas_nuevas', nuevos(a.trabadas, b.trabadas));
  lista('excepciones_nuevas', nuevos(a.excepciones, b.excepciones));
  const metrica = (campo, sube) => {
    const d = r(b[campo] - a[campo]);
    if (d === 0) return;
    const c = { tipo: campo, antes: a[campo], despues: b[campo], diferencia: d };
    const supera = Math.abs(d) > UMBRALES[campo];
    if (supera && (sube ? d > 0 : d < 0)) regresiones.push(c); else cambios.push({ ...c, supera });
  };
  metrica('similitudMedia', true);
  metrica('pctReformulacion', true);
  metrica('pctHitosAlcanzados', false);
  metrica('pctRepeticiones', true);
  const mejoras = { hitos_nuevos: nuevos(a.hitosAlcanzados, b.hitosAlcanzados), trabadas_resueltas: nuevos(b.trabadas, a.trabadas), excepciones_resueltas: nuevos(b.excepciones, a.excepciones) };
  for (const [tipo, items] of Object.entries(mejoras)) if (items.length) cambios.push({ tipo, items });
  return { a: a.version, b: b.version, regresion: regresiones.length > 0, regresiones, cambios };
}

const NOMBRES = {
  hitos_perdidos: 'Hitos que dejaron de alcanzarse', trabadas_nuevas: 'Trabadas nuevas', excepciones_nuevas: 'Excepciones nuevas',
  similitudMedia: 'Similitud media', pctReformulacion: '% reformulación', pctHitosAlcanzados: '% hitos alcanzados', pctRepeticiones: '% repeticiones',
  hitos_nuevos: 'Hitos nuevos', trabadas_resueltas: 'Trabadas resueltas', excepciones_resueltas: 'Excepciones resueltas',
};
export const nombreCambio = (t) => NOMBRES[t] ?? t;

export function textoComparacion(c) {
  const v = (x) => (x ? `${x.version ?? '?'} (${String(x.commit ?? '').slice(0, 7)})` : '?');
  const l = [`Comparación ${v(c.a)} → ${v(c.b)}: ${c.regresion ? `${c.regresiones.length} regresiones` : 'sin regresiones'}.`];
  const fila = (x) => (x.items ? `- ${nombreCambio(x.tipo)}: ${x.items.join(', ')}` : `- ${nombreCambio(x.tipo)}: ${x.antes} → ${x.despues} (${x.diferencia > 0 ? '+' : ''}${x.diferencia})`);
  if (c.regresiones.length) l.push('Regresiones:', ...c.regresiones.map(fila));
  if (c.cambios.length) l.push('Otros cambios:', ...c.cambios.map(fila));
  return l.join('\n');
}
