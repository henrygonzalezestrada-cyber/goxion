# GOXION · Mi Espacio — contrato de preservación de interacciones oficiales

> **ACTUALIZACIÓN DE ESTADO · 23/NOV/2026:** el diseño de navegación aprobado visualmente ya es **V4.3** (etiqueta 14.5px/700, borde cian .42 expandida/.25 compacta). El contrato de preservación funcional sigue vigente **sin cambios**. Leer [`GOXION_MI_ESPACIO_REANUDACION_2026-11-23.md`](GOXION_MI_ESPACIO_REANUDACION_2026-11-23.md) antes de avanzar en otra sesión. No confundir aprobación estética con pruebas de integración real.


**Fecha de auditoría:** 22–23 de noviembre de 2026.  
**Alcance:** código en la rama `main` de `henrygonzalezestrada-cyber/goxion`. Este contrato documenta **lo que existe en producción y lo que NO debe perderse** cuando se integre en `ayuda.html` el nuevo feed del laboratorio. **No autoriza despliegue ni fusión.**  
**Último laboratorio de diseño aprobado de navegación:** V4.3 `preview/experiencia-mi-espacio-inteligente/morph-v2.html` (el usuario aprobó visualmente la V4.3; **no demuestra que el backend ya está integrado ni que Safari haya pasado QA**).

## Respuesta a las dos dudas explícitas del usuario

**Confeti de Misiones: SÍ se debe mantener.** En `assets/js/ayuda/01d-experience-session.js`:
- `window.lanzarConfeti()` emite piezas decorativas transitorias y las retira.
- `marcarMisionVisual(index,btnId,celebrar)` marca la misión y el checkbox, muestra `gx-mission-toast`, ejecuta `gx-mission-just-completed` si el panel está abierto y confeti cuando `celebrar` es verdadero.
- Al completar todas las misiones, puede lanzar dos ráfagas adicionales y habilita el botón para reclamar.
- `toggleMission` y `completarMisionInteligente` delegan la confirmación en `window.goxionMissionAPI.completeIndex/completeType`. **La celebración debe seguir ligada a progreso realmente confirmado**, no a una simulación del checkbox.
- `assets/js/ayuda/01c-rewards-referrals.js` también dispara `lanzarConfeti()` después de reclamar con éxito un cupón o un mes gratis. **No celebrar un reclamo fallido ni duplicar la recompensa**.

**Campana y número de notificaciones: SÍ se debe mantener.** En `assets/js/ayuda/04-client-notifications-realtime.js`:
- El botón real es `#gx-client-notif-launch`, el contador real es `#gx-client-notif-badge`, y el panel real es `#gx-client-notif-sheet`.
- Cuenta **notificaciones sin leer**, no el total de mensajes; muestra `99+` si excede 99 y actualiza la etiqueta accesible.
- `gx-has-new` activa su aspecto de novedad; `ringBell()` utiliza `gx-ringing` para anunciar nuevas entradas **solo después de verificar una nueva notificación por realtime**.
- Requiere conservar abrir/cerrar sheet, marcar una/todas como leídas, eliminar, deslizar para borrar, **deshacer** cuando aplica, estados vacíos, reconexión/realtime, foco, protección por sesión y limpieza al salir.
- La campana del laboratorio V4.2 es **una demostración `#gxn-bell`**. Su ausencia de contador **no significa** que éste haya sido retirado en producción. **En la integración oficial se reutiliza el nodo/handler original**, adaptando su ubicación/estilo al nuevo header sin clonar otra campana ni redefinir cómo se calcula el badge.

## Inventario vinculante (fuente → comportamiento → prueba obligatoria)

| Área | Interacción existente / fuente oficial | Requisito de conservación en el nuevo feed | Verificación de aceptación |
| --- | --- | --- | --- |
| **Misiones: una completada** | `01d-experience-session.js`: `toggleMission`, `completarMisionInteligente`, `marcarMisionVisual` | El progreso se confirma con `goxionMissionAPI` y actualiza la tarea/checkbox; animación de finalización y confeti breve; aviso «Misión completada»; no celebrar dos veces el mismo estado | Completar tarea nueva y repetir intento; comprobar servidor, confeti/toast una sola vez, avance correcto |
| **Misiones: todas completadas** | `01d-experience-session.js`: `animarMisionesCompletadasEnSecuencia`, `marcarMisionVisual`; `01e-client-dashboard.js` | Secuencia de checkboxes/tareas, logro final, ráfaga final y CTA «reclamar» cuando corresponde, sin saltos de layout | 0/parcial/última tarea/todas completas, apertura y cierre repetidos |
| **Misiones automáticas** | `01d-experience-session.js`: `completarMisionInteligente`, acciones Catálogo/Soporte, compartir y feedback; `07-production-interactions-js.js`: `switchTab` | Los eventos de visita/participación deben seguir registrando progreso. No convertir acciones inteligentes en botones de checklist ficticios | Visitar Catálogo, Soporte, compartir, enviar feedback y corroborar progreso confirmado y no duplicado |
| **Cupón de misiones** | `01c-rewards-referrals.js`: `reclamarCuponSilencioso` | Estado «registrando», confirmación, cambio a «reclamado», confeti posterior y bloqueo de doble reclamo; notificación de administración cuando aplica | Éxito, ya reclamado, falla de red, doble toque, sesión expirada |
| **Referidos** | `01c-rewards-referrals.js`: `reclamarMesGratis`; `01e-client-dashboard.js`: progreso y CTA; CSS `.pulse-referral` / `.gx-referral-ready` | Pulsos y progreso con datos reales, reclamo de mes gratis, estado reclamado y celebración; preservar reglas 3 meses | Sin referido, progreso parcial, listo, reclamado, error, duplicados |
| **Lealtad** | `01e-client-dashboard.js`, `05-gamification-shared-morph-js.js` | Racha, progreso, condiciones y cambios de estado; preservar animación de apertura y cierre, emojis expresivos, sin recalcular racha en UI | Racha 0/parcial/alcanzada/reiniciada; condiciones y consulta |
| **Morfología de beneficios** | `05-gamification-shared-morph-js.js` | Misma tarjeta compacta pasa a expandida; animación de emoji y entrada escalonada; cancelar animaciones finalizadas que dejen residuos; `prefers-reduced-motion` | Tocar repetidamente Lealtad/Referidos/Misiones en Safari; sin tarjetas flotantes, bloqueos ni animaciones residuales |
| **Campana y badge** | `04-client-notifications-realtime.js` + `realtime-client-notifications.css` | Contar sin leer, badge dinámico y `99+`, globo que expande, estado «nueva», animación de campana sólo cuando hay novedad real | 0/1/2/99/100 sin leer; marcado como leído; badge correcto y sin aviso duplicado |
| **Gestos de notificación** | `04-client-notifications-realtime.js` | Sheet real, swipe-to-delete, confirmaciones de borrar/leer todo, feedback y posibilidad de deshacer, protección de scroll | Eliminar una, deshacer, marcar una/todas, vaciar, abrir/cerrar sobre iPhone |
| **Realtime, sesión y cuenta** | `04-client-notifications-realtime.js` + `02-client-supabase-layer.js` | Actualizar la campana por eventos y reconexiones; al cambiar sesión o salir limpiar la anterior sin mezclar datos de clientes | Dos sesiones, foreground iOS, conexión intermitente, logout/login de otra cuenta |
| **Navegación cápsula** | `07-production-interactions-js.js`: `switchTab`; `03-nav-controller.js`; CSS `.tab-btn.active` | Mantener tres destinos, indicador/morph activo y navegación funcional. El sticky centrado V4.2 es solo el tratamiento visual de laboratorio; no debe crear una segunda fuente para `switchTab` | Inicio/Mi Espacio, Catálogo y Soporte, vuelta/atrás, estado activo, reducción de movimiento |
| **Acceso/Salir** | `07-production-interactions-js.js`: `gxAuthRootClick`, `openAuthSheet`, `toggleAuth`, `cerrarSesion` | Conservar morph de inicio de sesión, recuperación de acceso y logout real. El avatar Goxy y «Salir» del laboratorio son **mock**, no reemplazan estos handlers | Invitado/autenticado, PIN, cerrar sesión, expirada, overlay/foco |
| **Servicios** | `01e-client-dashboard.js`: `gxToggleServiceCard`, `gxAnimateCatalogArrow`, `gxRevealServicePin`, `gxRevealCredential`, `gxSubmitServiceCancellation`, `gxOpenServiceSupport`, estado/novedades | Preservar flecha→X, detalle, copiar/revelar PIN seguro, credencial de una consulta con PIN GOXION, cancelar sin eliminar antes de ser efectiva, alertas por prioridad, soporte contextual y estados. Efecto visual puede modernizarse; ninguna acción debe desaparecer | Servicio activo, alerta, credencial nueva, PIN, solicitud/aprobación/rechazo/baja efectiva, menú soporte, varios perfiles |
| **Hero/cuenta** | `01d-experience-session.js`: `iniciarSaludoDinamico`; dashboard/Edge financiero; contrato Hero aprobado | Conservar saludo vivo, microtransiciones y estados reales de cuenta; **priorizar el contrato nuevo de Hero** para ritmos, márgenes y estilo, no copiar intervalos antiguos si fueron sustituidos visualmente | Al corriente, por vencer, vencido, revisión, prórroga, dos fechas, saludo 1 y 2 líneas |
| **Catálogo y carrito** | `01f-catalog-orders.js`: `gxMorphBrandCard`, controles/animaciones, `GOXION_CART`; `10-catalog-morph-production-script.mjs` | No perder transformación de tarjetas, selección, variación de planes, totales/carrito y confirmaciones. **No confundir el Catálogo real con las tarjetas ficticias del laboratorio** | Abrir/cerrar, cambiar planes, agregar/quitar, carrito y navegación |
| **Soporte** | `01g-support-runtime.js`: `gxOpenSupportMorph`, `gxSupportFlip`, `gxSupportAnimateCardHeight` | Mantener tarjeta que se transforma en el mismo elemento, etapas de ayuda, cambios de altura suaves, soporte por plataforma y botón de cierre; sin segunda interfaz | Elegir plataforma/incidencia, abrir/cerrar, múltiples intentos, Safari |
| **Goxy asistente real** | `preview/goxion-ai/mascota.js` **cargado por `ayuda.html` oficial** y dependencias F17 | Mantener **asistente real, expresiones/moods, interacción de tocar y acariciar, apertura del chat, soporte y handoff**. El nuevo avatar de Goxy en cabecera es solo un rostro/recurso adicional; **no debe reemplazar el asistente oficial** | Saludo, tocar, deslizar, abrir/cerrar chat, solicitar ayuda, sesión inválida |
| **Bienvenida y activación** | `01b-welcome-registration.js` y scripts de activación de `ayuda.html` | Mantener animación compartida de bienvenida, pantallas de activación/autenticación y accesos; respetar `prefers-reduced-motion` | Primera sesión, registro, cierre/reapertura, recuperación |
| **Revelar contenido/avisos** | `01d-experience-session.js` (`revealOnScroll`), scripts de novedades/legal, UI del estado de cuenta | Revelados pertinentes, avisos y progreso real del estado de cuenta; no duplicar tarjetas, ni reiniciar novedades que ya fueron presentadas sin regla | Abrir Estado de cuenta, revisión de pago, novedad nueva, cambio de sesión |

## Diferencia explícita entre conservar funciones y repetir el aspecto antiguo

La regla no es “copiar todas las animaciones viejas”, ni prohibir cambios de estilo:
- **Invariantes:** evento real, verificación del servidor, permisos, progreso, recompensa, acción, estado, prioridad, accesibilidad, feedback y navegación. Nada de esto puede desaparecer.
- **Rediseñable:** material, color, grosor, distancia, tipo de transición, amplitud del confeti y disposición; siempre dentro del ADN aprobado y sin reflujo molesto.
- **No aprobado como función de producción:** confeti de mentira sin tarea confirmada, campana `gxn-bell` y su popup ilustrativo, foto de avatar en memoria, historial ficticio, ahorro de ejemplo y cualquier controlador de escenarios. **Ninguno se migra como lógica real.**
- **Protección de movimiento:** respetar `prefers-reduced-motion`; cuando sea apropiado, reducir confeti y animaciones en vez de bloquear acciones. No mostrar alertas visuales duplicadas sobre la misma operación.

## Condición de integración oficial (obligatoria y verificable)

**No se puede marcar el nuevo feed como “completo” solo por verse idéntico al laboratorio.** Antes de cambiar `ayuda.html` se necesita mapa 1:1 de cada botón y cada evento a su handler/fuente oficial, con pruebas de regresión:
1. **Misión:** confirmar tarea en backend → checkbox y progreso → toast y confeti breve → recompensa disponible solo si completada → reclamo confirmado → celebración sin duplicados. Probar caso de falla y modo reducido.
2. **Notificaciones:** crear novedad con cuenta de prueba → contador sin leer y ringing en realtime → abrir sheet → marcar/eliminar/deshacer → badge actualizado → cerrar sesión y verificar limpieza de datos.
3. **Beneficios y servicios:** abrir/cerrar, feedback y estado persistente; cancelaciones, credenciales y soporte conservan handlers y permisos.
4. **Navegación/header:** `switchTab` y auth reales; nueva cápsula V4.2 no se superpone a la antigua `#sticky-client-bar`; Goxy avatar no reemplaza asistente real.
5. **Resto de experiencia:** Catálogo, Soporte, modales, acuerdos legales, nuevas notificaciones y scroll no se degradan al integrar el nuevo feed.
6. Ejecutar `npm run verify`, pruebas específicas y QA real en iPhone/Safari; **en este corte no se han ejecutado estas pruebas en la página nueva conectada**.
7. Confirmación explícita del usuario con evidencia de los flujos operativos y de las microinteracciones. Sin esto, **NO publicar**.

### Etiquetas de seguimiento
- **Oficial, comprobado por código:** handlers y estilos del listado presentes en `main` al cierre de esta auditoría.
- **Diseño de laboratorio:** apariencia ensayada, sin conectividad real con datos de clientes.
- **Pendiente:** conectar, probar y aprobar en la rama de integración futura.

**Fuentes primarias revisadas:** `ayuda.html`; `assets/js/ayuda/{01b-welcome-registration.js,01c-rewards-referrals.js,01d-experience-session.js,01e-client-dashboard.js,01f-catalog-orders.js,01g-support-runtime.js,03-nav-controller.js,04-client-notifications-realtime.js,05-gamification-shared-morph-js.js,07-production-interactions-js.js}`; `assets/css/{ayuda.css,realtime-client-notifications.css}`; `preview/goxion-ai/mascota.js`; `preview/experiencia-mi-espacio-inteligente/{morph-v2.html,adaptive-top-nav.js}`. Este documento es un **inventario del código**: no afirma que se hayan ejecutado todos los flujos reales con una cuenta de prueba.
