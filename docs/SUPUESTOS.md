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
