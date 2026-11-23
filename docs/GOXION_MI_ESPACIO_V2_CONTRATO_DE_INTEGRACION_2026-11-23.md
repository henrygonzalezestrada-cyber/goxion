# GOXION · Contrato vinculante de integración del feed privado V2

**Fecha:** 23 de noviembre de 2026  
**Estado:** alcance confirmado; auditoría de código realizada; **NO autorizado para publicar en ayuda.html**.  
**Producto:** GOXION · interfaz cliente.

> REGLA PRINCIPAL: SOLO SE REDISEÑA EL FEED PRIVADO DE UN CLIENTE CON SESIÓN INICIADA (view-dashboard). No se rediseñan la portada inicial pública, login, recuperación/activación, Catálogo, carrito, promociones, Soporte, registro, legales ni modales globales. El espejo integral debe incluirlos todos **sin duplicarlos**, para verificar un recorrido auténtico. Esta regla prevalece sobre planes anteriores que consideraban rediseñar otras áreas.

## Avance de implementación · espejo oficial-root (23/nov/2026)

**Nueva fuente de integración vigente:** `ayuda-espejo-feed-v2.html` (nivel raíz, junto a `ayuda.html`). Se generó como copia literal de la oficial, con un injerto de V2 exclusivamente dentro de `#view-dashboard`. Conserva los IDs y controladores oficiales de portada, login, Catálogo, Soporte y elementos globales. **No utiliza iframe**.

- `preview/mi-espacio-v2/official-feed.css`: estilos V2 limitados por `@scope (#gx-v2-feed)` y propiedades de compatibilidad que se aplican solo cuando el feed privado está visible. Fuera de `#view-dashboard`, GOXION conserva su material y comportamiento oficial.
- `preview/mi-espacio-v2/official-feed-runtime.js`: render visual V2 que utiliza la sesión **ya confirmada por la oficial** a través del evento `goxion:client-ready`. No tiene un segundo formulario ni inicia una sesión distinta. Acciones comerciales V2 protegidas por `ENABLE_WRITES=false`.
- `preview/mi-espacio-v2/official-feed-host.js`: conmutación visual entre V2 y dashboard anterior, adaptador del contador de la campana oficial sin segundo motor de notificaciones y navegación por `switchTab` original. Se mantiene un contenedor oculto `#gx-v2-legacy-host` de compatibilidad para los controladores oficiales antiguos; **se debe eliminar después de migrar cada handler, antes de lanzamiento**.
- `preview/mi-espacio-v2/espejo.html` queda como prototipo anterior de navegación con iframe, **no candidato** a oficial. Evitar hacer cambios funcionales nuevos en él.
- Probar no solo el aspecto sino también la integridad 1:1 del contenido de la portada y de Catálogo/Soporte, ausencia de IDs duplicados y de login paralelo, además de Chromium/WebKit para navegación.
- **Sin promesa de funciones aún no conectadas:** confeti, cancelaciones, retención, cupones, B2, pago/comprobante, credenciales seguras y escritura funcional del feed están **pendientes de paridad V2**, aunque sus fuentes originales siguen en el espejo. No decir que el rediseño está listo por mantener scripts cargados. Ninguna función de demo equivale al evento real.

La oficial `ayuda.html` se conserva intacta. Este espejo es una **base técnica de integración progresiva**, no la build definitiva que se publicará sin rehacer.

## Correcciones del recorrido real · grabación 23/nov/2026 (15:18, ~99 s)

Se revisó el video del espejo oficial-root que muestra Mi Espacio, servicios YouTube/Crunchyroll, notificaciones y cambio a Catálogo/Soporte. Las decisiones y correcciones aplicadas son:

- **Navegación privada persistente:** trasladar el **mismo nodo** `#gxn-nav` y la cabecera `#gxn-stage` a hosts compartidos `#gx-v2-shared-nav` y `#gx-v2-shared-header` dentro del documento oficial-root, fuera de `#view-dashboard`. Las tres vistas siguen usando `switchTab` oficial; solo cambia `aria-current` y la vista, sin recrear la cápsula ni mostrar `#goxion-main-nav` antigua mientras hay cliente autenticado. Los estilos del laboratorio se limitan a `@scope (#gx-v2-feed, #gx-v2-shared-header, #gx-v2-shared-nav)`. La portada invitado no se toca.
- **Notificaciones:** conservar `assets/js/ayuda/04-client-notifications-realtime.js` íntegro, con slide-in, confirmar lectura, borrar, swipe, undo y feedback. Cambiar únicamente hoja cristal neutra en sesión privada, manteniendo material legible, y la X homogénea de disco 35px / trazo 16px / diana 44px. El icono de la campana con badge degradado se refleja desde la instancia oficial, sin segundo sistema.
- **Opciones servicio:** `.gxs-more[hidden]{display:none!important}` para que Gestionar cancelación nunca aparezca accidentalmente sin pulsar «Más opciones». La acción real de cancelación/retención **todavía no está integrada** en las tarjetas V2 y NO debe declararse lista ni escribir en datos reales en este espejo.
- **Final del feed:** el relleno de `#gx-v2-feed .shell` pasa de 110px a 18px (más safe area); Documentos mantiene su contenido oficial. No introducir un spacer de laboratorio debajo del historial.
- **QA que protege el cambio:** el mismo elemento `#gxn-nav` debe sobrevivir a las tres pestañas (`===` referencia DOM); `#gxn-bell` único; X y desenfoque neutro; opciones de cancelación inicialmente ocultas; portada y Catálogo/Soporte sin alterar. Pruebas Chromium/WebKit 390/320px en la rama de integración.

**Regla:** no convertir la cápsula en tres componentes ni cargar el motor de notificaciones dos veces. La integración definitiva requiere extraer el HTML legacy antes de promover `ayuda.html`. Esta revisión se limita al espejo.

## Corrección visual y de acciones del espejo · 23/nov/2026, seguimiento de pruebas

- **Hero / tarjeta principal:** es un `div.focus` informativo que conserva sus estados dinámicos. **Sólo** `button#focus-action` es clicable. Eliminar para siempre el listener `#focus` que activaba toda la tarjeta. Para cuentas existentes llamar a `window.irAlTicket()` de la oficial, nunca `location.href='./index.html'` directo: el adaptador `18-b2-index-ruta-oficial.js` resuelve régimen y seguridad del calendario multifecha. Para cuentas nuevas, botón «Ver catálogo» usa el controlador oficial `switchTab`. No reactivar `#gxi-account` inline como sustituto del resumen.
- **Historial:** usar SVG originales del laboratorio para pagos, altas verificadas, renovaciones y cancelaciones. Mostrar «servicio agregado» sólo con una fecha explícita de contratación o activación del servidor; jamás inventar líneas de la demo. La flecha y la X deben alternar con `is-open` y `aria-expanded`, solo mediante el botón de la fila.
- **Notificaciones:** no tocar `04-client-notifications-realtime.js`. Corregir en el espejo cierre circular de 35px dentro de una diana táctil de 44px, trazo de 16px; **no** usar pseudo-elemento con `z-index:-1` que queda oculto en WebKit. El header debe tener fondo neutral uniforme y menos sombra negra, conservando swipe, deshacer, confirmación y animaciones.
- **Cápsula:** mantener el mismo `#gxn-nav` en Inicio/Catálogo/Soporte. Animar realmente `flex-grow` de la pastilla activa durante 380ms y evitar cambio inmediato a `width:auto` que deforma la anchura al cambiar. Respeto de `prefers-reduced-motion`.
- **Control previo a oficial:** CI de estructura y Chromium/WebKit con datos QA de lectura, pruebas aisladas de toque en superficie y CTA, SVG y flecha-X. Safari real y los controladores de escritura/retención/confeti siguen siendo puertas pendientes; nunca dar por migrado un comportamiento solo porque el script oficial siga cargado.

## Ajuste de identidad en el acceso privado · 23/nov/2026

- **Espejo actual y único:** `ayuda-espejo-feed-v2.html`. Se mantiene `ayuda.html` oficial sin cambios, al igual que la pantalla pública antes de autenticar.
- **Logo oficial:** la pantalla pública conserva el splash `#splash-screen` y su logo `Logo individual.png`. Cuando se confirma una sesión válida de Mi Espacio, `official-feed-intro.js` muestra una transición privada del **mismo archivo individual** hacia la posición de `.gxn-wordmark` en el encabezado. Termina revelando el arte gráfico oficial `logo2.PNG`, **no texto compuesto**. Se anima posición/escala uniforme con Web Animations, sin modificar el layout de Inicio/Catálogo/Soporte. Animación de una sola vez por sesión/página; nunca repetir al cambiar pestaña.
- **Barra discreta:** progreso indeterminado auténtico de 2px (sin porcentajes inventados), `Preparando tu espacio` solo si la sincronización tarda más de 480ms. No retrasar entradas rápidas por una animación de carga adicional. La transición no debe bloquear el uso cuando falla la conexión; salida de seguridad y error del feed continúan siendo de los controladores.
- **Accesibilidad:** respetar `prefers-reduced-motion` y desactivar la animación, no solo acortar su duración. No ejecutar la transición para invitados o páginas públicas.
- **X simétrica de notificaciones:** tras crear el sheet original, sustituir únicamente el contenido gráfico del botón de cerrar por `span.gx-v2-notif-cross` con dos trazos CSS del mismo ancho, altura y centro, girados ±45°. Conservar el mismo `button.gx-client-notif-close` y su `onclick` oficial; **jamás duplicar o reemplazar controladores de notificaciones**.
- **Pruebas:** `scripts/mi-espacio-v2-intro-browser.mjs` comprueba vuelo de logo y cierre geométrico en Chromium y WebKit con DOM sintético aislado, además de movimiento reducido y portada pública. Pruebas estructurales y de shell protegen ruta de acceso y no escriben datos comerciales.

## Auditoría de paridad · revisión de grabación 16:32

La nueva referencia de diferencias es `docs/GOXION_MI_ESPACIO_V2_AUDITORIA_PARIDAD_2026-11-23.md`. Prevalece sobre la indicación anterior de dos superficies de carga: el espejo usa un único nodo de arranque. La X de avisos clona el SVG del cierre de beneficios y anula **ambos** pseudoelementos heredados. El saludo recupera el ciclo exacto del laboratorio y el ahorro separa cantidad visual de plataformas de cobertura monetaria. No se habilitan escrituras ni se publica en la oficial.

## A. Tres fuentes, tres responsabilidades (NO mezclar)

1. **Oficial funcional:** ayuda.html, assets/css/ayuda.css y scripts oficiales assets/js/ayuda/**. Fuente de verdad de lógica comercial, autorización, backend, flujos y todo lo que está fuera del feed privado.
2. **Laboratorio visual aprobado:** preview/experiencia-mi-espacio-inteligente/morph-v2.html y adaptive-top-nav.css. Fuente de verdad SOLO para geometría, composición, morph, superficies, controles y microanimaciones previamente aprobados del feed privado. Sus fixtures, selectores demo y luces de prueba NO son lógica productiva.
3. **Preview V2 / espejo temporal:** preview/mi-espacio-v2/index.html y espejo.html. Son herramientas de comparación visual y de navegación. El espejo.html actual incrusta la oficial en iframe: **NO es el espejo de preproducción ni el artefacto final**. La navegación del iframe causa un fondo negro entre superficies y un segundo contexto de scroll, sesiones y overlays; retirar antes de aprobación.

Este documento y el contrato de interacciones oficiales GOXION_MI_ESPACIO_CONTRATO_INTERACCIONES_OFICIALES_2026-11-22.md deben leerse juntos. En caso de contradicción: alcance de este documento; estética del laboratorio aprobada; lógica/seguridad de la oficial.

## B. Geografía estricta de la interfaz

| Zona original | Cambio permitido | Límite innegociable |
| --- | --- | --- |
| Portada pública #view-inicio | NO | Mantener HTML/CSS/JS, campañas, registro/bienvenida, navegación y comportamiento tal cual |
| Login, recuperación de PIN, activación y consentimiento legal | NO | Mantener autenticación y recuperación **oficiales**. La pantalla propia gxi-auth de V2 es solo un andamio de laboratorio; NO se promueve |
| **#view-dashboard (cliente autenticado)** | SÍ | Se sustituye la PRESENTACIÓN por el nuevo feed; sólo se conservan los datos, estados, reglas, operaciones y efectos funcionales originales necesarios |
| Catálogo #view-catalogo + carrito + promociones | NO | No reimplementar tarjetas, catálogo simplificado, precios, checkout ni descuentos; un único runtime oficial |
| Soporte #view-soporte | NO | Mantener tarjetas morph originales, incidencias, plataformas, ayuda/WhatsApp y animaciones originales |
| Modales globales, avisos legales, onboarding, Goxy, contenedores de overlays y notificaciones | NO rediseño global | Conservar eventos, accesibilidad, seguridad y apariencia oficial fuera del feed; adaptar punto de montaje/contraste sólo dentro del feed si aplica |
| Navegación general de la oficial | NO rediseño global | La cápsula V2 ocupa la navegación del feed autenticado; al salir del feed, los otros módulos conservan su navegación y scroll. No dejar dos barras simultáneas |
| Background WebGL global | NO | El canvas **#gx-wave-canvas** y el mismo motor **assets/js/ayuda/06-wave-background.js** de la oficial, SIN duplicar shader |

## C. ADN aprobado: constantes CSS reales, NO impresiones subjetivas

Los siguientes valores proceden de las fuentes de laboratorio (salvo la hoja de notificaciones indicada por separado). Se congelan para el feed privado hasta aprobación explícita de una revisión.

| Componente | Definición que debe conservarse |
| --- | --- |
| **Superficie neutral base** .gxc-surface | background rgba(8,8,12,.371), backdrop-filter blur(11.75px) saturate(1), borde 1px rgba(255,255,255,.035), sombra 0 15px 36px rgba(0,0,0,.23) + inset 0 1px rgba(255,255,255,.05) |
| **Hero neutro** .focus[data-material="neutral"] | background rgba(8,8,12,var(--neutral-alpha,.34)); blur(var(--neutral-blur,10.3px)) saturate(1); borde rgba(255,255,255,.035). Nota: el hero NO usa obligatoriamente el mismo alfa/blur que todas las tarjetas |
| **Tarjeta expandida de beneficios** .gxb-panel | mismo fondo .371, blur 11.75px, radio 26px y sombra de superficie base; jerarquía de título y color por tipo; no overlay opaco diferente salvo el panel de información |
| **Navegación cápsula** .gxn-nav | fondo .371, blur 11.75px saturate(1.08), borde rgba(210,230,247,.10), una sola cápsula sticky; botón activo .075 blanco con borde cian rgba(0,242,254,.42) expandida / .25 compacta |
| **Tipografía de pestañas** .gxn-tab-label | Poppins 14.5px, peso 700; el botón seleccionado revela su texto, compacto usa sólo emoji |
| **CTA de beneficio** .gxb-action | visual 38px mínimo; background rgba(255,255,255,.08); texto acentuado por tipo; sin backdrop-filter ni sombra extra; toque scale(.985) |
| **Botón de condiciones** .gxb-rules | área táctil 44 × 44px, microsuperficie interior con rgba(255,255,255,.08), no mover emoji al abrir información |
| **Cerrar tarjetas extendidas** .gxb-dismiss | diana táctil 44px; disco cian de 35px y X de 16px (variables --gx-close-disc y --gx-close-x); posición respetada y jerarquía consistente |
| **Opciones de servicio** .gxs-pill | visual mínimo 38px, background rgba(255,255,255,.08); acciones nuevas limpias, no botones antiguos incrustados |
| **Ahorro** .gxv-savings | superficie neutral; logos distribuidos según 1–4 servicios comparables (+N restante), movimiento leve gxvHover, cifra de transición animada, comparación orientativa con tarifas públicas vigentes, no modifica contrato |
| **Hoja de notificaciones V2** | material neutral propio de una superposición, hoy rgba(21,25,32,.9) y blur 22px. Esto es estado del espejo a contrastar, NO imponer 22px a todas las tarjetas. Campana compacta 44px / extendida 74px con círculo morado→cian y badge sin leer de la oficial |
| **Movimiento y accesibilidad** | las microanimaciones aprobadas responden a visibilidad, cambio de estado y gesto; evitar loops decorativos excesivos, respetar prefers-reduced-motion, foco, cierre, VoiceOver y tamaños pequeños |

**No uniformar por fuerza alfas de hero, superficies, modal y acciones.** Cada capa tiene la jerarquía mencionada. La regla es coherencia, no aplicar el mismo blur a absolutamente todo.

### Qué parte de la luz vive y cuál desaparece

- **CONSERVAR:** la onda luminosa de fondo de la oficial, dibujada por assets/js/ayuda/06-wave-background.js sobre el canvas gx-wave-canvas, con colores/bandas/movimiento originales.
- **ELIMINAR:** el experimento visual independiente .glass-underlay, .glass-beam, .glass-orb y keyframes gx-glass-passage/gx-glass-orbit, que barría la tarjeta principal. Se retiraron de index.html y espejo.html en V2 el 23/nov; el laboratorio histórico queda sin alterar como referencia.
- **CONSERVAR:** destellos de barras de progreso, movimiento flotante moderado de logos del ahorro y efectos de confirmación realmente aprobados. No confundirlos con el haz excluido.

## D. Inventario de funcionalidades: superficie vieja no equivale a comportamiento descartable

| Módulo dentro del feed | Sale (DOM / estilo) | Se conserva o migra íntegramente |
| --- | --- | --- |
| Saludo y hero | Tarjetas y cabecera visual antiguas del dashboard | saludo dinámico, estado real financiero, pagos al día/por vencer/vencidos, revisión, prórroga, dos fechas B2; animación premium de cambio sin reflujo |
| Estado de cuenta/historial | viejos contenedores y filtros visuales | importe y fecha reales por obligación, comprobantes, pago incompleto, pago por acceso, múltiples calendarios, adjuntar/verificar comprobantes, feedback de servidor |
| Lealtad | tarjetas antiguas de beneficios | racha real, reinicio, corazón roto al perder racha, progreso, condiciones, límites y cambios de estado; barras animadas |
| Referidos | tarjeta antigua | contador real, validación de referidos, 3 meses y reclamación sin duplicados, confeti SOLO tras éxito confirmado |
| Misiones/cupones | tarjetas antiguas | motor goxionMissionAPI, checks confirmados con servidor, animación checkbox, confeti oficial, reclamar cupón sin repetir, confirmación y error |
| Tarjetas de servicios | TODAS las tarjetas antiguas del feed y su estructura de subtarjetas | expansión y cierre nuevos del laboratorio, datos reales de servicios, invitaciones/perfiles, copia/revelación segura de PIN, entrega de contraseña de un solo uso, novedades, alertas y soporte contextual |
| Cancelación iniciada desde una tarjeta | visual viejo de tarjeta, pero **NO** los pasos posteriores | solicitud, evaluación de retención y su presentación animada cuando aplique; aceptar/rechazar oferta, progreso, aprobación/rechazo, fecha efectiva, reconexión, errores y bloqueo de doble envío |
| Notificaciones en cabecera | popup ilustrativo del laboratorio | una campana; motor oficial de sin leer, animación sólo con novedad real, abrir/cerrar sheet, swipe, borrar, deshacer, confirmar leído/todo, realtime y sesiones aisladas |
| Goxy/avatar | mock del laboratorio y controles demo | apariencia aprobada en cabecera y asistente real de GOXION, moods, chat, gestos y accesibilidad |
| Navegación | barra privada vieja mientras feed V2 está visible | nueva cápsula en dashboard; al visitar Catálogo/Soporte ejecutar sus controladores OFICIALES completos sin iframe; retorno y sesión sin salto |
| Fondo | haz .glass-beam del laboratorio | onda WebGL oficial, un solo canvas y un solo motor |

**Cancelación: ejemplo de flujo que NO se puede perder.** El código oficial assets/js/ayuda/01e-client-dashboard.js tiene gxSubmitServiceCancellation → evaluación de retención / gxRenderRetentionOffer → gxAcceptRetention o gxDeclineRetention → gxCreateCancellationRequest → gxCancellationActionState (loading/success/error), y panel de estados solicitada/aprobada/rechazada con barra gx-cancel-progress; incluye efectos de entrada, tiempos y mensajes. Esto NO se implementa copiando directamente IDs de las tarjetas antiguas dentro de V2. Se migra el controlador / servicio de dominio, se vincula a los botones nuevos, se conservan transiciones/feedback posteriores adecuados y se verifican todos los resultados. Solo la baja **efectiva** retira el servicio, nunca la mera solicitud o aprobación.

**Fuentes oficiales de control:** assets/js/ayuda/01e-client-dashboard.js, 01d-experience-session.js, 01c-rewards-referrals.js, 02-client-supabase-layer.js, 04-client-notifications-realtime.js, 01f-catalog-orders.js, 01g-support-runtime.js, 07-production-interactions-js.js y assets/js/core/realtime.js. No borrar controladores porque se reemplace su HTML; extraer funciones de dominio o adaptadores donde correspondan y probar paridad.

## E. Arquitectura correcta del espejo final

**No promover el iframe actual.** Es una prueba provisional y crea un segundo documento, segundo contexto de scroll y efectos visuales discontinuos (pantalla negra). Tampoco promover la pantalla de login propia gxi-auth de la V2.

1. Crear un espejo **basado en la página OFICIAL COMPLETA** (misma portada pública, menú no autenticado, Catálogo, Soporte, scripts oficiales y jerarquía raíz; las rutas a assets deben mantenerse intactas).
2. Hacer el injerto del nuevo feed ÚNICAMENTE en #view-dashboard del cliente autenticado. Registrar qué DOM antiguo desaparece y qué controladores originales dependían de IDs antiguos. No montar ambos dashboards.
3. La autenticación oficial crea la sesión y emite un evento de sesión verificada; la V2 lee el mismo estado, sin segunda pantalla de acceso, sin segundo login ni token paralelo. El inicio público y activación se mantienen idénticos.
4. Un solo controlador de navegación decide entre dashboard, catálogo y soporte. El nuevo diseño de cápsula/cabecera es exclusivo del feed autenticado; al salir se recupera la navegación/vistas oficiales sin forzarlas a encajar bajo el nuevo header.
5. Extraer acciones de dominio (pagos, B2, prueba, cancelación, retención, misiones, seguridad) de los antiguos renderizadores que escriben elementos como #dash-services. El renderer visual V2 escucha los estados, no invoca funciones antiguas que necesiten HTML inexistente.
6. **Tras actualizar el estado** conservar la vista expandida, evitar saltos de scroll y animar sólo cambios materiales; no introducir fixtures ni botones de QA en la UI productiva.
7. Conservar una sola instancia del motor realtime/notifications, del wave canvas y del asistente Goxy. Mantener los modales globales en el documento raíz para prevenir recortes de viewport.

## F. Puertas de calidad antes de tocar ayuda.html

| Puerta | Evidencia necesaria | Estado al redactar |
| --- | --- | --- |
| G0 · Alcance | Comprobación que #view-inicio, registro, login, Catálogo, Soporte y legales están visual y funcionalmente INTACTOS | pendiente en espejo final |
| G1 · Materiales | Comparación visual contra laboratorio aprobado, valores CSS congelados y ausencia de .glass-beam | haz retirado en preview; QA pendiente |
| G2 · Funciones del feed | Matriz de estados de pago, B2, prueba, cancelación, retención, contraseñas, lealtad, referidos, misiones | incompleto, ENABLE_WRITES=false en V2 |
| G3 · Navegación total | Misma página, mismo login, Catálogo/Soporte oficiales, carrito, promociones, soporte, volver, no iframe | pendiente; iframe actual solo exploratorio |
| G4 · Realtime y seguridad | Avisos nuevo/leído/borrado/deshecho, 2 sesiones, desconexión, permisos, secretos, consentimientos | parcial; confirmar integración oficial |
| G5 · QA móvil | Chromium + WebKit 390/320/280px + Safari real en iPhone; teclado, modales, safe areas, zoom, taps repetidos, reducción de movimiento | CI parcial; Safari real pendiente |
| G6 · Equivalencia y lanzamiento | Artefacto de preproducción idéntico a lo que se fusionará, sin cambios visuales posteriores; copia de seguridad, rollback y smoke postdeploy | NO autorizado |

**Ningún passing CI aislado reemplaza G0–G6.** Las pruebas de backend que escriben datos se realizan con clientes/cuentas de prueba controladas, nunca alterando clientes reales.

## G. Regla para cada siguiente cambio

1. Clasificar: ¿afecta exclusivamente #view-dashboard? Si NO, no cambiar estética global; sólo adaptar contrato imprescindible de conexión si se justifica y se registra.
2. Señalar fuente: laboratorio visual o código funcional oficial. Nunca copiar fixtures, DOM ilustrativo, luces excluidas, ni variantes CSS de prueba.
3. Añadir prueba que FALLARÍA si desapareciera la función oficial o reapareciera el elemento descartado.
4. Comparar captura móvil del mismo estado antes y después; revisar ausencia de barra doble, gradientes artificiales, overflow o saltos.
5. Marcar cada función como «conectada», «probada con cuenta controlada» o «pendiente»; no usar «lista para oficial» hasta G0–G6.

**Estado principal:** el usuario aprueba la dirección visual de la V2, pero NO la considera lista para producción. Se congela alcance y ADN para no repetir una integración caótica.
