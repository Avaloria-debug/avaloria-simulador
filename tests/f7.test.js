import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { exportar, filaDeFrase, leerBanco, verificarSalida } from '../src/exportar.js';
import { leerCandidatos, aplicarAccion, listarFuentes } from '../src/candidatos.js';
import { validarDiccionarioNarrador, textoDiccionario, DIR_NARRADOR } from '../src/adaptador.js';

const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const vacio = () => ({ lexico: new Set(), patrones: new Set(), textos: new Set() });
// Candidatos sintéticos, solo en memoria.
const frase = (id, texto, intencion, estado = 'aprobado') => ({ ref: `mem/a.jsonl#${id}`, fuente: 'mem', archivo: 'a.jsonl', id, clase: 'frase', estado, texto, textoEditado: null, intencion, frecuencia: 1 });
const texto = (id, t, estado = 'aprobado', extra = {}) => ({ ref: `mem/b.jsonl#${id}`, fuente: 'mem', archivo: 'b.jsonl', id, clase: 'texto', estado, texto: t, textoEditado: null, intencion: null, ...extra });
const leer = (dir, n) => fs.readFileSync(path.join(dir, n), 'utf8');
const entradas = (t) => Number(/^entradas: (\d+)/m.exec(t)[1]);

describe('F7: exportar', () => {
  test('solo salen los aprobados; rechazados y pendientes nunca', () => {
    const items = [
      frase('f1', 'Me compro el pan fresco y el queso.', 'intencion_comprar'),
      frase('f2', 'Esto no sale nunca porque está rechazado', 'intencion_comprar', 'rechazado'),
      frase('f3', 'Esto tampoco porque está pendiente', 'intencion_comprar', 'pendiente'),
      texto('t1', 'Serel te mira y sigue amasando.'),
      texto('t2', 'Texto rechazado que no sale.', 'rechazado'),
      texto('t3', 'Texto editado que no sale.', 'editado', { textoEditado: 'x' }),
    ];
    const dir = tmp('f7e-');
    const r = exportar({ items, dirSalida: dir, banco: vacio() });
    const todo = ['diccionario-lexico.add.md', 'frases-patrones.add.md', 'textos.json'].map((n) => leer(dir, n)).join('\n');
    assert.match(todo, /me compro el pan fresco y el queso/);
    assert.match(todo, /Serel te mira y sigue amasando/);
    assert.doesNotMatch(todo, /rechazad|pendiente|Texto editado|no sale/i);
    assert.equal(r.resumen.aprobados, 2);
    assert.equal(r.resumen.ignoradosNoAprobados, 4);
    assert.deepEqual(r.resumen.exportados, { 'diccionario-lexico': 0, 'frases-patrones': 1, textos: 1 });
  });

  test('las filas cumplen el formato real: el validador del narrador las carga sin errores', () => {
    const items = [
      frase('f1', 'me lo llevo', 'intencion_comprar'),
      frase('f2', 'Che, me voy al Camino del este a buscar a Sarin Tolle.', 'intencion_viajar'),
      frase('f3', 'Serel, ¿qué sabés de los hornos?', 'consulta_tema'),
      frase('f4', 'Le doy una mano a Brenn con la carga | ya', 'intencion_ayudar'),
    ];
    const dir = tmp('f7f-');
    exportar({ items, dirSalida: dir, banco: vacio() });
    for (const n of ['diccionario-lexico', 'frases-patrones']) {
      const t = leer(dir, `${n}.add.md`);
      const v = validarDiccionarioNarrador(n, t);
      assert.deepEqual(v.errores, [], n);
      assert.equal(v.cargados.length, entradas(t), n);
      // Misma cantidad de columnas que una fila del archivo real.
      const real = textoDiccionario(n).split('\n').find((l) => l.includes('|') && !l.startsWith('#'));
      for (const c of v.cargados) assert.equal(t.split('\n')[c.linea - 1].split('|').length, real.split('|').length, n);
    }
    const p = leer(dir, 'frases-patrones.add.md');
    assert.match(p, /^che, me voy al \{destino\} a buscar a \{npc\} \| intencion_viajar \| npc=sarin_mensajera;destino=escena_camino_este \| Che, me voy/m);
    assert.match(p, /^## Consultas$/m);
    assert.match(leer(dir, 'diccionario-lexico.add.md'), /^me lo llevo \| intencion_comprar \| coloquial$/m);
  });

  test('dedupe contra el banco existente y dentro de la exportación, con conteo', () => {
    const banco = leerBanco({ dirExportaciones: tmp('f7b-') });
    const yaEnLexico = textoDiccionario('diccionario-lexico').split('\n').find((l) => / \| intencion_hablar_con \| /.test(l)).split('|')[0].trim();
    const items = [
      frase('f1', yaEnLexico, 'intencion_hablar_con'),
      frase('f2', 'Hablá con Elia', 'intencion_hablar_con'),
      frase('f3', 'Me compro un pan de los grandes.', 'intencion_comprar'),
      frase('f4', 'me compro un pan de los grandes', 'intencion_comprar'),
      texto('t1', 'Un texto nuevo y único.'),
      texto('t2', 'Un texto nuevo y único'),
    ];
    const dir = tmp('f7d-');
    const r = exportar({ items, dirSalida: dir, banco });
    assert.equal(r.resumen.duplicados, 4);
    assert.deepEqual(r.resumen.exportados, { 'diccionario-lexico': 0, 'frases-patrones': 1, textos: 1 });
    assert.deepEqual(r.resumen.descartes.map((d) => d.ref), ['mem/a.jsonl#f1', 'mem/a.jsonl#f2', 'mem/a.jsonl#f4', 'mem/b.jsonl#t2']);
    // Una segunda exportación descarta los textos ya exportados.
    const base = path.dirname(dir);
    const r2 = exportar({ items: [texto('t9', 'Un texto nuevo y único.')], dirSalida: tmp('f7d2-'), banco: leerBanco({ dirExportaciones: base }) });
    assert.equal(r2.resumen.duplicados, 1);
  });

  test('frase sin intención válida no se exporta y se cuenta', () => {
    assert.deepEqual(filaDeFrase(frase('f', 'algo', null)), { descarte: 'sin_intencion' });
    const r = exportar({ items: [frase('f', 'algo raro', 'intencion_inexistente')], dirSalida: tmp('f7s-'), banco: vacio() });
    assert.equal(r.resumen.sinIntencion, 1);
  });

  test('con cero aprobados genera los archivos vacíos con su encabezado y no falla', () => {
    const dir = tmp('f7z-');
    const r = exportar({ items: [frase('f', 'pendiente', 'intencion_comprar', 'pendiente')], dirSalida: dir, banco: vacio() });
    assert.deepEqual(r.archivos.sort(), ['PROMPT-CARGA.md', 'diccionario-lexico.add.md', 'frases-patrones.add.md', 'resumen.json', 'textos.json']);
    for (const n of ['diccionario-lexico', 'frases-patrones']) {
      const t = leer(dir, `${n}.add.md`);
      assert.match(t, new RegExp(`^---\\ntipo: ${n}\\nversion: 1\\nentradas: 0\\n---`));
      assert.deepEqual(validarDiccionarioNarrador(n, t).errores, []);
    }
    assert.deepEqual(JSON.parse(leer(dir, 'textos.json')).textos, []);
    assert.equal(r.resumen.aprobados, 0);
  });

  test('PROMPT-CARGA.md trae los pasos y la regla del narrador', () => {
    const dir = tmp('f7p-');
    exportar({ items: [frase('f', 'me lo llevo', 'intencion_comprar')], dirSalida: dir, banco: vacio() });
    const p = leer(dir, 'PROMPT-CARGA.md');
    for (const x of ['diccionario-lexico.add.md', 'frases-patrones.add.md', 'textos.json', 'node narrador/validarContenido.js', 'npm test', '0 rojos', 'VERSION', 'Commit y push', 'No cambies contenido para que pase la suite']) assert.ok(p.includes(x), x);
    const actual = entradas(textoDiccionario('diccionario-lexico'));
    assert.ok(p.includes(`de ${actual} a ${actual + 1}`), 'conteo de entradas a actualizar');
  });

  test('nunca escribe en el repo del narrador', () => {
    assert.throws(() => verificarSalida(path.join(DIR_NARRADOR, 'data', 'diccionarios')), /repo del narrador/);
    assert.throws(() => verificarSalida('/home/x/avaloria-narrador/exportaciones'), /repo del narrador/);
    assert.throws(() => exportar({ items: [], dirSalida: path.join(DIR_NARRADOR, 'x'), banco: vacio() }), /repo del narrador/);
    assert.equal(fs.existsSync(path.join(DIR_NARRADOR, 'x')), false);
    assert.ok(verificarSalida(tmp('f7ok-')));
  });
});

describe('F7: revisión de candidatos', () => {
  const armar = () => {
    const dirDocs = tmp('f7c-'); const dirSim = tmp('f7l-');
    fs.writeFileSync(path.join(dirDocs, 't.jsonl'), [{ id: 't1', texto: 'Hola, viajero.', contexto: { npc: 'serel_panadero' }, estado: 'pendiente', lote: 'L' }, { id: 't2', texto: 'Chau.', estado: 'pendiente' }].map((x) => JSON.stringify(x)).join('\n') + '\n');
    fs.writeFileSync(path.join(dirDocs, 'f.json'), JSON.stringify({ generado: 'x', candidatos: { '(sin intención)': [{ id: 'c1', frase: 'me lo llevo', estado: 'pendiente', motorIntencion: 'intencion_comprar', frecuencia: 2, perfiles: ['amable'] }] } }, null, 2) + '\n');
    fs.mkdirSync(path.join(dirSim, 'L2', 'candidatos'), { recursive: true });
    fs.writeFileSync(path.join(dirSim, 'L2', 'candidatos', 'textos.jsonl'), JSON.stringify({ id: 't1', texto: 'Otro.', estado: 'pendiente' }) + '\n');
    return { dirDocs, dirSim };
  };

  test('lee fuentes docs y lotes, con ref única', () => {
    const d = armar();
    assert.deepEqual(listarFuentes(d).map((f) => f.id), ['docs', 'L2']);
    const c = leerCandidatos(d);
    assert.deepEqual(c.map((x) => x.ref).sort(), ['L2/textos.jsonl#t1', 'docs/f.json#c1', 'docs/t.jsonl#t1', 'docs/t.jsonl#t2']);
    const f = c.find((x) => x.id === 'c1');
    assert.deepEqual([f.clase, f.intencion, f.frecuencia, f.perfil], ['frase', 'intencion_comprar', 2, 'amable']);
  });

  test('aprobar, rechazar, editar y volver a pendiente: solo cambia lo suyo y queda en revision.json con fecha', () => {
    const d = armar();
    const antes = fs.readFileSync(path.join(d.dirDocs, 't.jsonl'), 'utf8');
    aplicarAccion(['docs/t.jsonl#t1', 'docs/t.jsonl#t2'], 'aprobar', { fecha: '2026-11-21T00:00:00Z', ...d });
    aplicarAccion(['docs/t.jsonl#t2'], 'rechazar', { fecha: '2026-11-21T00:00:01Z', ...d });
    aplicarAccion(['docs/f.json#c1'], 'editar', { texto: 'me llevo eso', intencion: 'intencion_comprar', fecha: '2026-11-21T00:00:02Z', ...d });
    aplicarAccion(['docs/t.jsonl#t1'], 'pendiente', { fecha: '2026-11-21T00:00:03Z', ...d });
    const lineas = fs.readFileSync(path.join(d.dirDocs, 't.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(lineas.map((x) => x.estado), ['pendiente', 'rechazado']);
    assert.deepEqual({ ...lineas[0], estado: 'pendiente' }, JSON.parse(antes.split('\n')[0]), 'el resto de la línea no cambia');
    const f = JSON.parse(fs.readFileSync(path.join(d.dirDocs, 'f.json'), 'utf8')).candidatos['(sin intención)'][0];
    assert.deepEqual([f.estado, f.textoEditado, f.intencionAprobada], ['pendiente', 'me llevo eso', 'intencion_comprar']);
    const rev = JSON.parse(fs.readFileSync(path.join(d.dirDocs, 'revision.json'), 'utf8')).revisiones;
    assert.equal(rev.length, 5);
    assert.deepEqual(rev.map((x) => [x.accion, x.de, x.a]), [['aprobar', 'pendiente', 'aprobado'], ['aprobar', 'pendiente', 'aprobado'], ['rechazar', 'aprobado', 'rechazado'], ['editar', 'pendiente', 'pendiente'], ['pendiente', 'aprobado', 'pendiente']]);
    assert.ok(rev.every((x) => x.fecha));
    assert.equal(fs.readFileSync(path.join(d.dirSim, 'L2', 'candidatos', 'textos.jsonl'), 'utf8').includes('pendiente'), true, 'otra fuente no se toca');
  });

  test('errores claros: acción desconocida, ref inválida, candidato inexistente, editar sin texto', () => {
    const d = armar();
    assert.throws(() => aplicarAccion(['docs/t.jsonl#t1'], 'borrar', d), /acción desconocida/);
    assert.throws(() => aplicarAccion(['docs/../x#t1'], 'aprobar', d), /referencia inválida/);
    assert.throws(() => aplicarAccion(['docs/t.jsonl#t9'], 'aprobar', d), /inexistentes/);
    assert.throws(() => aplicarAccion(['docs/t.jsonl#t1'], 'editar', { texto: ' ', ...d }), /texto corregido/);
  });

  test('aprobar en archivo temporal y exportar: el aprobado sale, el rechazado no', () => {
    const d = armar();
    aplicarAccion(['docs/t.jsonl#t1'], 'aprobar', d);
    aplicarAccion(['docs/t.jsonl#t2'], 'rechazar', d);
    const dir = tmp('f7x-');
    const r = exportar({ fuentes: ['docs'], dirSalida: dir, banco: vacio(), ...d });
    assert.deepEqual(JSON.parse(leer(dir, 'textos.json')).textos.map((t) => t.texto), ['Hola, viajero.']);
    assert.equal(r.resumen.aprobados, 1);
  });

  test('API: fuentes, lista, acción y exportación', async () => {
    const { crearServidor } = await import('../src/servidor/servidor.js');
    const d = armar();
    const dirExportaciones = tmp('f7api-');
    const srv = crearServidor({ ...d, dirExportaciones, archivoKeys: path.join(d.dirDocs, 'no.json'), env: {} });
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
    const base = `http://127.0.0.1:${srv.address().port}`;
    const post = (r, b) => fetch(base + r, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
    try {
      assert.deepEqual((await (await fetch(`${base}/api/candidatos/fuentes`)).json()).map((f) => [f.id, f.porEstado]), [['docs', { pendiente: 3 }], ['L2', { pendiente: 1 }]]);
      assert.equal((await (await fetch(`${base}/api/candidatos?fuentes=L2`)).json()).length, 1);
      assert.equal((await (await post('/api/candidatos/accion', { refs: ['docs/t.jsonl#t1'], accion: 'aprobar' })).json()).cambiados, 1);
      assert.equal((await post('/api/candidatos/accion', { refs: ['docs/t.jsonl#t1'], accion: 'borrar' })).status, 400);
      const e = await (await post('/api/exportar', { fuentes: ['docs'] })).json();
      assert.equal(e.resumen.exportados.textos, 1);
      assert.equal(fs.readdirSync(dirExportaciones).length, 1);
    } finally { await new Promise((ok) => srv.close(ok)); }
  });
});
