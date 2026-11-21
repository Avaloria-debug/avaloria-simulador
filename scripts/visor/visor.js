const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: d }));
const pct = (v) => (v == null ? '—' : `${num(v)} %`);
const fecha = (f) => (f ? new Date(f).toLocaleString('es-AR') : '—');
const vista = $('#vista');
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const lista = (v) => arr(v).filter((x) => x != null).join(', ');
const DATOS = JSON.parse($('#datos').textContent);
DATOS.lotes ??= []; DATOS.candidatos ??= []; DATOS.comandos ??= [];

const tabla = (cab, filas) => `<div class="scroll"><table><thead><tr>${cab.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function barras(o, total) {
  const e = Object.entries(obj(o)).map(([k, v]) => [k, Number(v)]).filter(([, v]) => Number.isFinite(v));
  if (!e.length) return '<span class="suave">—</span>';
  const max = Number(total) || Math.max(...e.map(([, v]) => v)) || 1;
  return e.map(([k, v]) => `<span>${esc(k)}</span><div class="barra-h"><div class="b" style="width:${Math.max(0, Math.min(100, (100 * v) / max))}%"></div></div><span>${esc(num(v))}</span>`).join('');
}

// Markdown mínimo (títulos, tablas, listas, párrafos) para informe.md.
function markdown(md) {
  const enLinea = (t) => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const celdas = (l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  const out = []; const ls = md.split('\n');
  for (let i = 0; i < ls.length; i++) {
    const l = ls[i];
    if (/^#{1,6} /.test(l)) { const n = Math.min(l.match(/^#+/)[0].length + 1, 6); out.push(`<h${n}>${enLinea(l.replace(/^#+ /, ''))}</h${n}>`); }
    else if (l.trim().startsWith('|') && /^\s*\|?\s*:?-{3,}/.test(ls[i + 1] ?? '')) {
      const cab = celdas(l); const filas = []; i += 2;
      while (i < ls.length && ls[i].trim().startsWith('|')) filas.push(celdas(ls[i++]));
      i--; out.push(`<div class="scroll"><table><thead><tr>${cab.map((c) => `<th>${enLinea(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${enLinea(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
    } else if (/^\s*[-*] /.test(l)) {
      const items = []; while (i < ls.length && /^\s*[-*] /.test(ls[i])) items.push(ls[i++].replace(/^\s*[-*] /, ''));
      i--; out.push(`<ul>${items.map((x) => `<li>${enLinea(x)}</li>`).join('')}</ul>`);
    } else if (l.trim()) out.push(`<p>${enLinea(l)}</p>`);
  }
  return out.join('\n');
}

// Lotes
function lotes(id) {
  if (id) return detalle(id);
  const ls = DATOS.lotes;
  vista.innerHTML = `<h1>Lotes</h1>${ls.length ? `<div class="tarjeta scroll"><table><thead><tr><th>Lote</th><th>Fecha</th><th>Tipo</th><th>Runs</th><th>Perfiles</th><th>Versión narrador</th><th>Informe</th></tr></thead><tbody>
    ${ls.map((l) => `<tr class="clic" data-id="${esc(l.id)}" tabindex="0"><td>${esc(l.loteId ?? l.id)}</td><td>${esc(fecha(l.fecha))}</td><td>${esc(l.tipo)}</td><td>${esc(l.runs ?? '—')}</td><td>${esc(l.perfiles || '—')}</td><td>${esc(l.versionNarrador ?? '—')}</td><td>${l.informe || l.informeMd ? 'sí' : 'no'}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="suave">No hay lotes. Corré <code>npm run generar-html</code> o cargá archivos desde «Cargar archivos».</p>'}`;
  for (const tr of vista.querySelectorAll('tr.clic')) {
    const ir = () => { location.hash = `lotes/${encodeURIComponent(tr.dataset.id)}`; };
    tr.addEventListener('click', ir);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') ir(); });
  }
}

function detalle(id) {
  const l = DATOS.lotes.find((x) => x.id === id);
  if (!l) { vista.innerHTML = `<h1>Lote no encontrado</h1><p><a href="#lotes">Volver</a></p>`; return; }
  const cab = `<h1>Lote ${esc(l.loteId ?? id)}</h1><p class="suave">${esc(fecha(l.fecha))} · simulador ${esc(l.versionSimulador ?? '—')} · narrador ${esc(l.versionNarrador ?? '—')} · <a href="#lotes">volver</a></p>`;
  const md = l.informeMd ? `<details class="tarjeta"${l.informe ? '' : ' open'}><summary>informe.md</summary><div class="md">${markdown(l.informeMd)}</div></details>` : '';
  const i = l.informe;
  if (!i) { vista.innerHTML = cab + (md || '<p class="suave">Este lote no tiene informe.</p>'); return; }
  const runs = Number.isFinite(Number(i.runs)) ? Number(i.runs) : null;
  const desen = Number(obj(i.porCierre).desenlace) || 0;
  const sims = Object.values(obj(i.similitud)).filter((s) => Number(s?.pares) > 0 && Number.isFinite(Number(s?.jaccard?.media)));
  const simMedia = sims.length ? sims.reduce((a, s) => a + s.jaccard.media * s.pares, 0) / sims.reduce((a, s) => a + s.pares, 0) : null;
  const perf = Object.entries(obj(i.porPerfil)).filter(([, p]) => p && typeof p === 'object');
  const casos = Object.entries(obj(i.porCaso)).map(([k, x]) => [k, obj(x)]);
  const motor = obj(i.resultadosMotor);
  const noEnt = arr(i.topNoEntendidas).filter((x) => x && typeof x === 'object');
  const trab = arr(i.trabadas).filter((x) => x && typeof x === 'object');
  const fallas = arr(i.fallasGraves).filter((x) => x != null);
  const tags = obj(i.tags);
  const tarjetas = [[num(runs, 0), 'runs'], [pct(runs ? (100 * desen) / runs : null), 'desenlace'], [pct(i.pctTrabada), 'trabada'], [num(i.turnos?.media), 'turnos (media)'], [num(i.turnos?.p90), 'turnos (p90)'], [num(simMedia, 2), 'similitud media (Jaccard)'], [pct(motor.reformula), 'reformulación']];
  vista.innerHTML = `${cab}
  <div class="tarjetas">${tarjetas.map(([v, e]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${e}</div></div>`).join('')}</div>
  <div class="tarjeta"><h2 class="primero">Cierres</h2><div class="barras">${barras(i.porCierre, runs)}</div></div>
  ${perf.length ? `<div class="tarjeta"><h2 class="primero">Por perfil</h2>
    ${tabla(['Perfil', 'Runs', 'Runs con hito', 'Hitos', 'pista_conocida', 'Turnos al 1er hito', '% reformula (20 primeros)', '% abandono', 'Excepciones'],
      perf.map(([k, p]) => [k, num(p.runs, 0), num(p.runsConHito, 0), num(p.hitos, 0), num(p.pistaConocidaEscrita, 0), num(p.turnosHastaPrimerHito?.media), pct(p.pctReformulacionPrimeros20), pct(p.pctAbandono), num(p.excepciones, 0)]))}</div>` : ''}
  ${casos.length ? `<div class="tarjeta"><h2 class="primero">Por caso</h2>
    ${tabla(['Caso', 'Runs', 'Hitos alcanzados', 'Desenlaces'], casos.map(([k, x]) => [k, num(x.runs, 0), Object.entries(obj(x.hitos)).map(([h, v]) => `${h} ${pct(v?.pct)}`).join(' · ') || '—', Object.entries(obj(x.desenlaces)).map(([d, v]) => `${d}: ${num(v && typeof v === 'object' ? v.cantidad : v, 0)}`).join(', ') || '—']))}</div>` : ''}
  <div class="tarjeta"><h2 class="primero">Resultados del motor</h2><div class="barras">${barras(motor, 100)}</div></div>
  ${noEnt.length ? `<div class="tarjeta"><h2 class="primero">Frases no entendidas (top)</h2>${tabla(['Frase', 'Veces'], noEnt.map((x) => [x.frase ?? '—', num(x.veces, 0)]))}</div>` : ''}
  ${trab.length ? `<div class="tarjeta"><h2 class="primero">Trabadas</h2>${tabla(['Run', 'Perfil', 'Caso', 'Escena', 'Hitos', 'Últimas acciones'], trab.slice(0, 50).map((x) => [x.runId ?? '—', x.perfil ?? '—', x.caso ?? '—', x.escena ?? '—', lista(x.hitos) || '—', arr(x.ultimasAcciones).join(' · ') || '—']))}${trab.length > 50 ? `<p class="suave">Mostrando 50 de ${trab.length}.</p>` : ''}</div>` : ''}
  <div class="tarjeta"><h2 class="primero">Tags</h2><p>Nunca escritos: ${esc(lista(tags.nuncaEscritos) || '—')}</p><p>Graves sin reparación: ${esc(arr(tags.gravesSinReparacion).length)}</p></div>
  <div class="tarjeta"><h2 class="primero">Fallas graves</h2>${fallas.length ? tabla(['Run', 'Error'], fallas.map((x) => [x.runId ?? '—', x.error ?? x.mensaje ?? JSON.stringify(x)])) : '<p class="ok">Ninguna.</p>'}</div>
  ${md}`;
}

// Candidatos (solo lectura)
const F = { clase: 'frase', fuente: '', intencion: '', estado: '' };
function candidatos() {
  const items = DATOS.candidatos;
  vista.innerHTML = `<h1>Candidatos</h1><p class="suave">Solo lectura. Para aprobar, editar o rechazar, usá <code>npm run ui</code>.</p>
  <div class="fila pestanas" role="tablist">
    <button role="tab" data-clase="frase" aria-selected="${F.clase === 'frase'}">Frases</button>
    <button role="tab" data-clase="texto" aria-selected="${F.clase === 'texto'}">Textos</button>
  </div>
  <div class="tarjeta"><div class="fila">
    <label class="campo">Fuente<select id="ff"></select></label>
    <label class="campo">Intención<select id="fi"></select></label>
    <label class="campo">Estado<select id="fe"></select></label>
  </div><p id="contadores" class="suave"></p></div>
  <div id="lista"></div>`;
  const opciones = (sel, valores, actual, todas) => { sel.innerHTML = `<option value="">${todas}</option>${[...valores].sort().map((v) => `<option${v === actual ? ' selected' : ''}>${esc(v)}</option>`).join('')}`; };
  const pintar = () => {
    const deClase = items.filter((c) => c.clase === F.clase);
    opciones($('#ff'), new Set(deClase.map((c) => c.fuente)), F.fuente, 'Todas');
    opciones($('#fi'), new Set(deClase.map((c) => c.intencion ?? '(sin intención)')), F.intencion, 'Todas');
    opciones($('#fe'), new Set(deClase.map((c) => c.estado)), F.estado, 'Todos');
    const vis = deClase.filter((c) => (!F.fuente || c.fuente === F.fuente) && (!F.intencion || (c.intencion ?? '(sin intención)') === F.intencion) && (!F.estado || c.estado === F.estado));
    const cuenta = {}; for (const c of deClase) cuenta[c.estado] = (cuenta[c.estado] ?? 0) + 1;
    $('#contadores').textContent = `${Object.entries(cuenta).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'sin candidatos'} · filtrados: ${vis.length}`;
    const max = 300;
    $('#lista').innerHTML = vis.length ? `<div class="tarjeta scroll"><table class="candidatos"><thead><tr><th>Id</th><th>Estado</th><th>${F.clase === 'frase' ? 'Frase' : 'Texto'}</th><th>Intención</th><th>Lote</th><th>Perfil</th><th>Frec.</th></tr></thead><tbody>
      ${vis.slice(0, max).map((c) => `<tr><td>${esc(c.id)}<div class="suave">${esc(c.fuente)}/${esc(c.archivo)}</div></td><td>${esc(c.estado)}</td>
        <td class="largo">${c.textoEditado ? `<s class="suave">${esc(c.texto)}</s><br>${esc(c.textoEditado)}` : esc(c.texto)}${c.fraseJugador ? `<div class="suave">jugador: ${esc(c.fraseJugador)}${c.npc ? ` · ${esc(c.npc)}` : ''}</div>` : ''}${c.nota ? `<div class="suave">nota: ${esc(c.nota)}</div>` : ''}</td>
        <td>${esc(c.intencion ?? '—')}</td><td>${esc(c.lote ?? '—')}</td><td>${esc(c.perfil ?? '—')}</td><td>${esc(c.frecuencia ?? 1)}</td></tr>`).join('')}
      </tbody></table>${vis.length > max ? `<p class="suave">Mostrando ${max} de ${vis.length}. Ajustá los filtros para ver el resto.</p>` : ''}</div>` : '<p class="suave">No hay candidatos con estos filtros.</p>';
  };
  for (const b of vista.querySelectorAll('[data-clase]')) b.onclick = () => { F.clase = b.dataset.clase; F.fuente = F.intencion = F.estado = ''; for (const x of vista.querySelectorAll('[data-clase]')) x.setAttribute('aria-selected', x === b); pintar(); };
  $('#ff').onchange = (e) => { F.fuente = e.target.value; pintar(); };
  $('#fi').onchange = (e) => { F.intencion = e.target.value; pintar(); };
  $('#fe').onchange = (e) => { F.estado = e.target.value; pintar(); };
  pintar();
}

// Comandos
async function copiar(texto) {
  try { await navigator.clipboard.writeText(texto); return true; } catch { /* file:// puede no tener portapapeles */ }
  const t = document.createElement('textarea'); t.value = texto; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
  document.body.append(t); t.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
  t.remove(); return ok;
}
function comandos() {
  const cs = DATOS.comandos;
  vista.innerHTML = `<h1>Comandos</h1><p class="suave">Del README. Se corren en una terminal dentro de la carpeta del simulador.</p>
  ${cs.length ? cs.map((c, i) => `<div class="tarjeta comando"><div class="etiqueta">${esc(c.seccion)}</div><div class="fila"><code class="cmd">${esc(c.comando)}</code><button data-i="${i}">copiar</button><span class="suave" role="status"></span></div></div>`).join('') : '<p class="suave">No hay comandos.</p>'}`;
  for (const b of vista.querySelectorAll('button[data-i]')) b.onclick = async () => { const ok = await copiar(cs[Number(b.dataset.i)].comando); b.nextElementSibling.textContent = ok ? 'copiado' : 'no se pudo copiar: seleccioná el texto'; };
}

// Cargar archivos (sin servidor): carpetas de simulaciones/ o de docs/candidatos/.
function cargar() {
  vista.innerHTML = `<h1>Cargar archivos</h1><div class="tarjeta"><p>Elegí la carpeta <code>simulaciones</code>, la de un lote o <code>docs/candidatos</code>. Se leen <code>config.json</code>, <code>informe.json</code>, <code>informe.md</code> y los archivos de candidatos. Nada sale del equipo.</p>
  <div class="fila"><label class="campo">Carpeta<input id="carpeta" type="file" webkitdirectory multiple></label><label class="campo">Archivos sueltos<input id="sueltos" type="file" multiple accept=".json,.jsonl,.md"></label></div><p id="cmsg" class="suave" role="status"></p></div>`;
  const leer = async (files) => {
    $('#cmsg').className = 'suave'; $('#cmsg').textContent = 'Leyendo…';
    const lotes = new Map(); let nc = 0; const rotos = []; let ignorados = 0;
    for (const f of files) {
      const partes = (f.webkitRelativePath || f.name).split('/');
      const nombre = partes.at(-1); const padre = partes.at(-2) ?? ''; const abuelo = partes.at(-3) ?? '';
      const esCand = padre === 'candidatos' || (!padre && /agrupadas\.json$|textos\.jsonl$/.test(nombre));
      const esLote = ['config.json', 'informe.json', 'informe.md'].includes(nombre);
      if (!esCand && !esLote) { ignorados++; continue; }
      let txt; try { txt = await f.text(); } catch { rotos.push(nombre); continue; }
      if (esCand) {
        const fuente = abuelo && abuelo !== 'docs' ? abuelo : 'docs';
        const r = candidatosDeArchivo(fuente, nombre, txt);
        if (!r) { ignorados++; continue; }
        if (r.errores) rotos.push(`${fuente}/${nombre}`);
        DATOS.candidatos = DATOS.candidatos.filter((c) => !(c.fuente === fuente && c.archivo === nombre)).concat(r.items);
        nc += r.items.length;
      } else {
        const id = padre || 'archivos sueltos';
        const l = lotes.get(id) ?? {}; lotes.set(id, l);
        if (nombre === 'informe.md') l.informeMd = txt;
        else { try { l[nombre === 'config.json' ? 'config' : 'informe'] = JSON.parse(txt); } catch { rotos.push(`${id}/${nombre}`); } }
      }
    }
    for (const [id, l] of lotes) {
      const x = resumenLote(id, l.config, l.informe, l.informeMd);
      DATOS.lotes = DATOS.lotes.filter((y) => y.id !== x.id).concat(x);
    }
    DATOS.lotes.sort(porFecha);
    const partes = [`Cargados: ${lotes.size} lotes y ${nc} candidatos.`];
    if (ignorados) partes.push(`${ignorados} archivos no eran de lotes ni de candidatos.`);
    if (rotos.length) partes.push(`Ilegibles (en todo o en parte): ${rotos.slice(0, 5).join(', ')}${rotos.length > 5 ? ` y ${rotos.length - 5} más` : ''}.`);
    $('#cmsg').className = rotos.length || (!lotes.size && !nc) ? 'error' : 'ok'; $('#cmsg').textContent = partes.join(' ');
  };
  $('#carpeta').onchange = (e) => leer([...e.target.files]);
  $('#sueltos').onchange = (e) => leer([...e.target.files]);
}

// Keys de Groq: arma config/keys.json en memoria y lo guarda donde elija el usuario. Nunca se muestra una key completa ni se guarda en el navegador.
const ultimos4 = (k) => (typeof k === 'string' && k.length ? `••••${k.slice(-4)}` : '');
const KEYS = { groq: [], resto: {}, cargado: false };
async function guardarArchivo(texto) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: 'keys.json', types: [{ description: 'keys.json', accept: { 'application/json': ['.json'] } }] });
      const w = await h.createWritable(); await w.write(texto); await w.close();
      return 'Guardado. Si lo guardaste en config/keys.json, el simulador ya lo usa.';
    } catch (e) { if (e?.name === 'AbortError') return 'Cancelado: no se guardó nada.'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  a.download = 'keys.json'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return 'Descargado como keys.json. Movelo a la carpeta config/ del simulador (reemplaza el anterior).';
}
function keys() {
  vista.innerHTML = `<h1>Keys de Groq</h1>
  <div class="tarjeta"><p>Arma el archivo <code>config/keys.json</code> que usa el simulador. Las keys quedan solo en esta pestaña mientras está abierta: no se guardan en el navegador ni en este HTML, y se muestran con los últimos 4 caracteres.</p>
  <p class="suave">Para no perder las keys que ya tenés, primero abrí el <code>config/keys.json</code> actual. Guardar reemplaza el archivo completo.</p>
  <label class="campo">Abrir keys.json actual (opcional)<input id="kabrir" type="file" accept=".json,application/json"></label><p id="kmsg1" class="suave" role="status"></p></div>
  <div class="tarjeta"><h2 class="primero">Agregar key</h2><form id="kform" class="fila" autocomplete="off">
    <label class="campo">Nombre<input id="knombre" placeholder="k1" maxlength="40"></label>
    <label class="campo">Key<input id="kkey" type="password" placeholder="pegá la key de Groq" autocomplete="off" spellcheck="false"></label>
    <button type="submit">Agregar</button></form><p id="kmsg2" class="suave" role="status"></p></div>
  <div class="tarjeta"><h2 class="primero">Keys en el archivo</h2><div id="klista"></div>
  <div class="fila"><button class="primario" id="kguardar">Guardar keys.json</button><span id="kmsg3" class="suave" role="status"></span></div></div>`;
  const pintar = () => {
    $('#klista').innerHTML = KEYS.groq.length ? `<div class="scroll"><table><thead><tr><th>Nombre</th><th>Key</th><th></th></tr></thead><tbody>${KEYS.groq.map((k, i) => `<tr><td>${esc(k.nombre)}</td><td>${esc(ultimos4(k.key))}</td><td><button data-q="${i}">Quitar</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="suave">Todavía no hay keys.</p>';
    for (const b of vista.querySelectorAll('button[data-q]')) b.onclick = () => { KEYS.groq.splice(Number(b.dataset.q), 1); pintar(); };
    $('#kguardar').disabled = !KEYS.groq.length;
  };
  $('#kabrir').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try { const r = leerKeysJson(await f.text()); KEYS.groq = r.groq; KEYS.resto = r.resto; KEYS.cargado = true; $('#kmsg1').className = 'ok'; $('#kmsg1').textContent = `Abierto: ${r.groq.length} keys de Groq${Object.keys(r.resto).length ? ' y el resto del archivo se conserva' : ''}.`; }
    catch { $('#kmsg1').className = 'error'; $('#kmsg1').textContent = 'No se pudo leer: no parece un keys.json.'; }
    pintar();
  };
  $('#kform').onsubmit = (e) => {
    e.preventDefault();
    const key = $('#kkey').value.trim(); $('#kkey').value = '';
    let nombre = $('#knombre').value.trim();
    if (!key) { $('#kmsg2').className = 'error'; $('#kmsg2').textContent = 'Falta la key.'; return; }
    if (/\s/.test(key) || key.length < 20) { $('#kmsg2').className = 'error'; $('#kmsg2').textContent = 'La key parece incompleta (sin espacios, al menos 20 caracteres).'; return; }
    if (KEYS.groq.some((k) => k.key === key)) { $('#kmsg2').className = 'error'; $('#kmsg2').textContent = `Esa key ya está (${ultimos4(key)}).`; return; }
    if (!nombre) { let n = KEYS.groq.length + 1; while (KEYS.groq.some((k) => k.nombre === `k${n}`)) n++; nombre = `k${n}`; }
    if (KEYS.groq.some((k) => k.nombre === nombre)) { $('#kmsg2').className = 'error'; $('#kmsg2').textContent = `Ya hay una key llamada ${nombre}.`; return; }
    KEYS.groq.push({ nombre, key }); $('#knombre').value = '';
    $('#kmsg2').className = 'ok'; $('#kmsg2').textContent = `Agregada ${nombre} (${ultimos4(key)}).`;
    pintar();
  };
  $('#kguardar').onclick = async () => {
    if (!KEYS.cargado && !confirm('No abriste el keys.json actual. Si guardás encima de config/keys.json, se reemplazan las keys que tenía. ¿Seguir?')) return;
    $('#kmsg3').className = 'suave'; $('#kmsg3').textContent = await guardarArchivo(armarKeysJson(KEYS));
  };
  pintar();
}

const PANTALLAS = { lotes, candidatos, comandos, cargar, keys };
function ruta() {
  const [p, ...resto] = (location.hash.slice(1) || 'lotes').split('/');
  const fn = PANTALLAS[p] ?? lotes;
  for (const a of document.querySelectorAll('.nav a')) a.classList.toggle('activo', a.getAttribute('href') === `#${p}`);
  $('#nav').classList.remove('abierto'); $('#menu').setAttribute('aria-expanded', 'false');
  let arg; try { arg = resto.length ? decodeURIComponent(resto.join('/')) : undefined; } catch { arg = resto.join('/'); }
  fn(arg || undefined);
}
$('#menu').onclick = () => { const a = $('#nav').classList.toggle('abierto'); $('#menu').setAttribute('aria-expanded', String(a)); };
$('#generado').textContent = DATOS.generado ? `Generado ${fecha(DATOS.generado)}` : '';
window.addEventListener('hashchange', ruta);
ruta();
