// Se carga antes de cada archivo de test: ninguna llamada real a Groq durante npm test.
const real = globalThis.fetch;
globalThis.fetch = async (url, opciones) => {
  if (String(url).includes('api.groq.com')) throw new Error('llamada real a Groq en tests');
  return real(url, opciones);
};
