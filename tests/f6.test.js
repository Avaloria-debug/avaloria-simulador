import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { correrRun } from '../src/runner.js';
import { cargarPerfiles } from '../src/perfiles.js';
import { replayRun, replayLote, visorRun } from '../src/replay.js';
import { generarDorada, leerDorada, resumirDorada, correrDorada, PERFILES_REALES, ARCHIVO_DORADA } from '../src/dorada.js';
import { comparar, textoComparacion } from '../src/comparar.js';
import { idsCasos } from '../src/adaptador.js';

const perfiles = cargarPerfiles();
async function runPropio(perfil = 'curioso', seed = 61) {
  const turnos = [];
  const run = await correrRun({ idx: 0, seed, casoId: idsCasos[0], perfil: perfiles.get(perfil), modo: 'codigo', trabada: 15, maxTurnos: 60, alTurno: (t) => turnos.push(t) });
  return { run, turnos };
}

describe('F6: replay', () => {
  test('el replay de un run propio da 0 divergencias', async () => {
    const { run, turnos } = await runPropio();
    assert.ok(turnos.length >= 10);
    const r = await replayRun(run, turnos);
    assert.equal(r.turnos, turnos.length);
    assert.equal(r.divergencias, 0);
    assert.equal(r.primera, null);
  });

  test('con un turno alterado detecta la divergencia: primer turno y campo', async () => {
    const { run, turnos } = await runPropio('directo', 62);
    const alterados = turnos.map((t) => (t.turno === 4 ? { ...t, salida: { ...t.salida, texto: `${t.salida.texto} (alterado)` } } : t));
    const r = await replayRun(run, alterados);
    assert.equal(r.primera.turno, 4);
    assert.equal(r.primera.campo, 'salida.texto');
    assert.equal(r.divergencias, 1);
    const conHito = turnos.map((t) => (t.turno === 2 ? { ...t, hito: 'h9' } : t));
    const r2 = await replayRun(run, conHito);
    assert.deepEqual([r2.primera.turno, r2.primera.campo], [2, 'hito']);
  });

  test('replayLote lee el lote de disco y avisa si cambió la versión del narrador', async () => {
    const { run, turnos } = await runPropio('amable', 63);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f6-'));
    fs.writeFileSync(path.join(dir, 'runs.jsonl'), JSON.stringify(run) + '\n');
    fs.writeFileSync(path.join(dir, 'turnos.jsonl'), turnos.map((t) => JSON.stringify(t)).join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ narrador: { version: '0.0.1', commit: 'otro' } }));
    const r = await replayLote(dir, run.runId);
    assert.equal(r.mismaVersion, false);
    assert.equal(r.resultados[0].divergencias, 0);
    await assert.rejects(replayLote(dir, 'r9999-s1'), /run inexistente/);
  });

  test('visor: turnos con todos los campos, primer hito y primer turno trabado', () => {
    const t = (n, hito = null) => ({ runId: 'r', turno: n, hora: 'd1 08:00', escena: 'e', entrada: { tipo: 'texto', texto: `f${n}` }, decision: { intencion: 'i', regla: null, resultado: 'ejecuta' }, salida: { texto: 'x' }, tagsEscritos: [], tagsBorrados: [], hito });
    const ts = [t(1), t(2, 'h1'), ...[3, 4, 5, 6].map((n) => t(n))];
    const v = visorRun({ runId: 'r', perfil: 'p', caso: 'c', seed: 1, modo: 'codigo', cierre: 'trabada', turnos: 6 }, ts, 3);
    assert.equal(v.primerHito, 1);
    assert.equal(v.primerTrabado, 2);
    assert.deepEqual(Object.keys(v.turnos[0]).sort(), ['escena', 'frase', 'hito', 'hora', 'intencion', 'regla', 'resultado', 'tagsBorrados', 'tagsEscritos', 'texto', 'turno']);
  });
});

describe('F6: dorada', () => {
  test('config/dorada.json: 12 perfiles reales × 3 seeds, casos por rotación', () => {
    const d = leerDorada(ARCHIVO_DORADA);
    assert.equal(d.entradas.length, 36);
    assert.equal(PERFILES_REALES.length, 12);
    assert.deepEqual([...new Set(d.entradas.map((e) => e.perfil))].sort(), [...PERFILES_REALES].sort());
    for (const p of PERFILES_REALES) { assert.equal(d.entradas.filter((e) => e.perfil === p).length, 3, p); assert.ok(perfiles.has(p), p); }
    assert.deepEqual(d.entradas.map((e) => e.caso), d.entradas.map((_, i) => idsCasos[i % idsCasos.length]));
    assert.deepEqual(generarDorada(), d, 'el archivo coincide con la generación (si se edita a mano, este test lo avisa)');
  });

  test('correrDorada guarda el resumen por versión y es determinista', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'f6d-'));
    const archivo = path.join(dir, 'dorada.json');
    fs.writeFileSync(archivo, JSON.stringify({ entradas: generarDorada().entradas.slice(0, 4) }));
    const a = await correrDorada({ archivo, dirSalida: path.join(dir, 'a'), config: { trabada: 15, maxTurnos: 80 } });
    const b = await correrDorada({ archivo, dirSalida: path.join(dir, 'b'), config: { trabada: 15, maxTurnos: 80 } });
    assert.ok(fs.existsSync(a.salida));
    assert.match(path.basename(a.salida), /^\d+\.\d+\.\d+\.json$/);
    for (const k of ['runs', 'hitosAlcanzados', 'trabadas', 'excepciones', 'similitudMedia', 'pctReformulacion', 'pctHitosAlcanzados', 'pctRepeticiones']) assert.deepEqual(a.resumen[k], b.resumen[k], k);
    assert.equal(comparar(a.resumen, b.resumen).regresion, false);
  });
});

describe('F6: comparar', () => {
  const base = { version: { version: '0.0.1' }, hitosAlcanzados: ['caso_01:h1', 'caso_01:h2'], trabadas: ['a|caso_01|1'], excepciones: [], similitudMedia: 0.3, pctReformulacion: 10, pctHitosAlcanzados: 40, pctRepeticiones: 5 };
  const con = (cambios) => ({ ...base, version: { version: '0.0.2' }, ...cambios });
  const tipos = (c) => c.regresiones.map((x) => x.tipo);

  test('sin cambios no hay regresión', () => { assert.equal(comparar(base, con({})).regresion, false); });
  test('hito que deja de alcanzarse', () => { assert.deepEqual(comparar(base, con({ hitosAlcanzados: ['caso_01:h1'] })).regresiones, [{ tipo: 'hitos_perdidos', items: ['caso_01:h2'] }]); });
  test('trabada nueva', () => { assert.deepEqual(tipos(comparar(base, con({ trabadas: ['a|caso_01|1', 'b|caso_02|2'] }))), ['trabadas_nuevas']); });
  test('excepción nueva', () => { assert.deepEqual(tipos(comparar(base, con({ excepciones: ['b|caso_02|2'] }))), ['excepciones_nuevas']); });
  test('similitud media: más de 0.05 hacia arriba es regresión; 0.05 justo no', () => {
    assert.deepEqual(tipos(comparar(base, con({ similitudMedia: 0.36 }))), ['similitudMedia']);
    assert.equal(comparar(base, con({ similitudMedia: 0.35 })).regresion, false);
  });
  test('% reformulación: más de 3 puntos', () => {
    assert.deepEqual(tipos(comparar(base, con({ pctReformulacion: 13.5 }))), ['pctReformulacion']);
    assert.equal(comparar(base, con({ pctReformulacion: 13 })).regresion, false);
  });
  test('% hitos alcanzados: baja de más de 5 puntos (subir no es regresión)', () => {
    assert.deepEqual(tipos(comparar(base, con({ pctHitosAlcanzados: 34 }))), ['pctHitosAlcanzados']);
    assert.equal(comparar(base, con({ pctHitosAlcanzados: 35 })).regresion, false);
    assert.equal(comparar(base, con({ pctHitosAlcanzados: 60 })).regresion, false);
  });
  test('repeticiones: más de 1 punto', () => {
    assert.deepEqual(tipos(comparar(base, con({ pctRepeticiones: 6.5 }))), ['pctRepeticiones']);
    assert.equal(comparar(base, con({ pctRepeticiones: 6 })).regresion, false);
  });
  test('el texto lista regresiones y mejoras', () => {
    const t = textoComparacion(comparar(base, con({ trabadas: [], hitosAlcanzados: ['caso_01:h1'] })));
    assert.match(t, /Hitos que dejaron de alcanzarse: caso_01:h2/);
    assert.match(t, /Trabadas resueltas: a\|caso_01\|1/);
  });
  test('resumirDorada calcula los campos que compara', () => {
    const r = resumirDorada([{ runId: 'r0', perfil: 'p', caso: idsCasos[0], seed: 1, cierre: 'trabada', turnos: 2, hitos: ['h1'] }], [
      { runId: 'r0', turno: 1, decision: { resultado: 'reformula' }, salida: { texto: 'a', textoId: null }, hito: null, tagsEscritos: [], tagsBorrados: [] },
      { runId: 'r0', turno: 2, decision: { resultado: 'ejecuta' }, salida: { texto: 'b', textoId: 't' }, hito: 'h1', tagsEscritos: [], tagsBorrados: [] },
    ]);
    assert.deepEqual(r.trabadas, [`p|${idsCasos[0]}|1`]);
    assert.deepEqual(r.hitosAlcanzados, [`${idsCasos[0]}:h1`]);
    assert.equal(r.pctReformulacion, 50);
    assert.ok(r.pctHitosAlcanzados > 0);
  });
});

describe('F6: API de replay y regresión', () => {
  test('visor y verificación de un run, lista y comparación de resúmenes', async () => {
    const { crearServidor } = await import('../src/servidor/servidor.js');
    const { run, turnos } = await runPropio('curioso', 64);
    const dirSim = fs.mkdtempSync(path.join(os.tmpdir(), 'f6s-'));
    const lote = path.join(dirSim, 'L1'); fs.mkdirSync(lote);
    fs.writeFileSync(path.join(lote, 'config.json'), JSON.stringify({ parametros: { trabada: 15 } }));
    fs.writeFileSync(path.join(lote, 'runs.jsonl'), JSON.stringify(run) + '\n');
    fs.writeFileSync(path.join(lote, 'turnos.jsonl'), turnos.map((t) => JSON.stringify(t)).join('\n') + '\n');
    const dirDorada = fs.mkdtempSync(path.join(os.tmpdir(), 'f6r-'));
    const resumen = (v, extra = {}) => ({ version: { version: v }, fecha: '2026-11-21T00:00:00Z', segundos: 1, runs: [], hitosAlcanzados: ['caso_01:h1'], trabadas: [], excepciones: [], similitudMedia: 0, pctReformulacion: 0, pctHitosAlcanzados: 10, pctRepeticiones: 0, ...extra });
    fs.writeFileSync(path.join(dirDorada, '0.0.1.json'), JSON.stringify(resumen('0.0.1')));
    fs.writeFileSync(path.join(dirDorada, '0.0.2.json'), JSON.stringify(resumen('0.0.2', { hitosAlcanzados: [] })));
    const srv = crearServidor({ dirSim, dirDorada, archivoKeys: path.join(dirSim, 'no.json'), env: {} });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${srv.address().port}`;
    try {
      const v = await (await fetch(`${base}/api/lotes/L1/replay/${run.runId}?verificar=1`)).json();
      assert.equal(v.turnos.length, turnos.length);
      assert.equal(v.replay.divergencias, 0);
      assert.deepEqual((await (await fetch(`${base}/api/dorada`)).json()).map((d) => d.id), ['0.0.1', '0.0.2']);
      const c = await (await fetch(`${base}/api/dorada/comparar?a=0.0.1&b=0.0.2`)).json();
      assert.deepEqual(c.regresiones, [{ tipo: 'hitos_perdidos', items: ['caso_01:h1'] }]);
      assert.equal((await fetch(`${base}/api/dorada/comparar?a=../x&b=0.0.2`)).status, 400);
    } finally { await new Promise((ok) => srv.close(ok)); }
  });
});
