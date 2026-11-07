# GOXION · E1/B2 — Mejora de fluidez del morph autorizado (R5.2)

**Fecha:** 06/nov/2026 · **Estado:** beta en preview para revisión, NO aprobada · **Alcance:** solo el morph ya aprobado en PR #156. No cambia diseño, estructura, importes ni integración.

## Qué se mejora (y por qué)

El morph aprobado funciona, pero su suavidad depende de la frecuencia de
pantalla: el amortiguamiento era fijo por frame (`.23`), así que a 120 Hz
corrían el doble de rápido que a 60 Hz y a 30 Hz (iOS en ahorro) se
arrastraba. Además cada frame forzaba un layout síncrono al medir los
anchos, y al soltar el scroll el morph podía quedarse flotando en la cola
exponencial. Todo eso se corrige sin tocar la geometría aprobada:

1. **Amortiguamiento normalizado por delta-tiempo** (`estado.js`,
   `setupHeaderMorph`): constante de tiempo de 64 ms — exactamente la
   sensación aprobada a 60 Hz — con paso `1-exp(-dt/64)`. A 60, 120 o
   30 Hz se siente igual.
2. **Medida de anchos con caché**: `getBoundingClientRect` solo se
   repite cuando cambia el texto del importe/cápsula, el tamaño o el
   viewport. Antes se leía en cada frame durante el scroll.
3. **Asentamiento al soltar**: tras 120 ms sin eventos de scroll (o al
   llegar `scrollend`), el morph acelera su llegada al estado de reposo
   que ya marca el scroll, en vez de quedarse a medias.
4. **Capa de composición** (`estado.css`): `translateZ(0)` en el par
   importe/cápsula, junto al `will-change` existente, para no repintar
   en iOS al moverlos.

## Qué se preserva, sin excepción

- Misma geometría: hero `116-73*p`, importe `52-26*p`, `scrollY/172`,
  par compacto centrado (importe izquierda, cápsula derecha, gap 10 px,
  medido de rects reales), recuperación de 7 px de R5.1, watchdog de
  Safari de 62 ms, `prefers-reduced-motion` instantáneo.
- Un solo precio en el documento, siempre exacto según escenario
  ($45.00 próximo / $94.00 total en `multi` de ejemplo; nada de
  importes interpolados).
- Mismos desenfoques: sticky con `backdrop-filter: blur(25px)
  saturate(1.2)` y gradiente `rgba(3,3,5,.90/.77/.65)`.
- Sin secciones nuevas, sin duplicar información, sin clonar el header,
  sin tocar `index.html` oficial, Ayuda, Admin, motor financiero ni
  Supabase.

## Decisión deliberada: sin salto a los extremos

El morph **no** se asienta a 0/1 por su cuenta al soltar. Sigue acoplado
al `scrollY`: forzarlo a un extremo sin mover el scroll provocaría un
salto visible al siguiente evento de scroll. El asentamiento es al
estado de reposo que el scroll ya dicta, más rápido.

## Cómo probarlo en Safari / iPhone

Rama: `beta/morph-fluidez-mejorado-20261106`. Tras fusionar como beta
(como se hizo con PR #156), la URL será:

`https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-financiera-espejo/estado.html?escenario=multi&v=final-chevron`

1. Desplazar lento y rápido: el importe debe encogerse de forma
   continua, sin saltos, y la cápsula debe quedar a su derecha sin
   encimarse.
2. Soltar a mitad de camino: el morph debe asentarse suave al estado
   que corresponde a esa posición, sin quedarse flotando ni saltar.
3. Volver arriba: todo regresa a expandido, sin información comida ni
   duplicada.
4. Probar en 60 Hz y 120 Hz (ProMotion): la velocidad percibida debe
   ser la misma.

## Verificación

- `node scripts/verify-integrity.mjs`: OK (sin cambios a lo oficial).
- `node preview/experiencia-financiera-espejo/check.mjs`: suite
  Chromium + WebKit, 7 anchos × 12 escenarios — ver resultado en el PR.
- Aceptación visual en Safari real pendiente del propietario.

**Embargo:** solo preview. Nada se integra al Index oficial hasta
completar E2/B3, E2/B4, E3/B5, auditoría global y autorización final
expresa (Issue #142).
