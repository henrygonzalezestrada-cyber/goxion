# E3/B5 · Incidencias preventivas — Beta enfocada (19/oct/2026)

**No integra GOXION oficial.** Este preview comprueba una función nueva dentro de los componentes visuales previamente aprobados, no pretende recrear toda Ayuda o Admin. La copia absolutamente fiel de la oficial se realizará una única vez al cerrar la ruta completa, según Issue #142.

## Para revisar
Abrir `preview/experiencia-e3-b5-alertas-preventivas/index.html` desde un servidor de archivos o el servicio Railway de pruebas. El botón flotante **Probar Incidencias en Admin** representa el selector ya existente en Admin → Experiencia → Incidencias 2.0 (sin acceder a su sesión real). Seleccionar **ViX Premium**, activar una falla y cambiar los clientes de prueba:
- **Cliente A (ViX)**: aparece **el banner superior original de Ayuda** y un aviso en **la campana existente**; el servicio muestra **Temporalmente inactivo**. Gixy de notificaciones reutiliza el diseño B3/V7 y dirige a Goxy; no se crea otro asistente.
- **Cliente B (Netflix)**: sin banner, sin aviso ni Gixy por esa falla.
- **Cliente C (ViX + Max)**: aviso único por cliente, no dos avisos. La prueba admite combinación de contratos afectados por el mismo incidente.
- **Visitante / suspendido / acceso cancelado**: sin aviso dirigido.
- Abrir la **campana**, leer y cerrar: cambia el estado leído. Repetir la confirmación idéntica no emite un segundo aviso.
- Pulsar **Resolver falla**: desaparece el banner, los servicios regresan a Activo y el historial de la campana conserva el evento marcado resuelto.
- Los importes, pagos, compensaciones de Trato Justo, contrataciones y acciones reales permanecen inalterados.

## Propietarios de negocio existentes
La fuente única futura es Admin Incidencias 2.0, no esta UI de pruebas. `guardar_alerta` actual todavía persiste `{activa,plataforma,falla,mensaje}` (una alerta global por nombre); no proporciona aún ID/version/confirmación/autorización para avisar. Se requiere **migración/control transaccional en backend** y validación estricta `servicios.id` ↔ `cliente_servicios.servicio_id` antes de notificar en serio. El banner actual es global; habrá que condicionar su visibilidad al cliente autenticado afectado. Las notificaciones irán a la única infraestructura de Admin Comunicaciones / `cliente_notificaciones` / `notificaciones-cliente` con dedupe server-side. La beta solo simula ese contrato, no concede permiso para envío.

**QA:** `node preview/experiencia-e3-b5-alertas-preventivas/check.mjs` prueba la política pura (16 casos). `node preview/experiencia-e3-b5-alertas-preventivas/check-browser.mjs` usa Playwright sobre HTML/CSS/JS aprobados: Chromium y WebKit, 7 anchos móviles/tablet, cliente afectado/no afectado, guest/suspendido, lectura, duplicados, resolución, ningún acceso privado. PR draft #170 y bloqueo global #142.
