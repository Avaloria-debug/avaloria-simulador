import { createHash } from 'node:crypto';
import { casos, conocimientos, idsEscenas, tiposTag } from './adaptador.js';

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const r3 = (x) => Math.round(x * 1000) / 1000;
const media = (l) => (l.length ? r3(l.reduce((a, b) => a + b, 0) / l.length) : 0);
const p90 = (l) => { const o = [...l].sort((a, b) => a - b); return o.length ? o[Math.min(o.length - 1, Math.ceil(0.9 * o.length) - 1)] : 0; };
const hash = (t) => createHash('sha1').update(String(t)).digest('hex');
const TAGS_REPARABLES = new Set(['rencor', 'desconfianza', 'miedo']);

export function jaccard(a, b) {
  const A = new Set(a); const B = new Set(b);
  const u = new Set([...A, ...B]).size;
  return u === 0 ? 1 : [...A].filter((x) => B.has(x)).length / u;
}
export function edicionNormalizada(a, b) {
  const n = Math.max(a.length, b.length);
  if (n === 0) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length] / n;
}

const porRun = (turnos) => { const m = new Map(); for (const t of turnos) { if (!m.has(t.runId)) m.set(t.runId, []); m.get(t.runId).push(t); } return m; };

export function metricasF2(runs, turnos) {
  const tr = porRun(turnos);
  const deRun = (r) => tr.get(r.runId) ?? [];

  const trabadas = runs.filter((r) => r.cierre === 'trabada').map((r) => {
    const caso = casos.find((c) => c.id === r.caso);
    return { runId: r.runId, perfil: r.perfil, caso: r.caso, ...(r.estadoFinal ?? {}), hitosPendientes: (caso?.hitos ?? []).map((h) => h.id).filter((h) => !r.hitos.includes(h)) };
  });
  const estadosSinAccion = turnos.filter((t) => t.sinAccion).map((t) => ({ runId: t.runId, turno: t.turno, escena: t.escena }));

  let repetidos = 0;
  for (const r of runs) { const vistos = new Set(); for (const t of deRun(r)) { const h = t.salida.textoId ?? hash(t.salida.texto); if (vistos.has(h)) repetidos++; vistos.add(h); } }
  const variantes = {};
  for (const c of casos) {
    variantes[c.id] = {};
    for (const h of c.hitos) {
      const usadas = new Set(turnos.filter((t) => t.hito === h.id && runs.find((r) => r.runId === t.runId)?.caso === c.id && t.salida.textoId).map((t) => t.salida.textoId));
      variantes[c.id][h.id] = { usadas: [...usadas].sort(), nuncaUsadas: h.textos.map((x) => x.id).filter((id) => !usadas.has(id)) };
    }
  }

  const similitud = {};
  for (const c of casos) {
    const rs = runs.filter((r) => r.caso === c.id).map((r) => ({ set: deRun(r).filter((t) => t.hito).map((t) => `${t.hito}:${t.salida.textoId}`), seq: r.hitos }));
    const js = []; const ds = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { js.push(jaccard(rs[i].set, rs[j].set)); ds.push(1 - edicionNormalizada(rs[i].seq, rs[j].seq)); }
    similitud[c.id] = {
      pares: js.length,
      jaccard: { media: media(js), p90: r3(p90(js)), mayorA08: js.filter((x) => x > 0.8).length },
      secuencia: { media: media(ds), p90: r3(p90(ds)), mayorA08: ds.filter((x) => x > 0.8).length },
    };
  }

  const frecuencia = {};
  const escritosTipo = new Set(); const borradosTipo = new Set();
  const graves = [];
  for (const r of runs) {
    const vivos = new Map();
    for (const t of deRun(r)) {
      for (const k of t.tagsBorrados) { borradosTipo.add(k.split('|')[0]); vivos.delete(k); }
      for (const k of t.tagsEscritos) {
        const [tipo, objetivo, nivel] = k.split('|');
        escritosTipo.add(tipo);
        frecuencia[tipo] ??= {}; frecuencia[tipo][nivel] = (frecuencia[tipo][nivel] ?? 0) + 1;
        if (TAGS_REPARABLES.has(tipo) && nivel === '3') vivos.set(k, { runId: r.runId, tipo, objetivo, turno: t.turno });
      }
    }
    graves.push(...vivos.values());
  }
  const tags = {
    nuncaEscritos: tiposTag.filter((x) => !escritosTipo.has(x)),
    escritosNuncaDecaidos: [...escritosTipo].filter((x) => !borradosTipo.has(x)).sort(),
    gravesSinReparacion: graves,
    frecuencia: Object.fromEntries(Object.entries(frecuencia).sort()),
  };

  const revelados = new Set(runs.flatMap((r) => r.conocimientosRevelados ?? []));
  const nivel = (sufijo) => conocimientos.filter((k) => k.id.endsWith(sufijo)).map((k) => k.id);
  const cob = (ids) => ({ revelados: ids.filter((x) => revelados.has(x)), nunca: ids.filter((x) => !revelados.has(x)) });
  const visitadas = new Set(runs.flatMap((r) => r.escenasVisitadas));
  const matriz = {};
  for (const c of casos) {
    const rs = runs.filter((r) => r.caso === c.id);
    matriz[c.id] = { positivo: 0, neutro: 0, negativo: 0, sinDesenlace: 0 };
    for (const r of rs) matriz[c.id][r.tipoDesenlace ?? 'sinDesenlace'] += 1;
  }
  const cobertura = {
    conocimientos_1: cob(nivel('_1')), conocimientos_2: cob(nivel('_2')),
    hitosNuncaDisparados: Object.fromEntries(casos.map((c) => [c.id, c.hitos.map((h) => h.id).filter((h) => !runs.some((r) => r.caso === c.id && r.hitos.includes(h)))])),
    escenasNuncaVisitadas: idsEscenas.filter((x) => !visitadas.has(x)),
    casoPorDesenlace: matriz,
  };

  const porPerfil = {};
  for (const id of [...new Set(runs.map((r) => r.perfil))].sort()) {
    const rs = runs.filter((r) => r.perfil === id);
    const primeros = rs.flatMap((r) => deRun(r).slice(0, 20));
    const hastaHito = rs.map((r) => deRun(r).find((t) => t.hito)?.turno).filter((x) => x !== undefined);
    porPerfil[id] = {
      runs: rs.length,
      runsConHito: rs.filter((r) => r.hitos.length).length,
      hitos: rs.reduce((a, r) => a + r.hitos.length, 0),
      pistaConocidaEscrita: rs.reduce((a, r) => a + deRun(r).reduce((b, t) => b + t.tagsEscritos.filter((k) => k.startsWith('pista_conocida|')).length, 0), 0),
      turnosHastaPrimerHito: { media: media(hastaHito), runs: hastaHito.length },
      pctReformulacionPrimeros20: pct(primeros.filter((t) => t.decision.resultado === 'reformula').length, primeros.length),
      pctAbandono: pct(rs.filter((r) => r.cierre === 'abandono').length, rs.length),
      excepciones: rs.filter((r) => r.cierre === 'excepcion').length,
    };
  }

  const fallasGraves = runs.filter((r) => r.origenError === 'narrador').map((r) => ({ runId: r.runId, perfil: r.perfil, error: r.error.split('\n')[0] }));
  return {
    fallasGraves, trabadas, estadosSinAccion,
    repeticiones: { pctTurnosTextoRepetido: pct(repetidos, turnos.length), variantesHito: variantes },
    similitud, tags, cobertura, porPerfil,
  };
}

export function markdownF2(m) {
  const l = [];
  l.push('## Fallas graves (excepciones del narrador)');
  l.push(m.fallasGraves.length ? m.fallasGraves.map((f) => `- **${f.runId}** (${f.perfil}): ${f.error}`).join('\n') : 'Ninguna.', '');
  l.push('## Por perfil', '| Perfil | Runs | Runs con hito | Hitos | pista_conocida | Turnos hasta 1er hito | % reformula (20 primeros) | % abandono | Excepciones |', '|---|---|---|---|---|---|---|---|---|');
  for (const [id, p] of Object.entries(m.porPerfil)) l.push(`| ${id} | ${p.runs} | ${p.runsConHito} | ${p.hitos} | ${p.pistaConocidaEscrita} | ${p.turnosHastaPrimerHito.media} (${p.turnosHastaPrimerHito.runs} runs) | ${p.pctReformulacionPrimeros20} | ${p.pctAbandono} | ${p.excepciones} |`);
  l.push('', '## Trabadas', `Runs trabados: ${m.trabadas.length}. Estados sin acción: ${m.estadosSinAccion.length}.`, '', '| Run | Perfil | Caso | Escena | Hora | Hitos | Pendientes | Tags | Últimas acciones |', '|---|---|---|---|---|---|---|---|---|');
  for (const t of m.trabadas) l.push(`| ${t.runId} | ${t.perfil} | ${t.caso} | ${t.escena} | ${t.hora} | ${(t.hitos ?? []).join(' ')} | ${t.hitosPendientes.join(' ')} | ${(t.tags ?? []).join(' ')} | ${(t.ultimasAcciones ?? []).map((x) => String(x).slice(0, 40).replace(/[|\n]/g, ' ')).join(' · ')} |`);
  if (m.estadosSinAccion.length) l.push('', 'Estados sin acción:', ...m.estadosSinAccion.slice(0, 50).map((x) => `- ${x.runId} turno ${x.turno} (${x.escena})`));
  l.push('', '## Repeticiones', `Turnos con texto narrado repetido dentro del run: ${m.repeticiones.pctTurnosTextoRepetido}%.`, '', '| Caso | Hito | Variantes usadas | Nunca usadas |', '|---|---|---|---|');
  for (const [c, hs] of Object.entries(m.repeticiones.variantesHito)) for (const [h, v] of Object.entries(hs)) l.push(`| ${c} | ${h} | ${v.usadas.length} | ${v.nuncaUsadas.length} |`);
  l.push('', '## Similitud entre partidas del mismo caso', '| Caso | Pares | Jaccard media | Jaccard p90 | Jaccard > 0.8 | Secuencia media | Secuencia p90 | Secuencia > 0.8 |', '|---|---|---|---|---|---|---|---|');
  for (const [c, s] of Object.entries(m.similitud)) l.push(`| ${c} | ${s.pares} | ${s.jaccard.media} | ${s.jaccard.p90} | ${s.jaccard.mayorA08} | ${s.secuencia.media} | ${s.secuencia.p90} | ${s.secuencia.mayorA08} |`);
  l.push('', '## Tags', `Nunca escritos: ${m.tags.nuncaEscritos.join(', ') || '—'}.`, `Escritos y nunca decaídos: ${m.tags.escritosNuncaDecaidos.join(', ') || '—'}.`, `Graves sin reparación: ${m.tags.gravesSinReparacion.length}.`, '', '| Tag | Nivel | Veces |', '|---|---|---|');
  for (const [t, ns] of Object.entries(m.tags.frecuencia)) for (const [n, v] of Object.entries(ns)) l.push(`| ${t} | ${n} | ${v} |`);
  const c = m.cobertura;
  l.push('', '## Cobertura',
    `Conocimientos _1 revelados: ${c.conocimientos_1.revelados.length}/${c.conocimientos_1.revelados.length + c.conocimientos_1.nunca.length}. Nunca: ${c.conocimientos_1.nunca.join(', ') || '—'}.`,
    `Conocimientos _2 revelados: ${c.conocimientos_2.revelados.length}/${c.conocimientos_2.revelados.length + c.conocimientos_2.nunca.length}. Nunca: ${c.conocimientos_2.nunca.join(', ') || '—'}.`,
    `Escenas nunca visitadas: ${c.escenasNuncaVisitadas.join(', ') || '—'}.`, '', 'Hitos nunca disparados:',
    ...Object.entries(c.hitosNuncaDisparados).map(([k, v]) => `- ${k}: ${v.join(', ') || '—'}`), '',
    '| Caso | Positivo | Neutro | Negativo | Sin desenlace |', '|---|---|---|---|---|',
    ...Object.entries(c.casoPorDesenlace).map(([k, v]) => `| ${k} | ${v.positivo} | ${v.neutro} | ${v.negativo} | ${v.sinDesenlace} |`), '');
  return l.join('\n');
}
