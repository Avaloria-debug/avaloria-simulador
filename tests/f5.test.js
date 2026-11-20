import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ejecutarLote, estimarLote, leerArgs } from '../src/lote.js';
import { crearPool, leerKeysGroq } from '../src/ia/keys.js';
import { leerJsonl } from '../src/registro.js';
import { tipoTexto } from '../src/textos.js';

const K1 = ['gsk', 'FALSA_F5_UNO_9999qqqq'].join('_');
const K2 = ['gsk', 'FALSA_F5_DOS_8888pppp'].join('_');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-f5-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));
const archivoKeys = path.join(tmp, 'keys.json');
fs.writeFileSync(archivoKeys, JSON.stringify({ groq: [{ nombre: 'a', key: K1 }, { nombre: 'b', key: K2 }] }));
const SIN = path.join(tmp, 'no-hay.json');

// Servidor Groq falso: responde según `modo` y registra qué key llegó en cada llamada.
function groqFalso(modo = () => 'ok') {
  const llamadas = [];
  const f = async (url, o) => {
    const auth = o.headers.Authorization ?? o.headers.authorization;
    llamadas.push(auth);
    const m = modo(llamadas.length);
    if (m === '429corto') return new Response(JSON.stringify({ error: { message: 'tpm' } }), { status: 429, headers: { 'retry-after': '1' } });
    if (m === '429largo') return new Response(JSON.stringify({ error: { message: 'tpm' } }), { status: 429, headers: { 'retry-after': '7200' } });
    return new Response(JSON.stringify({ choices: [{ message: { content: `El guardia te mira sin entender, número ${llamadas.length}.` } }], usage: { prompt_tokens: 300, completion_tokens: 40, total_tokens: 340 } }), { status: 200 });
  };
  f.llamadas = llamadas;
  return f;
}
const politica = () => ({ tipo: 'texto', texto: 'qwerty zzz' });
const base = (cli) => ({ salida: path.join(tmp, 'sim'), perfiles: 'directo:3', maxTurnos: '6', trabada: '50', mezcla: '0/100', ...cli });
// raiz temporal: el uso diario de keys falsas no tiene que ir a simulaciones/ del repo.
const opciones = (fetch, extra = {}) => ({ raiz: tmp, config: { groq: { limiteDiarioPorKey: 250 }, modelos: { groq: 'openai/gpt-oss-120b' } }, politica, fetch, env: {}, archivoKeys, esperarIa: async () => {}, avisar: () => {}, ...extra });

test('keys: varias variables de entorno y rotación por la menos usada', () => {
  assert.deepEqual(leerKeysGroq({ env: { GROQ_API_KEY: K1, GROQ_API_KEY_2: K2 }, archivo: SIN }).map((k) => k.nombre), ['env', 'env2']);
  assert.equal(leerKeysGroq({ env: { GROQ_API_KEYS: `${K1}, ${K2}` }, archivo: SIN }).length, 2);
  const p = crearPool({ keys: [{ nombre: 'a', key: K1 }, { nombre: 'b', key: K2 }] });
  const usadas = [];
  for (let i = 0; i < 4; i++) { const k = p.elegir(); usadas.push(k.nombre); p.contar(k.nombre); }
  assert.deepEqual(usadas, ['a', 'b', 'a', 'b']);
  p.limitar('a', 30); assert.equal(p.elegir().nombre, 'b');
  assert.deepEqual(p.resumen().map((k) => k.estado), ['cooldown', 'disponible']);
  p.limitar('b', 500); assert.equal(p.elegir(), null);
  assert.deepEqual(p.resumen().map((k) => k.estado), ['cooldown', 'agotada']);
  assert.ok(p.esperaMinima() > 0 && p.esperaMinima() <= 30000);
  assert.ok(p.resumen().every((k) => !JSON.stringify(k).includes(K1) && !JSON.stringify(k).includes(K2)));
});

test('modo ia: llamadas y tokens contados, keys rotadas, textos capturados como candidatos', async () => {
  const f = groqFalso();
  const r = await ejecutarLote(base({}), opciones(f));
  assert.ok(f.llamadas.length > 0, 'el narrador tiene que llamar a la IA');
  assert.equal(r.ia.llamadas, f.llamadas.length);
  assert.equal(r.ia.tokens, 340 * f.llamadas.length);
  assert.ok(new Set(f.llamadas).size === 2, 'usa las dos keys');
  const runs = leerJsonl(path.join(r.dir, 'runs.jsonl'));
  assert.equal(runs.reduce((a, x) => a + x.iaLlamadas, 0), f.llamadas.length);
  const textos = leerJsonl(path.join(r.dir, 'candidatos', 'textos.jsonl'));
  assert.equal(textos.length, f.llamadas.length);
  for (const t of textos) {
    assert.equal(t.estado, 'pendiente');
    assert.ok(['saludo', 'consulta', 'reaccion', 'dialogo'].includes(t.tipo));
    assert.ok(t.contexto.escena && t.contexto.frase === 'qwerty zzz' && t.runId && t.turno && t.seed);
  }
  assert.equal(r.cuota, null);
});

test('429 corto: pausa y sigue; 429 largo en todas: cuota, estado.json y reanudación con las mismas seeds', async () => {
  const f1 = groqFalso((n) => (n === 1 ? '429corto' : 'ok'));
  const r1 = await ejecutarLote(base({ perfiles: 'directo:1' }), opciones(f1));
  assert.equal(r1.cuota, null);
  assert.ok(f1.llamadas.length >= 2);

  const f2 = groqFalso(() => '429largo');
  const avisos = [];
  const r2 = await ejecutarLote(base({}), opciones(f2, { avisar: (m) => avisos.push(m) }));
  assert.ok(r2.cuota);
  const runs = leerJsonl(path.join(r2.dir, 'runs.jsonl'));
  assert.ok(runs.every((x) => x.cierre === 'cuota'));
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(r2.dir, 'estado.json'), 'utf8')).completados, []);
  const seeds = runs.map((x) => x.seed);

  const f3 = groqFalso();
  const r3 = await ejecutarLote({ salida: path.join(tmp, 'sim'), reanudar: r2.loteId }, opciones(f3));
  assert.equal(r3.cuota, null);
  const finales = leerJsonl(path.join(r3.dir, 'runs.jsonl'));
  assert.equal(finales.length, 3);
  assert.ok(finales.every((x) => x.cierre !== 'cuota'));
  assert.deepEqual(finales.map((x) => x.seed), seeds);

  const todo = [...avisos, ...fs.readdirSync(r3.dir, { recursive: true }).filter((x) => /\.(json|jsonl|md)$/.test(x)).map((x) => fs.readFileSync(path.join(r3.dir, x), 'utf8'))].join('\n');
  assert.ok(!todo.includes(K1) && !todo.includes(K2), 'ninguna key completa en logs ni archivos');
});

test('tope de llamadas del lote: los runs pendientes cierran por cuota', async () => {
  const r = await ejecutarLote(base({ maxLlamadasIa: '1' }), opciones(groqFalso()));
  assert.ok(r.cuota);
  assert.ok(r.ia.llamadas <= 1);
  assert.ok(leerJsonl(path.join(r.dir, 'runs.jsonl')).some((x) => x.cierre === 'cuota'));
});

test('sin keys: un run ia que necesita la IA cierra por cuota', async () => {
  const r = await ejecutarLote(base({ perfiles: 'directo:1' }), opciones(groqFalso(), { archivoKeys: SIN }));
  assert.ok(r.cuota);
});

test('estimación previa: runs ia × 5 × 560 más el jugador IA, contra keys × límite', () => {
  const e = estimarLote({ perfiles: 'curioso:10', mezcla: '0/100', jugadorIa: 'si' }, { config: { groq: { limiteDiarioPorKey: 250 } }, env: {}, archivoKeys });
  assert.equal(e.runsIa, 10);
  assert.equal(e.llamadasNarrador, 50);
  assert.equal(e.llamadasJugador, 20);
  assert.equal(e.tokens, 70 * 560);
  assert.equal(e.keys, 2); assert.equal(e.capacidad, 500); assert.equal(e.superaCapacidad, false);
  assert.ok(leerArgs(['--estimar']).estimar);
});

test('tipo de texto candidato', () => {
  assert.equal(tipoTexto('hola, buenas'), 'saludo');
  assert.equal(tipoTexto('¿qué sabés del robo?'), 'consulta');
  assert.equal(tipoTexto('Brenn, ayudame', ['Brenn Holt']), 'dialogo');
  assert.equal(tipoTexto('qwerty zzz'), 'reaccion');
});
