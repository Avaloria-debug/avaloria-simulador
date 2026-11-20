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
