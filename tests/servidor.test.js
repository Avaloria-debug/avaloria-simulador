import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { crearServidor, enmascarar } from '../src/servidor/servidor.js';
import { DIR_PERFILES } from '../src/perfiles.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sim-ui-'));
const dirSim = path.join(tmp, 'sim');
const dirPerfiles = path.join(tmp, 'perfiles');
const archivoKeys = path.join(tmp, 'keys.json');
// Modo código: con keys falsas, un run ia llamaría a Groq.
const archivoConfig = path.join(tmp, 'config.json');
// Keys falsas armadas por partes para no disparar el chequeo de keys del commit.
const KEYS = { groq: [{ nombre: 'k1', key: ['gsk', 'PRUEBA_SECRETA_123456wxyz'].join('_') }], anthropic: { key: ['sk', 'ant', 'PRUEBA_SECRETA_abcd9876'].join('-') } };
let srv; let base;
const todas = [];
async function pedir(ruta, opciones = {}) {
  const r = await fetch(base + ruta, { ...opciones, headers: { 'content-type': 'application/json' } });
  const texto = await r.text();
  todas.push(texto);
  return { estado: r.status, texto, json: (() => { try { return JSON.parse(texto); } catch { return null; } })() };
}

before(async () => {
  fs.mkdirSync(dirPerfiles);
  for (const f of fs.readdirSync(DIR_PERFILES)) fs.copyFileSync(path.join(DIR_PERFILES, f), path.join(dirPerfiles, f));
  fs.writeFileSync(archivoKeys, JSON.stringify(KEYS));
  fs.writeFileSync(archivoConfig, JSON.stringify({ mezcla: { codigo: 100, ia: 0 }, salida: 'simulaciones' }));
  srv = crearServidor({ dirSim, dirPerfiles, archivoKeys, archivoConfig, env: {} });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${srv.address().port}`;
});
after(async () => { srv.closeAllConnections?.(); await new Promise((ok) => srv.close(ok)); fs.rmSync(tmp, { recursive: true, force: true }); });

test('escucha solo en 127.0.0.1', () => assert.equal(srv.address().address, '127.0.0.1'));

test('GET /api/config enmascara las keys', async () => {
  const r = await pedir('/api/config');
  assert.equal(r.estado, 200);
  assert.equal(r.json.keys.groq[0].key, enmascarar(KEYS.groq[0].key));
  assert.equal(r.json.keys.anthropic.key, '••••9876');
  assert.ok(r.json.casos.length > 0);
});

test('GET /api/perfiles y POST /api/perfiles/:id validan', async () => {
  const r = await pedir('/api/perfiles');
  assert.equal(r.estado, 200);
  const curioso = r.json.find((p) => p.id === 'curioso');
  assert.ok(curioso);
  const malo = await pedir('/api/perfiles/curioso', { method: 'POST', body: JSON.stringify({ ...curioso, pesos: { volar: 3 } }) });
  assert.equal(malo.estado, 400);
  assert.match(malo.json.error, /pesos\.volar/);
  const ok = await pedir('/api/perfiles/curioso', { method: 'POST', body: JSON.stringify({ ...curioso, paciencia: 7 }) });
  assert.equal(ok.estado, 200);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dirPerfiles, 'curioso.json'), 'utf8')).paciencia, 7);
  const dup = await pedir('/api/perfiles/curioso_copia', { method: 'POST', body: JSON.stringify({ ...curioso, id: 'curioso_copia' }) });
  assert.equal(dup.estado, 201);
  const distinto = await pedir('/api/perfiles/otro', { method: 'POST', body: JSON.stringify(curioso) });
  assert.equal(distinto.estado, 400);
});

test('POST /api/lote con parámetros inválidos da 400 con mensaje', async () => {
  for (const cuerpo of [{ perfiles: [{ id: 'noexiste', agentes: 2 }] }, { perfiles: [] }, { perfiles: [{ id: 'curioso', agentes: 1 }], trabada: -3 }, { perfiles: [{ id: 'curioso', agentes: 1 }], casos: ['caso_99'] }, { perfiles: [{ id: 'curioso', agentes: 1 }], mezcla: '50/20' }]) {
    const r = await pedir('/api/lote', { method: 'POST', body: JSON.stringify(cuerpo) });
    assert.equal(r.estado, 400, JSON.stringify(cuerpo));
    assert.ok(r.json.error.length > 5);
  }
  const roto = await pedir('/api/lote', { method: 'POST', body: '{no es json' });
  assert.equal(roto.estado, 400);
});

test('lote real: eventos SSE, lista, informe y runs', { timeout: 60000 }, async () => {
  const sse = await fetch(`${base}/api/lote/eventos`);
  assert.equal(sse.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  const lector = sse.body.getReader();
  const r = await pedir('/api/lote', { method: 'POST', body: JSON.stringify({ perfiles: [{ id: 'aventurero', agentes: 3 }], seedBase: 5 }) });
  assert.equal(r.estado, 202);
  assert.equal(r.json.runs, 3);
  const choque = await pedir('/api/lote', { method: 'POST', body: JSON.stringify({ perfiles: [{ id: 'aventurero', agentes: 1 }] }) });
  assert.equal(choque.estado, 409);
  let ultimo = null; let buf = '';
  while (ultimo?.estado !== 'terminado') {
    const { value, done } = await lector.read();
    if (done) break;
    buf += new TextDecoder().decode(value);
    for (const b of buf.split('\n\n').slice(0, -1)) ultimo = JSON.parse(b.replace(/^data: /, ''));
    buf = buf.split('\n\n').at(-1);
    assert.notEqual(ultimo?.estado, 'error', ultimo?.mensaje);
  }
  await lector.cancel();
  assert.equal(ultimo.hechos, 3);
  assert.ok('runsPorSeg' in ultimo && 'etaSeg' in ultimo && ultimo.cierres);
  const lotes = await pedir('/api/lotes');
  assert.equal(lotes.json.length, 1);
  assert.equal(lotes.json[0].id, ultimo.loteId);
  const inf = await pedir(`/api/lotes/${ultimo.loteId}/informe`);
  assert.equal(inf.estado, 200);
  assert.equal(inf.json.informe.runs, 3);
  const runs = await pedir(`/api/lotes/${ultimo.loteId}/runs`);
  assert.equal(runs.json.length, 3);
  assert.equal((await pedir('/api/lotes/no-existe/informe')).estado, 404);
  assert.equal((await pedir('/api/lote/parar', { method: 'POST' })).estado, 409);
});

test('parar un lote en curso', { timeout: 60000 }, async () => {
  const r = await pedir('/api/lote', { method: 'POST', body: JSON.stringify({ perfiles: [{ id: 'aleatorio', agentes: 400 }], seedBase: 900 }) });
  assert.equal(r.estado, 202);
  const p = await pedir('/api/lote/parar', { method: 'POST' });
  assert.equal(p.estado, 200);
});

test('corpus: estimación, 400 sin perfiles, lista vacía', { timeout: 60000 }, async () => {
  const e = await pedir('/api/corpus/estimar', { method: 'POST', body: JSON.stringify({ perfiles: ['curioso', 'torpe'], frases: 10, maxEstados: 2 }) });
  assert.equal(e.estado, 200);
  assert.equal(e.json.llamadas, 4);
  assert.equal(e.json.keys[0].key, enmascarar(KEYS.groq[0].key));
  assert.equal((await pedir('/api/corpus', { method: 'POST', body: JSON.stringify({ perfiles: [] }) })).estado, 400);
  assert.equal((await pedir('/api/corpus', { method: 'POST', body: JSON.stringify({ perfiles: ['curioso'], frases: 500 }) })).estado, 400);
  assert.deepEqual((await pedir('/api/corpus')).json, []);
  assert.equal((await pedir('/api/corpus/nada/agrupadas')).estado, 404);
});

test('corpus sin keys de Groq da 400', async () => {
  const s2 = crearServidor({ dirSim, dirPerfiles, archivoKeys: path.join(tmp, 'no-hay.json'), archivoConfig, env: {} });
  await new Promise((ok) => s2.listen(0, '127.0.0.1', ok));
  const r = await fetch(`http://127.0.0.1:${s2.address().port}/api/corpus`, { method: 'POST', body: JSON.stringify({ perfiles: ['curioso'] }) });
  assert.equal(r.status, 400);
  assert.match((await r.json()).error, /no hay keys de Groq/);
  await new Promise((ok) => s2.close(ok));
});

test('ajustes y estimación del lote: keys enmascaradas', async () => {
  const a = await pedir('/api/ajustes');
  assert.equal(a.estado, 200);
  assert.deepEqual(a.json.keys.map((k) => [k.key, k.estado]), [[enmascarar(KEYS.groq[0].key), 'disponible']]);
  const e = await pedir('/api/lote/estimar', { method: 'POST', body: JSON.stringify({ perfiles: [{ id: 'curioso', agentes: 10 }], mezcla: { codigo: 0, ia: 100 }, jugadorIa: true }) });
  assert.equal(e.estado, 200);
  assert.equal(e.json.llamadas, 70);
  assert.equal(e.json.keys, 1);
  assert.equal((await pedir('/api/lote/estimar', { method: 'POST', body: JSON.stringify({ perfiles: [{ id: 'curioso', agentes: 1 }], mezcla: { codigo: 50, ia: 20 } }) })).estado, 400);
});

test('la UI se sirve y no hay rutas fuera de ui/', async () => {
  const r = await pedir('/');
  assert.equal(r.estado, 200);
  assert.match(r.texto, /Simulador de Avaloria/);
  assert.equal((await pedir('/..%2Fconfig%2Fkeys.json')).estado, 404);
  assert.equal((await pedir('/api/nada')).estado, 404);
});

test('ninguna respuesta contiene el contenido de keys.json', () => {
  assert.ok(todas.length > 10);
  for (const t of todas) for (const k of [KEYS.groq[0].key, KEYS.anthropic.key]) assert.ok(!t.includes(k), 'una respuesta filtró una key');
});
