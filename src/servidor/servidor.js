import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerConfig, resolverParametros, estimarLote } from '../lote.js';
import { cargarPerfiles, validarPerfil, DIR_PERFILES } from '../perfiles.js';
import { leerJsonl } from '../registro.js';
import { idsCasos, versionNarrador, idsIntenciones } from '../adaptador.js';
import { ejecutarCorpus, resolverCorpus } from '../corpus.js';
import { leerKeysGroq, ultimos4, crearPool } from '../ia/keys.js';
import { replayRun, visorRun } from '../replay.js';
import { correrDorada, listarDoradas, DIR_DORADA } from '../dorada.js';
import { comparar, leerResumen } from '../comparar.js';
import { leerCandidatos, aplicarAccion, listarFuentes, contarPorEstado, DIR_DOCS } from '../candidatos.js';
import { exportar, DIR_EXPORTACIONES } from '../exportar.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR_UI = path.join(RAIZ, 'ui');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };

export const enmascarar = (k) => (typeof k === 'string' && k.length ? `••••${k.slice(-4)}` : '');

function leerKeys(archivo) {
  try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return null; }
}
// Todos los valores de texto de keys.json (para borrarlos de cualquier respuesta).
function secretos(keys) {
  const out = [];
  const rec = (v) => { if (typeof v === 'string' && v.length >= 8) out.push(v); else if (v && typeof v === 'object') Object.values(v).forEach(rec); };
  rec(keys);
  return out;
}

class ErrorHttp extends Error { constructor(estado, msg) { super(msg); this.estado = estado; } }

export function crearServidor({ dirDocs = DIR_DOCS, dirExportaciones = DIR_EXPORTACIONES, dirDorada = DIR_DORADA, dirSim = path.join(RAIZ, 'simulaciones'), dirPerfiles = DIR_PERFILES, archivoKeys = path.join(RAIZ, 'config', 'keys.json'), archivoConfig = path.join(RAIZ, 'config', 'config.json'), env = process.env } = {}) {
  let lote = null; // { hijo, loteId, total, hechos, cierres, inicio, estado, mensaje }
  const clientes = new Set();

  const progreso = () => {
    if (!lote) return { estado: 'inactivo' };
    const seg = (Date.now() - lote.inicio) / 1000;
    const rps = seg > 0 ? lote.hechos / seg : 0;
    return {
      estado: lote.estado, modo: lote.modo, iaLlamadas: lote.iaLlamadas ?? 0, loteId: lote.loteId, hechos: lote.hechos, total: lote.total, cierres: lote.cierres,
      runsPorSeg: Number(rps.toFixed(2)), etaSeg: rps > 0 ? Math.round((lote.total - lote.hechos) / rps) : null, mensaje: lote.mensaje ?? null,
    };
  };
  const emitir = () => { const d = `data: ${JSON.stringify(progreso())}\n\n`; for (const c of clientes) c.write(d); };

  const limpiar = (texto) => { for (const s of [...secretos(leerKeys(archivoKeys)), ...(env.GROQ_API_KEY ? [env.GROQ_API_KEY.trim()] : [])]) texto = texto.split(s).join(enmascarar(s)); return texto; };
  const json = (res, estado, obj) => {
    res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(limpiar(JSON.stringify(obj)));
  };
  const cuerpo = (req) => new Promise((ok, mal) => {
    let s = '';
    req.on('data', (c) => { s += c; if (s.length > 1e6) mal(new ErrorHttp(413, 'cuerpo demasiado grande')); });
    req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch { mal(new ErrorHttp(400, 'JSON inválido')); } });
  });
  const dirLote = (id) => {
    if (!/^[\w-]+$/.test(id)) throw new ErrorHttp(400, 'id de lote inválido');
    const d = path.join(dirSim, id);
    if (!fs.existsSync(path.join(d, 'config.json'))) throw new ErrorHttp(404, `lote inexistente: ${id}`);
    return d;
  };
  const leer = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

  function listarLotes() {
    if (!fs.existsSync(dirSim)) return [];
    return fs.readdirSync(dirSim).filter((id) => fs.existsSync(path.join(dirSim, id, 'config.json'))).map((id) => {
      const c = leer(path.join(dirSim, id, 'config.json'));
      const t = fs.existsSync(path.join(dirSim, id, 'tiempo.json')) ? leer(path.join(dirSim, id, 'tiempo.json')) : null;
      return {
        id, tipo: c.tipo ?? 'lote', fecha: c.fecha, runs: c.parametros?.runs ?? null, versionSimulador: c.version, versionNarrador: c.narrador?.version ?? null,
        perfiles: c.parametros?.perfiles ?? [], conInforme: fs.existsSync(path.join(dirSim, id, 'informe.json')),
        runsPorSeg: t && t.segundos > 0 ? Number((t.runs / t.segundos).toFixed(2)) : null,
      };
    }).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }

  function perfilesCrudos() {
    return fs.readdirSync(dirPerfiles).filter((f) => f.endsWith('.json')).sort().map((f) => leer(path.join(dirPerfiles, f)));
  }

  function lanzar(body) {
    if (lote && lote.estado === 'corriendo') throw new ErrorHttp(409, 'ya hay un lote corriendo');
    if (body.modo === 'corpus') return lanzarCorpus(body);
    const cli = cliLote(body);
    let p;
    try { p = resolverParametros(cli, leerConfig(archivoConfig), cargarPerfiles(dirPerfiles)); } catch (e) { throw new ErrorHttp(400, e.message); }
    arrancar('lote', cli, p.runs);
    return { runs: p.runs, perfiles: p.perfiles, casos: p.casos };
  }
  function cliLote(body) {
    const cli = {};
    if (body.perfiles !== undefined) {
      if (!Array.isArray(body.perfiles)) throw new ErrorHttp(400, 'perfiles tiene que ser una lista de {id, agentes}');
      const activos = body.perfiles.filter((x) => Number(x?.agentes) > 0);
      if (!activos.length) throw new ErrorHttp(400, 'elegí al menos un perfil con agentes > 0');
      cli.perfiles = activos.map((x) => `${x.id}:${x.agentes}`).join(',');
    }
    for (const k of ['trabada', 'maxTurnos', 'seedBase']) if (body[k] !== undefined) cli[k] = String(body[k]);
    if (body.casos !== undefined) cli.casos = Array.isArray(body.casos) ? body.casos.join(',') : String(body.casos);
    if (body.mezcla !== undefined) cli.mezcla = typeof body.mezcla === 'object' && body.mezcla ? `${body.mezcla.codigo}/${body.mezcla.ia}` : body.mezcla;
    if (body.jugadorIa !== undefined) cli.jugadorIa = body.jugadorIa ? 'si' : 'no';
    if (body.maxLlamadasIa !== undefined) cli.maxLlamadasIa = String(body.maxLlamadasIa);
    // El hijo lee config/config.json; la mezcla del servidor se pasa explícita para que mande la configuración que validó.
    if (cli.mezcla === undefined) { const mz = leerConfig(archivoConfig).mezcla; if (mz) cli.mezcla = `${mz.codigo}/${mz.ia}`; }
    cli.salida = dirSim;
    return cli;
  }
  const cliCorpus = (body) => {
    const cli = { perfiles: Array.isArray(body.perfiles) ? body.perfiles.join(',') : body.perfiles, salida: dirSim };
    for (const k of ['frases', 'maxEstados', 'maxLlamadasIa', 'seedBase']) if (body[k] !== undefined) cli[k] = String(body[k]);
    if (body.casos !== undefined) cli.casos = Array.isArray(body.casos) ? body.casos.join(',') : String(body.casos);
    try { return { cli, p: resolverCorpus(cli, leerConfig(archivoConfig), cargarPerfiles(dirPerfiles)) }; } catch (e) { throw new ErrorHttp(400, e.message); }
  };
  function lanzarCorpus(body) {
    const { cli, p } = cliCorpus(body);
    if (!leerKeysGroq({ env, archivo: archivoKeys }).length) throw new ErrorHttp(400, 'no hay keys de Groq (GROQ_API_KEY o config/keys.json): el corpus necesita la IA');
    arrancar('corpus', cli, p.maxEstados * p.perfiles.length);
    return { modo: 'corpus', perfiles: p.perfiles, frases: p.frases, maxEstados: p.maxEstados };
  }
  function arrancar(modo, cli, total) {
    const hijo = fork(path.join(path.dirname(fileURLToPath(import.meta.url)), 'hijo.js'), [JSON.stringify({ modo, cli })], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    lote = { hijo, modo, loteId: null, total, hechos: 0, cierres: {}, inicio: Date.now(), estado: 'corriendo' };
    const este = lote;
    hijo.on('message', (m) => {
      if (m.tipo === 'run') { este.hechos = m.n; este.total = m.total; este.cierres[m.cierre] = (este.cierres[m.cierre] ?? 0) + 1; este.iaLlamadas = (este.iaLlamadas ?? 0) + (m.iaLlamadas ?? 0); }
      else if (m.tipo === 'aviso') este.mensaje = m.mensaje;
      else if (m.tipo === 'fin') { este.estado = m.cuota ? 'cuota' : 'terminado'; este.loteId = m.loteId; if (m.iaLlamadas != null) este.iaLlamadas = m.iaLlamadas; if (m.mensaje) este.mensaje = m.mensaje; }
      else if (m.tipo === 'error') { este.estado = 'error'; este.mensaje = m.mensaje; }
      if (!este.loteId) este.loteId = ultimoLoteDesde(este.inicio);
      emitir();
    });
    hijo.on('exit', () => { if (este.estado === 'corriendo') este.estado = este.parado ? 'parado' : 'error'; este.loteId ??= ultimoLoteDesde(este.inicio); emitir(); });
  }
  const ultimoLoteDesde = (ms) => listarLotes().find((l) => Date.parse(l.fecha) >= ms - 2000)?.id ?? null;

  async function api(req, res, url) {
    const m = req.method; const r = url.pathname;
    let x;
    if (m === 'GET' && r === '/api/config') {
      const keys = leerKeys(archivoKeys);
      return json(res, 200, {
        config: leerConfig(archivoConfig), casos: idsCasos, intenciones: idsIntenciones, narrador: versionNarrador,
        keys: keys ? { groq: (keys.groq ?? []).map((k) => ({ nombre: k.nombre, key: enmascarar(k.key) })), anthropic: { key: enmascarar(keys.anthropic?.key) } } : null,
        ultimoRunsPorSeg: listarLotes().find((l) => l.runsPorSeg)?.runsPorSeg ?? null,
      });
    }
    if (m === 'GET' && r === '/api/ajustes') {
      const config = leerConfig(archivoConfig);
      const keys = leerKeysGroq({ env, archivo: archivoKeys });
      const pool = crearPool({ keys, limiteDiarioPorKey: config.groq?.limiteDiarioPorKey ?? 250, archivoUso: path.join(dirSim, 'uso-keys.json') });
      return json(res, 200, { keys: pool.resumen(), modelo: config.modelos?.groq ?? null, limiteDiarioPorKey: config.groq?.limiteDiarioPorKey ?? 250, mezcla: config.mezcla ?? null });
    }
    if (m === 'POST' && r === '/api/lote/estimar') {
      const cli = cliLote(await cuerpo(req));
      try { return json(res, 200, estimarLote(cli, { config: leerConfig(archivoConfig), env, archivoKeys })); } catch (e) { throw new ErrorHttp(400, e.message); }
    }
    if (m === 'GET' && r === '/api/perfiles') return json(res, 200, perfilesCrudos());
    if (m === 'POST' && (x = r.match(/^\/api\/perfiles\/([^/]+)$/))) {
      const id = decodeURIComponent(x[1]);
      const p = await cuerpo(req);
      if (p.id !== id) throw new ErrorHttp(400, `el id del cuerpo ("${p.id}") no coincide con la ruta ("${id}")`);
      try { validarPerfil(p, `${id}.json`); } catch (e) { throw new ErrorHttp(400, e.message); }
      const archivo = path.join(dirPerfiles, `${id}.json`);
      const nuevo = !fs.existsSync(archivo);
      fs.writeFileSync(archivo, `${JSON.stringify(p, null, 2)}\n`);
      return json(res, nuevo ? 201 : 200, { ok: true, id, nuevo });
    }
    if (m === 'POST' && r === '/api/lote') return json(res, 202, lanzar(await cuerpo(req)));
    if (m === 'POST' && r === '/api/lote/parar') {
      if (!lote || lote.estado !== 'corriendo') throw new ErrorHttp(409, 'no hay un lote corriendo');
      lote.parado = true; lote.hijo.kill();
      return json(res, 200, { ok: true });
    }
    if (m === 'GET' && r === '/api/lote/eventos') {
      res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify(progreso())}\n\n`);
      clientes.add(res);
      req.on('close', () => clientes.delete(res));
      return;
    }
    if (m === 'GET' && r === '/api/lotes') return json(res, 200, listarLotes().filter((l) => l.tipo === 'lote'));
    if (m === 'POST' && r === '/api/corpus/estimar') {
      const { cli } = cliCorpus(await cuerpo(req));
      const r2 = await ejecutarCorpus({ ...cli, estimar: true }, { config: leerConfig(archivoConfig) });
      const keys = leerKeysGroq({ env, archivo: archivoKeys });
      return json(res, 200, { ...r2.estimacion, keys: keys.map((k) => ({ nombre: k.nombre, key: ultimos4(k.key) })), modelo: leerConfig(archivoConfig).modelos?.groq ?? null });
    }
    if (m === 'POST' && r === '/api/corpus') return json(res, 202, lanzarCorpus(await cuerpo(req)));
    if (m === 'GET' && r === '/api/corpus') {
      return json(res, 200, listarLotes().filter((l) => l.tipo === 'corpus').map((l) => {
        const f = path.join(dirSim, l.id, 'corpus.json');
        const s = fs.existsSync(f) ? leer(f) : null;
        return { ...l, resumen: s && { modelo: s.modelo, estados: s.estados, llamadas: s.llamadas, tokens: s.tokens, pctValidas: s.pctValidas, pctNoEntendidas: s.pctNoEntendidas, gruposCandidatos: s.gruposCandidatos, corte: s.corte } };
      }));
    }
    if (m === 'GET' && (x = r.match(/^\/api\/corpus\/([^/]+)\/agrupadas$/))) {
      const f = path.join(dirLote(x[1]), 'candidatos', 'frases-agrupadas.json');
      if (!fs.existsSync(f)) throw new ErrorHttp(404, 'el corpus no tiene frases agrupadas');
      return json(res, 200, leer(f));
    }
    if (m === 'GET' && (x = r.match(/^\/api\/lotes\/([^/]+)\/informe$/))) {
      const d = dirLote(x[1]);
      if (!fs.existsSync(path.join(d, 'informe.json'))) throw new ErrorHttp(404, 'el lote todavía no tiene informe');
      return json(res, 200, { config: leer(path.join(d, 'config.json')), informe: leer(path.join(d, 'informe.json')) });
    }
    if (m === 'GET' && (x = r.match(/^\/api\/lotes\/([^/]+)\/runs$/))) {
      const d = dirLote(x[1]);
      const f = path.join(d, 'runs.jsonl');
      return json(res, 200, fs.existsSync(f) ? leerJsonl(f) : []);
    }
    if (m === 'GET' && (x = r.match(/^\/api\/lotes\/([^/]+)\/replay\/([\w-]+)$/))) {
      const d = dirLote(x[1]);
      const run = leerJsonl(path.join(d, 'runs.jsonl')).find((y) => y.runId === x[2]);
      if (!run) throw new ErrorHttp(404, `run inexistente: ${x[2]}`);
      const turnos = leerJsonl(path.join(d, 'turnos.jsonl'));
      const cfg = leer(path.join(d, 'config.json'));
      const visor = visorRun(run, turnos, cfg.parametros?.trabada ?? cfg.trabada ?? 15);
      const rep = url.searchParams.get('verificar') === '1' && run.turnos > 0 ? await replayRun(run, turnos) : null;
      return json(res, 200, { ...visor, replay: rep && { divergencias: rep.divergencias, primera: rep.primera, mismaVersion: !cfg.narrador || cfg.narrador.commit === versionNarrador.commit } });
    }
    if (m === 'GET' && r === '/api/candidatos/fuentes') {
      return json(res, 200, listarFuentes({ dirSim, dirDocs }).map((f) => ({ id: f.id, porEstado: contarPorEstado(leerCandidatos({ ids: [f.id], dirSim, dirDocs })) })));
    }
    if (m === 'GET' && r === '/api/candidatos') {
      const ids = url.searchParams.get('fuentes')?.split(',').filter(Boolean) ?? null;
      return json(res, 200, leerCandidatos({ ids, dirSim, dirDocs }));
    }
    if (m === 'POST' && r === '/api/candidatos/accion') {
      const b = await cuerpo(req);
      if (!Array.isArray(b.refs) || !b.refs.length) throw new ErrorHttp(400, 'faltan candidatos');
      try { return json(res, 200, aplicarAccion(b.refs, b.accion, { texto: b.texto ?? null, intencion: b.intencion ?? null, dirSim, dirDocs })); } catch (e) { throw new ErrorHttp(400, e.message); }
    }
    if (m === 'POST' && r === '/api/exportar') {
      const b = await cuerpo(req);
      const fuentes = Array.isArray(b.fuentes) && b.fuentes.length ? b.fuentes : null;
      const { dir, archivos, resumen } = exportar({ fuentes, dirExportaciones, dirSim, dirDocs });
      return json(res, 200, { dir: path.relative(RAIZ, dir), archivos, resumen });
    }
    if (m === 'GET' && r === '/api/dorada') return json(res, 200, listarDoradas(dirDorada));
    if (m === 'POST' && r === '/api/dorada') {
      if (lote && lote.estado === 'corriendo') throw new ErrorHttp(409, 'hay un lote corriendo');
      const { resumen } = await correrDorada({ dirSalida: dirDorada });
      return json(res, 200, { version: resumen.version, segundos: resumen.segundos, runs: resumen.runs.length });
    }
    if (m === 'GET' && r === '/api/dorada/comparar') {
      const a = url.searchParams.get('a'); const b = url.searchParams.get('b');
      if (!/^[\w.-]+$/.test(a ?? '') || !/^[\w.-]+$/.test(b ?? '')) throw new ErrorHttp(400, 'versiones inválidas');
      try { return json(res, 200, comparar(leerResumen(a, dirDorada), leerResumen(b, dirDorada))); } catch (e) { throw new ErrorHttp(404, e.message); }
    }
    throw new ErrorHttp(404, `ruta inexistente: ${m} ${r}`);
  }

  function estatico(res, r) {
    const f = path.normalize(path.join(DIR_UI, r === '/' ? 'index.html' : r));
    if (!f.startsWith(DIR_UI) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'content-type': TIPOS[path.extname(f)] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(f));
  }

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    try {
      if (url.pathname.startsWith('/api/')) await api(req, res, url);
      else estatico(res, decodeURIComponent(url.pathname));
    } catch (e) {
      json(res, e.estado ?? 500, { error: e.estado ? e.message : `error interno: ${e.message}` });
    }
  });
  servidor.on('close', () => { for (const c of clientes) c.end(); if (lote?.estado === 'corriendo') lote.hijo.kill(); });
  return servidor;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.env.PUERTO ?? 4173);
  crearServidor().listen(puerto, '127.0.0.1', () => console.log(`Simulador de Avaloria en http://localhost:${puerto} (solo 127.0.0.1)`));
}
