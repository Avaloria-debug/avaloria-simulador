// Pool de keys de Groq: GROQ_API_KEY o config/keys.json (lista groq). Nunca se imprime una key completa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ARCHIVO_KEYS = path.join(RAIZ, 'config', 'keys.json');
export const ultimos4 = (k) => (typeof k === 'string' && k.length ? `••••${k.slice(-4)}` : '');
const hoy = (ahora) => new Date(ahora()).toISOString().slice(0, 10);

// Variables: GROQ_API_KEY y GROQ_API_KEY_2…GROQ_API_KEY_20 (o GROQ_API_KEYS separadas por coma). Si no hay ninguna, config/keys.json.
export function leerKeysGroq({ env = process.env, archivo = ARCHIVO_KEYS } = {}) {
  const deEnv = [];
  const sumar = (nombre, v) => { const k = String(v ?? '').trim(); if (k && !deEnv.some((x) => x.key === k)) deEnv.push({ nombre, key: k }); };
  sumar('env', env.GROQ_API_KEY);
  for (let i = 2; i <= 20; i++) sumar(`env${i}`, env[`GROQ_API_KEY_${i}`]);
  String(env.GROQ_API_KEYS ?? '').split(',').forEach((v, i) => sumar(`envs${i + 1}`, v));
  if (deEnv.length) return deEnv;
  let d;
  try { d = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return []; }
  return (Array.isArray(d.groq) ? d.groq : []).filter((k) => typeof k?.key === 'string' && k.key && k.key !== 'PEGAR')
    .map((k, i) => ({ nombre: String(k.nombre ?? `k${i + 1}`), key: k.key }));
}

// Uso diario persistido por nombre de key (sin la key) en `archivoUso`.
export function crearPool({ keys, limiteDiarioPorKey = 250, archivoUso = null, ahora = Date.now } = {}) {
  let uso = { fecha: hoy(ahora), porKey: {} };
  if (archivoUso) { try { const u = JSON.parse(fs.readFileSync(archivoUso, 'utf8')); if (u.fecha === uso.fecha) uso = u; } catch { /* nuevo */ } }
  const estado = new Map(keys.map((k) => [k.nombre, { ...k, cooldownHasta: 0, agotadaHasta: 0 }]));
  const guardar = () => { if (archivoUso) { fs.mkdirSync(path.dirname(archivoUso), { recursive: true }); fs.writeFileSync(archivoUso, JSON.stringify(uso)); } };
  const usadas = (n) => uso.porKey[n] ?? 0;
  return {
    tamaño: keys.length,
    elegir() {
      if (uso.fecha !== hoy(ahora)) uso = { fecha: hoy(ahora), porKey: {} };
      const t = ahora();
      const libres = [...estado.values()].filter((k) => k.cooldownHasta <= t && k.agotadaHasta <= t && usadas(k.nombre) < limiteDiarioPorKey);
      libres.sort((a, b) => usadas(a.nombre) - usadas(b.nombre));
      return libres[0] ?? null;
    },
    // Milisegundos hasta que se libere la primera key en cooldown (null si ninguna se libera pronto).
    esperaMinima() {
      const t = ahora();
      const xs = [...estado.values()].filter((k) => k.agotadaHasta <= t && usadas(k.nombre) < limiteDiarioPorKey && k.cooldownHasta > t).map((k) => k.cooldownHasta - t);
      return xs.length ? Math.min(...xs) : null;
    },
    contar(nombre) { uso.porKey[nombre] = usadas(nombre) + 1; guardar(); },
    // retry-after <= 120 s ⇒ cooldown; mayor ⇒ agotada.
    limitar(nombre, segundos) {
      const k = estado.get(nombre); if (!k) return;
      const s = Number.isFinite(segundos) && segundos > 0 ? segundos : 10;
      if (s <= 120) k.cooldownHasta = ahora() + s * 1000; else k.agotadaHasta = ahora() + s * 1000;
    },
    resumen() {
      const t = ahora();
      return [...estado.values()].map((k) => ({
        nombre: k.nombre, key: ultimos4(k.key), usadas: usadas(k.nombre), limite: limiteDiarioPorKey,
        estado: k.agotadaHasta > t ? 'agotada' : usadas(k.nombre) >= limiteDiarioPorKey ? 'limite_diario' : k.cooldownHasta > t ? 'cooldown' : 'disponible',
      }));
    },
  };
}
