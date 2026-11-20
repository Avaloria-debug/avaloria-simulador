import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCharla, npcDelTurno } from '../src/informe-charla.js';

const t = (extra) => ({ runId: 'r1', turno: 1, npcs: ['maren_archivista'], entrada: { tipo: 'texto', texto: 'hola' }, decision: { resultado: 'consulta' }, salida: { tipo: 'narracion', texto: 'x' }, ...extra });

test('informe de charla: consultas, temas, no_se, reformula, respuestas IA únicas, conocimientos y cierres', () => {
  const turnos = [
    t({ consulta: { npcId: 'maren_archivista', conocimientoId: 'conocimiento_maren_1', resultado: 'exito' } }),
    t({ consulta: { npcId: 'maren_archivista', conocimientoId: 'conocimiento_maren_1', resultado: 'exito' } }),
    t({ consulta: { npcId: 'maren_archivista', conocimientoId: null, resultado: 'no_se' } }),
    t({ consulta: { npcId: 'maren_archivista', conocimientoId: 'conocimiento_maren_2', resultado: 'fallo', motivo: 'umbral' }, decision: { resultado: 'negativa_relacion' } }),
    t({ decision: { resultado: 'reformula' } }),
    t({ salida: { tipo: 'dialogo_ia', texto: 'Maren te mira.' } }),
    t({ salida: { tipo: 'dialogo_ia', texto: 'maren te mira' } }),
  ];
  const runs = [
    { runId: 'r1', perfil: 'curioso', cierre: 'trabada', turnos: 7, hitos: ['h1'], conocimientosRevelados: ['conocimiento_maren_1'] },
    { runId: 'r2', perfil: 'curioso', cierre: 'cuota', turnos: 0, hitos: [] },
  ];
  const c = calcularCharla(runs, turnos);
  const m = c.npcs.find((x) => x.npc === 'maren_archivista');
  assert.equal(m.consultas, 4); assert.equal(m.consultasQueRevelaron, 2); assert.equal(m.temasRevelados, 1);
  assert.equal(m.pctNoSe, 25); assert.equal(m.negativasPorRelacion, 1);
  assert.equal(m.turnosPresente, 7); assert.equal(m.pctReformula, 14.3);
  assert.equal(m.respuestasIaUnicas, 1);
  assert.ok(c.conocimientos._1.revelados.some((x) => x.id === 'conocimiento_maren_1'));
  assert.ok(c.conocimientos._2.nunca.includes('conocimiento_maren_2'));
  assert.deepEqual(c.cierres, { desenlace: 0, trabada: 1, maxTurnos: 0, abandono: 0, cuota: 1, excepcion: 0 });
  assert.equal(c.runsCompletados, 1);
  assert.deepEqual(c.hitosPorPerfil.curioso, { runs: 1, runsConHito: 1, hitos: 1, porHito: { h1: 1 } });
});

test('NPC del turno: consulta, nombrado o primero presente', () => {
  assert.equal(npcDelTurno({ consulta: { npcId: 'a' }, npcs: ['b'] }), 'a');
  assert.equal(npcDelTurno({ npcs: ['serel_panadero', 'maren_archivista'], entrada: { texto: 'Maren, ayudame' } }), 'maren_archivista');
  assert.equal(npcDelTurno({ npcs: ['serel_panadero'], entrada: { texto: 'algo' } }), 'serel_panadero');
  assert.equal(npcDelTurno({ npcs: [] }), null);
});
