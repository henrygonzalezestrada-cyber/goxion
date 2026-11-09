# GOXION · Integración Index 2.0 a la oficial (2026-11-08)

**Estado:** port fusionado en un solo PR desde `main` (d087e3c).
**Origen:** espejo `preview/index-2.0/` (B0–B6 + detalles finales, PR #194),
aprobado por Henry, que ordenó explícitamente integrarlo a la oficial.
**Espejo:** no se toca; sigue en `preview/index-2.0/` como referencia.

## Dónde vive cada cosa (investigación previa)

- La oficial `index.html` **no carga** el adaptador B2 ni `b2-bridge.js`
  (solo runtime, Supabase, realtime, motor financiero, `01-…`,
  `02-02-inline.js`, morph, `03-03-inline.js`, `04-realtime.js`).
  Cargar `b2-bridge.js` ahí rompería el flujo global: sin `?cliente`
  forzaría `?cliente=b2-demo&demo=1` e interceptaría `clientes.json`.
- Los clientes B2 reales llegan por Ayuda F5
  (`assets/js/ayuda/18-b2-index-ruta-oficial.js`) a
  `preview/integracion-b2/index.html?f3=1&cliente=…`, que carga
  `b2-bridge.js` (cotización demo/real) + el adaptador B2. **Esa es la
  ruta B2 oficial, y ahí se porta el espejo**: el adaptador plano
  anterior (`index-adapter.js`, calendario por servicio + botones
  "Próximo vencimiento"/"Todo junto" + DESGLOSE como sección) se
  sustituye por el adaptador 2.0.
- `preview/index-b2/` (`b2-ui.js`, `b2.css`) es otra superficie previa
  y **no se toca**; sus reglas R18 de energía en `.gx-b2-row` quedan
  inertes en `index.css` sin borrar, porque esa vista aún las usa.

## Alcance (decisión de Henry, aclaración 2026-11-09)

- La distribución 2.0 (grupos por fecha, "Pagar todo",
  "Total del periodo", calendario) aplica **solo con 2+ fechas
  efectivas distintas** (o algún cargo sin fecha, caso "Por
  confirmar"). Con una sola fecha no hay calendario: se conservan
  SERVICIOS ACTIVOS y DESGLOSE globales. El adaptador sigue activo
  en ese caso (guarda de saldo sin verificar, hero, píldora, tracker,
  lealtad, botones A+C, conteo), porque sin él la ruta B2 perdería
  su protección de reporte por cargo.
- Piezas compartidas que **sí llegan al flujo global** (una fecha):
  efecto al deslizar (morph, ya oficial), X unificada, tarjetas
  planas con Mastercard real, icono nuevo de copiar y conteo animado
  al cambiar el importe (morph, ya oficial; el conteo del adaptador
  es solo para cambios de selección B2).

## Auditoría (skill preview_port_audit): cada función autorizada

| # | Función del espejo | Estado | Verificación |
|---|---|---|---|
| 1 | Grupos por fecha efectiva solo B2 (`<details>` nativo; encabezado fecha + nº servicios + total + estado; próximo abierto; filas sin fecha ni "Lealtad sin descuento") | Portada | Harness Luis: 2 grupos (8 nov 2 servicios $168; 15 nov $79), próximo abierto, sin "Lealtad sin descuento" |
| 2 | Hero sigue a la selección; píldora sigue al grupo | Portada | Tocar grupo 15 nov → "A pagar el 15 nov · $79.00", píldora "Vence en 7 días" |
| 3 | "Total del periodo" + chip "Pagar todo" (un solo reporte) | Portada | Línea $247.00; chip selecciona todo; reporte con `cargo_ids` de los 3 cargos (código, igual que el espejo) |
| 4 | Botón principal sin importe + A+C (progreso "Abriendo…" → spinner → check; presión .97 + ripple) | Portada (A y ripple en B2; presión ya en oficial) | Primario "Ya realicé mi pago" → "Abriendo…" → hoja; presión .985/.986/.987 ya existía en la oficial (el espejo usa .97; diferencia imperceptible, se conserva el valor oficial); ripple por `pointerdown` del adaptador |
| 5 | Flecha morphing (SVG una pieza, giro 180° con resorte, cian→morado) | Portada | CSS portado tal cual; harness verifica rotación al abrir |
| 6 | Desglose dentro del grupo; DESGLOSE DEL PAGO oculto solo en B2 | Portada | Subtotal/Total del grupo dentro del grupo 1; sección global oculta solo con `html.gx-20-b2` |
| 7 | Órbita de energía en encabezado del grupo próximo (arco ~90°, 2.8 s/vuelta, CSS puro); barrido inferior solo con clase | Portada | `::before` con `gx-20-orbit` 2.8 s medido en vivo; barrido solo con `gx-20-energy-sweep` |
| 8 | Lealtad B5 en la joya (segmento nuevo cian + conteo; pulso dorado al subir de nivel; ruptura animada estrella→corazón roto, "Racha reiniciada" + "Mejor racha" fija, solo primera vez; reduced-motion instantáneo) | Portada | Bandera `lealtad_global_perdida` → corazón roto + "Mejor racha: 10 pagos"; al quitarla se restaura; en reduced-motion instantáneo |
| 9 | Tarjetas planas fieles a Apple Wallet (sin chip EMV, sin relieve/holograma; Nu "nu" + "débito" + contactless; Revolut azul oscuro registrado + "VIRTUAL"; Mastercard real 2 círculos #EB001B + #F79E1B, solape `screen`, sin tercer círculo; copiar Lucide con morph a check) | Portada (global, sin puerta B2) | Medido en vivo en ambas rutas: `::before` rgb(235,0,27), `::after` rgb(247,158,27) + `screen`, "débito"/"VIRTUAL", icono `path` + rect 14, `dasharray` 56. OJO de verificación: las reglas viejas `[data-bank="nu"/"revolut"]` (0,3,x) con #ff1738/#ff9f19 y la sombra del tercer círculo ganaban a la regla genérica portada (0,2,x); las 4 reglas del acento van con `html.gx-payment-v2` delante para ganar |
| 10 | Conteo al cambiar de selección (700 ms, ease-out cúbico, centavos exactos) | Portada (adaptador; morph ya en main) | "Pagar todo" $79 → $247 con valores intermedios muestreados; arriba lo cuenta el morph (fix `displayedCents` ya en main d087e3c, no rehecho) |
| 11 | X única 34 px, redonda, degradado cian, ✕ negra 17 px/800, glifo ✕ U+2715, en las 2 hojas y el encabezado | Portada | Glifo ✕ en `index.html` y `preview/integracion-b2/index.html`; X de hojas 34×34 medida; encabezado 34×34 degradado medido; clic en la X cierra ambas hojas en ambas rutas. `goxion-modal-headers.css` (compartido con Ayuda) no se toca: el override vive en `index.css` con más especificidad y apaga sus barras `::before/::after` solo en Index. DOS correcciones halladas por la verificación: (a) `gx-payment-v2` vive en el propio `<html>`, así que el selector es `html.gx-payment-v2 ...` — `html .gx-payment-v2 ...` no casa nunca y el override no se aplicaba (ni el glifo 17 px ni el z-index); (b) en la ruta B2 el modal es PLANO (la X es primer hijo de `.modal-content`, el encabezado va después y pinta encima: `elementFromPoint` devolvía el encabezado y Playwright no podía clicar la X). Antes eso lo tapaba `b2.css` (X con `z-index:8`); al retirar `b2.css` el port lo sustituye con `z-index:2` en el override de `index.css`, verificado por clic. En la ruta global la X vive en el encabezado estático flex y ya era tocable |
| 12 | Casos borde B6: prórroga dentro del grupo; "Pago en revisión"; todo-pagado "Sin pagos pendientes · $0.00"; sin-fecha "Por confirmar"; 11 estados §3.6 | Portada | Prórroga 9 nov + nota; revisión en píldora + tracker; todo-pagado; sin-fecha. Los 11 estados: vencido/mora, vence pronto, al corriente, revisión, prórroga, lealtad rota y sin-fecha verificados en vivo; observación/corrección, validado, pago incompleto y suspendido viven en el render global (tracker/banner/píldora) que el port no toca — igual que en el espejo |
| 13 | X del encabezado 34 px degradado (oficial 30 px plana); en la oficial DEBE navegar a ayuda.html con las 3 capas R18 | Portada | Regla R18 editada a 34 px degradado; navegación (ancla + clic `preventDefault` + `pointerup` >10 px + candado `navDone`) intacta en el morph, sin tocar; clic verificado → `ayuda.html` |
| 14 | Energía R18 en filas (`is-due-next`) donde no choque con la órbita | Órbita manda (explícito) | Las filas `.gx-b2-row` ya no existen: el adaptador anterior que las pintaba se sustituye. La energía vive ahora solo en la órbita del grupo próximo. Las reglas R18 quedan inertes en `index.css` (las usa aún `preview/index-b2/b2-ui.js`) |

## Qué cambió / qué no / qué quedó fuera

**Cambió:**
- `preview/integracion-b2/index-adapter.js`: sustituido por el adaptador
  2.0 (grupos, selección, hero, desglose, lealtad B5, botones A+C,
  ripple, conteo, tracker, guarda de saldo) + puerta ≥2 fechas.
- `assets/css/index.css`: sección "Integración Index 2.0" (grupos con
  puerta `gx-20-b2`; piezas compartidas sin puerta) + X del encabezado
  30 px plana → 34 px degradado en su regla R18.
- `assets/js/index/02-02-inline.js`: icono de copiar con geometría
  Lucide en la fuente (`renderCuentasPago`); el `polishCopyIcons` del
  adaptador del espejo se retira (ya no hace falta).
- `index.html` y `preview/integracion-b2/index.html`: glifo × → ✕ en
  las 2 hojas; en la ruta B2 se deja de cargar `b2.css` (calendario
  plano anterior). Sus 2 reglas vivas de apilado de la X (X con
  `z-index:8`, encabezado con `z-index:1`) las sustituye el override
  de X única en `index.css` (`z-index:2`, ver punto 11); el resto de
  `b2.css` era el calendario plano anterior, sustituido por los
  grupos 2.0. El adaptador sube a `?v=2.0`.

**No cambió:** motor financiero, blur 27/28 px y cristal del
encabezado, morph solo-transform, píldora con marquee, tracker de
comprobante, calendario global, lealtad global, Ayuda, Admin,
`preview/index-2.0/` (espejo intacto), `preview/index-b2/`,
`goxion-modal-headers.css`, `b2-bridge.js`.

**Quedó fuera (deliberado):** fixtures y CLABE ficticia de demo (solo
en `b2-bridge.js`, sin tocar); jixis (descartados); variantes B y E
de botones (el espejo solo las mostraba para comparar; la aprobada
fue A+C); energía R18 por fila (la sustituye la órbita, punto 14);
"Mejor racha: 9" del demo (no es bug: en real la cotización trae el
valor verdadero; en el harness la cotización inyectada trae 10).

## Verificación

- Harness temporal `scripts/tmp-index-2-0-port.mjs` (borrado antes del
  push): Chromium + WebKit, 390/280, reduced-motion, ruta
  `preview/integracion-b2/index.html?f3=1&cliente=prueba` con cotización
  Luis inyectada (GX-2026-0011: $168 + $79 = $247), demo ViX y ruta
  global. **289 verificaciones PASS** (ver log del PR).
- `node --check` a los JS tocados; `node scripts/verify-integrity.mjs`
  OK; `npm run test:smoke` idéntico a la base (mismos fallos
  preexistentes de red en el sandbox; sin errores nuevos de Index).
- Pages verificado sirviendo la ruta tras fusionar (HTTP 200).

## Advertencia honesta

La forma de Luis solo se verificó por harness con cotización
inyectada, nunca con datos reales en vivo (el modo real con Luis en
el espejo se saltó por decisión de Henry). La primera revisión real
debe ser la cuenta de Luis en Safari físico tras el port.
