// Rechaza commits con config/keys.json o con keys de Groq/Anthropic en archivos staged.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const PATRONES = ['gsk' + '_', 'sk' + '-ant-'];
export const PROHIBIDOS = ['config/keys.json'];

// archivos: [{ ruta, contenido }]. Devuelve la lista de problemas (vacía si está todo bien).
export function chequear(archivos) {
  const problemas = [];
  for (const { ruta, contenido } of archivos) {
    if (PROHIBIDOS.includes(ruta.replace(/\\/g, '/'))) problemas.push(`${ruta}: archivo de keys, no se commitea`);
    for (const p of PATRONES) if (contenido.includes(p)) problemas.push(`${ruta}: contiene el patrón ${p}`);
  }
  return problemas;
}

function staged() {
  const salida = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], { encoding: 'utf8' });
  return salida.split('\0').filter(Boolean).map((ruta) => {
    let contenido = '';
    try { contenido = execFileSync('git', ['show', `:${ruta}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch { /* binario o ilegible */ }
    return { ruta, contenido };
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problemas = chequear(staged());
  if (problemas.length) {
    console.error('Commit rechazado por posibles keys:\n' + problemas.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
}
