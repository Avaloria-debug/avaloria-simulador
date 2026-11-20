# Pendientes

## Tests en rojo
Ninguno (F1).

## Hallazgos F2 (no son tests en rojo)

### Perfil `curioso` sin hitos (lote `--perfiles curioso:20,aventurero:20,investigador:20 --seed-base 1`)
- Pesos: consulta_tema 40, hablar_con 25, examinar 10, observar 10, leer 8, explorar 4, viajar 3. Objetivo `agotar_conocimientos` (sesgo 3), pBoton 0.2.
- Resultado: 0/20 runs con hito, `pista_conocida` escrita 0 veces, 20 cierres por trabada en el turno 15.
- Trabada más cercana: `r0003-s4` (caso_04), turno 15, escena `escena_archivo_real`, tags `curiosidad|serel_panadero|2`, `curiosidad|maren_archivista|2` (el único run que salió del Mercado). Los otros 19 cortan en el turno 15 en `escena_mercado_circular` con `curiosidad|serel_panadero|2`.
- Causa observada: las consultas de tema con relación 0 no revelan (`umbralRelacion` de los conocimientos `_1`: 30 a 50), así que no hay `preguntar_clave` con éxito ni `pista_conocida`. Con palabras clave sin preguntar, el objetivo saca `viajar`, y el perfil casi no se mueve de la escena inicial.

### Otros perfiles sin hitos (lote mixto de 100 runs, 7-8 runs por perfil, `--seed-base 1`)
| Perfil | Pesos | Runs con hito | pista_conocida |
|---|---|---|---|
| amable | ayudar 30, hablar_con 25, calmar_la_situacion 15, consulta_tema 10, negociar 10, comprar 5, trabajar 5 | 0/8 | 0 |
| comerciante | comprar 30, negociar 20, hablar_con 15, viajar 15, usar 10, trabajar 10 | 0/8 | 10 |
| sigiloso | ocultarse 20, avanzar_cautela 20, observar 20, emboscar 15, distraer 10, examinar 10, viajar 5 | 0/8 | 1 |
| torpe | todos 1 | 0/7 | 0 |
| adversarial | todos 1 | 0/7 | 0 |
| primerizo | hablar_con 25, examinar 15, observar 15, explorar 15, viajar 10, leer 10, consulta_tema 10 | 0/7 | 0 |
| investigador (en el mixto; en el lote de verificación 4/20) | consulta_tema 30, examinar 20, leer 15, hablar_con 15, observar 10, viajar 10 | 0/8 | 1 |
Todos cortan por trabada en el turno 15 (umbral 15). Muestra chica: hallazgo a confirmar con más runs.

## Verificación pendiente de F2
- Paciencia con negativa por relación: el test actual (`tests/decisiones.test.js`) prueba el contador `siguientesFallos` con una secuencia armada a mano. Falta un test con un run real en el que un NPC se niegue por relación (motivo `umbral` del narrador) y el run no cierre por abandono.


## Revisión de candidatos (charla-npc lote 200)
- `t00002` (`docs/candidatos/charla-npc-200-textos.jsonl`, run `r0019-s219`, turno 9): "No lo sé, pero el humo ya se siente." Estado: editar. Nota: solo si `evento_incendio_puesto` activo en `escena_mercado_circular`. En la reejecución en modo código (seed 219) el incendio figura activo en ese turno, pero el texto de IA no se reproduce. Desde narrador 0.0.39 la IA rechaza humo, fuego, incendio, llamas o quemar sin incendio activo en la escena.
- El resto de los candidatos de esa revisión: ver "Revisión de textos de charla (2026-11-20)".

## Verificación opcional: fuego con IA
- Opcional, no se corre por ahora. Sería reejecutar `r0019-s219` en modo `ia` para ver la respuesta de Groq con el narrador 0.0.39. No se justifica gastar cuota: la validación (humo, fuego, incendio, llamas, quemar sin `evento_incendio_puesto` activo en la escena → plantilla de respaldo) la cubren los 6 tests de `narrador/fuegoIa.test.js`. El lote de 6 runs en modo código (seed-base 100, primerizo:3, curioso:3) tuvo 0 menciones de fuego en 90 turnos, con el incendio activo en 12 de ellos; en modo código no hay texto de IA.

## Lote grande de charla (corrido el 2026-11-20, ver tanda abajo)
- Comando: `node src/cli.js --runs 240 --perfiles curioso:60,investigador:60,amable:40,primerizo:40,directo:40 --mezcla 0/100 --seed-base 300 --max-llamadas-ia 800`.
- Estimación (`--estimar`, 2026-11-20): 240 runs `ia`, ~1200 llamadas (narrador 1200, jugador 0), ~672 000 tokens.
- Capacidad tomada: 800 llamadas por día con 4 keys. La configuración calcula 1000 (250 por key); se usa 800 como margen.
- 1200 > 800: necesita 2 días de cuota. Puede correr desde el 2026-11-21: 800 llamadas ese día; el 2026-11-22, `--reanudar <loteId>` para las ~400 restantes. El 2026-11-20 ya se usaron 206 llamadas.
- Sin `--max-llamadas-ia 800`, el tope por defecto (300) cierra el lote por `cuota` antes.

## Estado del merge
- Rama `claude/wonderful-sagan-4s2j9m` mergeada a `main` con narrador `e10c0e8` (0.0.39), simulador 0.5.4, 64 tests en verde.
- Sin decisiones de Tomás que bloqueen el merge. Las aprobaciones de textos de charla se resolvieron el 2026-11-20 (ver abajo).

## Revisión de textos de charla (2026-11-20)
- La decidió Opus en nombre de Tomás, por falta de tiempo de Tomás. Usó los criterios propuestos en la revisión de candidatos. Tomás puede revertir cualquier decisión: basta con volver el `estado` a `pendiente` y borrar `textoEditado`.
- `charla-npc-textos.jsonl` (lote 100):
  - Aprobados: t00001, t00003, t00006.
  - Editados: t00002 (sin "No sé de otro asunto."), t00007 ("¿Y por qué debería contarte algo?").
  - Rechazados: t00004, t00005, t00008.
- `charla-npc-200-textos.jsonl` (lote 200):
  - Aprobado: t00001.
  - Editados: t00003 (sin el "»"; también se quitó el punto que quedaba después del "?"), t00004 ("¿Qué necesitás, viajero? ¿Pan, o saber los precios?").
  - Rechazado: t00005.
  - t00002 sigue `editar`, condicionado al incendio (ver arriba).
- El texto original no se tocó; la versión corregida está en `textoEditado`. La frase nueva del ítem 14 ya estaba rechazada.
- Nada de esto entra al narrador sin una exportación aparte.

## Lote grande de charla: tanda del 2026-11-20
- Lote `20261120-193218-300`, lanzado con `--max-llamadas-ia 500`: 240 runs, curioso:60, investigador:60, amable:40, primerizo:40, directo:40, modo `ia`, seed-base 300.
- No se pudo consultar el uso en console.groq.com (pide iniciar sesión). Se tomó el dato local: 206 llamadas ya usadas, 594 disponibles.
- Resultado: los 240 runs completos en una sola tanda, con 47 llamadas y 28 670 tokens reales (el contador local quedó en 253 llamadas del día). La estimación (5 llamadas por run, ~1200) era un techo: en la práctica hubo ~0,2 llamadas por run, así que no hizo falta el segundo día.
- Pendientes: 0. No hay nada que reanudar. Si hiciera falta, el comando es `node src/cli.js --reanudar 20261120-193218-300 --max-llamadas-ia 800`, y no correría ningún run. Reset de cuota: el contador local cambia a las 00:00 UTC (21:00 en Argentina). El reinicio real de Groq no está verificado.
- Cierres: 240 por `trabada` (turno 15 a 17). Ningún desenlace, `maxTurnos`, `cuota` ni excepción. Es el mismo hallazgo de F2: los perfiles de charla no avanzan hitos con la relación inicial.
- Fuego: de los 47 textos de IA, ninguno menciona humo, fuego, incendio, llamas ni quemar, y no hubo rechazos `fuego_sin_evento`. En ningún turno IA estaba activo el incendio.
- Informe: `docs/charla-npc/lote-300/informe-charla.md` (y `.json`). Textos candidatos: `docs/candidatos/charla-npc-300-textos.jsonl` (47, todos pendientes).

## Charla-npc: lote con relación construida y jugador IA (2026-11-20)
- Diagnóstico: `docs/charla-npc/diagnostico-trabada.md`. El h1 de cada caso depende del NPC de la ranura p1, que nunca es Serel. amable construye relación solo con Serel, y curioso no construye relación. Sin hito en 15 turnos, el run corta por trabada.
- Decisión (Opus, sin tocar el juego): opción **b**, amable y directo con jugador IA. Motivo:
  - Son los perfiles que ya revelan conocimientos en el lote 300: amable serel_1 26/40; directo maren, serel y tiren, y además sale de la escena.
  - El jugador IA trae frases libres que ejercitan comprensión e IA.
  - No requiere código nuevo ni un escenario artificial.
- Lote `20261120-193756-400`, seed-base 400, `--perfiles amable:20,directo:20 --mezcla 0/100 --jugador-ia si --max-llamadas-ia 300`. Con 60+60 la estimación daba 840; se redujo a 40 runs (estimación 280). Se usaron 79 llamadas (78 del jugador, 1 del narrador) y 31 183 tokens. El contador del día quedó en 332.
- Cierres: 40 trabada (turnos 15 a 22). 0 desenlace, maxTurnos, cuota y excepción. Hitos: 3 h1 (directo, caso_03).
- Conocimientos revelados: amable serel_1 14/20, serel_2 9/20; directo maren_1 2, maren_2 2, serel_1 2, brenn_1 1. Nuevo respecto al lote 300: `conocimiento_brenn_1` (r0035-s435, directo, caso_04), que es p1 en caso_01. No apareció ningún `_2` nuevo.
- Candidatos (pendientes, nada aprobado):
  - `docs/candidatos/charla-npc-400-textos.jsonl`: 1 texto.
  - `docs/candidatos/charla-npc-400-frases-agrupadas.json`: 4 frases no entendidas, sin duplicar los 94 candidatos existentes.
  - Una de las frases ("consulta_tema coonas") parece salida rota del jugador IA, no una frase real.
- Hallazgo: el motor entendió 73 de las 78 frases del jugador IA (ejecuta 30, consulta 25, negativa_relacion 18). Solo 1 llegó a la IA del narrador, así que este diseño genera pocos textos de diálogo.
- Alternativas no corridas:
  - **a)** Relación inicial alta para los NPC, solo en el simulador y como escenario de prueba. Mide la charla profunda, pero no lo que vive el jugador real, y requiere código en el adaptador.
  - **c)** a + b en dos tandas separadas en el informe.
  - Además: subir `--trabada` (por ejemplo a 40) para que los perfiles alcancen a salir del Mercado y construir relación con el NPC de p1. Es un parámetro del simulador, no del juego.
