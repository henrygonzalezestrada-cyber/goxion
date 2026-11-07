# GOXION E1/B2 · R13 — Final del Index: resorte al bajar, importe vivo y estado vivo

Fecha: 2026-11-07. Base: `main` `61bba6c` (R12). Rama: `beta/r13-final-index-resorte-20261107`.
Solo preview (`preview/experiencia-financiera-espejo/`). No se toca el Index oficial,
Ayuda, Admin ni el motor financiero. Embargo Issue #142 sigue: nada se integra
al Index oficial sin E2/B3, E2/B4, E3/B5, auditoría global y autorización expresa.
MODO AHORRO: un solo bloque, verificación solo de lo tocado, reporte corto.

## Decisión de Henry (2026-11-07)

Probar la modalidad de ahorro (menos betas, cambios agrupados) y cerrar con ella
esta parte del Index, ya bastante avanzada: aplicar los cambios restantes
propuestos y corregir el bug del resorte al bajar. Después, otro pendiente:
se descartan por completo los jixis; sí la tarjeta inteligente (aprobada,
pendiente de perfeccionar animaciones y estética), que NO es esta beta.

## 1. Bug del resorte al bajar (prioridad)

Al bajar hasta el final de la página y soltar, la página regresaba al centro
como un resorte y ya no dejaba ver lo de abajo, incluidos los botones de pago.

Causa: el asentamiento de R10 (`maybeSnap` en `estado.js`) se disparaba tras
250 ms sin scroll en cualquier punto de la página, y asentaba el `scrollY` al
extremo más cercano de 0 o 172 px. Con `scrollY` mucho mayor que 172, el
"extremo más cercano" era 172: la página volvía al centro.

Corrección: el snap solo actúa dentro de la zona del morph (0–172 px). En
`maybeSnap`, si `scrollY > anchor` (172 o el máximo de la página si es
menor), no tocar el scroll para nada. Dentro de la zona, el comportamiento
R10 queda intacto (asienta a 0 o 172, cede si el cliente vuelve a tocar).

## 2. Hoja de reporte con importe vivo

La hoja ya ponía el importe al abrir, pero lo capturaba una sola vez y el
envío no llevaba la selección. Ahora `syncModalAmount()` construye el
importe SIEMPRE desde la selección viva (`current()`: Próximo / Todo junto /
un cargo): se llama al abrir y en cada `refresh()` con la hoja abierta, y el
botón de envío lleva `data-amount-cents` y `data-cargo-ids` de la selección
del momento de enviar. Portable a la oficial: el reporte debe construirse
desde la cotización viva al enviar, no desde un valor capturado al abrir.

CLABE: la del preview sigue siendo la ficticia etiquetada como demostración
(`012 180 0000 0000 00`). Al integrar a la oficial se liga a los datos
reales de Nu; eso es trabajo de integración, no de este preview.

## 3. Píldora y calendario por estado vivo

- Píldora: antes bastaba que algún cargo del período tuviera mora para que
  dijera "vencido", aunque el próximo pago estuviera al corriente. Ahora el
  estado se deriva del cargo próximo (`fx.next()`): mora → vencido,
  prórroga → "Prórroga · fecha". Revisión/corrección/bloqueo, como antes.
- Calendario: cada fila lleva su clase de estado derivada de su propio
  cargo (`is-overdue` si mora > 0, `is-extension` si prórroga,
  `is-partial` si abono > 0), y el CSS tiñe solo la etiqueta lateral de
  la fila con ese estado. Sin cambiar textos ni estructura.

## Verificación (solo lo tocado)

- `node --check` estado.js, `node scripts/verify-integrity.mjs`.
- `check.mjs` en Chromium a 390 px + regresión R13: bajar al final,
  soltar, y exigir que el `scrollY` se quede abajo (sin regresar a
  172); soltar a 120 px sigue asentando a compacto y a 30 px a
  expandido. WebKit local no arranca (falta libgstreamer, como en
  R6–R12); validación en Safari físico, de Henry.

## Lo que no cambió

Morph solo-transform R12 intacto, píldora sin glow (R11), corrección R10
de la píldora encimada, conteo R8/R9, pulso R7, blur 25 px y cristal.
Sin secciones nuevas, sin duplicar información.
