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
