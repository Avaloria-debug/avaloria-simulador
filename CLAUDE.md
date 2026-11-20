# Simulador de Avaloria

Simulador local de partidas para el narrador por código de Crónicas de Avaloria (repo `Avaloria-debug/Avaloria-narrador`, dependencia fijada a un commit).
Dos usos: (1) validar el diseño: callejones, trabadas, repeticiones, tags, cobertura; (2) generar candidatos (frases, textos) para alimentar al narrador.
Nada entra al narrador sin aprobación de Tomás.

## Reglas
- No modifiques el narrador (es dependencia). Si algo lo exige: PARAR y reportar.
- Los datos viven en JSON (`config/`), no en código.
- Keys: nunca en git, nunca en logs ni en la UI completas (mostrar solo los últimos 4). Archivo: `config/keys.json` (gitignored).
- Prohibido `test.skip` y cambiar el esperado de un test para que coincida con el código. Todo rojo se lista en `docs/PENDIENTES.md` (caso/seed, esperado, real). Un rojo fuera de esa lista es falla nueva: no commitear y reportarla.
- Ambigüedad o decisión de diseño no cubierta: PARAR y preguntar en el reporte. No resolverla en silencio. Supuestos menores: `docs/SUPUESTOS.md`, cada uno con prefijo `SUPUESTO:`.
- Antes de truncar o sobrescribir contenido existente: parar y avisar.
- Sin dependencias nuevas salvo `fake-indexeddb` (dev) y las que la fase indique. Node >= 18, `fetch` nativo, `node:test`. Mismo sistema de módulos que el narrador (ver su `package.json`).
- Español en UI, logs y docs. Comentarios mínimos.

## Ahorro de tokens
- Leé solo este archivo y tu sección de `FASES.md` (desde su `## F<n>` hasta el siguiente `##`).
- No releas archivos que ya escribiste. Ediciones puntuales, no reescrituras completas.
- Salida de tests y logs: solo resumen (`| tail -30`).
- Reporte final: exactamente las líneas que pide la fase.

## Glosario
- **Agente:** una partida simulada con un perfil. **Run:** ejecución de un agente. Runs totales = suma de agentes de todos los perfiles.
- **Lote:** conjunto de runs lanzados juntos. Carpeta `simulaciones/<loteId>/`.
- **Modo:** `codigo` (IA de Groq apagada) o `ia` (Groq real).
- **Trabada:** N turnos seguidos sin avance de hito (N=15 por defecto, configurable).
- **Candidato:** frase o texto generado por IA, pendiente de aprobación humana.
- **Corpus:** frases de jugador generadas por Haiku por lote de estados, sin jugar partidas completas.

## Estructura
```
CLAUDE.md · FASES.md · README.md · package.json
config/   config.json · perfiles/*.json · frases-primerizo.json · adversarial.json · dorada.json
          keys.json (gitignored) · keys.ejemplo.json
src/      cli.js · lote.js · runner.js · adaptador.js · politicas.js · perfiles.js · rng.js
          registro.js · informe.js · ia/{haiku,groq,keys}.js · servidor/ · ui/
scripts/  chequear-keys.js
simulaciones/  (gitignored)
docs/     INTEGRACION.md · SUPUESTOS.md · PENDIENTES.md
tests/
```
Solo `src/adaptador.js` importa el narrador.

## Decisiones cerradas (no reabrir)
- Seed por run = `seedBase + índice`. Mismo seed y misma versión del narrador => misma partida.
- Cierres de run: `desenlace`, `trabada`, `maxTurnos` (400), `abandono`, `cuota`, `excepcion`.
- Mezcla por defecto 40% `codigo` / 60% `ia`, asignada por sorteo con seed y cantidades exactas.
- En validación el jugador elige por reglas (90%) y Haiku (10%). El corpus se genera por lote con Haiku.
- Registros JSONL en `simulaciones/`, guardados automáticamente, sin IA.
- Candidatos: quedan `pendiente` hasta que Tomás los aprueba. Sin prefiltro de IA. Agrupación y dedupe por código.
- La IA nunca cambia hechos del mundo ni tags.
- Nunca escribir en `data/` del narrador. Las exportaciones se generan como archivos para cargar en el repo del narrador.
- Pool de keys de Groq en `config/keys.json`, con rotación. Haiku usa `anthropic.key` del mismo archivo.
- Interfaz: página local servida por Node, HTML/JS/CSS sin framework, sobria, responsive.
