import fs from 'node:fs';
import path from 'node:path';

const leerJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
export { leerJsonl };

// Escritura incremental y síncrona: si el proceso se corta, lo escrito queda.
export function abrirRegistro(dir, { reanudar = false } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const f = (n) => path.join(dir, n);
  let completados = [];
  if (reanudar) {
    completados = JSON.parse(fs.readFileSync(f('estado.json'), 'utf8')).completados;
    const ok = new Set(completados);
    // Se descartan las líneas de runs que quedaron a medias.
    const runs = leerJsonl(f('runs.jsonl')).filter((r) => ok.has(r.idx));
    const ids = new Set(runs.map((r) => r.runId));
    const turnos = leerJsonl(f('turnos.jsonl')).filter((t) => ids.has(t.runId));
    fs.writeFileSync(f('runs.jsonl'), runs.map((x) => JSON.stringify(x) + '\n').join(''));
    fs.writeFileSync(f('turnos.jsonl'), turnos.map((x) => JSON.stringify(x) + '\n').join(''));
  } else {
    for (const n of ['runs.jsonl', 'turnos.jsonl']) fs.writeFileSync(f(n), '');
    fs.writeFileSync(f('estado.json'), JSON.stringify({ completados: [] }));
  }
  return {
    completados: new Set(completados),
    turno: (t) => fs.appendFileSync(f('turnos.jsonl'), JSON.stringify(t) + '\n'),
    // Un run cerrado por cuota no cuenta como completado: --reanudar lo vuelve a correr con la misma seed.
    run(r) {
      fs.appendFileSync(f('runs.jsonl'), JSON.stringify(r) + '\n');
      if (r.cierre === 'cuota') return;
      completados.push(r.idx);
      fs.writeFileSync(f('estado.json'), JSON.stringify({ completados }));
    },
    config: (c) => fs.writeFileSync(f('config.json'), JSON.stringify(c, null, 2)),
    archivo: f,
  };
}
