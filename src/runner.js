import { conAzarDeterminista, mulberry32 } from './rng.js';
import { crearPartida } from './adaptador.js';
import { crearPoliticaPerfil } from './politicas.js';

const FALLOS = new Set(['reformula', 'no_entendido']);
const resumenEntrada = (e) => (e.tipo === 'boton' ? `[${e.intencion}] ${JSON.stringify(e.parametros ?? {})}` : e.texto);

// Un run: bucle de turnos hasta el primer cierre.
export async function correrRun({ idx, seed, casoId, perfil, modo, trabada, maxTurnos, politica, alTurno = () => {} }) {
  const runId = `r${String(idx).padStart(4, '0')}-s${seed}`;
  const run = {
    runId, idx, seed, perfil: perfil.id, modo, caso: casoId, cierre: null, turnos: 0, hitos: [], desenlace: null,
    tipoDesenlace: null, escenasVisitadas: [], tagsEscritos: 0, iaLlamadas: 0, iaTokens: 0,
  };
  const p = politica ?? crearPoliticaPerfil(perfil);
  const elegirEntrada = typeof p === 'function' ? p : p.elegir.bind(p);
  const observar = typeof p === 'function' ? () => {} : p.observar.bind(p);
  const ultimas = [];
  await conAzarDeterminista(seed, async () => {
    let sim = null;
    try {
      sim = await crearPartida({ seed, casoId, partidaId: runId });
      const rng = mulberry32(seed ^ 0x9e3779b9);
      const escenas = new Set([sim.estado().escena]);
      let sinHito = 0;
      let fallosSeguidos = 0;
      while (!run.cierre) {
        const entrada = elegirEntrada(sim, rng, { idx, turno: run.turnos + 1 });
        const r = await sim.aplicar(entrada);
        observar(entrada, r);
        run.turnos += 1;
        const est = sim.estado();
        escenas.add(est.escena);
        ultimas.push(resumenEntrada(entrada));
        if (ultimas.length > 5) ultimas.shift();
        run.tagsEscritos += r.tagsEscritos.length;
        run.iaLlamadas += r.iaLlamadas;
        run.iaTokens += r.iaTokens;
        if (r.hito) { run.hitos.push(r.hito); sinHito = 0; } else sinHito += 1;
        fallosSeguidos = FALLOS.has(r.resultado) ? fallosSeguidos + 1 : 0;
        alTurno({
          runId, turno: run.turnos, hora: est.hora, escena: est.escena,
          entrada: entrada.tipo === 'boton'
            ? { tipo: 'boton', intencion: entrada.intencion, parametros: entrada.parametros }
            : { tipo: 'texto', texto: entrada.texto, intencion: entrada.intencion ?? null, parametros: {} },
          decision: { intencion: r.intencion, regla: r.regla, resultado: r.resultado },
          salida: { texto: r.texto, textoId: r.textoId },
          tagsEscritos: r.tagsEscritos, tagsBorrados: r.tagsBorrados, hito: r.hito,
          iaLlamadas: r.iaLlamadas, iaTokens: r.iaTokens,
          ...(entrada.sinAccion ? { sinAccion: true } : {}),
        });
        if (r.desenlace) { run.cierre = 'desenlace'; run.desenlace = r.desenlace; run.tipoDesenlace = r.tipoDesenlace; }
        else if (perfil.paciencia != null && fallosSeguidos > perfil.paciencia) run.cierre = 'abandono';
        else if (sinHito >= trabada) run.cierre = 'trabada';
        else if (run.turnos >= maxTurnos) run.cierre = 'maxTurnos';
      }
      run.escenasVisitadas = [...escenas];
      const est = sim.estado();
      run.conocimientosRevelados = sim.detalle().revelados;
      run.estadoFinal = { escena: est.escena, hora: est.hora, tags: est.tags, hitos: est.hitos, ultimasAcciones: [...ultimas] };
    } catch (e) {
      run.cierre = 'excepcion';
      run.error = e instanceof Error ? e.stack : String(e);
      run.origenError = String(e?.message ?? e).startsWith('narrador:') ? 'narrador' : 'simulador';
    } finally {
      try { await sim?.cerrar(); } catch { /* sin efecto */ }
    }
  });
  return run;
}
