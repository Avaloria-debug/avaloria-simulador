import { conAzarDeterminista, mulberry32 } from './rng.js';
import { crearPartida } from './adaptador.js';
import { crearPoliticaPerfil } from './politicas.js';

const FALLOS = new Set(['reformula', 'no_entendido']);
// Negativa por falta de relación: respuesta válida, no suma ni reinicia la paciencia.
export const siguientesFallos = (n, resultado) => (resultado === 'negativa_relacion' ? n : FALLOS.has(resultado) ? n + 1 : 0);
const resumenEntrada = (e) => (e.tipo === 'boton' ? `[${e.intencion}] ${JSON.stringify(e.parametros ?? {})}` : e.texto);

// Un run: bucle de turnos hasta el primer cierre.
// `jugadorIa` (opcional): con probabilidad perfil.ia.p la frase la escribe la IA; si falla o es inválida, reglas.
export async function correrRun({ idx, seed, casoId, perfil, modo, trabada, maxTurnos, politica, alTurno = () => {}, jugadorIa = null, iaNarrador = null, avisar = () => {} }) {
  const runId = `r${String(idx).padStart(4, '0')}-s${seed}`;
  const run = {
    runId, idx, seed, perfil: perfil.id, modo, caso: casoId, cierre: null, turnos: 0, hitos: [], desenlace: null,
    tipoDesenlace: null, escenasVisitadas: [], tagsEscritos: 0, iaLlamadas: 0, iaTokens: 0,
    jugadorIa: { frases: 0, tokens: 0, fallasJugador: 0, fallasMotor: 0 },
  };
  const pIa = jugadorIa ? (perfil.ia?.p ?? 0) : 0;
  const rngIa = mulberry32(seed ^ 0x1a2b3c);
  const historial = [];
  let iaApagada = false;
  const p = politica ?? crearPoliticaPerfil(perfil);
  const elegirEntrada = typeof p === 'function' ? p : p.elegir.bind(p);
  const observar = typeof p === 'function' ? () => {} : p.observar.bind(p);
  const ultimas = [];
  await conAzarDeterminista(seed, async () => {
    let sim = null;
    try {
      sim = await crearPartida({ seed, casoId, partidaId: runId, ia: modo === 'ia' ? iaNarrador : null });
      const rng = mulberry32(seed ^ 0x9e3779b9);
      const escenas = new Set([sim.estado().escena]);
      let sinHito = 0;
      let fallosSeguidos = 0;
      while (!run.cierre) {
        let entrada = null; let origenFalla = null;
        if (pIa > 0 && !iaApagada && rngIa() < pIa) {
          try {
            const f = await jugadorIa.pedirFrase(perfil, sim, historial.slice(-5));
            run.jugadorIa.tokens += f.tokens;
            if (f.frase) { entrada = { tipo: 'texto', texto: f.frase, intencion: null, origen: 'ia' }; run.jugadorIa.frases += 1; } else { origenFalla = 'jugador_simulado'; run.jugadorIa.fallasJugador += 1; }
          } catch (e) {
            if (e.name === 'TopeAlcanzado' || e.name === 'SinKeys') { iaApagada = true; avisar(`${e.message}: el resto del run sigue con reglas`); } else { origenFalla = 'jugador_simulado'; run.jugadorIa.fallasJugador += 1; }
          }
        }
        entrada ??= elegirEntrada(sim, rng, { idx, turno: run.turnos + 1 });
        const r = await sim.aplicar(entrada);
        if (entrada.origen === 'ia' && FALLOS.has(r.resultado)) { origenFalla = 'motor'; run.jugadorIa.fallasMotor += 1; }
        historial.push({ frase: resumenEntrada(entrada), respuesta: r.texto });
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
        fallosSeguidos = siguientesFallos(fallosSeguidos, r.resultado);
        alTurno({
          runId, turno: run.turnos, hora: est.hora, escena: est.escena,
          entrada: entrada.tipo === 'boton'
            ? { tipo: 'boton', intencion: entrada.intencion, parametros: entrada.parametros }
            : { tipo: 'texto', texto: entrada.texto, intencion: entrada.intencion ?? null, parametros: {} },
          decision: { intencion: r.intencion, regla: r.regla, resultado: r.resultado },
          salida: { texto: r.texto, textoId: r.textoId, tipo: r.tipoSalida ?? null },
          npcs: (r.npcsPresentes ?? []).map((n) => n.id),
          ...(r.consulta ? { consulta: r.consulta } : {}),
          tagsEscritos: r.tagsEscritos, tagsBorrados: r.tagsBorrados, hito: r.hito,
          iaLlamadas: r.iaLlamadas, iaTokens: r.iaTokens,
          ...(entrada.sinAccion ? { sinAccion: true } : {}),
          ...(entrada.origen ? { origen: entrada.origen } : {}),
          ...(origenFalla ? { origenFalla } : {}),
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
      if (e?.name === 'SinKeys' || e?.name === 'TopeAlcanzado') {
        run.cierre = 'cuota'; run.motivoCuota = e.message;
        return;
      }
      run.cierre = 'excepcion';
      run.error = e instanceof Error ? e.stack : String(e);
      run.origenError = String(e?.message ?? e).startsWith('narrador:') ? 'narrador' : 'simulador';
    } finally {
      try { await sim?.cerrar(); } catch { /* sin efecto */ }
    }
  });
  return run;
}
