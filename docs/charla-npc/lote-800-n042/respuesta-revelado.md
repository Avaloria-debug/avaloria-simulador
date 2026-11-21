# Respuesta a conocimiento revelado en juego simulado (2026-11-21)

Lote `20261121-013830-800`: `--perfiles seguidor_pistas_dueno:12,amable:6 --mezcla 0/100 --seed-base 800 --jugador-ia si --trabada 25 --max-llamadas-ia 30`. Narrador de main, `9f8071f` (0.0.42), 30 llamadas IA.

El tope de 30 llamadas cortó el lote: los 12 runs de `seguidor_pistas_dueno` terminaron, y los 6 de `amable` quedaron con cierre `cuota` (uno parcial, cinco sin empezar), igual que en la etapa anterior. No se reanudó.

## Resultado
- h1 en 6 runs, y en los 6 el h1 reveló el `_1` del dueño de p1: Hollis en 2, Sarin en 2, Brenn en 2.
- Consultas con tema al dueño de p1 después del h1: 8, en 3 runs.
  - 6 son de un conocimiento ya revelado (`ya_revelado`) y repiten lo contado con la plantilla de éxito. Por ejemplo: "Después de un rato, Hollis Dren te dice: Un sendero sin vigilancia en las colinas." y "Después de un rato, Brenn Holt te dice: Una posada escondida fuera del camino del norte."
  - 2 son del `_2` de Brenn, todavía no revelado, y fallan por umbral: "Brenn Holt no te cuenta nada nuevo por ahora.". Es lo esperado: el `_2` no se reveló.
- Respuestas con "..": 0. Respuestas que niegan un conocimiento ya revelado: 0.
- Rejuego en modo código con las entradas registradas: todos los textos coinciden con el registro (salvo los diálogos de la IA, que no se rejuegan).

## Detalle (salida del análisis)
```
{"runs":18,"completos":12,"cuota":6,"h1":6,"h1Revela1":6,"consultasPost":8,"conDobleP":0,"niegaTrasRevelar":0,"replayOk":0,"replayMal":0}
seguidor_pistas_dueno r0002-s802 h1 t4 dueño hollis_pastor _1 conocimiento_sendero_sin_vigilancia revelado por el h1: sí (nuevos: conocimiento_sendero_sin_vigilancia)
seguidor_pistas_dueno r0003-s803 h1 t18 dueño sarin_mensajera _1 conocimiento_sarin_1 revelado por el h1: sí (nuevos: conocimiento_sarin_1)
seguidor_pistas_dueno r0004-s804 h1 t4 dueño brenn_arriero _1 conocimiento_brenn_1 revelado por el h1: sí (nuevos: conocimiento_brenn_1)
   consulta t23 "qué sabés de bajada" → conocimiento_brenn_2 fallo/umbral: "Brenn Holt no te cuenta nada nuevo por ahora."
seguidor_pistas_dueno r0006-s806 h1 t16 dueño hollis_pastor _1 conocimiento_sendero_sin_vigilancia revelado por el h1: sí (nuevos: conocimiento_sendero_sin_vigilancia)
   consulta t17 "Hollis Dren, qué sabés de sendero" → conocimiento_sendero_sin_vigilancia fallo/ya_revelado: "Hollis Dren baja la voz y te cuenta: Un sendero sin vigilancia en las colinas."
   consulta t20 "vigilancia" → conocimiento_sendero_sin_vigilancia fallo/ya_revelado: "Después de un rato, Hollis Dren te dice: Un sendero sin vigilancia en las colinas."
   consulta t27 "Hollis Dren, hablame sobre colinas" → conocimiento_sendero_sin_vigilancia fallo/ya_revelado: "Después de un rato, Hollis Dren te dice: Un sendero sin vigilancia en las colinas."
   consulta t32 "Hollis Dren, sendero?" → conocimiento_sendero_sin_vigilancia fallo/ya_revelado: "Hollis Dren baja la voz y te cuenta: Un sendero sin vigilancia en las colinas."
   consulta t40 "Hollis Dren, hablame sobre fogatas" → conocimiento_hollis_2 fallo/ya_revelado: "Después de un rato, Hollis Dren te dice: Cuando el rebaño pasa la noche en el cruce bajan lobos de las colinas, y los pastores prenden fogatas para alejarlos."
seguidor_pistas_dueno r0007-s807 h1 t11 dueño sarin_mensajera _1 conocimiento_sarin_1 revelado por el h1: sí (nuevos: conocimiento_sarin_1)
seguidor_pistas_dueno r0008-s808 h1 t18 dueño brenn_arriero _1 conocimiento_brenn_1 revelado por el h1: sí (nuevos: conocimiento_brenn_1)
   consulta t31 "Brenn Holt, ruinas?" → conocimiento_brenn_2 fallo/umbral: "Brenn Holt no te cuenta nada nuevo por ahora."
   consulta t36 "Brenn Holt, contame de posada" → conocimiento_brenn_1 fallo/ya_revelado: "Después de un rato, Brenn Holt te dice: Una posada escondida fuera del camino del norte."
TORMENTA
r0002-s802 t4: tormenta activa no (eventos: evento_feria_libros@escena_biblioteca_publica)
r0006-s806 t16: tormenta activa no (eventos: evento_carta_viajero@escena_mercado_circular, evento_feria_libros@escena_biblioteca_publica, evento_precio_pan_sube@escena_mercado_circular)
```
