# GOXION E1/B2 · R10 — Píldora sin solape, asentamiento al soltar y glow líquido más visible

Fecha: 2026-11-07. Base: `main` `1886e71` (R9). Rama: `beta/r10-pildora-asentamiento-glow-20261107`.
Solo preview (`preview/experiencia-financiera-espejo/`). No se toca el Index oficial,
Ayuda, Admin ni el motor financiero. Embargo Issue #142 sigue: nada se integra
al Index oficial sin E2/B3, E2/B4, E3/B5, auditoría global y autorización expresa.

## Feedback de Henry en su iPhone (2026-11-07, capturas 12:53 y 12:54 CST)

1. La píldora no se ajusta cuando maneja demasiada información y queda
   encimada en el precio (captura $79.00 con "Acción necesaria" y captura
   $49.00 con "6 de noviembre").
2. Si se queda a medias al desplazar, la píldora no termina de llegar y
   se ve fatal: al soltar, debe terminarse de acomodar al extremo más
   cercano, con cuidado.
3. El glow dentro de las píldoras casi no se percibe. Lo imagina como
   mezclar dos cosas brillantes que se entremezclan sin unirse del todo
   (azul y amarillo revueltos, por ejemplo), pero acorde al tono, sin
   colores chillantes que no van.

## 1. Píldora encimada en el precio: causa raíz y corrección

### Medición de la captura de Henry ($79.00, "Acción necesaria")

Medida por color sobre el JPEG (359 KB, 1170×2532, escala 3×):

- Precio: x 111–191 px CSS, ancho 80 px. Píldora: texto x 196–285 px,
  borde izquierdo ≈186 px. **Solape real de ~5 px en horizontal**,
  con solape vertical completo.
- Centro del precio 151 (desplazamiento −44), centro de la píldora 240
  (desplazamiento +45, correcto). El desplazamiento del precio debería
  ser −59,5 con la píldora real de 109 px; el −44 corresponde a una
  píldora medida de ~78 px — **exactamente el ancho de "En revisión"
  (77 px medido en Chromium)**.

### Causa raíz

El morph solo repintaba con scroll/resize (`paint()` corre desde
`tick()`/`request()`). Al cambiar el texto de la píldora — cambio de
escenario o de estado del comprobante (revisión → corrección) — con la
página ya desplazada y asentada, nadie repintaba: los desplazamientos
del par compacto quedaban calculados con el ancho de la píldora
ANTERIOR y la nueva se encimaba en el precio. En Chromium no se
reproducía con scroll y asentamiento (hueco ~9–10 px en todos los
escenarios y anchos 280–390), porque el cambio de escenario dispara
un evento de scroll por el anclaje; en Safari/iOS no llegaba ese
repintado. No era que el par no cupiera: el par más largo
("Prórroga · 21 oct" + importe) mide ~195 px y el hero más chico
(280 px) tiene 240 px.

### Corrección (tres capas)

1. **Repintado al cambiar el contenido.** `morphController` expone
   `repaint()` (invalida la clave de medida y repinta) y `refresh()`
   lo llama después de `hero()`: al cambiar el texto de la píldora o
   del importe, los desplazamientos se miden con los anchos reales
   del texto nuevo, sin tocar el progreso ni mover el scroll.
2. **Medida con piso `scrollWidth`.** `moneyWidth` y `statusWidth`
   se miden como `max(getBoundingClientRect().width, scrollWidth)`:
   si un `max-width` recorta la caja (importe con `max-width:59%`
   a 280 px, píldora con su tope %), `scrollWidth` devuelve el
   ancho natural del contenido y el desplazamiento se calcula con
   el ancho real, nunca con uno recortado.
3. **El tope de ancho de la píldora se fija ANTES de medir.** En R9
   `--gx-rm-badge-max` se fijaba después de la medida, así que la
   medida usaba el tope del pintado anterior; al subir, el tope
   viejo y más chico podía recortar la medida.

No se acorta ningún texto: con los anchos reales el par cabe en
280–390 px en todos los escenarios, así que no hace falta el
"6 nov" compacto; queda como opción si un texto futuro no cupiera.

## 2. Asentamiento al soltar: el scroll se mueve, el morph lo sigue

### Diseño elegido (y el descartado)

- **Descartado: forzar el valor del morph a 0/1 por su cuenta.**
  R5.2 ya documentó que eso provoca un salto al siguiente evento de
  scroll, porque el morph sigue acoplado al `scrollY`.
- **Elegido: mover el `scrollY` al extremo más cercano** (0 o
  `min(172, máximo desplazamiento de la página)` — en viewports
  altos la página no llega a 172 px y el "compacto" real es su
  máximo) y dejar que el morph, acoplado al `scrollY`, lo siga sin
  saltar. El extremo se elige por el punto medio del ancla.

### Implementación (`setupHeaderMorph`, `maybeSnap`/`animateSnap`)

- Disparo tras **250 ms sin eventos de scroll** (temporizador que se
  rearma en cada evento). El `scrollend` solo adelanta el
  asentamiento si el último evento de scroll quedó atrás hace más
  de 200 ms: un `scrollTo` programático que llega justo después del
  anterior debe ganar antes de que el snap arranque, no pelear con él.
- La animación es propia, por frames (`requestAnimationFrame`): cada
  frame lee el `scrollY` real y avanza un cuarto de la distancia que
  falta, con plazo de 1 s que fuerza el aterrizaje exacto. Con
  `reduced-motion` el salto es instantáneo.
- Si el cliente vuelve a tocar (`touchstart`), a rodar la rueda
  (`wheel`) o un desplazamiento externo mueve el `scrollY` más de
  24 px en un frame, la animación cede y manda ese desplazamiento.
- No asienta si el modal de reporte está abierto, si el dedo sigue
  en pantalla, si la página no desplaza, ni si ya está a menos de
  4 px del extremo.

### El anclaje de scroll peleaba con el asentamiento

Medido en Chromium: tras soltar en 120 px, el anclaje de scroll
arrastraba el `scrollY` (120 → 83 px) mientras el hero cambiaba de
alto, y el snap evaluaba el extremo equivocado (0 en vez de 172) y
oscilaba ±50 px. Por eso el preview desactiva el anclaje
(`html[data-gx-index-remaster="r3"]{overflow-anchor:none}` en
`estado.css`, sección R10): el morph es scroll-acoplado, así que el
`scrollY` debe ser la fuente de verdad y nadie debe moverlo por
detrás. Con el anclaje desactivado el `scrollY` se queda donde el
cliente lo dejó y el asentamiento aterriza exacto. Solo afecta a
este preview; en Safari la propiedad se ignora (no la implementa),
sin efecto adverso. La nota de R9 sobre el anclaje empujando el
`scrollY` 10–16 px por encima de lo pedido ya no aplica.

## 3. Glow líquido más visible, acorde al tono

R9 se notaba poco: un solo degradado lineal con alphas ~.20 y halo
tenue. R10 pone **dos manchas radiales** — una de cada líquido del
estado — sobre la base lineal: cada mancha deriva en sentido
opuesto y a mitad del ciclo (8 s, `ease-in-out`, `alternate`) se
cruzan por el centro (55% / 45%) y se entremezclan sin fundirse:
en el cruce se suman con `background-blend-mode:screen` y el brillo
sube, como dos semilíquidos que se quieren mezclar. Los colores son
los mismos de R9 por estado (cian+morado normal, morado+cian
revisión, rojo+morado vencido, verde+morado pagado), solo sube la
intensidad: alphas .50 en el centro de cada mancha, halo exterior
`0 0 18px` con .38 y `0 0 36px` con .22. Sin amarillo chillante ni
colores fuera de tono: son los mismos tonos de siempre, más
presentes. Solo se anima `background-position` (las tres capas a la
vez en `gx-r10-liquid`), sin parpadeo y sin transform del texto; el
texto sigue legible porque las manchas viven en el fondo. Se pausa
con la pestaña oculta y se apaga con `prefers-reduced-motion`
(queda el degradado estático).

## Qué cambió (archivos)

- `preview/experiencia-financiera-espejo/estado.js` — `paint()`:
  tope de ancho de la píldora antes de medir, piso `scrollWidth`
  en ambas medidas; `morphController.repaint()` nuevo y llamada en
  `refresh()`; asentamiento R10 (`maybeSnap`, `animateSnap`,
  `cancelSnap`, `onScrollEnd`, listeners de `touchstart`/`touchend`/
  `wheel`); nota R10 en el comentario del morph.
- `preview/experiencia-financiera-espejo/estado.css` — sección R10:
  `overflow-anchor:none` en el preview; glow líquido con dos
  manchas radiales + base lineal, `background-blend-mode:screen`,
  `gx-r10-liquid` 8 s; se retira `gx-r9-liquid`.
- `preview/experiencia-financiera-espejo/estado.html` — solo bump de
  versión a `?v=e1b2r10v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — aserciones R10
  (animación `gx-r10-liquid`, dos radiales, blend screen) +
  regresiones R10: cambio de escenario sin desplazar (desplazamiento
  con el ancho REAL de la píldora nueva, tolerancia 2 px, sin
  solape) y asentamiento al soltar (de 120 px al extremo compacto y
  de 30 px al expandido).
- Este documento (nuevo).

## Qué se preserva

- Morph R5.2/R7 intacto (tau 64 ms, barra compacta en p≈0.35, gap
  10 px, blur 25 px y cristal del sticky, sin Block 3).
- Conteo del hero y del total seleccionado intactos (R8/R9); pulso
  R7 intacto; ambiente R8 intacto (lava, respiración de lealtad).
- Importes exactos de los fixtures ($45.00/$94.00/$49.00/$79.00,
  no $46/$92 de Nayeli); CLABE ficticia de R7 sin cambios; no
  secciones nuevas, no información duplicada.

## Verificación

- `node --check` estado.js y check.mjs: OK.
- `node scripts/verify-integrity.mjs`: OK.
- `node preview/experiencia-financiera-espejo/check.mjs`:
  **Chromium E1/B2 FINAL PASS 7 anchos × 12 estados**, incluidas
  las regresiones R10. WebKit local: no arranca (al sistema le
  faltan dependencias: `libgstreamer`, `libgtk-4` y otras; igual
  que R6/R7/R8/R9); la validación en Safari físico queda para Henry.
  Nota: el PASS de Chromium se obtuvo con el código de producto
  final; solo se retiró después una línea `console.log` de depuración
  por ancho del propio test, que no afecta a ninguna aserción.
- Repro R10 en Chromium 390/375/280 px: cambio de escenario sin
  desplazar (correction/review/extension/first_paid) sin solape y
  con el desplazamiento calculado con el ancho real de la píldora
  nueva; soltar en 120 px asienta al extremo compacto y soltar en
  30 px al expandido, en los tres anchos; glow con dos manchas
  radiales, blend screen y halo .38/.22.
- Tres defectos encontrados y corregidos durante la verificación
  (no llegaron al PR): el `scrollTo` suave del navegador peleaba
  con el anclaje de scroll (aterrizaje a medias, medido 61 px en
  vez de 0) → animación propia por frames; el snap peleaba con un
  `scrollTo` programático inmediato → disparo solo tras 250 ms de
  inactividad + cesión ante desplazamientos externos; el anclaje
  arrastraba el `scrollY` antes de evaluar → `overflow-anchor:none`.
