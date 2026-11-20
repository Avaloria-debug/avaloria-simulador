// Post-proceso del lote charla-npc: informe de charla y frases no entendidas nuevas (sin llamar a la IA). Todo pendiente.
// Uso: node scripts/charla-npc.js <loteId>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generarInformeCharla } from '../src/informe-charla.js';
import { consolidar, escribir } from '../src/consolidar.js';
import { formasConocidas, normalizar } from '../src/adaptador.js';
import { leerJsonl } from '../src/registro.js';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const loteId = process.argv[2];
if (!loteId) { console.error('Uso: node scripts/charla-npc.js <loteId>'); process.exit(1); }
const dir = path.join(RAIZ, 'simulaciones', loteId);
const c = generarInformeCharla(dir);

// Frases del jugador IA que el motor no entendió o reformuló, sin las que ya están en F4 ni las formas del narrador.
const f4 = JSON.parse(fs.readFileSync(path.join(RAIZ, 'docs', 'candidatos', 'F4-frases-agrupadas.json'), 'utf8'));
const yaEstan = new Set([...Object.values(f4.candidatos).flat(), ...f4.marcadas].map((x) => x.normalizada));
const conocidas = new Set([...formasConocidas, ...yaEstan]);
const runs = new Map(leerJsonl(path.join(dir, 'runs.jsonl')).map((r) => [r.runId, r]));
const filas = leerJsonl(path.join(dir, 'turnos.jsonl')).filter((t) => t.origen === 'ia').map((t) => ({
  frase: t.entrada.texto, intencionObjetivo: null, perfil: runs.get(t.runId)?.perfil ?? null, motor: { resultado: t.decision.resultado, intencion: t.decision.intencion, regla: t.decision.regla },
}));
const r = consolidar([{ nombre: loteId, filas }], { conocidas });
const datos = { generado: new Date().toISOString(), fuente: [loteId], excluidas: { yaEnF4: yaEstan.size }, ...r };
escribir(path.join(dir, 'candidatos', 'frases-agrupadas.json'), datos);
escribir(path.join(RAIZ, 'docs', 'candidatos', 'charla-npc-frases-agrupadas.json'), datos);
const textos = leerJsonl(path.join(dir, 'candidatos', 'textos.jsonl'));
console.log(JSON.stringify({ runs: c.runs, completados: c.runsCompletados, cierres: c.cierres, ia: c.ia, textos: textos.length, frasesIaJugador: filas.length, frasesNuevas: r.resumen.candidatos, marcadas: r.resumen.marcadas, top5: c.npcs.slice(0, 5).map((x) => `${x.nombre}: ${x.temasRevelados}`) }, null, 1));
