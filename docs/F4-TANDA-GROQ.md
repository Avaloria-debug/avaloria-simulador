# F4: tanda de prueba con Groq (2026-11-20)

Comando: `npm run corpus -- --perfiles curioso,torpe,primerizo --frases 30 --max-estados 3 --max-llamadas-ia 20`
Corpus: `simulaciones/20261120-061945-1-corpus` (no se versiona).

## Verificación previa
- Key: secreto de red del entorno para `api.groq.com`, inyectado por el proxy. El simulador corre con `GROQ_API_KEY=proxy-injected` (marcador; el proxy pone la key real). La key no pasa por el código ni por los logs.
- Modelo `openai/gpt-oss-120b`: verificado con una llamada mínima (máximo 10 tokens de salida): HTTP 200, `model` devuelto `openai/gpt-oss-120b`, 84 tokens.
- Estimación: 3 estados × 3 perfiles = 9 llamadas, ~14.300 tokens (máximo permitido: 20 llamadas).

## Resultado (tanda válida)
| Métrica | Valor |
|---|---|
| Llamadas | 16 (9 con respuesta, 7 respondidas con 429) |
| Tokens (campo `usage`) | 12.138 (entrada 4.833, salida 7.305) |
| Frases pedidas / válidas | 279 / 279 (100 %); 0 respuestas sin JSON legible |
| No entendidas por el motor | 29 (10,4 %): todas `reformula`, ninguna `no_entendido` |
| Resueltas a otra intención o no entendidas | 69 frases (69 grupos candidatos, todos `pendiente`) |

Por perfil (resultado del motor):

| Perfil | ejecuta | consulta | negativa_relacion | reformula |
|---|---|---|---|---|
| curioso | 59 | 23 | 7 | 4 |
| torpe | 69 | 5 | 6 | 13 |
| primerizo | 60 | 18 | 3 | 12 |

## Errores de la API
- 429 por tokens por minuto (TPM: límite 8.000 del plan `on_demand`): 1 en la primera corrida y 7 en la tanda válida. Ningún otro error.
- La primera corrida (`20261120-061905-1-corpus`: 8 llamadas, 9.475 tokens) se cortó en la llamada 8 porque, con una sola key en cooldown, el cliente abortaba en vez de esperar. Se corrigió (`esperaMinima` en `src/ia/keys.js`, test en `tests/ia.test.js`) y se repitió la tanda completa.
- Total del día contra Groq: 25 llamadas (1 de verificación + 8 + 16) y 21.697 tokens.

## Muestra de 10 frases (al azar, semilla 20261120)
Voseo: **sí** = usa formas de vos; **neutra** = primera persona sin tú ni vos; **no** = tuteo.

| Id | Frase | Perfil | Intención objetivo | Motor | Voseo |
|---|---|---|---|---|---|
| f00109 | Maren, ¿sabés si el sello está activo o inactivo? | curioso | intencion_hablar_con | consulta | sí |
| f00168 | ¿qué sabés del Archivo Real? | primerizo | consulta_tema | consulta | sí |
| f00225 | Compro unas botas nuevas a Ysolde, ¿cual te gusta? | torpe | intencion_comprar | ejecuta: intencion_comprar | neutra |
| f00226 | Leo el mapa con la lupa que tengo en la bolsa | torpe | intencion_leer | ejecuta: intencion_leer | neutra |
| f00235 | Me oculto tras una roca grande para observar sin ser visto | torpe | intencion_ocultarse | ejecuta: intencion_observar | neutra |
| f00236 | Avanzo con cautela, pisando muy leve el musgo | torpe | intencion_avanzar_cautela | ejecuta: intencion_avanzar_cautela | neutra |
| f00237 | Distraigo a Ysolde tirando una ramita al aire | torpe | intencion_distraer | ejecuta: intencion_distraer | neutra |
| f00244 | Exameno el suelo, parece que hay huellas frescas | torpe | intencion_examinar | reformula | neutra |
| f00274 | ¿Podés ayudarme a cargar el mapa? está muy pesado | primerizo | intencion_ayudar | consulta | sí |
| f00278 | ¿Qué sabés de los curanderos de la aldea? | primerizo | consulta_tema | consulta | sí |

Observaciones para revisar (no son decisiones):
- f00235: "me oculto … para observar" resolvió a observar en vez de ocultarse.
- f00274: un pedido de ayuda con NPC implícito cayó en consulta en vez de ayudar.
- f00244: el typo "exameno" no se corrige y queda en reformula.
- Las frases del perfil torpe casi no tienen errores de tipeo ni frases sueltas; el modelo escribe frases largas y prolijas.

---

# Segunda tanda: prompt con voseo y validación (2026-11-20)

Cambios: el system del corpus suma la instrucción "Todas las frases en voseo rioplatense, nunca usar tú ni usted." y 6 ejemplos fijos en voseo; el user repite la instrucción. Una frase es válida solo si además del formato (1–200 caracteres, una línea) tiene una forma de voseo: vos, sos, tenés, querés, podés, decime, mirá, fijate, hacé, andá, o una palabra terminada en -ás/-és/-ís con tilde (sin más, después, país y otras palabras comunes que no son verbos). Las que no la tienen quedan con `validacion: "no_voseo"` en `frases.jsonl` y no entran a `frases-agrupadas.json`.

Comando: el mismo (`--perfiles curioso,torpe,primerizo --frases 30 --max-estados 3 --max-llamadas-ia 20`). Corpus: `simulaciones/20261120-062635-1-corpus`.

| Métrica | 1.ª tanda | 2.ª tanda |
|---|---|---|
| Llamadas | 16 (7 con 429) | 12 (3 con 429) |
| Tokens (`usage`) | 12.138 | 13.944 (entrada 6.228, salida 7.716) |
| Frases con formato válido | 279 | 247 (1 respuesta sin JSON legible, perfil torpe) |
| Con voseo, criterio de esta tanda | 51 (18,3 %) | 108 (43,7 %) |
| Con voseo, sumando imperativos -á/-é/-í (solo informativo) | 64 (22,9 %) | 209 (84,6 %) |
| Válidas (formato + voseo) sobre pedidas | — | 108 / 247 (43,7 %) |
| No entendidas por el motor (sobre las válidas) | 29 / 279 (10,4 %) | 24 / 108 (22,2 %), todas `reformula` |

La línea de la 1.ª tanda con voseo se calculó después, aplicando el mismo detector a sus frases; la muestra manual de la 1.ª tanda (4 de 10) no se recalculó.

Voseo por perfil (2.ª tanda, criterio de esta tanda): curioso 53/93, primerizo 46/93, torpe 9/61.
Resultado del motor sobre las 108 válidas: consulta 47, ejecuta 27, reformula 24, negativa_relacion 10.

## Muestra de 10 frases (al azar, semilla 20261120)
| Id | Frase | Perfil | Intención objetivo | Motor | Validación |
|---|---|---|---|---|---|
| f00097 | fijate si hay algun libro viejo que hable de la fundación | curioso | intencion_explorar | reformula (hablar_con) | ok |
| f00149 | despachá el trabajo de archivista, por favor | primerizo | intencion_trabajar | ejecuta: trabajar | no_voseo |
| f00168 | mirá, ¿podés negociar con el guardia para pasar? | curioso | intencion_negociar | reformula (observar) | ok |
| f00200 | huí de aquí antes de que llegue la patrulla | torpe | intencion_huir | ejecuta: huir | no_voseo |
| f00208 | defendé el campamento mientras yo busco ayuda | torpe | intencion_defender | ejecuta: defender | no_voseo |
| f00209 | rendime, no quiero seguir peleando | torpe | intencion_rendirse | reformula (retirarse) | no_voseo |
| f00210 | viajá al norte, que allá está la posada secreta | torpe | intencion_viajar | ejecuta: viajar | no_voseo |
| f00216 | descansá un poco, mis piernas están como gelatina | torpe | intencion_descansar | ejecuta: descansar | no_voseo |
| f00243 | fijate bien en esas marcas del árbol, parece una señal | primerizo | intencion_observar | reformula | ok |
| f00247 | abordá el tema con Brenn, necesitamos su experiencia | primerizo | intencion_hablar_con | ejecuta: hablar_con | no_voseo |

## Hallazgos (para decidir, no resueltos)
1. **El criterio no reconoce los imperativos de vos.** "explorá", "leé", "viajá", "defendé", "huí" son voseo, pero no terminan en -ás/-és/-ís ni están en la lista fija, así que quedan `no_voseo`. Con esos imperativos el voseo de la 2.ª tanda sube de 43,7 % a 84,6 %. Pregunta para Tomás: ¿se suman los imperativos -á/-é/-í al criterio, con una lista de exclusiones (está, acá, allá, aquí, así, futuros como "dirá")?
2. **Al forzar el voseo, el modelo escribe las acciones como órdenes.** "viajá al norte", "descansá un poco" o "defendé el campamento" están dirigidas a otro, no son la acción del jugador ("viajo al norte"). Muchas igual se ejecutan, pero como frase de jugador no son naturales, y hay errores como "rendime". Pregunta para Tomás: ¿las acciones del jugador tienen que ir en voseo (dirigidas a alguien) o en primera persona, y el voseo solo cuando le habla a un NPC?
3. Las no entendidas suben de 10,4 % a 22,2 %, sobre todo frases con "fijate"/"mirá" + pedido que el motor manda a `reformula` o a otra intención (f00097, f00168, f00243). Son buenos candidatos para el narrador.
4. Total del día contra Groq: 37 llamadas (1 de verificación + 8 + 16 + 12) y 35.641 tokens.
