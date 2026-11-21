import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerCandidatos, APROBADO } from './candidatos.js';
import { idsIntenciones, normalizar, textoDiccionario, textosPlantillas, nombresNpcs, nombresEscenas, versionNarrador, DIR_NARRADOR } from './adaptador.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR_EXPORTACIONES = path.join(RAIZ, 'exportaciones');
const CONSULTA = new Set(['consulta', 'consulta_tema']);
const MAX_PALABRAS_LEXICO = 3;

// Nunca escribir en el repo del narrador: ni en node_modules/narrador ni en un clon llamado avaloria-narrador.
export function verificarSalida(dir) {
  const abs = path.resolve(dir);
  const dentro = (base) => abs === base || abs.startsWith(base + path.sep);
  if (dentro(DIR_NARRADOR) || dentro(path.resolve(DIR_NARRADOR)) || abs.split(path.sep).some((p) => /^avaloria-narrador$/i.test(p))) {
    throw new Error(`la exportación no puede escribirse en el repo del narrador: ${abs}`);
  }
  return abs;
}

const limpiar = (s) => String(s).replace(/\|/g, ' ').replace(/\s+/g, ' ').trim();
const sinCierre = (s) => limpiar(s).replace(/[.!?…»"”]+$/u, '').replace(/^[«"“¿¡]+/u, '').trim();
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Primer nombre (o alias) de `lista` que aparece como palabra completa; devuelve {id, nombre}. */
function buscarNombre(texto, lista) {
  const t = texto.toLowerCase();
  let mejor = null;
  for (const x of lista) {
    for (const n of x.nombres) {
      const m = new RegExp(`(^|[^\\p{L}])(${escapar(n.toLowerCase())})(?=$|[^\\p{L}])`, 'u').exec(t);
      if (m && (!mejor || n.length > mejor.nombre.length)) mejor = { id: x.id, nombre: n.toLowerCase() };
    }
  }
  return mejor;
}

/** Fila de diccionario para una frase aprobada: {archivo, seccion, fila, clave} o {descarte}. */
export function filaDeFrase(c) {
  const texto = c.textoEditado ?? c.texto;
  const intencion = c.intencion;
  const consulta = CONSULTA.has(intencion);
  if (!consulta && !idsIntenciones.includes(intencion)) return { descarte: 'sin_intencion' };
  const base = sinCierre(texto).toLowerCase();
  if (!base) return { descarte: 'vacia' };
  let patron = base; const params = [];
  const npc = buscarNombre(patron, nombresNpcs);
  if (npc) { patron = patron.replace(npc.nombre, '{npc}'); params.push(`npc=${npc.id}`); }
  const escena = buscarNombre(patron, nombresEscenas);
  if (escena) { patron = patron.replace(escena.nombre, '{destino}'); params.push(`destino=${escena.id}`); }
  if (!consulta && !params.length && base.split(' ').length <= MAX_PALABRAS_LEXICO) {
    return { archivo: 'diccionario-lexico', seccion: 'Verbos', fila: `${base} | ${intencion} | coloquial`, clave: normalizar(base) };
  }
  const cat = consulta ? 'consulta' : intencion;
  return { archivo: 'frases-patrones', seccion: consulta ? 'Consultas' : intencion, fila: `${patron} | ${cat} | ${params.length ? params.join(';') : '-'} | ${limpiar(texto)}`, clave: normalizar(patron) };
}

/** Banco existente para deduplicar: formas del léxico, patrones y ejemplos, plantillas y textos ya exportados. */
export function leerBanco({ dirExportaciones = DIR_EXPORTACIONES, leer = textoDiccionario } = {}) {
  const filas = (nombre) => (leer(nombre) ?? '').split(/\r?\n/).filter((l) => l.includes('|') && !l.startsWith('#')).map((l) => l.split('|').map((x) => x.trim()));
  const lexico = new Set(filas('diccionario-lexico').map((f) => normalizar(f[0])));
  const patrones = new Set(filas('frases-patrones').flatMap((f) => [normalizar(f[0]), normalizar(f[3] ?? '')]).filter(Boolean));
  const textos = new Set(textosPlantillas.map(normalizar));
  if (fs.existsSync(dirExportaciones)) {
    for (const d of fs.readdirSync(dirExportaciones)) {
      const f = path.join(dirExportaciones, d, 'textos.json');
      if (fs.existsSync(f)) for (const t of JSON.parse(fs.readFileSync(f, 'utf8')).textos ?? []) textos.add(normalizar(t.texto));
    }
  }
  return { lexico, patrones, textos };
}

const entradasDe = (texto) => Number(/^entradas:\s*(\d+)/m.exec(texto ?? '')?.[1] ?? NaN);

function archivoDiccionario(nombre, secciones, version = 1) {
  const n = Object.values(secciones).reduce((a, xs) => a + xs.length, 0);
  const l = ['---', `tipo: ${nombre}`, `version: ${version}`, `entradas: ${n}`, '---', '', `# Filas para agregar a data/diccionarios/${nombre}.md, cada una bajo su sección. Generado por el simulador; no se cargó.`];
  for (const [s, xs] of Object.entries(secciones)) if (xs.length) l.push('', `## ${s}`, '', ...xs);
  return l.join('\n') + '\n';
}

export function promptCarga({ fecha, conteos, entradasActuales, dir }) {
  const fila = (nombre, archivo) => `- \`${archivo}\`: ${conteos[nombre]} filas para \`data/diccionarios/${nombre}.md\`. Agregalas al final de la sección que indica cada título (si la sección no existe, creala con ese título). Después cambiá \`entradas\` del front matter de ${Number.isNaN(entradasActuales[nombre]) ? 'su valor actual' : entradasActuales[nombre]} a ${Number.isNaN(entradasActuales[nombre]) ? `su valor actual + ${conteos[nombre]}` : entradasActuales[nombre] + conteos[nombre]}.`;
  return `# Carga de candidatos aprobados (${fecha})

Pegá este prompt en Claude Code, dentro del repo del narrador (\`Avaloria-debug/Avaloria-narrador\`), en una rama nueva desde main. Los archivos están en \`${dir}\` del simulador: copiá esa carpeta al repo o pasá su ruta.

## Archivos a cargar
${fila('diccionario-lexico', 'diccionario-lexico.add.md')}
${fila('frases-patrones', 'frases-patrones.add.md')}
- \`textos.json\`: ${conteos.textos} textos aprobados. El narrador no documenta un formato para un banco de textos: es un JSON genérico. No los copies a \`data/contenido/contenido-v3.json\` ni a las plantillas sin una decisión de Tomás sobre dónde van.
- Si un archivo tiene 0 filas, no hay nada que cargar de ese archivo.

## Pasos
1. Agregá las filas de los \`.add.md\` como dice arriba y actualizá \`entradas\`. No toques otras líneas.
2. Corré \`node narrador/validarContenido.js\`: sin errores.
3. Corré \`npm test\`: 0 rojos. Restaurá \`docs/diagnostico-comprension.md\` si la suite lo regenera.
4. Si cambió algo dentro de \`narrador/\`, sumá 0.0.1 a VERSION en \`narrador/version.js\` y en \`narrador/prueba/index.html\`. Cargar diccionarios en \`data/\` no cambia \`narrador/\`.
5. Commit y push a la rama, y abrí la PR. No mergees: la aprueba Tomás.

## Regla del narrador
No cambies contenido para que pase la suite. Si una fila hace fallar un test o la validación, sacala, anotala en el informe de la PR y seguí con el resto.
`;
}

/**
 * Exporta los candidatos aprobados de las fuentes elegidas a `exportaciones/<fecha>/`.
 * @returns {{dir, archivos: string[], resumen: object}}
 */
export function exportar({ fuentes = null, fecha = new Date().toISOString().slice(0, 10), dirSalida = null, dirExportaciones = DIR_EXPORTACIONES, banco = null, items = null, ...dirs } = {}) {
  const dir = verificarSalida(dirSalida ?? path.join(dirExportaciones, fecha));
  const todos = items ?? leerCandidatos({ ids: fuentes, ...dirs });
  const aprobados = todos.filter((c) => c.estado === APROBADO);
  const b = banco ?? leerBanco({ dirExportaciones });
  const resumen = { fecha, versionNarrador, fuentes: fuentes ?? 'todas', aprobados: aprobados.length, ignoradosNoAprobados: todos.length - aprobados.length, duplicados: 0, sinIntencion: 0, vacias: 0, descartes: [] };
  const lexico = {}; const patrones = {};
  const vistos = { lexico: new Set(b.lexico), patrones: new Set(b.patrones), textos: new Set(b.textos) };
  const textos = [];
  for (const c of aprobados) {
    if (c.clase === 'frase') {
      const f = filaDeFrase(c);
      if (f.descarte) { resumen[f.descarte === 'sin_intencion' ? 'sinIntencion' : 'vacias'] += 1; resumen.descartes.push({ ref: c.ref, motivo: f.descarte }); continue; }
      const banco2 = f.archivo === 'diccionario-lexico' ? vistos.lexico : vistos.patrones;
      if (banco2.has(f.clave) || vistos.lexico.has(f.clave) || vistos.patrones.has(f.clave)) { resumen.duplicados += 1; resumen.descartes.push({ ref: c.ref, motivo: 'duplicado' }); continue; }
      banco2.add(f.clave);
      const destino = f.archivo === 'diccionario-lexico' ? lexico : patrones;
      (destino[f.seccion] ??= []).push(f.fila);
    } else {
      const texto = limpiar(c.textoEditado ?? c.texto);
      const k = normalizar(texto);
      if (!k) { resumen.vacias += 1; continue; }
      if (vistos.textos.has(k)) { resumen.duplicados += 1; resumen.descartes.push({ ref: c.ref, motivo: 'duplicado' }); continue; }
      vistos.textos.add(k);
      textos.push({ id: c.id, ref: c.ref, texto, tipo: c.tipo, npc: c.npc, escena: c.escena, intencion: c.intencion, fraseJugador: c.fraseJugador, nota: c.nota, versionNarrador: c.versionNarrador });
    }
  }
  const conteos = {
    'diccionario-lexico': Object.values(lexico).reduce((a, x) => a + x.length, 0),
    'frases-patrones': Object.values(patrones).reduce((a, x) => a + x.length, 0),
    textos: textos.length,
  };
  const entradasActuales = { 'diccionario-lexico': entradasDe(textoDiccionario('diccionario-lexico')), 'frases-patrones': entradasDe(textoDiccionario('frases-patrones')) };
  resumen.exportados = conteos;
  resumen.entradasAActualizar = Object.fromEntries(Object.entries(entradasActuales).map(([k, v]) => [k, { actual: Number.isNaN(v) ? null : v, nuevas: conteos[k], despues: Number.isNaN(v) ? null : v + conteos[k] }]));
  fs.mkdirSync(dir, { recursive: true });
  const escribir = (n, t) => { fs.writeFileSync(path.join(dir, n), t); return n; };
  const archivos = [
    escribir('diccionario-lexico.add.md', archivoDiccionario('diccionario-lexico', lexico)),
    escribir('frases-patrones.add.md', archivoDiccionario('frases-patrones', patrones)),
    escribir('textos.json', JSON.stringify({ formato: 'generico', nota: 'SUPUESTO: el narrador no documenta un formato para textos; ver docs/SUPUESTOS.md del simulador.', fecha, versionNarrador, textos }, null, 2) + '\n'),
    escribir('PROMPT-CARGA.md', promptCarga({ fecha, conteos, entradasActuales, dir: path.relative(RAIZ, dir) || dir })),
    escribir('resumen.json', JSON.stringify(resumen, null, 2) + '\n'),
  ];
  return { dir, archivos, resumen };
}
