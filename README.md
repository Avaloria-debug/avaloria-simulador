# avaloria-simulador
Simulador local de partidas para el narrador de Crónicas de Avaloria.

```bash
npm install
npm run simular -- --runs 20 --seed-base 1
npm test
```

Parámetros en `config/config.json`, flags en `FASES.md`. Salida en `simulaciones/<loteId>/`.

Replay, regresión y exportación (F6 y F7):

```bash
npm run replay -- <loteId> [runId]
npm run dorada
npm run comparar -- <versionA> <versionB> --estricto
npm run exportar -- --fuentes docs
npm run ui
```

`npm run exportar` escribe en `exportaciones/<fecha>/` (ignorada por git) y nunca en el repo del narrador.

Estimar, reanudar y corpus (F4 y F5):

```bash
npm run simular -- --runs 20 --seed-base 1 --estimar
npm run simular -- --reanudar <loteId>
npm run corpus -- --perfiles curioso,torpe,primerizo --frases 30 --max-estados 200
```

- `--estimar` muestra las llamadas y tokens de IA que gastaría el lote contra la capacidad de las keys, y sale sin correr nada.
- `--reanudar` completa un lote cortado por cuota (código de salida 3): salta los runs terminados y mantiene las seeds.
- `corpus` necesita keys de Groq (`config/keys.json`, a partir de `config/keys.ejemplo.json`, o `GROQ_API_KEY`). Sin keys sale con código 3 sin hacer llamadas.
- Sin keys, el modo `ia` cierra por cuota; `--mezcla 100/0` corre todo en modo `codigo`.

## Ver resultados sin terminal

Un solo archivo HTML para revisar lotes, candidatos y comandos, sin servidor ni instalación:

```bash
npm run generar-html
```

1. Correr el comando de arriba (una vez, o cada vez que haya lotes nuevos). Lee `simulaciones/` y `docs/candidatos/` y escribe `docs/visor/index.html`.
2. Abrir `docs/visor/index.html` con doble clic desde el explorador de archivos.
3. Pantallas: «Lotes» (lista y detalle del informe), «Candidatos» (frases y textos con filtros, solo lectura), «Comandos» (con botón «copiar»), «Cargar archivos» (para abrir otra carpeta de `simulaciones/` sin regenerar) y «Keys de Groq».
4. «Keys de Groq»: abrir el `config/keys.json` actual (para no perder las que ya están), agregar o quitar keys y tocar «Guardar keys.json». En Chrome y Edge se elige dónde guardarlo: guardalo en `config/keys.json`. En otros navegadores se descarga y hay que moverlo a `config/`. Las keys solo quedan en la pestaña abierta, se muestran con los últimos 4 caracteres y nunca entran al HTML generado ni a git.

El archivo queda fuera de git (`docs/visor/`), igual que `simulaciones/`. Para aprobar o editar candidatos se sigue usando `npm run ui`.
