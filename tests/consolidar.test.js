import { test } from 'node:test';
import assert from 'node:assert/strict';
import { consolidar } from '../src/consolidar.js';
import { formasConocidas } from '../src/adaptador.js';
import { conjugacionDudosa } from '../src/corpus.js';

const f = (frase, intencionObjetivo = 'intencion_leer', resultado = 'reformula', extra = {}) => ({ frase, intencionObjetivo, perfil: 'torpe', motor: { resultado, intencion: 'intencion_leer', regla: 'falta_objeto' }, ...extra });

test('deduplicación: normaliza y cuenta frecuencia por intención; ignora entendidas y formas conocidas', () => {
  const conocida = [...formasConocidas][0];
  const r = consolidar([
    { nombre: 't1', filas: [f('Leo el MAPA!'), f('leo el mapa'), f('leo el mapa', 'intencion_examinar'), f('miro todo', 'intencion_observar', 'ejecuta'), f(conocida)] },
    { nombre: 't2', filas: [f('¿leo el mapa?'), f('decime algo', 'consulta_tema', 'no_entendido'), f('no cuenta', 'intencion_leer', 'reformula', { validacion: 'no_voseo' })], filtro: (x) => x.validacion !== 'no_voseo' },
  ]);
  const leer = r.candidatos.intencion_leer;
  assert.equal(leer.length, 1);
  assert.equal(leer[0].normalizada, 'leo el mapa');
  assert.equal(leer[0].frecuencia, 3);
  assert.deepEqual(leer[0].tandas, ['t1', 't2']);
  assert.equal(r.candidatos.intencion_examinar[0].frecuencia, 1);
  assert.equal(r.candidatos.consulta_tema[0].frase, 'decime algo');
  assert.equal(r.candidatos.intencion_observar, undefined);
  assert.equal(r.resumen.yaConocidas, 1);
  assert.equal(r.resumen.entradas, 6);
  assert.equal(r.resumen.candidatos, 3);
  assert.deepEqual(Object.keys(r.candidatos), ['intencion_leer', 'consulta_tema', 'intencion_examinar']);
});

test('una frase con tilde mal puesta queda marcada y fuera del lote', () => {
  assert.ok(conjugacionDudosa('leéo el libro viejo'));
  assert.ok(conjugacionDudosa('avanzó con cautela'));
  assert.ok(!conjugacionDudosa('leo el libro viejo'));
  assert.ok(!conjugacionDudosa('envío una carta'));
  const r = consolidar([{ nombre: 't', filas: [f('leéo el libro viejo'), f('leo el libro'), f('leё el pergamino')] }]);
  assert.deepEqual(r.marcadas.map((x) => [x.frase, x.marca]).sort(), [['leéo el libro viejo', 'conjugacion_dudosa'], ['leё el pergamino', 'revisar']].sort());
  assert.deepEqual(r.candidatos.intencion_leer.map((x) => x.frase), ['leo el libro']);
});

test('ninguna frase aprobada: todo queda pendiente, con los campos pedidos', () => {
  const r = consolidar([{ nombre: 't', filas: [f('leo el mapa'), f('leéo algo'), f('decime', 'consulta_tema', 'no_entendido')] }]);
  const todas = [...Object.values(r.candidatos).flat(), ...r.marcadas];
  assert.equal(todas.length, 3);
  for (const x of todas) {
    assert.equal(x.estado, 'pendiente');
    for (const k of ['id', 'frase', 'normalizada', 'frecuencia', 'intencionObjetivo', 'motorIntencion', 'motorRegla', 'tipo']) assert.ok(k in x, k);
  }
  assert.ok(!JSON.stringify(r).includes('aprobad'));
});
