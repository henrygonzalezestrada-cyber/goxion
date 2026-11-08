# GOXION · Integración Index R17 — completar (E1/B2 R5.2–R17)

- Fecha: 2026-11-07 · Rama: `integracion/index-r17-completar-20261107` · Base: `main` a5d56009 (PR #184)
- Alcance: Index OFICIAL (`assets/js/index/02-02-inline.js`, `assets/js/index/05-index-header-morph.js`, `assets/css/index.css`) y ruta B2 (`preview/index-b2/b2.css`, `preview/integracion-b2/index-adapter.js` — mismo Index para clientes B2). No se toca Admin, no se toca Ayuda, no se toca el motor financiero, no se toca nada de Nayeli en base (su caso es solo referencia visual: $51.45 Vix Premium x2, VENCIDO Perfil 1).
- Sin secciones nuevas inventadas, sin duplicar información, sin fixtures, sin CLABE ficticia. Solo datos vivos reales. Blur/cristal intactos (27 px V2 / 28 px base).

## Auditoría: qué faltaba y qué se portó ahora

### a) En qué parte del proceso está el pago — FALTABA, PORTADO
- Preview: sección `#gx-b2-proof` justo bajo el encabezado, con icono animado (reloj al revisar, X al observar, check al validar), nombre, pista y 3 etapas con barra (Recibido → Validando → Resultado / Recibido → Revisado → Corregir / Recibido → Verificado → Aplicado). Renderizado por Animate UI React (`renderProof`, fase `quote().proof`).
- Oficial: NO existía. Solo la píldora ("⏳ Pago en revisión") y el bloque `.btn-review-state` en las acciones.
- Portado ahora (vanilla, sin React — la oficial no carga Animate UI): sección `.gx-index-proof`, abierta sin tarjeta (solo línea inferior, como el preview R5), con iconos Lucide con las mismas rutas que los componentes del preview y reloj con manecilla animada en CSS (pausa con pestaña oculta y `reduced-motion`).
- Datos vivos que la alimentan (solo lectura del estado del motor, sin calcular nada):
  - `review` ("Recibimos tu comprobante", 66%): `pago_en_revision` (Edge `estado-financiero` / `cliente.pago_en_revision` / `pago_revision_estado === "revision"`).
  - `correction` ("Hay una observación", 66%): `pago_incompleto` o `pago_revision_estado === "rechazado"`; la pista es el mensaje real de Admin (`cliente.pago_revision_mensaje`) cuando existe, si no el texto del preview.
  - `approved` ("Comprobante validado", 100%): período pagado Y `pago_revision_estado === "aprobado"` (las dos condiciones: así no se afirma un comprobante validado en un período nuevo sin recibo).
  - Sin fase (al corriente pendiente, vencido sin recibo): no hay sección, como en el preview.
- B2: el flujo B2 no marca `pago_en_revision` en el cliente (por eso el comprobante es invisible en Admin normal); la única señal viva es `quote.comprobante_en_revision`. El adaptador inserta el mismo tracker en fase `review` como primer hijo del contenido; si el render global ya pintó uno, no se duplica. Fase `approved`/`correction` B2 no disponible: la cotización no trae ese estado.
- Sin duplicar: en revisión se quitó el bloque `.btn-review-state` de las acciones (el mensaje vive solo en el seguimiento, igual que en el preview: "Message belongs only to the proof timeline"). La píldora del hero sigue diciendo el estado y el botón de pago no aparece.

### b) Lealtad con estrella y 4 secciones — FALTABA, PORTADO
- Preview: panel ABIERTO (sin tarjeta glass, solo línea inferior), joya de 81 px: anillo con secciones por pago del nivel y estrella Lucide al centro con respiración suave (5.6 s); título "TU LEALTAD", leyenda "3 de 4 pagos puntuales", descripción del nivel; estado perdido con corazón roto, "RACHA REINICIADA" / "Perdiste tu avance".
- Oficial: tarjeta glass `.loyalty-badge` con emoji ⭐ de 32 px, título "Programa Goxion" y descripción que repetía el conteo ("Progreso: 3/4 pagos…").
- Portado ahora (vanilla, misma estrella Lucide del preview): la tarjeta pasa a abierta (fondo degradado leve + línea inferior, como el preview); anillo con UNA SECCIÓN POR PAGO del nivel (4 o 9, los mismos objetivos del preview) y estrella al centro con respiración 5.6 s (pausa con pestaña oculta y `reduced-motion`); título "TU LEALTAD" / "RACHA REINICIADA"; leyenda "X de 4 (o 9) pagos puntuales"; descripción solo con el mensaje del nivel (ya no repite el conteo).
- Datos vivos: racha = `pagos_efectivos` del motor; objetivo 4 (Nivel 1) o 9 (Nivel 2); perdido = `racha_reiniciada_virtual`. En perdido la estrella queda atenuada en rosa y el anillo en 0 (no hay icono de corazón roto vendado en el repo: el 💔 ya estaba en el mensaje oficial y se conserva ahí).
- B2: el adaptador aplica la variante "perdida" sobre la joya nueva cuando `quote.lealtad_global_perdida` es true (y la restaura si se apaga); si no, manda lo que pintó el render global.

### c) Calendario sin recuadro — FALTABA, PORTADO (ruta B2)
- Preview: `.gx-b2-calendar` con `padding:0`; filas ABIERTAS: botones sin radio ni fondo propio, separados solo por una línea fina; la fila activa se distingue por el importe en cian y la etiqueta "Seleccionado".
- Oficial B2: filas `.gx-b2-row` con `border-radius:11px`, `margin:2px 0` y fondos degradados propios por estado (activa, próxima, vencida): cada fila era un recuadro.
- Portado ahora (`preview/index-b2/b2.css`): filas abiertas como el preview (sin radio, sin fondo, línea fina separadora, `padding:13px 4px`); la fila activa se distingue por el importe en cian (como el preview) y la próxima por la línea de energía R17 en su base + la etiqueta VENCIDO/PRÓXIMO. Se eliminó el brillo que recorría la fila (`gxB2NextSheen`, iba con el recuadro). La tarjeta en sí, el toggle, el desplegable y los modos (Próximo/Todo junto) no cambian; el calendario sigue cerrado por defecto.
- El flujo global no tiene calendario (una sola fecha): no se inventa ninguno.

### d) Capa de blur/desvanecido del encabezado — FALTABA, PORTADO
- Preview (R12): el fondo del propio sticky se desvanece a transparente en los últimos 27 px de la zona VISIBLE (paradas ancladas a `100% − clip`): el contenido emerge borroso a través de la propia barra, sin línea de corte. El `::after` de fundido está apagado bajo el morph.
- Oficial: ese fundido vivía SOLO DEBAJO de la caja (cola de 58 px del `::before` V2 con máscara, o `::after` de 35 px en base). El borde inferior de la caja quedaba como una línea recta y la barra se veía flotando por encima. Además el `::before` V2 combina máscara + `backdrop-filter` + `clip-path`, combinación frágil en Safari.
- Portado ahora (bajo el flag del morph; sin él, la oficial se ve exactamente como antes): el fundido pasa al fondo del propio sticky, anclado a `--gx-rm-clip` como en el preview (tinte oficial: `.76/.72/.56 → 0` en V2, `.70/.70/.55 → 0` en base, últimos 27 px visibles); el `backdrop-filter` de 27 px (V2) / 28 px (base) pasa al propio sticky y el `::before` V2 queda neutralizado (fondo transparente, sin blur ni máscara); los `::after` de cola se apagan bajo el morph. Blur y cristal intactos, sin solidificar nada.

### e) Otras funciones autorizadas R5.2–R17 revisadas
- R5.2 fluidez (tau 64 ms, watchdog): ya estaba en PR #184. Sin cambios.
- R6 jerarquía/agrupación (ritmo 21/11 px): el doc R6 lo dejó fuera de la integración deliberadamente y su cabecera dice "NO aprobada". QUEDA FUERA: cambiar todos los márgenes de 25 px a 21/11 px es un cambio visual global no pedido por Henry en este bloque.
- R7 acomodo + pulso + transición suave del badge: ya estaba en PR #184. Sin cambios.
- R8 conteo + respiración de lealtad + barra "Servicios liquidados": conteo y respiración ya estaban (la respiración ahora vive en la estrella de la joya, punto b). La barra "Servicios liquidados" (conteo de servicios pagados dentro de `services-container`) NO se portó: en la oficial los servicios liquidados ya se ven como "Liquidado" por fila y la barra duplicaría esa información en el flujo global; en B2 el estado por perfil ya vive en el calendario. QUEDA FUERA por no duplicar.
- R9 glow líquido: descartado por Henry en R11. No va.
- R10 asentamiento + repintado de píldora: ya estaba en PR #184. Sin cambios.
- R11 píldora sin glow: vigente, la píldora queda plana. Sin cambios.
- R12 morph solo-transform: ya estaba en PR #184. Sin cambios.
- R13 hoja con importe vivo + resorte: la oficial V2 ya lo tenía; no se reimplementó. Sin cambios.
- R14–R17 encabezado compacto, barra única, energía: ya estaban en PR #184. Sin cambios.
- Animate UI / Morphicons / `overflow` del preview: no van a la oficial (decisión de PR #184, vigente). El tracker y la joya se portaron en vanilla.
- DESGLOSE DEL PAGO del preview: Henry pidió quitarlo del espejo y no duplicar; la oficial conserva SU desglose del motor. Sin cambios.

## Nuevos pedidos de Henry

### Píldora con demasiado texto: marquee suave (no ellipsis)
- La píldora ahora desplaza su texto por dentro hasta el final y regresa (ida y vuelta con pausa en cada extremo, ~45 ms por px), SOLO cuando el texto no cabe. La caja de la píldora no se mueve: no se encima al precio ni se sale de la barra.
- Implementación (`05-index-header-morph.js`): el texto vive en un span interno (`.gx-rm-badge-text`); un observador lo repone cuando el render oficial o el adaptador B2 reescriben `textContent`; la animación es Web Animations con la distancia medida; se pausa con pestaña oculta y no arranca con `prefers-reduced-motion` (en ese caso el texto se corta a la derecha, legible desde el inicio).
- Bug cazado por el harness al verificarlo: con `justify-content:center`, al recortar el texto se comía el INICIO ("🚨 Servicio vencido · 6 nov" se veía "ervicio vencido · 6…"). Ahora, cuando hay overflow, la píldora alinea el texto a la izquierda (el alineado depende del overflow, no de la animación): con `reduced-motion` también se lee desde el principio.
- Preview: no se tocó. Sus píldoras de escenario caben enteras a 390 px, así que no hay nada que desplazar; el marquee es solo para las píldoras largas vivas de la oficial.

### Solape precio/título/píldora en las capturas oficiales
- Verificado con la harness (caso Nayeli: $51.45, "🚨 Servicio vencido · 6 nov", servicio "Vix Premium (x2)", 390 y 280 px, reposo/mitad/compacto): importe, píldora y botón "Mi Espacio" no se solapan en ningún estado; el contenido queda ~18 px bajo la barra visible y sube exactamente el clip al compactar; el alto del hero medido coincide con el vivo.
- Causa raíz del "se encimaba": el contenido que se desliza bajo el sticky se veía NÍTIDO a través de la barra (faltaba el fundido del punto d), así que el título "Vix Premium (x2)" parecía pisar el precio $51.45; y la píldora cortada ("ervicio vencido · 6…") era el recorte centrado descrito arriba. Ambas cosas quedan corregidas por (d) y por el marquee.
- Además, cierre preventivo del mismo tipo de bug de medición: la geometría (tops/alto del hero, RANGE) se medía solo en el enlace; si el texto nuevo cambiaba el alto del hero, los tops viejos solapaban el contenido. Ahora `paint()` remedida la geometría cuando el alto del hero cambia (`measureFlow`/`measureSticky` extraídas de `bind()`), y el estado del marquee se expone en `window.GOXION_INDEX_MORPH.marquee()` para verificación. También se corrigió el comentario obsoleto del morph que aún decía que el ancho se medía con Range (el código ya usaba `scrollWidth` desde PR #184).

## Archivos tocados
- `assets/js/index/02-02-inline.js` (+128/−…): `gxProofTrackerHTML()` y `gxLoyaltyMarkHTML()` (globales, el adaptador B2 reutiliza el primero); fase del tracker desde el estado vivo; tarjeta de lealtad con joya; sin bloque `.btn-review-state` en revisión; descripción de lealtad sin repetir el conteo.
- `assets/js/index/05-index-header-morph.js`: marquee de la píldora (span interno + observador + Web Animations + pausa), remedición de geometría al cambiar el alto del hero, `range()`/`marquee()` expuestos.
- `assets/css/index.css` (+213): estilos del tracker, de la joya de lealtad, del fundido del encabezado bajo el morph y del marquee.
- `preview/index-b2/b2.css`: filas del calendario abiertas (sin recuadro); fuera `gxB2NextSheen`.
- `preview/integracion-b2/index-adapter.js`: tracker B2 en revisión (`updateProofTracker`) y variante de lealtad perdida sobre la joya (`setLoyaltyLost`).
- Este documento. El preview E1/B2 no se tocó.

## Verificación (Chromium, datos de QA — nunca datos reales de clientes)
- Harness temporal `.tmp-harness-r17c/` (borrado antes del PR): render REAL (02-02-inline.js + morph real + index.css real) con `clientes.json` de QA interceptado, y ruta B2 real (adaptador + b2.css) con cotización tipo Nayeli. **110 checks, TODO PASS** (`node .tmp-harness-r17c/verify.mjs`):
  - Tracker: fases review/correction/approved con sus textos, etapas y progresos (66/66/100); sin tracker cuando no hay proceso; pista con el mensaje de Admin en corrección; sin bloque duplicado en acciones; un solo tracker B2 en revisión y primero en el contenido.
  - Lealtad: "TU LEALTAD / 3 de 4 pagos puntuales", anillo de 4 secciones con 3 llenas, estrella; perdida con 0 llenas, "RACHA REINICIADA / Perdiste tu avance"; B2 con `lealtad_global_perdida` igual.
  - Calendario B2: filas con fondo transparente, radio 0, línea fina; energía en la fila del próximo pago; fila activa con importe cian.
  - Marquee: activo con texto largo en compacto (390), el texto empieza a la izquierda, se desplaza por dentro, pausa con pestaña oculta; apagado con `reduced-motion` (inicio legible).
  - Solapes: importe/píldora/botón sin solape en reposo, mitad y compacto, a 390 y 280 px; contenido ~18 px bajo la barra visible y subiendo exactamente el clip; alto del hero medido = vivo; remedición tras cambiar el texto de la píldora.
  - Fundido: fondo del sticky con desvanecido a transparente, `::after` apagado bajo el morph; capturas revisadas (reposo, compacto, calendario, revisión).
  - Final de página sin resorte; Index real con puerta de login: morph no enlazado, sin errores.
- `node --check` OK en los 3 JS tocados (+ adaptador). `node scripts/verify-integrity.mjs` OK (exit 0).
- `npm run test:smoke`: Chromium · Index sin errores. Exit 1 por los fallos PREEXISTENTES, verificados IDÉNTICOS en un worktree de control en `main` a5d56009 (misma lista, diff vacío): Ayuda "Failed to fetch" + morph de Soporte, Admin "Failed to fetch" ×4, WebKit no arranca (faltan libs del sistema). No es una regresión.
- CI por nombre no verificada (el conector no expone check-runs); no afirmar todo verde. WebKit local no arranca (preexistente).

## Compromisos y riesgos conocidos
- El tracker "validado" exige período pagado Y `pago_revision_estado === "aprobado"`. Si Admin marca un período pagado a mano sin comprobante mientras persiste un "aprobado" viejo, el tracker diría "validado" sin recibo de ese período. El campo lo gobierna Admin; si eso ocurre, la corrección es limpiar el estado en Admin, no en Index.
- B2 no muestra tracker de "validado" ni de "observación": la cotización solo trae `comprobante_en_revision`. Cuando el comprobante B2 se aprueba, el cargo pasa a pagado y el tracker desaparece (el estado lo dice la píldora y la fila del calendario).
- Con `reduced-motion`, la píldora larga se corta a la derecha sin "…" (el ellipsis no aplica al span interno): se lee desde el principio, que es lo importante.
- En compacto, a mitad de morph el precio sigue pasando sobre la etiqueta que se desvanece (transitorio, igual que en el preview R17 aprobado).
- Safari físico es el punto a validar por Henry (el fundido nuevo sigue el mecanismo del preview, ya validado por él en el espejo, pero el `backdrop-filter` ahora vive en el propio sticky en vez de en el `::before`).

## Qué debe notar Henry en Safari/iPhone (oficial, con un cliente real)
- En reposo, todo igual que antes, salvo la lealtad: ahora se ve la estrella con su anillo ("3 de 4 pagos puntuales") en vez del ⭐.
- Si el cliente tiene un comprobante en revisión, aparece arriba del todo la sección "COMPROBANTE · Recibimos tu comprobante" con el reloj animado y las etapas Recibido → Validando → Resultado. Si Admin le puso una observación, dice "Hay una observación" con su mensaje; si se validó, "Comprobante validado" con las 3 etapas completas.
- Al desplazar, el encabezado ya no se ve flotando: el contenido se funde borroso bajo la barra, sin línea de corte.
- En compacto, una píldora larga como "🚨 Servicio vencido · 6 nov" ya no se corta: el texto se desplaza por dentro hasta el final y regresa.
- En clientes B2, el calendario ya no tiene cada fila encerrada en su recuadro: las filas van abiertas, separadas por líneas finas, y la próxima se distingue por la línea de luz en su base.
- **Antes de darlo por cerrado: revisar con un cliente real (un flujo global y uno B2) que el importe, la píldora, el tracker y la hoja de reporte sigan mostrando los datos vivos correctos.** Si abre la oficial con la sesión ya iniciada y ve la versión vieja, cerrar la pestaña y volver a abrir (caché de Safari).
