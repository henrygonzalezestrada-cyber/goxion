# GOXION · Servicios con jerarquía semántica y conexiones oficiales — V1

**Fecha:** 22/nov/2026  
**Estado:** rama de integración / revisión. **No publicada en producción ni probada físicamente en Safari.**  
**Rama:** `feature/mi-espacio-servicios-conectados-20261122`  
**Ámbito:** solo el componente de Servicios en Mi Espacio.

## Decisión de diseño

El usuario aprobó la dirección visual actual de Servicios y pidió cerrar sus estados: verde para funcionamiento normal, amarillo/ámbar para pendientes, naranja para precaución y rojo para alerta. El diseño final no debe convertirse en un arcoíris: fondo de cristal neutro, color solo en el punto, microtexto de estado y microsuperficie de novedades. X aprobada: círculo cian de **35px**, glifo oscuro de **16px**, objetivo táctil **44x44px**.

**Prioridad visual:** fallo/solicitud rechazada (rojo) > incidencia/approved-but-not-effective (naranja) > revisión/contraseña/PIN/novedad (ámbar) > normal (verde). Los datos reales de `novedades` ya incluyen su propia propiedad `prioridad` y fecha. **No sustituir esa prioridad del servidor** ni duplicar cálculos financieros: el primer evento en la vista oficial procede del algoritmo existente de `combinedNotices` y conserva `+N` para los demás.

## Lo conectado y el propietario de cada acción

En la rama, la estructura funcional existente `assets/js/ayuda/01e-client-dashboard.js` se conserva como dueño del componente y `assets/css/ayuda.css` recibe solo estilos scoped a `#view-dashboard .gx-services-stack`. Las acciones originales siguen unidas a sus handlers ya conectados:

| Necesidad | Fuente/handler original | Estado de la rama |
| --- | --- | --- |
| Contratos activos, perfiles y correo | `cliente.servicios`, `s.accesos`, `gxToggleServiceCard`, `gxServiceView` | Se reutilizan |
| Copiar datos / mostrar y ocultar PIN del perfil | `copiarDatoRapido`, `gxRevealServicePin` | Se reutilizan |
| Invitaciones (personal) | `a.modo_acceso`, `estado_invitacion` | Se reutiliza |
| Cancelación solicitada, aprobada, rechazada / retención | `s.cancelacion`, `gxSubmitServiceCancellation`, `gxCancellationApi`, `gxRenderRetentionOffer` | Se reutilizan |
| Retirar servicio al hacerse efectiva la baja | Solo fuentes oficiales de `cliente.servicios` | No se inventa borrado cliente |
| Contraseña pendiente (revelación de una sola consulta) | `s.credencial_pendiente`, `gxRevealCredential`, `credenciales-cliente` | Se reutiliza. No simular credenciales reales |
| Novedades, número adicional, acuse | `s.novedades`, `combinedNotices`, `gxAcknowledgeServiceNotices` | Se reutilizan |
| Soporte | `gxOpenServiceSupport` | Se reutiliza |
| Incidencia de plataforma | `gxServiceHasAlert` | Se reutiliza |

**Cambios reales:** se agrega un atributo de tono semántico calculado a partir de los datos reales que ya recibe el dashboard, y una X SVG de cierre para igualar el laboratorio. No se cambian endpoints ni lógica de solicitudes, pago, perfil o credenciales. Se adapta el diseño únicamente en la sección oficial de Servicios.

**Límite de esta iteración:** la pantalla oficial sigue usando su DOM y sus handlers de Servicios, aunque los estilos se acerquen al laboratorio. El laboratorio `morph-v2.html` continúa con datos ficticios. **No significa que toda la composición experimental del feed (hero, beneficios, ahorro, navegación) haya sido migrada**, ni que la conectividad haya sido probada aún con una cuenta real.


## Novedades múltiples sin saturación

Cuando `combinedNotices` trae más de un evento, la primera novedad conserva la prioridad oficial del servidor y se marca como primaria en el resumen con `+N`. Dentro de la tarjeta abierta aparece un `<details>` accesible llamado «Otras novedades (N)», pero **no duplica** `password` cuando ya hay `credencial_pendiente`: el botón oficial de contraseña de una sola consulta conserva la responsabilidad de esa operación. Los otros resúmenes están escapados y solo se consultan bajo demanda; no se agregan acciones paralelas ni acuses automáticos nuevos.

**Validación pendiente:** confrontar conteos de `+N` con las novedades que ya se presentan mediante la tarjeta de credencial, y revisar variaciones de varios avisos reales sin perder el foco ni el contenido al refrescar.

## Corrección visual LOCAL en Servicios · no generalizar al feed

Tras evaluar el laboratorio, el usuario **rechazó explícitamente** la línea de color que aparecía bajo el logo al abrir Servicios y el copy demasiado extenso en las tarjetas. Se eliminó del laboratorio tanto el separador con gradiente como el separador neutro; no sustituir por otra raya. **Dentro de Servicios**, el estado semántico se limita al indicador y al texto necesario. Esta restricción no afecta barras de progreso, emojis, títulos contrastados, morph, separaciones de tareas, logos flotantes ni contador de las otras tarjetas.

En esta rama se aplicó `#view-dashboard .gx-service-divider{display:none!important}` y se quitaron bordes decorativos del disclosure de novedades. Los textos oficiales y recorridos de backend aún **no se deben resumir mecánicamente** si son necesarios para consentimiento, seguridad o información contractual: priorizar la vista compacta y usar disclosure/vistas específicas para el detalle completo.

**Bloqueo de aprobación visual de Servicios únicamente:** antes de fusionar el PR, confirmar logo, nombre, estado y cierre en compacta; avisos breves no redundantes y contenidos legales/sensibles accesibles cuando corresponda. No agregar elementos ornamentales gratuitos **en este módulo**. Las microanimaciones funcionales de beneficios, ahorro y catálogo permanecen fuera del alcance.

**Contrato superior vigente:** [GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md](https://github.com/henrygonzalezestrada-cyber/goxion/blob/main/docs/GOXION_FEED_CONTRATO_VISUAL_POR_COMPONENTE_2026-11-22.md). Esta rama NO puede redefinir las reglas de Lealtad, Referidos, Misiones, Ahorro, Hero, Catálogo ni otras experiencias.

## Escenarios mínimos antes de fusionar

- Verificar en iPhone/Safari físico 280, 320, 360, 375, 390, 430 y 768px, incluyendo longitudes de textos y `+N`; no cortar notificaciones ni superponer la X.
- Probar servicios activo, interrumpido, sin servicios, invitación activa/pendiente, uno o más perfiles y múltiples accesos.
- Abrir/cerrar tarjetas, cierre durante animaciones, scroll y restablecer PIN oculto. Control de accesibilidad: lector VoiceOver, teclado, foco visible y objetivo táctil 44px.
- Cancelación solicitada/aprobada/rechazada; oferta de retención; baja efectiva (servicio desaparece de panel cliente y panel administrativo cuando backend lo confirma). Ninguna aprobación debe ocultar prematuramente el servicio.
- Nueva contraseña: exigir PIN GOXION, revelación una sola vez, ocultar y reintento ante error. No usar ni almacenar contraseñas reales en fixtures.
- Novedades simultáneas: revisar orden de prioridad ya existente y `+N`; acuse de lectura y cambios realtime en pantalla abierta.
- Confirmar que no cambian los flujos de pagos, calendario, Admin, ayuda/catálogo e Index. Ejecutar pruebas de integridad de repositorio y smoke Safari.

## Reversión y aprobación

Sin fusión, deshacer la propuesta consiste en **cerrar el PR o eliminar su rama**: `main` conserva el código oficial. Si se fusiona después de validar, revertir el commit de adaptación visual/CSS y restaurar la plantilla original de `gx-service-expand-icon`; las rutas originales permanecen intactas, de modo que ninguna migración de datos es necesaria.

**No afirmar que el rediseño conectado está publicado** antes de fusionar el PR y completar las pruebas.
