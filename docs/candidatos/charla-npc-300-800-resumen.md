# Candidatos de charla, lotes 300 a 800 (2026-11-20)

Todos están `pendiente`: no se aprobó nada. Los decididos de los lotes 100 y 200 (`charla-npc-textos.jsonl`, `charla-npc-200-textos.jsonl` y sus frases) no se tocaron, y ningún candidato nuevo los repite.

Reemplazan a `charla-npc-300-500-textos.jsonl` y `charla-npc-300-500-frases-agrupadas.json`. Son un superconjunto: los 51 textos y las 17 frases de antes conservan su id y su contenido. Fuentes: los 11 lotes de `simulaciones/` entre `20261120-193218-300` y `20261120-235036-800`.

## Textos del narrador (`charla-npc-300-800-textos.jsonl`): 60
Ids `t00001`–`t00060`, cada uno con `lote` e `idOriginal`. Sin duplicados (texto normalizado) y sin salidas rotas.

| Intención del turno | reaccion | consulta | dialogo | Total |
|---|---|---|---|---|
| (sin intención) | 15 | 11 | 7 | 33 |
| intencion_hablar_con | 13 | 1 | 0 | 14 |
| intencion_viajar | 7 | 1 | 1 | 9 |
| intencion_comprar | 4 | 0 | 0 | 4 |

Por lote: 300 → 47, 400 → 2, 500 → 2, 600 → 3, 700 → 4, 800 → 2.

## Frases del jugador IA (`charla-npc-300-800-frases-agrupadas.json`): 29
Ids `c0001`–`c0029`. Se descartaron 64 salidas rotas del jugador IA: tokens del catálogo (`hablar_con …`, `consultar_tema …`), ids o JSON, con el mismo criterio de `validarFrase` y el filtro de consolidación. También quedaron afuera las frases que ya estaban en otros archivos de frases agrupadas.

| Tipo | Cantidad |
|---|---|
| voseo_dialogo | 14 |
| primera_persona_accion | 12 |
| no_valida | 3 |

| Lo que entendió el motor | Cantidad |
|---|---|
| intencion_viajar | 13 |
| (nada: no entendido) | 10 |
| intencion_comprar | 4 |
| intencion_retirarse | 1 |
| intencion_ayudar | 1 |

Todas van en el grupo "(sin intención)", porque el jugador IA no declara una intención objetivo.

**Pendientes en total: 89** (60 textos y 29 frases).
