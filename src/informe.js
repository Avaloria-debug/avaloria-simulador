import fs from 'node:fs';
import path from 'node:path';
import { leerJsonl } from './registro.js';

const pct = (a, b) => (b ? Math.round((1000 * a) / b) / 10 : 0);
const contar = (lista, f) => lista.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
function percentil(ordenados, q) {
  if (!ordenados.length) return 0;
  return ordenados[Math.min(ordenados.length - 1, Math.ceil(q * ordenados.length) - 1)];
}

export function calcularInforme(runs, turnos) {
  const t = runs.map((r) => r.turnos).sort((a, b) => a - b);
  const mitad = Math.floor(t.length / 2);
  const porCaso = {};
  for (const r of runs) {
    const c = (porCaso[r.caso] ??= { runs: 0, hitos: {}, desenlaces: { positivo: 0, neutro: 0, negativo: 0 } });
    c.runs += 1;
    for (const h of new Set(r.hitos)) c.hitos[h] = (c.hitos[h] ?? 0) + 1;
    if (r.tipoDesenlace) c.desenlaces[r.tipoDesenlace] = (c.desenlaces[r.tipoDesenlace] ?? 0) + 1;
  }
  for (const c of Object.values(porCaso)) {
    c.hitos = Object.fromEntries(Object.entries(c.hitos).sort().map(([h, n]) => [h, { cantidad: n, pct: pct(n, c.runs) }]));
  }
  const resultados = contar(turnos, (x) => x.decision.resultado);
  const noEntendidas = contar(turnos.filter((x) => x.entrada.tipo === 'texto' && ['no_entendido', 'reformula'].includes(x.decision.resultado)), (x) => x.entrada.texto);
  const porCierre = contar(runs, (r) => r.cierre);
  return {
    runs: runs.length,
    porModo: contar(runs, (r) => r.modo),
    porCierre,
    pctTrabada: pct(porCierre.trabada ?? 0, runs.length),
    turnos: {
      media: t.length ? Math.round((10 * t.reduce((a, b) => a + b, 0)) / t.length) / 10 : 0,
      mediana: t.length ? (t.length % 2 ? t[mitad] : (t[mitad - 1] + t[mitad]) / 2) : 0,
      p90: percentil(t, 0.9),
    },
    porCaso,
    resultadosMotor: Object.fromEntries(['ejecuta', 'consulta', 'reformula', 'no_entendido', 'ia'].map((k) => [k, pct(resultados[k] ?? 0, turnos.length)])),
    topNoEntendidas: Object.entries(noEntendidas).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([frase, veces]) => ({ frase, veces })),
    motivosDecidir: Object.entries(contar(turnos.filter((x) => x.decision.regla), (x) => x.decision.regla)).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([motivo, veces]) => ({ motivo, veces })),
    ia: runs.map((r) => ({ runId: r.runId, llamadas: r.iaLlamadas, tokens: r.iaTokens })),
    errores: runs.filter((r) => r.error).map((r) => ({ runId: r.runId, error: r.error.split('\n')[0] })),
  };
}

function markdown(i) {
  const filas = (obj) => Object.entries(obj).map(([k, v]) => `| ${k} | ${v} |`).join('\n');
  const l = [
    '# Informe del lote', '',
    `Runs: ${i.runs}. Cortes por trabada: ${i.pctTrabada}%.`, '',
    '## Runs por modo', '| Modo | Runs |', '|---|---|', filas(i.porModo), '',
    '## Runs por cierre', '| Cierre | Runs |', '|---|---|', filas(i.porCierre), '',
    '## Turnos', `Media ${i.turnos.media} · mediana ${i.turnos.mediana} · p90 ${i.turnos.p90}`, '',
    '## Hitos y desenlaces por caso',
  ];
  for (const [c, d] of Object.entries(i.porCaso)) {
    l.push(`### ${c} (${d.runs} runs)`, '| Hito | Runs | % |', '|---|---|---|');
    for (const [h, v] of Object.entries(d.hitos)) l.push(`| ${h} | ${v.cantidad} | ${v.pct} |`);
    l.push('', `Desenlaces: positivo ${d.desenlaces.positivo}, neutro ${d.desenlaces.neutro}, negativo ${d.desenlaces.negativo}.`, '');
  }
  l.push('## Resultados del motor (%)', '| Resultado | % |', '|---|---|', filas(i.resultadosMotor), '');
  l.push('## Top 20 frases no entendidas o reformuladas', '| Frase | Veces |', '|---|---|', ...i.topNoEntendidas.map((x) => `| ${x.frase} | ${x.veces} |`), '');
  l.push('## Motivos de decidir()', '| Motivo | Veces |', '|---|---|', ...i.motivosDecidir.map((x) => `| ${x.motivo} | ${x.veces} |`), '');
  l.push('## IA por run', `Llamadas totales: ${i.ia.reduce((a, x) => a + x.llamadas, 0)}. Tokens totales: ${i.ia.reduce((a, x) => a + x.tokens, 0)}.`, '');
  if (i.errores.length) l.push('## Excepciones', ...i.errores.map((e) => `- ${e.runId}: ${e.error}`), '');
  return l.join('\n');
}

export function generarInforme(dir) {
  const i = calcularInforme(leerJsonl(path.join(dir, 'runs.jsonl')), leerJsonl(path.join(dir, 'turnos.jsonl')));
  fs.writeFileSync(path.join(dir, 'informe.json'), JSON.stringify(i, null, 2));
  fs.writeFileSync(path.join(dir, 'informe.md'), markdown(i));
  return i;
}
