# GOXION · E1/B2 · Encabezado compacto en 3 zonas · R14 (2026-11-07)

Beta de preview, solo `preview/experiencia-financiera-espejo/`. No toca el
Index oficial, Ayuda, Admin ni el motor financiero. No hay secciones nuevas
ni información duplicada. Blur 25 px y cristal intactos.

## Problema

Con todo centrado, el encabezado compacto se sentía desperdiciado: precio y
píldora flotaban en el centro y sobraba espacio a los lados.

## Cambio (solo el encabezado compacto, p≈1; expandido queda igual)

En compacto la fila se reparte en 3 zonas: **precio a la izquierda,
píldora al centro y botón "Mi Espacio" a la derecha**, con 8 px de aire
entre zonas. El botón es cian `#00f2fe` con texto oscuro (`#02141b`,
blanco sobre cian se lee mal), mismo alto que la píldora compacta y mismo
radio. Solo se ve en compacto (entra con el morph, sin pointer-events
hasta p>.95); en expandido no se ve.

- Etiqueta "Mi Espacio": "Regresar" es ambiguo en Index (no hay pantalla
  anterior) e "Ir a Mi Espacio" no cabe en compacto. Destino: `ayuda.html`,
  el mismo que usa el Index oficial para "Ir a Mi Espacio"
  (`assets/js/index/01-index-supabase-layer.js`, "Ir a Mi Espacio").
- Segunda fase del morph: hasta p≈0.75 todo sigue igual que R12 (par
  centrado); de 0.75→1 el precio desliza a la izquierda, la píldora
  vuelve al centro exacto y el botón entra con opacidad. Sigue siendo
  solo-transform (R12): sin tocar el layout.
- La píldora se ajusta con max-width calculado (`hero − 2·max(precio,
  botón) − 16 px`): nunca se encima del precio ni del botón; con textos
  largos y pantalla estrecha recorta con ellipsis. A 390 px cabe entera
  ("Acción necesaria"); a 280 px se recorta.
- Se conserva: corrección R10 (píldora sin solape, repaint + piso
  scrollWidth), asentamiento R10/R13 (solo en la zona del morph),
  morph solo-transform R12, píldora SIN glow (R11), conteo R8/R9,
  pulso R7, respiración de lealtad R8.

## Verificación

- `node --check` (estado.js, check.mjs) OK; `node scripts/verify-integrity.mjs` OK.
- `check.mjs` **Chromium E1/B2 FINAL PASS, 7 anchos × 12 estados**,
  con regresiones R14 nuevas (compacto: precio en el borde izquierdo,
  píldora centrada, botón a la derecha con 8 px de aire y mismo alto
  que la píldora, visible solo en compacto; expandido: botón oculto,
  idéntico a R13). La regresión R10 de desplazamiento se actualizó:
  en compacto el shift del importe ya no es el del par centrado sino
  la mezcla par-centrado → borde izquierdo según el spread.
- WebKit local no arranca (faltan libgstreamer, libgtk-4, libavif16 y
  otras, igual que R6–R13); la validación en Safari físico queda para Henry.
- CI por nombre no verificada en esta corrida; no afirmar todo verde.
