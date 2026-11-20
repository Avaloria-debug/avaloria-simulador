import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPartida } from '../src/adaptador.js';
import { conAzarDeterminista } from '../src/rng.js';

test('relaciones(): lectura numérica por NPC, sube al ayudar y no cambia el estado', async () => {
  await conAzarDeterminista(1, async () => {
    const sim = await crearPartida({ seed: 1, casoId: 'caso_01', partidaId: 'test-relaciones' });
    const antes = sim.relaciones();
    assert.equal(typeof antes.serel_panadero, 'number');
    assert.deepEqual(sim.relaciones(), antes);
    await sim.aplicar({ tipo: 'boton', intencion: 'intencion_ayudar', parametros: { npcId: 'serel_panadero' } });
    assert.ok(sim.relaciones().serel_panadero > antes.serel_panadero);
  });
});
