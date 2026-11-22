# GOXION · Mi Espacio — continuidad visual del feed

**Actualizado:** 22 de noviembre de 2026  
**Estado:** laboratorio interactivo actualizado, pendiente de validación visual final en iPhone/Safari y de aprobación del usuario. **NO integrado en producción.**  
**Repositorio:** `henrygonzalezestrada-cyber/goxion`.

## Abrir primero al continuar en otro chat

- **Laboratorio en GitHub Pages:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=a18173a
- **Fuente de la última iteración:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en commit **`a18173a41d28eefa3c5379b19fb6ca1240eb3542`**. Los cambios de botón SVG y microsuperficie provienen de `5b034547f69f0f00cf67046b97ea72c1a07afb98`.
- **Documentación de la tarjeta principal congelada:** `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md`.
- **Auditoría visual previa y principios aprendidos:** `docs/GOXION_AUDITORIA_BENEFICIOS_FEED_2026-11-22.md`.
- **Rama que preserva la tarjeta principal aprobada:** `approved/mi-espacio-hero-compacta-centrada-20261122`, apuntando a `f33e8572c07377f4811080a87c7cb1b483983b34`. Se elimina únicamente el rótulo flotante «GOXION» rechazado, según la documentación del hero.

### Pedido en curso y última instrucción aplicada

El usuario solicitó **dos cambios muy concretos** en el bloque ampliado de Lealtad, Referidos y Misiones:

1. Sustituir «Condiciones» (texto subrayado debajo del CTA) por **un botón con símbolo de información SVG**, a la **derecha** del CTA principal (p. ej., «Copiar invitación»).
2. Cuando se pulse ese icono, las condiciones deben salir debajo del bloque de botones **sobre una microsuperficie local más oscura**, opaca y legible sobre el emoji ampliado. **NO** consiste solo en aumentar la opacidad del texto.

**Aplicado en el laboratorio en commit `5b034547f69f0f00cf67046b97ea72c1a07afb98`.** Verificar visualmente en iPhone, pero no reinterpretar ni rehacer este pedido.

### Implementación exacta

- `.gxb-foot-action`: ahora **fila horizontal** (`flex-direction:row`, `gap:8px`), CTA a la izquierda e info a la derecha. Se retiró el `padding-right` que comprimía el área de botones en pantallas estrechas. No cambia el diseño del CTA aprobado.
- `#gxb-action`: permanece como **píldora de 38 px de alto**, fondo `rgba(255,255,255,.08)`, sin borde, sombra ni blur adicional; referencia visual a «Ver mi cuenta».
- `#gxb-rules`: botón con **SVG de círculo e indicador de información** (no carácter textual `i`), objetivo táctil **44×44 px** y círculo visual de ~38 px. `aria-label` cambia entre «Ver condiciones» y «Ocultar condiciones»; conserva `aria-expanded` y `aria-controls="gxb-rule-note"`. Se eliminó la palabra visible «Condiciones».
- `#gxb-rule-note`: se abre debajo con `background:rgba(4,7,13,.88)`, `backdrop-filter:blur(12px) saturate(1)`, borde muy discreto, radio `15px`, padding `13px 14px`, texto claro; `z-index:3` frente al emoji ampliado con `z-index:0`. El fondo oscuro pertenece **solo** a este texto, no convierte todo el cristal en sólido.
- La acción de Lealtad «Mis niveles» que revela las condiciones sincroniza también el estado visual y accesible del botón info.
- Se mantiene la interacción de abrir/cerrar información y su estado correcto al cambiar de beneficio.

### Qué YA quedó aceptado o gustó y debe preservarse

1. **Tarjeta principal:** composición «Compacta centrada», neutro **15% del regulador** (en CSS equivale a `rgba(8,8,12,.371)` y blur aproximado de 11.8px); CTA a **8%**. No tintar ni cambiar el header y saludo.
2. **Saludo superior:** textos y rotación contextual cada 13s, transición por palabras, dos líneas sin salto; documentado y protegido. **No volver a reconstruirlo.**
3. **Fila triple:** Lealtad, Referidos y Misiones en una sola fila. Emojis ⭐ 🎁 🎯 nítidos a color y alineados horizontalmente con la cifra (3/4, 1/3, 2/3). Compactas de altura baja y barras con microanimaciones.
4. **Apertura premium:** una tarjeta compacta se transforma visualmente en un panel de ancho completo, con emoji que viaja al ampliado. **La fila se oculta al expandir y reaparece al cerrar**, evitando cajas duplicadas.
5. **Panel ampliado:** cristal neutro al 15% del regulador, emoji grande en la esquina **inferior derecha** (aprox. 136–165px), progreso y detalle prioritario; estados de beneficio listo con celebración moderada.
6. **Tamaño del panel expandido:** conservar el diseño anterior con `min-height:300px` y su espaciado aprobado visualmente. Hubo una interpretación incorrecta que lo redujo a 242px; el usuario pidió **revertir** esa reducción y se revirtió en commit `441badfaf239a4a24200d22343fea41b03f93553`. **No volver a cambiar la altura del panel confundiendo la observación con la altura del botón.**
7. **CTA expandido:** altura visual de 38px, misma familia que CTA hero. En la última iteración el enlace secundario se volvió un icono, pero el CTA sigue igual.
8. El usuario dijo que la versión de referidos/misiones ya era **«Muchísimo mejor»**; todavía no declaró aprobado el conjunto final. No generalizar esa aprobación al nuevo botón info sin su revisión.

### Lo que el laboratorio NO hace

- **No usa datos reales**: los valores 3/4, 1/3, 2/3 y los estados seleccionables son ficticios.
- No cambia cuentas, pagos, referencias, misiones ni cupones; una copia de invitación es solo un texto de demostración.
- No se ha integrado en `ayuda.html`, `assets/css/ayuda.css`, `admin.html`, `index.html` o backend.
- Todavía **no se ha probado físicamente en Safari** el cambio del icono y microsuperficie. Las comprobaciones realizadas son sintaxis JS, balance CSS, estructura, presets y resguardo del hero.

### Pendiente inmediato para el siguiente chat

1. Abrir el laboratorio con el commit del encabezado, entrar en **Referidos** y **Misiones**, tocar el botón **ⓘ** (SVG) junto a «Copiar invitación» / «Ver recompensa». Evaluar en iPhone: alineación en una fila, legibilidad de la microsuperficie delante de 🎁/🏆/🎯, cierre y reabrir información, sin salto excesivo ni cambio de proporciones.
2. Si el usuario confirma que se ve bien, **registrar aprobación de la fila de beneficios**. Si pide pulido, modificar **solo el detalle señalado** y conservar hero, saludo y morph. No seguir rediseñando componentes aprobados.
3. Solo con aprobación expresa del usuario, planificar integración oficial en `ayuda.html`: reusar datos reales de lealtad, referidos y misiones, sin alterar reglas financieras ni acciones. Validar estados y Safari. **No mezclar demo con lógica de producción**.

### Cómo abrir la continuidad en otro chat

> Continuemos el laboratorio visual del feed GOXION. Lee `AGENTS.md`, `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md` y `docs/GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md`. La última versión está en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `a18173a41d28eefa3c5379b19fb6ca1240eb3542`. Ya está aplicado el bloqueo visual de posición del emoji al abrir información, además del botón SVG de información a la derecha del CTA y la microsuperficie oscura debajo. Continúa desde aquí: no rehagas la tarjeta principal, saludo, fila triple ni morph; trabaja directamente en GitHub y proporciona el enlace del laboratorio tras cada cambio.

## Corrección del 22/nov/2026 · emoji fijo al tocar información

**Referencia:** video de iPhone `ScreenRecording_11-22-2026 01-21-41_1.mp4`, aportado por el usuario en el chat. Muestra que al tocar ⓘ la microsuperficie se abre, **el panel crece y el emoji ampliado se desliza verticalmente** porque estaba anclado a `bottom:3px` de una tarjeta con altura variable.

**Pedido explícito:** «el emoji no se debe mover al tocar el símbolo de info».

**Aplicado al laboratorio:** commit `a18173a41d28eefa3c5379b19fb6ca1240eb3542`.

- `.gxb-panel-emoji` conserva su esquina inferior, tamaño, opacidad y rotación. Solo suma `translateY(var(--gxb-info-lock,0px))`, un desplazamiento correctivo aplicado **únicamente** al abrir/cerrar el texto de información.
- `setInfoOpen(open,feedbackMessage)`: mide la altura del panel **antes y después** de actualizar `hidden` y calcula `offsetAnterior + altoAnterior - altoNuevo`, compensando el crecimiento en el mismo evento de UI (sin una animación nueva). Al cerrar, el desplazamiento vuelve a cero.
- El botón de información usa la función común. La acción «Mis niveles», que también muestra las condiciones, usa la misma ruta y toma en cuenta el mensaje adicional.
- Cuando cambia el beneficio o se termina de cerrar el panel ampliado se retira la corrección de posición. **La animación compartida al abrir/cerrar la tarjeta completa sigue intacta**.
- La microsuperficie local oscura `rgba(4,7,13,.88)`, el botón SVG ⓘ junto al CTA, el panel ampliado con mínimo de 300px y el cristal neutro 15% no cambian.
- **Validado hasta ahora:** sintaxis JavaScript, balance CSS, estructura y condiciones de invariancia. **No** afirmar que esta revisión fue probada visualmente en Safari físico hasta recibir comprobación del usuario.

### Próxima revisión en el laboratorio

Abrir Lealtad, Referidos y Misiones; alternar varias veces el icono ⓘ (y «Mis niveles» en Lealtad). Confirmar que ⭐/🎁/🎯/🏆 **permanecen a la misma altura y posición en pantalla** mientras aparecen las condiciones, sin perder legibilidad. Si falla en iPhone, ajustar exclusivamente la compensación del emoji; no rediseñar el hero, el saludo ni el panel.
