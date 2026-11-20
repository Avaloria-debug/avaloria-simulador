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

---

# Tercera tanda: voseo en diálogo, primera persona en acciones (2026-11-20)

Decisiones de Tomás aplicadas:
- Prompt: las acciones van en primera persona ("viajo al norte", "defiendo el campamento", "hablo con Brenn"); el voseo solo cuando el jugador le habla a un NPC o a otro personaje. El system tiene 6 ejemplos fijos: 3 acciones en primera persona y 3 diálogos en voseo.
- Validación con un detector único (`tipoFrase` en `src/corpus.js`), el mismo para la línea base y para la tanda. Cada frase con formato válido queda con su `tipo`:
  - `voseo_dialogo`: alguna forma de vos. Son las formas fijas, los verbos en -ás/-és/-ís, los imperativos en -á/-é/-í (explorá, viajá, defendé) y los imperativos con pronombre sin tilde (fijate, decime, rendime, contame). Se excluyen aquí, acá, allá, así, ahí y otras palabras que no son voseo.
  - `primera_persona_accion`: la frase, después de un vocativo opcional ("Maren,") y de muletillas ("che", "yo"), empieza con un verbo en primera persona del presente, con o sin pronombre ("me escondo"), o con voy/doy/estoy/soy.
  - `no_valida`: ninguna de las dos. No entra a `frases-agrupadas.json`.

Comando: el mismo (`--perfiles curioso,torpe,primerizo --frases 30 --max-estados 3 --max-llamadas-ia 20`). Corpus: `simulaciones/20261120-063343-1-corpus`.

## Las tres tandas con el detector único
| Tanda | Frases con formato | voseo_dialogo | primera_persona_accion | no_valida |
|---|---|---|---|---|
| 1.ª (prompt original) | 279 | 70 (25,1 %) | 75 (26,9 %) | 134 (48,0 %) |
| 2.ª (todo en voseo) | 247 | 234 (94,7 %) | 1 (0,4 %) | 12 (4,9 %) |
| 3.ª (acciones en 1.ª persona) | 218 | 40 (18,3 %) | 152 (69,7 %) | 26 (11,9 %) |

Los porcentajes de voseo de la 1.ª y 2.ª tanda en las secciones anteriores salieron de los detectores de esas tandas; esta tabla los recalcula con el detector único.

## Resultado de la 3.ª tanda
| Métrica | Valor |
|---|---|
| Llamadas | 13 (9 con respuesta, 4 con 429 por tokens por minuto) |
| Tokens (`usage`) | 14.383 (entrada 6.795, salida 7.588) |
| Respuestas sin JSON legible | 2 (perfil torpe) |
| Válidas (voseo o primera persona) sobre pedidas | 192 / 218 (88,1 %) |
| No entendidas por el motor (sobre las válidas) | 37 / 192 (19,3 %), todas `reformula` |
| Resultado del motor sobre las válidas | ejecuta 127, reformula 37, consulta 16, negativa_relacion 12 |

Por perfil: curioso 25 voseo, 59 primera persona, 9 no válidas; primerizo 13, 65, 16; torpe 2, 28, 1 (torpe perdió 2 de 3 respuestas por JSON ilegible).

Las 26 no válidas son casi todas acciones en infinitivo ("comprar pan fresco", "avanzar con cautela…", "retirarme al campamento") y algunas en tercera persona por error de tilde ("avanzó con cautela", "examinó el suelo", "Ysolde, necesitó tu ayuda").

## Muestra de 10 frases (al azar, semilla 20261120)
| Id | Frase | Perfil | Intención objetivo | Motor | Tipo |
|---|---|---|---|---|---|
| f00086 | exploro el sótano oscuro bajo el archivo | curioso | intencion_explorar | ejecuta: explorar | primera_persona_accion |
| f00131 | leo el pergamino que está sobre la mesa de roble | primerizo | intencion_leer | ejecuta: leer | primera_persona_accion |
| f00148 | leo un libro viejo que habla de sellos antiguos | primerizo | intencion_leer | reformula (hablar_con) | primera_persona_accion |
| f00176 | leo en voz alta el texto del mapa | curioso | intencion_leer | ejecuta: leer | primera_persona_accion |
| f00177 | me oculto detrás de los barriles del campamento | curioso | intencion_ocultarse | ejecuta: ocultarse | primera_persona_accion |
| f00184 | retirarme al campamento para revisar el mapa | curioso | intencion_retirarse | reformula (retirarse) | no_valida |
| f00185 | defiendo el puesto de guardia del norte | curioso | intencion_defender | reformula (defender) | primera_persona_accion |
| f00191 | observo el horizonte buscando señales de camino | primerizo | intencion_observar | ejecuta: observar | primera_persona_accion |
| f00214 | calmar la situación hablando con Ysolde | primerizo | intencion_calmar | ejecuta: calmar | no_valida |
| f00218 | leéo el libro viejo que estaba bajo la mesa | primerizo | intencion_leer | ejecuta: leer | primera_persona_accion |

Observaciones:
- f00148: "leo un libro … que habla de …" se va a hablar_con por la palabra "habla". Es candidato para el narrador.
- f00185: "defiendo" reformula; el motor no reconoce la primera persona de defender.
- Total del día contra Groq: 50 llamadas y 50.024 tokens.
