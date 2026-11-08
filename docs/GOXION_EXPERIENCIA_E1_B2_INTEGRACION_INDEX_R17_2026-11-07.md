# GOXION · Integración Index R17 — morph oficial (E1/B2 R5.2–R17)

- Fecha: 2026-11-07 · Rama: `integracion/index-morph-r17-20261107` · Base: `main` 60862b4 (R17)
- Alcance: Index OFICIAL (`index.html`, `assets/js/index/05-index-header-morph.js` nuevo, `assets/css/index.css`, `preview/integracion-b2/index.html` — mismo Index para clientes B2). Producción, autorizado expresamente por Henry el 2026-11-07 22:17 CST ("Super ya quedó", "De una vez"). No se toca Admin, no se toca Ayuda, no se toca el motor financiero, no se toca nada de Nayeli en base.
- Sin secciones nuevas, sin duplicar información. El preview E1/B2 sigue intacto; esta integración PORTA su comportamiento al Index oficial, no copia el preview.

## Qué se portó (y cómo se adaptó)

1. **Morph solo-transform (R12).** Hero de alto fijo, precio con scale/translate, píldora con translate, título con scale, contenido que sube con transform y recorte con clip-path. El documento no cambia de alto al compactar y el scrollY no se realimenta. La geometría NO se copió del preview (116/172): se MIDE del DOM oficial en cada enlace — medido en Chromium 390 px: hero 108 px, importe top 16, píldora top 80, sticky 169 px (158 con el gap R15), RANGE = alto del sticky + margin-bottom = 176.
2. **Fluidez R5.2.** Damping por delta-tiempo, tau 64 ms; al soltar, tau 26 ms. Watchdog 62 ms para Safari.
3. **Asentamiento R10/R13.** Al soltar a mitad, el scroll termina en el extremo más cercano (0 o RANGE), con animación propia por frames que re-lee el scrollY real. Solo en la zona del morph: fuera no toca el scroll (sin resorte al bajar al final, botones de pago siempre alcanzables).
4. **Acomodo R7/R10/R14/R15/R17.** Barra compacta en p≈0.35; compacto en UNA SOLA BARRA: precio 34 px + píldora 12 px juntos a la izquierda (gap 10), botón "Mi Espacio" aislado a la derecha, estilo Ayuda, texto blanco, mismo alto que la píldora; "ESTADO DE CUENTA" y "Próximo pago" desaparecen juntos (spreadV 0.75→0.875). Píldora 12 px original, sin glow (R11). Gap título→precio 15→4 px (R15). Sin flecha de retroceso: la oficial no la tiene y no se añade. La píldora nunca se encima al precio: se repinta cuando cambia su texto (R10) y en compacto recorta con ellipsis con max-width calculado (piso 20 px, R17).
5. **Conteo R8/R9 + pulso R7.** El importe cuenta (700 ms, ease-out cúbico, centavos exactos) solo al cargar y cuando el valor CAMBIA de verdad. Lo observa con MutationObserver sobre el `.total-amount`: el re-render de realtime que vuelve a pintar el mismo valor NO cuenta; si el cliente desplaza, el conteo se cancela y queda el valor exacto (nunca $45.72 a mitad de morph). El pulso usa la propiedad CSS `scale` (no transform) para no pelear con el morph ni tocar el DOM que el adaptador B2 reescribe con textContent. Se añadió `font-variant-numeric:tabular-nums` al importe para que los dígitos no bailen al contar.
6. **Hoja de reporte con resorte.** NO se reimplementó: la oficial V2 YA entra con resorte (`.34s cubic-bezier(.18,.86,.22,1.04)` desde translateY(18px) scale(.978)) y su importe YA es vivo (lo pasa `abrirModalPago` / el adaptador B2 con la cotización real y los datos reales de Nu). Añadir otra animación pelearía con la suya.
7. **Energía R17.** La oficial no tiene pistas de progreso; el equivalente fiel es la fila del próximo pago B2 (`.gx-b2-row.is-next`): una línea de luz recorre su base cada 2.8 s, con pausa entre pasadas. En flujo global no hay fila: no hay energía, no se inventa UI nueva. Se pausa con pestaña oculta y se apaga con `prefers-reduced-motion`.
8. **Blur y cristal intactos.** El blur oficial es 27 px (V2, en `::before`) / 28 px (base): NO se cambió a 25 px del preview. El sticky oficial vivo es `gx-payment-v2` (fondo transparente + `::before` con blur 27 px y cola de fundido de 58 px por debajo de la caja): el recorte usa `--gx-rm-cut`, que en reposo vale -58 (la cola queda exacta) y en compacto vale el clip; el `::before` se acorta con la misma variable para que el fundido siempre termine en el borde visible. Sin esto, el clip-path se comería la cola en reposo.

## Qué se dejó fuera deliberadamente

- Fixtures y escenarios del preview ($45/$94/$49, `?escenario=`): la oficial usa el motor financiero real (Edge `estado-financiero`, cotización viva B2, datos reales de Nu, flujo de comprobantes).
- CLABE ficticia `012 180 0000 0000 00`: la hoja oficial ya tiene sus datos reales de Nu; se conservan.
- R6 (jerarquía/agrupación, 21/11 px): no estaba en el alcance de integración.
- Animate UI, Morphicons, `overflow` del preview: no van a la oficial.
- Glow líquido en la píldora (R9/R10): descartado por Henry en R11; la píldora queda plana, original.
- Cambios al motor financiero, a `goxion_b2_*`, a Admin o a Ayuda: ninguno. El morph solo mueve transform/opacity/clip-path y lee textos que otros escriben; no calcula importes ni cambia estados.

## Detalles de implementación

- `assets/js/index/05-index-header-morph.js` (nuevo, ~400 líneas): controlador autocontenido. Enlaza el hero cuando aparece (el render oficial es asíncrono tras Supabase) y se re-enlaza en cada re-render de realtime (`#app` se reescribe entero) con debounce de 120 ms; si no hay `.sticky-area` (puerta de login, error), no hace nada y no pone el flag. El CSS vive bajo `html[data-gx-index-morph="r17"]`, así que sin el JS la oficial se ve exactamente como antes. Expone `window.GOXION_INDEX_MORPH` (`progress()`, `repaint()`, `bound()`) para verificación.
- El ancho del importe se mide con `scrollWidth`, no con Range: el rect de un Range es el ancho VISUAL (ya escalado) y al remediar a mitad de morph el ancho se encogía al cuadrado de la escala — bug cazado por el test (el importe se desplazaba 17 px de menos y la píldora se encimaba ~8 px en compacto). Bajo el CSS del morph el importe es `width:max-content`, así que `scrollWidth` es el ancho real del texto (~159 px para "$46.00" a 52 px).
- El botón "Mi Espacio" se inyecta en el hero (la oficial no lo tiene), `href="ayuda.html"` — mismo destino que el enlace "Ir a Mi Espacio" de la puerta de login; en la ruta B2 el `base href="../../"` lo resuelve igual. Solo recibe puntero en compacto (`data-gx-rm-compact`).
- `overflow-anchor:none` bajo el flag (R10): el anclaje ya no empuja el scrollY durante el asentamiento.
- `index.html` y `preview/integracion-b2/index.html` cargan el script tras `02-02-inline.js`. La ruta B2 es el mismo Index oficial con el adaptador; el morph trabaja sobre el mismo hero y no pelea con `updateHeader()` (que escribe `textContent`): el observador lo detecta y cuenta el cambio.

## Verificación (Chromium, datos de QA/fixture — nunca datos reales de clientes)

Harness temporal `.tmp-harness/` (borrado antes del PR; no va al repo): clon estático del DOM que genera `02-02-inline.js` con el `index.css` y el script reales, en global y en B2 (tarjeta `#b2-calendar` con filas `.gx-b2-row.is-next`), servido por `scripts/serve-preview.mjs`. **42 checks, TODO PASS** (`node .tmp-harness/verify.mjs`):

- Reposo 390 px: morph enlazado, sin pageerror, conteo inicial termina exacto $46.00, progreso 0, sticky 158 px, hero fijo 108 px, importe top 16, píldora top 80, importe 52 px, botón invisible sin puntero.
- Mitad (scroll 88, p≈0.49): sin solape importe/píldora.
- Compacto 390 px: progreso 1, importe 34 px visuales, importe y píldora en la misma fila, sin solape importe/píldora ni píldora/botón, botón visible a la derecha con puntero, título y etiqueta a opacidad 0, contenido a 18 px exactos bajo la barra visible.
- Asentamiento desde 88: trace 88→110→139→155→164→169→172→175→176 (aterriza exacto en el extremo).
- Final de página: scrollY se queda en el máximo (1244), sin resorte.
- Cambio de selección simulado ($46→$94 escribiendo textContent como el adaptador): cuenta con valores intermedios exactos (`$46.00 → $56.81 → … → $94.00`), sin valores falsos.
- Píldora larga ("🚨 Acción necesaria"): sin solape en reposo ni en compacto; recorta con ellipsis en compacto (121 px a 390 px).
- 280 px compacto: sin solapes (píldora a 30 px, piso por padding).
- B2 390 px: enlazado, sin pageerror, $46.00 exacto, energía `gx-index-energy` 2.8 s en `.gx-b2-row.is-next`, Todo junto cuenta a $92.00 exacto, compacto sin solapes.
- Index real (`/index.html?cliente=prueba`, puerta de login): script carga sin pageerror, morph NO enlazado, puerta intacta.
- Capturas revisadas: reposo idéntico a la oficial; compacto en una sola barra; a mitad, el precio pasa sobre la etiqueta que se desvanece (transitorio, igual que en el preview R17 aprobado); al final, el pie y los botones de pago quedan alcanzables.
- `node --check` OK; `node scripts/verify-integrity.mjs` OK (exit 0).
- `npm run test:smoke`: Chromium · Index sin errores (igual que en base). El resto de fallos son PREEXISTENTES y se verificaron idénticos en `main` 60862b4 sin estos cambios (worktree de control): Ayuda "Soporte no inició el crecimiento del morph" + `Failed to fetch`, Admin `Failed to fetch` ×4, WebKit no arranca (faltan `libgstreamer` y otras libs del sistema). Exit 1 en ambos casos. No es una regresión de esta integración.
- CI por nombre no verificada (el conector no expone check-runs); no afirmar todo verde. WebKit local no arranca (preexistente desde R6).

## Compromisos y riesgos conocidos

- Con texto largo, la píldora recorta con ellipsis en compacto a 390 px ("Próximo pago · 6 nov" → "Próximo pago · 6 n…"; "Acción necesaria" no cabe entera). Es el compromiso documentado de R17, aprobado por Henry en el preview. El solape nunca ocurre; la fecha completa sigue visible en reposo y en la tarjeta B2 que está justo debajo.
- A mitad de morph el precio pasa por encima de la etiqueta "Próximo pago" mientras se desvanece (transitorio, ~200 ms de scroll). Igual que en el preview R17 aprobado.
- El `clip-path` en el sticky V2 y el `backdrop-filter` del `::before` conviven en Chromium (verificado en capturas: el contenido se ve borroso bajo el fundido, sin corte duro). En Safari físico es el punto a validar por Henry: si el desenfoque se viera raro al compactar, el fallback es quitar el clip-path (la barra quedaría con banda de cristal, sin romper nada más).
- El re-render de realtime reescribe `#app`: el morph se re-enlaza y NO vuelve a contar si el valor es el mismo (lo guarda en `lastCents`). Si el valor cambia entre re-renders, cuenta desde el último valor mostrado.

## Qué debe notar Henry en Safari/iPhone (oficial)

En reposo, todo igual que antes — mismo título, mismo importe, misma píldora, mismo cristal. Al desplazar: el precio se encoge suave a 34 px y se va a la izquierda junto a la píldora en una sola barra, con "Mi Espacio" aislado a la derecha; el título y "Próximo pago" se desvanecen juntos. Al soltar a mitad, la barra termina de acomodarse sola al extremo más cercano. Al bajar hasta el final, la página ya no regresa sola: los botones de pago quedan a la mano. En clientes B2, la fila del próximo pago tiene una línea de luz que la recorre de vez en cuando. Si abre la oficial con la sesión ya iniciada y ve la versión vieja, cerrar la pestaña y volver a abrir (caché de Safari). **Antes de darlo por cerrado: revisar con un cliente real (un flujo global y uno B2) que el importe, la píldora y la hoja de reporte sigan mostrando los datos vivos correctos.**
