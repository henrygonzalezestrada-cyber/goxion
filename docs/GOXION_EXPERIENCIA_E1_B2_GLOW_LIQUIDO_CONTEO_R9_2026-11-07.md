# GOXION E1/B2 · R9 — Glow líquido en las píldoras + corrección del conteo de Todo junto

Fecha: 2026-11-07. Base: `main` `dfb17cd` (R8). Rama: `beta/r9-glow-liquido-conteo-20261107`.
Solo preview (`preview/experiencia-financiera-espejo/`). No se toca el Index oficial,
Ayuda, Admin ni el motor financiero. Embargo Issue #142 sigue: nada se integra
al Index oficial sin E2/B3, E2/B4, E3/B5, auditoría global y autorización expresa.

## Feedback de Henry en su iPhone (2026-11-07)

1. El resplandor detrás del precio no le agradó: se comporta extraño cuando
   todo se contrae.
2. En lugar del resplandor, en las píldoras de estado, un glow dependiente
   del color principal combinándolo con otro, como mezclar dos semilíquidos.
3. Al seleccionar Todo junto, el total no cambia con el nuevo efecto de
   conteo.

## 1. Glow del hero: QUITADO por completo

- Eliminada la capa `#gx-b2-hero::before` y los keyframes `gx-r8-glow` de
  `estado.css`, y sus referencias en las reglas de pausa (`gx-r8-paused`)
  y de `prefers-reduced-motion`.
- Verificado por grep: no queda ninguna regla `gx-r8-glow` ni `hero::before`
  fuera del comentario que documenta la eliminación, y `check.mjs` afirma
  que `::before` tiene `animationName: 'none'` y `content: 'none'`.
- Al contraer ya no queda halo ni overflow detrás del precio.

## 2. Glow líquido en las píldoras de estado (`.time-badge`)

- El gradiente vive en la propia píldora (`background-image` sobre el fondo
  base) y mezcla el color principal de cada estado con otro líquido:
  - normal (`badge-ok`): cian `#00f2fe` + morado `#7c4dff`;
  - en revisión (`badge-review`): morado `#7c4dff` + cian `#00f2fe`
    (el principal ya es morado, así que el segundo es cian);
  - vencido (`badge-overdue`): rojo `#ff3366` + morado `#7c4dff`;
  - pagado (`badge-paid`): verde `#00ff9d` + morado `#7c4dff`.
- Los colores se declaran como tripletes RGB en variables
  (`--gx-pill-a-rgb` / `--gx-pill-b-rgb`) por clase, así que al cambiar
  el estado cambia la clase y con ella el color principal del glow; la
  transición `.25 s` de R7 suaviza el cambio de color, borde y sombra.
- Solo se anima `background-position` (9 s, ida y vuelta, `alternate`,
  sin parpadeo): dos líquidos que se mezclan lento. El halo exterior es
  un `box-shadow` tenue de los dos mismos colores. Sin `::after`, sin
  blur, sin halo detrás del precio. El barrido blanco R8 (`gx-r8-sheen`)
  se elimina: lo sustituye este glow.
- Se pausa con la pestaña oculta (`html.gx-r8-paused`) y se apaga con
  `prefers-reduced-motion` (queda el gradiente estático, sin movimiento).
- Sutil a propósito: se nota al mirar, no distrae al leer. La respiración
  del anillo de lealtad (R8) se conserva; Henry no se quejó de ella.

## 3. Bug de Todo junto: causa raíz y corrección

### Reproducción (Chromium 390 px, escenario `multi`)

- En scroll 0 el total sí sumaba: `$45.00 → $55.07 → $65.90 → … → $94.00`.
- Con la página desplazada (con `scrollIntoView` sobre el botón Todo
  junto, progreso del morph = 1, como en el iPhone) todos los muestreos
  eran `$94.00`: el total saltaba directo, sin contar. En la dirección
  contraria (94 → 45 con la página desplazada) el total se quedaba
  clavado en `$45.00` y `check.mjs` fallaba en la línea 175.

### Causa raíz (dos capas; la segunda fue la decisiva)

1. En `breakdown()` el conteo del total seleccionado estaba supeditado
   a `morphController.progress() <= 0.02`, la misma guarda del importe
   del hero. En el iPhone el botón "Todo junto" está bajo el pliegue,
   dentro del calendario, así que al pulsarlo la página YA está
   desplazada y la guarda suprimía el conteo siempre. La guarda era
   para el hero, que viaja con el morph (contarlo a mitad de morph fue
   el bug `$45.72` / `$86.16` del espejo viejo); el total seleccionado
   vive en el desglose, bajo el hero, y NO viaja con el morph, así que
   contarlo con la página desplazada es seguro.
2. Quitar esa guarda NO bastó: `check.mjs` siguió fallando. Con
   instrumentación temporal (envoltorios de `requestAnimationFrame` /
   `cancelAnimationFrame` y registro de eventos, ya retirados) se vio
   que el conteo sí arrancaba al tocar el botón (frame 172 registrado
   en `breakdown()` a t=4423 ms) y 47 ms después lo cancelaba
   `selectedCounter.cancel(true)` desde `request()`, el handler de
   scroll del morph (`estado.js`, línea 548). El `scrollend` final del
   desplazamiento suave que llevó hasta el botón llegaba después del
   toque, y la guarda R8 cancelaba AMBOS contadores al desplazar.
   En el iPhone esto es un caso real, no solo de test: tocar
   "Todo junto" justo después de desplazar (con el momentum del
   scroll) es natural, y el `scrollend` llega tarde y mata el conteo.

### Corrección

- Se quita la guarda `progress() > 0.02` **solo** para el total
  seleccionado en `breakdown()`; el hero la conserva.
- Y se quita `selectedCounter` de la cancelación por scroll en
  `request()`: ahora solo se cancela `heroCounter`, que es el que
  viaja con el morph. El total seleccionado ya no se cancela al
  desplazar: cuenta hasta el final aunque lleguen eventos de scroll
  tras el toque, y aterriza exacto. Con `reduced-motion`, valor
  exacto directo. No se tocó `makeCounter` ni el pulso R7.
- El test R8 de cancelación al desplazar sigue pasando: el conteo del
  total seleccionado termina en el valor exacto ($45.00) aunque la
  página esté desplazada, porque ya no depende del scroll.

### Regresión

`check.mjs` añade el caso R9: desplazar hasta el control, volver a
Próximo y a Todo junto, y en ambos casos exigir valores intermedios
entre $45.00 y $94.00 y aterrizaje exacto.

## Qué cambió (archivos)

- `preview/experiencia-financiera-espejo/estado.js` — `breakdown()`: se
  quita la guarda de progreso del conteo del total seleccionado; y
  `request()` (handler de scroll del morph): al desplazar solo se
  cancela el contador del hero, ya no el del total seleccionado.
- `preview/experiencia-financiera-espejo/estado.css` — sección R8/R9:
  eliminado el glow del hero y el barrido del badge; añadido el glow
  líquido de la píldora por estado.
- `preview/experiencia-financiera-espejo/estado.html` — solo bump de
  versión a `?v=e1b2r9v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — aserciones R9
  (sin glow en el hero, glow líquido en la píldora) + regresión del
  conteo de Todo junto con la página desplazada.
- Este documento (nuevo).

## Qué se preserva

- Morph R5.2/R7 intacto (tau 64 ms, barra compacta en p≈0.35, badge sin
  cruzar el importe, gap 10 px, blur 25 px y cristal del sticky).
- Conteo del hero intacto (700 ms, solo en reposo, se cancela al
  desplazar); pulso R7 intacto; ambiente R8 intacto salvo lo quitado
  (lava, respiración de lealtad).
- Importes exactos de los fixtures ($45.00/$94.00/$49.00, no $46/$92
  de Nayeli); CLABE ficticia de R7 sin cambios; no secciones nuevas,
  no información duplicada.

## Verificación

- `node --check` estado.js y check.mjs: OK.
- `node scripts/verify-integrity.mjs`: OK (ver reporte del padre).
- `node preview/experiencia-financiera-espejo/check.mjs`: **Chromium
  E1/B2 FINAL PASS 7 anchos × 12 estados**, incluidas las regresiones
  R9. WebKit local: no arranca (al sistema le faltan dependencias:
  `libgstreamer` y otras; igual que R6/R7/R8); la validación en
  Safari físico queda para Henry.
- Nota de test: la regresión R9 dejaba la página desplazada
  (progreso ≈1) y el test de banda R7 ya no alcanzaba [0.35, 0.60]
  porque el anclaje de scroll empuja el scrollY real 10–16 px por
  encima de lo pedido (el progreso se asentaba en 0.61–0.92). Se
  añadió un reset a scroll 0 con progreso <0.01 antes del bucle de
  banda, restaurando la precondición de R8. No es un cambio de
  producto: el morph se asienta correctamente.
- Repro R9 en Chromium 390 px: con la página desplazada el total
  seleccionado pasa por intermedios y aterriza en $94.00 exacto, y al
  volver a Próximo en $45.00 exacto.
