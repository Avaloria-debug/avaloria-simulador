# Integración con el narrador

Dependencia: `narrador` = `github:Avaloria-debug/Avaloria-narrador#a8e613d8d59d52ecd17bcba6f402613bc25f6b85` (paquete `motor-narracion`, módulos ES, `VERSION` en `narrador/version.js`).
Solo `src/adaptador.js` lo importa. Todo corre en Node: ninguna función usada exige navegador.

## Rutas y firmas usadas
| Para qué | Ruta | Firma |
|---|---|---|
| Contenido (se carga al importar, por `fs` en Node) | `narrador/narrador/index.js` | `export const contenido` (validado), `export const diccionarios` |
| Casos | `narrador/data/contenido/casos.json` | `{version, casos:[…]}` (caso_01…caso_04) |
| Crear partida | `narrador/narrador/index.js` | `crearPartida({ semilla }) -> estado` (con `caso: null`) |
| Elegir caso | `narrador/narrador/casos/instancias.js` | `armarInstancia(caso, historial, semilla, { contenido }) -> instancia`; el `estado.caso` inicial lo arma el adaptador (ver SUPUESTOS) |
| Turno por botón o texto | `narrador/narrador/index.js` | `narrar(estado, {tipo:'boton', intencionId, parametros} \| {tipo:'texto', texto}, { casos, persistenciaCasos, jugadorId, partidaId, ahora }) -> Promise<{texto, estado, tipo, registro, errores}>`. No lanza. |
| Rehidratar estado | `narrador/narrador/index.js` | `cargarPartida(estado) -> estado` |
| Decidir sin efectos | `narrador/narrador/turno.js` | `ejecutarTurno(estado, entrada, { contenido, rng, diccionarios }) -> turno` (puro). `decidir(texto, contexto)` de `comprension.js` es puro pero su contexto (`contextoDeComprension`) no se exporta, por eso se usa `ejecutarTurno` con un rng descartable `crearRng(estado.semilla)` de `azar.js`. |
| Botones / lo presente | `narrador/narrador/prueba/panel.js` | `opcionesDeEscena(estado, contenido) -> {escena, intenciones, npcs, objetos, destinos}` (lógica pura, sin DOM) |
| Persistencia de casos | `narrador/narrador/casos/persistencia.js` | `abrirPersistenciaCasos({ versionContenido, indexedDB, nombreBD })`; `indexedDB` inyectable |

## Lectura de estado
- Escena: `estado.jugador.escenaId`. Hora del mundo: `estado.reloj {dia, hora}`.
- NPC presentes, objetos: `opcionesDeEscena` (usa `npcsPresentes` y `objetosAplicables` de `turno.js`).
- Tags, hitos, desenlace: `estado.caso.tags`, `estado.caso.hitosAlcanzados`, `estado.caso.desenlaceId` / `cerrado`. Tipo de desenlace: `caso.desenlaces[].tipo`.
- Botones: el narrador no define niveles. Nivel 1 = intención sola; nivel 2 = intención + NPC/objeto/destino presente.
- Tipo de turno (`accion`, `consulta`, `saludo`, `reconocimiento`, `reformular`, `ia`, `error`) y `motivo`: de `ejecutarTurno`; `narrar` solo expone `tipo` de salida (`narracion`, `reformulacion`, `dialogo_ia`, `error`).

## Azar y tiempo
- `Math.random`: solo en `narrador/azar.js:30` (`semillaAlAzar`, no se usa si hay semilla). Por defecto en `core/narrador/seleccionarVariante.js:36`, `core/narrador/resolverAccion.js:69`, `core/orquestador/jugarTurno.js:33` (código `core/`, no lo usa `narrar`).
- Azar sembrado: `crearRng` (mulberry32) en `azar.js`; la semilla viaja en `estado.semilla`.
- `Date.now`: `index.js:321-324` (`fechaActual`, si no llega `opciones.ahora`), `casos/instancias.js:181` (`instanciar`, no se usa). `new Date(...)` deriva de esas fechas (`index.js:316,514`, `registro.js:41`, `registro/registroTurnos.js:69`).
- `crypto.getRandomValues`: `persistencia/codigoPartida.js:14` (no se usa).
- El simulador pasa `ahora: () => Date.now()` y durante cada run reemplaza `Math.random` y `Date.now` (base fija + contador).

## IndexedDB
- `casos/persistencia.js:127` y `persistencia/adaptadores/almacenIndexedDB.js:21`: `globalThis.indexedDB` por defecto, inyectable. El simulador inyecta `new IDBFactory()` de `fake-indexeddb` por run (base nueva).
- Sin `localStorage`, `window` ni DOM en lo usado. DOM solo en `prueba/app.js` y `registro/exportacionArchivo.js` (no se usan).
