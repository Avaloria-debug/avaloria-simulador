// Cliente de Groq (API compatible con OpenAI) para el jugador simulado y el corpus.
import { ultimos4 } from './keys.js';

export const URL_GROQ = 'https://api.groq.com/openai/v1/chat/completions';
export const MODELO_POR_DEFECTO = 'openai/gpt-oss-120b';
export const SYSTEM_JUGADOR = 'Sos un jugador de un juego de rol narrativo en texto. Hablás en español rioplatense (vos). Respondé solo con la frase que escribirías, sin comillas ni explicaciones.';

export class TopeAlcanzado extends Error { constructor(n) { super(`tope de llamadas a la IA alcanzado (${n})`); this.name = 'TopeAlcanzado'; } }
export class SinKeys extends Error { constructor() { super('no hay keys de Groq disponibles (GROQ_API_KEY o config/keys.json)'); this.name = 'SinKeys'; } }

const esperar = (ms) => new Promise((ok) => setTimeout(ok, ms));
const borrarKey = (texto, key) => (key ? String(texto).split(key).join(ultimos4(key)) : String(texto));

// Devuelve { llamar({system, user, maxTokens}) → {texto, usage}, llamadas, tokens }.
export function crearClienteGroq({ pool, modelo = MODELO_POR_DEFECTO, maxLlamadas = 300, timeoutMs = 30000, reintentos = 2, backoffMs = 1000, fetch: f = globalThis.fetch, log = () => {} }) {
  const c = { llamadas: 0, tokens: 0, tokensEntrada: 0, tokensSalida: 0, modelo };
  c.llamar = async ({ system, user, maxTokens = 1024 }) => {
    let ultimoError = null;
    for (let intento = 0; intento <= reintentos; intento++) {
      if (c.llamadas >= maxLlamadas) throw new TopeAlcanzado(maxLlamadas);
      const k = pool.elegir();
      if (!k) throw new SinKeys();
      c.llamadas += 1; pool.contar(k.nombre);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      let res;
      try {
        res = await f(URL_GROQ, {
          method: 'POST', signal: ctrl.signal,
          headers: { authorization: `Bearer ${k.key}`, 'content-type': 'application/json' },
          body: JSON.stringify({ model: modelo, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], max_completion_tokens: maxTokens, temperature: 1, reasoning_effort: 'low' }),
        });
      } catch (e) {
        ultimoError = new Error(`Groq sin respuesta (key ${ultimos4(k.key)}): ${borrarKey(e.message, k.key)}`);
        log(ultimoError.message);
        if (intento < reintentos) await esperar(backoffMs * 2 ** intento);
        continue;
      } finally { clearTimeout(timer); }
      if (res.ok) {
        const d = await res.json();
        const u = d.usage ?? {};
        c.tokens += u.total_tokens ?? 0; c.tokensEntrada += u.prompt_tokens ?? 0; c.tokensSalida += u.completion_tokens ?? 0;
        return { texto: d.choices?.[0]?.message?.content ?? '', usage: u };
      }
      const cuerpo = borrarKey(await res.text().catch(() => ''), k.key).slice(0, 300);
      ultimoError = new Error(`Groq respondió ${res.status} (key ${ultimos4(k.key)}): ${cuerpo}`);
      log(ultimoError.message);
      if (res.status === 429) pool.limitar(k.nombre, Number(res.headers.get('retry-after')));
      if (res.status !== 429 && res.status < 500) throw ultimoError;
      if (intento < reintentos) await esperar(backoffMs * 2 ** intento);
    }
    throw ultimoError;
  };
  return c;
}
