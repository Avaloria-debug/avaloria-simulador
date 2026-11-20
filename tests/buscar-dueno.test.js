import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPoliticaPerfil, siguientePaso } from '../src/politicas.js';
import { cargarPerfiles } from '../src/perfiles.js';
import { escenas, palabrasClaveDel1, crearPartida, npcsDef } from '../src/adaptador.js';
import { conAzarDeterminista, mulberry32 } from '../src/rng.js';

const MERCADO = 'escena_mercado_circular';
const NORTE = 'escena_camino_norte';
// La pista nombra a Hollis en el Camino del sur, pero en este turno Hollis está en el Camino del norte.
const PISTA = 'Le das una mano a Serel Norlen y te lo agradece.\n\nAlguien comenta al pasar que Hollis Dren anda por Camino del sur. Tal vez valga la pena ir hasta allá.';
const detalle = (escena, npcs, extra = {}) => ({
  escena, npcs, objetos: [], destinos: escenas.get(escena).salidas,
  pistas: [], escenasPendientes: [], tagsCaso: [], posicionesNpcs: { hollis_pastor: NORTE, serel_panadero: MERCADO }, ...extra,
});
const SEREL = { id: 'serel_panadero', nombre: 'Serel Norlen' };
const HOLLIS = { id: 'hollis_pastor', nombre: 'Hollis Dren' };
const sim = (d) => ({ detalle: () => d });
const perfil = () => cargarPerfiles().get('seguidor_pistas_dueno');
const conPista = () => {
  const pol = crearPoliticaPerfil(perfil());
  pol.observar({ tipo: 'boton', intencion: 'intencion_ayudar', verbo: 'ayudar' }, { resultado: 'ejecuta', texto: PISTA });
  return pol;
};

test('adaptador: posición de cada NPC en el turno y palabras clave del _1, solo lectura', async () => {
  assert.deepEqual(palabrasClaveDel1('serel_panadero'), npcsDef.get('serel_panadero').conocimientos[0].palabrasClave);
  assert.deepEqual(palabrasClaveDel1('nadie'), []);
  await conAzarDeterminista(3, async () => {
    const s = await crearPartida({ seed: 3, casoId: 'caso_01', partidaId: 'test-posiciones' });
    const d = s.detalle();
    assert.equal(typeof d.posicionesNpcs, 'object');
    for (const n of d.npcs) assert.equal(d.posicionesNpcs[n.id], d.escena, n.id);
    d.posicionesNpcs.serel_panadero = 'otra';
    assert.notEqual(s.detalle().posicionesNpcs.serel_panadero, 'otra');
  });
});

test('con pista hacia un NPC en otra escena, el siguiente viaje va hacia donde está ese NPC ahora', () => {
  const paso = siguientePaso(MERCADO, [NORTE]);
  assert.equal(paso, NORTE);
  const pol = conPista();
  const rng = mulberry32(7);
  let viajes = 0;
  for (let turno = 1; turno <= 40; turno++) {
    const e = pol.elegir(sim(detalle(MERCADO, [SEREL])), rng, { turno });
    if (e.verbo !== 'viajar') continue;
    viajes += 1;
    if (e.tipo === 'boton') assert.equal(e.parametros.destino, paso);
    else assert.match(e.texto, new RegExp(escenas.get(paso).nombre));
  }
  assert.ok(viajes > 0);
});

test('ya en la escena del NPC, la acción es una consulta por texto con una palabra clave de su _1; después sigue como seguir_pistas', () => {
  const pol = conPista();
  const rng = mulberry32(5);
  const kws = palabrasClaveDel1('hollis_pastor');
  const e = pol.elegir(sim(detalle(NORTE, [HOLLIS, SEREL])), rng, { turno: 1 });
  assert.equal(e.tipo, 'texto');
  assert.equal(e.intencion, 'consulta_tema');
  assert.equal(e.npcId, 'hollis_pastor');
  assert.ok(kws.some((k) => e.texto.includes(k)), e.texto);
  assert.match(e.texto, /Hollis Dren/);
  pol.observar(e, { resultado: 'negativa_relacion', texto: 'Hollis Dren no te cuenta nada nuevo por ahora.' });
  const despues = Array.from({ length: 20 }, (_, i) => pol.elegir(sim(detalle(NORTE, [HOLLIS, SEREL])), rng, { turno: i + 2 }));
  assert.ok(despues.some((x) => x.intencion !== 'consulta_tema'), 'deja de forzar la consulta');
});

test('sin pista no cambia nada respecto de seguidor_pistas', () => {
  const jugar = (p) => { const pol = crearPoliticaPerfil(p); const rng = mulberry32(11); return Array.from({ length: 60 }, (_, i) => pol.elegir(sim(detalle(MERCADO, [SEREL])), rng, { turno: i + 1 })); };
  assert.deepEqual(jugar(perfil()), jugar(cargarPerfiles().get('seguidor_pistas')));
});
