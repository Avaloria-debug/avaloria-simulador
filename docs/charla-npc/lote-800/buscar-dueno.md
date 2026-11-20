# Buscar al dueño de p1: medición (2026-11-20)

Lote `20261120-234103-800`: `--perfiles seguidor_pistas_dueno:15 --mezcla 0/100 --seed-base 800 --jugador-ia si --max-llamadas-ia 50`. Narrador 0.0.41 (main `0a9b915`, umbral 0 en el primer contacto por pista), 22 llamadas IA. `seguidor_pistas_dueno` es `seguidor_pistas` con el modo `buscar_dueno_p1`.

Comparación con el lote 700 (`seguidor_pistas`, narrador de la PR con el mismo umbral 0). Rejuego en modo código: 15 de 15 y 10 de 10 runs coinciden con el registro.

| Métrica | Lote 700 (seguidor_pistas, 10 runs) | Lote 800 (seguidor_pistas_dueno, 15 runs) |
|---|---|---|
| Runs con pista narrada | 3 | 1 |
| Pistas seguidas (llegó al NPC o a su escena) | 2 | 0 |
| Consultas con tema al dueño de p1 después de la pista | 0 | 0 |
| h1 | 3 | 4 |
| Runs con _1 revelado | 0 | 2 |
| Runs con _2 revelado | 0 | 0 |

## Resultado
- **El umbral 0 no se ejerció en el juego simulado:** ninguna consulta al dueño de p1 después de la pista, en ninguno de los dos lotes.
- En el lote 800, la pista se narró en un solo run (r0006-s806) y en el turno 14. La trabada corta en el 15, así que no quedó turno para viajar. En los otros 14 runs no se narró: en 4 el h1 llegó antes (se cruzaron con el dueño de p1), y en el resto la trabada llegó primero o las condiciones de la regla no se dieron.
- Los 2 runs con `_1` revelado no vienen del umbral reducido: no hubo consultas al dueño después de la pista. `_2` sigue en 0.
- La regla nueva de la política está probada en tests, pero en juego no tuvo turnos para actuar. El cuello de botella no es la política: la pista llega entre los turnos 9 y 14, y la trabada del simulador corta en el 15. Tomás decidió no cambiar los 8 turnos del narrador. Para ejercer el umbral en simulación harían falta más turnos de margen del lado del simulador (`--trabada` más alto en un lote de medición) o más runs.

### Lote 20261120-234103-800

| Run | Perfil | Turnos | Pista (NPC @ escena, turno) | Viajes tras la pista | Llegó (turno) | h1 | Conoc. revelados |
|---|---|---|---|---|---|---|---|
| r0000-s800 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0001-s801 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 1 |
| r0002-s802 | seguidor_pistas_dueno | 19 | — | 0 | — | sí | 0 |
| r0003-s803 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0004-s804 | seguidor_pistas_dueno | 19 | — | 0 | — | sí | 0 |
| r0005-s805 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0006-s806 | seguidor_pistas_dueno | 15 | hollis_pastor @ escena_camino_sur, t14 | 0 | — | no | 0 |
| r0007-s807 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0008-s808 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0009-s809 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0010-s810 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0011-s811 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0012-s812 | seguidor_pistas_dueno | 28 | — | 0 | — | sí | 1 |
| r0013-s813 | seguidor_pistas_dueno | 15 | — | 0 | — | no | 0 |
| r0014-s814 | seguidor_pistas_dueno | 24 | — | 0 | — | sí | 0 |
