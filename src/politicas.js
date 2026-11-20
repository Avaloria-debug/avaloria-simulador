import { elegir } from './rng.js';
import { intenciones, nombreDe } from './adaptador.js';

// 50% botón al azar, 50% texto con una forma del catálogo y un parámetro presente.
export function aleatoria(sim, rng) {
  if (rng() < 0.5) {
    const a = elegir(rng, sim.acciones());
    return { tipo: 'boton', intencion: a.intencion, parametros: a.parametros };
  }
  const i = elegir(rng, intenciones);
  const forma = elegir(rng, i.formas);
  const est = sim.estado();
  const candidatos = [...est.npcsPresentes, ...est.objetos, est.escena];
  const extra = rng() < 0.7 ? nombreDe(elegir(rng, candidatos)) : '';
  return { tipo: 'texto', texto: `${forma} ${extra}`.trim(), intencion: i.id };
}

export const politicas = { aleatoria };
