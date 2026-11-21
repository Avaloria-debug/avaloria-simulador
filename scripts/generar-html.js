// Genera docs/visor/index.html: un único archivo con los datos incrustados, para abrir con doble clic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { candidatosDeArchivo, resumenLote, porFecha } from './visor/comun.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VISOR = path.join(RAIZ, 'scripts', 'visor');
const leerJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const leerTexto = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const ABSOLUTA = /(?:\/(?:home|root|Users|tmp|var|private|mnt|opt|srv|media)\/[^\s"'`|)<>]*)|(?:\b[A-Za-z]:\\[^\s"'`|)<>]*)/g;

/** Quita rutas absolutas del equipo: deja solo el último tramo. */
function sinRutas(v, raices) {
  if (typeof v === 'string') {
    let s = v;
    for (const r of raices) s = s.split(r + path.sep).join('').split(r).join('.');
    return s.replace(ABSOLUTA, (m) => m.split(/[\\/]/).filter(Boolean).at(-1) ?? '');
  }
  if (Array.isArray(v)) return v.map((x) => sinRutas(x, raices));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sinRutas(x, raices)]));
  return v;
}

function leerLotes(dirSim) {
  if (!fs.existsSync(dirSim)) return [];
  const out = [];
  for (const d of fs.readdirSync(dirSim).sort()) {
    const dir = path.join(dirSim, d);
    if (!fs.existsSync(path.join(dir, 'config.json'))) continue;
    out.push(resumenLote(d, leerJson(path.join(dir, 'config.json')), leerJson(path.join(dir, 'informe.json')), leerTexto(path.join(dir, 'informe.md'))));
  }
  return out.sort(porFecha);
}

/** Candidatos de docs/candidatos y de simulaciones/<lote>/candidatos. Un archivo roto se cuenta y se salta. */
function leerCandidatos(dirSim, dirDocs) {
  const fuentes = [];
  if (fs.existsSync(dirDocs)) fuentes.push(['docs', dirDocs]);
  if (fs.existsSync(dirSim)) for (const d of fs.readdirSync(dirSim).sort()) { const c = path.join(dirSim, d, 'candidatos'); if (fs.existsSync(c)) fuentes.push([d, c]); }
  const items = []; const rotos = [];
  for (const [fuente, dir] of fuentes) {
    for (const archivo of fs.readdirSync(dir).sort()) {
      let txt; try { txt = fs.readFileSync(path.join(dir, archivo), 'utf8'); } catch { continue; }
      const r = candidatosDeArchivo(fuente, archivo, txt);
      if (!r) continue;
      items.push(...r.items);
      if (r.errores) rotos.push(`${fuente}/${archivo} (${r.errores})`);
    }
  }
  return { items, rotos };
}

/** Comandos de los bloques bash del README, con el párrafo que los presenta. Nada que mencione keys. */
export function leerComandos(readme) {
  const out = []; let seccion = 'Inicio'; let enBloque = false;
  for (const l of readme.split('\n')) {
    if (/^```/.test(l)) { enBloque = !enBloque && /^```(bash|sh)?\s*$/.test(l); continue; }
    if (enBloque) { if (l.trim() && !/key|clave/i.test(l)) out.push({ seccion, comando: l.trim() }); continue; }
    if (/^# /.test(l)) { seccion = 'Primeros pasos'; continue; }
    const t = l.replace(/^#+\s*/, '').trim();
    if (t && !t.startsWith('-') && !/key|clave/i.test(t) && (/^#/.test(l) || (t.endsWith(':') && t.length <= 60))) seccion = t.replace(/:$/, '');
  }
  return out;
}

export function generarHtml({ dirSim = path.join(RAIZ, 'simulaciones'), dirDocs = path.join(RAIZ, 'docs', 'candidatos'), salida = path.join(RAIZ, 'docs', 'visor', 'index.html'), readme = path.join(RAIZ, 'README.md'), ahora = new Date() } = {}) {
  const { items: candidatos, rotos } = leerCandidatos(dirSim, dirDocs);
  const raices = [...new Set([RAIZ, path.dirname(dirSim), dirSim, dirDocs, process.cwd()].map((r) => path.resolve(r)))].sort((a, b) => b.length - a.length);
  const datos = sinRutas({ generado: ahora.toISOString(), lotes: leerLotes(dirSim), candidatos, comandos: leerComandos(leerTexto(readme) ?? '') }, raices);
  const json = JSON.stringify(datos).replace(/[<\u2028\u2029]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
  const js = ['comun.js', 'keys-json.js', 'visor.js'].map((f) => fs.readFileSync(path.join(VISOR, f), 'utf8').replace(/^export /gm, '')).join('\n');
  const css = fs.readFileSync(path.join(RAIZ, 'ui', 'estilos.css'), 'utf8');
  if (/<\/(script|style)/i.test(js + css)) throw new Error('visor.js o estilos.css contienen un cierre de etiqueta');
  const html = fs.readFileSync(path.join(VISOR, 'plantilla.html'), 'utf8')
    .replace('/*ESTILOS*/', () => css).replace('/*DATOS*/', () => json).replace('/*VISOR*/', () => js);
  fs.mkdirSync(path.dirname(salida), { recursive: true });
  fs.writeFileSync(salida, html);
  return { salida, bytes: Buffer.byteLength(html), lotes: datos.lotes.length, conInforme: datos.lotes.filter((l) => l.informe).length, candidatos: candidatos.length, comandos: datos.comandos.length, rotos };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const r = generarHtml();
  console.log(`Visor generado en ${path.relative(RAIZ, r.salida)} (${(r.bytes / 1024).toFixed(0)} KB): ${r.lotes} lotes (${r.conInforme} con informe), ${r.candidatos} candidatos, ${r.comandos} comandos.`);
  if (r.rotos.length) console.log(`Archivos de candidatos con partes ilegibles (se saltaron esas partes): ${r.rotos.join(', ')}.`);
  console.log('Abrilo con doble clic desde el explorador de archivos.');
}
