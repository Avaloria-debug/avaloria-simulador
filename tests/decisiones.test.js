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

test('run real: 20 negativas por relación seguidas con paciencia 1 no cierran por abandono; el control con fallos sí', async () => {
  const { correrRun } = await import('../src/runner.js');
  const { cargarPerfiles } = await import('../src/perfiles.js');
  const perfiles = cargarPerfiles();
  const base = perfiles.get('amable');
  // Solo consultas por botón a NPCs con relación 0: el narrador se niega por umbral (motivo `umbral`) en cada turno.
  const consultor = { ...base, id: 'prueba_paciencia', pesos: { consulta_tema: 100 }, objetivo: { tipo: 'ninguno', sesgo: 0 }, entrada: { ...base.entrada, pBoton: 1 }, ruido: { ...base.ruido, typos: 0 }, paciencia: 1, repiteSiFalla: 0, ia: { p: 0 } };
  const turnos = [];
  const r = await correrRun({ idx: 0, seed: 1, casoId: 'caso_01', perfil: consultor, modo: 'codigo', trabada: 20, maxTurnos: 40, alTurno: (t) => turnos.push(t) });
  assert.equal(turnos.length, 20);
  assert.ok(turnos.every((t) => t.decision.resultado === 'negativa_relacion'), [...new Set(turnos.map((t) => t.decision.resultado))].join(','));
  assert.equal(r.cierre, 'trabada');
  const control = await correrRun({ idx: 0, seed: 1, casoId: 'caso_01', perfil: { ...perfiles.get('adversarial'), paciencia: 1 }, modo: 'codigo', trabada: 20, maxTurnos: 40 });
  assert.equal(control.cierre, 'abandono');
});
