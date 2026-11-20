# Supuestos

- SUPUESTO: el narrador no tiene función pública para iniciar un caso. El adaptador arma `estado.caso` como en `narrador/casosIntegracion.test.js`: `{casoId, instancia: armarInstancia(caso, {}, seed, {contenido}), tags:[], contadorHitos:0, hitoPrevio:{id:null, hora:8, escena:<escena inicial>, contador:0}, hitosAlcanzados:[], hitosListos:[], hitosBloqueados:[]}` y pasa `casos.json` en `opciones.casos`.
- SUPUESTO: la escena inicial es siempre `reglas.escenaInicial`, aunque no esté en `escenas_origen` del caso.
- SUPUESTO: niveles de botón: nivel 1 = intención sin parámetros; nivel 2 = intención con un NPC, objeto o destino presente (según el texto de `intencion.parametros` y `viajar`).
- SUPUESTO: `regla` = `motivo` de `ejecutarTurno` (solo en reformulaciones); el narrador no expone la regla aplicada, en el resto es `null`.
- SUPUESTO: `resultado`: accion→`ejecuta`; consulta/saludo/reconocimiento→`consulta`; reformular→`reformula`; ia (sin IA) y error de entrada→`no_entendido`; `ia` solo si `narrar` devuelve `dialogo_ia`.
- SUPUESTO: `textoId` = id del texto de hito usado en el turno (`caso.textosUsados`); las plantillas de narración no exponen id, entonces `null`.
- SUPUESTO: `narrar` no lanza; un `error_interno` en `errores` se trata como excepción del run.
- SUPUESTO: si ya existe la carpeta del `loteId` (dos lotes en el mismo segundo), se agrega `-2`, `-3`…
- SUPUESTO: `seedBase` también se valida como entero > 0.
- SUPUESTO: el texto de la política aleatoria es `forma + nombre` (70%) o solo `forma` (30%); el parámetro se elige entre NPC presentes, objetos y la escena actual.
- SUPUESTO: el rng de la política es `mulberry32(seed ^ 0x9e3779b9)` y el `Math.random` del run es `mulberry32(seed ^ 0x5eed)`; `Date.now` = 2026-01-01T12:00Z + contador.
- SUPUESTO: `tags[]` del estado y `tagsEscritos/Borrados` se expresan como `tipo|objetivo|nivel`; `tagsEscritos` en `runs.jsonl` es la cantidad.

## F2
- SUPUESTO: la política aleatoria de F1 (`aleatoria` en `src/politicas.js`) queda sin cambios como línea base; el perfil `aleatorio` usa la política por perfil con la tabla de FASES.md (todos los verbos peso 1, pBoton 0.5). Sin `--perfiles` se usa el perfil `aleatorio` con `runs` agentes.
- SUPUESTO: disponibilidad de una acción: `consulta_tema` con NPC presente y pool no vacío; hablar_con, ayudar, presionar, emboscar y negociar con NPC presente; usar con objeto aplicable; atacar con NPC u objeto; viajar con salidas; el resto siempre.
- SUPUESTO: objetivos. `agotar_conocimientos`: mientras haya palabras clave del pool sin preguntar, consulta_tema × sesgo y viajar fuera. `visitar_todas_las_escenas`: viajar × sesgo hacia salidas no visitadas. `seguir_pistas`: metas = escenas de entrega de hitos pendientes (`escenasDeEntrega` del narrador) y escenas de los NPC con pista no revelada; en una meta o con un NPC presente con pista no revelada, consulta_tema y hablar_con × sesgo con temas de esas pistas; si no, viajar × sesgo por el camino más corto (BFS por salidas). `desenlace_directo`: igual, con metas = solo escenas de entrega de hitos pendientes. `reparar_relaciones`: ayudar y calmar_la_situacion × sesgo sobre el NPC presente con tag desconfianza, rencor o miedo.
- SUPUESTO: `nombraNpc` decide si se nombra al NPC en hablar_con y en consulta_tema; en los demás verbos que llevan NPC el nombre va siempre. En consultas, si no se nombra y la plantilla es `{npc}, {kw}?`, se usa `qué sabés de {kw}`; si se nombra y la plantilla no lo lleva, se antepone `{npc}, `.
- SUPUESTO: `consulta_tema` siempre va por texto (no tiene botón).
- SUPUESTO: `mayusculas` pasa la frase a mayúsculas; `incompletas` corta la frase entre el 30% y el 80% de su largo. El ruido no se aplica a frases de `adversarial.json`.
- SUPUESTO: `aprendeDeRespuestas`: el pool de temas empieza vacío y solo crece con palabras clave que aparecen en el texto narrado.
- SUPUESTO: `paciencia`: abandono cuando los fallos seguidos (reformula/no_entendido) superan la paciencia (paciencia 6 ⇒ abandono en el 7.º fallo seguido).
- SUPUESTO: `repiteSiFalla`: tras un fallo, con esa probabilidad se repite el mismo verbo con otra redacción; la regla de no repetir la acción exacta más de 2 veces seguidas no aplica a ese reintento.
- SUPUESTO: `evolucion`: pBoton = base + ⌊(turno−1)/cadaTurnos⌋ × delta, acotado a [minPBoton, 1].
- SUPUESTO: `estadosSinAccion` = turnos donde ningún verbo con peso > 0 del perfil está disponible; en ese turno se usa `observar`.
- SUPUESTO: texto repetido dentro del run por `textoId` o, sin id, por hash del texto narrado completo.
- SUPUESTO: similitud: Jaccard sobre `hito:textoId` y 1 − distancia de edición normalizada sobre la secuencia de hitos; se reportan las dos.
- SUPUESTO: tag "decaído" = su tipo aparece alguna vez en `tagsBorrados` (bajar de nivel también borra la clave `tipo|objetivo|nivel`). "Grave sin reparación" = rencor, desconfianza o miedo de nivel 3 que sigue escrito al final del run.
- SUPUESTO: una excepción es "del narrador" cuando `narrar` devuelve `error_interno`; se marca `origenError: narrador` y va a "Fallas graves" del informe, cualquiera sea el perfil.
- SUPUESTO: el reporte de F2 pide runs/seg con 100 runs mixtos: se usan los 13 perfiles (8 runs los primeros 9, 7 los últimos 4).
