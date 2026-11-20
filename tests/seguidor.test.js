import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPoliticaPerfil, siguientePaso, pesosDelTurno } from '../src/politicas.js';
import { cargarPerfiles, validarPerfil } from '../src/perfiles.js';
import { escenas, leerPistaCamino } from '../src/adaptador.js';
import { mulberry32 } from '../src/rng.js';

const MERCADO = 'escena_mercado_circular';
const PISTA = 'Le das una mano a Serel Norlen y te lo agradece.\n\nAlguien comenta al pasar que Hollis Dren anda por Camino del sur. Tal vez valga la pena ir hasta allá.';
const detalle = (escena = MERCADO, extra = {}) => ({
  escena,
  npcs: escena === MERCADO ? [{ id: 'serel_panadero', nombre: 'Serel Norlen' }] : [{ id: 'hollis_pastor', nombre: 'Hollis Dren' }],
  objetos: [],
  destinos: escenas.get(escena).salidas,
  pistas: [], escenasPendientes: [], tagsCaso: [],
  ...extra,
});
const sim = (d) => ({ detalle: () => d });
const perfil = () => cargarPerfiles().get('seguidor_pistas');

test('seguidor_pistas carga y valida', () => {
  const p = perfil();
  assert.deepEqual(p.pesos, { viajar: 30, consulta_tema: 25, hablar_con: 20, ayudar: 15, examinar: 10 });
  assert.deepEqual(p.objetivo, { tipo: 'seguir_pistas', sesgo: 3, fuente: 'narracion' });
  assert.equal(p.entrada.pBoton, 0.2);
  assert.equal(p.ruido.typos, 0.02);
  assert.equal(p.ruido.nombraNpc, 0.8);
  assert.equal(p.paciencia, 12);
  assert.throws(() => validarPerfil({ ...p, objetivo: { tipo: 'agotar_conocimientos', fuente: 'narracion' } }), /objetivo.fuente/);
});

test('lee la pista de camino del texto narrado', () => {
  assert.deepEqual(leerPistaCamino(PISTA), { npcId: 'hollis_pastor', escena: 'escena_camino_sur' });
  assert.deepEqual(leerPistaCamino('Según dicen por acá, Brenn Holt suele estar en Plaza de los Cambistas. Puede que sepa algo de lo que buscás.'), { npcId: 'brenn_arriero', escena: 'escena_plaza_cambistas' });
  assert.equal(leerPistaCamino('Le das una mano a Serel Norlen y te lo agradece.'), null);
  assert.equal(leerPistaCamino('Alguien comenta al pasar que Nadie anda por Ningún lado. Tal vez valga la pena ir hasta allá.'), null);
});

test('con una pista de camino en el texto, el siguiente viaje va hacia la escena nombrada', () => {
  const paso = siguientePaso(MERCADO, ['escena_camino_sur']);
  assert.ok(paso, 'hay camino desde el Mercado');
  const pol = crearPoliticaPerfil(perfil());
  pol.observar({ tipo: 'boton', intencion: 'intencion_ayudar', verbo: 'ayudar' }, { resultado: 'ejecuta', texto: PISTA });
  const rng = mulberry32(7);
  let viajes = 0;
  for (let turno = 1; turno <= 40; turno++) {
    const e = pol.elegir(sim(detalle()), rng, { turno });
    if (e.verbo !== 'viajar') continue;
    viajes += 1;
    if (e.tipo === 'boton') assert.equal(e.parametros.destino, paso);
    else assert.match(e.texto, new RegExp(escenas.get(paso).nombre));
  }
  assert.ok(viajes > 0, 'viajó al menos una vez');
});

test('sin pista en la narración no apunta a ningún destino, aunque el estado tenga pistas', () => {
  const pol = crearPoliticaPerfil(perfil());
  const conEstado = detalle(MERCADO, { pistas: [{ conocimientoId: 'conocimiento_sendero_sin_vigilancia', npcId: 'hollis_pastor', escena: 'escena_camino_sur', revelado: false }], escenasPendientes: ['escena_camino_sur'] });
  const mem = { visitadas: new Set(), preguntadas: new Set(), aprendidas: new Set(), ultimas: [], ultimoFallo: null, pistaCamino: null };
  const { pref, pesos } = pesosDelTurno(perfil(), conEstado, mem);
  assert.equal(pref.destino, null);
  assert.equal(pesos.viajar, 30);
  // Con una pista leída: sesgo al viaje hacia ella.
  pol.observar({ tipo: 'boton', intencion: 'intencion_ayudar', verbo: 'ayudar' }, { resultado: 'ejecuta', texto: 'Nada nuevo.' });
  const con = pesosDelTurno(perfil(), conEstado, { ...mem, pistaCamino: leerPistaCamino(PISTA) });
  assert.equal(con.pesos.viajar, 90);
  assert.deepEqual(con.pref.destino, [siguientePaso(MERCADO, ['escena_camino_sur'])]);
});

test('en la escena de la pista busca al NPC: consulta, habla o ayuda con él', () => {
  const mem = { visitadas: new Set(), preguntadas: new Set(), aprendidas: new Set(), ultimas: [], ultimoFallo: null, pistaCamino: leerPistaCamino(PISTA) };
  const { pesos, pref } = pesosDelTurno(perfil(), detalle('escena_camino_sur'), mem);
  assert.equal(pref.npcId, 'hollis_pastor');
  assert.equal(pesos.hablar_con, 60);
  assert.equal(pesos.ayudar, 45);
  assert.equal(pref.destino, null);
});
