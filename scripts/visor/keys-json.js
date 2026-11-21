// Funciones puras del visor para config/keys.json (se incrustan en el HTML sin los `export`).
export function armarKeysJson({ groq, resto }) {
  return JSON.stringify({ ...resto, groq: groq.map(({ nombre, key }) => ({ nombre, key })) }, null, 2) + '\n';
}
export function leerKeysJson(txt) {
  const d = JSON.parse(txt);
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('no es un keys.json');
  const { groq, ...resto } = d;
  const lista = (Array.isArray(groq) ? groq : []).filter((k) => typeof k?.key === 'string' && k.key && k.key !== 'PEGAR').map((k, i) => ({ nombre: String(k.nombre ?? `k${i + 1}`), key: k.key.trim() }));
  return { groq: lista, resto };
}
