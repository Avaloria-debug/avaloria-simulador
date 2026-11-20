import path from 'node:path';
import { leerKeysGroq, crearPool } from './keys.js';
import { crearClienteGroq, MODELO_POR_DEFECTO } from './groq.js';

// Arma pool y cliente desde config. Sin keys devuelve null (los llamadores avisan y caen a reglas).
export function prepararIa({ config = {}, maxLlamadas = 300, cuenta = null, fetch, env, archivoKeys, raiz, log = () => {} }) {
  const keys = leerKeysGroq({ env, ...(archivoKeys ? { archivo: archivoKeys } : {}) });
  if (!keys.length) return null;
  const pool = crearPool({ keys, limiteDiarioPorKey: config.groq?.limiteDiarioPorKey ?? 250, archivoUso: raiz ? path.join(raiz, config.salida ?? 'simulaciones', 'uso-keys.json') : null });
  const cliente = crearClienteGroq({ pool, modelo: config.modelos?.groq ?? MODELO_POR_DEFECTO, maxLlamadas, cuenta, ...(fetch ? { fetch } : {}), log });
  return { pool, cliente };
}
