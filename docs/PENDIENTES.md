# Pendientes

## Tests en rojo
Ninguno (F1).

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
