# Lote charla-npc (2026-11-20)

Lote `20261120-070120-100` (copia del informe en esta carpeta; los registros completos están en `simulaciones/`, que no se versiona).

- **Modo reducido.** Con 4 keys la capacidad es 4 × 250 × 0,8 = 800 llamadas y el lote completo estima 1.680, así que va el reducido: curioso:5, investigador:5, amable:5, primerizo:5 y directo:4 (24 runs), casos todos, modo ia, jugador IA activo, seed-base 100, `--max-llamadas-ia 200`. Estimación: 168 llamadas, unos 94.000 tokens.
- **Verificación de keys.** Las 3 keys de `config/keys.json` (••••5PEG, ••••gFfn, ••••M6BR) responden 200, pero también responde 200 una key inventada, y el cupo de tokens baja en el mismo contador. El proxy del entorno reemplaza la key por el secreto de red de `api.groq.com`, así que **todas las llamadas salieron por una sola cuenta** y el pool no rotó de verdad. Para que las 4 keys roten hay que borrar ese secreto de red.
- **Llamadas y tokens reales:** 100 llamadas y 21.285 tokens, más 18 llamadas de una primera corrida que corté al run 5 para registrar las consultas. 59 llamadas tuvieron respuesta: 16 del narrador (4.535 tokens) y 43 frases del jugador IA (16.750 tokens). Las otras 41 fueron 429 por el límite de 8.000 tokens por minuto; cada una pausó y siguió, ninguna abortó el lote.
- **Runs:** 24 de 24 completados, todos cerrados por trabada; 0 por cuota.
- **Candidatos:** 8 textos de diálogo IA en `docs/candidatos/charla-npc-textos.jsonl`, todos `pendiente`. 0 frases nuevas: el motor entendió las 43 frases del jugador IA (`docs/candidatos/charla-npc-frases-agrupadas.json` queda vacío).
- **Temas revelados por NPC:** Serel Norlen 2, Maren de Orst 2; el resto 0. Conocimientos revelados: _1 2 de 11, _2 2 de 12.
- **Hallazgo:** de 73 consultas a Serel, 46 fueron negativas por relación; en total hubo 71 negativas por relación sobre 106 consultas. El jugador pregunta antes de tener la relación que piden los conocimientos.

---

# Lote charla-npc con relación construida (2026-11-20)

Lote `20261120-072125-200`. Informe en `docs/charla-npc/lote-200/`. Perfiles: curioso:5, investigador:5, amable:8, primerizo:4 y directo:2 (24 runs), casos todos, modo ia, jugador IA activo, seed-base 200, `--max-llamadas-ia 200`.

- **Modo y motivo:** el lote pedido, completo. Estimación: 168 llamadas, unos 94.000 tokens, debajo de la capacidad de 800 (4 × 250 × 0,8).
- **Keys:** 4 en `config/keys.json`, rotación verificada antes del lote (8 llamadas, 2 por key, todas 200).
- **Llamadas y tokens reales:** 39 llamadas y 14.237 tokens: 6 del narrador (2.862 tokens), 29 frases del jugador IA y 4 llamadas con 429 por tokens por minuto (todas en ••••aVM6; pausaron y siguieron). Reparto: ••••aVM6 31, ••••5PEG 2, ••••gFfn 3, ••••M6BR 3. El pool elige la key menos usada del día, y las otras tres ya venían con unas 40 llamadas cada una de antes.
- **Runs:** 24 de 24 completados, todos por trabada; 0 por cuota.
- **Negativas por relación:** control (curioso + investigador) 54 de 60 consultas (90 %); relación construida (amable) 2 de 8 (25 %).
- **Conocimientos revelados por perfil, en runs:** amable `serel_1` en 7 de 8 y `serel_2` en 4 de 8; directo `serel_1` en 1 de 2; curioso, investigador y primerizo ninguno.
- **Candidatos:** 5 textos de diálogo IA (`docs/candidatos/charla-npc-200-textos.jsonl`) y 1 frase nueva no entendida (`docs/candidatos/charla-npc-200-frases-agrupadas.json`). Todo pendiente.
- **Lectura:** amable casi no consulta (8 consultas en 8 runs) pero revela más que nadie. Los conocimientos le llegan conversando y ayudando, no preguntando. Curioso e investigador preguntan mucho y chocan con el umbral de relación.
