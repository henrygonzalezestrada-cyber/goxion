# GOXION · Mi Espacio — continuidad visual del feed

**Actualizado:** 22 de noviembre de 2026  
**Estado:** laboratorio interactivo actualizado, pendiente de validación visual final en iPhone/Safari y de aprobación del usuario. **NO integrado en producción.**  
**Repositorio:** `henrygonzalezestrada-cyber/goxion`.

## Último ajuste de encabezado y controles — 22/nov/2026

El usuario pidió acercar «Todos / Pagos / Servicios» al título «Historial de movimientos» y armonizar flechas, X y material de filtros con Servicios. **Aplicado al laboratorio, no a `ayuda.html`**, commit `5f78c8ed479c8ca7b926238c3853e0daa934ef78`.

- Los tres filtros son una parte del encabezado `gxm-head`, alineados a la izquierda **justo bajo el título en iPhone** (no se fuerza a encajarlos horizontalmente con un título largo); desde 680px pueden compartir la línea con él. Disminuye el aire visual innecesario sin comprimir la lista.
- Tanto el botón superior de filtro como las filas abiertas usan las clases reales `gxs-icon` / `gxs-chevron` / `gxs-x` de Servicios: flecha en reposo, **disco cian de 35px, X oscura de 16px, área táctil 44px** al abrirse. No alterar esas clases compartidas ni agregar una segunda versión de X.
- Cápsulas de categoría en cristal **`rgba(255,255,255,.08)`** como los botones del resto del feed; selección con tinte cian sutil, sin bordes/glows. Mantener la lista con sus separadores funcionales y datos de prueba.
- QA estático: scripts 4/4 válidos, encabezados/secciones balanceados, 12 transiciones de interacción simuladas satisfactorias (filtro, selección, apertura de detalle, mostrar más, retorno a todos). Se verificó que fuera de Historial no cambió HTML/CSS/JS; **Safari visual en el iPhone sigue pendiente de esta versión**.

Documentación canónica: `docs/GOXION_HISTORIAL_MOVIMIENTOS_DISENO_Y_FUENTES_2026-11-22.md`.

**Laboratorio actualizado:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=5f78c8e

---

## Pulido de Historial basado en captura Safari — 22/nov/2026

El usuario compartió captura de iPhone del nuevo Historial de movimientos y solicitó análisis independiente de limpieza, márgenes, jerarquía y separadores frente a lo aprobado. Conclusión: **no rehacer el módulo; su estructura, cristal y densidad son correctos.**

Se verificaron principios de Apple HIG (listas escaneables), Material Design (separadores para jerarquía, sin exceso) y NN/g (divulgación progresiva). **Las líneas entre eventos son funcionales y se mantienen**: se cambiaron a divisores neutros inset alineados al texto con anchuras responsivas, no se agregaron líneas a Servicios ni se tocan barras de beneficios.

Laboratorio actualizado en `3d9eca2a83108364b858c10fb43f4840b405b611` y `3e48c16a3a107e080891f70caabb77403d00f4ee`: separación Servicios→Historial 27→19px; filtro colapsado «Filtrar» o nombre activo, expandido «Cerrar» + opciones; alta de servicio sin subtítulo «Alta confirmada» redundante; control «Ver N movimiento(s) más» según conteo real del filtro. Foco y estados aria conservados. Visual del resto del feed se comprobó idéntico al prototipo previo en sus secciones (comparación de contenido fuera de `gxm-*`).

**Chequeos:** cuatro scripts JS válidos, HTML de secciones balanceado, siete registros simulados, detalles bajo demanda y X común 35px/16px intacta. Aún falta ver esta iteración exacta renderizada en Safari, y no se ha tocado la página oficial.

**Laboratorio actual:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=5f78c8e

---

## Decisión vigente · Historial de movimientos, no otra tarjeta de estado

**El usuario aceptó evolucionar el último bloque a «Historial de movimientos»** (22/nov/2026), que debe incluir **pagos, altas de servicio, renovaciones confirmadas y cancelaciones**. Esta decisión **supersede** la recomendación anterior de limitarlo al «Historial de pagos» y la idea descartada de «Próximos movimientos». El objetivo es el registro cronológico de hechos pasados, no presentar otra vez estados o pendientes actuales.

**Laboratorio implementado visualmente** en `main` commits `ab9a8e9fbf3ccac0fab5d5a9288192483f9cba69` y `73624b2f59fc86b62f6f18d908a22a0937164ae8`. Sección `#gxm-history`, **después de Servicios** y antes del Catálogo demostrativo. Una superficie neutra única con filas compactas, 3 por defecto, expansión total, filtro Todos/Pagos/Servicios, detalle por evento con foco preservado. Ejemplos de dos pagos, dos altas, una renovación y dos fases de cancelación, todos ficticios e identificados como tales.

**Límite crucial:** `historial_pagos` ya existe con fuente real; la capa del cliente no muestra fecha de alta en cada servicio ni un evento confirmado de renovación y **no garantiza una bitácora completa de bajas efectivas de servicios retirados**. El nuevo título fue aprobado como alcance visual, **no implica que los cuatro tipos de eventos estén conectados**. No inventar movimientos ni inferir renovación a partir de pago/cobertura, ni baja efectiva por mera aprobación. Requiere contrato histórico real por evento antes de implementar en producción.

**Documento canónico:** `docs/GOXION_HISTORIAL_MOVIMIENTOS_DISENO_Y_FUENTES_2026-11-22.md`. La UI del historial queda pendiente de validación visual en iPhone/Safari. Hero, Lealtad, Referidos, Misiones, Ahorro, Servicios y Catálogo **no se modificaron** en esa iteración. `ayuda.html` oficial sigue con Historial de pagos.

**Vista actual:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=3e48c16

---

## Abrir primero al continuar en otro chat

- **Laboratorio en GitHub Pages:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=73624b2
- **Fuente de la última iteración:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en commit **`5f78c8ed479c8ca7b926238c3853e0daa934ef78`**: filtros en el encabezado y control flecha→X cian idéntico a Servicios, conservando los módulos aprobados. La auditoría previa del historial fue `3e48c16a3a107e080891f70caabb77403d00f4ee`; prototipo base `73624b2f59fc86b62f6f18d908a22a0937164ae8`.
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

## Pulido del resumen de ahorro · profundidad, animación numérica y simulador móvil (22/nov/2026)

**Reacción del usuario:** la primera propuesta de tarjeta de ahorro **sí le gustó**; está autorizada una evolución de proporciones/movimiento/márgenes, no rediseñarla. Solicita un logo grande si solo hay una plataforma; composiciones fluidas de 2, 3 y 4 logos, ligerísimo solape sin que unos oculten otros, profundidad por escala/z-index/sombra/desfase; cifra un poco mayor, y un contador con subida/bajada refinada al estilo de Index. Señala que el espacio anterior entre beneficios y ahorro era excesivo respecto al espacio entre hero y beneficios. También reporta que el panel «Probar estados · Laboratorio» no siempre se puede desplazar en iPhone.

**Rama:** `preview/ahorro-profundidad-contador-panel-20261122`.  
**HTML actualizado en commits:** `2e22bac2203d3a826d1b75ab0d5b098c108cede1`, `77a04e315a7839bb71e06afb145218af61583f41`, `b83b0073955ec33560f840751a1fbc6be5c94735`, `ac4d0e5c859844868651c92795a56100bdff90f2`, `63678eb016389d4033a76001f6ce3468c0f35038`.

- **Composición de logos:** CSS por `data-count=1/2/3/4` con dimensiones adaptativas (único 68–82px, los demás ~40–61px), capas z-index, sombras/temperaturas diferenciadas, pequeño solape vertical y horizontal para profundidad sin ocultación fuerte. Flotación lenta y desfasada de ~2–4px y ~7–10 segundos, pausa fuera del viewport/pestaña, respeta `prefers-reduced-motion`. Los 5–7 servicios siguen mostrando los primeros cuatro y una cápsula `+N` colocada arriba a la derecha, sin tapar logos.
- **Cifra:** CSS aumentado aproximadamente 8–12% `clamp(34px,9vw,51px)`, números tabulares. `data-long` reduce el tamaño para valores de cuatro cifras al conectar importes mayores en el futuro. Animador con `requestAnimationFrame`, interpolación ease-in-out cúbica, 1050ms de entrada y 760ms en cambios; interrumpe animaciones anteriores, termina en el importe exacto, se detiene al ocultar la pestaña y se desactiva si el usuario prefiere movimiento reducido. Como el panel de pruebas tapa la tarjeta, las transiciones de cantidad se **reproducen al cerrar el panel** o cuando el bloque vuelve al viewport para que puedan observarse.
- **Ajuste del ritmo vertical:** separación entre hero→beneficios `14px` (aprobada e intacta) y beneficios→ahorro `14px`. Ahorro→«Tus servicios» `18px`, tanto cuando hay servicios como cuando no. No cambiar otras secciones.
- **Controles del laboratorio:** selector de **0–7 plataformas**, no solo presets 1/4/7, y selector de primera plataforma entre Netflix, Disney+, Max, YouTube Premium, Prime Video, Crunchyroll y Microsoft 365. Con 0 desaparece la tarjeta. Se mantiene máximo cuatro logos visibles. Los valores `[0,69,131,187,248,312,367,412]` son **ficticios** y se identifican como «Ejemplo» para observar la composición/contador.
- **Scroll panel iOS:** `#demo-panel` se extiende entre safe areas superior e inferior con top/bottom fijos, scroll vertical independiente `overflow-y:auto; -webkit-overflow-scrolling:touch; touch-action:pan-y`, panel con enfoque no invasivo en vez de enfocar automáticamente el selector de estados, bloqueo de scroll de fondo al abrir, cierre cian X oscura integrado arriba y Escape/restauración del foco. Se comparte `setDemoOpen` entre todos los controles de apertura.
- **Limitación intencional del cálculo:** sin importes contractuales GOXION ni referencia oficial homogénea por servicio/perfil, NO calculamos ni publicamos ahorro real. La comparación futura debe tomar referencias de precio verificables y por el mismo periodo, contratos activos reales y la tarifa que paga cada perfil; los planes completos y los perfiles compartidos no son necesariamente equivalentes. No se altera Index, beneficios, motor financiero, `ayuda.html` ni bases de datos.

**Comprobaciones:** JS de los 3 scripts valido; CSS balanceado; 8 escenas 0–7 simuladas con DOM + animador hasta el monto exacto, selección de Microsoft como logo principal validada; hero completo, CSS/HTML de los tres beneficios y ambos CTA aprobados inalterados. **Aún pendiente:** verificar desplazamiento con gestos y composición en Safari físico (ancho 280–430px). La tarjeta de ahorro continúa como laboratorio y **no está aprobada para producción**.

## Ajuste óptico de ahorro + saludo compacto sin saltos (22/nov/2026)

**Solicitud del usuario:** tras ver el laboratorio en iPhone, el módulo de ahorro se siente cargado hacia la izquierda porque deja más aire a la derecha; el saludo «Hola, Mario» queda demasiado lejos del hero. Solicita corregirlo en el laboratorio y conservar compatibilidad de hasta dos líneas sin desplazar el feed.

**Rama:** `preview/mi-espacio-balance-saludo-20261122`.  
**Commits del HTML:** `0c13203c88cc2a052704bc537e6c5c615449155b`, `aa4eeed525ee302caaada4086c883e4e9a12ab85`.  
**Archivo:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.

- **Ahorro — balance óptico interno, no rediseño:** misma superficie y ancho exterior, logos flotantes, profundidad y contador intactos. Padding interior de ahorro de `15px 19px 15px 13px` a `15px 15px 15px 18px` (derecha/izquierda menos desequilibradas), desplazando discretamente el conjunto hacia la derecha. Ajustes móviles congruentes: `13px 12px 13px 14px` hasta 380px y `12px 9px 12px 11px` hasta 315px. No añadir más cristal, bordes, glows, títulos ni efectos.
- **Saludo — vínculo más cercano al hero:** altura anterior `clamp(106px,26vw,122px)` a `clamp(88px,23vw,102px)`, con 90px hasta 380 y 86px hasta 315. Fuente ligeramente mayor: base `clamp(28px,7vw,35px)`, 26–29px hasta 380 y 25px hasta 315. Se mantienen peso, color del nombre, microanimación por palabra, contexto urgente y rotación de las tres frases cada 13s.
- **Dos líneas sin reflow:** `h1` conserva altura fija de `2.32em`; se agrega `.greeting-line` alineado al fondo. Una frase corta queda cerca de la tarjeta sin espacio blanco inferior; una larga puede ocupar dos líneas **sin mover la tarjeta principal ni el resto del feed**. La animación coloca spans solamente para palabras y nodos de texto auténticos para espacios; esta corrección evita que las palabras se peguen y recupera saltos de línea naturales. `aria-label` del saludo sigue actualizado.
- **Invariantes protegidos:** no modificar CSS/HTML del hero aprobado, beneficios Lealtad/Referidos/Misiones, X cian, botones CTA, medidores ni anchura exterior de ahorro, laboratorio de escenarios, motor financiero o las páginas oficiales.

**QA:** ambos estilos CSS compactos y media queries revisados; sintaxis de los 3 scripts intacta; simulación DOM de palabras (nombre destacado, textos y animaciones) y prueba de maquetación aislada en Chromium a 280, 315, 375, 390, 430 y 580px con saludo corto y frase larga: hueco visual hasta el hero ~14–17px, salto a dos líneas sin desbordamiento horizontal. **No equivale a validar toda la página en Safari físico**. El usuario debe evaluar la versión; todavía no aprobada para producción.

## Microajuste aprobado para probar · saludo intermedio + texto del ahorro desplazado (22/nov/2026)

**Petición precisa del usuario:** tras la iteración de saludo anclado abajo, prefiere que quede **centrado/intermedio** verticalmente en su reserva de hasta dos líneas (sin demasiado espacio arriba). En la tarjeta de ahorro la composición todavía se percibe hacia la izquierda; **NO cambiar los logos ni su ubicación**, únicamente desplazar el grupo de texto del importe un poco a la derecha.

**Rama:** `preview/saludo-centrado-ahorro-texto-20261122`. **Commit HTML:** `6ae5b46c34db38d0a38d8d272d0650a7de1f4304`.

Dos ediciones CSS exactas en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`:

1. `.greeting h1`: `align-items:flex-end` → `align-items:center`. Conserva `height:2.32em`, el contenedor `.greeting` y `.greeting-line`, tamaño de la letra, todas las frases, rotación 13s y entrada por palabras. El texto queda equidistante de las líneas superior e inferior en vez de pegado abajo. La reserva permanece fija para evitar saltos de layout.
2. `.gxv-value`: se añade únicamente `transform:translateX(clamp(7px,2.8vw,12px))` para desplazar la **columna de texto** entre 7–12px de forma adaptable. No cambiar `.gxv-logos`, los tamaños/posiciones/profundidad de logos, el grid externo, padding, fondo, CTA, contador numérico ni las barras de beneficios.

**QA:** comparación exacta del HTML previo y posterior confirma que **solo** se editaron esas dos declaraciones; CSS balanceado, los tres scripts válidos, hero y textos dinámicos sin cambios. Pendiente revisión óptica por el usuario en Safari físico. Laboratorio exclusivamente; `ayuda.html` oficial sin cambios.

## Laboratorio · «Tus servicios» V1 contextual (22/nov/2026)

**Idea aprobada para prototipar, NO diseño final aprobado:** El usuario quiere dar aires nuevos al bloque **«Tus servicios»**, mantener limpia la interfaz sin perder funcionalidad, organizar la información que vive dentro de cada tarjeta y aplicar coherentemente cristales, jerarquía de botones y microinteracciones ya aprendidas. **No crear más bloques de cristal permanentes antes de Tus servicios ni alterar la navegación oficial**. Se debe trabajar primero en laboratorio y respetar las funciones oficiales al integrar.

**Rama:** `preview/mi-espacio-servicios-v1-20261122`. **Commits HTML:** `495930e48e0a693114dd3e8aba3f8b5cbe762420`, `314b69fb3399378cd0b55e5515af12fcbcf0b1fa`, `249abffedf3007b31d83c501e1f1bf72a1d7053d`, `ba9d99ac00e34391d703a4eda192037ead4f0c31`. **Único archivo UI:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`.

### Arquitectura y ADN visual
- Nuevo `#gxs-services`, colocado **después de ahorro y antes del Catálogo visual del laboratorio**. Una lista vertical de tarjetas `.gxs-card.gxc-surface`: logo real de marca, nombre y **un solo estado** (punto discreto, sin badges duplicados), indicador de expansión al final. La cabecera solo dice **Tus servicios** y una síntesis contextual «N activos», «1 actualización», «1 en seguimiento» o «1 necesita atención».
- La tarjeta se **expande en el mismo lugar**, con transición de altura suave; se abre una a la vez. El icono final pasa de chevron neutro a **X cian sólido `#79e6fc` con trazo `#071c29`**, objetivo 44px, coherente con los beneficios aprobados.
- Dentro: subtítulo funcional **«Tus accesos»** o **«Tu invitación»**, filas de datos sin cápsulas individuales de cristal; correo, perfil y PIN en compartidos, o correo personal y estado en invitación. Acciones de fila «Copiar» y «Mostrar» en texto cian discreto. Botón primario «Más opciones» con opacidad blanca 8% y botón secundario «Soporte» sin cápsula; cuando aplica, el CTA principal cambia a «Revisar actualización», «Ver cancelación», «Ver invitación» o «Consultar soporte». Cancelación aparece bajo «Más opciones», sin duplicar atajos.
- Solo los avisos que ameritan contexto abren una **microsuperficie oscura** de explicación (nueva contraseña, cancelación en revisión, invitación pendiente, servicio temporalmente inactivo). Evitar decoraciones innecesarias, glow multicolor o tarjetas dentro de tarjetas; conservar identidad de cada plataforma mediante logos reales.
- Escenarios en `#gxs-demo-case`: 4 activos; 1 activo; 2 activos; actualización de contraseña; invitación pendiente; cancelación en revisión; servicio temporalmente inactivo; sin servicios. Datos 100% ficticios, email `mario@example.com` y PINs de ejemplo; ningún dato real ni llamadas al backend.
- Las vistas ampliadas no permiten enfocar elementos cuando están cerradas (`inert` y `aria-hidden`), `aria-expanded` sincronizado; se respeta `prefers-reduced-motion`. Las acciones de negocio solo dan feedback conceptual. El botón de copiar puede copiar únicamente correo ficticio, y el PIN ficticio se puede mostrar/ocultar para comprobar jerarquía.

### Contrato de integración con funciones reales (NO IMPLEMENTADAS AHORA)
- En el Dashboard oficial `assets/js/ayuda/01e-client-dashboard.js` están el resumen `.gx-service-summary`, expansión `.gx-service-expanded`, las vistas `gxServiceView(...)`, accesos `s.accesos`, `modo_acceso` compartido/invitación, PIN y copiar, credenciales `credencial_pendiente` con revelación de una sola consulta y confirmación de PIN GOXION, soporte `gxOpenServiceSupport` y solicitudes `gxSubmitServiceCancellation`. **La UI del laboratorio debe adaptar estos flujos, nunca crear una segunda lógica ni simular que ya funcionan con datos reales.**
- Las novedades/revisiones deben proceder de `s.novedades` y `cancelacion.estado` confirmados. Cancelación `solicitada` o `aprobada` sin baja efectiva **no implica retirar el servicio de la lista**; una baja efectiva sí debe retirarlo en Panel cliente y Admin. Sin servicios, vista vacía clara y sin entradas falsas.
- Toda nueva implementación se limita al **feed desde el saludo hacia abajo**; la barra de «Mi Espacio/Catálogo/Soporte» que se ve arriba en el laboratorio es apoyo visual y **NO se publicará ni cambiará**. `ayuda.html`/Index/Admin y la base de datos siguen intactos.

**QA de esta iteración:** comparados contra `main`, cabecera/navegación de prueba, saludo/hero, beneficios y bloque de ahorro **idénticos en HTML y CSS** (excepto reemplazo del antiguo placeholder de Tus servicios); 4 scripts válidos, CSS balanceado; simulación DOM de los 8 escenarios y apertura/cierre de acordeón con cambio entre tarjetas, opciones expandibles. **No se ha realizado prueba física en Safari ni el usuario ha validado visualmente esta nueva sección.**

## Jerarquía unificada de cierres · 22/nov/2026

El usuario observó en video que la X de Servicios era más grande que la de Misiones, Lealtad y Referidos. **Regla visual para todos los módulos actuales y futuros:** círculo cian de **30px de diámetro visual**, glifo X de **14px**, área táctil accesible invisible de **44×44px**. Fondo `#79e6fc`, trazo `#071c29`. Se aplicó a `.gxb-dismiss::before` (inset 7px en área de 44px) y a `.gxs-icon::before` (mismo inset) cuando las tarjetas están abiertas. No reducir el área táctil ni cambiar la posición de las X. Mantenerlo idéntico en futuras tarjetas del feed; la jerarquía es de color y tamaño, no de posición.

**Revisión posterior (mismo día, petición de tamaño menor):** el usuario informó que el círculo anterior continuaba viéndose grande incluso en Servicios y otras tarjetas. **Nuevo único criterio del laboratorio:** círculo visual de **26px**, SVG X de **12px**, objetivo táctil invisible **44×44px**, color cian sólido `#79e6fc` y trazo oscuro `#071c29`. CSS compartido `--gx-close-disc` / `--gx-close-x` en `.gxb-dismiss`, `.gxs-icon` (expandida) y `.demo-panel-close` (panel de escenarios), todos con `::before` del mismo diámetro y SVG idéntico. La flecha de la tarjeta cerrada conserva su tamaño. No se cambia la posición del control ni se toca el hero/saludo, barra superior de demostración o archivos oficiales. Comprobación estática del HTML y selectores realizada; **pendiente comprobación visual iPhone y comprobación de la publicación en Pages**. Para evitar caché, abrir la URL `?v=d1002fd` de arriba.


### Reajuste de equilibrio visual de la X · 22/nov/2026

El usuario revisó la versión de 26px / glifo 12px en iPhone y la encontró demasiado pequeña. **Nuevo punto intermedio solicitado y aplicado al laboratorio:** círculo cian **28px** y SVG X **13px** mediante el único par de variables `--gx-close-disc` y `--gx-close-x`. Afecta simultáneamente `.gxb-dismiss` (Lealtad, Referidos, Misiones), `.gxs-icon` (Servicios) y `.demo-panel-close` (panel de pruebas); el área de toque invisible permanece en **44×44px**, y los controles conservan su posición/color. Commit: `233d6068760de69bc259808431452772537f3e90`. No se integró a `ayuda.html` ni se modificó el hero/saludo aprobado. Enlace cache-busted: https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=233d606. Pendiente aprobación visual del usuario.

### Regulador visual de la X en el laboratorio · 22/nov/2026

El usuario pidió no seguir atinando entre medidas de 26/28/30px, sino **poder elegir el tamaño exacto él mismo desde una barra en la vista de prueba**. Implementado en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `ffb9313eff8650ba50b57ff81c53352587441a22`.

- Control discreto y plegable `#gx-close-tuner` fijo abajo en la vista de laboratorio: **barra deslizante de 22 a 36px con pasos de 1px**, valor en tiempo real y botón «Copiar medida». Al ocultarlo, queda un encabezado compacto para volver a mostrarlo. No forma parte de la interfaz productiva.
- El regulador actualiza `--gx-close-disc` y `--gx-close-x` en el `:root`; círculo por defecto **28px**, X por defecto **13px**; la X escala proporcionalmente (`Math.round(size*13/28)`). Por herencia, todas las X abiertas de Lealtad, Referidos, Misiones, Servicios (incluidas tarjetas generadas dinámicamente) y el panel de laboratorio se ajustan **simultáneamente**, sin alterar el área táctil invisible de **44×44px** ni la posición.
- La medida se conserva en el navegador mediante `localStorage` (con `try/catch` para Safari privado) para que el usuario no pierda su selección al recargar. El botón «Copiar medida» genera el texto «GOXION · X: círculo NN px, símbolo MM px»; si Safari no permite escribir al portapapeles, muestra la medida en pantalla.
- El área de pruebas no altera hero, saludo, servicios reales, `ayuda.html`, Admin, Index ni motor. Se añadió espacio inferior en la vista de ejemplo para que el control fijo no impida llegar al contenido final.
- Verificaciones estáticas: sintaxis válida de los **4 scripts inline**, selectores de los tres cierres compartiendo variables globales, un único deslizador, dimensiones 44px táctiles, etiquetas accesibles y equilibrio de etiquetas HTML. **Pendiente:** prueba visual táctil en Safari iPhone y confirmar que GitHub Pages sirva el commit más reciente. No se ha publicado a `ayuda.html`.

**Enlace de la versión:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=ffb9313

**Próximo paso:** pedir al usuario solamente el valor del círculo en px que marca la barra (o que pulse «Copiar medida» y lo pegue aquí). Una vez elegido, **fijar ese número como valor final**, quitar el regulador experimental cuando ya no haga falta y aplicar el mismo control en las demás tarjetas del feed. No dar por validado ningún tamaño sin esa elección.

### Tamaño definitivo de X elegido por el usuario · 22/nov/2026

El usuario utilizó la barra y entregó exactamente: **«GOXION · X: círculo 35 px, símbolo 16 px»**. No aproximar otra medida: este es el criterio confirmado para el feed del laboratorio.

- Aplicado a `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `50d71ec3f6d64cc41ca31f4b1739e6bedd631315`.
- Únicas variables de tamaño compartidas en `:root`: `--gx-close-disc:35px` y `--gx-close-x:16px`, círculo cian `#79e6fc` y X oscura `#071c29`.
- Se aplican por herencia a `.gxb-dismiss` (Lealtad/Referidos/Misiones), `.gxs-icon` abierto (todas las tarjetas de Servicios, incluidas generadas dinámicamente) y `.demo-panel-close` (panel de laboratorio). Las posiciones y áreas táctiles invisibles de **44×44px** permanecen.
- El regulador fue retirado por haber cumplido su función: se retiraron sus HTML/CSS/JS y persistencia de `localStorage`, para que las medidas guardadas previamente no reemplacen las definitivas. Padding inferior restaurado.
- No se modificó el hero, saludo, lógica financiera ni `ayuda.html`, `admin.html` o `index.html` oficiales.
- QA estático: 3 superficies usan el token, los 3 glifos toman el SVG y conservan 44px táctiles, etiquetas de estilo/script balanceadas y sintaxis correcta de los 3 scripts inline restantes. **Falta validación visual física en Safari y confirmación del despliegue Pages.**

**URL anticaché:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=50d71ec

Preservar 35/16px para nuevas tarjetas del laboratorio hasta petición explícita de cambio.

## Pruebas de situaciones reales en Servicios · 22/nov/2026

El usuario indicó que le gustó la UI contextual de Servicios pero no encontraba cómo probar avisos de cancelación, novedades de acceso, PIN y contraseña actualizada. El selector previo existía pero solo dentro de «Probar estados · Laboratorio», al final del feed, lejos de las tarjetas. **Se conservó íntegro el diseño principal de Servicios y se acercaron los controles de simulación a la sección.**

- Laboratorio: `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `8b85d9ff9ea81cf5aaea0d81cb6962b78311878c`; enlace anticaché: https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=8b85d9f.
- **Nuevo enlace discreto «Probar situaciones»** justo debajo de las tarjetas de `Tus servicios`. Abre un selector local de estados sin añadir otra tarjeta permanente a la UI; al elegir un escenario se actualizan las tarjetas, se abre automáticamente el servicio pertinente y se desplaza a él. Se conserva sincronizado el selector completo del panel inferior «Probar estados · Laboratorio».
- Estados de cancelación según la fuente oficial `assets/js/ayuda/01e-client-dashboard.js`: `solicitada` («En revisión»), `aprobada` (todavía visible y pendiente de baja), `rechazada` (servicio activo, opción de nueva solicitud) y ejemplo de **baja efectiva** (solo Netflix sale de la lista). No representar autorización como baja efectiva ni retirar servicios antes de tiempo.
- También se puede probar «Nueva contraseña» (solo aviso; en oficial se revela con el PIN de GOXION una sola vez), «PIN de perfil actualizado» (dato **ficticio** `6951`, distinto del PIN de GOXION; se revela mediante «Mostrar»), invitación pendiente, incidencia temporal, 0/1/2/4 servicios. El botón «Mostrar PIN» de demostración usa el mismo control de los accesos y se vuelve a ocultar al cerrar el servicio.
- El laboratorio **no se conecta** a pagos, contraseñas ni solicitudes reales. La notificación automática por PIN de perfil actualizado es una idea visual en prueba, **no una función oficial confirmada**; la implementación productiva deberá consumir solo cambios reales de `accesos`/`novedades` y evitar inventar un aviso si no existe una señal confiable del backend. La contraseña nueva sigue el contrato oficial `credencial_pendiente` con verificación de PIN de Mi Espacio y una sola consulta.
- La X confirmada por usuario permanece intacta: disco **35px** y símbolo **16px** en todas las tarjetas. No se modificó `ayuda.html`, Admin, Index ni backend.
- QA: sintaxis JS correcta; 12 escenarios evaluados en prueba aislada del generador de datos, incluyendo aprobada visible, baja efectiva ausente y nuevo PIN en muestra; comprobación de selectores y controles únicos, estilos/scripts balanceados. Pendiente prueba táctil y visual Safari físico y validación de publicación Pages.

**Cómo probar:** desplázate hasta Tus servicios → pulsa «Probar situaciones» debajo de la lista → elige «Cancelación solicitada», «aprobada», «no autorizada», «Baja efectiva», «PIN de perfil actualizado» o «Nueva contraseña». Comprueba cómo cambia Netflix (o YouTube para la invitación). Todos los datos son de muestra.

## Colores semánticos de Servicios y adaptación conectada en rama · 22/nov/2026

El usuario expresó conformidad con la jerarquía visual del área de Servicios y pidió consolidar estados semánticos (verde correcto, amarillo/ámbar pendiente, naranja precaución, rojo alerta), prioridad de avisos y conservación de **todas las conexiones de la versión oficial** antes de avanzar a otros módulos.

- **Aplicado al laboratorio en `main`:** commit `24c0eca8971e733270a06d35fa0cffa27163401e` en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`. Estados normal verde, actualización de acceso/PIN/cancelación en revisión ámbar, cancelación aprobada pendiente de efectividad y servicio temporalmente inactivo naranja, cancelación no autorizada rojo. Color limitado a punto/contexto y microsuperficie interna. No tintar tarjeta completa. Cierre de X 35px/16px intacto.
- Se agregó escenario de laboratorio `multi-notice`: cancelación en revisión como asunto principal, contraseña disponible como información secundaria **dentro del panel**, sin generar dos tarjetas ni acciones de backend. Selector accesible desde «Probar situaciones» bajo Servicios y desde pruebas generales.
- **Adaptación conectada propuesta, NO publicada:** PR borrador [#231](https://github.com/henrygonzalezestrada-cyber/goxion/pull/231), rama `feature/mi-espacio-servicios-conectados-20261122`. Modifica exclusivamente `assets/js/ayuda/01e-client-dashboard.js` y `assets/css/ayuda.css`, más su documento contractual. No toca `ayuda.html`, hero, saludo, finanzas, Admin, Index.
- En dicha rama, `data-gx-priority-tone` procede de `novedades`, `cancelacion`, `credencial_pendiente` y alertas que la versión oficial ya usa. Se preservaron los 9 handlers y todas las llamadas reales de cancelación, credencial, PIN, soporte, copia, novedades e invitaciones. Se respetó orden `combinedNotices` existente; el tono es presentación, no una regla de negocio nueva.
- QA estático: 3 scripts inline del laboratorio y JS del dashboard oficial sintácticamente válidos; handlers y endpoints oficiales sin nuevos duplicados. Escenarios de semántica comprobados por tabla de casos. **No es una prueba autenticada ni Safari real**. PR #231 queda en borrador: **no fusionar ni anunciar producción completada sin QA funcional con cuentas reales/de prueba y aprobación de la vista final**.

**Laboratorio para revisar:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=24c0eca

**Próximo paso:** validar cromática/jerarquía con el usuario en iPhone; resolver y probar en la rama conectada controles de contraseñas de una sola vista, PIN protegido, notificaciones simultáneas, cancelaciones solicitadas/aprobadas/rechazadas y baja efectiva antes de publicar. Una vez resuelto, continuar con el siguiente módulo del feed sin alterar hero y saludo aprobados.

## Corrección obligatoria de densidad y decoración · 22/nov/2026

**Queja y criterio del usuario:** tras añadir los colores semánticos apareció una línea de color bajo el logo al expandir las tarjetas de Servicios, además de mucho texto duplicado en los contextos. Esto **es una regresión**, no un detalle 'premium'. El usuario pide criterio profesional y continuidad de las investigaciones/skills, no justificaciones ni asentir automáticamente.

### Criterios específicos de Servicios — NO extensibles a otros módulos del feed

1. **Solo en el componente Servicios de esta propuesta:** no reintroducir la línea decorativa (cian, de estado o neutra) bajo el logo/encabezado; tampoco sumar halos, marcos o recuadros que repitan la misma información. Esto no prohíbe las barras de progreso, separadores funcionales, animaciones, emojis ni gradientes de Lealtad, Referidos, Misiones, Ahorro o Catálogo.
2. **En Servicios**, el verde/ámbar/naranja/rojo identifica el estado de un vistazo mediante punto y texto breve; no colorear toda esa tarjeta. **No sustituye** las paletas de identidad, contraste de títulos, métricas, checkboxes o gradientes de progreso de los otros bloques.
3. **Primera mirada de Servicios:** logo + plataforma + estado + control de expandir/cerrar. **Detalle abierto:** una microsuperficie neutra solo si hay una instrucción o consecuencia real. Los 30–65 caracteres fueron un **objetivo de copy para avisos simulados**, no un límite global ni legal; información sensible o contractual debe permanecer accesible bajo demanda.
4. **Información secundaria bajo demanda** (`details/summary`), no otra caja de estado visible por defecto. Mantener PIN y contraseñas en sus flujos protegidos, no duplicar la información entre los bloques.
5. **Material ya aprobado:** conservar el ADN de cristal neutro, los controles translúcidos sin brillos artificiales, las proporciones/márgenes y los cierres del círculo cian **35px** con glifo **16px** y área de toque de **44px**. El hero y saludo congelados no se tocan. No agregar cambios cosméticos no solicitados.
6. Toda futura incorporación de UI en Servicios debe pasar esta pregunta: **¿es información o una acción que el cliente necesita?** Si es solo decoración, se omite. Evaluar también la densidad de texto en iPhone antes de dar por finalizado.

### Corrección técnica aplicada

- Laboratorio `preview/experiencia-mi-espacio-inteligente/morph-v2.html` en commits `13b5cd4727449af5f063694bf713a5351f57bd1c` y `22cf678200c163baf28d11d5b94434b58a6eceb2`.
- Se eliminó íntegramente `.gxs-line` (el elemento del DOM, su estilo base y el gradiente semántico), **no se dejó una variante gris sustituta**. Se limpiaron los tokens de tintado ya sin uso.
- Los estados de cancelación, credenciales, invitación e incidencia siguen funcionando; sus avisos dentro de la tarjeta se redujeron a un solo texto útil, en microsuperficie **neutra al 4.5%**. Segunda novedad queda tras `<details>` con etiqueta «1 novedad más», sin otra caja visible por defecto.
- La rama de preparación de integración oficial `feature/mi-espacio-servicios-conectados-20261122` / PR borrador `#231` recibió también corrección para ocultar la línea `.gx-service-divider` dentro de `#view-dashboard`, y dejar sin líneas los avisos secundarios. **No fusionar ese PR** hasta validar el laboratorio y funcionalidad real.
- Comprobación estática: todos los 3 scripts inline válidos; 11 escenarios ejecutados con el generador ficticio, avisos de 37–57 caracteres y novedad secundaria de 46 caracteres; ausencia total de la clase `gxs-line`; X 35/16 intacta. **No se verificó Safari visual/táctil** ni se modificó la producción oficial en `main`.

**Laboratorio vigente (anticaché):** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=2b2576c

**Seguimiento:** aplicar el veto del separador decorativo y del copy redundante **solo a próximas iteraciones de Servicios**. Para beneficios, Ahorro, Hero y Catálogo aplicar sus propios contratos, no extrapolar el veto. Fuente canónica: `docs/GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md`.


**Pulido posterior de esta misma corrección:** commit `2b2576c683d2d8b0a534723f5f0eeb3469646ea2`: se retiró además el separador innecesario de «Más opciones», y «1 novedad más» conserva un área táctil de al menos 44px. El diseño permanece sin líneas decorativas ni texto duplicado. Enlace actualizado: https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=2b2576c.

## Auditoría de alcance de las reglas — 22/nov/2026

Tras una consulta explícita del usuario se revisaron la auditoría previa de Lealtad/Referidos/Misiones, los acuerdos de ahorro y el código vigente. **Veredicto:** la corrección visual fue apropiada en Servicios; el lenguaje «prohibido» y «regla no negociable» era demasiado amplio y podía entenderse erróneamente como una prohibición global de elementos visuales con función.

El contrato **[por componente](GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md)** separa lo compartido (cristal neutro, ritmo, accesibilidad y X 35/16) de las identidades funcionales: Lealtad/Referidos/Misiones conservan barras, porcentajes, emojis, colores de título, morph, animación de checkbox y separadores de tareas; Ahorro conserva profundidad, logos flotantes y contador; Servicios conserva estado semántico breve sin línea decorativa. **No tocar ni aplanar los módulos protegidos para perseguir uniformidad.**

Esta auditoría es de contrato, selectores y código actual: **no fusiona PR #231, no cambia el laboratorio visual ni altera `ayuda.html` oficial**. Si hay una incompatibilidad futura, se debe inspeccionar el selector real y comparar con el último commit aprobado antes de implementar.


## Auditoría de utilidad «Próximos movimientos» — recomendación de DESCARTE (22/nov/2026)

> **NOTA HISTÓRICA:** se conserva esta auditoría como justificación para no añadir el bloque redundante. La recomendación de limitar la sección final a pagos **fue revisada y reemplazada** por la nueva decisión del usuario: Historial de movimientos con fuentes reales verificadas, tal como se indica al principio de este documento.

**Estado:** análisis realizado por solicitud del usuario, **recomendación pendiente de su decisión**; no se ha añadido el bloque al laboratorio ni a producción. Reemplaza como recomendación práctica la idea prospectiva anterior que sigue más abajo solo por trazabilidad histórica.

**Criterio de utilidad:** una tarjeta nueva debe aportar un dato verificable o una acción legítima que el usuario no pueda obtener ya sin esfuerzo comparable. Se contrastó contra `ayuda.html`, `assets/js/ayuda/01e-client-dashboard.js`, `assets/js/ayuda/02-client-supabase-layer.js`, `assets/js/ayuda/04-client-notifications-realtime.js` y el hero aprobado.

| Evento previsto en el bloque | Módulo que lo cubre | Dictamen |
| --- | --- | --- |
| Próximo corte/pago y vencimiento | Hero dinámico + Estado de cuenta (incluidas revisiones) | Duplicado |
| Pago/comprobante en revisión o incompleto | Estado de cuenta / aviso de revisión | Duplicado |
| Cancelación solicitada, aprobada y pendiente de baja | Servicios, card por plataforma | Duplicado |
| Nueva contraseña, PIN, invitación o incidencias | Servicios / notificaciones existentes | Duplicado |
| Progreso de misiones, lealtad y referidos | Tres fichas de beneficios | Duplicado |

**Veredicto:** no hay valor suficiente para una sección de «Próximos movimientos» o una mini cronología adicional; **se recomienda omitirla** y comenzar el siguiente y último rediseño del feed: **Historial de pagos**, sin llenar un espacio por composición. No construir otra tarjeta de estado, motor de prioridad ni widget redundante.

**Diferencia que SÍ justifica Historial:** la tarjeta principal y los servicios muestran **el presente**; el historial permite consultar **el registro confirmado de lo que ocurrió** (período, fecha de pago, monto, estatus, relación con racha de lealtad). La capa cliente ya recibe `historial_pagos` con `id`, `fecha` (período), `fecha_pago`, `monto`, `estado`, `puntual`, `lealtad_efecto` y `racha_resultado` vía `mi-espacio`. `01e-client-dashboard.js` ya tiene `gxPaymentHistoryMeta`, hasta 3 filas visibles y opción de expandir para más. Mantener esas fuentes; no inventar movimientos no bancarios ni acreditaciones adicionales.

**Posible necesidad distinta, solo backlog y sin módulo nuevo por ahora:** el cliente podría querer consultar constancias históricas de bajas efectivas u otros cambios de servicios una vez que dejan de figurar como activos. Se detectó que el fetch cliente recibe `data.cancelaciones` pero las tarjetas se construyen desde `data.servicios`; esto **no prueba** que exista una bitácora completa y segura de eventos ni un modelo de constancia. Requiere verificar retención, permisos y fechas reales antes de prometerla. No mezclarla con pagos para justificar el rótulo «Historial de movimientos».

**Precaución de nomenclatura:** mantener el título **Historial de pagos** por ahora, porque el dato real expuesto es una lista de pagos. Llamarlo «Historial de movimientos» exigiría fuentes confiables adicionales y trazabilidad (cancelaciones, altas, cambios, etc.), que todavía no están demostradas. Evitar reutilizar la frase legacy «Tus próximos movimientos y constancia aparecerán aquí» para una lista que aún solo contiene pagos.

**Siguiente paso visual si usuario aprueba:** rediseñar el historial dentro del mismo `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, con filas/agrupaciones compactas y jerarquía fecha/importe/estado, distinción real del efecto de lealtad y detalle progresivo bajo demanda. Conservar hero, beneficios, ahorro y servicios. No cambiar `ayuda.html` ni reglas de pagos sin pruebas.

---
## Siguiente propuesta del feed: Próximos movimientos — antes de Historial de pagos (22/nov/2026)

**Origen:** recuperación de la propuesta anterior hecha al usuario, no una decisión nueva ni aprobación explícita. Después de Lealtad, Referidos, Misiones, Ahorro y Tus servicios se había sugerido una sección opcional llamada **«Próximos movimientos»**, ubicada **antes del Historial de pagos**; este último se reserva como **última sección por adaptar** al nuevo lenguaje del feed.

- Objetivo: mini línea de tiempo de **eventos confirmados y próximos que requieran contexto o acción**: próximo pago, solicitud de cancelación en curso, entrega de un acceso o actualización importante de servicio. Si no hay ningún evento relevante, no mostrar este módulo.
- **No crear una tarjeta adicional de cristal permanente** ni agregar texto de relleno: resumen corto, prioridad clara, acceso al detalle solo si existe; respetar la jerarquía visual por componente y el material neutro.
- No duplicar la tarjeta principal de estado, el historial de pagos, la gestión de cancelaciones/contraseñas dentro de Servicios, notificaciones globales, ni el módulo existente **Novedades V4** asociado con Términos y Condiciones. «Próximos movimientos» sería un acceso contextual y resumido a eventos reales, no una segunda fuente de verdad.
- **Estado real al 22/nov/2026:** idea arquitectónica propuesta y **todavía no implementada en el laboratorio ni aprobada visualmente**. La página oficial `ayuda.html` coloca actualmente `Tus servicios` seguido directamente de `Historial de pagos`; el laboratorio después de Servicios contiene muestras de Catálogo, no «Próximos movimientos». No declarar que está conectado ni publicar casos ficticios como movimientos del cliente.
- Próxima iteración autorizable: diseño de demostración únicamente en `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, preservando Hero/saludo y tarjetas aprobadas. Antes de una integración conectada, verificar fuentes/orden/fechas de eventos reales y evitar acciones duplicadas. **Historial de pagos permanece para el final.**
