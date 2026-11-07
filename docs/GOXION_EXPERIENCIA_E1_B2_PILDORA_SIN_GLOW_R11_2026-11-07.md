# GOXION E1/B2 · R11 — Píldora sin glow (vuelve al original)

Fecha: 2026-11-07. Base: `main` `d01ae9b` (R10). Rama: `beta/r11-quitar-glow-pildora-20261107`.
Solo preview (`preview/experiencia-financiera-espejo/`). No se toca el Index oficial,
Ayuda, Admin ni el motor financiero. Embargo Issue #142 sigue: nada se integra
al Index oficial sin E2/B3, E2/B4, E3/B5, auditoría global y autorización expresa.

## Decisión de Henry (2026-11-07)

Le gustó R10, pero **descarta el efecto glow**: la píldora queda como el
original, antes de los cambios de glow (R9/R10), sin brillo líquido.
Se quedan la corrección de la píldora encimada y el asentamiento al soltar.

## Qué se quitó

- El glow líquido de R10 en `.time-badge`: las dos manchas radiales
  (`gx-r10-liquid`, 8 s, blend screen), el gradiente lineal de base y
  el halo exterior (`box-shadow: 0 0 18px … / 0 0 36px …`), más las
  variables por estado (`--gx-pill-a-rgb` / `--gx-pill-b-rgb`:
  cian+morado, morado+cian, rojo+morado, verde+morado).
- El gradiente líquido de R9 (ya sustituido por R10, sin restos propios).
- Cualquier halo sobre la píldora: la regla R11 fija
  `background-image:none; animation:none; box-shadow:none;` en
  `.time-badge`, así que tampoco quedan los halos heredados de
  `index.css` (estados con `box-shadow: 0 0 15px …`) ni los tenues de
  la sección R3 del preview.
- La píldora deja de aparecer en las reglas de pausa con pestaña
  oculta y de `prefers-reduced-motion` (ya no anima nada); solo se
  pausa/apaga el anillo de lealtad, que sigue respirando (R8).

## Qué queda (el original, antes del glow)

Fondo translúcido simple por estado (`index.css`: `badge-ok`,
`badge-review`, `badge-overdue`, `badge-paid` — fondo rgba .05–.15,
color y borde por estado), texto legible y transición de color
`.25s` de R7 (`background-color, border-color, box-shadow, color`).
Sin animación, sin gradiente, sin halo. El glow del hero sigue
quitado desde R9.

## Qué se conserva de R10 (no se tocó)

1. **Píldora sin solape**: `morphController.repaint()` al cambiar el
   contenido, medida con piso `scrollWidth` y tope de ancho fijado
   antes de medir. El par compacto sigue sin encimarse en 280–390 px.
2. **Asentamiento al soltar**: tras 250 ms sin scroll, el `scrollY`
   se anima al extremo más cercano y el morph lo sigue sin forzar su
   valor; cede si el cliente vuelve a tocar. Incluye
   `overflow-anchor:none` del preview (ver incidente abajo).
3. Conteo R8/R9, pulso R7, respiración de lealtad R8, lava, blur
   25 px y cristal intactos. Importes exactos de los fixtures
   ($45.00/$94.00/$49.00/$79.00, no $46/$92 de Nayeli); CLABE
   ficticia de R7 sin cambios; no secciones nuevas, no información
   duplicada.

## Incidente durante la verificación (corregido antes del PR)

El primer reemplazo del bloque de glow se hizo por números de línea
y borró sin querer la regla `html[data-gx-index-remaster="r3"]
{overflow-anchor:none}` de R10, que vivía justo entre el comentario
R10 y el bloque 2b. Sin esa regla, el anclaje de scroll volvía a
arrastrar el `scrollY` (120 → ~101 px) y el asentamiento se cancelaba:
`check.mjs` falló dos veces en Chromium 280 ("releasing mid-scroll
must settle to the compact end", y≈101–105, p≈0.59). La corrida
limpia de R10 en el mismo entorno sí pasaba Chromium, así que la
causa era el cambio. Se restauró la regla en su sitio y la
verificación pasó. Lección: el bloque de glow y la regla de anclaje
son vecinos en `estado.css`; al editar uno, verificar que el otro
sigue presente (grep `overflow-anchor:none`).

## Qué cambió (archivos)

- `preview/experiencia-financiera-espejo/estado.css` — sección R11:
  regla plana en `.time-badge` (`background-image/animation/
  box-shadow: none`); se retiran `gx-r10-liquid`, las variables por
  estado y el halo; se restaura `overflow-anchor:none`; comentarios
  R8/R9 actualizados; la píldora sale de las reglas de pausa y de
  `reduced-motion`.
- `preview/experiencia-financiera-espejo/estado.js` — solo el
  comentario del morph (punto 3 de R10 pasa a nota R11: glow quitado;
  puntos 1 y 2 intactos). Sin cambio de lógica.
- `preview/experiencia-financiera-espejo/estado.html` — solo bump de
  versión a `?v=e1b2r11v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — las aserciones
  R10 de glow se sustituyen por aserciones R11: la píldora debe
  tener `animationName: 'none'`, `backgroundImage: 'none'` y
  `boxShadow: 'none'`. Las regresiones R10 (cambio de escenario sin
  desplazar, asentamiento desde 120 px y desde 30 px) se conservan.
- Este documento (nuevo).

## Qué se preserva

- Morph R5.2/R7 intacto (tau 64 ms, barra compacta en p≈0.35, gap
  10 px, blur 25 px y cristal del sticky, sin Block 3).
- El brillo `--gx-aui-status-glow` de `.gx-aui-proof` / `.gx-aui-progress`
  NO se tocó: es el icono y la barra de progreso de la prueba de
  recepción, no la píldora del hero; fuera del alcance de R11.

## Verificación

- `node --check` estado.js y check.mjs: OK.
- `node scripts/verify-integrity.mjs`: OK.
- `node preview/experiencia-financiera-espejo/check.mjs`:
  **Chromium E1/B2 FINAL PASS 7 anchos × 12 estados**, incluidas
  las aserciones R11 (píldora plana) y las regresiones R10
  (sin solape al cambiar de escenario, asentamiento a ambos
  extremos). WebKit local: no arranca (al sistema le faltan
  dependencias: `libgstreamer`, `libgtk-4`, `libavif16` y otras;
  igual que R6–R10); la validación en Safari físico queda para Henry.
- Repro R11 en Chromium 390/375/280 px: píldora plana en los 3
  escenarios (upcoming/multi/review) en reposo y compacto, sin
  brillo ni halo; sin solape con el precio; asentamiento funcionando
  a ambos extremos.
