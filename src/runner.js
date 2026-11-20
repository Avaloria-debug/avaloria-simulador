import { conAzarDeterminista, mulberry32 } from './rng.js';
import { crearPartida } from './adaptador.js';
import { politicas } from './politicas.js';

// Un run: bucle de turnos hasta el primer cierre.
export async function correrRun({ idx, seed, casoId, perfil, modo, trabada, maxTurnos, politica, alTurno = () => {} }) {
  const runId = `r${String(idx).padStart(4, '0')}-s${seed}`;
  const run = {
    runId, idx, seed, perfil: perfil.id, modo, caso: casoId, cierre: null, turnos: 0, hitos: [], desenlace: null,
    tipoDesenlace: null, escenasVisitadas: [], tagsEscritos: 0, iaLlamadas: 0, iaTokens: 0,
  };
  const elegirEntrada = politica ?? politicas[perfil.politica];
  await conAzarDeterminista(seed, async () => {
    let sim = null;
    try {
      sim = await crearPartida({ seed, casoId, partidaId: runId });
      const rng = mulberry32(seed ^ 0x9e3779b9);
      const escenas = new Set([sim.estado().escena]);
      let sinHito = 0;
      while (!run.cierre) {
        const entrada = elegirEntrada(sim, rng, { idx, turno: run.turnos + 1 });
        const r = await sim.aplicar(entrada);
        run.turnos += 1;
        const est = sim.estado();
        escenas.add(est.escena);
        run.tagsEscritos += r.tagsEscritos.length;
        run.iaLlamadas += r.iaLlamadas;
        run.iaTokens += r.iaTokens;
        if (r.hito) { run.hitos.push(r.hito); sinHito = 0; } else sinHito += 1;
        alTurno({
          runId, turno: run.turnos, hora: est.hora, escena: est.escena,
          entrada: entrada.tipo === 'boton'
            ? { tipo: 'boton', intencion: entrada.intencion, parametros: entrada.parametros }
            : { tipo: 'texto', texto: entrada.texto, parametros: {} },
          decision: { intencion: r.intencion, regla: r.regla, resultado: r.resultado },
          salida: { texto: r.texto, textoId: r.textoId },
          tagsEscritos: r.tagsEscritos, tagsBorrados: r.tagsBorrados, hito: r.hito,
          iaLlamadas: r.iaLlamadas, iaTokens: r.iaTokens,
        });
        if (r.desenlace) { run.cierre = 'desenlace'; run.desenlace = r.desenlace; run.tipoDesenlace = r.tipoDesenlace; }
        else if (sinHito >= trabada) run.cierre = 'trabada';
        else if (run.turnos >= maxTurnos) run.cierre = 'maxTurnos';
      }
      run.escenasVisitadas = [...escenas];
    } catch (e) {
      run.cierre = 'excepcion';
      run.error = e instanceof Error ? e.stack : String(e);
    } finally {
      try { await sim?.cerrar(); } catch { /* sin efecto */ }
    }
  });
  return run;
}
