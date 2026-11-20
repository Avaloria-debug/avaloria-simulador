const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const vista = $('#vista');
const num = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: d }));
const pct = (v) => (v == null ? '—' : `${num(v)} %`);
const duracion = (s) => (s == null ? '—' : s < 60 ? `${Math.round(s)} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`);

async function api(ruta, opciones = {}) {
  const r = await fetch(ruta, { ...opciones, headers: { 'content-type': 'application/json' } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error ?? `error ${r.status}`);
  return d;
}

// Navegación
$('#menu').addEventListener('click', () => { const n = $('#nav'); n.classList.toggle('abierto'); $('#menu').setAttribute('aria-expanded', n.classList.contains('abierto')); });
const PANTALLAS = { nueva, vivo, informes, perfiles };
let salir = () => {};
function ruta() {
  salir(); salir = () => {};
  const [p, arg] = (location.hash.slice(1) || 'nueva').split('/');
  for (const a of document.querySelectorAll('#nav a')) a.classList.toggle('activo', a.getAttribute('href') === `#${p}`);
  $('#nav').classList.remove('abierto');
  (PANTALLAS[p] ?? nueva)(arg ? decodeURIComponent(arg) : null).catch((e) => { vista.innerHTML = `<p class="error">${esc(e.message)}</p>`; });
}
addEventListener('hashchange', ruta);

// Nueva simulación
async function nueva() {
  vista.innerHTML = '<h1>Nueva simulación</h1><p class="suave">Cargando…</p>';
  const [cfg, perfs, lotes] = await Promise.all([api('/api/config'), api('/api/perfiles'), api('/api/lotes')]);
  const c = cfg.config;
  let turnosMedia = null;
  const conInf = lotes.find((l) => l.conInforme);
  if (conInf) turnosMedia = (await api(`/api/lotes/${conInf.id}/informe`).catch(() => null))?.informe?.turnos?.media ?? null;
  vista.innerHTML = `<h1>Nueva simulación</h1>
  <form id="f">
    <div class="tarjeta"><h2 style="margin-top:0">Perfiles y agentes</h2><div class="grilla">
      ${perfs.map((p) => `<label title="${esc(p.descripcion)}"><input type="checkbox" name="usa" value="${esc(p.id)}"> <span style="flex:1">${esc(p.nombre ?? p.id)}</span> <input type="number" min="1" value="${p.id === 'aleatorio' ? c.runs ?? 20 : 10}" data-agentes="${esc(p.id)}" aria-label="Agentes de ${esc(p.id)}"></label>`).join('')}
    </div><p>Runs totales: <strong id="total">0</strong></p></div>
    <div class="tarjeta"><div class="fila">
      <label class="campo">Trabada (turnos)<input type="number" name="trabada" min="1" value="${esc(c.trabada ?? 15)}"></label>
      <label class="campo">maxTurnos<input type="number" name="maxTurnos" min="1" value="${esc(c.maxTurnos ?? 400)}"></label>
      <label class="campo">Seed base<input type="number" name="seedBase" min="1" value="${esc(c.seedBase ?? 1)}"></label>
      <label class="campo">Mezcla código / IA<span class="fila"><input type="number" value="100" disabled aria-label="código"> / <input type="number" value="0" disabled aria-label="IA"></span><span class="suave">IA disponible desde F5</span></label>
    </div>
    <h2>Casos</h2><div class="fila"><label><input type="checkbox" id="todos" checked> Todos</label>
      ${cfg.casos.map((x) => `<label><input type="checkbox" name="caso" value="${esc(x)}" checked disabled> ${esc(x)}</label>`).join('')}</div></div>
    <div class="tarjeta" id="estimacion"></div>
    <p id="msg" class="error" role="alert"></p>
    <button class="primario" type="submit">Simular</button>
  </form>`;
  const f = $('#f');
  const leer = () => {
    const perfiles = [...f.querySelectorAll('input[name=usa]:checked')].map((x) => ({ id: x.value, agentes: Number(f.querySelector(`[data-agentes="${x.value}"]`).value) }));
    const casos = $('#todos').checked ? 'todos' : [...f.querySelectorAll('input[name=caso]:checked')].map((x) => x.value);
    return { perfiles, casos, trabada: Number(f.trabada.value), maxTurnos: Number(f.maxTurnos.value), seedBase: Number(f.seedBase.value) };
  };
  const estimar = () => {
    const p = leer();
    const runs = p.perfiles.reduce((a, x) => a + (x.agentes > 0 ? x.agentes : 0), 0);
    $('#total').textContent = runs;
    const turnos = turnosMedia ?? p.trabada;
    $('#estimacion').innerHTML = `<h2 style="margin-top:0">Estimación</h2><div class="tarjetas">
      <div class="tarjeta"><div class="cifra">${runs}</div><div class="etiqueta">runs</div></div>
      <div class="tarjeta"><div class="cifra">${num(runs * turnos, 0)}</div><div class="etiqueta">turnos esperados (${turnosMedia ? `media del último lote: ${num(turnosMedia)}` : 'sin lote previo: trabada'})</div></div>
      <div class="tarjeta"><div class="cifra">${cfg.ultimoRunsPorSeg ? duracion(runs / cfg.ultimoRunsPorSeg) : '—'}</div><div class="etiqueta">tiempo estimado${cfg.ultimoRunsPorSeg ? ` (${num(cfg.ultimoRunsPorSeg)} runs/seg del último lote)` : ' (sin lote previo medido)'}</div></div></div>`;
  };
  $('#todos').addEventListener('change', (e) => f.querySelectorAll('input[name=caso]').forEach((x) => { x.disabled = e.target.checked; }));
  f.addEventListener('input', estimar);
  estimar();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#msg').textContent = '';
    try { await api('/api/lote', { method: 'POST', body: JSON.stringify(leer()) }); location.hash = 'vivo'; } catch (err) { $('#msg').textContent = err.message; }
  });
}

// En vivo
async function vivo() {
  vista.innerHTML = `<h1>En vivo</h1><div class="tarjeta"><div class="progreso" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div id="pb" style="width:0"></div></div><p id="est" class="suave"></p></div>
  <div class="tarjetas" id="cifras"></div><div class="tarjeta"><h2 style="margin-top:0">Por cierre</h2><div id="cierres" class="barras"></div></div>
  <p class="fila"><button id="parar">Parar</button> <span id="fin"></span></p><p id="msg" class="error" role="alert"></p>`;
  const es = new EventSource('/api/lote/eventos');
  salir = () => es.close();
  es.onmessage = (ev) => {
    const d = JSON.parse(ev.data);
    if (d.estado === 'inactivo') { $('#est').textContent = 'No hay ningún lote en curso. Lanzá uno desde Nueva simulación.'; $('#parar').disabled = true; return; }
    const p = d.total ? (100 * d.hechos) / d.total : 0;
    $('#pb').style.width = `${p}%`;
    $('.progreso').setAttribute('aria-valuenow', Math.round(p));
    const estados = { corriendo: 'Corriendo', terminado: 'Terminado', parado: 'Parado', error: 'Con error' };
    $('#est').textContent = `${estados[d.estado] ?? d.estado}${d.loteId ? ` · lote ${d.loteId}` : ''}${d.mensaje ? ` · ${d.mensaje}` : ''}`;
    $('#cifras').innerHTML = [[`${d.hechos} / ${d.total}`, 'runs hechos'], [num(d.runsPorSeg, 2), 'runs/seg'], [d.estado === 'corriendo' ? duracion(d.etaSeg) : '—', 'tiempo restante']]
      .map(([v, e]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${e}</div></div>`).join('');
    $('#cierres').innerHTML = barras(d.cierres, d.total);
    $('#parar').disabled = d.estado !== 'corriendo';
    $('#fin').innerHTML = d.estado === 'terminado' && d.loteId ? `<a href="#informes/${encodeURIComponent(d.loteId)}">Ver informe</a>` : '';
  };
  $('#parar').addEventListener('click', async () => { try { await api('/api/lote/parar', { method: 'POST' }); } catch (e) { $('#msg').textContent = e.message; } });
}

function barras(obj, total) {
  const e = Object.entries(obj ?? {});
  if (!e.length) return '<span class="suave">—</span>';
  const max = total || Math.max(...e.map(([, v]) => v));
  return e.map(([k, v]) => `<span>${esc(k)}</span><div class="barra-h"><div class="b" style="width:${(100 * v) / max}%"></div></div><span>${esc(num(v))}</span>`).join('');
}
const tabla = (cab, filas) => `<div class="scroll"><table><thead><tr>${cab.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

// Informes
async function informes(id) {
  if (id) return detalle(id);
  const lotes = await api('/api/lotes');
  vista.innerHTML = `<h1>Informes</h1>${lotes.length ? `<div class="tarjeta scroll"><table><thead><tr><th>Lote</th><th>Fecha</th><th>Runs</th><th>Perfiles</th><th>Versión narrador</th><th>Informe</th></tr></thead><tbody>
    ${lotes.map((l) => `<tr class="clic" data-id="${esc(l.id)}" tabindex="0"><td>${esc(l.id)}</td><td>${esc(new Date(l.fecha).toLocaleString('es-AR'))}</td><td>${esc(l.runs)}</td><td>${esc(l.perfiles.map((p) => `${p.id}:${p.agentes}`).join(', '))}</td><td>${esc(l.versionNarrador)}</td><td>${l.conInforme ? 'sí' : 'no'}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="suave">Todavía no hay lotes.</p>'}`;
  for (const tr of vista.querySelectorAll('tr.clic')) {
    const ir = () => { location.hash = `informes/${encodeURIComponent(tr.dataset.id)}`; };
    tr.addEventListener('click', ir);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
  }
}

async function detalle(id) {
  const { config, informe: i } = await api(`/api/lotes/${encodeURIComponent(id)}/informe`);
  const runs = i.runs;
  const desen = Object.entries(i.porCierre ?? {}).find(([k]) => k === 'desenlace')?.[1] ?? 0;
  const sims = Object.values(i.similitud ?? {}).filter((s) => s.pares);
  const simMedia = sims.length ? sims.reduce((a, s) => a + s.jaccard.media * s.pares, 0) / sims.reduce((a, s) => a + s.pares, 0) : null;
  const perf = Object.entries(i.porPerfil ?? {});
  const casos = Object.entries(i.porCaso ?? {});
  vista.innerHTML = `<h1>Lote ${esc(id)}</h1><p class="suave">${esc(new Date(config.fecha).toLocaleString('es-AR'))} · simulador ${esc(config.version)} · narrador ${esc(config.narrador?.version)} · <a href="#informes">volver</a></p>
  <div class="tarjetas">${[[runs, 'runs'], [pct(runs ? (100 * desen) / runs : null), 'desenlace'], [pct(i.pctTrabada), 'trabada'], [num(simMedia, 2), 'similitud media (Jaccard)'], [pct(i.resultadosMotor?.reformula), 'reformulación']]
    .map(([v, e]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${e}</div></div>`).join('')}</div>
  <div class="tarjeta"><h2 style="margin-top:0">Cierres</h2><div class="barras">${barras(i.porCierre, runs)}</div></div>
  <div class="tarjeta"><h2 style="margin-top:0">Por perfil</h2>
    ${tabla(['Perfil', 'Runs', 'Runs con hito', 'Hitos', 'pista_conocida', 'Turnos al 1er hito', '% reformula (20 primeros)', '% abandono', 'Excepciones'],
      perf.map(([k, p]) => [k, p.runs, p.runsConHito, p.hitos, p.pistaConocidaEscrita, num(p.turnosHastaPrimerHito?.media), pct(p.pctReformulacionPrimeros20), pct(p.pctAbandono), p.excepciones]))}
    <h2>Runs con hito por perfil</h2><div class="barras">${barras(Object.fromEntries(perf.map(([k, p]) => [k, p.runsConHito])), Math.max(1, ...perf.map(([, p]) => p.runs)))}</div></div>
  <div class="tarjeta"><h2 style="margin-top:0">Por caso</h2>
    ${tabla(['Caso', 'Runs', 'Hitos alcanzados', 'Desenlaces'], casos.map(([k, x]) => [k, x.runs, Object.entries(x.hitos ?? {}).map(([h, v]) => `${h} ${num(v.pct)} %`).join(' · '), JSON.stringify(x.desenlaces ?? {}) === '{}' ? '—' : Object.entries(x.desenlaces).map(([d, v]) => `${d}: ${v.cantidad ?? v}`).join(', ')]))}
    <h2>Runs por caso</h2><div class="barras">${barras(Object.fromEntries(casos.map(([k, x]) => [k, x.runs])), runs)}</div></div>
  <div class="tarjeta"><h2 style="margin-top:0">Resultados del motor</h2><div class="barras">${barras(i.resultadosMotor, 100)}</div></div>
  <div class="tarjeta"><h2 style="margin-top:0">Tags</h2><p>Nunca escritos: ${esc((i.tags?.nuncaEscritos ?? []).join(', ') || '—')}</p><p>Graves sin reparación: ${esc(i.tags?.gravesSinReparacion?.length ?? 0)}</p></div>
  <div class="tarjeta"><h2 style="margin-top:0">Fallas graves</h2>${(i.fallasGraves ?? []).length ? tabla(['Run', 'Error'], i.fallasGraves.map((x) => [x.runId, x.error ?? x.mensaje ?? JSON.stringify(x)])) : '<p class="ok">Ninguna.</p>'}</div>`;
}

// Perfiles
async function perfiles(sel) {
  const lista = await api('/api/perfiles');
  const actual = lista.find((p) => p.id === sel) ?? lista[0];
  vista.innerHTML = `<h1>Perfiles</h1><div class="perfiles-lista">${lista.map((p) => `<button data-id="${esc(p.id)}" class="${p.id === actual.id ? 'activo' : ''}">${esc(p.nombre ?? p.id)}</button>`).join('')}</div>
  <form id="f" class="tarjeta" style="margin-top:16px"><h2 style="margin-top:0">${esc(actual.id)}</h2><div id="campos"></div>
  <p class="fila"><button class="primario" type="submit">Guardar</button> <button type="button" id="dup">Duplicar</button></p><p id="msg" role="alert"></p></form>`;
  for (const b of vista.querySelectorAll('.perfiles-lista button')) b.addEventListener('click', () => { location.hash = `perfiles/${encodeURIComponent(b.dataset.id)}`; });
  $('#campos').innerHTML = campos(actual, '');
  const msg = (t, ok) => { $('#msg').className = ok ? 'ok' : 'error'; $('#msg').textContent = t; };
  const guardar = async (p, nuevo) => {
    try {
      await api(`/api/perfiles/${encodeURIComponent(p.id)}`, { method: 'POST', body: JSON.stringify(p) });
      if (nuevo) location.hash = `perfiles/${encodeURIComponent(p.id)}`; else msg('Guardado.', true);
    } catch (e) { msg(e.message); }
  };
  $('#f').addEventListener('submit', (e) => { e.preventDefault(); try { const p = leerCampos(); if (p.id !== actual.id) throw new Error('para cambiar el id usá Duplicar'); guardar(p); } catch (err) { msg(err.message); } });
  $('#dup').addEventListener('click', () => {
    const id = prompt('Id del perfil nuevo (minúsculas, sin espacios):', `${actual.id}_copia`);
    if (!id) return;
    if (lista.some((p) => p.id === id)) return msg(`ya existe un perfil "${id}"`);
    try { const p = leerCampos(); p.id = id; guardar(p, true); } catch (err) { msg(err.message); }
  });
}

// Un campo por hoja del JSON; null y listas se editan como JSON.
function campos(obj, base) {
  return Object.entries(obj).map(([k, v]) => {
    const ruta = base ? `${base}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) return `<fieldset class="tarjeta" style="border:1px solid var(--borde)"><legend>${esc(k)}</legend><div class="grilla">${campos(v, ruta)}</div></fieldset>`;
    const tipo = typeof v === 'number' ? 'number' : typeof v === 'boolean' ? 'bool' : typeof v === 'string' ? 'texto' : 'json';
    const ctrl = tipo === 'bool' ? `<input type="checkbox" data-ruta="${esc(ruta)}" data-tipo="bool" ${v ? 'checked' : ''}>`
      : `<input ${tipo === 'number' ? 'type="number" step="any"' : 'type="text"'} data-ruta="${esc(ruta)}" data-tipo="${tipo}" value="${esc(tipo === 'json' ? JSON.stringify(v) : v)}" ${ruta === 'id' ? 'readonly' : ''}>`;
    return `<label class="campo">${esc(k)}${tipo === 'json' ? ' <span class="suave">(JSON)</span>' : ''}${ctrl}</label>`;
  }).join('');
}
function leerCampos() {
  const out = {};
  for (const el of vista.querySelectorAll('[data-ruta]')) {
    const partes = el.dataset.ruta.split('.');
    let o = out;
    for (const p of partes.slice(0, -1)) o = o[p] ??= {};
    const t = el.dataset.tipo;
    let v;
    if (t === 'bool') v = el.checked;
    else if (t === 'number') { if (el.value.trim() === '' || Number.isNaN(Number(el.value))) throw new Error(`${el.dataset.ruta}: número inválido`); v = Number(el.value); }
    else if (t === 'json') { try { v = JSON.parse(el.value); } catch { throw new Error(`${el.dataset.ruta}: JSON inválido`); } }
    else v = el.value;
    o[partes.at(-1)] = v;
  }
  return out;
}

ruta();
