# GOXION · Mi Espacio — continuidad visual del feed

**Actualizado:** 22 de noviembre de 2026  
**Estado:** laboratorio interactivo actualizado, pendiente de validación visual final en iPhone/Safari y de aprobación del usuario. **NO integrado en producción.**  
**Repositorio:** `henrygonzalezestrada-cyber/goxion`.

## Abrir primero al continuar en otro chat

- **Laboratorio en GitHub Pages:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=14af689
- **Fuente de la última iteración:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en commit **`14af68964affeba212df7519bdb940d12a9eb048`**. Jerarquía de título y ubicación de X: `d04c58818d883bee63615584a302f0dd76699886`. Los cambios de botón SVG y microsuperficie provienen de `5b034547f69f0f00cf67046b97ea72c1a07afb98`.
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

> Continuemos el laboratorio visual del feed GOXION. Lee `AGENTS.md`, `docs/GOXION_MI_ESPACIO_HERO_APROBADA_2026-11-22.md` y `docs/GOXION_FEED_MI_ESPACIO_CONTINUIDAD_2026-11-22.md`. La última versión está en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `d04c58818d883bee63615584a302f0dd76699886`. Además de la jerarquía de título y X, ya está aplicado el bloqueo visual de posición del emoji al abrir información, además del botón SVG de información a la derecha del CTA y la microsuperficie oscura debajo. Continúa desde aquí: no rehagas la tarjeta principal, saludo, fila triple ni morph; trabaja directamente en GitHub y proporciona el enlace del laboratorio tras cada cambio.

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

## Iteración de jerarquía en ampliadas · 22/nov/2026

**Referencia visual:** captura adjunta de la interfaz oficial «Sube tu comprobante» con X en la esquina superior derecha. El usuario solicitó **adoptar la jerarquía y posición, NO su color cian**.

**Código del laboratorio:** commit `d04c58818d883bee63615584a302f0dd76699886`.

- Se retiró **del panel ampliado únicamente** el texto pequeño de categoría `LEALTAD`, `REFERIDOS`, `MISIONES` (selector anterior `.gxb-eyebrow`). En la **fila compacta** esos nombres se conservan: son necesarios para identificar cada beneficio.
- El título real `#gxb-title` sube al inicio de la tarjeta (se eliminó el margen superior de 9px), fuente responsiva 20–25px con jerarquía clara. Sin eliminar ni cambiar textos, estados ni lógica.
- Una sola palabra significativa dentro de cada título recibe acento mediante `span.gxb-title-accent`, creado con `document.createTextNode` y `textContent`, **sin innerHTML de títulos**. Lealtad: **morado/lila** (crece); Referidos: **cian** (avanza, gana, desbloqueado, aplicado); Misiones: **azul** (pendiente, disponible). Solo un acento a la vez; NO gradientes ni varias palabras de colores.
- La X es ahora **un SVG real, neutral** (NO el cian de la captura), con botón táctil de 44×44 px y círculo visual translúcido, sin sombras ni borde llamativo. Se posiciona **absolutamente en la esquina superior derecha de toda `.gxb-panel`** (`top:15px;right:16px`, menor en móviles), como hijo directo del panel. No la alinea el título ni depende de que el título ocupe 1 o 2 líneas.
- Se reservan 50px de ancho en el encabezado para evitar colisiones entre títulos largos y X. El control conserva foco, eventos y cierre del panel compartido.
- **Protegido:** min-height 300px del panel, CTA e icono de info, microsuperficie oscura, emoji grande inferior con bloqueo de movimiento al abrir info, morph al abrir/cerrar, barra de progreso, hero principal compacto al 15% y saludo animado.
- El usuario pidió revisar cómo queda. **Esta iteración aún NO cuenta con aprobación final de iPhone/Safari**. Se hicieron comprobaciones estáticas de HTML/CSS/JS, no prueba visual física ni conexión con datos reales.

**Continuidad inmediata:** pedir inspección visual de Lealtad/Referidos/Misiones con 1 y 2 líneas y la X en la esquina. Si aprueba, marcar el conjunto listo para planificar integración; no tocar `ayuda.html` ni lógica real hasta autorización expresa.


## Corrección de interpretación · jerarquía COLOR de la X (22/nov/2026)

**User feedback explícito:** «Pero si quería que fue tal cual como en la imagen la x para en todos lados sea la misma gerarquia, no de posición si no de color».

**Referencia:** captura aportada del modal oficial «Sube tu comprobante». La idea de **misma jerarquía de la X** es **fondo circular cian destacado y símbolo X OSCURO**, no simplemente la ubicación en la esquina ni una X gris sobre círculo translucido. No se requiere copiar el color de la tarjeta/modal que la rodea.

**Corregido en laboratorio:** commit `14af68964affeba212df7519bdb940d12a9eb048`.

- `#gxb-dismiss` conserva la ubicación ya acordada (absoluta arriba a la derecha) y el objetivo táctil 44×44 px. El círculo visible es de ~38px.
- Fondo del círculo sólido cian `#79e6fc` (aproximación visual basada en la captura original, no token de producto validado), símbolo SVG X color oscuro `#071c29`, estado pulsado `#5bd4ed`. Sin glow ni borde adicional.
- Esta combinación **cian visible + X oscura** es la **referencia de jerarquía para controles de cierre equivalentes en GOXION**. No cambiar todos los botones de la web oficial sin aprobación de integración; la regla se adopta primero en los cierres equivalentes del laboratorio.
- Se mantuvieron títulos con una sola palabra contrastante, sin etiqueta superior, tarjetas ampliadas min-height 300px, bloqueo del emoji al tocar info, microsuperficie oscura, morph, y hero/saludo aprobados.
- **Pendiente:** verificación visual en iPhone y confirmación del usuario; fuente pública sujeta a proceso de publicación Pages. No declarar aprobación del feed ni integración oficial todavía.

**Al retomar otro chat:** no confundir de nuevo el pedido: se refiere **al color de cierre** (círculo cian X negra/oscura) y no a mover su posición. No devolverlo a círculo gris/transparente.

## Iteración pendiente de evaluación · progreso vivo y checkboxes en Misiones (22/nov/2026)

**Rama de laboratorio:** `preview/feed-beneficios-motion-20261122`.  
**Commit del HTML:** `2a011e3872dcf8804b117d052663bdf423970157`.  
**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.

- Lealtad, Referidos y Misiones ahora tienen un **barrido luminoso cíclico mientras su panel expandido está visible**. No se limita a una pasada inicial; el brillo está contenido dentro del progreso ya validado, sin animar toda la tarjeta ni alterar porcentajes reales/ficticios.
- **Misiones pendientes** agrega barra del progreso 2/3, como las otras dos tarjetas, y sustituye el texto fijo `Hecha ✓` por indicadores SVG de checkbox. Las dos misiones hechas dibujan su palomita en secuencia al abrir; la tercera permanece pendiente y visualmente distinta. No son controles interactivos ni ejecutan misiones reales.
- En `prefers-reduced-motion: reduce` se desactivan todas las animaciones nuevas y los iconos quedan legibles. Se preservan título, X cian con símbolo oscuro, altura mínima 300px, emoji anclado al abrir información, morph de entrada/salida, hero compacto y saludo aprobados.
- **Validación automatizada de estructura:** 3 compactas, barras en las 3 ampliadas normales, 3 iconos de misión, 2 scripts JS con sintaxis válida, estilos de cierre y altura preservados. **Falta prueba visual en Safari físico**, no afirmar aprobación final.
- **Aún no integrado en `ayuda.html` oficial.** El usuario debe revisar las animaciones en iPhone y decidir si gusta la intensidad/ritmo antes de planificar integración.

## Refinamiento autorizado · legibilidad, ritmo y estados (22/nov/2026)

**Instrucción expresa:** aplicar los puntos 1, 2, 3 y 5 de la evaluación final del usuario; **NO aplicar el punto 4** (no aumentar ni el área ni el tamaño visual del CTA de 38px). El usuario manifestó que le gustó la iteración anterior.

**Commit del laboratorio:** `f343aafdd9d4d3dd67b7d8802ec1cddff3a41b58`. **Archivo único de UI:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.

- **Compactas / legibilidad:** fila triple intacta. Títulos un poco mayores y más contrastados; leyendas secundarias de 10.5px, sin ellipsis forzada y con reserva vertical consistente para envolver palabras en móviles de 280–380px. Altura mínima 121px para alojar las dos líneas sin solapamientos. `Invita` usa tipografía adaptativa por su longitud, preservando el emoji a color.
- **Ritmo de las barras expandidas:** brillo reducido y barrido cada 7.2 segundos con una fase prolongada en reposo; se conserva la animación inicial de los medidores y las animaciones individuales de las compactas. Se pausa el ciclo si la pestaña está oculta y se respeta `prefers-reduced-motion`. Los porcentajes y dimensiones de las barras no cambian.
- **Misiones:** estado completado conserva el checkbox SVG animado no interactivo, con etiqueta «Completada»; estado pendiente ahora tiene icono de reloj no interactivo + «Pendiente», distinguible sin depender solo del color. El detalle del laboratorio genera de manera consistente las 3 misiones tanto en 2/3 como 3/3, indicando progreso/recompensa.
- **Referidos:** `none` representa la acción «Invita» y oculta barra compacta; `active` muestra 1/3; `ready` muestra 3/3 y recompensa; `claimed` muestra ✓, «mes aplicado» y oculta la barra, pues ya no hay progreso pendiente. Los `aria-label` describen el estado real del escenario. Ningún dato de prueba se confunde con información oficial.
- **Invariantes:** `#gxb-action` permanece EXACTAMENTE igual (38px, película al 8%, tamaño original). Tampoco se alteraron el hero aprobado, saludo, morph, botón de información, microsuperficie, X cian oscura, emoji anclado o panel mínimo de 300px. Sin acceso a backend ni `ayuda.html`.

**QA alcanzado:** sintaxis válida de ambos scripts, llaves CSS balanceadas, verificación automática de estados 2/3 y 3/3, no progreso ficticio y guardas de CSS/hero/CTA. **Pendiente:** revisar rendering responsive y animaciones en Safari físico; no declarar aprobación ni integración oficial.

## Nuevo bloque experimental · ahorro mensual con plataformas flotantes (22/nov/2026)

**Solicitud expresa:** insertar un rectángulo ANTES de «Tus servicios» y DESPUÉS de Lealtad/Referidos/Misiones: logos auténticos de las plataformas contratadas a la izquierda, con flotación discreta derivada del lenguaje de promos del catálogo, y cantidad ahorrada a la derecha en negrita. **Sin encabezado pequeño seguido de otro título grande, sin saturación, sin degradados excesivos ni capas extra.** Se implementa primero solo en laboratorio, pendiente de reacción visual del usuario.

**Rama:** `preview/mi-espacio-ahorro-flotante-20261122`.  
**Commit:** `532ba92930629db9426be5dd7f48b9be38e858a0`.  
**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.

- Tarjeta única `#gxv-savings`, cristal neutro coherente con el resto, dos columnas en todos los anchos (280 a 580+), cifra dominante `#gxv-amount`, una explicación única «menos al mes que por separado» y leyenda «Ejemplo · N plataformas». No duplica titulares ni añade una nueva sección promocional.
- Logos originarios del repositorio `/logos/*.PNG` (Netflix, Disney+, HBO Max, YouTube Premium, Prime Video, Crunchyroll, Microsoft 365), rutas relativas `../../logos/...`. Sin nuevos activos, paquetes ni sprites externos. Máximo 4 logos flotantes a la vez; el resto se representa con `+N`. Uno solo aumenta tamaño y se centra; ninguno oculta la tarjeta.
- Movimiento continuo leve, sin rebote ni flash. Se activa solo cuando visible con `IntersectionObserver`, se pausa al ocultar la pestaña y se suprime bajo `prefers-reduced-motion`. Logos decorados sin cajas adicionales. Ningún botón falso dentro de la tarjeta.
- **Simulación de datos:** 1 plataforma → $69; 4 → $248; 7 → $412; 0 → módulo oculto. Selector `#gxv-demo-case` únicamente en «Probar estados · Laboratorio» para probar casos. **Todos los importes son inventados a efectos de la composición y se identifican explícitamente como «Ejemplo». NO son precios ni ahorros reales.**
- **Integración futura obligatoria:** calcular diferencia únicamente si hay precios individuales públicos verificables, tarifa contractual real y periodos compatibles. Distinguir servicios activos/inactivos y no incluir cupones, mora, lealtad ni descuentos financieros como ahorro comparativo duplicado. Sin datos comparables, omitir importe en vez de inventar. UI de Mi Espacio solo consume datos autorizados; no crea motor financiero independiente.
- **Lo protegido:** hero compacta centrada (cristal y saludo), Lealtad/Referidos/Misiones, barras, X cian, morph, CTA 38px, calendario e Index, `ayuda.html` y backend están intactos.

**QA:** se ejecutó el script con DOM simulado comprobando las 4 variaciones y sus logos; 3 scripts JS parsean, CSS balanceado, localización del bloque e invariantes de hero/beneficios/CTA confirmadas. **Aún falta revisar visualmente en Safari/iPhone físico**; no declarar aprobado ni conectar a producción.
