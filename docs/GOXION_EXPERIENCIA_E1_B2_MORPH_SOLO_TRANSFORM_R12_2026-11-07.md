# GOXION E1/B2 · R12 — Morph solo-transform (Block 3)

Fecha: 2026-11-07. Base: `main` `65e51a8` (R11). Rama: `beta/r12-morph-solo-transform-20261107`.
Solo preview (`preview/experiencia-financiera-espejo/`). No se toca el Index oficial,
Ayuda, Admin ni el motor financiero. Embargo Issue #142 sigue: nada se integra
al Index oficial sin E2/B3, E2/B4, E3/B5, auditoría global y autorización expresa.

## Decisión de Henry (2026-11-07)

Tras aprobar R10 (píldora sin solape + asentamiento) y descartar el glow (R11),
Henry eligió el **morph solo-transform** como siguiente mejora para elevar la
experiencia: que el scroll se sienta más suave, sin tirones, sobre todo con el
impulso del iPhone en Safari.

## El problema

El morph animaba la altura del hero en JS (116→36 px) y eso movía el documento:
al compactarse, el contenido subía 80 px, cambiaba la altura total de la página
y el anclaje de scroll del navegador compensaba empujando el `scrollY` — que es
justo la variable de la que depende el morph. El resultado era una
realimentación: scroll → morph → layout → scroll. En Chromium se mitigaba con
`overflow-anchor:none` (R10), pero Safari ignora esa propiedad, así que en el
iPhone de Henry el desplazamiento con impulso seguía con tirones. R7 ya había
descartado el solo-transform ("el defecto era el mapeo, no layout contra
transform") y tenía razón entonces: el cruce del badge era de tiempos. Pero el
tirón con impulso es de layout, y eso solo se quita dejando de tocar el layout.

## El diseño: la caja queda fija, solo se mueve lo visible

La idea es simple y es la que usan los headers que se sienten bien: la caja del
hero mide siempre 116 px y nunca se escribe desde JS; lo que se encoge es lo
que se VE dentro de ella. Tres piezas, todas sin layout:

1. **Precio y píldora solo con transform.** La fuente del importe se queda en
   52 px y la de la píldora en 12 px; el encogido es `scale` (52→26 es scale
   .5; 12→10 es scale .833) y el viaje es `translate`. La subida vertical
   (`dy`) compensa que el scale se hace sobre el centro:
   `visualTop = layoutTop + dy + layoutH·(1−scale)/2`. El título
   "ESTADO DE CUENTA" también se encoge con scale (14→11 px visuales) y el
   header (gaps, paddings, margin-bottom) queda fijo en sus valores de reposo.
   Las curvas son las mismas de R7 (pp/pb/paired), así que los tiempos no
   cambian: el precio viaja primero (p≈0.45), la separación termina en
   p≈0.35, el badge entra con retraso (0.30→0.75).
2. **El contenido sube con transform.** El `.scrollable-content` se traslada
   `translateY(V−V0)`, donde V es la altura visual del par y V0 su valor en
   reposo (≈114 px): en reposo 0, en compacto ≈ −78 px. El contenido queda
   justo debajo del par compacto, como en R11, sin que el documento cambie
   de alto ni el scrollY se realimente. El scroll avanza 1:1.
3. **El sticky se recorta con clip-path.** Su caja sigue midiendo 176 px en
   layout, pero lo que se ve termina donde termina el par compacto
   (`clip-path: inset(0 0 (116−V) 0)`). Sin clip, la caja fija dejaría una
   banda vacía de cristal de 80 px en compacto. El clip no rompe el sticky
   (no es `overflow`) ni el `backdrop-filter`. El fundido inferior, que vivía
   en el `::after` (recortado por el clip), se mudó al degradado de fondo del
   sticky: sus paradas se miden desde el borde visible (`100% − clip`), así
   que el fundido siempre cae en los últimos 27 px que se ven.

## Qué se preserva (lo visual es idéntico a R11)

- Extremos del par: alto visual ~114 px en reposo / 36 px en compacto,
  badge top 80→2 px, barra compacta en p≈0.35, gap 10 px, blur 25 px y
  cristal del sticky, fundido inferior.
- Conteo R8/R9 (700 ms hasta el valor exacto), pulso R7, respiración de
  lealtad R8, lava.
- Corrección R10 de la píldora encimada (repaint al cambiar contenido +
  piso `scrollWidth`) y asentamiento R10 al soltar. El asentamiento ahora
  es más fiable: nada mueve el `scrollY` por detrás durante el morph.
- Píldora SIN glow (R11, plana original). Sin secciones nuevas, sin
  información duplicada. Importes exactos de los fixtures ($45.00/$94.00/
  $49.00/$79.00, no $46/$92 de Nayeli); CLABE ficticia de R7 sin cambios.

## Compromiso honesto (lo que cambia y hay que saber)

- **La caja del sticky sigue midiendo 176 px en layout; el recorte es
  solo visual.** En compacto el usuario ve exactamente lo mismo que en
  R11 (mismo par, mismo contenido justo debajo, mismo fundido). Lo que
  cambia es el tacto: el scroll ya no "empuja" el contenido 80 px al
  compactar — el contenido sube por transform y el scroll avanza 1:1.
  El alto total de la página ya no cambia con el morph.
- **La medida cambió de bando:** `getBoundingClientRect()` ya no sirve
  para medir anchos/altos (con scale, el rect es el tamaño visual).
  Los anchos se miden con `scrollWidth` y los altos con `offsetHeight`
  (layout, sin transform); lo visual es layout × scale. La regresión
  R10 (desplazamiento con el ancho real de la píldora nueva) sigue
  pasando porque el test mide el rect visual y el JS calcula el
  desplazamiento con ese mismo ancho visual.
- **`--gx-rm-badge-max` ya no se encoge** (quedaba en 47% en compacto):
  a 12 px fijos, encogerlo recortaría "Acción necesaria" con ellipsis
  (antes la fuente bajaba a 10 px y cabía). Con 96% fijo el par cabe
  igual en 280–390 px en todos los escenarios.
- El `::after` de fundido queda apagado (`display:none`): el clip-path
  lo recortaría de todos modos. El fundido vive en el fondo.

## Qué cambió (archivos)

- `preview/experiencia-financiera-espejo/estado.js` — `paint()`: ya no
  escribe `--gx-rm-hero-h`, tamaños de fuente, tops ni vars del header;
  escribe `--gx-rm-amount-scale/dy/shift`, `--gx-rm-badge-scale/dy/shift`,
  `--gx-rm-content-shift`, `--gx-rm-clip` y `--gx-rm-title-scale`; medidas
  con `scrollWidth`/`offsetHeight`; `heroRestH` (V0) para el
  desplazamiento del contenido. Comentarios R12 en el morph y en el
  asentamiento.
- `preview/experiencia-financiera-espejo/estado.css` — vars de reposo
  fijas; hero `height:116px`; importe/píldora/título con scale+translate;
  `.scrollable-content` con `translateY(var(--gx-rm-content-shift))`;
  sticky con `clip-path` y fondo con fundido relativo al borde visible;
  `::after` apagado; sección R12 al final.
- `preview/experiencia-financiera-espejo/estado.html` — solo bump de
  versión a `?v=e1b2r12v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — regresiones R12:
  alto del hero y del sticky constantes en reposo/mitad/compacto,
  font-size del importe fijo en 52 px (el encogido es visual), huella
  visual del par 114→36 px, recorte del sticky ≥70 px y subida del
  contenido ≤−70 px en compacto; las aserciones R7 de mitad de scroll
  y del bloque expandido/compacto pasan a medirse en rects (alto
  visual del importe, banda vacía vía clip) en vez de en `font-size`
  y `height` de layout. Las regresiones R10 (sin solape al cambiar de
  escenario, asentamiento a ambos extremos) se conservan sin cambios.
- Este documento (nuevo).

## Verificación

- `node --check` estado.js y check.mjs: OK.
- `node scripts/verify-integrity.mjs`: OK.
- `node preview/experiencia-financiera-espejo/check.mjs`:
  **Chromium E1/B2 FINAL PASS 7 anchos × 12 estados**, incluidas las
  regresiones R12. WebKit local: no arranca (al sistema le faltan
  dependencias: `libgstreamer`, `libgtk-4`, `libavif16` y otras; igual
  que R6–R11); la validación en Safari físico queda para Henry.
- Repro R12 en Chromium 390/375/280 px: hero fijo 116 px y sticky fijo
  170 px en reposo/mitad/compacto; huella visual del par 108→30 px;
  importe visual 58→29 px (font-size fijo 52 px); gap del par ~10 px
  sin solape en todos los escenarios, incluida "Acción necesaria" con
  $79.00; clip del sticky 80 px y subida del contenido −80 px (−78 px
  a 280 px) en compacto; asentamiento a ambos extremos; reposo
  idéntico a R11 y compacto idéntico a R11 en captura. Una captura
  compacta a 390 px con viewport 550 mostró el título cortado arriba,
  pero fue un artefacto transitorio (captura a mitad del asentamiento
  tras el resize): repetida con el scroll asentado (scrollY 172,
  stickyTop 0, titleTop 19.2 px), el título está completo.
