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

## Lote grande de charla (en espera)
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
