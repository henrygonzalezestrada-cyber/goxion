# GOXION · E1/B2 · Encabezado compacto corregido · R15 (2026-11-07)

Beta de preview, solo `preview/experiencia-financiera-espejo/`. No toca el
Index oficial, Ayuda, Admin ni el motor financiero. No hay secciones nuevas
ni información duplicada. Blur 25 px y cristal intactos.

## Problemas (captura de Henry en iPhone, R14)

1. La flecha de retroceso "‹" de la esquina superior no existe en la
   oficial y robaba ancho a la fila compacta.
2. La píldora compacta se veía súper pequeña y rara: en R12/R14 encogía
   con scale .833 a 10 px visuales.
3. Demasiado aire entre "ESTADO DE CUENTA" y la fila del precio, la
   píldora y el botón: el título quedaba desplazado muy hacia abajo
   respecto a la fila.

## Cambios

- **Sin flecha:** el elemento `<a class="gx-b2-back">` se eliminó del
  HTML, su regla CSS y la actualización de su `href` en `estado.js`.
  No está oculto, no existe. El título queda centrado limpio.
- **Píldora a su tamaño original:** 12 px siempre, sin scale
  (`badgeScale` = 1). El precio compacto sigue en 26 px visuales (su
  tamaño compacto original, no se tocó) y el botón "Mi Espacio" sigue
  al mismo alto que la píldora (ahora ~28 px). La fila de 3 zonas se
  reajustó con la píldora a 12 px: a 390 px "Acción necesaria" cabe
  entera sin solape (medido: píldora 122.6 px, sin recorte); a 280 px
  se permite ellipsis controlado, como antes.
- **Gap título→precio apretado:** `--gx-rm-header-gap` 9→4 px y
  min-height del header 29→20 px (el título de 14 px cabe sobrado).
  Es el mismo gap en reposo y en compacto: en compacto el gap
  título→precio pasa de ~22 px a **8.3 px** (medido en Chromium
  390 px), sin que nada se encime y sin cambiar tamaños.

## Se conserva

Corrección R10 (píldora sin solape, repaint + piso scrollWidth),
asentamiento R10/R13 (solo en la zona del morph), morph solo-transform
R12, encabezado compacto en 3 zonas R14, píldora SIN glow (R11),
conteo R8/R9, pulso R7, respiración de lealtad R8.

## Verificación

- `node --check` (estado.js, check.mjs) OK; `node scripts/verify-integrity.mjs` OK.
- `node preview/experiencia-financiera-espejo/check.mjs`: Chromium
  E1/B2 FINAL PASS, 7 anchos × 12 estados, con regresiones R15 nuevas
  (sin flecha en ningún estado, header de 20 px, píldora compacta a
  12 px con scale 1, gap título→precio ≤12 px en compacto).
  WebKit local no arranca (faltan libgstreamer y otras, como R6–R14);
  la validación en Safari físico queda para Henry.
- Medido en Chromium 390 px: sin flecha; título centrado; píldora
  12 px, botón mismo alto (28 px); "Acción necesaria" entera;
  gap título→precio 8.3 px en compacto.
