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
const PANTALLAS = { nueva, vivo, informes, replay, regresion, perfiles, corpus, candidatos, ajustes };
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
      <label class="campo">Mezcla código / IA (%)<span class="fila"><input type="number" name="mzCodigo" min="0" max="100" value="${esc(c.mezcla?.codigo ?? 40)}" aria-label="código"> / <input type="number" name="mzIa" min="0" max="100" value="${esc(c.mezcla?.ia ?? 60)}" aria-label="IA"></span></label>
      <label class="campo">Tope de llamadas IA<input type="number" name="maxLlamadasIa" min="1" value="300"></label>
      <label><input type="checkbox" name="jugadorIa"> Jugador IA (Groq)</label>
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
    return { perfiles, casos, trabada: Number(f.trabada.value), maxTurnos: Number(f.maxTurnos.value), seedBase: Number(f.seedBase.value), mezcla: { codigo: Number(f.mzCodigo.value), ia: Number(f.mzIa.value) }, maxLlamadasIa: Number(f.maxLlamadasIa.value), jugadorIa: f.jugadorIa.checked };
  };
  const estimar = () => {
    const p = leer();
    const runs = p.perfiles.reduce((a, x) => a + (x.agentes > 0 ? x.agentes : 0), 0);
    $('#total').textContent = runs;
    const turnos = turnosMedia ?? p.trabada;
    $('#estimacion').innerHTML = `<h2 style="margin-top:0">Estimación</h2><div class="tarjetas">
      <div class="tarjeta"><div class="cifra">${runs}</div><div class="etiqueta">runs</div></div>
      <div class="tarjeta"><div class="cifra">${num(runs * turnos, 0)}</div><div class="etiqueta">turnos esperados (${turnosMedia ? `media del último lote: ${num(turnosMedia)}` : 'sin lote previo: trabada'})</div></div>
      <div class="tarjeta"><div class="cifra">${cfg.ultimoRunsPorSeg ? duracion(runs / cfg.ultimoRunsPorSeg) : '—'}</div><div class="etiqueta">tiempo estimado${cfg.ultimoRunsPorSeg ? ` (${num(cfg.ultimoRunsPorSeg)} runs/seg del último lote)` : ' (sin lote previo medido)'}</div></div></div><div id="estIa"></div>`;
    estimarIa(p);
  };
  let pedido = 0;
  const estimarIa = async (p) => {
    const n = ++pedido;
    try {
      const e = await api('/api/lote/estimar', { method: 'POST', body: JSON.stringify(p) });
      if (n !== pedido || !$('#estIa')) return;
      $('#estIa').innerHTML = `<div class="tarjetas"><div class="tarjeta"><div class="cifra">${num(e.llamadas, 0)}</div><div class="etiqueta">llamadas IA estimadas (${e.runsIa} runs ia; narrador ${num(e.llamadasNarrador, 0)}, jugador ${num(e.llamadasJugador, 0)})</div></div>
        <div class="tarjeta"><div class="cifra">${num(e.tokens, 0)}</div><div class="etiqueta">tokens estimados</div></div>
        <div class="tarjeta"><div class="cifra">${e.keys}</div><div class="etiqueta">keys de Groq · capacidad ${num(e.capacidad, 0)} llamadas por día</div></div></div>
        ${e.llamadas > 0 && e.superaCapacidad ? `<p class="error">Advertencia: la estimación (${num(e.llamadas, 0)} llamadas) supera la capacidad de las keys (${num(e.capacidad, 0)}). Los runs que no entren cierran por cuota y se reanudan después.</p>` : ''}`;
    } catch (err) { if ($('#estIa')) $('#estIa').innerHTML = `<p class="error">${esc(err.message)}</p>`; }
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
    const estados = { corriendo: 'Corriendo', terminado: 'Terminado', parado: 'Parado', error: 'Con error', cuota: 'Sin cuota de IA' };
    $('#est').textContent = `${estados[d.estado] ?? d.estado}${d.loteId ? ` · lote ${d.loteId}` : ''}${d.mensaje ? ` · ${d.mensaje}` : ''}`;
    const u = d.modo === 'corpus' ? 'llamadas' : 'runs';
    $('#cifras').innerHTML = [[`${d.hechos} / ${d.total}`, `${u} hechas`.replace('runs hechas', 'runs hechos')], [num(d.runsPorSeg, 2), `${u}/seg`], [d.estado === 'corriendo' ? duracion(d.etaSeg) : '—', 'tiempo restante'], [num(d.iaLlamadas ?? 0, 0), 'llamadas IA']]
      .map(([v, e]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${e}</div></div>`).join('');
    $('#cierres').innerHTML = barras(d.cierres, d.total);
    $('#parar').disabled = d.estado !== 'corriendo';
    $('#fin').innerHTML = ['terminado', 'cuota'].includes(d.estado) && d.loteId ? `<a href="#${d.modo === 'corpus' ? 'corpus' : 'informes'}/${encodeURIComponent(d.loteId)}">${d.modo === 'corpus' ? 'Ver frases del corpus' : 'Ver informe'}</a>` : '';
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

// Corpus
async function corpus(sel) {
  const [perfs, cfg, lotes] = await Promise.all([api('/api/perfiles'), api('/api/config'), api('/api/corpus')]);
  vista.innerHTML = `<h1>Corpus</h1>
  <form id="f" class="tarjeta">
    <h2 style="margin-top:0">Perfiles</h2><div class="grilla">${perfs.map((p) => `<label title="${esc(p.descripcion)}"><input type="checkbox" name="perfil" value="${esc(p.id)}" ${['curioso', 'torpe', 'primerizo'].includes(p.id) ? 'checked' : ''}> ${esc(p.nombre ?? p.id)}</label>`).join('')}</div>
    <div class="fila" style="margin-top:12px">
      <label class="campo">Frases por estado<input type="number" name="frases" min="1" max="100" value="30"></label>
      <label class="campo">Máximo de estados<input type="number" name="maxEstados" min="1" value="200"></label>
      <label class="campo">Tope de llamadas<input type="number" name="maxLlamadasIa" min="1" value="300"></label>
      <label class="campo">Seed base<input type="number" name="seedBase" min="1" value="${esc(cfg.config.seedBase ?? 1)}"></label>
    </div>
    <p class="fila"><button type="button" id="estimar">Estimar</button> <button class="primario" type="submit">Generar</button></p>
    <div id="est"></div><p id="msg" class="error" role="alert"></p>
  </form>
  <div class="tarjeta"><h2 style="margin-top:0">Corpus generados</h2>${lotes.length ? tabla(['Corpus', 'Fecha', 'Modelo', 'Llamadas', 'Tokens', '% válidas', '% no entendidas', 'Grupos'], lotes.map((l) => [l.id, new Date(l.fecha).toLocaleString('es-AR'), l.resumen?.modelo ?? '—', l.resumen?.llamadas ?? '—', l.resumen?.tokens ?? '—', pct(l.resumen?.pctValidas), pct(l.resumen?.pctNoEntendidas), l.resumen?.gruposCandidatos ?? '—'])) : '<p class="suave">Todavía no hay corpus.</p>'}</div>
  <div id="detalle"></div>`;
  vista.querySelectorAll('tbody tr').forEach((tr, i) => { tr.classList.add('clic'); tr.tabIndex = 0; const ir = () => { location.hash = `corpus/${encodeURIComponent(lotes[i].id)}`; }; tr.addEventListener('click', ir); tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); }); });
  const f = $('#f');
  const leer = () => ({ perfiles: [...f.querySelectorAll('input[name=perfil]:checked')].map((x) => x.value), frases: Number(f.frases.value), maxEstados: Number(f.maxEstados.value), maxLlamadasIa: Number(f.maxLlamadasIa.value), seedBase: Number(f.seedBase.value) });
  $('#estimar').addEventListener('click', async () => {
    $('#msg').textContent = ''; $('#est').innerHTML = '<p class="suave">Muestreando estados…</p>';
    try {
      const e = await api('/api/corpus/estimar', { method: 'POST', body: JSON.stringify(leer()) });
      $('#est').innerHTML = `<div class="tarjetas">${[[e.estados, 'estados distintos'], [e.llamadasEfectivas, `llamadas${e.superaTope ? ` (de ${e.llamadas}, corta el tope)` : ''}`], [num(e.tokens, 0), `tokens estimados (~${num(e.tokensPorLlamada, 0)} por llamada)`]]
        .map(([v, t]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${esc(t)}</div></div>`).join('')}</div>
        <p class="suave">Modelo: ${esc(e.modelo ?? '—')} · Keys de Groq: ${e.keys.length ? esc(e.keys.map((k) => `${k.nombre} ${k.key}`).join(', ')) : 'ninguna (no se puede generar)'}</p>`;
    } catch (err) { $('#est').innerHTML = ''; $('#msg').textContent = err.message; }
  });
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); $('#msg').textContent = '';
    try { await api('/api/corpus', { method: 'POST', body: JSON.stringify(leer()) }); location.hash = 'vivo'; } catch (err) { $('#msg').textContent = err.message; }
  });
  if (sel) await verAgrupadas(sel);
}

async function verAgrupadas(id) {
  const g = await api(`/api/corpus/${encodeURIComponent(id)}/agrupadas`);
  const ints = Object.keys(g);
  $('#detalle').innerHTML = `<div class="tarjeta"><h2 style="margin-top:0">Frases candidatas de ${esc(id)}</h2>
    <p class="suave">No entendidas, reformuladas o resueltas a otra intención. Todas quedan pendientes de aprobación.</p>
    <div class="fila"><label class="campo">Intención<select id="fi"><option value="">Todas</option>${ints.map((i) => `<option>${esc(i)}</option>`).join('')}</select></label>
    <label class="campo">Frecuencia mínima<input type="number" id="ff" min="1" value="1"></label></div><div id="lista" style="margin-top:12px"></div></div>`;
  const pintar = () => {
    const i = $('#fi').value; const min = Number($('#ff').value) || 1;
    const filas = Object.entries(g).filter(([k]) => !i || k === i).flatMap(([k, xs]) => xs.filter((x) => x.frecuencia >= min).map((x) => [k, x.ejemplos[0], x.frecuencia, Object.entries(x.resultados).map(([r, n]) => `${r} ×${n}`).join(', '), x.perfiles.join(', ')]));
    $('#lista').innerHTML = filas.length ? tabla(['Intención objetivo', 'Frase', 'Frecuencia', 'Motor', 'Perfiles'], filas) : '<p class="suave">Sin frases con ese filtro.</p>';
  };
  $('#fi').addEventListener('change', pintar); $('#ff').addEventListener('input', pintar);
  pintar();
}

// Ajustes
async function ajustes() {
  const a = await api('/api/ajustes');
  const estados = { disponible: 'disponible', cooldown: 'en espera', agotada: 'agotada', limite_diario: 'límite diario' };
  vista.innerHTML = `<h1>Ajustes</h1>
  <div class="tarjeta"><h2 style="margin-top:0">Keys de Groq</h2>
    <p class="suave">Modelo: ${esc(a.modelo ?? '—')} · límite diario por key: ${esc(a.limiteDiarioPorKey)} llamadas · mezcla por defecto: ${esc(a.mezcla ? `${a.mezcla.codigo} % código / ${a.mezcla.ia} % IA` : '—')}</p>
    ${a.keys.length ? tabla(['Nombre', 'Key', 'Usadas hoy', 'Estado'], a.keys.map((k) => [k.nombre, k.key, `${k.usadas} / ${k.limite}`, estados[k.estado] ?? k.estado]))
      : '<p>No hay keys de Groq. Se cargan en <code>config/keys.json</code> (lista <code>groq</code>) o en las variables <code>GROQ_API_KEY</code>, <code>GROQ_API_KEY_2</code>…</p>'}
    <p class="suave">Las keys se muestran solo con los últimos 4 caracteres.</p></div>`;
}

ruta();

// Replay: elegir lote y run; visor turno a turno.
async function replay(arg) {
  const [loteId, runId] = (arg ?? '').split('~');
  const lotes = await api('/api/lotes');
  vista.innerHTML = `<h1>Replay</h1><div class="tarjeta"><div class="fila">
    <label class="campo">Lote<select id="rl"><option value="">Elegí un lote</option>${lotes.map((l) => `<option value="${esc(l.id)}"${l.id === loteId ? ' selected' : ''}>${esc(l.id)}</option>`).join('')}</select></label>
    <label class="campo">Run<select id="rr" disabled><option value="">—</option></select></label>
  </div></div><div id="visor"></div>`;
  const sl = $('#rl'); const sr = $('#rr');
  const cargarRuns = async () => {
    sr.innerHTML = '<option value="">—</option>'; sr.disabled = true; $('#visor').innerHTML = '';
    if (!sl.value) return;
    const runs = await api(`/api/lotes/${encodeURIComponent(sl.value)}/runs`);
    sr.innerHTML = `<option value="">Elegí un run</option>${runs.filter((r) => r.turnos > 0).map((r) => `<option value="${esc(r.runId)}"${r.runId === runId ? ' selected' : ''}>${esc(r.runId)} · ${esc(r.perfil)} · ${esc(r.caso)} · ${esc(r.cierre)} (${esc(r.turnos)})</option>`).join('')}`;
    sr.disabled = false;
    if (sr.value) await verRun(sl.value, sr.value);
  };
  sl.addEventListener('change', cargarRuns);
  sr.addEventListener('change', () => { if (sr.value) location.hash = `replay/${encodeURIComponent(`${sl.value}~${sr.value}`)}`; });
  await cargarRuns();
}

async function verRun(loteId, runId) {
  const v = await api(`/api/lotes/${encodeURIComponent(loteId)}/replay/${encodeURIComponent(runId)}`);
  let i = 0;
  const caja = $('#visor');
  const pintar = () => {
    const t = v.turnos[i];
    const lista = (xs) => (xs?.length ? xs.map(esc).join('<br>') : '—');
    caja.innerHTML = `<div class="tarjeta">
      <p class="suave">${esc(v.run.perfil)} · ${esc(v.run.caso)} · seed ${esc(v.run.seed)} · modo ${esc(v.run.modo)} · cierre ${esc(v.run.cierre)}</p>
      <div class="fila">
        <button id="ant" ${i === 0 ? 'disabled' : ''}>Anterior</button>
        <span>Turno <strong>${esc(t.turno)}</strong> de ${v.turnos.length}</span>
        <button id="sig" ${i === v.turnos.length - 1 ? 'disabled' : ''}>Siguiente</button>
        <button id="trab" ${v.primerTrabado < 0 ? 'disabled' : ''}>Primer turno trabado</button>
        <button id="hito" ${v.primerHito < 0 ? 'disabled' : ''}>Primer hito</button>
        <button id="verif">Verificar replay</button>
      </div>
      <p id="vres" class="suave" role="status"></p>
      <div class="scroll"><table><tbody>
        <tr><th>Frase</th><td>${esc(t.frase)}</td></tr>
        <tr><th>Intención</th><td>${esc(t.intencion ?? '—')}</td></tr>
        <tr><th>Regla</th><td>${esc(t.regla ?? '—')}</td></tr>
        <tr><th>Resultado</th><td>${esc(t.resultado)}</td></tr>
        <tr><th>Texto narrado</th><td style="white-space:pre-wrap">${esc(t.texto)}</td></tr>
        <tr><th>Tags escritos</th><td>${lista(t.tagsEscritos)}</td></tr>
        <tr><th>Tags borrados</th><td>${lista(t.tagsBorrados)}</td></tr>
        <tr><th>Hito</th><td>${esc(t.hito ?? '—')}</td></tr>
        <tr><th>Escena</th><td>${esc(t.escena)}</td></tr>
        <tr><th>Hora</th><td>${esc(t.hora)}</td></tr>
      </tbody></table></div></div>`;
    $('#ant').onclick = () => { i -= 1; pintar(); };
    $('#sig').onclick = () => { i += 1; pintar(); };
    $('#trab').onclick = () => { i = v.primerTrabado; pintar(); };
    $('#hito').onclick = () => { i = v.primerHito; pintar(); };
    $('#verif').onclick = async () => {
      const out = $('#vres'); out.textContent = 'Re-ejecutando…';
      try {
        const r = (await api(`/api/lotes/${encodeURIComponent(loteId)}/replay/${encodeURIComponent(runId)}?verificar=1`)).replay;
        const aviso = r.mismaVersion ? '' : ' (otra versión del narrador)';
        out.className = r.divergencias ? 'error' : 'ok';
        out.textContent = r.divergencias ? `${r.divergencias} turnos divergentes${aviso}. Primero: turno ${r.primera.turno}, campo ${r.primera.campo}.` : `0 divergencias${aviso}.`;
      } catch (e) { out.className = 'error'; out.textContent = e.message; }
    };
  };
  pintar();
}

// Regresión: resúmenes de la dorada, correrla y comparar dos versiones.
async function regresion() {
  const lista = await api('/api/dorada');
  vista.innerHTML = `<h1>Regresión</h1>
  <div class="tarjeta"><div class="fila"><button class="primario" id="correr">Correr dorada</button><span id="cmsg" class="suave" role="status"></span></div></div>
  <div class="tarjeta scroll">${lista.length ? tabla(['Versión', 'Commit', 'Fecha', 'Runs', '% hitos', 'Trabadas', 'Excepciones', 'Tiempo'],
    lista.map((d) => [d.id, String(d.version?.commit ?? '').slice(0, 7), new Date(d.fecha).toLocaleString('es-AR'), d.runs, pct(d.pctHitosAlcanzados), d.trabadas, d.excepciones, duracion(d.segundos)])) : '<p class="suave">Todavía no hay resúmenes de la dorada.</p>'}</div>
  ${lista.length > 1 ? `<div class="tarjeta"><h2 style="margin-top:0">Comparar</h2><div class="fila">
    <label class="campo">Base<select id="ca">${lista.map((d, k) => `<option${k === lista.length - 2 ? ' selected' : ''}>${esc(d.id)}</option>`).join('')}</select></label>
    <label class="campo">Nueva<select id="cb">${lista.map((d, k) => `<option${k === lista.length - 1 ? ' selected' : ''}>${esc(d.id)}</option>`).join('')}</select></label>
    <button id="comp">Comparar</button></div><div id="cres"></div></div>` : ''}`;
  $('#correr').onclick = async () => {
    $('#correr').disabled = true; $('#cmsg').textContent = 'Corriendo la dorada…';
    try { const r = await api('/api/dorada', { method: 'POST', body: '{}' }); $('#cmsg').textContent = `Listo: ${r.runs} runs en ${duracion(r.segundos)}.`; setTimeout(regresion, 800); } catch (e) { $('#cmsg').className = 'error'; $('#cmsg').textContent = e.message; $('#correr').disabled = false; }
  };
  if ($('#comp')) $('#comp').onclick = async () => {
    const c = await api(`/api/dorada/comparar?a=${encodeURIComponent($('#ca').value)}&b=${encodeURIComponent($('#cb').value)}`);
    const fila = (x, clase) => `<tr class="${clase}"><td>${esc(x.tipo)}</td><td>${x.items ? esc(x.items.join(', ')) : `${esc(x.antes)} → ${esc(x.despues)} (${x.diferencia > 0 ? '+' : ''}${esc(x.diferencia)})`}</td></tr>`;
    $('#cres').innerHTML = `<p class="${c.regresion ? 'error' : 'ok'}">${c.regresion ? `${c.regresiones.length} regresiones` : 'Sin regresiones'}</p>
      ${c.regresiones.length || c.cambios.length ? `<div class="scroll"><table><thead><tr><th>Cambio</th><th>Detalle</th></tr></thead><tbody>${c.regresiones.map((x) => fila(x, 'regresion')).join('')}${c.cambios.map((x) => fila(x, '')).join('')}</tbody></table></div>` : ''}`;
  };
}

// Candidatos: revisar frases y textos, y exportar los aprobados.
const ESTADO_FILTRO = { clase: 'frase', fuente: '', lote: '', perfil: '', intencion: '', frecuencia: 1, estado: 'pendiente' };
async function candidatos() {
  const [fuentes, cfg] = await Promise.all([api('/api/candidatos/fuentes'), api('/api/config')]);
  const f = ESTADO_FILTRO;
  let items = [];
  vista.innerHTML = `<h1>Candidatos</h1>
  <div class="fila pestanas" role="tablist">
    <button role="tab" data-clase="frase" aria-selected="${f.clase === 'frase'}">Frases</button>
    <button role="tab" data-clase="texto" aria-selected="${f.clase === 'texto'}">Textos</button>
  </div>
  <div class="tarjeta"><div class="fila">
    <label class="campo">Fuente<select id="ff"><option value="">Todas</option>${fuentes.map((x) => `<option${x.id === f.fuente ? ' selected' : ''}>${esc(x.id)}</option>`).join('')}</select></label>
    <label class="campo">Lote<select id="fl"></select></label>
    <label class="campo">Perfil<select id="fp"></select></label>
    <label class="campo">Intención<select id="fi"></select></label>
    <label class="campo">Frecuencia mínima<input id="fq" type="number" min="1" value="${esc(f.frecuencia)}"></label>
    <label class="campo">Estado<select id="fe"></select></label>
  </div><p id="contadores" class="suave"></p>
  <div class="fila"><button id="aprobarTodo">Aprobar lo filtrado</button><button id="rechazarTodo">Rechazar lo filtrado</button><span id="amsg" role="status" class="suave"></span></div></div>
  <div id="lista"></div>
  <div class="tarjeta"><h2 style="margin-top:0">Exportar aprobados</h2><p class="suave">Genera <code>exportaciones/&lt;fecha&gt;/</code> con los aprobados de la fuente elegida arriba (o de todas). No escribe en el repo del narrador.</p>
    <button class="primario" id="exportar">Exportar</button><pre id="emsg" class="suave" style="white-space:pre-wrap"></pre></div>`;
  const opciones = (sel, valores, actual, todas = 'Todos') => { sel.innerHTML = `<option value="">${todas}</option>${[...valores].sort().map((v) => `<option${v === actual ? ' selected' : ''}>${esc(v)}</option>`).join('')}`; };
  const filtrados = () => items.filter((c) => c.clase === f.clase && (!f.lote || c.lote === f.lote) && (!f.perfil || (c.perfil ?? '').split(',').includes(f.perfil))
    && (!f.intencion || (c.intencion ?? '(sin intención)') === f.intencion) && (c.frecuencia ?? 1) >= f.frecuencia && (!f.estado || c.estado === f.estado));
  const pintar = () => {
    const deClase = items.filter((c) => c.clase === f.clase);
    opciones($('#fl'), new Set(deClase.map((c) => c.lote).filter(Boolean)), f.lote);
    opciones($('#fp'), new Set(deClase.flatMap((c) => (c.perfil ?? '').split(',')).filter(Boolean)), f.perfil);
    opciones($('#fi'), new Set(deClase.map((c) => c.intencion ?? '(sin intención)')), f.intencion, 'Todas');
    opciones($('#fe'), new Set(deClase.map((c) => c.estado)), f.estado);
    const cuenta = {}; for (const c of deClase) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1;
    const vis = filtrados();
    $('#contadores').textContent = `${Object.entries(cuenta).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'sin candidatos'} · filtrados: ${vis.length}`;
    const max = 200;
    $('#lista').innerHTML = vis.length ? `<div class="tarjeta scroll"><table class="candidatos"><thead><tr><th>Id</th><th>Estado</th><th>${f.clase === 'frase' ? 'Frase' : 'Texto'}</th><th>Intención</th><th>Lote</th><th>Perfil</th><th>Frec.</th><th>Acciones</th></tr></thead><tbody>
      ${vis.slice(0, max).map((c, i) => `<tr><td>${esc(c.id)}<div class="suave">${esc(c.fuente)}/${esc(c.archivo)}</div></td><td>${esc(c.estado)}</td>
        <td class="largo">${c.textoEditado ? `<s class="suave">${esc(c.texto)}</s><br>${esc(c.textoEditado)}` : esc(c.texto)}${c.fraseJugador ? `<div class="suave">jugador: ${esc(c.fraseJugador)}${c.npc ? ` · ${esc(c.npc)}` : ''}</div>` : ''}${c.nota ? `<div class="suave">nota: ${esc(c.nota)}</div>` : ''}</td>
        <td>${esc(c.intencion ?? '—')}</td><td>${esc(c.lote ?? '—')}</td><td>${esc(c.perfil ?? '—')}</td><td>${esc(c.frecuencia)}</td>
        <td><div class="fila"><button data-i="${i}" data-a="aprobar">Aprobar</button><button data-i="${i}" data-a="rechazar">Rechazar</button><button data-i="${i}" data-a="editar">Editar</button><button data-i="${i}" data-a="pendiente">Pendiente</button></div></td></tr>`).join('')}
      </tbody></table>${vis.length > max ? `<p class="suave">Mostrando ${max} de ${vis.length}. Ajustá los filtros para ver el resto.</p>` : ''}</div>` : '<p class="suave">No hay candidatos con estos filtros.</p>';
    for (const b of vista.querySelectorAll('#lista button[data-a]')) b.onclick = () => accion([vis[Number(b.dataset.i)]], b.dataset.a);
  };
  const cargar = async () => { items = await api(`/api/candidatos${f.fuente ? `?fuentes=${encodeURIComponent(f.fuente)}` : ''}`); pintar(); };
  const accion = async (cs, a) => {
    const cuerpoAccion = { refs: cs.map((c) => c.ref), accion: a };
    if (a === 'editar') {
      const c = cs[0];
      const texto = prompt('Texto corregido:', c.textoEditado ?? c.texto);
      if (texto == null || !texto.trim()) return;
      cuerpoAccion.texto = texto;
      if (c.clase === 'frase') {
        const it = prompt(`Intención (una de: ${cfg.intenciones.join(', ')}, o consulta):`, c.intencion ?? '');
        if (it && (cfg.intenciones.includes(it) || it === 'consulta')) cuerpoAccion.intencion = it;
      }
    }
    try { const r = await api('/api/candidatos/accion', { method: 'POST', body: JSON.stringify(cuerpoAccion) }); $('#amsg').className = 'ok'; $('#amsg').textContent = `${r.cambiados} cambiados.`; await cargar(); } catch (e) { $('#amsg').className = 'error'; $('#amsg').textContent = e.message; }
  };
  for (const b of vista.querySelectorAll('[data-clase]')) b.onclick = () => { f.clase = b.dataset.clase; f.lote = f.perfil = f.intencion = ''; for (const x of vista.querySelectorAll('[data-clase]')) x.setAttribute('aria-selected', x === b); pintar(); };
  $('#ff').onchange = (e) => { f.fuente = e.target.value; f.lote = ''; cargar(); };
  $('#fl').onchange = (e) => { f.lote = e.target.value; pintar(); };
  $('#fp').onchange = (e) => { f.perfil = e.target.value; pintar(); };
  $('#fi').onchange = (e) => { f.intencion = e.target.value; pintar(); };
  $('#fq').onchange = (e) => { f.frecuencia = Math.max(1, Number(e.target.value) || 1); pintar(); };
  $('#fe').onchange = (e) => { f.estado = e.target.value; pintar(); };
  const enLote = (a) => async () => { const vis = filtrados(); if (!vis.length || !confirm(`${a === 'aprobar' ? 'Aprobar' : 'Rechazar'} ${vis.length} candidatos filtrados?`)) return; await accion(vis, a); };
  $('#aprobarTodo').onclick = enLote('aprobar');
  $('#rechazarTodo').onclick = enLote('rechazar');
  $('#exportar').onclick = async () => {
    $('#emsg').textContent = 'Exportando…';
    try {
      const r = await api('/api/exportar', { method: 'POST', body: JSON.stringify({ fuentes: f.fuente ? [f.fuente] : [] }) });
      const x = r.resumen;
      $('#emsg').textContent = `En ${r.dir}: ${r.archivos.join(', ')}.\nAprobados ${x.aprobados} · léxico ${x.exportados['diccionario-lexico']} · patrones ${x.exportados['frases-patrones']} · textos ${x.exportados.textos} · descartados por duplicado ${x.duplicados} · sin intención ${x.sinIntencion}.`;
    } catch (e) { $('#emsg').textContent = e.message; }
  };
  await cargar();
}
