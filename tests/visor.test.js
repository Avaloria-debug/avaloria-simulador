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
  assert.doesNotMatch(html, /@import|url\(/i);
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
