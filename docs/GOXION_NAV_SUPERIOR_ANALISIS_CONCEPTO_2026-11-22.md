# GOXION · Navegación superior adaptable + perfil — investigación y laboratorio V4

**Fecha:** 22/nov/2026. **Estado actual:** **V4 IMPLEMENTADA EN LABORATORIO para revisión**, aún **NO aprobada ni publicada en `ayuda.html`**. Las secciones 1–10 contienen análisis y versiones históricas; **la sección 11 explica la V4 vigente y reemplaza las decisiones de movimiento lateral de la V3**. Sin cambios en CSS/JS oficial, Edge ni datos de clientes.

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

## Restauración de V3 después de intervención no aprobada de Muse — 22/nov/2026

**Decisión del usuario:** deshacer el «cochinero» introducido después de nuestra V3 y **dejar el laboratorio como nos quedamos**. El commit no aprobado de Muse fue `c8f3efa0782b5cfe403cec90cbff75e05ebb9191` («transform-only + franja única...», además de alteraciones fuera de navegación en Hero/beneficios). Se recuperó **exactamente** el contenido anterior al commit de Muse, correspondiente a `27ecb20ef481503eaec3bacd9555e8d8c90a81a4`, en:

- `adaptive-top-nav.css`: contenido de referencia `901e5682e470e7d865aa03c681f03202cda49714`, restaurado con commit `c2c52989bdc561be23c7685e82b219d03bb1be74`.
- `adaptive-top-nav.js`: contenido de referencia `582a993bdacc818e9fda40ab383f7a388cbcafc5`, restaurado con commit `9537d2f1e837484453c550f7826e606e310ee4bd`.
- `morph-v2.html`: DOM, estilos de Hero/beneficios y guion del feed anteriores al commit de Muse; fuente `1035da02645e466f937774177fec225a2e9ef5b3`, restaurada con commit `ddd0f43a3520beb8f11e29f257d52946829d150d`. **Única diferencia intencional posterior:** parámetros de caché de nav CSS/JS renovados en commit `4efbd595470b8884a4f92c2ccda78e847486c5f8` para evitar servir la versión rota previamente cacheada.

**Qué se prohibe repetir:** no introducir una `gxn-strip` que englobe la campana/Goxy, no cancelar la expansión del nav al deslizar de regreso, no quitar las cuadrículas adaptadas del Hero ni los materiales/animaciones de Beneficios. La V3 documentada a continuación es el estado válido para continuar. **No se ha modificado la página oficial** `ayuda.html` ni se considera aprobada aún la V3 mediante QA físico en iPhone.

**Laboratorio restaurado:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=4efbd59

---

## V4.3 · Legibilidad y borde cian de estado activo (23/nov/2026)

**Decisión del usuario:** recuperar parte de la jerarquía visual de la cápsula oficial, sin copiar literalmente su cian intenso: aumentar letra activa, distinguir selección con un borde visible y mantener el cristal neutro/aprobado. Tras análisis se seleccionó una versión más sobria que el oficial (cuyo texto mide 15–16px y cuyo borde activo usa 80% de cian). **Autorizado y aplicado al laboratorio.**

- CSS `preview/experiencia-mi-espacio-inteligente/adaptive-top-nav.css` commit **`21280ac555e44d16ffbcd90bd09e970697fcc116`**: `.gxn-tab-label` pasa de `12px / 650` a **`14.5px / 700`** (ligera corrección de espaciado de letras). `.gxn-tab[aria-current="page"]` usa borde `rgba(0,242,254,.42)` en expandida. En compacta se atenúa a `rgba(0,242,254,.25)`. Se anima **`border-color .26s ease`** junto a los demás cambios de selección.
- HTML de laboratorio `morph-v2.html` commit **`11649842c0ace57581197ac1c504a6166739198c`** solo actualiza `?v=21280ac` para evitar caché CSS antigua en Safari.
- **Sin cambios** en JS de navegación, largo de la cápsula, círculos de 44px, material neutral, posición sticky centrada, halo anterior tenue, reserva del saludo en dos líneas, Hero y feed.
- Validación de código: sustituciones únicas, CSS balanceado, confirmación de reglas de modos, medidas y espaciado conservados. **QA visual iPhone/WebKit aún pendiente; no se debe afirmar que el nuevo texto está probado en todos los anchos.**

**Vista anticaché:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=1164984

---

## V4.2 · Corrección de separación proporcional cápsula / saludo (22/nov/2026)

El usuario revisó V4.1 y confirmó que la nueva cápsula y sus emojis le gustan, pero **rechazó el aire extra bajo la navegación**: el saludo quedó visualmente demasiado abajo. La nueva regla es **margen proporcional y mínimo**, respetando la reserva de 2 líneas del saludo.

**Aplicado solo al laboratorio:** nav CSS `adaptive-top-nav.css` commit `1c5a45cf869c5c8927d9382d9904b2d568cdb853`; HTML cache-bust `morph-v2.html` commit `56c6d11aa6f93b6420f8ec9dfdd6862b2e29c8bb`.

- Cápsula expandida `margin:9px auto 9px` (**antes 9px arriba / 19px abajo**). No se modificó `.greeting`, `h1`, ni sus tamaños y reserva para dos líneas.
- En compacto se compensó **únicamente** el margen inferior, de `39→29px` y en <=355px `37→27px`. La suma alto+margen permanece constante: **76+9 = 56+29 = 85px** (normal), **74+9 = 56+27 = 83px** (estrecho). Al plegar no debería empujar el resto del feed.
- No se cambian los botones de 44px, emojis, cristal, luces, comportamiento sticky ni la cabeza/avatar de Goxy; la corrección es de **10px menos de aire debajo de la navegación**, no un rediseño del hero.
- Verificaciones de código y cálculos de altura realizadas. **Safari físico sin verificar**: pendiente revisión visual para un saludo de una y dos líneas.

**Vista actual:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=56c6d11

---
## V4.1 · Pulido de cápsula compacta, geometría y emojis (22/nov/2026)

El usuario validó la **V4 centrada y sticky** en captura de iPhone y pidió un pulido contenido: cápsula **un poco más pequeña**, centrado óptico de los emojis, discreto distintivo de selección y mejor ritmo con el saludo. **No rediseñar ni cambiar navegación/scroll, Goxy o tarjetas aprobadas.**

**Aplicación REAL en laboratorio:** CSS `adaptive-top-nav.css` commit `f9a6f921c004b20ddfa05344f85625b68f77f830`, corrección final de fila única `03fa1c8d7afbfea2ed615498e475f50e241e80a1`; HTML con caché versionada `morph-v2.html` commit `65b6ad03d87b7c5a029c91a9f5ad6ed699796dd4`.

- Estado compacto estándar **160 × 56 px**, y **158 × 56 px** hasta 320px. **Tres botones de 44 × 44 px** sin posibilidad de encogimiento; diámetros mínimos táctiles respetados.
- Los emojis usan cuadro fijo **24 × 24 px**, `display:grid;place-items:center`, tamaño de fuente **19 px** y compensación óptica de −0,5px. El botón conserva **flex en una sola fila** con `gap:0`; la etiqueta escondida ocupa ancho cero. Evitar `display:grid` en el botón porque introduciría una segunda fila invisible y descentraría el emoji.
- El destino activo usa **cristal cian muy tenue**, `rgba(105,197,210,.115)` y sombra de baja intensidad `0 0 12px rgba(94,220,240,.085)` sin ornamentos adicionales.
- Separación inicial de la cápsula con el saludo: margen inferior **15→19px**. En compacta se compensa la diferencia de altura (**76+19=56+39=95px**, o **74+19=56+37=93px** en móvil estrecho), evitando desplazar el contenido al cambiar de tamaño.
- **Validación hecha:** sustituciones exactas y CSS balanceado; cálculos de capacidad (160/158px >= 154px requeridos para tres objetivos táctiles + gaps + padding + bordes); HTML pin actualizado. **No se ejecutó Safari físico ni Playwright en esta sesión**.

**Vista de revisión V4.1:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=65b6ad0

**Importante:** conserva la V4 sticky centrada, Goxy, notificaciones de laboratorio y los demás módulos. No alterar `ayuda.html` hasta autorización explícita.

---
## 11. V4 · Cápsula centrada, sticky y de tamaño variable (22/nov/2026)

**Nueva decisión del usuario después de restaurar la V3 previa a Muse:** reconsideró el riesgo de hacer viajar la cápsula hacia la esquina y propuso simplificar: tomar las transformaciones del botón activo de la navegación oficial, **mantener la cápsula en el centro**, fijarla arriba al desplazar contenido, reducirla de tamaño, hacer que encabezado/logo/campana/Goxy salgan del viewport de forma normal y **reexpandir la misma cápsula al deslizar el dedo hacia abajo**, sin obligar a volver al inicio. El usuario pidió implementarla en laboratorio, no en producción.

### Implementado — NO oficial

- **HTML:** `preview/experiencia-mi-espacio-inteligente/morph-v2.html` commit **`cb19d3ab3750e9e8835fb33000cfdaf2b80ee48d`**. El único `#gxn-nav` pasó a estar inmediatamente después de `#gxn-stage`, como hijo directo de `.shell`. Se eliminaron `#gxn-nav-slot` y `#gxn-nav-target`: ya no se reserva una posición fantasma ni se miden dos destinos. Su estado es `data-mode="expanded"/"compact"`.
- **CSS:** `adaptive-top-nav.css` commit `2e5007c1d804e8ba989f39447394429a0dbdc668`. La cápsula usa **`position:sticky`** y `top:calc(8px + env(safe-area-inset-top,0px))`, `margin-inline:auto` (centro real, sin cálculo lateral), cristal neutro `rgba(8,8,12,.371)` y `backdrop-filter:blur(11.75px)`. Tamaño en reposo: ancho de `.shell`, alto 76px (74px hasta 355px); compacta **172×60px**, **160×60px** en <=320px. Botones de la navegación oficial con morph del destino seleccionado, círculos **56×56** (54×54 en pequeño) en completo; **46×46** en compacta (44×44 en <=320). Radio circular 50%; área táctil >=44px.
- **Ritmo del feed:** el encabezado conserva logo, campana y Goxy como en la V3, pero **NO se fija ni se traslada**; se desplaza fuera de la pantalla naturalmente. `#gxn-stage` se reduce a su fila real de 60px; la cápsula ocupa el segundo renglón con `margin-top:9px` y deja 15px antes del saludo. En compacta, el margen inferior aumenta 16px para **compensar la diferencia de altura y preservar el desplazamiento de los demás módulos**. En <=355px se compensa el cambio de 74→60px con margen 29px.
- **JS:** `adaptive-top-nav.js` commit `876946a90b7e06fc892148203d334364143ad402`. Eliminado todo el motor de `dockGoal`, `spread`, cálculo de coordenadas, reubicación por `transform` y loops de asentamiento. El listener `scroll` pasivo y `requestAnimationFrame` **solo detectan dirección y actualizan un estado**. Después de ~150px al avanzar por la página se compacta; al regresar por el contenido unos 26px se expande; al volver a ~95px se restaura la versión completa. Cambios solo en los extremos; CSS `transition` (~380ms) concluye naturalmente incluso si el gesto termina antes. La navegación nunca altera `scrollY` para completar una transición.
- **Una identidad, no otro componente:** siguen tres destinos y emojis, la transformación a píldora del ítem activo, Goxy y su menú, campana de prueba, simulador de Catálogo y diálogo de Soporte. En compacta, los tres destinos se mantienen navegables y con blancos circulares reales, sin labels. En expandida, se recupera la etiqueta del destino activo.
- **No se modificaron** Hero, Lealtad, Referidos, Misiones, Ahorro, Servicios, Historial, Catálogo, sus estados, ni `ayuda.html`, `index.html`, `admin.html`, motor financiero o autenticación.

### Verificación

- **15 comprobaciones estáticas** completadas: un `nav`, tres destinos, IDs únicos, scripts válidos, CSS balanceado, cristal, sticky, objetivos, botones, y subárbol completo del feed sin cambios.
- **18 pruebas de comportamiento con DOM simulado** completadas: inicio, umbrales, compactación, permanencia, reversa, segundo sentido, regreso arriba, scroll largo, perfil, Goxy, campana, Catálogo y Soporte.
- **Smoke real de Chromium y WebKit** actualizado en `preview/experiencia-mi-espacio-inteligente/check-adaptive-nav.mjs`, incluyendo 280/320/360/390/430/768 px y comprobación de ancho, redondez, centrado, altura compensada, interacción de menús y scroll. **Todavía no ejecutado en navegador real**; queda pendiente Safari del iPhone antes de aprobar fluidez, sticky y safe area.
- **Importante:** esta V4 **supersede únicamente la navegación V3**. No se debe recuperar por accidente la V3 de movimiento hacia la esquina, ni la franja oscura de Muse. Las decisiones de diseño aprobadas de los otros módulos siguen vigentes y están protegidas por el expediente maestro.

**Vista V4 anticaché:** https://henrygonzalezestrada-cyber.github.io/goxion/preview/experiencia-mi-espacio-inteligente/morph-v2.html?v=cb19d3a

---

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
