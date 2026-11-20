# Diagnóstico: trabada en el turno 15 (lote 300)

Muestra: turnos 1 a 15 de 3 runs `amable` (r0120-s420, r0121-s421, r0122-s422) y 3 `curioso` (r0000-s300, r0001-s301, r0002-s302) del lote `20261120-193218-300`.

## Qué hacen
- **amable**: ayudar, calmar, hablar con y comprar, siempre en el Mercado Circular con Serel. Ayudar escribe `gratitud` y `favor_debido` y sube la relación. En 2 de 3 runs se revelan `conocimiento_serel_1` y `_2` (umbral 30 y 25). Antes de eso, las consultas dan `negativa_relacion` (motivo `umbral`). En el lote completo: serel_1 26/40, serel_2 15/40.
- **curioso**: consulta temas y habla con, pero no ayuda ni calma. La relación no pasa de 0 y las consultas dan `negativa_relacion` de 4 a 8 veces por run. Los tags `curiosidad` llegan a nivel 2 y no siguen subiendo. 0 conocimientos revelados en 60 runs.
- Ninguno de los 6 consigue un hito. En el lote completo hubo 19 hitos, todos `h1`: 17 del caso_03 (8 investigador, 1 primerizo, 8 directo) y 2 del caso_01 (directo). Ningún hito de amable ni de curioso. Después del hito, el run igual corta por trabada a los 15 turnos sin otro.

## Causa más probable
1. El hito h1 de los 4 casos pide `pista_conocida` de la ranura p1, que solo se cumple con conocimientos de Brenn, Sarin, Ysolde o `conocimiento_sendero_sin_vigilancia`. Nunca con Serel.
2. Los perfiles de charla se quedan en el Mercado con Serel: 116 de 240 runs salen de la escena, pero sin construir relación con el NPC de p1.
3. curioso no construye relación (no ayuda) y choca con el umbral (25 a 50) en cada consulta.
4. amable sí construye relación, pero con un NPC que no es p1: revela serel_1/_2, que solo cuentan para p2.

**En una línea:** el h1 de cada caso depende del NPC de la ranura p1, nunca de Serel; los perfiles de charla se quedan con Serel (amable) o no construyen relación (curioso), así que a los 15 turnos sin hito cortan por trabada.

5. Sin hito en 15 turnos, el run cierra por `trabada`. El umbral de 15 corta antes de que un perfil pueda salir, construir relación con otro NPC y consultarlo.
