# Pendientes

Solo lo que decide Tomás y lo que se verifica después de un merge. Lo resuelto se quitó el 2026-11-21. El historial completo está en git: este archivo en `f87cd8c`.

## Tests en rojo
- Ninguno (2026-11-21, 109/109).

## Decisiones de Tomás
1. **Revert de `f83afe2` en la PR #13 del narrador**: `git revert` choca en `narrador/h1Evento.test.js` y `docs/SUPUESTOS-v3.md`, y bajaría VERSION a 0.0.42. ¿Aprobás resolverlo así: revertir el código, sacar solo los 2 tests de `hitoEsperaEvento` (líneas 87 y 98), agregar al final de SUPUESTOS-v3 una nota sin borrar nada y dejar VERSION en 0.0.43?
2. **Candidatos pendientes**: ¿aprobás, editás o rechazás los 92 de `charla-npc-300-800-*`, que tienen sugerencia en `docs/candidatos/revision-sugerida.md` (A 35 · E 25 · R 32), y los otros 92 que no tienen sugerencia (91 de `F4-frases-agrupadas.json` y 1 de `charla-npc-200-frases-agrupadas.json`)? Los pendientes de `charla-npc-300-textos.jsonl` y `charla-npc-400-*` son copias de los de 300-800.
3. **`t00002` del lote 200** ("No lo sé, pero el humo ya se siente."), en `editar` porque solo vale con `evento_incendio_puesto` activo: ¿lo rechazás o lo aprobás con esa condición?
4. **Momento de la pista de camino a p1**: hoy se narra a los 8 turnos sin avance. ¿Es el valor buscado para un jugador real, que suele tener más paciencia que los 15 turnos de trabada del simulador?

## Verificaciones post-merge
1. **Cuando se mergee la PR #13 del narrador**, fijar el simulador al commit de merge en main del narrador. Instalar, hacer una instalación limpia y correr la suite: 0 rojos. No mergear la rama `claude/medicion-h1-opcion-b`, que está fijada a la PR, y borrarla después.
   ```bash
   npm install "narrador@github:Avaloria-debug/Avaloria-narrador#<sha del merge>"
   ```
   ```bash
   rm -rf node_modules && npm ci
   ```
   ```bash
   npm test
   ```
2. **Después de la verificación 1**, correr la dorada con el narrador nuevo y compararla con la 0.0.42. Se esperan cambios por la PR #13 (el sendero sin tormenta y el `_2` después del `_1`), así que conviene revisar las regresiones antes de cerrar.
   ```bash
   npm run dorada
   ```
   ```bash
   npm run comparar -- 0.0.42 0.0.43 --estricto
   ```
