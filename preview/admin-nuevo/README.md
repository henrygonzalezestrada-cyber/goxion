# GOXION Admin — propuesta desde cero

Primera entrega interactiva, 15 noviembre 2026. Estado: **prototipo**, no reemplaza Admin productivo. Autorización expresa del usuario para una composición nueva: los contratos visuales antiguos no se usan como referencia estética. No se copian HTML, CSS ni JavaScript de los rediseños anteriores.

## Alcance implementado

- Inicio orientado a pendientes y próximas renovaciones.
- Clientes con búsqueda por nombre, folio o servicio (sin sensibilidad a acentos), filtros y expediente.
- Expediente con resumen, servicios, actividad y transición de elemento compartido donde View Transitions esté disponible; alternativa inmediata y reduced motion.
- Operaciones con filtros, revisión reversible de seguimiento y reorganización animada.
- Notificaciones enlazadas al expediente, lectura y un evento simulado explícito.
- Navegación de Gestión con destinos documentados como pendientes de integración.
- HTML autónomo sin dependencias ni peticiones de red. Datos ficticios en memoria, reiniciados al recargar.

## Dirección y fuentes

Contenido antes que contenedores; fondo frío neutro, tinta grafito y acento índigo localizado. Jerarquía tipográfica, espaciado consistente, detalle bajo demanda y movimiento al servicio del cambio de estado. Las tarjetas son unidades de cliente, no cajas alrededor de cada sección.

Fuentes investigadas: https://vercel.com/design/guidelines ; https://github.com/anthropics/skills/tree/main/skills/frontend-design ; https://github.com/nextlevelbuilder/ui-ux-pro-max-skill ; https://github.com/pbakaus/impeccable ; https://motion.dev/docs/react-layout-animations . La implementación usa CSS y APIs nativas; no instala React ni cambia la arquitectura productiva.

## Integración pendiente — preservar propietarios

| Superficie nueva | Propietario existente que debe conservarse |
|---|---|
| Datos y refresco | Modelo de Admin y `31-admin-realtime.js`; evento `goxion:admin:updated` |
| Revisar pagos | Controladores actuales y motor financiero oficial; sin cálculos de saldo en la nueva vista |
| Cancelación efectiva | Flujo `gxMakeCancellationEffective` y recarga `gxReloadAdminClient` |
| Notificaciones | Bandeja e identidades de notificación existentes; sin segundo estado leído/no leído |
| Servicios, beneficios y accesos | Propietarios descritos en `docs/ADMIN_FUNCTION_REGISTRY.md` |

La revisión del prototipo solo marca **seguimiento**. No aprueba ni rechaza pagos, no modifica saldos, no hace efectiva una cancelación. Gestión todavía no incorpora formularios reales. Antes de integrar: mapear todas las acciones del registro funcional, conectar el mismo modelo, comprobar equivalencia y retirar la antigua capa visual en el mismo cambio de promoción. Los anteriores prototipos permanecen históricos, no fuentes de esta propuesta.

## Validación realizada

- Sintaxis de JavaScript válida.
- Navegador Chromium: apertura de expediente, pestaña Servicios, búsqueda `sofia` → Sofía, evento simulado y aumento de pendientes, revisión de seguimiento y retirada de la cola, filtro Revisados.
- Inspección visual de Inicio en escritorio y marcos de 390, 320 y 280 px.
- Las simulaciones no contactan servidores.
- Limitaciones: sin Safari/iPhone físico, sin pruebas autenticadas, sin integración backend, sin validación completa de todas las pantallas en todos los anchos. No se declara lista para producción.

## Revisión y reversión

Abrir `index.html` directamente o servir esta carpeta. La entrega de revisión se publica separada y privada. Eliminar esta carpeta revierte el prototipo; ningún archivo productivo cambia. La posterior sustitución requiere su propio plan de promoción y rollback.
