import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { leerConfig, resolverParametros } from '../lote.js';
import { cargarPerfiles, validarPerfil, DIR_PERFILES } from '../perfiles.js';
import { leerJsonl } from '../registro.js';
import { idsCasos, versionNarrador } from '../adaptador.js';

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

export function crearServidor({ dirSim = path.join(RAIZ, 'simulaciones'), dirPerfiles = DIR_PERFILES, archivoKeys = path.join(RAIZ, 'config', 'keys.json'), archivoConfig = path.join(RAIZ, 'config', 'config.json') } = {}) {
  let lote = null; // { hijo, loteId, total, hechos, cierres, inicio, estado, mensaje }
  const clientes = new Set();

  const progreso = () => {
    if (!lote) return { estado: 'inactivo' };
    const seg = (Date.now() - lote.inicio) / 1000;
    const rps = seg > 0 ? lote.hechos / seg : 0;
    return {
      estado: lote.estado, loteId: lote.loteId, hechos: lote.hechos, total: lote.total, cierres: lote.cierres,
      runsPorSeg: Number(rps.toFixed(2)), etaSeg: rps > 0 ? Math.round((lote.total - lote.hechos) / rps) : null, mensaje: lote.mensaje ?? null,
    };
  };
  const emitir = () => { const d = `data: ${JSON.stringify(progreso())}\n\n`; for (const c of clientes) c.write(d); };

  const limpiar = (texto) => { for (const s of secretos(leerKeys(archivoKeys))) texto = texto.split(s).join(enmascarar(s)); return texto; };
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
        id, fecha: c.fecha, runs: c.parametros?.runs ?? null, versionSimulador: c.version, versionNarrador: c.narrador?.version ?? null,
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
    const cli = {};
    if (body.perfiles !== undefined) {
      if (!Array.isArray(body.perfiles)) throw new ErrorHttp(400, 'perfiles tiene que ser una lista de {id, agentes}');
      const activos = body.perfiles.filter((x) => Number(x?.agentes) > 0);
      if (!activos.length) throw new ErrorHttp(400, 'elegí al menos un perfil con agentes > 0');
      cli.perfiles = activos.map((x) => `${x.id}:${x.agentes}`).join(',');
    }
    for (const k of ['trabada', 'maxTurnos', 'seedBase']) if (body[k] !== undefined) cli[k] = String(body[k]);
    if (body.casos !== undefined) cli.casos = Array.isArray(body.casos) ? body.casos.join(',') : String(body.casos);
    if (body.mezcla !== undefined) cli.mezcla = body.mezcla;
    cli.salida = dirSim;
    let p;
    try { p = resolverParametros(cli, leerConfig(archivoConfig), cargarPerfiles(dirPerfiles)); } catch (e) { throw new ErrorHttp(400, e.message); }
    const hijo = fork(path.join(path.dirname(fileURLToPath(import.meta.url)), 'hijo.js'), [JSON.stringify(cli)], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    lote = { hijo, loteId: null, total: p.runs, hechos: 0, cierres: {}, inicio: Date.now(), estado: 'corriendo' };
    const este = lote;
    hijo.on('message', (m) => {
      if (m.tipo === 'run') { este.hechos = m.n; este.cierres[m.cierre] = (este.cierres[m.cierre] ?? 0) + 1; }
      else if (m.tipo === 'fin') { este.estado = 'terminado'; este.loteId = m.loteId; }
      else if (m.tipo === 'error') { este.estado = 'error'; este.mensaje = m.mensaje; }
      if (!este.loteId) este.loteId = ultimoLoteDesde(este.inicio);
      emitir();
    });
    hijo.on('exit', () => { if (este.estado === 'corriendo') este.estado = este.parado ? 'parado' : 'error'; este.loteId ??= ultimoLoteDesde(este.inicio); emitir(); });
    return { runs: p.runs, perfiles: p.perfiles, casos: p.casos };
  }
  const ultimoLoteDesde = (ms) => listarLotes().find((l) => Date.parse(l.fecha) >= ms - 2000)?.id ?? null;

  async function api(req, res, url) {
    const m = req.method; const r = url.pathname;
    let x;
    if (m === 'GET' && r === '/api/config') {
      const keys = leerKeys(archivoKeys);
      return json(res, 200, {
        config: leerConfig(archivoConfig), casos: idsCasos, narrador: versionNarrador,
        keys: keys ? { groq: (keys.groq ?? []).map((k) => ({ nombre: k.nombre, key: enmascarar(k.key) })), anthropic: { key: enmascarar(keys.anthropic?.key) } } : null,
        ultimoRunsPorSeg: listarLotes().find((l) => l.runsPorSeg)?.runsPorSeg ?? null,
      });
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
    if (m === 'GET' && r === '/api/lotes') return json(res, 200, listarLotes());
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
