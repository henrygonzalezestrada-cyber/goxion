# GOXION · E1/B2 — Animaciones premium + acomodo del morph (R7)

**Fecha:** 07/nov/2026 · **Estado:** beta en preview para revisión, NO aprobada · **Alcance:** solo animaciones sutiles (transform/opacity) y el acomodo del morph en el preview E1/B2. No cambia diseño, estructura, importes, motor financiero ni integración. Un solo bloque, fusionado directo como beta.

## Qué se mejora (y por qué)

### 1. Animaciones premium sutiles — solo transform/opacity, misma curva del morph

- **Pulso de importe** (`estado.js`, `hero()` y `breakdown()`): al cambiar el importe — Próximo ↔ Todo junto ($45.00 ↔ $94.00 en la demo; $46/$92 en el caso real) o al elegir un cargo — el número hace un pulso de escala 1.04→1 en 300 ms con `cubic-bezier(.2,.78,.24,1)`, la misma curva del morph. El texto ya es el valor exacto del escenario; **nunca se cuentan valores falsos** (no hay count-up). El pulso solo dispara cuando el valor realmente cambia; repetir el mismo modo no pulsa. Respeta `prefers-reduced-motion`.
- **Badge con transición suave** (`estado.css`, sección R7): el cambio de color entre estados (ok / revisión / vencido / pagado) pasa de instantáneo a transición de .25 s en `background-color`, `border-color`, `box-shadow` y `color`. El `transform` del badge lo sigue moviendo el morph por JS y **no** se transiciona.
- **Fila activa del calendario: se conserva** el lavado cian y el chevron Morphicons (sin rotar, sin cambios en R7). Verificado por `check.mjs`.
- **Hoja de reporte con entrada de resorte + blur** (`estado.css`, sección R7): la hoja del modal entra con `gx-r7-sheet-in` .45 s, `cubic-bezier(.2,.9,.25,1.12)`: `translateY(16px) scale(.97)` + `blur(3px)` → nítida. La animación manda sobre la transición de `index.css` mientras dura y termina en el mismo estado final, sin salto. Respeta `prefers-reduced-motion`.
- **Copiar CLABE: icono que se transforma a check, no toast genérico** (`estado.html` + `estado.js` + `estado.css`, sección R7): dentro de la hoja de reporte ya existente (no es sección nueva) hay una fila «CLABE de ejemplo» con el número ficticio `012 180 0000 0000 00` y un botón Copiar. Al copiar, el icono de copiar se transforma al check verde (opacidad + escala .25 s) y el texto pasa a «Copiado»; revierte solo a los 1,8 s. No aparece ningún toast. La CLABE es **ficticia, con ceros, sin backend y sin cuenta real**: el espejo no tiene hoja de bancos (el Index oficial es el dueño de las cuentas reales), así que la fila existe solo para demostrar la interacción con datos de ejemplo, etiquetada «Número ficticio · solo demostración». Copia con `navigator.clipboard` y fallback legacy.

### 2. Acomodo del morph — la barra compacta entra antes

**El problema (medido, no supuesto):** antes de R7, en Chromium a 390 px, el badge atravesaba el importe a mitad de scroll: a p≈0.2 ya se solapaban ~90 px en horizontal y el rectángulo del badge entraba en la banda vertical del precio; a p≈0.43 el solape era de ~50 px. Ese es el «precio flotante» del video. La causa era el mapeo lineal: el badge subía (`80-71p`) mientras la separación horizontal (`p*1.1`) aún no llegaba al ~0.93 que exige no cruzarse. Además el alto del hero (`116-73p`) dejaba banda vacía bajo el contenido a mitad de scroll.

**El arreglo (`estado.js`, `paint()`): misma geometría en reposo y mismo par compacto al final (gap 10 px, mismo blur 25 px), solo cambia CUÁNDO viaja cada pieza**, con curvas suavizadas sobre `p = scrollY/172`:

| Pieza | Antes | R7 |
|---|---|---|
| Precio (tamaño 52→26, subida) | lineal en `p` | completo en p≈0.45 — viaja primero |
| Separación horizontal del par | `min(1, p*1.1)` | completa en p≈0.35, antes de que el badge pueda entrar en la banda del importe |
| Badge (subida 80→2, tamaño 12→10) | lineal en `p` | con retraso: empieza p≈0.30, llega p≈0.75 |
| Etiqueta «Próximo pago» | opacidad `1-3p` | igual, solapada con el viaje del precio; su hueco de 7 px se reclama en 0.10→0.45 |
| Alto del hero | `116-73p` | derivado del contenido medido (fondo de la pieza más baja + 8–7 px): 116 px en reposo, 36 px compacto, sin banda vacía en medio |

**Sin Block 3 (morph solo-transform):** no hizo falta. El defecto era el mapeo de tiempos, no layout contra transform; cambiar la maquinaria habría tocado la geometría aprobada sin necesidad. Se conservan tau 64 ms, `scrollY/172`, damping por delta-tiempo, caché de medidas y asentamiento al soltar (R5.2). Las alturas para derivar el alto del hero se leen con `getBoundingClientRect` solo cuando cambia la clave de medida, igual que los anchos.

## Qué se preserva, sin excepción

- Morph R5.2 intacto en extremos y sensación: hero 116 px / 36 px, importe 52 px / 26 px, `scrollY/172`, tau 64 ms, par compacto centrado con gap 10 px, un solo precio exacto según escenario.
- Jerarquía R6 intacta: ritmo 21/11, títulos 10 px/800, secundarios `#b5c3d9` / `#9ca7c6`.
- Desenfoques a propósito: sticky con `backdrop-filter: blur(25px) saturate(1.2)` y gradiente `rgba(3,3,5,.90/.77/.65)`; se sigue viendo lo que pasa por debajo. No se solidifica nada.
- Solo 2 superficies de cristal (identidad y desglose). Sin secciones nuevas, sin duplicar información, sin tocar `index.html` oficial, Ayuda, Admin, motor financiero ni Supabase. Sin cambios a los fixtures (`$45.00`/`$94.00`/`$49.00` en la demo).

## Archivos

- `preview/experiencia-financiera-espejo/estado.js` — curvas R7 del morph, pulso de importe (hero + total seleccionado), copiar CLABE.
- `preview/experiencia-financiera-espejo/estado.css` — sección R7: transición de color del badge, entrada de la hoja, fila CLABE + icono→check.
- `preview/experiencia-financiera-espejo/estado.html` — fila CLABE dentro del modal existente; `estado.css`/`estado.js` a `?v=e1b2r7v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — regresiones R7: par separado a mitad de scroll (gap ≥ 8), precio ya viajado (≤ 32 px), badge sin cruzar el importe, hero sin banda vacía (≤ 16 px), transición de color del badge, pulso WAAPI al cambiar Próximo ↔ Todo junto, hoja con `gx-r7-sheet-in`, copiar CLABE → check sin toast.
- `docs/GOXION_EXPERIENCIA_E1_B2_ANIMACIONES_ACOMODO_R7_2026-11-07.md` — este documento.

## Cómo probarlo en Safari / iPhone

Rama: `beta/r7-animaciones-acomodo-20261107`. Tras fusionar como beta, la URL será:

`https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-financiera-espejo/estado.html?escenario=multi&v=final-chevron`

1. **En reposo:** todo idéntico a R6. Solo el importe grita; nada debe verse distinto sin desplazar.
2. **Desplazar poco (un tercio):** la barra compacta ya debe estar entrando — el importe ya chico y a la izquierda, el badge ya separado a la derecha, sin que el badge pase por encima del precio y sin hueco vacío debajo. Antes, a esa altura, el badge cruzaba el precio.
3. **Próximo ↔ Todo junto:** abrir el calendario y tocar «Todo junto»: el total seleccionado ($45.00 → $94.00) hace un pulso suave, sin contar números intermedios. Volver a «Próximo vencimiento» pulsa de vuelta.
4. **Cambiar de escenario** (Probar escenarios → «Comprobante en revisión»): el badge cambia de color con transición suave, no de golpe.
5. **Hoja de reporte:** tocar «Ya realicé mi pago»: la hoja entra con un pequeño resorte y se enfoca desde un leve desenfoque.
6. **Copiar CLABE:** en la hoja, tocar «Copiar» junto a la CLABE de ejemplo: el icono se transforma en check verde y dice «Copiado», sin mensaje flotante. La CLABE es ficticia (ceros), solo para ver la interacción.
7. **Calendario:** la fila activa sigue con su lavado cian; el chevron del calendario sigue siendo el Morphicons (se transforma, no gira).
