# Umbral reducido en primer contacto por pista: medición (2026-11-20)

Lote `20261120-231351-700`: `--perfiles seguidor_pistas:10,amable:10 --mezcla 0/100 --seed-base 700 --jugador-ia si --max-llamadas-ia 50`. Narrador de la rama de la PR (`313a175`, 0.0.41, `UMBRAL_PRIMER_CONTACTO_PISTA = 0`), 37 llamadas IA. Comparación con el lote 600 (narrador 0.0.40, sin el cambio).

| Perfil | Lote | Pista narrada | Pista seguida (llegó) | h1 | Runs con _1 | Runs con _2 |
|---|---|---|---|---|---|---|
| seguidor_pistas | 600 | 3 | 2 | 4 | 1 | 2 |
| seguidor_pistas | 700 | 3 | 2 | 3 | 0 | 0 |
| amable | 600 | 10 | 0 | 0 | 3 | 2 |
| amable | 700 | 10 | 0 | 0 | 7 | 7 |

## Resultado
- **El cambio no se activó ni una vez.** Rejugué los 20 runs en modo código con sus entradas, y los 20 terminan con los mismos tags que el registro. Ninguna consulta con tema reveló con relación por debajo del umbral original, y ninguna consulta con tema llegó al dueño de p1 después de la pista.
- Por qué, en los 2 runs que llegaron por la pista:
  - r0008-s708 llega a Camino del este en el turno 12, pero Sarin Tolle ya no está ahí (los NPC se mueven por horario), y la trabada corta en el 15.
  - r0004-s704 encuentra a Sarin en el Camino del norte (h1 en el turno 15). La consulta le sale sin tema ("qué sabés de posada", `no_se`) y después vuelve a la escena nombrada por la pista, donde Sarin ya no está.
- La suba de amable (de 3 a 7 runs con _1 y de 2 a 7 con _2) no viene del cambio: amable no sigue pistas y ninguna de sus revelaciones usó el umbral reducido. Es variación entre seeds.
- Criterio de la fase (útil si sube h1 o _1 sin subir _2): **no se cumple** para seguidor_pistas (h1 de 4 a 3, _1 de 1 a 0). No se insiste con más lotes.
- Hallazgo del lado del simulador, no del narrador: la política de seguidor_pistas va a la escena que nombra la pista aunque el NPC ya se haya ido, y la consulta de tema puede salir sin una palabra clave del conocimiento. Para medir el umbral reducido en serio, haría falta que el perfil busque al NPC donde esté y consulte con una palabra clave de su `_1`. No lo cambié en esta fase.

### Lote 20261120-231351-700

| Run | Perfil | Turnos | Pista (NPC @ escena, turno) | Viajes tras la pista | Llegó (turno) | h1 | Conoc. revelados |
|---|---|---|---|---|---|---|---|
| r0000-s700 | seguidor_pistas | 15 | brenn_arriero @ escena_camino_norte, t12 | 2 | — | no | 0 |
| r0001-s701 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0002-s702 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0003-s703 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0004-s704 | seguidor_pistas | 30 | sarin_mensajera @ escena_camino_este, t14 | 8 | 18 | sí | 0 |
| r0005-s705 | seguidor_pistas | 19 | — | 0 | — | sí | 0 |
| r0006-s706 | seguidor_pistas | 19 | — | 0 | — | sí | 0 |
| r0007-s707 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0008-s708 | seguidor_pistas | 15 | sarin_mensajera @ escena_camino_este, t11 | 3 | 12 | no | 0 |
| r0009-s709 | seguidor_pistas | 15 | — | 0 | — | no | 0 |
| r0010-s710 | amable | 15 | hollis_pastor @ escena_camino_sur, t9 | 0 | — | no | 2 |
| r0011-s711 | amable | 15 | sarin_mensajera @ escena_camino_sur, t10 | 0 | — | no | 1 |
| r0012-s712 | amable | 15 | sarin_mensajera @ escena_camino_este, t11 | 0 | — | no | 2 |
| r0013-s713 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t10 | 0 | — | no | 1 |
| r0014-s714 | amable | 15 | hollis_pastor @ escena_camino_sur, t12 | 0 | — | no | 2 |
| r0015-s715 | amable | 15 | sarin_mensajera @ escena_camino_este, t12 | 0 | — | no | 2 |
| r0016-s716 | amable | 15 | sarin_mensajera @ escena_camino_este, t11 | 0 | — | no | 0 |
| r0017-s717 | amable | 15 | ysolde_pescadora @ escena_lago_espejos, t14 | 0 | — | no | 1 |
| r0018-s718 | amable | 15 | hollis_pastor @ escena_cruce_colinas, t11 | 0 | — | no | 2 |
| r0019-s719 | amable | 15 | sarin_mensajera @ escena_camino_sur, t13 | 0 | — | no | 1 |
