# Comparación de perfiles que siguen pistas (2026-11-20)

Lote `20261120-225453-600`: `--perfiles seguidor_relacional:10,seguidor_pistas:10,amable:10 --mezcla 0/100 --seed-base 600 --jugador-ia si --max-llamadas-ia 60`. Narrador 0.0.40, trabada en 15 turnos, 50 llamadas IA. `validarFrase` ya descarta las frases que empiezan con un token del catálogo.

| Perfil | Runs | Pista narrada | Pista seguida (llegó a la escena) | h1 | Conocimiento _1 revelado | Conocimiento _2 revelado | Algún conocimiento |
|---|---|---|---|---|---|---|---|
| seguidor_relacional | 10 | 3 | 0 | 1 | 2 | 2 | 2 |
| seguidor_pistas | 10 | 3 | 2 | 4 | 1 | 2 | 3 |
| amable | 10 | 10 | 0 | 0 | 3 | 2 | 4 |

## Resultado según el criterio
- El criterio de mejora pedía que seguidor_relacional superara a seguidor_pistas en h1 y en runs con conocimiento revelado. No cumple ninguno de los dos: h1 en 1 run contra 4, algún conocimiento en 2 runs contra 3. Solo en conocimiento _1 queda por arriba (2 contra 1). Con 10 runs por perfil, una diferencia de un run no es significativa.
- **El perfil no mejora.** Queda en `config/perfiles/` para que Tomás decida si lo conserva, lo ajusta o lo quita.
- Causa observada: la pista se narra entre los turnos 9 y 12 y la trabada corta en el 15. seguidor_relacional tiene menos peso de viaje (25 contra 30) y más de favores, así que en los 3 runs con pista hizo como mucho 1 viaje y no llegó antes del corte. Los favores antes de consultar llegan tarde para ese margen.
- seguidor_pistas reveló conocimiento en 3 de 10 runs en este lote, contra 1 de 20 en los lotes 400 y 500. Con esta cantidad de runs, la variación entre lotes es del mismo tamaño que las diferencias entre perfiles.

### Lote 20261120-225453-600

| Run | Perfil | Turnos | Pista (NPC @ escena, turno) | Viajes tras la pista | Llegó (turno) | h1 | Conoc. revelados |
|---|---|---|---|---|---|---|---|
| r0000-s600 | seguidor_relacional | 15 | brenn_arriero @ escena_camino_norte, t11 | 1 | — | no | 2 |
| r0001-s601 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0002-s602 | seguidor_relacional | 15 | hollis_pastor @ escena_cruce_colinas, t9 | 1 | — | no | 2 |
| r0003-s603 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0004-s604 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0005-s605 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0006-s606 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0007-s607 | seguidor_relacional | 15 | sarin_mensajera @ escena_camino_este, t12 | 0 | — | no | 0 |
| r0008-s608 | seguidor_relacional | 15 | — | 0 | — | no | 0 |
| r0009-s609 | seguidor_relacional | 26 | — | 0 | — | sí | 0 |
| r0010-s610 | seguidor_pistas | 30 | hollis_pastor @ escena_camino_sur, t11 | 2 | 15 | sí | 1 |
| r0011-s611 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0012-s612 | seguidor_pistas | 15 | brenn_arriero @ escena_camino_norte, t10 | 1 | — | no | 1 |
| r0013-s613 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0014-s614 | seguidor_pistas | 30 | hollis_pastor @ escena_camino_sur, t14 | 3 | 15 | sí | 1 |
| r0015-s615 | seguidor_pistas | 28 | — | 0 | — | sí | 0 |
| r0016-s616 | seguidor_pistas | 19 | — | 0 | — | sí | 0 |
| r0017-s617 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0018-s618 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0019-s619 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0020-s620 | amable | 15 | brenn_arriero @ escena_camino_norte, t9 | 0 | — | no | 2 |
| r0021-s621 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t9 | 0 | — | no | 0 |
| r0022-s622 | amable | 15 | hollis_pastor @ escena_camino_sur, t10 | 0 | — | no | 1 |
| r0023-s623 | amable | 15 | sarin_mensajera @ escena_camino_sur, t9 | 0 | — | no | 0 |
| r0024-s624 | amable | 15 | sarin_mensajera @ escena_camino_este, t10 | 0 | — | no | 0 |
| r0025-s625 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t11 | 0 | — | no | 0 |
| r0026-s626 | amable | 15 | hollis_pastor @ escena_camino_sur, t10 | 0 | — | no | 1 |
| r0027-s627 | amable | 15 | sarin_mensajera @ escena_camino_este, t12 | 0 | — | no | 1 |
| r0028-s628 | amable | 15 | sarin_mensajera @ escena_camino_este, t11 | 0 | — | no | 0 |
| r0029-s629 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t10 | 0 | — | no | 0 |
