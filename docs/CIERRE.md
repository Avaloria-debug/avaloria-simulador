# Cierre del simulador (0.7.0, 2026-11-21)

## Qué existe
| Fase | Versión | Qué hace |
|---|---|---|
| F1 | 0.1.0 | Runner por código con seed, 5 archivos por lote y hook de keys. |
| F2 | 0.2.0 | 15 perfiles validados e informe completo: trabadas, repeticiones, similitud, tags y cobertura. |
| F3 | 0.3.0 | UI local en `127.0.0.1:4173`, con las keys enmascaradas. |
| F4 | 0.4.0 | Corpus de frases con IA, con dedupe y filtro de voseo. Usa Groq en lugar de Haiku, por decisión de Tomás. |
| F5 | 0.5.0 | Modo IA con un pool de keys de Groq que rotan, topes, estimación y reanudación (código de salida 3). |
| F6 | 0.6.0 | Replay, dorada (36 runs fijos) y `comparar --estricto`. |
| F7 | 0.7.0 | Revisión de candidatos y exportación de los aprobados y editados para cargar en el narrador. |

El narrador está fijado a `9f8071f` (0.0.42, main). La PR #13 está pendiente.

## Flujo completo
```bash
npm ci && npm test
```
```bash
npm run simular -- --perfiles seguidor_pistas_dueno:6,amable:6 --seed-base 900 --estimar
```
```bash
npm run simular -- --perfiles seguidor_pistas_dueno:6,amable:6 --seed-base 900
```
```bash
npm run ui
```
```bash
npm run exportar -- --fuentes docs
```
```bash
npm run dorada && npm run comparar -- <versiónA> <versiónB> --estricto
```
1. Simular: `--estimar` antes, para ver el costo. Si el lote se corta por cuota, `--reanudar <loteId>`.
2. Revisar en la UI: informes, replay y la pantalla Candidatos (aprobar, editar o rechazar).
3. Exportar a `exportaciones/<fecha>/` y pegar `PROMPT-CARGA.md` en Code, dentro del repo del narrador.
4. Con cada versión nueva del narrador, correr la dorada y compararla con la anterior.

## Cuota
- **Usan IA (Groq):** el modo `ia` (por defecto el 60 % de los runs), `--jugador-ia si` y `npm run corpus`.
  - Medido: unas 2,4 llamadas por run con jugador IA y trabada 15, y unas 0,3 sin jugador IA.
  - Con 4 keys se trabaja con un tope de 800 llamadas por día.
- **No usan IA:** `--mezcla 100/0`, `--estimar`, replay, dorada, comparar, exportar, la UI y `npm test` (sin red).

## Pendiente de Tomás
Está en `docs/PENDIENTES.md`:
1. Cómo resolver el conflicto del revert de `f83afe2` en la PR #13.
2. Los 184 candidatos pendientes: 92 con sugerencia y 92 sin sugerencia.
3. Si se rechaza o se condiciona `t00002`.
4. El momento de la pista de camino (hoy, a los 8 turnos).

Después del merge de la PR #13: fijar el simulador a main del narrador, hacer una instalación limpia, correr `npm test` y comparar la dorada.
