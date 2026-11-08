# GOXION · E1/B2 · R17 — Una sola barra + energía en las barras

- Fecha: 2026-11-07 · Rama: `beta/r17-barra-unica-energia-20261107` · Base: `main` 77cd0f6 (R16)
- Alcance: solo `preview/experiencia-financiera-espejo/` (`estado.js`, `estado.css`, `estado.html` bump `?v=e1b2r17v1`, `check.mjs`). Preview solo; no se toca Index oficial, Ayuda, Admin ni motor financiero. Sin secciones nuevas, sin duplicar información. Nayeli NO va en esta beta (el comprobante sí existe, $51.45 reportado; se aprueba en Admin oficial por F5→F3, no es cambio de código del preview).

## Dirección (Henry)

La animación se deja TAL CUAL (misma fluidez, mismos tiempos). Solo cambia el acomodo: el encabezado compacto es UNA SOLA BARRA tipo barra de búsqueda — a la izquierda un bloque junto (precio + píldora) y a la derecha, aislado, el botón "Mi Espacio", como el círculo con el más al lado de la barra. Y un efecto de energía / carga como el de las barras de carga del laboratorio de animaciones.

## Qué cambió

1. **Una sola barra (reemplaza el apilado de R16 y las 3 zonas de R14).** En compacto la píldora ya NO baja debajo del precio: se queda en su misma fila, pegada a la derecha del importe con gap 10 px, formando un solo bloque a la izquierda. El botón "Mi Espacio" queda aislado a la derecha, separado del bloque por ≥14 px. Ambos viajan juntos con el mismo spread (0.75→1) que el importe, así el gap se conserva en todo el recorrido y nunca se cruzan. Precio compacto sigue en 34 px visuales, píldora en 12 px, sin modificar tamaños. Huella compacta ≈ 45 px (antes ~79 px apilada, 36 px en R11); el contenido sube más por transform (contentShift ≈ −93 px).
   - **Título y etiqueta desaparecen JUNTOS:** "ESTADO DE CUENTA" y "Próximo pago" se desvanecen con el mismo spreadV (0.75→0.875); antes la etiqueta se iba en p≈0.33 y el título al final. En compacto no queda ni título ni etiqueta, solo la barra.
   - **Compromiso documentado:** con texto largo la píldora recorta con ellipsis en compacto — a 390 px "Acción necesaria" no cabe entera junto al importe de 34 px y al botón (importe + píldora + botón > ancho del hero); el solape nunca ocurre. A 280 px el piso del max-width bajó de 40 a 20 px: con 40 px la píldora se encimaba ~3 px al botón (lo cazó el test).
2. **Energía en las barras de carga.** Un segmento brillante recorre la pista de progreso de cada servicio (`.gx-b2-service-progress-track span`, la barra viva del laboratorio) cada 2.8 s, con pausa entre pasadas para no saturar; solo background/transform. La ruta de prueba (`.gx-r4-route-halo`, SVG) respira al mismo ritmo con un pulso de opacidad, sin tocar su dibujo. Sin glow en la píldora (descartado en R11), sin tocar el hero. Se pausa con pestaña oculta y se apaga con `prefers-reduced-motion`. El laboratorio no está como archivo aparte en el clon; la técnica es la de la barra viva (segmento que viaja por la pista).

## Qué se conserva

Morph solo-transform (R12), corrección R10 de la píldora sin solape (repaint + piso `scrollWidth`), asentamiento al soltar solo en la zona del morph (R10/R13, sin resorte al final), píldora SIN glow (R11), conteo (R8/R9), pulso (R7), respiración de lealtad (R8), blur 25 px y cristal, división sin remarcar (glass por desenfoque, NO liquid glass), botón "Mi Espacio" estilo Ayuda con texto blanco. Expandido idéntico a R16.

## Verificación

- `node --check` (estado.js, check.mjs) OK; `node scripts/verify-integrity.mjs` OK.
- `check.mjs` **Chromium E1/B2 FINAL PASS 7 anchos × 12 estados**, con regresiones R17 (barra única en una fila con gap 10, botón aislado ≥14 px, huella ≤60 px, título y etiqueta juntos, energía `gx-r17-energy` en la pista de progreso). El script termina en exit 1 solo por el lanzamiento de WebKit (faltan `libgstreamer` y otras libs del sistema, preexistente desde R6); validación en Safari físico pendiente de Henry.
- CI por nombre no verificada en esta corrida; no afirmar todo verde.

## Qué debe notar Henry en Safari/iPhone

En reposo todo igual que R16. Al compactar: una sola barra — precio y píldora juntos a la izquierda en la misma línea, "Mi Espacio" aislado a la derecha — y al bajar, en las barras de progreso de servicios, un brillo de energía que las recorre de vez en cuando. Al bajar al final, sin resorte.
