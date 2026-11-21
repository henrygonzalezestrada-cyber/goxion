> **DOCUMENTO HISTÓRICO.** Esta versión correspondía al piloto o a una etapa previa. El estado oficial y las reglas desplegadas están en [Lanzamiento general del 21/11/2026](./LEGAL_V2_LANZAMIENTO_GENERAL_2026-11-21.md).\n\n# GOXION — Auditoría de endpoints para restricciones legales v2.0
Fecha: 21 de noviembre de 2026
Alcance de las restricciones implementadas: exclusivamente Cliente Prueba. El consentimiento v2.0 sí está disponible para todas las cuentas.

## Funciones Edge revisadas, protegidas y activas

| Función | Versión | Regla del piloto |
|---|---:|---|
| legal-consent-v2 | 5 | Devuelve decisión y acceso desde servidor |
| mi-espacio | 19 | Deniega mutaciones y datos comerciales si está restringido |
| mi-espacio-beta | 10 | Cierra acceso a la ruta antigua |
| cancelaciones-cliente | 5 | Sin cancelaciones nuevas al rechazar |
| credenciales-cliente | 5 | Sin credenciales una vez restringido |
| accesos-cliente-beta | 4 | Sin accesos desde ruta antigua |
| comprobantes-b2-beta | 5 | Sin comprobantes nuevos para renovación; soporte mantiene aclaraciones |
| estado-financiero-b2-beta | 12 | Sin prórrogas nuevas |
| notificar-goxion | 6 | Sin pedidos autenticados del cliente rechazado |
| opiniones-goxion | 3 | Sin opiniones nuevas tras restricción total |
| admin-acciones | 14 | No añade servicios/beneficios ni reactiva contratos dados de baja |
| acciones-financieras | 13 | No crea promociones, beneficios ni fechas nuevas |
| acciones-financieras-b2-beta | 14 | Protege lo anterior y la activación B2 |
| admin-ajustes | 4 | Sin asignaciones de referidos, misiones o cupones |
| admin-ajustes-beta | 10 | Protege ruta histórica |
| admin-operaciones | 13 | Protege referidos; conserva confirmación manual de baja |
| admin-operaciones-beta | 6 | Protege ruta histórica |
| beneficios-admin-beta | 3 | No crea beneficios manuales |

## Otras rutas analizadas, intencionalmente permitidas

- estado-financiero, estado-cuenta-beta, periodo-cobro y trato-justo: consultas, aclaraciones y conciliación de pagos previos. Las escrituras administrativas exigen token Admin.
- notificaciones-cliente, novedades-cliente: lectura/marcado de avisos, no contratación.
- promociones-catalogo: datos de promociones, no adquisición autónoma.
- registro-goxion: registro de interesados, sin contratación automática; requiere aprobación.
- promociones-admin-beta, cancelaciones-admin: campañas globales y bajas administradas, sin adquisición comercial autónoma desde sesión cliente.
- goxy-ai-beta: soporte informativo.
- Pedidos ANÓNIMOS: se dejan habilitados para visitantes nuevos. No es posible asociarlos de forma fiable con una cuenta que haya rechazado sin identidad autenticada. No crean servicios directamente; las altas en Admin están protegidas en el piloto.

## Comprobaciones de seguridad

- Todas las 18 funciones listadas se verificaron ACTIVE después del despliegue, con verificación de estado legal desde el servidor.
- Funciones SQL de consulta y baja del piloto: anon y authenticated no tienen permiso de ejecución; acceso mediante service role y sesión validada.
- Tabla de bajas con RLS. Un trigger de bloqueo de fila impide una carrera entre la aceptación y la baja administrativa del cliente de prueba.
- Transacción temporal con rechazo: estado restringido y bloqueo de operaciones confirmados; se ejecutó ROLLBACK sin guardar una nueva decisión.
- Se conservaron los registros previos de las pruebas que realizó el operador: 3 decisiones y 1 baja interna registrada en Cliente Prueba al verificar.
- Security Advisors: una advertencia no relacionada (extensión pg_net en esquema public) y avisos informativos RLS sin políticas por acceso restringido a funciones autorizadas.

## Bloqueo objetivo para lanzamiento general

Conteo en Supabase a 21/11/2026: 21 clientes, 39 servicios activos. De estos, 37 servicios activos de 18 clientes todavía no tienen una fecha de cobertura verificada en el calendario usado por la restricción.

No es seguro inferir el fin de una cobertura desde el día de pago o desde fechas históricas: se podrían retirar servicios pagados. POR ESO la restricción automática permanece solo en Cliente Prueba. Los términos y decisiones 2.0 continúan disponibles para todos.

Para liberar a todos: verificar cobertura pagada de esos servicios sin cambiar pagos; probar múltiples fechas y comprobantes; generalizar la política de acceso y las alertas; limpiar nombres de piloto antes del despliegue definitivo.

La revisión técnica de endpoints está ejecutada, pero no se afirma un pentest ni pruebas con cada sesión real.
