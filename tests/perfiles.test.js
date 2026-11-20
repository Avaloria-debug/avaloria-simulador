import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validarPerfil, cargarPerfiles } from '../src/perfiles.js';
import { elegirPonderado, pesosDelTurno, aplicarRuido, siguientePaso, crearPoliticaPerfil } from '../src/politicas.js';
import { mulberry32 } from '../src/rng.js';
import { ejecutarLote, resolverParametros } from '../src/lote.js';
import { leerJsonl } from '../src/registro.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'sim-f2-'));
// Modo código: estos tests no usan IA (desde F5 la mezcla por defecto es 40/60).
const lote = (cli, opciones = {}) => ejecutarLote({ salida: tmp(), ...cli }, { config: { mezcla: { codigo: 100, ia: 0 } }, ...opciones });
const base = () => JSON.parse(fs.readFileSync(new URL('../config/perfiles/curioso.json', import.meta.url), 'utf8'));

test('carga los 13 perfiles', () => {
  const p = cargarPerfiles();
  // Contiene al menos los 13 de F2; se pueden agregar perfiles (decisión de Tomás, 2026-11-20).
  for (const id of ['curioso', 'aventurero', 'investigador', 'comerciante', 'amable', 'agresivo', 'sigiloso', 'pasivo', 'directo', 'torpe', 'adversarial', 'primerizo', 'aleatorio']) assert.ok(p.has(id), id);
});

test('el validador rechaza cada caso inválido con archivo y campo', () => {
  const casos = [
    [(p) => { p.pesos.hablar_con = -1; }, /x\.json, campo pesos\.hablar_con/],
    [(p) => { p.pesos.volar = 3; }, /campo pesos\.volar/],
    [(p) => { p.entrada.pBoton = 1.5; }, /campo entrada\.pBoton/],
    [(p) => { p.entrada.pGenerico = -0.1; }, /campo entrada\.pGenerico/],
    [(p) => { p.ruido.typos = 2; }, /campo ruido\.typos/],
    [(p) => { p.ruido.nombraNpc = -1; }, /campo ruido\.nombraNpc/],
    [(p) => { p.repiteSiFalla = 3; }, /campo repiteSiFalla/],
    [(p) => { p.ia.p = 9; }, /campo ia\.p/],
    [(p) => { p.objetivo.tipo = 'ganar'; }, /campo objetivo\.tipo/],
    [(p) => { p.paciencia = 0; }, /campo paciencia/],
    [(p) => { p.evolucion = { cadaTurnos: 10, pBoton: -0.1, minPBoton: 2 }; }, /campo evolucion\.minPBoton/],
    [(p) => { p.pesos = { hablar_con: 0 }; }, /campo pesos/],
  ];
  for (const [romper, error] of casos) {
    const p = base();
    romper(p);
    assert.throws(() => validarPerfil(p, 'x.json'), error);
  }
  assert.doesNotThrow(() => validarPerfil(base(), 'x.json'));
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'malo.json'), '{ no es json');
  assert.throws(() => cargarPerfiles(dir), /malo\.json/);
});

test('distribución de acciones ≈ pesos (2000 muestras, ±5 puntos)', () => {
  const pesos = { consulta_tema: 40, hablar_con: 25, examinar: 10, observar: 10, leer: 8, explorar: 4, viajar: 3 };
  const rng = mulberry32(42);
  const n = 2000;
  const c = {};
  for (let i = 0; i < n; i++) { const k = elegirPonderado(pesos, rng); c[k] = (c[k] ?? 0) + 1; }
  for (const [k, w] of Object.entries(pesos)) assert.ok(Math.abs((100 * (c[k] ?? 0)) / n - w) <= 5, `${k}: ${c[k]}`);
});

test('solo cuentan las acciones disponibles en el estado', () => {
  const perfil = validarPerfil({ ...base(), objetivo: { tipo: 'ninguno' } });
  const d = { escena: 'x', destinos: [], npcs: [], objetos: [], revelados: [], tagsCaso: [], pistas: [], escenasPendientes: [] };
  const { pesos } = pesosDelTurno(perfil, d, { visitadas: new Set(), preguntadas: new Set(), aprendidas: new Set() });
  assert.equal(pesos.consulta_tema, undefined);
  assert.equal(pesos.hablar_con, undefined);
  assert.equal(pesos.viajar, undefined);
  assert.equal(pesos.examinar, 10);
});

test('ruido: typos, mayúsculas e incompletas', () => {
  const rng = mulberry32(1);
  assert.equal(aplicarRuido('hablar con serel', { typos: 0, mayusculas: 1, incompletas: 0 }, rng), 'HABLAR CON SEREL');
  assert.notEqual(aplicarRuido('hablar con serel', { typos: 1, mayusculas: 0, incompletas: 0 }, rng), 'hablar con serel');
  assert.ok(aplicarRuido('hablar con serel ahora', { typos: 0, mayusculas: 0, incompletas: 1 }, rng).length < 'hablar con serel ahora'.length);
});

test('siguientePaso va hacia la escena meta por las salidas', () => {
  assert.equal(siguientePaso('escena_mercado_circular', ['escena_mercado_circular']), null);
  const paso = siguientePaso('escena_mercado_circular', ['escena_lago_espejos']);
  assert.equal(typeof paso, 'string');
});

test('política sin repetir la misma acción exacta más de 2 veces seguidas', () => {
  const perfil = validarPerfil({ ...base(), pesos: { observar: 1, explorar: 1 }, repiteSiFalla: 0, entrada: { pBoton: 1 } });
  const pol = crearPoliticaPerfil(perfil);
  const sim = { detalle: () => ({ escena: 'x', destinos: [], npcs: [], objetos: [], revelados: [], tagsCaso: [], pistas: [], escenasPendientes: [] }) };
  const rng = mulberry32(3);
  const claves = [];
  for (let t = 1; t <= 300; t++) {
    const e = pol.elegir(sim, rng, { turno: t });
    pol.observar(e, { resultado: 'ejecuta', texto: '' });
    claves.push(e.intencion);
  }
  for (let i = 2; i < claves.length; i++) assert.ok(!(claves[i] === claves[i - 1] && claves[i] === claves[i - 2]), `turno ${i}`);
});

test('mismo seed ⇒ mismos turnos con perfiles', async () => {
  const cli = { perfiles: 'curioso:2,torpe:2,primerizo:2', maxTurnos: '30' };
  const a = await lote(cli);
  const b = await lote(cli);
  assert.equal(fs.readFileSync(path.join(a.dir, 'turnos.jsonl'), 'utf8'), fs.readFileSync(path.join(b.dir, 'turnos.jsonl'), 'utf8'));
  const runs = leerJsonl(path.join(a.dir, 'runs.jsonl'));
  assert.deepEqual(runs.map((r) => r.perfil), ['curioso', 'curioso', 'torpe', 'torpe', 'primerizo', 'primerizo']);
});

test('adversarial: 100 runs sin excepciones del simulador', async () => {
  const r = await lote({ perfiles: 'adversarial:100', maxTurnos: '40' });
  const runs = leerJsonl(path.join(r.dir, 'runs.jsonl'));
  assert.equal(runs.length, 100);
  assert.deepEqual(runs.filter((x) => x.cierre === 'excepcion' && x.origenError !== 'narrador').map((x) => x.error), []);
  assert.ok(Array.isArray(r.informe.fallasGraves));
});

test('paciencia: cierre por abandono', async () => {
  const politica = () => ({ tipo: 'texto', texto: 'qwerty zzz' });
  const r = await lote({ perfiles: 'primerizo:1', maxTurnos: '50' }, { politica });
  const [run] = leerJsonl(path.join(r.dir, 'runs.jsonl'));
  assert.equal(run.cierre, 'abandono');
  assert.equal(run.turnos, 7);
});

test('--perfiles y --runs incoherentes dan error; sin flags es aleatorio', () => {
  assert.throws(() => resolverParametros({ perfiles: 'curioso:20,aventurero:30', runs: '10' }), /no coincide/);
  assert.equal(resolverParametros({ perfiles: 'curioso:20,aventurero:30', runs: '50' }).runs, 50);
  assert.throws(() => resolverParametros({ perfiles: 'nadie:3' }), /inexistente/);
  assert.throws(() => resolverParametros({ perfiles: 'curioso:0' }), /entero > 0/);
  assert.throws(() => resolverParametros({ perfiles: 'curioso' }), /entero > 0/);
  assert.deepEqual(resolverParametros({}).perfiles, [{ id: 'aleatorio', agentes: 20 }]);
});

test('el informe contiene todas las secciones', async () => {
  const r = await lote({ perfiles: 'investigador:2,amable:2', maxTurnos: '30' });
  const md = fs.readFileSync(path.join(r.dir, 'informe.md'), 'utf8');
  for (const s of ['## Runs por perfil', '## Runs por cierre', '## Turnos', '## Hitos y desenlaces por caso', '## Resultados del motor', '## Top 20 frases', '## Motivos de decidir()', '## IA por run', '## Fallas graves', '## Por perfil', '## Trabadas', '## Repeticiones', '## Similitud', '## Tags', '## Cobertura', '## Básico: perfil amable', '## Básico: perfil investigador']) assert.ok(md.includes(s), s);
  const j = JSON.parse(fs.readFileSync(path.join(r.dir, 'informe.json'), 'utf8'));
  for (const k of ['porCierre', 'resultadosMotor', 'trabadas', 'estadosSinAccion', 'repeticiones', 'similitud', 'tags', 'cobertura', 'porPerfil', 'basicoPorPerfil', 'fallasGraves']) assert.ok(k in j, k);
  for (const k of ['nuncaEscritos', 'escritosNuncaDecaidos', 'gravesSinReparacion', 'frecuencia']) assert.ok(k in j.tags, k);
  for (const k of ['conocimientos_1', 'conocimientos_2', 'hitosNuncaDisparados', 'escenasNuncaVisitadas', 'casoPorDesenlace']) assert.ok(k in j.cobertura, k);
});
