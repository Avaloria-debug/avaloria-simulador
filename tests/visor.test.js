import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generarHtml, leerComandos } from '../scripts/generar-html.js';

function armar() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visor-'));
  const dirSim = path.join(base, 'simulaciones');
  const lote = path.join(dirSim, '20990101-000000-7');
  fs.mkdirSync(path.join(lote, 'candidatos'), { recursive: true });
  fs.writeFileSync(path.join(lote, 'config.json'), JSON.stringify({ loteId: '20990101-000000-7', version: '0.8.0', fecha: '2099-01-01T00:00:00.000Z', narrador: { version: '0.0.99' },
    parametros: { runs: 3, perfiles: [{ id: 'amable', agentes: 3 }], salida: path.join(base, 'simulaciones'), extra: '/home/alguien/equipo/archivo.json y C:\\Users\\alguien\\x.json' } }));
  fs.writeFileSync(path.join(lote, 'informe.json'), JSON.stringify({ runs: 3, porCierre: { trabada: 2, desenlace: 1 }, pctTrabada: 66.7, porCaso: { caso_01: { runs: 3, hitos: {}, desenlaces: {} } }, resultadosMotor: { ejecuta: 100 }, topNoEntendidas: [{ frase: 'frase-de-prueba-xyz </script><b>', veces: 2 }] }));
  fs.writeFileSync(path.join(lote, 'informe.md'), `# Informe del lote\n\nSalida en ${base}/simulaciones.\n`);
  fs.writeFileSync(path.join(lote, 'candidatos', 'textos.jsonl'), JSON.stringify({ id: 't1', estado: 'pendiente', texto: 'texto-candidato-abc', contexto: { intencion: 'saludar' } }) + '\n');
  const dirDocs = path.join(base, 'docs', 'candidatos');
  fs.mkdirSync(dirDocs, { recursive: true });
  fs.writeFileSync(path.join(dirDocs, 'x-frases-agrupadas.json'), JSON.stringify({ candidatos: { mirar: [{ id: 'f1', estado: 'aprobado', frase: 'frase-doc-qwe' }] } }));
  const readme = path.join(base, 'README.md');
  fs.writeFileSync(readme, '# r\n\n```bash\nnpm test\nexport GROQ_API_KEY=x\n```\n\nSección dos:\n\n```bash\nnpm run dorada\n```\n');
  const salida = path.join(base, 'docs', 'visor', 'index.html');
  const r = generarHtml({ dirSim, dirDocs, salida, readme });
  return { base, r, html: fs.readFileSync(salida, 'utf8') };
}

test('visor: un único archivo sin referencias externas', () => {
  const { r, html, base } = armar();
  assert.equal(fs.readdirSync(path.dirname(r.salida)).length, 1);
  assert.doesNotMatch(html, /<(link|img|iframe)\b/i);
  assert.doesNotMatch(html, /<script[^>]*\bsrc=/i);
  assert.doesNotMatch(html, /\b(src|href)\s*=\s*["'](?!#)/i);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(html, /@import|\burl\(/);
  assert.doesNotMatch(html, /\bfetch\(|XMLHttpRequest|EventSource|WebSocket/);
  assert.equal((html.match(/<\/script>/gi) ?? []).length, 2);
  fs.rmSync(base, { recursive: true, force: true });
});

test('visor: contiene los datos del lote de prueba y sus candidatos', () => {
  const { r, html, base } = armar();
  const datos = JSON.parse(html.match(/<script id="datos" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(r.lotes, 1);
  const l = datos.lotes[0];
  assert.equal(l.id, '20990101-000000-7');
  assert.equal(l.runs, 3);
  assert.equal(l.versionNarrador, '0.0.99');
  assert.equal(l.perfiles, 'amable:3');
  assert.equal(l.informe.porCierre.desenlace, 1);
  assert.equal(l.informe.topNoEntendidas[0].frase, 'frase-de-prueba-xyz </script><b>');
  assert.match(l.informeMd, /Informe del lote/);
  assert.deepEqual(datos.candidatos.map((c) => [c.fuente, c.clase, c.texto, c.intencion]).sort(),
    [['20990101-000000-7', 'texto', 'texto-candidato-abc', 'saludar'], ['docs', 'frase', 'frase-doc-qwe', 'mirar']]);
  assert.ok(datos.candidatos.every((c) => !('ref' in c)));
  fs.rmSync(base, { recursive: true, force: true });
});

test('visor: sin rutas absolutas del equipo', () => {
  const { html, base } = armar();
  for (const p of [base, os.homedir(), process.cwd(), os.tmpdir()]) assert.ok(!html.includes(p), `contiene ${p}`);
  assert.doesNotMatch(html, /\/home\/|\/root\/|\/Users\/|[A-Za-z]:\\\\Users/);
  fs.rmSync(base, { recursive: true, force: true });
});

test('visor: comandos del README sin nada que mencione keys', () => {
  const cs = leerComandos('# r\n\n```bash\nnpm test\nexport GROQ_API_KEY=x\n```\n\nSección dos:\n\n```bash\nnpm run dorada\n```\n\n```json\n{"a":1}\n```\n');
  assert.deepEqual(cs, [{ seccion: 'Primeros pasos', comando: 'npm test' }, { seccion: 'Sección dos', comando: 'npm run dorada' }]);
  const reales = leerComandos(fs.readFileSync(new URL('../README.md', import.meta.url), 'utf8'));
  assert.ok(reales.some((c) => c.comando === 'npm run generar-html'));
  assert.ok(reales.every((c) => !/key|clave/i.test(c.comando + c.seccion)));
});

test('visor: keys.json se arma conservando el resto y sin keys vacías', async () => {
  const { leerKeysJson, armarKeysJson } = await import('../scripts/visor/keys-json.js');
  const r = leerKeysJson(JSON.stringify({ groq: [{ nombre: 'k1', key: ' clave-falsa-0000000000001 ' }, { nombre: 'k2', key: 'PEGAR' }, { key: '' }], anthropic: { key: 'otra-falsa' } }));
  assert.deepEqual(r.groq, [{ nombre: 'k1', key: 'clave-falsa-0000000000001' }]);
  r.groq.push({ nombre: 'k2', key: 'clave-falsa-0000000000002' });
  assert.deepEqual(JSON.parse(armarKeysJson(r)), { anthropic: { key: 'otra-falsa' }, groq: [{ nombre: 'k1', key: 'clave-falsa-0000000000001' }, { nombre: 'k2', key: 'clave-falsa-0000000000002' }] });
  assert.throws(() => leerKeysJson('[]'));
});

test('visor: el HTML generado no lleva keys de config/keys.json ni las guarda en el navegador', () => {
  const { html, base } = armar();
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB|document\.cookie/);
  assert.match(html, /href="#keys"/);
  fs.rmSync(base, { recursive: true, force: true });
});

test('visor: un archivo de candidatos o un config.json roto no tiran la generación', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'visor-roto-'));
  const sim = path.join(base, 'simulaciones');
  const mk = (d, archivos) => { fs.mkdirSync(path.join(sim, d, 'candidatos'), { recursive: true }); for (const [n, c] of Object.entries(archivos)) fs.writeFileSync(path.join(sim, d, n), c); };
  mk('a', { 'config.json': '{ roto', 'informe.json': JSON.stringify({ runs: 1 }) });
  mk('b', { 'config.json': JSON.stringify({ loteId: 'mismo', parametros: { perfiles: 'curioso', runs: '4' }, fecha: 'no-es-fecha' }) });
  mk('c', { 'config.json': JSON.stringify({ loteId: 'mismo', parametros: null, narrador: null }), 'informe.json': '{roto' });
  fs.writeFileSync(path.join(sim, 'b', 'candidatos', 'textos.jsonl'), '{"id":"t1","estado":"pendiente","texto":"bien"}\n{roto\n');
  const docs = path.join(base, 'docs');
  fs.mkdirSync(docs);
  fs.writeFileSync(path.join(docs, 'x-frases-agrupadas.json'), JSON.stringify({ candidatos: { mirar: 'no-es-lista', saludar: [{ id: 'f1', estado: 'pendiente', frase: 'hola' }] } }));
  const salida = path.join(base, 'out', 'index.html');
  const r = generarHtml({ dirSim: sim, dirDocs: docs, salida, readme: path.join(base, 'no-hay.md') });
  assert.equal(r.lotes, 3);
  assert.equal(r.candidatos, 2);
  assert.deepEqual(r.rotos.sort(), ['b/textos.jsonl (1)', 'docs/x-frases-agrupadas.json (1)']);
  const datos = JSON.parse(fs.readFileSync(salida, 'utf8').match(/<script id="datos" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  const porId = Object.fromEntries(datos.lotes.map((l) => [l.id, l]));
  assert.deepEqual(Object.keys(porId).sort(), ['a', 'b', 'c']);
  assert.equal(porId.b.loteId, 'mismo');
  assert.equal(porId.c.loteId, 'mismo');
  assert.equal(porId.b.perfiles, 'curioso');
  assert.equal(porId.b.runs, 4);
  assert.equal(porId.b.fecha, null);
  assert.equal(porId.a.informe.runs, 1);
  assert.equal(porId.c.informe, null);
  fs.rmSync(base, { recursive: true, force: true });
});

test('visor: comun.js normaliza candidatos con tipos inesperados', async () => {
  const { candidatosDeArchivo, resumenLote } = await import('../scripts/visor/comun.js');
  assert.equal(candidatosDeArchivo('docs', 'notas.md', 'x'), null);
  assert.equal(candidatosDeArchivo('docs', 'otro.json', '{"a":1}'), null);
  const r = candidatosDeArchivo('l', 't.jsonl', '{"id":"a","estado":"pendiente","texto":"x","frecuencia":"3","perfiles":["p",1],"contexto":{"intencion":{"x":1}}}\n\n[1]\nnull\n');
  assert.equal(r.errores, 0);
  assert.deepEqual([r.items[0].frecuencia, r.items[0].perfil, r.items[0].intencion, r.items[0].lote], [1, 'p', null, 'l']);
  assert.equal(resumenLote('d', [1], 'x', 5).loteId, 'd');
  assert.equal(resumenLote('d', { parametros: { perfiles: [null, { id: 'a' }, 'b'] } }).perfiles, 'a, b');
});
