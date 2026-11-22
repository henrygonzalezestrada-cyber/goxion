# GOXION · Navegación superior adaptable + perfil — investigación y laboratorio V3

**Fecha:** 22/nov/2026. **Estado actual:** **V3 IMPLEMENTADA EN LABORATORIO para revisión**, aún **NO aprobada ni publicada en `ayuda.html`**. Las secciones 1–9 contienen el análisis y las V1–V2 históricas; **la sección 10 recoge el comportamiento vigente V3 y prevalece cuando exista contradicción**. Sin cambios en CSS/JS oficial, Edge ni datos de clientes.

## 1. Brief del usuario (no convertir en instrucciones contradictorias)

Reimaginar la cápsula de navegación **superior** de GOXION, sin convertirla en barra inferior genérica ni perder la personalidad de los controles actuales. Mantener los destinos y funciones originales (Mi Espacio/Inicio, Catálogo, Soporte). Al avanzar contenido con el dedo hacia arriba, la cápsula se **compacta** e integra visualmente al encabezado; al desplazar de regreso el dedo hacia abajo, **se expande** sin tener que volver al principio. Notificaciones permanecen y funcionan; sustituir «Salir» como control principal visible por **avatar circular personalizado** con menú «Mi perfil» y «Salir». Evaluar logo completo vs símbolo aislado a la izquierda y emojis vs iconos. El usuario pide criterio crítico y estudio de Dribbble/otras guías, **no copia directa**.

## 2. Auditoría de código realizada (22/nov/2026)

- **Oficial `ayuda.html`:** `header.app-header` con `img.app-logo` (`logo2.PNG`), `#header-action-btn.gx-auth-root` (crece/se transforma en formulario de login), `#goxion-main-nav.tab-container` con botones `#btn-tab-inicio` `#btn-tab-catalogo` `#btn-tab-soporte`; inicialmente 🏠 Inicio, 🛒 Catálogo, 🛠️ Soporte, y el primer destino se vuelve 👤 Mi Espacio al autenticar.
- **Identidad preexistente valiosa:** CSS de `assets/css/ayuda.css` declara «NAVEGACIÓN GOXION: CÁPSULA Y CÍRCULOS MORPHING 2.1»; círculo inactivo 60px (54px móvil), elemento activo crece y **revela el texto**. Hay borde activo cian bastante intenso y glow; ese exceso no debe trasladarse automáticamente al nuevo cristal.
- **Campana real**: `assets/js/ayuda/04-client-notifications-realtime.js` crea dinámicamente `#gx-client-notif-launch` y mueve el control `#header-action-btn` dentro de `.gx-header-actions`. El badge, conexión de sesión, animación y sheet de notificaciones son reales. **Reusar exactamente el mismo nodo y su manejador; nunca duplicar una campana decorativa.**
- **Sesión real:** `assets/js/ayuda/01d-experience-session.js`, `assets/js/ayuda/02-client-supabase-layer.js`, `assets/js/ayuda/07-production-interactions-js.js`. El texto «Salir» se coloca tras comprobar sesión; `gxAuthRootClick` mantiene la animación del login/recuperación. Cerrar sesión **debe reutilizar `cerrarSesion()`** y el evento `goxion:client-logout`, no limpiar tokens manualmente desde el nuevo menú.
- **Barra ya fija en desplazamiento:** `#sticky-client-bar`, mostrada por `01d-experience-session.js` en Dashboard tras `window.scrollY > 120`, con el nombre del cliente. Debe integrarse o retirarse cuando exista el nuevo dock; de lo contrario se superpondrá con el encabezado/nav compacto.
- **Switch de tres vistas:** `switchTab(tabName)` en `07-production-interactions-js.js` controla `inicio/catalogo/soporte` y el contenido autenticado. No duplicar ese controlador, ni dos barras equivalentes accesibles.
- **Laboratorio `preview/experiencia-mi-espacio-inteligente/morph-v2.html`:** `.header` con logo completo, **campana y sesión ficticias**, y `.nav` de tres botones actualmente **SVG lineales**, no emojis. La `.nav` usa `rgba(12,14,26,.64)`, blur 16px y caja de 75px; aún no está en el cristal neutro común de los componentes del nuevo feed. Tampoco está conectada a `switchTab`, por lo que no debe ser clonada en producción.
- **Foto del cliente:** no se halló un campo o flujo cliente oficial `avatar_url`, `foto_perfil` o `profile_photo` en la búsqueda del repositorio. Esto es **ausencia de evidencia de integración**, no certificación de que jamás se haya previsto una foto. La carga persistente sería una **función nueva de cuenta**, no solo un cambio de CSS.

## 3. Investigación externa: patrones, no diseños para copiar

| Referencia | Qué aporta | Qué NO se debe copiar |
| --- | --- | --- |
| Apple WWDC25, [Build a UIKit app with the new design](https://developer.apple.com/videos/play/wwdc2025/284/), y [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Controles en una capa de navegación translúcida; reducción de barra al desplazarse y reexpansión al regresar; diferenciación entre contenido y controles | Convertir GOXION en una tab bar inferior estándar o depender de una API nativa que la web no tiene |
| [Apple Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) y [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Relevancia, agrupación, consistencia y safe areas; que el control se descubra y mantenga orientación | Cargar la barra de acciones y microetiquetas de poco valor |
| NN/g: [Hamburger Menus and Hidden Navigation Hurt UX Metrics](https://www.nngroup.com/articles/hamburger-menus/) y [Content-to-Chrome Ratio](https://www.nngroup.com/articles/content-chrome-ratio/) | Navegación oculta cuesta descubribilidad; la UI permanente debe usar espacio con mesura | Reducir tanto que solo quede un botón/menú secreto |
| [Dribbble · Liquid glass navigation](https://dribbble.com/shots/26155046-Liquid-glass-navigation), [Minimalist Floating Navbar](https://dribbble.com/shots/27119936-Minimalist-Floating-Navbar-UI), [Glassmorphism Navbar explorations](https://dribbble.com/search/glassmorphism-navbar) | Cápsulas discretas, cristal en contexto, iconografía/labels definidos, transición de geometría | Reflejos blancos intensos, halos neón, vidrio excesivo, cápsulas superpuestas o demasiado anchas; los shots no validan usabilidad |
| MDN [scroll](https://developer.mozilla.org/es/docs/Web/API/Document/scroll_event), [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) | Un listener barato y actualización coordinada; limitar reflows en Safari | Animar `top` o recalcular layouts continuamente por cada pixel desplazado |
| OWASP [File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) | Tipo y contenido validado, límites, recodificación de imagen, metadatos retirados y permisos/almacenamiento seguro | Guardar `base64` o fotos sin validación en localStorage / registros públicos |

## 4. Dirección propuesta: UNA cápsula, DOS estados — «GOXION Adaptive Top Capsule»

### Estado A: expandido / orientación

**En la parte superior del feed**, encabezado con logo GOXION **completo** a la izquierda y **campana real + avatar** a la derecha; debajo, una cápsula de tres destinos. Conservar el **morph de ítem activo** y su etiqueta «Mi Espacio», «Catálogo» o «Soporte», con iconos/emoji de color moderado. No llenar tres botones con etiquetas largas ni redibujar el logo; mantener el cristal neutro `.gxc-surface` aprox. `rgba(8,8,12,.371)`, blur 11.75px como **base de comparación**, ajustable tras pruebas reales y sin copiar degradados del dashboard anterior.

**Sobre emojis:** la navegación oficial sí los contiene y dan personalidad. Para el primer prototipo probar **🏠/👤, 🛒, 🛠️** (o equivalentes si hay una mejor asociación semántica), con escala cuidada, sin glow neon y sin adornos adicionales. El laboratorio actual sustituyó eso por SVG lineales y perdió algo de la firma visual. Los iconos vectoriales no se descartan por principio; compararlos en iPhone antes de aprobar. La identidad del estado activo depende también de etiqueta y posición, no únicamente de color.

### Estado B: compacto / continuidad

**Al deslizar el dedo hacia arriba y avanzar por el contenido** (no al hacer un gesto ambiguo «scroll arriba»): la misma cápsula se reduce y se acopla al **encabezado superior fijo**, sin convertirse en barra inferior. Nav compacto: **tres destinos tocables de 44px** conservan identidad y estado seleccionado, usualmente solo iconos/emoji. El logo se reduce al **símbolo oficial individual** donde haya anchura; campana y avatar siguen disponibles. Si el espacio horizontal es crítico (280–320px), el diseño debe reducir elementos secundarios del encabezado, o reacomodar discretamente la marca, **no** comprimir targets por debajo de 44px ni esconder Catálogo/Soporte en un hamburguesa.

**Al deslizar hacia abajo para volver a contenido anterior:** la cápsula recupera formato con etiqueta del destino activo **sin obligar a volver a scrollY=0**. No forzar desplegar toda la altura original del header al medio de la página; preferir un dock superior que se amplía desde su propio eje. Al regresar al inicio, restablecer por completo el encabezado y su cápsula original.

**Diseño de movimiento:** transición de posición/tamaño/contraste perceptible pero breve; potencial 240–340 ms a ensayar (NO compromiso aprobado). Activación después de ~120–160px y desplazamiento acumulado razonable, con **histéresis 20–32px o superior según pruebas**: evita parpadeos si el usuario se detiene, hace pequeños ajustes, rebota Safari o cambia de pestaña. `prefers-reduced-motion` elimina el morph manteniendo ambos estados accesibles. Evitar dos navs distintas: un estado lógico / un foco / una fuente de `switchTab`.

### Variante que **NO** recomendamos

Reubicar toda la cápsula expandida justo **sobre** el texto en el encabezado, dejando siempre logo completo, campana, avatar y tres etiquetas; en 320–390px causaría solapamiento o targets diminutos. Tampoco colocar dos barras simultáneas (header + sticky-client-bar + navegación) ni ocultar tres destinos detrás de una hamburguesa. Si el prototipo compacto no cabe a 280px, mejor revisar el reflujo en dos planos dentro de la parte superior que traicionar la usabilidad.

## 5. Avatar de cliente y menú «Mi perfil / Salir»

- **Sesión confirmada:** reemplazar el pill visible «Salir» por **avatar circular**, con foto si existe o iniciales monograma neutro si no. El botón es `<button>` semántico 44×44px; `aria-label="Abrir menú de perfil"`; notificaciones conservan independencia y badge.
- **Pulsación:** menú pequeño y limpio «Mi perfil» (ver foto, cambiar, retirar, y solo datos autorizados) y «Salir» (llama al controlador oficial `cerrarSesion`). Nada de duplicar Estado de cuenta o Configuraciones que no existen.
- **Invitado, sesión restaurándose, sesión expirada:** conservar entrada/recuperación de acceso existente. La foto **no** reemplaza el login; no mostrar perfil real antes de validar token. El auth root actual hace un morph de login que debe conservarse en su ruta de invitado.
- **Nueva función de almacenamiento:** no se ha verificado una API oficial de avatar. Antes de conectar fotografía a producción, definir bucket/endpoint privado con autorización por identidad, tamaño y formato restringidos, validación de contenido, reencodificación a imagen pequeña, eliminación de metadatos EXIF, recorte circular local y opción de quitar foto. No persistir en localStorage ni exponer la foto de un cliente a otro. **En laboratorio solo simular selección/preview local**, dejando claro que no se guarda.
- **Logo izquierdo:** conservar el wordmark en cabecera expandida para reconocimiento, **reducir a marca individual** en compacto solo cuando el ancho lo permita; no inventar iniciales «AG», otro logo ni dejar nombre largo que compita con tres destinos + campana + avatar.

## 6. Funciones que no se pueden romper

1. Mantener **una sola navegación** DOM y los botones `#btn-tab-inicio`, `#btn-tab-catalogo`, `#btn-tab-soporte`, `switchTab`; que el estado visible no se pierda por desplazamiento o login/logout.
2. No clonar `#gx-client-notif-launch`, `#gx-client-notif-badge` ni su sheet; el JS actual reparenta `#header-action-btn` en `.gx-header-actions`. Reconciliar header antes de añadir avatar.
3. Sustituir o coordinar la vieja `#sticky-client-bar` que aparece tras 120px, eliminando duplicación visual y lectores de pantalla. No hacer una tercera barra.
4. Mantener login/logout, token, expiración de sesión, PIN y accesos en sus propietarios oficiales. No cambiar cliente, pagos, calendarios B2, estado de cuenta ni notificaciones mientras se prueba el nav.
5. No alterar ni rehacer hero/saludo congelados o tarjetas de beneficios, ahorro, servicios e historial; nav/encabezado son un trabajo local con su propio contrato.
6. Mantener safe areas Safari, rebote, cambio de orientación, teclado, overlays de login/notificaciones, uso con lector de pantalla, targets 44px; no bloquear scroll ni disparar cambios de tamaño sobre un modal abierto.

## 7. Plan original de prototipo y validación (histórico, previo a V1)

**Todavía no autorizado como implementación; requiere evaluación visual en laboratorio.**

1. Crear variante experimental del **mismo** `morph-v2.html` o rama de laboratorio que permita comparar **expandido / compacto** con los componentes del feed tal como están; no enviar cambios a `ayuda.html`.
2. Ensayar dos composiciones de estado compacto: (i) logo símbolo + 3 destinos + campana + avatar en una línea cuando quepa, (ii) reflujo adaptable de marca sin perder controles a 280–320px. Evitar un diseño que solo funcione a 390px.
3. Probar comportamiento con gesto/touch (scroll largo, scroll corto, rebote iPhone, al tocar una tarjeta, abrir teclado, filtros del Historial, notificaciones, perfil, cambio entre Inicio/Catálogo/Soporte, siguiente sesión).
4. Probar **modo reducido** de movimiento, VoiceOver y zoom; estabilidad del foco, labels de destino, badge y logout.
5. En integración oficial, auditar `#sticky-client-bar`, `04-client-notifications-realtime.js`, login morph y `switchTab`. Nada de reemplazar con handlers falsos.
6. Documentar lo que apruebe el usuario en este expediente y en [el documento maestro de integración](GOXION_MI_ESPACIO_INTEGRACION_MAESTRA_2026-11-22.md); el estado de esta propuesta sigue **NO APROBADA**.

**Dictamen:** conceptualmente **sí es compatible** con el nuevo feed, pero **no realizar un simple shrink proporcional de todo el header** ni superponer otra barra. La diferencia de GOXION debe estar en la cápsula que cambia de geometría sin perder los tres destinos, la identidad cromática controlada y la conexión intacta, no en acumular capas de vidrio.

## 10. Rediseño V3 tras video iPhone · UNA cápsula y un solo movimiento (22/nov/2026)

**El usuario rechazó V2**, porque la cápsula desaparecía del flujo y otra presentación aparecía desde arriba. El video `ScreenRecording_11-22-2026 17-04-33_1.mp4` (~18.9 s) muestra exactamente esa discontinuidad, y cuando la animación quedaba a medias no terminaba asentándose. La indicación actual: la **misma cápsula** debe desplazarse de su ubicación debajo del encabezado hacia la **esquina superior izquierda donde estaba el logo**, encogerse allí, permanecer navegable con tres destinos, ampliarse cuando la persona desplaza de vuelta y terminar el ciclo cuando el dedo se detenga. No sacrificar márgenes ni dejar el saludo demasiado separado de la navegación.

### Fuente real del patrón (Index oficial, no suposición)

- Se inspeccionó `assets/js/index/05-index-header-morph.js` en `main`, no solo referencias de Dribbble. Allí el valor de morph `value` sigue a `goal` con amortiguación temporal `1-exp(-dt/tau)`, `TAU=64`, `SETTLE_TAU=26`, y la geometría se mueve con transform; al quedar a medias el código usa asentamiento y tiene guardas para los resize de Safari. El Index tiene además snap del **scroll** dentro del hero financiero; **esa parte no se copia** en Mi Espacio porque movería inesperadamente la lectura del feed.
- Principio complementario: FLIP y uso de rectángulos de layout, transformaciones y `requestAnimationFrame`; guías externas [Josh Comeau, FLIP](https://www.joshwcomeau.com/react/animating-the-unanimatable/) y [MDN, Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API). V3 utiliza una trayectoria continua calculada y una interpolación amortiguada, no el patrón de ocultar un control y revelar otro.

### Implementación V3 en `main` — solo laboratorio

- **HTML** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit **`ab31bd8e3e16cbb17756114e4f9dabe95431018c`**. Se añadió `#gxn-nav-slot` para reservar el hueco original y `#gxn-nav-target` como referencia fija para la esquina. El elemento interactivo **continúa siendo exactamente el mismo** `#gxn-nav` con las mismas tres opciones. Se quitaron los atributos del dock V2, que ya no existen en el modelo nuevo.
- **CSS** `adaptive-top-nav.css`, commit **`26eb0039433d60bcd920cd4892037d175e97bcab`**. El nav se presenta con `position:fixed` desde el principio pero en las coordenadas originales medidas del slot; JavaScript transforma posición/anchura/altura de forma continua. No hay cambios `position:absolute → position:fixed`, dos barras, opacidades de intercambio, ni marco oscuro alrededor de la cabecera. Se preservan círculo exacto 56px en inicial (54px estrecho), 46px compacto (44px en <=320px), aspecto 1:1 y cápsula con cristal `rgba(8,8,12,.371)` / blur 11.75px. La tarjeta de navegación se reduce a **174px** habituales, **164px** en anchos <=375px y **158px** en <=320px; al desplazarse hacia abajo el dock se amplía hasta **246px** cuando cabe y reaparece el texto del elemento activo.
- **JS** `adaptive-top-nav.js`, commit **`800e8f2136a74fba88d13ec132a69745040ccad6`**. Motor de UN progreso `dock` que combina origen y destino en cada frame; un segundo valor `spread` **modula la amplitud del mismo elemento**, nunca crea una segunda navegación. Listener `scroll` pasivo + rAF y geometría medida solo al montar/resize; `RANGE=158px`, `TAU=62ms`, `SETTLE_TAU=29ms`, `SNAP_IDLE_MS=175ms`. Tras el idle se fuerza el objetivo del componente a 0 o 1 para completar el recorrido. `prefers-reduced-motion` elimina el asentamiento animado, pero mantiene ambos destinos accesibles.
- **Logo y espaciado:** al acercarse la cápsula al lado izquierdo, el logo se atenúa con el mismo progreso y deja esa zona a la navegación. La campana y el avatar de Goxy siguen en la cabecera normal, sin un segundo encabezado fijo. El margen después de `#gxn-stage` pasó de **39px a 15px**, para no generar un hueco visual innecesario antes del saludo (sin alterar el diseño interno del Hero).
- **Prueba de navegador** `check-adaptive-nav.mjs`, commit `437ca744bf8aa34edf60b4e326fb17b1d9fe9629`, actualizada para validar a 280/320/360/390/430/768px que: misma cápsula, mismo slot inicial, idle snap sin mover scroll, regreso exacto, círculo 1:1, transparencia, ausencia de duplicado y accesibilidad de Goxy/menús. **Suite Chromium/WebKit incorporada, NO ejecutada en navegador real en esta sesión**.

### Validación realmente realizada

- Inspección directa del video y del archivo de Index oficial. Código JS sintácticamente válido, CSS balanceado, HTML con 1 nav y tres destinos, sin IDs duplicados.
- **12 comprobaciones dinámicas con DOM/scroll simulado pasaron**: slot inicial, anchura inicial, scroll a mitad con asentamiento a compacto, logo coordinado, página sin desplazamiento forzado, reversa con expansión de dock, misma instancia DOM, restauración exacta, geometría a 280px, cápsula de 158px e ítems de 44px.
- Se conservaron Goxy, menú de perfil, campana ilustrativa, vista de Catálogo/Soporte y componentes del feed. No se tocó `ayuda.html`, auth, B2, backend ni APIs.
- **QA PENDIENTE:** ejecución de Playwright real en Chromium/WebKit y evaluación visual/gestual de esta V3 exacta en iPhone Safari, incluidas interrupciones rápidas, barra del navegador dinámica, orientación y zoom. Las comprobaciones simuladas no prueban 60 FPS ni eliminan todos los riesgos de trabones.

**Enlace V3 anticaché:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=ab31bd8

**Estado de aprobación:** V3 disponible para revisión, no aprobada todavía. **No regresar al patrón de header opaco + nav separada ni a las animaciones de dos etapas.**

---

## 9. Corrección V2 tras video Safari — cápsula flotante independiente (22/nov/2026)

**Fuente:** video aportado por el usuario `ScreenRecording_11-22-2026 16-39-40_1.mp4` (25,6 s, grabación iPhone). Revisados fotogramas a 2, 7, 13 y 19 s. Se observó que la V1 agrupaba logo individual, tres destinos, campana y avatar dentro de **una sola franja oscura, demasiado opaca y ancha** al deslizar. En el estado inicial, las formas de círculos/cápsula perdían proporción: el CSS V1 permitía `flex-shrink` en ítems inactivos y usaba radios de 25px con dimensiones cambiantes. El usuario pidió conservar la cápsula de la oficial y sus transiciones, no abandonar el concepto.

**Decisión visual de V2:** al entrar en modo dock, **NO existe una superficie contenedora que envuelva todo**. El icono GOXION individual, la cápsula y campana/avatar son tres agrupaciones *visualmente independientes*; la **cápsula central es mucho más pequeña** (~182×60px a anchura normal; hasta 160px en 280–320px) y mantiene el cristal neutro translúcido aprobado (`rgba(8,8,12,.371)`, `blur(11.75px)`) con un borde sutil. El logo es el archivo individual oficial y campana/Goxy mantienen sus propios círculos separados. Por debajo de 376px se esconde únicamente el logo del dock para no solapar tres destinos ni reducir áreas táctiles. No hay un wrapper oscuro por detrás de los cuatro controles.

**Geometría igualada a la identidad oficial:** el CSS productivo `.tab-container` / `.tab-btn` usa inactivos circulares y morph activo. V2 usa diámetro **56px en navegación inicial** (54px en pantallas pequeñas) con `flex:0 0 <diámetro>` y `border-radius:50%`, y en dock **48px** (44–46px según ancho), con diámetro exacto, sin `flex-shrink`. El activo abre una píldora y revela su etiqueta solo cuando hay espacio. La cápsula usa `border-radius:999px`, no esquinas semiflotantes/distorsionadas. Se normalizó `flex-basis` a valores numéricos durante el morph para evitar saltos de un tamaño `auto` no interpolable.

**Interacción:** se mantiene **una sola navegación** en DOM; al avanzar (>185px) pasa a dock compacto, con reversa al desplazarse hacia abajo en pantalla que amplía la cápsula y muestra nombre del destino activo donde cabe; al volver al principio (<85px) retoma posición original. Se conserva listener pasivo + rAF, histéresis 29px, reduced-motion. V2 **elimina la lectura forzada `top.offsetHeight`** al entrar en dock para evitar relayout sincrónico; usa dos ciclos de `requestAnimationFrame`. El panel de pruebas puede aparecer por encima del dock; popovers de perfil y campana siguen interactivos con el dock flotante.

**Alcance exacto:** solo archivos de laboratorio `adaptive-top-nav.css` y `adaptive-top-nav.js` con referencias de caché actualizadas en `morph-v2.html`. Commits V2: CSS `c5685e0e262e486ab322eb28deb192ef4722a56d`, estabilización `f3ffcbe4d641117ae73c37e3dc5e2ac2497db378`, menú `9597943f956fda0c719c0a5a6fd292dd9057747b`; JS `8b25d104ae1453176c931b205363357db4b0d6a6`; HTML de enlaces **`d2237f1cc726460ab5114d8ff2c8704a69eafb30`**. Aún sin integración en `ayuda.html`.

**Pruebas:** el smoke Chromium/WebKit `check-adaptive-nav.mjs` ahora verifica anchuras de 280,320,360,390,430 y 768px, geometría cuadrada del botón, radios de círculo, fondo transparente de wrapper, vidrio real en la cápsula, no superposición con campana/Goxy, retorno al inicio y detalle del perfil. Está **añadido, no ejecutado en navegador real** en esta sesión; requiere test físico de Safari en el iPhone para concluir fluidez y transparencia. No afirmar que los resultados de la simulación V1 son prueba de esta V2.

**Decisión de perfil:** se conserva el rostro original de Goxy como avatar predeterminado. El usuario quiere **posibilidad futura de cambiar el color de Goxy** además de seleccionar su propia foto; **se anota como backlog**, no implementarlo todavía. La foto sigue siendo solo muestra local temporal, no guardada en una cuenta.

**Laboratorio V2:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=d2237f1

---

## 8. Implementación real en el laboratorio · V1 (22/nov/2026)

**Autorización de alcance:** el usuario pidió expresamente **implementar la idea en el laboratorio** para probar sus interacciones, sin autorizar la integración oficial. La cápsula sigue siendo diseño pendiente de aprobación en Safari físico.

**Archivo principal:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html`, commit `cdfb36d2b62416b5e4e01741b19de962f11f26ec` (enlaces versionados). **Archivos nuevos y funcionales, no basura temporal:**

- `preview/experiencia-mi-espacio-inteligente/adaptive-top-nav.css`: `775acbb98567e5733e7258625740d6f57547eef5`
- `preview/experiencia-mi-espacio-inteligente/adaptive-top-nav.js`: `a72fa20ab9cdb5738bcc98cb0f103a048b68e2bd`
- `preview/experiencia-mi-espacio-inteligente/check-adaptive-nav.mjs`: prueba de navegador Chromium/WebKit **agregada, aún NO ejecutada con navegadores reales en esta sesión** (requiere repo local con Playwright y navegadores instalados).

**URL para revisión:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=cdfb36d

### Comportamiento observado por código

1. **Navegación única real en el DOM** `#gxn-nav`: tres botones con emojis 👤 / 🛒 / 🛠️. El destino activo crece con morph CSS (aprox. 440ms) y revela su etiqueta cuando la anchura lo permite. Otros destinos permanecen accesibles.
2. **Encabezado inicial:** wordmark completo a la izquierda, campana de prueba y avatar circular de Goxy a la derecha. Cristal neutro derivado de la base del feed (`rgba(8,8,12,.371)`, blur 11.75px). No se redibujó el Hero ni las tarjetas previas.
3. **Scroll por dirección con histéresis:** listener pasivo, `requestAnimationFrame`, entrada a dock cuando `scrollY>=185`, retorno al inicio `scrollY<85`, cambio de tamaño tras ~29px de desplazamiento acumulado. En dock compacto: barra superior de una fila de ~50px; al regresar por el contenido reaparece la etiqueta activa y el dock crece sin volver al principio. Un solo nodo visual, no dos navegaciones solapadas.
4. **Marca adaptable:** `logo2.PNG` completo al inicio y recurso oficial `Logo individual.png` para el estado compacto cuando cabe. A <=355px se oculta la marca dentro del dock para mantener targets de >=44px; nunca se sustituye por un logo inventado.
5. **Avatar Goxy:** estado inicial es un rostro robótico simplificado inspirado en la carcasa/pantalla oficiales; tras el primer pintado, se intenta montar **el motor original local `../goxion-ai/goxy-heads.bundle.js`** (~227 KB) en inactividad del navegador. Solo se muestra cuando React terminó de renderizar, mediante `MutationObserver`, evitando parpadeo. Con `prefers-reduced-motion` se conserva la representación estática.
6. **Menú:** «Mi perfil», subopciones «Elegir foto / Volver a Goxy» y «Salir». En laboratorio, la foto se lee localmente solo en JPG/PNG/WebP hasta 2 MB, con URL local temporal revocable; **no se sube ni persiste**. «Salir» muestra diálogo explicativo, **no modifica sesión ni llama a backend**.
7. **Campana de muestra:** abre popover no conectado; la campana real de la página oficial y su badge no se sustituyeron. Catálogo desplaza a la sección ilustrativa; Soporte abre diálogo explicativo y vuelve al destino anterior; Mi Espacio regresa al inicio. **Estos handlers son de laboratorio, no equivalentes a los de producción**.
8. **Sin navegación inferior, sin hamburguesa y sin barra extra**. El dock superior fijo usa el mismo DOM y deja un espacio estable en el flujo mediante `#gxn-stage`, evitando saltos de contenido. El nuevo código está aislado en clases `gxn-*`; los módulos del Hero, Beneficios, Ahorro, Servicios, Historial y Catálogo conservan exactamente sus subárboles previos.

### Validaciones realizadas / pendientes

- Se comprobó que existen los recursos `Logo individual.png`, `logo2.PNG`, `goxy-heads.bundle.js` en GitHub; HTML con **1 `<nav>` / 3 destinos** y sin IDs duplicados; balance de secciones y encabezados; **4 scripts inline válidos** y nuevo JS válido; X compartida de Servicios **35/16** intacta.
- **16 transiciones simuladas satisfactorias**: inicio, umbrales, dock compacto, expansión al volver, compactación posterior, retorno a estado inicial, avatar, perfil, campana, categorías, soporte y salida ilustrativa. Las pruebas simularon DOM y scroll; **NO son evidencia de rendimiento real en Safari**.
- Se añadió smoke real de Chromium/WebKit para seis anchos (280,320,360,390,430,768) y flujo de menús, pero **no se ejecutó todavía**. No afirmar que su suite pasó.
- **Obligatorio para aprobación:** vídeo Safari de iPhone con scroll de arriba abajo, rebote al inicio, cambio de pestaña, giro de pantalla, perfil, teclado/foco, `prefers-reduced-motion`; verificar que el dock no tape acciones ni pestañas del navegador, que Goxy no ocasione tirones, y que la marca individual se vea bien al pasar a compacto.
- **La implementación productiva sigue bloqueada** hasta conectar la campana existente, `switchTab`, login morph, `cerrarSesion`, foto persistente segura y retirar/coordinar `#sticky-client-bar`. Prohibido copiar los handlers ficticios de laboratorio a producción.

**Estado final de V1:** prototipo listo para feedback, sin aprobación visual final. El trabajo futuro debe iterar **solo `gxn-*`** salvo instrucción del usuario; no sacrificar las tarjetas ya aprobadas.
