# GOXION · E1/B2 — Jerarquía y agrupación (R6)

**Fecha:** 07/nov/2026 · **Estado:** beta en preview para revisión, NO aprobada · **Alcance:** solo peso, color y ritmo de espacios en el preview E1/B2. No cambia diseño, estructura, importes, morph ni integración.

## Qué se mejora (y por qué)

Hasta R5.2 los bloques del espejo tenían márgenes casi uniformes (16–23 px) y
varios textos en blanco puro, así que todo competía con el importe y el ojo
no sabía dónde mirar primero. R6 ordena eso sin mover nada de lugar:

1. **Ritmo 21/11** (`estado.css`, sección R6, al final del archivo): 21 px
   entre grupos grandes, 11 px dentro de cada grupo. El orden del DOM es
   fijo (proof → identidad → servicios → calendario → desglose → lealtad →
   acciones → nota demo), así que los cuatro intentos se expresan por
   proximidad en ese flujo: tira de estado del comprobante separada 21 px
   de la identidad; identidad 21 px; título Servicios a 11 px de servicios
   y 21 px debajo; calendario y desglose a 11 px entre ambos (mismo grupo:
   ¿cuánto y cuándo?) y 21 px debajo; lealtad 21 px, acciones 21 px, nota
   demo. No se reordena el DOM, no se crean wrappers ni secciones nuevas.
2. **Jerarquía de color**: solo el importe grita (52 px, tabular-nums,
   color del escenario, ya aprobado y reafirmado). Los títulos de sección bajan a
   10 px/800 con tracking 1.5 px y gris azulado `#9ca7c6` (antes morado
   11 px). Los valores secundarios dejan el blanco puro y pasan a
   `#b5c3d9`: valores de identidad, precio por servicio, importes por
   fecha del calendario y líneas del desglose. Los rótulos pasan a
   `#9ca7c6`.
3. **Acentos que se conservan**: el folio mantiene su morado inline (la
   regla de color de identidad no usa `!important`, a propósito); el total
   del desglose conserva su cian 18 px y la fila activa del calendario su
   cian, porque son el segundo importe y la selección.

## Qué se preserva, sin excepción

- Morph R5.2 intacto: hero `116-73*p`, importe `52-26*p`, `scrollY/172`,
  tau 64 ms, un solo precio exacto según escenario, par compacto centrado
  (gap 10 px). No se toca `estado.js`.
- Desenfoques a propósito: sticky con `backdrop-filter: blur(25px)
  saturate(1.2)` y gradiente `rgba(3,3,5,.90/.77/.65)`; se sigue viendo
  lo que pasa por debajo. No se solidifica nada.
- Solo 2 superficies de cristal (identidad y desglose); el resto sigue
  como libro transparente con divisores de 1 px. Sin secciones nuevas,
  sin duplicar información, sin tocar `index.html` oficial, Ayuda, Admin,
  motor financiero ni Supabase.

## Decisiones deliberadas

- **Sin reordenar los intentos.** Los cuatro intentos nombrados (¿cuánto y
  cuándo? / ¿qué tengo? / ¿cómo pago? / confianza) no coinciden 1:1 con
  el orden del DOM — por ejemplo, el hero (¿cuánto?) es sticky arriba y
  el calendario (¿cuándo?) es el cuarto bloque, y la tira de proceso
  (confianza) va primera cuando es visible. Reordenarlos sería
  reestructurar, y este bloque es solo ritmo y color. La agrupación es
  por proximidad dentro del flujo existente.
- **La separación hero→contenido queda en 20 px.** Es el
  `--gx-rm-header-bottom` del morph; un píxel fuera del ritmo de 21 px,
  dejado así para no tocar R5.2.
- **Sin `!important` en los colores.** Solo los márgenes lo usan, para
  imponerse a los `!important` de R4. En color se usa especificidad, para
  que el acento morado inline del folio siga mandando.

## Cómo probarlo en Safari / iPhone

Rama: `beta/jerarquia-agrupacion-20261107`. Tras fusionar como beta (como
se hizo con PR #156 y PR #171), la URL será:

`https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-financiera-espejo/estado.html?escenario=multi&v=final-chevron`

1. En reposo: solo el importe debe gritar; "Servicios activos" debe verse
   como rótulo pequeño gris azulado, no morado; Titular/Folio/Período en
   gris azulado, con el folio en morado.
2. Desplazar: el morph debe comportarse exactamente como R5.2 (mismo
   encogimiento, misma fluidez). Este bloque no lo toca.
3. Mirar los grupos: entre identidad, servicios, calendario+desglose,
   lealtad y acciones debe notarse un aire mayor que dentro de cada grupo
   (calendario pegado al desglose, título pegado a servicios).
4. Probar los escenarios `multi`, `upcoming` y `review`: la tira de
   proceso, cuando aparece, debe leerse como banda propia, separada de la
   identidad.
