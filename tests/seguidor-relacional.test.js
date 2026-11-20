import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPoliticaPerfil, siguientePaso, pesosDelTurno } from '../src/politicas.js';
import { cargarPerfiles, validarPerfil } from '../src/perfiles.js';
import { escenas, leerPistaCamino } from '../src/adaptador.js';
import { mulberry32 } from '../src/rng.js';

const MERCADO = 'escena_mercado_circular';
const SUR = 'escena_camino_sur';
const PISTA = 'Le das una mano a Serel Norlen y te lo agradece.\n\nAlguien comenta al pasar que Hollis Dren anda por Camino del sur. Tal vez valga la pena ir hasta allá.';
const detalle = (escena = MERCADO, extra = {}) => ({
  escena,
  npcs: escena === MERCADO ? [{ id: 'serel_panadero', nombre: 'Serel Norlen' }] : [{ id: 'hollis_pastor', nombre: 'Hollis Dren' }],
  objetos: [], destinos: escenas.get(escena).salidas, pistas: [], escenasPendientes: [], tagsCaso: [], ...extra,
});
const sim = (d) => ({ detalle: () => d });
const perfil = () => cargarPerfiles().get('seguidor_relacional');
const memoria = (extra = {}) => ({ visitadas: new Set(), preguntadas: new Set(), aprendidas: new Set(), ultimas: [], ultimoFallo: null, pistaCamino: null, favores: new Map(), ...extra });

test('seguidor_relacional carga y valida', () => {
  const p = perfil();
  assert.deepEqual(p.pesos, { viajar: 25, ayudar: 20, calmar_la_situacion: 15, consulta_tema: 20, hablar_con: 15, examinar: 5 });
  assert.deepEqual(p.objetivo, { tipo: 'seguir_pistas', sesgo: 3, fuente: 'narracion', alLlegar: 'relacion', favoresAntes: 2 });
  assert.ok(cargarPerfiles().has('seguidor_pistas'));
  assert.throws(() => validarPerfil({ ...p, objetivo: { tipo: 'seguir_pistas', alLlegar: 'relacion' } }), /objetivo.alLlegar/);
  assert.throws(() => validarPerfil({ ...p, objetivo: { ...p.objetivo, alLlegar: 'otra' } }), /objetivo.alLlegar/);
});

test('con pista en el texto viaja a la escena nombrada', () => {
  const paso = siguientePaso(MERCADO, [SUR]);
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
  assert.ok(viajes > 0);
});

test('sin pista en el texto no viaja a ninguna escena de pista, aunque el estado tenga pistas', () => {
  const conEstado = detalle(MERCADO, { pistas: [{ conocimientoId: 'conocimiento_sendero_sin_vigilancia', npcId: 'hollis_pastor', escena: SUR, revelado: false }], escenasPendientes: [SUR] });
  const { pesos, pref } = pesosDelTurno(perfil(), conEstado, memoria());
  assert.equal(pref.destino, null);
  assert.equal(pesos.viajar, 25);
  const jugar = (d) => { const pol = crearPoliticaPerfil(perfil()); const rng = mulberry32(11); return Array.from({ length: 60 }, (_, i) => pol.elegir(sim(d), rng, { turno: i + 1 })); };
  assert.deepEqual(jugar(conEstado), jugar(detalle()));
});

test('al llegar ayuda y calma antes de consultar; después de 2 favores consulta el tema', () => {
  const pista = leerPistaCamino(PISTA);
  const antes = pesosDelTurno(perfil(), detalle(SUR), memoria({ pistaCamino: pista }));
  assert.equal(antes.pesos.consulta_tema, undefined);
  assert.equal(antes.pesos.ayudar, 60);
  assert.equal(antes.pesos.calmar_la_situacion, 45);
  assert.equal(antes.pref.npcId, 'hollis_pastor');
  const despues = pesosDelTurno(perfil(), detalle(SUR), memoria({ pistaCamino: pista, favores: new Map([['hollis_pastor', 2]]) }));
  assert.equal(despues.pesos.consulta_tema, 60);
  assert.ok(despues.pref.temas.length > 0);
  // observar cuenta los favores hechos al NPC de la pista.
  const pol = crearPoliticaPerfil(perfil());
  pol.observar({ tipo: 'texto', verbo: 'ayudar' }, { resultado: 'ejecuta', texto: PISTA });
  const rng = mulberry32(3);
  const primeras = Array.from({ length: 30 }, (_, i) => pol.elegir(sim(detalle(SUR)), rng, { turno: i + 1 }));
  assert.ok(primeras.every((e) => e.intencion !== 'consulta_tema'), 'sin favores no consulta');
  for (let i = 0; i < 3; i++) pol.observar({ tipo: 'texto', verbo: 'observar' }, { resultado: 'ejecuta', texto: 'nada' });
  pol.observar({ tipo: 'boton', verbo: 'ayudar', parametros: { npcId: 'hollis_pastor' } }, { resultado: 'ejecuta', texto: 'ok' });
  pol.observar({ tipo: 'boton', verbo: 'calmar_la_situacion', parametros: { npcId: 'hollis_pastor' } }, { resultado: 'ejecuta', texto: 'ok' });
  const consultas = Array.from({ length: 30 }, (_, i) => pol.elegir(sim(detalle(SUR)), rng, { turno: i + 1 })).filter((e) => e.intencion === 'consulta_tema');
  assert.ok(consultas.length > 0, 'consulta después de los favores');
});
