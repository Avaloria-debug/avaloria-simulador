// Consolida los candidatos de varias tandas de corpus en un solo frases-agrupadas.json para revisión humana.
import fs from 'node:fs';
import path from 'node:path';
import { normalizar, formasConocidas } from './adaptador.js';
import { tipoFrase, conjugacionDudosa } from './corpus.js';
import { leerJsonl } from './registro.js';

export const NO_ENTENDIDAS = new Set(['reformula', 'no_entendido']);
// Letras fuera del alfabeto del español (ej. "ё" cirílica): la frase se marca para revisar.
export const CARACTERES_RAROS = /[^\s\p{P}\p{S}\p{N}a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/u;

// filtro(fila) decide qué frases de cada tanda entran (por defecto: no entendidas o reformuladas).
export function consolidar(tandas, { conocidas = formasConocidas } = {}) {
  const grupos = new Map(); const marcadas = new Map();
  let entradas = 0; let yaConocidas = 0;
  for (const { nombre, filas, filtro = () => true } of tandas) {
    for (const f of filas) {
      if (!NO_ENTENDIDAS.has(f.motor?.resultado) || !filtro(f)) continue;
      entradas++;
      const normalizada = normalizar(f.frase);
      if (!normalizada) continue;
      if (conocidas.has(normalizada)) { yaConocidas++; continue; }
      const marca = conjugacionDudosa(f.frase) ? 'conjugacion_dudosa' : CARACTERES_RAROS.test(f.frase) ? 'revisar' : null;
      const destino = marca ? marcadas : grupos;
      const clave = `${f.intencionObjetivo ?? ''}|${normalizada}`;
      const x = destino.get(clave) ?? { marca, frase: f.frase, normalizada, frecuencia: 0, intencionObjetivo: f.intencionObjetivo ?? null, motores: {}, tipo: tipoFrase(f.frase), tandas: [], perfiles: [], ejemplos: [] };
      x.frecuencia += 1;
      const m = `${f.motor.intencion ?? ''}|${f.motor.regla ?? ''}`;
      x.motores[m] = (x.motores[m] ?? 0) + 1;
      if (!x.tandas.includes(nombre)) x.tandas.push(nombre);
      if (!x.perfiles.includes(f.perfil)) x.perfiles.push(f.perfil);
      if (x.ejemplos.length < 3 && !x.ejemplos.includes(f.frase)) x.ejemplos.push(f.frase);
      destino.set(clave, x);
    }
  }
  let n = 0;
  const fila = (x, marca) => {
    const [motorIntencion, motorRegla] = Object.entries(x.motores).sort((a, b) => b[1] - a[1])[0][0].split('|');
    return {
      id: `c${String(++n).padStart(4, '0')}`, frase: x.frase, normalizada: x.normalizada, frecuencia: x.frecuencia, intencionObjetivo: x.intencionObjetivo,
      motorIntencion: motorIntencion || null, motorRegla: motorRegla || null, tipo: x.tipo, ...(marca ? { marca } : {}),
      estado: 'pendiente', tandas: x.tandas, perfiles: x.perfiles, ejemplos: x.ejemplos,
    };
  };
  const orden = (a, b) => b.frecuencia - a.frecuencia || a.normalizada.localeCompare(b.normalizada);
  const porIntencion = {};
  for (const x of [...grupos.values()].sort(orden)) (porIntencion[x.intencionObjetivo ?? '(sin intención)'] ??= []).push(x);
  const candidatos = Object.fromEntries(Object.entries(porIntencion).sort((a, b) => b[1].reduce((s, x) => s + x.frecuencia, 0) - a[1].reduce((s, x) => s + x.frecuencia, 0) || a[0].localeCompare(b[0])).map(([k, xs]) => [k, xs.map((x) => fila(x))]));
  const marcadasLista = [...marcadas.values()].sort(orden).map((x) => fila(x, x.marca));
  const total = Object.values(candidatos).reduce((s, xs) => s + xs.length, 0);
  return {
    resumen: { entradas, yaConocidas, candidatos: total, apariciones: Object.values(candidatos).flat().reduce((s, x) => s + x.frecuencia, 0), marcadas: marcadasLista.length, conjugacionDudosa: marcadasLista.filter((x) => x.marca === 'conjugacion_dudosa').length, revisar: marcadasLista.filter((x) => x.marca === 'revisar').length, porIntencion: Object.fromEntries(Object.entries(candidatos).map(([k, xs]) => [k, xs.length])) },
    candidatos, marcadas: marcadasLista,
  };
}

export function leerTanda(dir) { return leerJsonl(path.join(dir, 'candidatos', 'frases.jsonl')); }
export function escribir(archivo, datos) { fs.mkdirSync(path.dirname(archivo), { recursive: true }); fs.writeFileSync(archivo, `${JSON.stringify(datos, null, 2)}\n`); }
