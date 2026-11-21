import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearJugadorIa, describirPerfil, rolDePerfil } from '../src/ia/jugador.js';
import { cargarPerfiles } from '../src/perfiles.js';
import { crearPartida } from '../src/adaptador.js';
import { conAzarDeterminista } from '../src/rng.js';

const palabras = (t) => new Set(t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-zñ]+/).filter((w) => w.length >= 5));

test('el pedido del jugador IA no lleva la descripción del perfil, sí el rol, las acciones y el estado', async () => {
  const perfiles = cargarPerfiles();
  for (const p of perfiles.values()) {
    const d = describirPerfil(p);
    if (p.descripcion) assert.ok(!d.includes(p.descripcion), p.id);
    assert.ok(d.includes(rolDePerfil(p)), p.id);
  }
  const p = perfiles.get('seguidor_pistas_dueno');
  assert.equal(rolDePerfil(p), 'Seguidor de pistas');
  await conAzarDeterminista(800, async () => {
    const sim = await crearPartida({ seed: 800, casoId: 'caso_01', partidaId: 'test-prompt' });
    let pedido = null;
    const cliente = { llamar: async (x) => { pedido = x; return { texto: 'miro alrededor', usage: { total_tokens: 1 } }; } };
    await crearJugadorIa(cliente).pedirFrase(p, sim, []);
    assert.ok(!pedido.user.includes(p.descripcion));
    assert.ok(!/dueño|lo primero que sabe/i.test(pedido.user), pedido.user);
    assert.match(pedido.user, /Escena: Mercado Circular\./);
    assert.match(pedido.user, /Personajes presentes: .*Serel Norlen/);
    assert.match(pedido.user, /Perfil de jugador: Seguidor de pistas\. Acciones que más usa: viajar, consulta_tema/);
    // Ninguna palabra propia de la descripción (5+ letras) que no esté ya en el resto del pedido por otra vía.
    const propias = [...palabras(p.descripcion)].filter((w) => !palabras(describirPerfil({ ...p, descripcion: '' })).has(w));
    for (const w of propias) assert.ok(!palabras(pedido.user).has(w) || ['donde'].includes(w), w);
  });
});
