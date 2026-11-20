# Umbral 0 con margen de turnos: lote 800 con --trabada 25 (2026-11-20)

Lote `20261120-235036-800`: `--perfiles seguidor_pistas_dueno:12,amable:6 --mezcla 0/100 --seed-base 800 --jugador-ia si --trabada 25 --max-llamadas-ia 30`. Narrador 0.0.41 (main `0a9b915`).

El lote se cortó al llegar al tope de 30 llamadas: los 12 runs de `seguidor_pistas_dueno` terminaron, y de `amable` solo hay un run parcial (14 turnos) y 5 sin empezar, todos con cierre `cuota`. No se reanudó, para respetar el tope del día. El rejuego en modo código coincide con el registro en los 12 runs de `seguidor_pistas_dueno`.

## Diagnóstico previo (lote 800 con --trabada 15, sin IA)
- Un run con pista (r0006-s806): la pista llegó en el turno 14, con el jugador en el Mercado, Hollis en el Camino del sur (2 viajes) y la trabada en el 15. Le quedaba 1 turno; con `--trabada 25` le quedarían 11. Por eso se corrió el lote.

## Resultado (seguidor_pistas_dueno, 12 runs)
- Pista narrada en 1 run (r0006-s806, de nuevo en el turno 14), seguida: llegó al Camino del sur en el turno 18. Ahí se entregó el h1, que narra el conocimiento: "Nada de lo que dice Hollis Dren parece importante, hasta que lo pensás dos veces: Un sendero sin vigilancia en las colinas."
- Consultas al dueño de p1 después de la pista: 2, las dos al `_1` de Hollis (`conocimiento_sendero_sin_vigilancia`, umbral 30, `requiereEvento: evento_tormenta_verano`).
  1. Turno 19, "Hollis Dren, contame de sendero", con relación 0 → `no_se`, motivo `evento`. Respuesta del narrador: "Hollis Dren se encoge de hombros: de eso no sabe nada."
  2. Turno 37, "hablame sobre sendero", con relación 5 → `fallo`, motivo `umbral`. Respuesta del narrador: "Hollis Dren no te cuenta nada nuevo por ahora."
- **El umbral 0 se ejerció.** En la primera consulta, la relación 0 pasó el umbral reducido (con el original de 30 el motivo habría sido `umbral`, que se evalúa antes que el evento). No reveló porque el `_1` de Hollis pide la tormenta de verano activa. La marca quedó usada, y la segunda consulta volvió a pedir 30, como estaba diseñado.
- h1 en 5 de 12 runs; `_1` revelado en 2 runs y `_2` en 1, todos sin consulta al dueño después de la pista (por otras vías).

## Hallazgos para Tomás
- El primer contacto con umbral reducido se gasta aunque el conocimiento no se pueda revelar por otra condición (evento). ¿La marca debería quedar sin usar cuando el motivo es `evento` o `marca`?
- El h1 narra el contenido del `_1` ("Un sendero sin vigilancia en las colinas"), pero no lo marca como revelado: la consulta siguiente responde "no sabe nada". Para el jugador, esa respuesta contradice el texto que acaba de leer.
