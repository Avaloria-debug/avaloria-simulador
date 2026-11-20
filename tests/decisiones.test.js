import { test } from 'node:test';
import assert from 'node:assert/strict';
import { siguientesFallos } from '../src/runner.js';
import { metricasF2 } from '../src/informe-f2.js';

test('negativa por relación no suma a la paciencia ni cierra por abandono', () => {
  const paciencia = 1;
  let fallos = 0; let cierre = null;
  for (const r of ['negativa_relacion', 'negativa_relacion', 'reformula', 'negativa_relacion', 'negativa_relacion', 'negativa_relacion']) {
    fallos = siguientesFallos(fallos, r);
    if (fallos > paciencia) cierre = 'abandono';
  }
  assert.equal(fallos, 1);
  assert.equal(cierre, null);
  assert.equal(siguientesFallos(1, 'no_entendido'), 2);
});

const run = (runId) => ({ runId, perfil: 'x', caso: 'c', cierre: 'maxTurnos', hitos: [], turnos: 2 });
const turno = (runId, n, tagsEscritos, tagsBorrados) => ({ runId, turno: n, escena: 'e', entrada: { tipo: 'boton' }, decision: { resultado: 'ejecuta' }, salida: {}, tagsEscritos, tagsBorrados, hito: null });

test('rencor que baja de 3 a 2 no cuenta como reparado; quitar el tag sí', () => {
  const m = metricasF2([run('a'), run('b')], [
    turno('a', 1, ['rencor|npc1|3'], []),
    turno('a', 2, ['rencor|npc1|2'], ['rencor|npc1|3']),
    turno('b', 1, ['rencor|npc1|3'], []),
    turno('b', 2, [], ['rencor|npc1|3']),
  ]);
  assert.deepEqual(m.tags.gravesSinReparacion.map((g) => g.runId), ['a']);
});
