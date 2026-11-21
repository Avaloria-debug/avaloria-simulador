// Lectura tolerante de lotes y candidatos, compartida por el generador (Node) y el HTML (se incrusta sin los `export`).
export const esCandidato = (x) => !!x && typeof x === 'object' && typeof x.id === 'string' && typeof x.estado === 'string' && (typeof x.frase === 'string' || typeof x.texto === 'string');
const texto = (v) => (v == null ? null : typeof v === 'string' ? v : typeof v === 'number' ? String(v) : null);
export function plano(fuente, archivo, x, grupo = null) {
  const frase = typeof x.frase === 'string';
  const perfiles = Array.isArray(x.perfiles) ? x.perfiles.filter((p) => typeof p === 'string').join(',') : null;
  return { fuente, archivo, id: x.id, clase: frase ? 'frase' : 'texto', estado: x.estado, texto: frase ? x.frase : x.texto, textoEditado: texto(x.textoEditado),
    intencion: texto(x.intencionAprobada ?? x.intencionObjetivo ?? x.motorIntencion ?? x.motor?.intencion ?? x.contexto?.intencion) ?? (typeof grupo === 'string' && !grupo.startsWith('(') ? grupo : null),
    lote: texto(x.lote ?? (Array.isArray(x.tandas) ? x.tandas[0] : null)) ?? (fuente === 'docs' ? null : fuente), perfil: texto(x.perfil) ?? (perfiles || null),
    frecuencia: Number.isFinite(x.frecuencia) ? x.frecuencia : 1, npc: texto(x.contexto?.npc), fraseJugador: texto(x.contexto?.frase), nota: texto(x.nota) };
}
/** Candidatos de un archivo: {items, errores}. Una línea o grupo roto no tira el resto. null si el archivo no es de candidatos. */
export function candidatosDeArchivo(fuente, archivo, contenido) {
  const items = []; let errores = 0;
  if (archivo.endsWith('.jsonl')) {
    for (const l of contenido.split('\n')) {
      if (!l.trim()) continue;
      let x; try { x = JSON.parse(l); } catch { errores++; continue; }
      if (esCandidato(x)) items.push(plano(fuente, archivo, x));
    }
    return { items, errores };
  }
  if (!archivo.endsWith('.json') || archivo === 'revision.json') return null;
  let d; try { d = JSON.parse(contenido); } catch { return { items, errores: 1 }; }
  if (!d?.candidatos || typeof d.candidatos !== 'object' || Array.isArray(d.candidatos)) return null;
  for (const [g, xs] of Object.entries(d.candidatos)) {
    if (!Array.isArray(xs)) { errores++; continue; }
    for (const x of xs) if (esCandidato(x)) items.push(plano(fuente, archivo, x, g));
  }
  return { items, errores };
}
/** Resumen de un lote para la lista. `id` es el nombre de la carpeta (único); `loteId` el del config. */
export function resumenLote(id, config, informe, informeMd) {
  const c = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const par = c.parametros && typeof c.parametros === 'object' ? c.parametros : {};
  const perfiles = (Array.isArray(par.perfiles) ? par.perfiles : typeof par.perfiles === 'string' ? [par.perfiles] : [])
    .map((p) => (typeof p === 'string' ? p : p && typeof p === 'object' ? `${p.id}${p.agentes != null ? `:${p.agentes}` : ''}` : null)).filter(Boolean).join(', ');
  const fecha = typeof c.fecha === 'string' && !Number.isNaN(Date.parse(c.fecha)) ? c.fecha : null;
  const inf = informe && typeof informe === 'object' && !Array.isArray(informe) ? informe : null;
  const runs = Number.isFinite(Number(par.runs)) && par.runs !== null && par.runs !== '' ? Number(par.runs) : Number.isFinite(inf?.runs) ? inf.runs : null;
  return { id, loteId: texto(c.loteId) ?? id, fecha, tipo: texto(c.tipo) ?? 'simulacion', runs, perfiles,
    versionNarrador: texto(c.narrador?.version), versionSimulador: texto(c.version), informe: inf, informeMd: typeof informeMd === 'string' ? informeMd : null };
}
export const porFecha = (a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')) || String(a.id).localeCompare(String(b.id));
