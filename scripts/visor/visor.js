const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: d }));
const pct = (v) => (v == null ? '—' : `${num(v)} %`);
const fecha = (f) => (f ? new Date(f).toLocaleString('es-AR') : '—');
const vista = $('#vista');
const DATOS = JSON.parse($('#datos').textContent);
DATOS.lotes ??= []; DATOS.candidatos ??= []; DATOS.comandos ??= [];

const tabla = (cab, filas) => `<div class="scroll"><table><thead><tr>${cab.map((x) => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((x) => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
function barras(obj, total) {
  const e = Object.entries(obj ?? {});
  if (!e.length) return '<span class="suave">—</span>';
  const max = total || Math.max(...e.map(([, v]) => v)) || 1;
  return e.map(([k, v]) => `<span>${esc(k)}</span><div class="barra-h"><div class="b" style="width:${(100 * v) / max}%"></div></div><span>${esc(num(v))}</span>`).join('');
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
    ${ls.map((l) => `<tr class="clic" data-id="${esc(l.id)}" tabindex="0"><td>${esc(l.id)}</td><td>${esc(fecha(l.fecha))}</td><td>${esc(l.tipo)}</td><td>${esc(l.runs ?? '—')}</td><td>${esc(l.perfiles || '—')}</td><td>${esc(l.versionNarrador ?? '—')}</td><td>${l.informe || l.informeMd ? 'sí' : 'no'}</td></tr>`).join('')}
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
  const cab = `<h1>Lote ${esc(id)}</h1><p class="suave">${esc(fecha(l.fecha))} · simulador ${esc(l.versionSimulador ?? '—')} · narrador ${esc(l.versionNarrador ?? '—')} · <a href="#lotes">volver</a></p>`;
  const md = l.informeMd ? `<details class="tarjeta"${l.informe ? '' : ' open'}><summary>informe.md</summary><div class="md">${markdown(l.informeMd)}</div></details>` : '';
  const i = l.informe;
  if (!i) { vista.innerHTML = cab + (md || '<p class="suave">Este lote no tiene informe.</p>'); return; }
  const runs = i.runs;
  const desen = i.porCierre?.desenlace ?? 0;
  const sims = Object.values(i.similitud ?? {}).filter((s) => s?.pares && s.jaccard);
  const simMedia = sims.length ? sims.reduce((a, s) => a + s.jaccard.media * s.pares, 0) / sims.reduce((a, s) => a + s.pares, 0) : null;
  const perf = Object.entries(i.porPerfil ?? {}).filter(([, p]) => p && typeof p === 'object');
  const casos = Object.entries(i.porCaso ?? {});
  const tarjetas = [[runs, 'runs'], [pct(runs ? (100 * desen) / runs : null), 'desenlace'], [pct(i.pctTrabada), 'trabada'], [num(i.turnos?.media), 'turnos (media)'], [num(i.turnos?.p90), 'turnos (p90)'], [num(simMedia, 2), 'similitud media (Jaccard)'], [pct(i.resultadosMotor?.reformula), 'reformulación']];
  vista.innerHTML = `${cab}
  <div class="tarjetas">${tarjetas.map(([v, e]) => `<div class="tarjeta"><div class="cifra">${esc(v)}</div><div class="etiqueta">${e}</div></div>`).join('')}</div>
  <div class="tarjeta"><h2 class="primero">Cierres</h2><div class="barras">${barras(i.porCierre, runs)}</div></div>
  ${perf.length ? `<div class="tarjeta"><h2 class="primero">Por perfil</h2>
    ${tabla(['Perfil', 'Runs', 'Runs con hito', 'Hitos', 'pista_conocida', 'Turnos al 1er hito', '% reformula (20 primeros)', '% abandono', 'Excepciones'],
      perf.map(([k, p]) => [k, p.runs, p.runsConHito, p.hitos, p.pistaConocidaEscrita, num(p.turnosHastaPrimerHito?.media), pct(p.pctReformulacionPrimeros20), pct(p.pctAbandono), p.excepciones]))}</div>` : ''}
  <div class="tarjeta"><h2 class="primero">Por caso</h2>
    ${tabla(['Caso', 'Runs', 'Hitos alcanzados', 'Desenlaces'], casos.map(([k, x]) => [k, x.runs, Object.entries(x.hitos ?? {}).map(([h, v]) => `${h} ${num(v.pct)} %`).join(' · ') || '—', Object.entries(x.desenlaces ?? {}).map(([d, v]) => `${d}: ${v?.cantidad ?? v}`).join(', ') || '—']))}</div>
  <div class="tarjeta"><h2 class="primero">Resultados del motor</h2><div class="barras">${barras(i.resultadosMotor, 100)}</div></div>
  ${(i.topNoEntendidas ?? []).length ? `<div class="tarjeta"><h2 class="primero">Frases no entendidas (top)</h2>${tabla(['Frase', 'Veces'], i.topNoEntendidas.map((x) => [x.frase, x.veces]))}</div>` : ''}
  ${(i.trabadas ?? []).length ? `<div class="tarjeta"><h2 class="primero">Trabadas</h2>${tabla(['Run', 'Perfil', 'Caso', 'Escena', 'Hitos', 'Últimas acciones'], i.trabadas.slice(0, 50).map((x) => [x.runId, x.perfil, x.caso, x.escena, (x.hitos ?? []).join(', ') || '—', (x.ultimasAcciones ?? []).join(' · ')]))}${i.trabadas.length > 50 ? `<p class="suave">Mostrando 50 de ${i.trabadas.length}.</p>` : ''}</div>` : ''}
  <div class="tarjeta"><h2 class="primero">Tags</h2><p>Nunca escritos: ${esc((i.tags?.nuncaEscritos ?? []).join(', ') || '—')}</p><p>Graves sin reparación: ${esc(i.tags?.gravesSinReparacion?.length ?? 0)}</p></div>
  <div class="tarjeta"><h2 class="primero">Fallas graves</h2>${(i.fallasGraves ?? []).length ? tabla(['Run', 'Error'], i.fallasGraves.map((x) => [x.runId, x.error ?? x.mensaje ?? JSON.stringify(x)])) : '<p class="ok">Ninguna.</p>'}</div>
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
const esCandidato = (x) => x && typeof x.id === 'string' && typeof x.estado === 'string' && (typeof x.frase === 'string' || typeof x.texto === 'string');
function plano(fuente, archivo, x, grupo = null) {
  const frase = typeof x.frase === 'string';
  return { fuente, archivo, id: x.id, clase: frase ? 'frase' : 'texto', estado: x.estado, texto: frase ? x.frase : x.texto, textoEditado: x.textoEditado ?? null,
    intencion: x.intencionAprobada ?? x.intencionObjetivo ?? x.motorIntencion ?? x.motor?.intencion ?? x.contexto?.intencion ?? (grupo && !grupo.startsWith('(') ? grupo : null),
    lote: x.lote ?? x.tandas?.[0] ?? (fuente === 'docs' ? null : fuente), perfil: x.perfil ?? x.perfiles?.join(',') ?? null, frecuencia: x.frecuencia ?? 1,
    npc: x.contexto?.npc ?? null, fraseJugador: x.contexto?.frase ?? null, nota: x.nota ?? null };
}
function cargar() {
  vista.innerHTML = `<h1>Cargar archivos</h1><div class="tarjeta"><p>Elegí la carpeta <code>simulaciones</code>, la de un lote o <code>docs/candidatos</code>. Se leen <code>config.json</code>, <code>informe.json</code>, <code>informe.md</code> y los archivos de candidatos. Nada sale del equipo.</p>
  <div class="fila"><label class="campo">Carpeta<input id="carpeta" type="file" webkitdirectory multiple></label><label class="campo">Archivos sueltos<input id="sueltos" type="file" multiple accept=".json,.jsonl,.md"></label></div><p id="cmsg" class="suave" role="status"></p></div>`;
  const leer = async (files) => {
    const lotes = new Map(); let nc = 0;
    for (const f of files) {
      const partes = (f.webkitRelativePath || f.name).split('/');
      const nombre = partes.at(-1); const padre = partes.at(-2) ?? ''; const abuelo = partes.at(-3) ?? '';
      let txt; try { txt = await f.text(); } catch { continue; }
      try {
        if (padre === 'candidatos' || (!padre && /agrupadas\.json$|textos\.jsonl$/.test(nombre))) {
          const fuente = abuelo && abuelo !== 'docs' ? abuelo : 'docs';
          const antes = DATOS.candidatos.length;
          DATOS.candidatos = DATOS.candidatos.filter((c) => !(c.fuente === fuente && c.archivo === nombre));
          if (nombre.endsWith('.jsonl')) for (const x of txt.split('\n').filter(Boolean).map((l) => JSON.parse(l))) { if (esCandidato(x)) DATOS.candidatos.push(plano(fuente, nombre, x)); }
          else { const d = JSON.parse(txt); if (d?.candidatos && !Array.isArray(d.candidatos)) for (const [g, xs] of Object.entries(d.candidatos)) for (const x of xs) if (esCandidato(x)) DATOS.candidatos.push(plano(fuente, nombre, x, g)); }
          nc += DATOS.candidatos.length - antes;
        } else if (['config.json', 'informe.json', 'informe.md'].includes(nombre)) {
          const id = padre || 'lote-cargado';
          const l = lotes.get(id) ?? {}; lotes.set(id, l);
          if (nombre === 'config.json') l.config = JSON.parse(txt); else if (nombre === 'informe.json') l.informe = JSON.parse(txt); else l.informeMd = txt;
        }
      } catch { /* archivo ilegible: se ignora */ }
    }
    for (const [id, l] of lotes) {
      const c = l.config ?? {};
      const x = { id: c.loteId ?? id, fecha: c.fecha ?? null, tipo: c.tipo ?? 'simulacion', runs: c.parametros?.runs ?? l.informe?.runs ?? null,
        perfiles: (c.parametros?.perfiles ?? []).map((p) => (typeof p === 'string' ? p : `${p.id}:${p.agentes}`)).join(', '), versionNarrador: c.narrador?.version ?? null,
        versionSimulador: c.version ?? null, informe: l.informe ?? null, informeMd: l.informeMd ?? null };
      DATOS.lotes = DATOS.lotes.filter((y) => y.id !== x.id).concat(x);
    }
    DATOS.lotes.sort((a, b) => String(b.fecha ?? '').localeCompare(String(a.fecha ?? '')));
    $('#cmsg').className = 'ok'; $('#cmsg').textContent = `Cargados: ${lotes.size} lotes y ${nc} candidatos.`;
  };
  $('#carpeta').onchange = (e) => leer([...e.target.files]);
  $('#sueltos').onchange = (e) => leer([...e.target.files]);
}

const PANTALLAS = { lotes, candidatos, comandos, cargar };
function ruta() {
  const [p, ...resto] = (location.hash.slice(1) || 'lotes').split('/');
  const fn = PANTALLAS[p] ?? lotes;
  for (const a of document.querySelectorAll('.nav a')) a.classList.toggle('activo', a.getAttribute('href') === `#${p}`);
  $('#nav').classList.remove('abierto'); $('#menu').setAttribute('aria-expanded', 'false');
  fn(resto.length ? decodeURIComponent(resto.join('/')) : undefined);
}
$('#menu').onclick = () => { const a = $('#nav').classList.toggle('abierto'); $('#menu').setAttribute('aria-expanded', String(a)); };
$('#generado').textContent = DATOS.generado ? `Generado ${fecha(DATOS.generado)}` : '';
window.addEventListener('hashchange', ruta);
ruta();
