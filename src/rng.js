export function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const FECHA_BASE = Date.UTC(2026, 0, 1, 12, 0, 0);

// Reemplaza Math.random y Date.now durante fn y los restaura al terminar.
export async function conAzarDeterminista(seed, fn) {
  const random = Math.random;
  const now = Date.now;
  let contador = 0;
  Math.random = mulberry32(seed ^ 0x5eed);
  Date.now = () => FECHA_BASE + contador++;
  try {
    return await fn();
  } finally {
    Math.random = random;
    Date.now = now;
  }
}

export const elegir = (rng, lista) => lista[Math.floor(rng() * lista.length)];
