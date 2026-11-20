# Pendientes

## Tests en rojo
- Ninguno (2026-11-20).

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

## Charla-npc: costo de subir `--trabada` (2026-11-20)
- Lotes de 10 runs (amable:5, directo:5), modo `ia`, jugador IA encendido, seed-base 400 y tope de 40 llamadas cada uno:

| `--trabada` | Lote | Llamadas IA | Por run | Runs con h1 | Runs con conocimiento | Conocimientos revelados |
|---|---|---|---|---|---|---|
| 15 | `20261120-194300-400` | 20 | 2,0 | 0 | 7 | 8 |
| 25 | `20261120-194310-400` | 32 | 3,2 | 0 | 8 | 13 |

- Decisión (Opus): el default queda en **15**. Con 25 el costo por run sube 1,6× (no llega al doble), pero los hitos h1 no suben (0 y 0). Lo único que sube son revelaciones de Serel en amable (serel_1 y serel_2 en los 5 runs). No se corrió el lote de 30 (seed-base 500), porque estaba condicionado a que subieran los hitos.
- Las llamadas son todas del jugador IA. El narrador no llamó a la IA en ninguno de los dos lotes, así que no hubo textos candidatos.
- Mismo seed no garantiza la misma partida en modo `ia`: las frases del jugador IA vienen de Groq y cambian entre corridas. Por ejemplo, directo r0005 y r0006 revelan maren_1 o serel_1 con 15 y nada con 25.
- Llamadas usadas hoy en esta tarea: 52. Contador del día: 384.

## Limpieza de candidatos (2026-11-20)
- `docs/candidatos/charla-npc-400-frases-agrupadas.json` (lote 400, no 300), `c0002` "consulta_tema coonas": estado `rechazado`, motivo `salida_rota_jugador_ia`. No hay otras frases con token de catálogo en los archivos de frases ni en el contexto de los textos candidatos.
- Hallazgo del simulador, sin corregir: en el lote 400, 18 de las 78 frases del jugador IA empiezan con un token del catálogo. Por ejemplo: "hablar_con Serel Norlen", "consultar_tema precio del pan fresco", `consultar_tema {"tema":"copia del sello"}`. El motor entiende la mayoría, así que inflan el porcentaje de frases entendidas. Propuesta: que `validarFrase` (`src/ia/jugador.js`) descarte las frases con token `palabra_palabra` y cuente esos casos como falla del jugador. Cambia las mediciones del jugador IA, así que queda para decidir.

## Pregunta para Tomás: camino hacia el NPC de la ranura p1
El h1 de cada caso pide la pista del NPC de la ranura p1 (Brenn, Sarin, Ysolde o el sendero, según el caso). Ese NPC no es el que el jugador encuentra al empezar: Serel, en el Mercado. Los perfiles de charla construyen relación con quien tienen delante y no llegan al NPC de p1. ¿El juego tiene que indicar ese camino?
- **a) El juego indica el camino** (una pista visible cerca del primer hito). Costo para el simulador: un perfil o una política nueva que siga pistas (leer la pista, viajar a la escena indicada, construir relación con ese NPC) y un lote para medir cuántos runs llegan al h1. Requiere el cambio de contenido en el narrador, aprobado por Tomás.
- **b) El juego no cambia.** Costo para el simulador: ninguno. Se prueban los perfiles tal cual, y el resultado esperado es que los perfiles de charla sigan cortando por trabada sin h1, salvo el caso_03 con investigador o directo.
- No se implementó ninguna de las dos.

## Pista de camino a p1: medición con la PR del narrador (2026-11-20)
- Narrador en la rama `fix/pista-camino-p1` (sha `719ba5d`, VERSION 0.0.40, [PR #9](https://github.com/Avaloria-debug/Avaloria-narrador/pull/9), sin mergear). La dependencia apunta a ese sha solo para medir; esta rama no se mergea a main hasta que la PR #9 esté aprobada y mergeada. En ese momento hay que pasar el sha a main del narrador y verificar con instalación limpia.
- Lote `20261120-222945-400`: amable:5, directo:5, modo `ia`, jugador IA, seed-base 400, tope de 60 llamadas. Comparación con el lote sin la pista (`20261120-194300-400`):

| | Sin pista (0.0.39) | Con pista (0.0.40) |
|---|---|---|
| Pistas de camino narradas | — | 5 (los 5 amable, turnos 10 a 14; 0 en directo) |
| Runs con h1 | 0 | 0 |
| Runs con conocimiento revelado | 7 | 5 |
| Llamadas IA | 20 | 20 |

- Ejemplo (r0002-s402, turno 11): "Alguien comenta al pasar que Hollis Dren anda por Camino del sur. Tal vez valga la pena ir hasta allá."
- **La pista no alcanza para el h1 con los perfiles actuales.** La causa es la del diagnóstico (`docs/charla-npc/diagnostico-trabada.md`): los perfiles no van hacia el NPC de p1. amable sigue con Serel en el Mercado aunque la narración nombre el lugar, porque las políticas del simulador eligen por pesos y no leen la narración. Además, la pista llega en los turnos 10 a 14 y la trabada corta en el 15, así que queda poco margen para viajar. En directo no apareció: se mueve de escena y no llega a 8 turnos de caso seguidos fuera de la escena del dueño, o el caso todavía no arrancó.
- No se corrió el lote de 30 (seed-base 500), porque estaba condicionado a que hubiera hitos h1.
- Para medir la opción A completa falta, en el simulador, un perfil o política que siga pistas (leer la narración, viajar a la escena nombrada, construir relación con ese NPC). Queda pendiente de decisión.

## Pista de camino a p1: aprobada y en main (2026-11-20)
- Tomás aprobó la [PR #9 del narrador](https://github.com/Avaloria-debug/Avaloria-narrador/pull/9). Se mergeó a main (`9162e84`, VERSION 0.0.40) con estos textos exactos en `textos_pista_camino` de los 4 casos:
  - "Alguien comenta al pasar que {npc:p1} anda por {escena:p1}. Tal vez valga la pena ir hasta allá."
  - "Según dicen por acá, {npc:p1} suele estar en {escena:p1}. Puede que sepa algo de lo que buscás."
- Simulador 0.5.5 en main con el narrador fijado a `9162e84cf4c2a79208a0a7c17d268f25ca687b60`. Reemplaza el sha de la rama de la PR (`719ba5d`) que se usó para medir.
- Pendiente, sin implementar: un perfil o política del simulador que siga pistas (leer la narración de la pista, viajar a la escena nombrada, construir relación con ese NPC y consultarlo). Sin eso, la pista se narra pero los perfiles actuales no llegan al h1 (ver la medición de arriba).

## Perfil seguidor_pistas: medición (2026-11-20)
- Perfil `config/perfiles/seguidor_pistas.json` (objetivo `seguir_pistas`, fuente `narracion`): sigue solo la pista de camino leída en el texto narrado; no mira el estado del caso (test "no adivina la escena" en `tests/seguidor.test.js`).
- Test de perfiles: por decisión de Tomás verifica que estén los 13 de F2, sin cantidad exacta (ver SUPUESTOS).
- Medición: `docs/charla-npc/lote-500/pistas-seguidas.md`. Paso 2 (lote `20261120-224407-400`, 10 runs): 1 pista seguida, 1 h1 de seguidor_pistas. Paso 3 (lote `20261120-224440-500`, 30 runs): 2 pistas seguidas, 5 h1 de seguidor_pistas; amable 0 h1 con la pista narrada en 20 de 20 runs. 74 llamadas IA (contador del día: 478 de 800).
- Cuando la pista aparece, seguidor_pistas la sigue en 3 de 3 runs y alcanza h1. Pero la pista aparece solo en 3 de 20 runs de ese perfil. Hipótesis sin verificar: viaja tanto que suele estar en la escena del dueño de p1 cuando la regla se evalúa.
- Pregunta para Tomás: seguidor_pistas casi no revela conocimientos (1 de 20) porque no construye relación. ¿Se arma un perfil que siga la pista y además construya relación (por ejemplo, la mezcla de seguidor_pistas y amable)?
- Candidatos consolidados de los lotes 300, 400 y 500, todos `pendiente`, sin tocar los de los lotes 100 y 200:
  - `docs/candidatos/charla-npc-300-500-textos.jsonl`: 51 textos (47 del lote 300, 1 del `193756-400`, 1 del `224407-400`, 2 del 500). Sin duplicados ni repetidos de los decididos. Cada uno lleva `lote` e `idOriginal`.
  - `docs/candidatos/charla-npc-300-500-frases-agrupadas.json`: 17 frases del jugador IA de los 5 lotes 400 y del 500. Contra todas las frases agrupadas existentes, se excluyeron 58 salidas rotas del jugador IA (tokens de catálogo como `hablar_con Serel Norlen` o `consulta_tema …`, ids o JSON).
  - Reemplazan para la revisión a `charla-npc-300-textos.jsonl`, `charla-npc-400-textos.jsonl` y `charla-npc-400-frases-agrupadas.json`. Esos archivos no se borraron (quedan como fuente); su c0002 rechazado (`consulta_tema coonas`) no pasa al consolidado.

## seguidor_relacional y limpieza del jugador IA (2026-11-20, decisiones de Opus en nombre de Tomás; Tomás puede revertirlas)
- `validarFrase` (`src/ia/jugador.js`) descarta las frases que empiezan con un token del catálogo (`hablar_con …`, `consultar_tema …`, `[intencion_x] …`). En las 221 frases de los lotes 300-500, las válidas pasan de 100 % a 72,9 %. Quedan 3 frases con el token en el medio (por ejemplo "Voy a hablar_con Serel Norlen."), fuera del criterio pedido.
- Se armó `config/perfiles/seguidor_relacional.json`: sigue la pista narrada y, al llegar, hace 2 favores (ayudar o calmar) al NPC antes de consultar. El motivo está en SUPUESTOS.
- Medición (lote `20261120-225453-600`, 10 runs por perfil, 50 llamadas IA; detalle en `docs/charla-npc/lote-600/comparacion-perfiles.md`):
  - seguidor_relacional: 0 pistas seguidas, h1 en 1 run, _1 en 2, _2 en 2.
  - seguidor_pistas: 2 de 3 pistas seguidas (corregido: eran 3 narradas, no 4), h1 en 4, _1 en 1, _2 en 2.
  - amable: 0 pistas seguidas, h1 en 0, _1 en 3, _2 en 2.
- Resultado: seguidor_relacional **no mejora** a seguidor_pistas ni en h1 ni en runs con conocimiento revelado. La pista se narra entre los turnos 9 y 12 y la trabada corta en el 15; con menos viaje y más favores, el perfil no llega a tiempo.
- Para Tomás: conservar, ajustar (más peso de viaje o 1 favor) o quitar el perfil. Medirlo con `--trabada 25` daría margen para llegar, pero subir `--trabada` ya mostró costo en la medición anterior. No se lanzó nada más (contador del día: 528 de 800).
- Actualización (2026-11-20): `seguidor_relacional` se quitó (perfil, test y modo `alLlegar`). Motivo en SUPUESTOS. Para recuperarlo: commit a9d8a48.

## Brecha de conocimientos amable vs seguidor_pistas: verificación con datos existentes (2026-11-20, sin llamadas IA)
- Datos: los lotes donde corrieron los dos perfiles con el narrador 0.0.40 (`20261120-224407-400`, `20261120-224440-500`, `20261120-225453-600`), 30 runs por perfil. Consulta de tema a Serel = turno con `consulta.npcId = serel_panadero`; revela = `resultado: exito`.
- a) amable: 54 consultas a Serel en 25 de 30 runs; 13 revelaron (en 11 runs). 23 negativas por relación (`umbral`) y 7 `no_se`.
- b) seguidor_pistas: 15 consultas a Serel en 9 de 30 runs; 0 revelaron. Las 15 fueron negativas por relación.
- c) Relación con Serel en la primera consulta (rejuego, 34 de 34 runs coinciden):
  - amable: mediana 15, media 16,4, rango -15 a 50; positiva en 19 de 25 runs; primera consulta en el turno 6 (mediana).
  - seguidor_pistas: mediana 0, media 1,1, rango -5 a 10; positiva en 2 de 9 runs; primera consulta en el turno 1 (mediana).
- Conclusión: la brecha se explica por las dos cosas. seguidor_pistas consulta a Serel unas 3,6 veces menos (15 contra 54). Además consulta antes de construir relación: el 100 % de sus consultas choca con el umbral, contra el 43 % de amable. Aunque consultara lo mismo, con relación 0 no revelaría nada. La relación al consultar es la causa decisiva; el número de consultas la amplifica.
- No es solo un efecto del número de consultas, así que no queda como hallazgo puro de pesos. Ya se probó en el lote 600 un perfil que construye relación antes de consultar, y no mejoró en el margen de 15 turnos de la trabada. El perfil ya se quitó.

## Estado de la etapa de perfiles (2026-11-20)
- Quedan: los 13 perfiles de F2 y `seguidor_pistas` (sigue la pista de camino leída en la narración; en los lotes 400, 500 y 600 la siguió 5 de 6 veces que apareció; la restante la cortó la trabada). El test de perfiles exige que estén los 13 de F2, sin cantidad exacta.
- Se quitó: `seguidor_relacional` (y el modo `objetivo.alLlegar`), porque no mejoró en el lote 600.
- Se agregó: `validarFrase` descarta frases del jugador IA que empiezan con un token del catálogo, y el adaptador expone `relaciones()` (solo lectura, para análisis).
- Preguntas abiertas para Tomás (decisiones de diseño del juego):
  1. Relación contra pista: la pista de camino lleva al jugador al dueño de p1, pero ese NPC no revela con relación baja (umbral 30 a 50 para `_1`), y en 15 turnos no da el tiempo para construirla. ¿El h1 alcanzado por la pista debería bajar el umbral de ese NPC o dar relación, o se espera que el jugador vuelva más tarde?
  2. Momento de la pista: se narra a los 8 turnos sin avance (turnos 9 a 12 en los lotes), y deja pocos turnos antes de los 15 de trabada. ¿El valor 8 es el buscado para un jugador real, que suele tener más paciencia que el simulador?

## Umbral reducido en primer contacto por pista (2026-11-20, pendiente de aprobación de Tomás)
- [PR del narrador #10](https://github.com/Avaloria-debug/Avaloria-narrador/pull/10), sin mergear, VERSION 0.0.41. Valor propuesto: `UMBRAL_PRIMER_CONTACTO_PISTA = 0` (`narrador/conocimientos.js:78`). Rige solo para el `_1` del dueño de p1 y solo en la primera consulta con tema a ese NPC después de la pista. El `_2` no cambia.
- El simulador está fijado al sha de la rama de la PR (`313a175fdc7bc80d7b0e99c95db43d75c7cda254`) solo para medir. **No mergear esta rama del simulador a main hasta que la PR del narrador esté aprobada y mergeada.** Después, fijarlo al sha de main del narrador.
- Medición (lote 700 contra lote 600, detalle en `docs/charla-npc/lote-700/umbral-primer-contacto.md`):
  - seguidor_pistas: pistas seguidas 2 de 3 en los dos lotes; h1 de 4 a 3; runs con `_1` de 1 a 0; runs con `_2` de 2 a 0.
  - amable: h1 0 en los dos; `_1` de 3 a 7 y `_2` de 2 a 7, por variación entre seeds y no por el cambio.
- El umbral reducido no se activó en ningún run: ninguna consulta con tema llegó al dueño de p1 después de la pista. El cambio no queda probado ni refutado; la medición no lo ejercitó. 37 llamadas IA (contador del día: 565 de 800).

## Umbral de primer contacto aprobado y en main (2026-11-20)
- Tomás aprobó la [PR #10 del narrador](https://github.com/Avaloria-debug/Avaloria-narrador/pull/10) con umbral 0 (`UMBRAL_PRIMER_CONTACTO_PISTA = 0`). Se mergeó a main del narrador: `0a9b9158ff91d74b455c493416084cdb3858ef99`, VERSION 0.0.41, `npm test` en verde (1753 tests).
- Simulador: narrador fijado a `0a9b9158ff91d74b455c493416084cdb3858ef99` (reemplaza el sha de la rama de la PR, `313a175`). El lock solo cambia el narrador; la versión del simulador sigue en 0.5.5. El sha de main del simulador queda en el merge de la PR que trae este cambio.
- Pendiente del simulador: el lote 700 no ejercitó el umbral reducido. Para medirlo, la política de `seguidor_pistas` tiene que buscar al dueño de p1 donde esté (los NPC se mueven por horario, la escena de la pista puede quedar vieja) y preguntarle con una palabra clave de su `_1`. Sin implementar.

## Buscar al dueño de p1 (2026-11-20, rama claude/perfil-busca-dueno-p1)
- Implementado (decisión de Opus en nombre de Tomás; el motivo está en SUPUESTOS):
  - El adaptador expone, de solo lectura, `detalle().posicionesNpcs` (escena de cada NPC en el turno) y `palabrasClaveDel1(npcId)`.
  - La política suma el modo `buscar_dueno_p1`: con la pista narrada viaja a donde está ese NPC en ese turno. Ya con él, le hace una consulta por texto, nombrándolo, con una palabra clave de su `_1`, una sola vez; después sigue como `seguir_pistas`.
  - Perfil gemelo `seguidor_pistas_dueno`, para no cambiar el esperado de los tests de `seguidor_pistas`.
  - Tests en `tests/buscar-dueno.test.js`.
- Medido (lote `20261120-234103-800`, 15 runs, 22 llamadas IA; detalle en `docs/charla-npc/lote-800/buscar-dueno.md`):
  - Pistas narradas 1 (en el turno 14), seguidas 0.
  - Consultas al dueño de p1 después de la pista: 0.
  - h1 en 4 runs, `_1` en 2, `_2` en 0.
  - Contra el lote 700: consultas al dueño 0 y 0; `_1` 0 y 2; `_2` 0 y 0.
- **El umbral 0 no se ejerció en juego simulado.** La pista se narra tarde (turnos 9 a 14) para una trabada de 15. Pregunta para Tomás: ¿se mide con `--trabada 25` solo para este caso? Sería un lote chico; el costo de subir `--trabada` ya está medido.
- Contador IA del día: 587 de 800.

## Etapas del 2026-11-20 (rama claude/margen-trabada-y-etapas; decisiones de Opus en nombre de Tomás)

### Etapa 1: umbral 0 con margen de turnos
- Decisión: correr un lote con `--trabada 25`. En el lote 800 la pista llegó en el turno 14 con la trabada en el 15 y 2 viajes por delante; con 25 quedaban 11 turnos. El motivo está en SUPUESTOS.
- Lote `20261120-235036-800` (`seguidor_pistas_dueno:12,amable:6`, 30 llamadas). Detalle en `docs/charla-npc/lote-800-trabada25/umbral-ejercido.md`.
  - 2 consultas al dueño de p1 después de la pista, ninguna revela:
    - Turno 19, relación 0: `no_se` por evento. Pasó el umbral 0, pero el `_1` de Hollis pide la tormenta de verano.
    - Turno 37, relación 5: `fallo` por umbral. Volvió el umbral original de 30.
  - **El umbral 0 se ejerció**, aunque no se pudo ver una revelación por él.
  - El tope de 30 llamadas cortó los 6 runs de amable (cierre `cuota`, sin reanudar).
- Preguntas para Tomás:
  1. ¿La marca de primer contacto debería quedar sin usar cuando la consulta no revela por evento o por marca, y no por relación?
  2. El h1 narra el contenido del `_1` ("Un sendero sin vigilancia en las colinas") sin marcarlo revelado, y la consulta siguiente responde "no sabe nada". ¿El h1 debería marcar el conocimiento como revelado?

### Etapa 2: candidatos
- `docs/candidatos/charla-npc-300-800-textos.jsonl` (60 textos) y `charla-npc-300-800-frases-agrupadas.json` (29 frases). Todos pendientes, con un resumen por intención y por tipo en `docs/candidatos/charla-npc-300-800-resumen.md`.
- Reemplazan a los archivos 300-500, que son un subconjunto: los mismos ids y textos.
- Se descartaron 64 salidas rotas del jugador IA. **89 pendientes de revisión de Tomás.**

### Etapa 3: costo del simulador (con los registros existentes, sin llamadas nuevas)
Llamadas IA por run en modo `ia`, sin contar los runs cortados por cuota. "Narrador" es la IA de última instancia; "jugador" son los pedidos al jugador IA (frases más fallas).

| Perfil | Trabada | Jugador IA | Runs medidos | Narrador/run | Jugador/run | Total/run | Runs en 800 llamadas |
|---|---|---|---|---|---|---|---|
| seguidor_pistas_dueno | 15 | sí | 15 | 0,00 | 1,47 | 1,47 | ~544 |
| seguidor_pistas_dueno | 25 | sí | 12 | 0,17 | 2,33 | 2,50 | ~320 |
| seguidor_pistas | 15 | sí | 40 | 0,20 | 2,35 | 2,55 | ~313 |
| amable | 15 | sí | 83 | 0,06 | 1,70 | 1,76 | ~454 |
| amable | 15 | no | 40 | 0,07 | 0,00 | 0,07 | (sin límite práctico) |
| primerizo | 15 | sí | 9 | 2,22 | 1,78 | 4,00 | ~200 |
| primerizo | 15 | no | 40 | 0,90 | 0,00 | 0,90 | ~888 |

- Con 4 keys de Groq la capacidad configurada es de 1000 llamadas por día (250 por key); el tope de trabajo es 800. Un lote mixto con jugador IA y trabada 15, en tercios de seguidor_pistas_dueno, amable y primerizo, cuesta unas 2,4 llamadas por run: **~330 runs por día**. Sin jugador IA, el costo baja a ~0,3 por run.
- El costo lo domina el jugador IA (`ia.p` 0,1 por turno), no el narrador. Subir `--trabada` sube el costo en proporción a los turnos.
- La muestra de primerizo con jugador IA es chica (9 runs): tomarla como orden de magnitud.

### Qué sigue
- Revisión de Tomás de los 89 candidatos.
- Las 2 preguntas de la etapa 1, que son de diseño del narrador: no se implementó nada.
- Sin lotes nuevos hasta tener esas decisiones. Contador IA del día: 617 de 800.

## Decisiones de primer contacto y revelado por el h1 (2026-11-20, pendiente de aprobación de Tomás)
Decisiones de Opus en nombre de Tomás. Criterio: el jugador no debe sentir que el juego lo castiga por algo que no dependió de él, y el texto narrado no se puede contradecir con la respuesta siguiente. Los motivos están en `docs/SUPUESTOS-v3.md` del narrador.
1. **El hito revela el conocimiento que narra.** Si el texto del h1 (o de cualquier hito) narra `{conocimiento:pN}`, el conocimiento queda revelado. La consulta siguiente de un conocimiento ya revelado repite lo contado con la plantilla `revelar_conocimiento.exito`, que ya existe; antes usaba "no te cuenta nada nuevo por ahora". Motivo: la respuesta no puede contradecir lo que el jugador acaba de leer.
2. **El primer contacto por pista solo se consume si la consulta revela o falla por relación.** Un bloqueo por evento o por marca no lo gasta. Motivo: el bloqueo por un evento no depende del jugador.
- [PR del narrador #11](https://github.com/Avaloria-debug/Avaloria-narrador/pull/11), VERSION 0.0.42, **sin mergear: pendiente de tu aprobación.** No se cambiaron textos de `data/`: los textos del h1 siguen igual.
- Rama del simulador `claude/decisiones-primer-contacto`: narrador fijado al sha de la PR (`03ea2f0a5e62fcc01df91b935c0fa1934d4dda74`) solo para verificar. **No mergear hasta que la PR esté aprobada;** después, fijarlo a main del narrador.
- Verificación:
  - r0006-s806 se rejugó sin IA con sus entradas registradas, sobre el narrador de la PR.
    - Turno 19: antes "Hollis Dren se encoge de hombros: de eso no sabe nada."; ahora "Hollis Dren baja la voz y te cuenta: Un sendero sin vigilancia en las colinas."
    - Turno 37: antes "Hollis Dren no te cuenta nada nuevo por ahora."; ahora "Después de un rato, Hollis Dren te dice: Un sendero sin vigilancia en las colinas."
  - El lote pedido, `20261120-235915-800` (`seguidor_pistas_dueno:6`, seed-base 800, `--trabada 25`, 19 llamadas), corre las seeds 800 a 805 y no incluye a r0006. En él:
    - h1 en 3 runs, y en los 3 el conocimiento de p1 quedó revelado.
    - 0 pistas narradas y 0 consultas al dueño después de la pista.
    - Una consulta `ya_revelado` (r0003, Tiren) respondió con lo contado.
- Hallazgos para Tomás:
  - El h1 deja revelado el `_1` de Hollis aunque ese conocimiento pida la tormenta de verano: el hito ya lo narró.
  - Varios conocimientos del contenido terminan en punto y las plantillas de revelar agregan otro, lo que deja ".." (por ejemplo, "…la primera hora.."). Aparece en 75 turnos de los lotes de hoy y es anterior a este cambio, que lo hace más visible. Se corrige en `contenido-v3.json` o en el completado de plantillas; las dos cosas son del narrador. No se tocó.
- Contador IA del día: 636 de 800.
