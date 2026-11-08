# GOXION · Integración Index — corrección marquee, fundido, lealtad rota, Mi Espacio y salto (E1/B2 R17)

- Fecha: 2026-11-08 · Rama: `integracion/index-marquee-fundido-20261108` · Base: `main` 767c954 (PR #185)
- Alcance: Index OFICIAL (`assets/js/index/05-index-header-morph.js`, `assets/css/index.css`, `assets/js/index/02-02-inline.js`). No se toca Admin, no se toca Ayuda, no se toca el motor financiero, no se toca nada de Nayeli en base (su caso es solo referencia visual: $53.90, Vix Premium x2, vencido, comprobante en revisión, B2 dos fechas).
- Origen: video/captura de Henry en Safari con el caso real Nayeli, más dos puntos agregados por él a la misma corrección (lealtad rota y botón "Mi Espacio").
- Sin secciones nuevas, sin duplicar información, sin fixtures, sin CLABE ficticia. Blur/cristal intactos (27 px V2 / 28 px base).

## 1) Píldora larga cortada por la izquierda y marquee que no se veía — CAUSA REAL, CORREGIDO

**Lo que se veía:** en compacto la píldora "Servicio vencido · 6 nov" se cortaba POR LA IZQUIERDA ("rvicio vencido ·") y el marquee no se apreciaba moviéndose en el video.

**Causa (confirmada en el harness):** el adaptador B2 (`preview/integracion-b2/index-adapter.js`, `updateHeader()`, línea 168) reescribe `badge.textContent = "🚨 Servicio vencido · " + fecha` con el MISMO texto en cada render. Ese `textContent` destruye el span interno `.gx-rm-badge-text` que el morph usa para el marquee, y el observador del morph salía antes sin restaurarlo cuando el texto era idéntico al anterior. Sin el span no hay marquee: la píldora cae a `justify-content:center` + ellipsis, y un texto demasiado largo se recorta por AMBOS lados (corte izquierdo). Tras un re-render completo de realtime el marquee se recuperaba solo; tras un render solo del adaptador quedaba muerto — y `bind()` salía antes con nodos idénticos, sin re-envolver.

**Corrección (`05-index-header-morph.js`):**
- El observador de la píldora ahora restaura el span SIEMPRE que falte, sin importar que el texto sea el mismo.
- `updateMarquee()` descarta una animación WAAPI cuyo objetivo ya no es el span actual (o está inactiva), para no animar un nodo huérfano.
- Sin cambios al comportamiento cuando no hay overflow: el marquee solo arranca si el texto no cabe (ya era así en PR #185); con `prefers-reduced-motion` sigue apagado y el texto empieza a la izquierda.

**Verificado:** tras 2 renders del adaptador con el mismo texto el span sobrevive y el marquee sigue activo; en compacto el texto empieza en el borde izquierdo (gap 1 px) y llega al borde derecho (gap 1.28 px), con el inicio ya fuera por la izquierda (−64 px a 390 px, −155 px a 280 px). Harness 42/42 a 390 px, 42/42 a 280 px, 40/40 con reduced-motion.

## 2) Precio $53.90 encima del tracker y de la etiqueta — CORREGIDO (dos causas)

**Lo que se veía:** a mitad de desplazamiento el precio grande se encimaba al tracker "Recibimos tu comprobante" y a su texto; en el video también se veía sobre la etiqueta "PRÓXIMO PAGO".

**Causa A — la etiqueta (estado estable, confirmada):** peor solape importe∩etiqueta 1479.6 px² en p=0.4. Desde R17 la etiqueta se desvanecía con `spreadV` (0.75→0.875), pero el importe ya sube 17 px dentro de la fila de la etiqueta desde p≈0.1. Antes de R17 la etiqueta se desvanecía antes (p≈0.33).

**Corrección:** la etiqueta ahora se disuelve con la curva `paired` (0.05→0.35), al mismo tiempo que el precio sube a su sitio; el título sigue con `spreadV`. En compacto no queda ni título ni etiqueta. En el barrido estable el solape importe∩etiqueta visible es 0 en todo el recorrido, a 390 px y a 280 px.

**Causa B — el tracker y la cola sin blur (transitorio + fondo):** el solape importe∩tracker era transitorio del asentamiento (peor 1168 px²): durante el salto, scrollY se mueve rápido y el morph (amortiguado, tau 64 ms) va detrás, así que el precio grande barre sobre el texto del tracker. Además, desde PR #185 la cola DEBAJO de la caja (58 px en reposo) había quedado SIN blur: el fundido se movió al fondo del propio sticky, pero el `::before` quedó neutralizado, así que el contenido que pasaba por la cola se veía NÍTIDO y parecía pisar el precio.

**Corrección:**
- El asentamiento es más suave: 0.25 → 0.18 por frame, y durante el salto el morph sigue con SETTLE_TAU (26 ms) en vez de ir detrás.
- La cola vuelve a llevar blur: el `::before` recupera `backdrop-filter: blur(27px)` con la máscara original V2, SIN pintar color (el fondo ya lo pone el propio sticky, así que no hay doble oscurecimiento). El clip-path lo recorta junto con la cola cuando el morph compacta.
- Medición honesta: el roce geométrico del contenido que pasa POR DEBAJO del encabezado es inevitable (es el comportamiento normal de una barra fija con blur); lo que se verifica es que el tracker NO cruce el precio GRANDE (importe de más de 40 px de alto): 0 px² en los tres runs. El solape residual durante el asentamiento (730 px² a 390 px, 376 px² a 280 px) ocurre solo cuando el precio ya está compacto (34 px) y el tracker pasa bajo el blur.

## 3) Lealtad rota: corazón roto en lugar de la estrella — PORTADO DEL PREVIEW

**Lo que se veía:** con la racha rota la joya seguía mostrando la estrella (solo atenuada en rosa). En la beta, cuando se pierde la lealtad, sale el corazón roto (💔) con el mensaje "Racha reiniciada por incumplir una fecha de pago".

**Causa:** el `gxLoyaltyMarkHTML()` oficial (`02-02-inline.js`) siempre pintaba el SVG de la estrella y solo la recoloreaba al perderse. El preview (`animate-ui-native.bundle.js`, `renderLoyalty`) pinta `gx-aui-heart-crack` con el icono genuino Lucide HeartCrack (tamaño 40, strokeWidth 1.7) cuando la racha se reinicia.

**Corrección:**
- `gxLoyaltyMarkHTML()` ahora pinta AMBOS: el span de la estrella y el span del corazón roto (rutas Lucide HeartCrack copiadas del bundle del preview); el CSS muestra uno u otro según `.is-lost` (`.gx-index-loyalty-heart`, visible solo bajo `.is-lost`; estrella oculta bajo `.is-lost`).
- El adaptador B2 no necesita cambios: `setLoyaltyLost()` solo alterna la clase `is-lost` y los textos.
- La joya con estrella y anillo por pago del nivel (4 o 9) sigue siendo solo para la lealtad VIVA.

**Verificado:** en el fixture con `is-lost`, corazón visible 40×40 (SVG HeartCrack presente), estrella oculta (`display:none`).

## 4) Botón "Mi Espacio" no llevaba a ningún lado — ENDURECIDO (no reproducido en local)

**Lo que se veía:** en la oficial, al tocar "Mi Espacio" en compacto no pasaba nada. En la beta el destino era `../../ayuda.html`.

**Investigación:** en Chromium el botón funciona: es un `<a href="ayuda.html">`, `pointer-events:auto`, el hit-test cae sobre él y el clic navega a `ayuda.html` (URL confirmada). No hay ninguna intercepción de clic en el JS del Index (el `preventDefault` solo existe en archivos de Admin/Ayuda; el enlace de la puerta de login es un `<a href="ayuda.html">` simple). El fallo de Safari NO se reprodujo en local, así que no hay una causa única demostrada.

**Corrección (endurecimiento en dos capas):**
- La puerta de `pointer-events` ya no espera a p>.95 (`data-gx-rm-compact`): ahora se abre en cuanto el botón empieza a aparecer (`spreadH>0.02`, `data-gx-rm-space-visible`), así ningún toque temprano cae en el vacío.
- `bind()` añade un handler de clic de respaldo (`window.location.assign('ayuda.html')`) para que la navegación ocurra aunque algo intercepte el clic del ancla.
- Advertencia para la validación: si Henry tocó desde `preview/integracion-b2/index.html`, el `ayuda.html` relativo daría 404 ahí; y si Ayuda en su Safari se ve rota, el botón puede parecer que "no lleva a ningún lado" aunque navegue. La salud de Ayuda es una pregunta aparte.

## 5) El encabezado "bugueaba" de repente al desplazar — CAUSA REAL, CORREGIDO

**Causa (confirmada en el harness):** el listener de `resize` llamaba `paint(); request()`, y `request()` ARMABA el asentamiento. En Safari iOS la barra de direcciones aparece/desaparece al desplazar y dispara `resize` en mitad del gesto: 250 ms después la página se iba sola al ancla más cercano. Medido: tras un resize a mitad, el precio saltaba 28.0 → 14.0 px.

**Corrección:**
- `request(arm=true)` ahora recibe parámetro; el resize llama `request(false)` (actualiza el objetivo y repinta, nunca arma el salto) y además cancela el temporizador de asentamiento pendiente (`clearTimeout(snapTimer)`). El siguiente desplazamiento real vuelve a armarlo si hace falta.
- El desplazamiento con rueda es monótono y sin saltos: traza 50.4 → 37.4 → 34 → 28 → 14 px, 0 saltos >25 px, 0 retrocesos.

**Verificado:** resize a mitad (cambio de alto antes de que venza el temporizador): la página no se mueve sola (y 88 → 88) y el precio solo amortigua (paso máximo 6.9 px a 390 px).

## Qué NO cambió (a propósito)

- Motor financiero, Admin, Ayuda, datos de Nayeli: intactos. Solo Index oficial.
- Blur 27 px V2 / 28 px base intacto; nada solidificado; la cola recupera el blur V2 original, no se inventa un fondo nuevo.
- Marquee: solo cuando hay overflow; pausa con pestaña oculta y reduced-motion (sin animación en ese caso).
- Sin glow líquido (descartado en R11), sin R6, sin secciones nuevas, sin DESGLOSE.
- El asentamiento sigue existiendo (es el R10 aprobado): solo es más suave y ya no lo dispara el resize. Fuera de la zona del morph (0–172 px) el desplazamiento no se toca (fix R13 del resorte al final de página intacto: y=723 max=723).

## Verificaciones

- Harness QA temporal con el caso Nayeli (fixture `.tmp-harness-nayeli.html`, runner `.tmp-gx-harness-nayeli.mjs`; AMBOS BORRADOS antes del PR): **390 px 42/42 PASS, 280 px 42/42 PASS, 390 px reduced-motion 40/40 PASS.** Reposo, marquee (supervivencia tras renders del adaptador, extremos ida y vuelta, re-render de realtime), barrido estable sin solapes (etiqueta, píldora, tracker, botón), transitorio de asentamiento, rueda suave, resize sin salto, final sin resorte, botón (href, puntero, hit-test, navegación real), sin `pageerror`.
- `node --check` OK en los dos JS tocados.
- `npm run verify` (incluye `verify-integrity`): OK. La primera pasada falló solo por el HTML huérfano temporal del harness en raíz; borrado y verificado de nuevo.
- `npm run test:smoke`: Chromium Index SIN errores. Los fallos que aparecen son preexistentes e IDÉNTICOS en un worktree de control sobre la base 767c954: Chromium Ayuda (fetch + 3 de morph), Chromium Admin (fetch), WebKit (no arranca: faltan librerías del sistema, `libgstreamer`, `libgtk-4`, `libavif16`, etc.). Sin regresiones.
- CI por nombre no verificada; no afirmar "CI todo verde". La validación física en Safari es de Henry.

## Qué debe notar Henry en Safari

1. En compacto, la píldora larga "Servicio vencido · 6 nov" se lee COMPLETA: el texto se mueve solo dentro de la píldora hasta el final y regresa, sin cortarse por la izquierda.
2. Al desplazar, el precio $53.90 ya no se encima a "PRÓXIMO PAGO" ni al tracker "Recibimos tu comprobante": la etiqueta se disuelve antes de que el precio suba, y el contenido pasa borroso bajo la barra.
3. La lealtad rota muestra el corazón roto (💔) en lugar de la estrella, con "Racha reiniciada por incumplir una fecha de pago".
4. "Mi Espacio" en compacto lleva a Mi Espacio (ayuda.html).
5. Al desplazar, el encabezado ya no da saltos repentinos cuando aparece/desaparece la barra del navegador; el asentamiento es un deslizamiento suave.
6. Al final de la página no hay resorte (sigue sin volver solo hacia arriba).
