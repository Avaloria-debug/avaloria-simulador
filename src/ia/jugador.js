// Jugador simulado con Groq: arma el pedido, valida la frase.
import { SYSTEM_JUGADOR } from './groq.js';
import { nombreDe } from '../adaptador.js';

// Token de catálogo al inicio (hablar_con, consultar_tema, [intencion_x]): salida rota, no es una frase de jugador.
export const TOKEN_CATALOGO = /^\[?[a-záéíóúñ]+_[a-záéíóúñ_]*/i;

// 1–200 caracteres, una línea, no vacía, sin token de catálogo al inicio. Devuelve la frase limpia o null.
export function validarFrase(t) {
  if (typeof t !== 'string') return null;
  const f = t.trim().replace(/^["'“”«»]+|["'“”«»]+$/g, '').trim();
  if (!f || f.length > 200 || /[\r\n]/.test(f) || TOKEN_CATALOGO.test(f)) return null;
  return f;
}

// Rol del jugador: el nombre del perfil sin la aclaración entre paréntesis. La descripción no va al pedido:
// el jugador IA la copiaba ("¿Qué sabés, dueño?", "contame lo primero que sepas").
export function rolDePerfil(p) {
  return String(p.nombre ?? p.id).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export function describirPerfil(p) {
  const pesos = Object.entries(p.pesos).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([k]) => k).join(', ');
  return `Perfil de jugador: ${rolDePerfil(p)}. Acciones que más usa: ${pesos}.`.replace(/\s+/g, ' ').trim();
}

export function describirEstado(d, hora) {
  const npcs = d.npcs.map((n) => n.nombre ?? nombreDe(n.id)).join(', ') || 'nadie';
  const objetos = d.objetos.map((o) => o.nombre ?? nombreDe(o.id)).join(', ') || 'ninguno';
  return `Escena: ${nombreDe(d.escena) ?? d.escena}. Hora: ${hora}. Personajes presentes: ${npcs}. Objetos: ${objetos}.`;
}

export function crearJugadorIa(cliente) {
  return {
    async pedirFrase(perfil, sim, ultimas) {
      const historial = ultimas.length ? ultimas.map((u) => `- ${u.frase} → ${String(u.respuesta ?? '').slice(0, 200)}`).join('\n') : '(sin interacciones todavía)';
      const user = `${describirPerfil(perfil)}\n${describirEstado(sim.detalle(), sim.estado().hora)}\nÚltimas interacciones:\n${historial}\n¿Qué escribís ahora?`;
      const r = await cliente.llamar({ system: SYSTEM_JUGADOR, user, maxTokens: 400 });
      return { frase: validarFrase(r.texto), crudo: r.texto, tokens: r.usage?.total_tokens ?? 0 };
    },
  };
}
