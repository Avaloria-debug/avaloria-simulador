// Candidatos de texto: respuestas de diálogo IA del narrador en los turnos de un lote. Todo queda pendiente.
import fs from 'node:fs';
import path from 'node:path';
import { leerJsonl } from './registro.js';
import { normalizar, nombreDe, versionNarrador } from './adaptador.js';

const SALUDOS = ['hola', 'buenas', 'buen dia', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'hey', 'saludos'];
const PREGUNTAS = /^(que|quien|quienes|donde|adonde|como|cuando|cuanto|cuanta|por que|para que|cual|sabes|sabe|conoces|contame|decime|me contas|me decis)\b/;

// saludo: la frase arranca con un saludo; consulta: pregunta o pedido de información;
// dialogo: le habla a un NPC presente por su nombre; reaccion: el resto.
export function tipoTexto(frase, npcsNombres = []) {
  const n = normalizar(frase ?? '');
  if (SALUDOS.some((s) => n === s || n.startsWith(`${s} `))) return 'saludo';
  if (String(frase ?? '').includes('?') || PREGUNTAS.test(n)) return 'consulta';
  if (npcsNombres.some((x) => x && n.includes(normalizar(x).split(' ')[0]))) return 'dialogo';
  return 'reaccion';
}

export function extraerTextos(dir, { modelo = null } = {}) {
  const runs = new Map(leerJsonl(path.join(dir, 'runs.jsonl')).map((r) => [r.runId, r]));
  const vistos = new Set(); const filas = [];
  for (const t of leerJsonl(path.join(dir, 'turnos.jsonl'))) {
    if (t.salida?.tipo !== 'dialogo_ia' || !t.salida.texto) continue;
    const clave = normalizar(t.salida.texto);
    if (!clave || vistos.has(clave)) continue;
    vistos.add(clave);
    const nombres = (t.npcs ?? []).map((id) => nombreDe(id));
    const frase = t.entrada?.texto ?? null;
    const npc = (t.npcs ?? []).find((id) => frase && normalizar(frase).includes(normalizar(nombreDe(id)).split(' ')[0])) ?? (t.npcs ?? [])[0] ?? null;
    filas.push({
      id: `t${String(filas.length + 1).padStart(5, '0')}`, tipo: tipoTexto(frase, nombres),
      contexto: { escena: t.escena, npc, intencion: t.decision?.intencion ?? null, frase },
      texto: t.salida.texto, modelo, seed: runs.get(t.runId)?.seed ?? null, runId: t.runId, turno: t.turno,
      versionNarrador: versionNarrador.version, estado: 'pendiente',
    });
  }
  const dirC = path.join(dir, 'candidatos');
  fs.mkdirSync(dirC, { recursive: true });
  fs.writeFileSync(path.join(dirC, 'textos.jsonl'), filas.map((x) => `${JSON.stringify(x)}\n`).join(''));
  return { textos: filas.length };
}
