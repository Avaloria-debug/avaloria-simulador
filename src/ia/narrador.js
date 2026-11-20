// IA del narrador en modo `ia`: key por turno desde el pool y cliente http inyectado (cuenta llamadas y tokens, detecta 429).
import { SinKeys, TopeAlcanzado, URL_GROQ } from './groq.js';

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));

// `cuenta` es compartida con el jugador IA del lote: {llamadas, tokens, max}.
export function crearIaNarrador({ pool, cuenta, fetch: f = globalThis.fetch, log = () => {}, esperar: esperarNarrador = null }) {
  return {
    esperar: esperarNarrador,
    // Se llama solo en turnos que el código no entendió (van a la IA). Sin key ni espera corta posible: SinKeys.
    async tomarKey() {
      if (cuenta.llamadas >= cuenta.max) throw new TopeAlcanzado(cuenta.max);
      let k = pool.elegir();
      if (!k) { const ms = pool.esperaMinima(); if (ms != null) { log(`todas las keys en espera: pausa de ${Math.ceil(ms / 1000)} s`); await esperar(ms + 250); k = pool.elegir(); } }
      if (!k) throw new SinKeys();
      return k;
    },
    http(k, turno) {
      return async (url, init) => {
        if (!String(url).startsWith(URL_GROQ.split('/openai')[0])) return f(url, init);
        if (cuenta.llamadas >= cuenta.max) throw new TopeAlcanzado(cuenta.max);
        cuenta.llamadas += 1; turno.llamadas += 1; pool.contar(k.nombre);
        const res = await f(url, init);
        if (res.status === 429) { pool.limitar(k.nombre, Number(res.headers.get('retry-after'))); turno.limitada = true; }
        if (res.ok) {
          try { const d = await res.clone().json(); const t = d.usage?.total_tokens ?? 0; cuenta.tokens += t; turno.tokens += t; } catch { /* sin usage */ }
        }
        return res;
      };
    },
  };
}
