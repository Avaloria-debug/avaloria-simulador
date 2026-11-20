// Informe de charla con NPC: consultas, temas revelados, respuestas IA, conocimientos, hitos y cierres de un lote.
import fs from 'node:fs';
import path from 'node:path';
import { leerJsonl } from './registro.js';
import { conocimientos, nombreDe, normalizar } from './adaptador.js';

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
export const CIERRES = ['desenlace', 'trabada', 'maxTurnos', 'abandono', 'cuota', 'excepcion'];

// NPC al que va un turno: el de la consulta; si no, el presente nombrado en la frase; si no, el primero presente.
export function npcDelTurno(t) {
  if (t.consulta?.npcId) return t.consulta.npcId;
  const n = normalizar(t.entrada?.texto ?? '');
  return (t.npcs ?? []).find((id) => n && n.includes(normalizar(nombreDe(id)).split(' ')[0])) ?? (t.npcs ?? [])[0] ?? null;
}

const nivel = (id) => (/_1$/.test(id) ? '_1' : /_2$/.test(id) ? '_2' : 'otro');

export function calcularCharla(runs, turnos) {
  const completos = runs.filter((r) => r.cierre !== 'cuota' || r.turnos > 0);
  const porNpc = {};
  const npc = (id) => (porNpc[id] ??= { npc: id, nombre: nombreDe(id), consultas: 0, consultasQueRevelaron: 0, noSe: 0, negativaRelacion: 0, turnosPresente: 0, reformula: 0, temasRevelados: new Set(), respuestasIa: new Set() });
  for (const t of turnos) {
    for (const id of t.npcs ?? []) { const x = npc(id); x.turnosPresente += 1; if (t.decision?.resultado === 'reformula') x.reformula += 1; }
    if (t.consulta?.npcId) {
      const x = npc(t.consulta.npcId);
      x.consultas += 1;
      if (t.consulta.resultado === 'exito') { x.consultasQueRevelaron += 1; if (t.consulta.conocimientoId) x.temasRevelados.add(t.consulta.conocimientoId); }
      if (t.consulta.resultado === 'no_se') x.noSe += 1;
      if (t.consulta.motivo === 'umbral') x.negativaRelacion += 1;
    }
    if (t.salida?.tipo === 'dialogo_ia' && t.salida.texto) { const id = npcDelTurno(t); if (id) npc(id).respuestasIa.add(normalizar(t.salida.texto)); }
  }
  // Conocimientos revelados por cualquier vía (consulta, conversación, narrativo), según el estado final de cada run.
  const revelados = new Map();
  for (const r of completos) for (const c of r.conocimientosRevelados ?? []) revelados.set(c, (revelados.get(c) ?? 0) + 1);
  for (const c of conocimientos) if (revelados.has(c.id)) npc(c.npcId).temasRevelados.add(c.id);
  const npcs = Object.values(porNpc).map((x) => ({
    npc: x.npc, nombre: x.nombre, consultas: x.consultas, consultasQueRevelaron: x.consultasQueRevelaron, temasRevelados: x.temasRevelados.size,
    temas: [...x.temasRevelados].sort(), respuestasIaUnicas: x.respuestasIa.size, pctNoSe: pct(x.noSe, x.consultas), negativasPorRelacion: x.negativaRelacion,
    turnosPresente: x.turnosPresente, pctReformula: pct(x.reformula, x.turnosPresente),
  })).sort((a, b) => b.temasRevelados - a.temasRevelados || b.consultasQueRevelaron - a.consultasQueRevelaron || a.npc.localeCompare(b.npc));
  const conoc = {};
  for (const c of conocimientos) {
    const g = (conoc[nivel(c.id)] ??= { total: 0, revelados: [], nunca: [] });
    g.total += 1;
    if (revelados.has(c.id)) g.revelados.push({ id: c.id, runs: revelados.get(c.id) }); else g.nunca.push(c.id);
  }
  const hitosPorPerfil = {};
  for (const r of completos) {
    const h = (hitosPorPerfil[r.perfil] ??= { runs: 0, runsConHito: 0, hitos: 0, porHito: {} });
    h.runs += 1; h.hitos += r.hitos?.length ?? 0; if (r.hitos?.length) h.runsConHito += 1;
    for (const x of r.hitos ?? []) h.porHito[x] = (h.porHito[x] ?? 0) + 1;
  }
  const cierres = Object.fromEntries(CIERRES.map((c) => [c, runs.filter((r) => r.cierre === c).length]));
  // Por perfil: consultas negativas por relación y conocimientos _1/_2 revelados (por cualquier vía, estado final del run).
  const perfilDe = new Map(runs.map((r) => [r.runId, r.perfil]));
  const porPerfil = {};
  const pp = (p) => (porPerfil[p] ??= { runs: 0, consultas: 0, negativasRelacion: 0, consultasQueRevelaron: 0, noSe: 0, _1: new Set(), _2: new Set(), runsCon_1: 0, runsCon_2: 0 });
  for (const r of completos) {
    const x = pp(r.perfil); x.runs += 1;
    const rev = r.conocimientosRevelados ?? [];
    for (const c of rev) { if (nivel(c) === '_1') x._1.add(c); if (nivel(c) === '_2') x._2.add(c); }
    if (rev.some((c) => nivel(c) === '_1')) x.runsCon_1 += 1;
    if (rev.some((c) => nivel(c) === '_2')) x.runsCon_2 += 1;
  }
  for (const t of turnos) {
    if (!t.consulta) continue;
    const x = pp(perfilDe.get(t.runId) ?? '(sin perfil)');
    x.consultas += 1;
    if (t.consulta.motivo === 'umbral') x.negativasRelacion += 1;
    if (t.consulta.resultado === 'exito') x.consultasQueRevelaron += 1;
    if (t.consulta.resultado === 'no_se') x.noSe += 1;
  }
  const relacionPorPerfil = Object.fromEntries(Object.entries(porPerfil).sort().map(([p, x]) => [p, {
    runs: x.runs, consultas: x.consultas, negativasRelacion: x.negativasRelacion, pctNegativasRelacion: pct(x.negativasRelacion, x.consultas),
    consultasQueRevelaron: x.consultasQueRevelaron, pctNoSe: pct(x.noSe, x.consultas),
    conocimientos_1: [...x._1].sort(), runsCon_1: x.runsCon_1, conocimientos_2: [...x._2].sort(), runsCon_2: x.runsCon_2,
  }]));
  const grupo = (ps) => { const xs = ps.map((p) => relacionPorPerfil[p]).filter(Boolean); const c = xs.reduce((a, x) => a + x.consultas, 0); const n = xs.reduce((a, x) => a + x.negativasRelacion, 0); return { perfiles: ps, runs: xs.reduce((a, x) => a + x.runs, 0), consultas: c, negativasRelacion: n, pctNegativasRelacion: pct(n, c) }; };
  const comparacion = { control: grupo(['curioso', 'investigador']), relacionConstruida: grupo(['amable']) };
  return {
    runs: runs.length, runsCompletados: runs.filter((r) => r.cierre !== 'cuota').length, cierres,
    ia: { llamadas: runs.reduce((a, r) => a + (r.iaLlamadas ?? 0), 0), tokens: runs.reduce((a, r) => a + (r.iaTokens ?? 0), 0), frasesJugador: runs.reduce((a, r) => a + (r.jugadorIa?.frases ?? 0), 0) },
    npcs, conocimientos: conoc, hitosPorPerfil, relacionPorPerfil, comparacion,
  };
}

export function markdownCharla(c, loteId) {
  const l = [`# Informe de charla — lote ${loteId}`, '', `Runs: ${c.runs} (completados ${c.runsCompletados}). Turnos con respuesta IA del narrador: ${c.ia.llamadas} llamadas, ${c.ia.tokens} tokens. Frases del jugador IA: ${c.ia.frasesJugador}.`, '',
    '## Por NPC', '| NPC | Consultas | Revelaron | Temas revelados | Respuestas IA únicas | % no_se | Negativas por relación | % reformula (con el NPC presente) |', '|---|---|---|---|---|---|---|---|',
    ...c.npcs.map((x) => `| ${x.nombre} | ${x.consultas} | ${x.consultasQueRevelaron} | ${x.temasRevelados} | ${x.respuestasIaUnicas} | ${x.pctNoSe} % | ${x.negativasPorRelacion} | ${x.pctReformula} % |`), '',
    '## Conocimientos'];
  for (const [n, g] of Object.entries(c.conocimientos).sort()) {
    l.push(`### ${n}: ${g.revelados.length} de ${g.total} revelados`, `Revelados: ${g.revelados.map((x) => `${x.id} (${x.runs} runs)`).join(', ') || '—'}.`, `Nunca revelados: ${g.nunca.join(', ') || '—'}.`, '');
  }
  l.push('## Hitos por perfil', '| Perfil | Runs | Runs con hito | Hitos | Por hito |', '|---|---|---|---|---|',
    ...Object.entries(c.hitosPorPerfil).sort().map(([p, h]) => `| ${p} | ${h.runs} | ${h.runsConHito} | ${h.hitos} | ${Object.entries(h.porHito).sort().map(([k, v]) => `${k}: ${v}`).join(', ') || '—'} |`), '',
    '## Relación: control contra relación construida',
    `Control (${c.comparacion.control.perfiles.join(', ')}): ${c.comparacion.control.negativasRelacion} negativas por relación de ${c.comparacion.control.consultas} consultas (${c.comparacion.control.pctNegativasRelacion} %), ${c.comparacion.control.runs} runs.`,
    `Relación construida (${c.comparacion.relacionConstruida.perfiles.join(', ')}): ${c.comparacion.relacionConstruida.negativasRelacion} de ${c.comparacion.relacionConstruida.consultas} (${c.comparacion.relacionConstruida.pctNegativasRelacion} %), ${c.comparacion.relacionConstruida.runs} runs.`, '',
    '| Perfil | Runs | Consultas | Negativas por relación | % | Revelaron | % no_se | _1 revelados (runs) | _2 revelados (runs) |', '|---|---|---|---|---|---|---|---|---|',
    ...Object.entries(c.relacionPorPerfil).map(([p, x]) => `| ${p} | ${x.runs} | ${x.consultas} | ${x.negativasRelacion} | ${x.pctNegativasRelacion} % | ${x.consultasQueRevelaron} | ${x.pctNoSe} % | ${x.conocimientos_1.join(', ') || '—'} (${x.runsCon_1}) | ${x.conocimientos_2.join(', ') || '—'} (${x.runsCon_2}) |`), '',
    '## Cierres', '| Cierre | Runs |', '|---|---|', ...Object.entries(c.cierres).map(([k, v]) => `| ${k} | ${v} |`), '');
  return l.join('\n');
}

export function generarInformeCharla(dir) {
  const c = calcularCharla(leerJsonl(path.join(dir, 'runs.jsonl')), leerJsonl(path.join(dir, 'turnos.jsonl')));
  fs.writeFileSync(path.join(dir, 'informe-charla.json'), JSON.stringify(c, null, 2));
  fs.writeFileSync(path.join(dir, 'informe-charla.md'), markdownCharla(c, path.basename(dir)));
  return c;
}
