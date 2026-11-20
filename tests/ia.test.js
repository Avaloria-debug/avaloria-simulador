import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearClienteGroq, URL_GROQ } from '../src/ia/groq.js';
import { crearPool, leerKeysGroq, ultimos4 } from '../src/ia/keys.js';
import { validarFrase, crearJugadorIa } from '../src/ia/jugador.js';
import { parsearFrasesJson, agrupar, ejecutarCorpus, estimar } from '../src/corpus.js';
import { crearPartida, formasConocidas } from '../src/adaptador.js';
import { correrRun } from '../src/runner.js';
import { cargarPerfiles } from '../src/perfiles.js';
import { ejecutarLote } from '../src/lote.js';
import { leerJsonl } from '../src/registro.js';

// Keys falsas armadas por partes (el chequeo de commit rechaza los prefijos reales).
const K1 = ['gsk', 'FALSA_UNO_1111aaaa'].join('_');
const K2 = ['gsk', 'FALSA_DOS_2222bbbb'].join('_');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-ia-'));
const SIN_KEYS = path.join(tmp, 'no-existe.json');
const fetchReal = globalThis.fetch;
before(() => { globalThis.fetch = async (u, o) => { if (String(u).includes('api.groq.com')) throw new Error('llamada real a Groq en tests'); return fetchReal(u, o); }; });
after(() => { globalThis.fetch = fetchReal; fs.rmSync(tmp, { recursive: true, force: true }); });

const respuesta = (estado, cuerpo, headers = {}) => new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), { status: estado, headers });
const ok = (texto, tokens = 100) => respuesta(200, { choices: [{ message: { content: texto } }], usage: { prompt_tokens: tokens - 20, completion_tokens: 20, total_tokens: tokens } });
function fetchFalso(respuestas) {
  const llamadas = [];
  const f = async (url, o) => { llamadas.push({ url, auth: o.headers.authorization, body: JSON.parse(o.body) }); const r = respuestas.shift(); return typeof r === 'function' ? r() : r; };
  f.llamadas = llamadas;
  return f;
}
const pool2 = () => crearPool({ keys: [{ nombre: 'k1', key: K1 }, { nombre: 'k2', key: K2 }], limiteDiarioPorKey: 250 });

test('keys: GROQ_API_KEY primero, si no keys.json; ultimos4', () => {
  assert.deepEqual(leerKeysGroq({ env: { GROQ_API_KEY: K1 }, archivo: SIN_KEYS }), [{ nombre: 'env', key: K1 }]);
  const a = path.join(tmp, 'keys.json');
  fs.writeFileSync(a, JSON.stringify({ groq: [{ nombre: 'x', key: K2 }, { nombre: 'y', key: 'PEGAR' }] }));
  assert.deepEqual(leerKeysGroq({ env: {}, archivo: a }), [{ nombre: 'x', key: K2 }]);
  assert.deepEqual(leerKeysGroq({ env: {}, archivo: SIN_KEYS }), []);
  assert.equal(ultimos4(K1), '••••aaaa');
});

test('groq: request con modelo, tokens contados', async () => {
  const f = fetchFalso([ok('hola', 150)]);
  const c = crearClienteGroq({ pool: pool2(), modelo: 'openai/gpt-oss-120b', fetch: f });
  const r = await c.llamar({ system: 's', user: 'u' });
  assert.equal(r.texto, 'hola');
  assert.equal(f.llamadas[0].url, URL_GROQ);
  assert.equal(f.llamadas[0].body.model, 'openai/gpt-oss-120b');
  assert.equal(c.llamadas, 1); assert.equal(c.tokens, 150);
});

test('groq: 429 con retry-after corto rota de key; 5xx reintenta; 4xx no; errores sin key completa', async () => {
  const f = fetchFalso([respuesta(429, 'lento', { 'retry-after': '5' }), ok('bien')]);
  const c = crearClienteGroq({ pool: pool2(), fetch: f, backoffMs: 1 });
  assert.equal((await c.llamar({ system: 's', user: 'u' })).texto, 'bien');
  assert.notEqual(f.llamadas[0].auth, f.llamadas[1].auth);
  const f2 = fetchFalso([respuesta(500, 'x'), respuesta(503, 'x'), respuesta(502, `eco ${K1}`)]);
  const c2 = crearClienteGroq({ pool: pool2(), fetch: f2, backoffMs: 1 });
  const e = await c2.llamar({ system: 's', user: 'u' }).catch((x) => x);
  assert.equal(f2.llamadas.length, 3);
  assert.ok(!e.message.includes(K1) && !e.message.includes(K2));
  const f3 = fetchFalso([respuesta(400, 'malo'), ok('no')]);
  await assert.rejects(crearClienteGroq({ pool: pool2(), fetch: f3, backoffMs: 1 }).llamar({ system: 's', user: 'u' }), /400/);
  assert.equal(f3.llamadas.length, 1);
});

test('groq: tope de llamadas y límite diario por key', async () => {
  const c = crearClienteGroq({ pool: pool2(), fetch: fetchFalso([ok('a'), ok('b'), ok('c')]), maxLlamadas: 2 });
  await c.llamar({ system: 's', user: 'u' }); await c.llamar({ system: 's', user: 'u' });
  await assert.rejects(c.llamar({ system: 's', user: 'u' }), { name: 'TopeAlcanzado' });
  const p = crearPool({ keys: [{ nombre: 'k1', key: K1 }], limiteDiarioPorKey: 1 });
  const c2 = crearClienteGroq({ pool: p, fetch: fetchFalso([ok('a'), ok('b')]) });
  await c2.llamar({ system: 's', user: 'u' });
  await assert.rejects(c2.llamar({ system: 's', user: 'u' }), { name: 'SinKeys' });
});

test('parser de JSON con fences y con basura', () => {
  assert.deepEqual(parsearFrasesJson('```json\n[{"frase":"hola","intencion":"intencion_observar"}]\n```'), [{ frase: 'hola', intencion: 'intencion_observar' }]);
  assert.deepEqual(parsearFrasesJson('Claro, acá van:\n[{"frase":"miro","intencion":"x"}] espero que sirva'), [{ frase: 'miro', intencion: 'x' }]);
  assert.equal(parsearFrasesJson('no hay json'), null);
  assert.equal(parsearFrasesJson('[{"frase": "roto"'), null);
  assert.equal(parsearFrasesJson('{"frase":"x"}'), null);
});

test('validación de frases', () => {
  assert.equal(validarFrase('  "miro alrededor"  '), 'miro alrededor');
  assert.equal(validarFrase(''), null);
  assert.equal(validarFrase('   '), null);
  assert.equal(validarFrase('dos\nlíneas'), null);
  assert.equal(validarFrase('x'.repeat(201)), null);
  assert.equal(validarFrase('x'.repeat(200)), 'x'.repeat(200));
  assert.equal(validarFrase(42), null);
});

test('clasificar no cambia el estado', async () => {
  const sim = await crearPartida({ seed: 3, casoId: 'caso_01' });
  const antes = JSON.stringify([sim.estado(), sim.detalle()]);
  for (const t of ['hablar con el panadero', 'asdf', 'viajar al puerto', 'qué sabés del robo']) sim.clasificar(t);
  assert.equal(JSON.stringify([sim.estado(), sim.detalle()]), antes);
  await sim.cerrar();
});

test('agrupación y dedupe: normaliza, cuenta, excluye formas conocidas y aciertos', () => {
  const conocida = [...formasConocidas][0];
  const f = (frase, objetivo, resultado, intencion = null) => ({ frase, perfil: 'torpe', intencionObjetivo: objetivo, motor: { resultado, intencion } });
  const g = agrupar([
    f('Che, ¿qué onda?', 'intencion_observar', 'no_entendido'),
    f('che que onda', 'intencion_observar', 'reformula'),
    f('CHE QUÉ ONDA!!', 'intencion_observar', 'no_entendido'),
    f('miro todo', 'intencion_observar', 'ejecuta', 'intencion_observar'),
    f('mirá esto', 'intencion_observar', 'ejecuta', 'intencion_examinar'),
    f(conocida, 'intencion_observar', 'no_entendido'),
    f('contame del robo', 'consulta_tema', 'consulta'),
    f('decime algo', 'consulta_tema', 'no_entendido'),
  ]);
  assert.deepEqual(g.intencion_observar.map((x) => [x.normalizada, x.frecuencia]), [['che que onda', 3], ['mira esto', 1]]);
  assert.deepEqual(g.consulta_tema.map((x) => x.normalizada), ['decime algo']);
});

test('estimación de llamadas y tokens', () => {
  const e = estimar({ estados: 3, perfiles: 3, frases: 30, maxLlamadasIa: 5, caracteresPedido: 2000 });
  assert.equal(e.llamadas, 9); assert.equal(e.llamadasEfectivas, 5); assert.ok(e.superaTope);
  assert.equal(e.tokensPorLlamada, 500 + 30 * 30 + 300);
});

test('sin key ⇒ reglas con aviso', async () => {
  const avisos = [];
  const r = await ejecutarLote({ perfiles: 'curioso:2', jugadorIa: 'si' }, { raiz: tmp, config: {}, env: {}, archivoKeys: SIN_KEYS, avisar: (m) => avisos.push(m) });
  assert.ok(avisos.some((m) => /sin keys de Groq/.test(m)));
  const turnos = leerJsonl(path.join(r.dir, 'turnos.jsonl'));
  assert.ok(turnos.length > 0 && turnos.every((t) => !t.origen));
});

test('modo turno: frases de la IA, inválidas caen a reglas con origenFalla', async () => {
  const perfil = { ...cargarPerfiles().get('curioso'), ia: { p: 1 } };
  const f = fetchFalso(Array.from({ length: 40 }, (_, i) => (i % 2 ? ok('frase\nen dos líneas') : ok('"qué sabés del robo?"'))));
  const c = crearClienteGroq({ pool: pool2(), fetch: f, maxLlamadas: 6 });
  const turnos = [];
  const run = await correrRun({ idx: 0, seed: 7, casoId: 'caso_01', perfil, modo: 'codigo', trabada: 15, maxTurnos: 10, alTurno: (t) => turnos.push(t), jugadorIa: crearJugadorIa(c) });
  assert.equal(c.llamadas, 6);
  assert.equal(turnos.filter((t) => t.origen === 'ia').length, 3);
  assert.equal(turnos.filter((t) => t.origenFalla === 'jugador_simulado').length, 3);
  assert.equal(run.jugadorIa.frases, 3);
  assert.ok(f.llamadas[0].body.messages[1].content.includes('Escena:'));
});

test('corpus de punta a punta con fetch mockeado', async () => {
  const cuerpo = '```json\n[{"frase":"Mirá alrededor","intencion":"intencion_observar"},{"frase":"zzzz qq","intencion":"intencion_observar"},{"frase":"","intencion":"intencion_observar"},{"frase":"contame del robo","intencion":"consulta_tema"}]\n```';
  const f = fetchFalso([ok(cuerpo, 900), ok('basura sin json', 50), ok(cuerpo, 900), ok(cuerpo, 900)]);
  const r = await ejecutarCorpus({ perfiles: 'curioso,torpe', frases: '4', maxEstados: '2', maxLlamadasIa: '3' }, { raiz: tmp, config: { modelos: { groq: 'openai/gpt-oss-120b' } }, env: { GROQ_API_KEY: K1 }, fetch: f });
  assert.equal(r.llamadas, 3);
  assert.equal(r.tokens, 1850);
  assert.match(r.corte, /tope/);
  assert.equal(r.fallasParseo.length, 1);
  assert.equal(r.frasesPedidas, 8); assert.equal(r.frasesValidas, 6); assert.equal(r.pctValidas, 75);
  const filas = leerJsonl(path.join(r.dir, 'candidatos', 'frases.jsonl'));
  assert.equal(filas.length, 6);
  assert.ok(filas.every((x) => x.estado === 'pendiente' && x.modelo === 'openai/gpt-oss-120b' && x.motor.resultado && x.estadoJuego.escena));
  assert.ok(fs.existsSync(path.join(r.dir, 'candidatos', 'frases-agrupadas.json')));
  const todo = fs.readFileSync(path.join(r.dir, 'corpus.json'), 'utf8') + fs.readFileSync(path.join(r.dir, 'candidatos', 'frases.jsonl'), 'utf8');
  assert.ok(!todo.includes(K1));
  const e = await ejecutarCorpus({ perfiles: 'curioso', maxEstados: '2' }, { raiz: tmp, config: {}, env: {}, archivoKeys: SIN_KEYS }).catch((x) => x);
  assert.match(e.message, /no hay keys de Groq/);
});
