import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ejecutarLote, resolverParametros, leerArgs, asignarModos, DEFAULTS } from '../src/lote.js';
import { leerJsonl } from '../src/registro.js';
import { crearPartida } from '../src/adaptador.js';
import { conAzarDeterminista } from '../src/rng.js';
import { aleatoria } from '../src/politicas.js';
import { chequear } from '../scripts/chequear-keys.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sim-'));
// Modo código: estos tests no usan IA (desde F5 la mezcla por defecto es 40/60).
const lote = (cli, opciones = {}) => ejecutarLote({ salida: tmp(), ...cli }, { config: { mezcla: { codigo: 100, ia: 0 } }, ...opciones });
const leer = (dir, n) => fs.readFileSync(path.join(dir, n), 'utf8');

test('mismo seed dos veces => turnos.jsonl idéntico', async () => {
  const a = await lote({ runs: '4', maxTurnos: '40', trabada: '40' });
  const b = await lote({ runs: '4', maxTurnos: '40', trabada: '40' });
  assert.ok(leer(a.dir, 'turnos.jsonl').length > 0);
  assert.equal(leer(a.dir, 'turnos.jsonl'), leer(b.dir, 'turnos.jsonl'));
  for (const f of ['config.json', 'runs.jsonl', 'turnos.jsonl', 'estado.json', 'informe.json', 'informe.md']) assert.ok(fs.existsSync(path.join(a.dir, f)), f);
});

test('Math.random y Date.now se restauran después del run', async () => {
  const random = Math.random;
  const now = Date.now;
  await lote({ runs: '1', maxTurnos: '3' });
  assert.equal(Math.random, random);
  assert.equal(Date.now, now);
});

test('trabada con N chico', async () => {
  const r = await lote({ runs: '4', trabada: '2' });
  const runs = leerJsonl(path.join(r.dir, 'runs.jsonl'));
  assert.ok(runs.some((x) => x.cierre === 'trabada'));
  for (const x of runs) {
    assert.ok(['trabada', 'desenlace'].includes(x.cierre), x.cierre);
    if (x.cierre === 'trabada') {
      const t = leerJsonl(path.join(r.dir, 'turnos.jsonl')).filter((y) => y.runId === x.runId).slice(-2);
      assert.ok(t.every((y) => y.hito === null));
    }
  }
});

test('maxTurnos corta el run', async () => {
  const r = await lote({ runs: '3', trabada: '1000', maxTurnos: '5' });
  for (const x of leerJsonl(path.join(r.dir, 'runs.jsonl'))) {
    assert.equal(x.cierre, 'maxTurnos');
    assert.equal(x.turnos, 5);
  }
});

test('una excepción no corta el lote', async () => {
  const politica = (sim, rng, { idx, turno }) => {
    if (idx === 1 && turno === 3) throw new Error('falla simulada');
    return aleatoria(sim, rng);
  };
  const r = await lote({ runs: '3', maxTurnos: '6' }, { politica });
  const runs = leerJsonl(path.join(r.dir, 'runs.jsonl'));
  assert.equal(runs.length, 3);
  assert.equal(runs[1].cierre, 'excepcion');
  assert.match(runs[1].error, /falla simulada/);
  assert.notEqual(runs[2].cierre, 'excepcion');
});

test('--reanudar completa un lote cortado y da el mismo turnos.jsonl', async () => {
  const completo = await lote({ runs: '3', maxTurnos: '8' });
  const salida = tmp();
  const dir = path.join(salida, 'cortado');
  fs.mkdirSync(dir);
  fs.copyFileSync(path.join(completo.dir, 'config.json'), path.join(dir, 'config.json'));
  const runs = leerJsonl(path.join(completo.dir, 'runs.jsonl'));
  const turnos = leerJsonl(path.join(completo.dir, 'turnos.jsonl'));
  const deRun = (i) => turnos.filter((t) => t.runId === runs[i].runId);
  // Corte a mitad del run 1: run 0 completo, run 1 con turnos parciales y sin línea en runs.jsonl.
  fs.writeFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(runs[0]) + '\n');
  fs.writeFileSync(path.join(dir, 'turnos.jsonl'), [...deRun(0), ...deRun(1).slice(0, 2)].map((t) => JSON.stringify(t) + '\n').join(''));
  fs.writeFileSync(path.join(dir, 'estado.json'), JSON.stringify({ completados: [0] }));
  const r = await ejecutarLote({ salida, reanudar: 'cortado' }, { config: { mezcla: { codigo: 100, ia: 0 } } });
  assert.equal(r.loteId, 'cortado');
  assert.equal(leer(dir, 'turnos.jsonl'), leer(completo.dir, 'turnos.jsonl'));
  assert.equal(leer(dir, 'runs.jsonl'), leer(completo.dir, 'runs.jsonl'));
  assert.deepEqual(JSON.parse(leer(dir, 'estado.json')).completados, [0, 1, 2]);
});

test('validación de parámetros y precedencia', () => {
  assert.throws(() => resolverParametros({ runs: '0' }), /runs/);
  assert.throws(() => resolverParametros({ runs: 'abc' }), /runs/);
  assert.throws(() => resolverParametros({ trabada: '-3' }), /trabada/);
  assert.throws(() => resolverParametros({ maxTurnos: '2.5' }), /maxTurnos/);
  assert.throws(() => resolverParametros({ casos: 'caso_99' }), /caso_99/);
  // F5: el modo ia ya está disponible; 40/60 es la mezcla por defecto.
  assert.deepEqual(resolverParametros({ mezcla: '40/60' }).mezcla, { codigo: 40, ia: 60 });
  assert.throws(() => resolverParametros({ mezcla: '50/20' }), /mezcla/);
  assert.throws(() => leerArgs(['--nada', '1']), /desconocido/);
  assert.throws(() => leerArgs(['--runs']), /falta/);
  const p = resolverParametros({ runs: '7' }, { runs: 3, trabada: 9 });
  assert.equal(p.runs, 7);
  assert.equal(p.trabada, 9);
  assert.equal(p.maxTurnos, DEFAULTS.maxTurnos);
  assert.deepEqual(resolverParametros({ casos: 'caso_02,caso_01' }).casos, ['caso_02', 'caso_01']);
  assert.deepEqual(leerArgs(['--max-turnos', '5', '--seed-base', '3']), { maxTurnos: '5', seedBase: '3' });
});

test('mezcla asignada con cantidades exactas y determinista', () => {
  const m = asignarModos(10, { codigo: 40, ia: 60 }, 1);
  assert.equal(m.filter((x) => x === 'codigo').length, 4);
  assert.deepEqual(m, asignarModos(10, { codigo: 40, ia: 60 }, 1));
});

test('adaptador: estado, acciones y clasificar sin efectos', async () => {
  await conAzarDeterminista(5, async () => {
    const sim = await crearPartida({ seed: 5, casoId: 'caso_01' });
    const antes = sim.estado();
    assert.equal(antes.caso, 'caso_01');
    assert.ok(sim.acciones().some((a) => a.nivel === 1) && sim.acciones().some((a) => a.nivel === 2));
    const c = sim.clasificar('hablar con serel');
    assert.equal(c.resultado, 'ejecuta');
    assert.deepEqual(sim.estado(), antes);
    const r = await sim.aplicar({ tipo: 'texto', texto: 'qwerty zzz' });
    assert.equal(r.resultado, 'reformula');
    await sim.cerrar();
  });
});

test('chequeo de keys', () => {
  assert.deepEqual(chequear([{ ruta: 'src/a.js', contenido: 'nada' }, { ruta: 'config/keys.ejemplo.json', contenido: '{"key":"PEGAR"}' }]), []);
  assert.equal(chequear([{ ruta: 'config/keys.json', contenido: '{}' }]).length, 1);
  assert.equal(chequear([{ ruta: 'x.txt', contenido: 'k=' + 'gsk' + '_123' }]).length, 1);
  assert.equal(chequear([{ ruta: 'y.txt', contenido: 'k=' + 'sk-' + 'ant-123' }]).length, 1);
});
