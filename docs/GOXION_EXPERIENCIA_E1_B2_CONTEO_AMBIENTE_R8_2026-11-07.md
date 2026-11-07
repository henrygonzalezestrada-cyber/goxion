# GOXION · E1/B2 — Conteo del importe + ambiente vivo (R8)

Fecha: 2026-11-07. Base: `main` `9e85914` (R7). Solo preview
(`preview/experiencia-financiera-espejo/`), sin tocar el Index oficial,
Ayuda, Admin ni el motor financiero. Sin secciones nuevas, sin duplicar
información, blur 25px y cristal intactos, morph R5.2/R7 intacto.

## Qué pidió Henry

Le gusta que los números se sumen, y quiere animaciones vivas que se
muevan solas sin tocar nada, pero sin saturar la página.

## 1. Conteo animado del importe (count-up)

- Solo al cargar la página y cuando cambia el valor exacto (cambio de
  escenario o Próximo ↔ Todo junto / elegir un cargo).
- 700 ms, ease-out cúbico, de centavos exactos a centavos exactos,
  terminando SIEMPRE en el valor exacto del escenario (en la demo
  $45.00/$94.00/$49.00; el caso real de Nayeli es $46/$92, que el
  espejo no usa porque sus fixtures son de ejemplo).
- NUNCA durante el morph de scroll ni con la barra compacta: si el
  usuario empieza a desplazar, el conteo se cancela y deja el valor
  exacto de inmediato. Así no se repite el bug del espejo viejo,
  donde a mitad de morph se veían $45.72 / $86.16 como si fueran
  reales.
- Al terminar el conteo, aterriza con el pulso R7 (escala 1.04→1 en
  300 ms). Con `prefers-reduced-motion`, valor exacto directo, sin
  conteo ni pulso. `tabular-nums` (R6) evita que bailen los dígitos.
- Aplica al importe del hero y al total seleccionado del desglose,
  con el mismo controlador (estado.js: `makeCounter`, `heroCounter`,
  `selectedCounter`).

## 2. Ambiente vivo, sin saturar

Solo `transform`/`opacity`, intensidad baja. La lava YA se mueve sola
en `index.css` (`lavaFluid`, 10–14 s); R8 no la duplica. Lo nuevo:

- Respiración del glow del hero (`#gx-b2-hero::before`): radial
  cian/morado, opacidad .55→.75 en 6 s. Contenido dentro del hero
  (`inset:0`): la primera versión con `inset:-12px -30px` provocaba
  overflow horizontal a 280 px y se corrigió.
- Brillo tenue del badge (`.time-badge::after`): un barrido cada 7 s,
  sin parpadeo; es `position:absolute` dentro del badge (que ya tiene
  `overflow:hidden`), así que no mueve el layout ni el texto.
- Respiración del anillo de lealtad (`#gx-b2-loyalty-mark`): escala
  1→1.025 en 5 s, solo el wrapper; la órbita y la estrella de
  Animate UI no se tocan.

Todo se pausa si la pestaña no está visible (`visibilitychange` →
`html.gx-r8-paused`, `animation-play-state:paused`) y se apaga con
`prefers-reduced-motion`.

## Qué no cambió

- Morph R5.2/R7: mismos extremos, mismo tau 64 ms, barra compacta
  desde p≈0.35, badge sin cruzar el importe, gap 10 px.
- Jerarquía R6: ritmo 21/11, títulos 10 px/800, secundarios
  `#b5c3d9` / `#9ca7c6`.
- CLABE ficticia de R7: sigue igual, solo demostración, sin cuenta
  real. Los importes del fixture no se cambiaron a $46/$92.
- Sin Block 3 (morph solo-transform): no hizo falta en R8.

## Verificación

- `node --check estado.js` y `check.mjs`: OK.
- `node scripts/verify-integrity.mjs`: OK («GOXION · integridad OK»).
- `node preview/experiencia-financiera-espejo/check.mjs`: **Chromium
  E1/B2 FINAL PASS, 7 anchos × 12 estados**, incluidas las regresiones
  R8 (conteo intermedio entre valores, cancelación con scroll, glow/
  brillo/respiración presentes, sin overflow a 280 px).
- **WebKit local: no se pudo correr** (MiniBrowser no arranca:
  faltan `libgstreamer-1.0-0` y dependencias del sistema; igual que
  en R6/R7). La CI del PR es la que debe dar el resultado WebKit.
- Regresión R7: el pulso del total seleccionado se verificó con
  espera activa en vez de muestreo fijo, porque en headless los
  frames rAF van lentos y el muestreo caía antes de que arrancara.

## Archivos

- `preview/experiencia-financiera-espejo/estado.js` — conteo
  (`makeCounter`, `pulseInk`), cancelación en `request()` del morph,
  pausa de ambiente por visibilidad.
- `preview/experiencia-financiera-espejo/estado.css` — sección R8:
  glow, brillo del badge, respiración de lealtad, pausa y
  reduced-motion.
- `preview/experiencia-financiera-espejo/estado.html` — solo bump de
  versión de `estado.css`/`estado.js` a `?v=e1b2r8v1`.
- `preview/experiencia-financiera-espejo/check.mjs` — regresiones R8
  y esperas al valor exacto tras cada conteo.
- `docs/GOXION_EXPERIENCIA_E1_B2_CONTEO_AMBIENTE_R8_2026-11-07.md`
  — este documento.

## Portabilidad a la oficial

El conteo es portable tal cual al Index oficial: el importe
protagonista es el próximo vencimiento de la cotización viva y el
total seleccionado es el de la selección; ambos terminan en el valor
exacto del servidor, nunca en valores intermedios. El ambiente es
solo CSS sobre `.balance-hero`, `.time-badge` y el anillo de
lealtad, sin tocar el motor financiero. Queda pendiente la
validación visual en Safari físico por Henry.
