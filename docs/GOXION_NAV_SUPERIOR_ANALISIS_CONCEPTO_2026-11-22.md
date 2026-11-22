# GOXION · Navegación superior adaptable + perfil — análisis previo al laboratorio

**Fecha:** 22/nov/2026. **Estado:** propuesta ANALIZADA, **NO aprobada ni implementada**. Sin cambios en `ayuda.html`, CSS/JS oficial, Edge o la interfaz del laboratorio. El usuario solicitó contrastar arquitectura, investigación visual y UX **antes** de prototipar.

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

## 7. Plan de prototipo y validación antes de integrar

**Todavía no autorizado como implementación; requiere evaluación visual en laboratorio.**

1. Crear variante experimental del **mismo** `morph-v2.html` o rama de laboratorio que permita comparar **expandido / compacto** con los componentes del feed tal como están; no enviar cambios a `ayuda.html`.
2. Ensayar dos composiciones de estado compacto: (i) logo símbolo + 3 destinos + campana + avatar en una línea cuando quepa, (ii) reflujo adaptable de marca sin perder controles a 280–320px. Evitar un diseño que solo funcione a 390px.
3. Probar comportamiento con gesto/touch (scroll largo, scroll corto, rebote iPhone, al tocar una tarjeta, abrir teclado, filtros del Historial, notificaciones, perfil, cambio entre Inicio/Catálogo/Soporte, siguiente sesión).
4. Probar **modo reducido** de movimiento, VoiceOver y zoom; estabilidad del foco, labels de destino, badge y logout.
5. En integración oficial, auditar `#sticky-client-bar`, `04-client-notifications-realtime.js`, login morph y `switchTab`. Nada de reemplazar con handlers falsos.
6. Documentar lo que apruebe el usuario en este expediente y en [el documento maestro de integración](GOXION_MI_ESPACIO_INTEGRACION_MAESTRA_2026-11-22.md); el estado de esta propuesta sigue **NO APROBADA**.

**Dictamen:** conceptualmente **sí es compatible** con el nuevo feed, pero **no realizar un simple shrink proporcional de todo el header** ni superponer otra barra. La diferencia de GOXION debe estar en la cápsula que cambia de geometría sin perder los tres destinos, la identidad cromática controlada y la conexión intacta, no en acumular capas de vidrio.
