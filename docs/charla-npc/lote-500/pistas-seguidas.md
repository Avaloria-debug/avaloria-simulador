# Pistas de camino seguidas — perfil seguidor_pistas (2026-11-20)

Narrador 0.0.40 (sha 9162e84), simulador 0.5.5. Modo ia con jugador IA, trabada en 15 turnos.
- Paso 2: `--perfiles seguidor_pistas:5,amable:5 --seed-base 400 --max-llamadas-ia 60` → lote `20261120-224407-400`, 22 llamadas IA.
- Paso 3: `--perfiles seguidor_pistas:15,amable:15 --seed-base 500 --max-llamadas-ia 120` → lote `20261120-224440-500`, 52 llamadas IA.

La pista se detecta leyendo el texto narrado con `leerPistaCamino` (los dos textos aprobados de `textos_pista_camino`). "Llegó" es el primer turno en la escena nombrada.

## Resumen

| Perfil | Runs | Con pista narrada | Siguieron la pista (llegaron) | h1 | Con conocimiento revelado |
|---|---|---|---|---|---|
| seguidor_pistas (paso 2) | 5 | 1 | 1 | 1 | 0 |
| seguidor_pistas (paso 3) | 15 | 2 | 2 | 5 | 1 |
| amable (paso 2) | 5 | 5 | 0 | 0 | 4 |
| amable (paso 3) | 15 | 15 | 0 | 0 | 11 |

## Hallazgos
- Cuando aparece la pista, seguidor_pistas la sigue siempre: 3 de 3 runs llegan a la escena nombrada 1 o 2 turnos después y alcanzan h1 (r0001-s401, r0002-s502, r0005-s505). Esos runs duran 25 a 29 turnos: el h1 reinicia el contador de trabada.
- amable recibe la pista en 20 de 20 runs y no viaja nunca: se queda con el NPC del Mercado. Es el comportamiento esperado de un perfil que no lee la narración.
- seguidor_pistas recibe la pista en pocos runs (3 de 20). En 3 runs del paso 3 llegó a h1 sin pista (r0011, r0012, r0014): viaja mucho (peso 30) y encuentra al dueño de p1 por su cuenta. Hipótesis sin verificar para los 14 runs restantes: la regla del narrador no da la pista si el jugador está en la escena del dueño de p1 en ese turno, y un perfil que viaja tanto a veces pasa por ella sin entregar el hito.
- seguidor_pistas casi no revela conocimientos (1 de 20, contra 15 de 20 de amable): no construye relación. Un perfil que combine las dos cosas es una decisión para Tomás.

### Lote 20261120-224407-400

| Run | Perfil | Turnos | Pista (NPC @ escena, turno) | Viajes tras la pista | Llegó (turno) | h1 | Conoc. revelados |
|---|---|---|---|---|---|---|---|
| r0000-s400 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0001-s401 | seguidor_pistas | 29 | ysolde_pescadora @ escena_lago_espejos, t11 | 5 | 13 | sí | 0 |
| r0002-s402 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0003-s403 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0004-s404 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0005-s405 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t11 | 0 | — | no | 0 |
| r0006-s406 | amable | 15 | hollis_pastor @ escena_camino_sur, t10 | 0 | — | no | 2 |
| r0007-s407 | amable | 15 | sarin_mensajera @ escena_camino_este, t10 | 0 | — | no | 2 |
| r0008-s408 | amable | 15 | brenn_arriero @ escena_camino_norte, t11 | 0 | — | no | 2 |
| r0009-s409 | amable | 15 | ysolde_pescadora @ escena_camino_norte, t9 | 0 | — | no | 1 |

### Lote 20261120-224440-500

| Run | Perfil | Turnos | Pista (NPC @ escena, turno) | Viajes tras la pista | Llegó (turno) | h1 | Conoc. revelados |
|---|---|---|---|---|---|---|---|
| r0000-s500 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0001-s501 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0002-s502 | seguidor_pistas | 25 | hollis_pastor @ escena_camino_sur, t9 | 4 | 10 | sí | 0 |
| r0003-s503 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0004-s504 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0005-s505 | seguidor_pistas | 29 | ysolde_pescadora @ escena_lago_espejos, t12 | 5 | 14 | sí | 1 |
| r0006-s506 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0007-s507 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0008-s508 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0009-s509 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0010-s510 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0011-s511 | seguidor_pistas | 22 | — | 0 | — | sí | 0 |
| r0012-s512 | seguidor_pistas | 21 | — | 0 | — | sí | 0 |
| r0013-s513 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0014-s514 | seguidor_pistas | 29 | — | 0 | — | sí | 0 |
| r0015-s515 | amable | 15 | sarin_mensajera @ escena_camino_este, t13 | 0 | — | no | 0 |
| r0016-s516 | amable | 15 | brenn_arriero @ escena_camino_norte, t9 | 0 | — | no | 0 |
| r0017-s517 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t12 | 0 | — | no | 2 |
| r0018-s518 | amable | 15 | hollis_pastor @ escena_camino_sur, t11 | 0 | — | no | 1 |
| r0019-s519 | amable | 15 | sarin_mensajera @ escena_camino_este, t14 | 0 | — | no | 2 |
| r0020-s520 | amable | 15 | sarin_mensajera @ escena_camino_este, t11 | 0 | — | no | 2 |
| r0021-s521 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t9 | 0 | — | no | 1 |
| r0022-s522 | amable | 15 | hollis_pastor @ escena_camino_sur, t11 | 0 | — | no | 2 |
| r0023-s523 | amable | 15 | sarin_mensajera @ escena_camino_este, t12 | 0 | — | no | 0 |
| r0024-s524 | amable | 15 | brenn_arriero @ escena_camino_norte, t11 | 0 | — | no | 0 |
| r0025-s525 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t10 | 0 | — | no | 1 |
| r0026-s526 | amable | 15 | hollis_pastor @ escena_camino_sur, t13 | 0 | — | no | 2 |
| r0027-s527 | amable | 15 | sarin_mensajera @ escena_camino_este, t10 | 0 | — | no | 2 |
| r0028-s528 | amable | 15 | brenn_arriero @ escena_camino_norte, t12 | 0 | — | no | 1 |
| r0029-s529 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t10 | 0 | — | no | 2 |
