# Auditoría de integración Admin ↔ Ayuda ↔ E3/B5 (19/oct/2026)
**Resultado de inspección:** sí existe un sistema de incidencias real; duplicarlo rompería el contrato visual y multiplicaría avisos.

## Componentes oficiales encontrados (leer antes de modificar)
| Propietario | Ruta / identificador | Lo que existe |
|---|---|---|
| Admin, Incidencias 2.0 | `admin.html` → `data-settings-view="alerts"` | Selector `#alert-platform`, tipo `#alert-type`, mensaje `#global-msg`, switch `#alert-active` y vista previa `gxUpdateIncidentPreview` |
| Guardado de incidencias | `assets/js/admin/03-supabase-v3-writes.js` | `gxSaveSettings()` llama `accion("guardar_alerta", {activa,plataforma,falla,mensaje})` |
| Cambio desde expediente | `assets/js/admin/13-admin-ayuda-bridge-controller.js` | `gxToggleServiceIncident` reutiliza **el mismo** `guardar_alerta`, no un sistema paralelo |
| Ayuda, banner existente | `ayuda.html` → `#dynamic-alert` / `#alert-content` | Banner original cerca de la cabecera; respetar posición/clases y no insertar otro |
| Render actual del banner | `assets/js/ayuda/01f-catalog-orders.js`, `cargarCatalogo` | **Cualquier visitante** ve el banner si `config.alertas.activa`; NO comprueba si el cliente tiene esa plataforma |
| Estado de servicio contratado | `assets/js/ayuda/01e-client-dashboard.js`, `gxServiceHasAlert(name)` | Detecta coincidencia por nombre normalizado o prefijo para mostrar `Temporalmente inactivo` |
| Administración de estado por servicio | `assets/js/admin/13-admin-ayuda-bridge-controller.js`, `gxAdminServiceHasAlert(name)` | También coincide por **nombre**, no por ID de catálogo |
| Campana única | `assets/js/ayuda/04-client-notifications-realtime.js`, `docs/edge/notificaciones-cliente.ts` | Cliente consulta `cliente_notificaciones` y `cliente_servicio_novedades` de forma autenticada |
| Emisor único de avisos | Admin → Comunicaciones y `docs/COMUNICACIONES.md` | Motor existente de campañas, público validado y deduplicación; no construir envío nuevo |
| Cliente y servicio canónico | `cliente_servicios.servicio_id` → `servicios.id` | Comparación exacta por ID y vigencia, desde backend; no usar coincidencia por cadena |

## Riesgos concretos verificados
1. `alertas` es en la interfaz actual un **objeto global con una sola alerta activa**, con `plataforma` como texto. Marcar otra plataforma puede pedir reemplazar la anterior: NO aceptar simultaneidad sin ampliar modelo existente deliberadamente y migrarlo.
2. El banner superior **hoy es global**, incluso en vista pública: no es un aviso segmentado al cliente. Publicar en campana solo a afectados sin corregir criterio del banner daría mensajes contradictorios.
3. La coincidencia por nombre o prefijo en Admin y Ayuda puede marcar servicios similares como afectados. No usarla para seleccionar destinatarios; mantener compatibilidad de visualización antigua hasta contar con `servicio_id` estable.
4. Un `alerta.activa===true` **no aporta** por sí mismo `incidentId`, `revision`, `confirmedBy`, `confirmedAt`, lista de `serviceIds`, etc. **No convertir ciegamente el guardado actual en un envío automático.** Validar la incidencia y completar identidad oficial antes.
5. Hay flujo de **Trato Justo** para compensar fallas en `assets/js/admin/19-admin-trato-justo-masivo-controller.js`; el aviso de incidencia NO debe descontar ni conceder por sí mismo ningún monto.

## Contrato visual y operativo para E3/B5
- **Admin es la fuente única.** El gerente escoge el servicio y tipo de falla en Incidencias 2.0 y guarda. El servidor confirma y vincula **ID de servicio** y versión de incidencia. La interfaz no se duplica. Si el estado es solo borrador/no verificado, no se generan avisos segmentados.
- **Una incidencia = un evento con superficies relacionadas**, no tres campañas: (a) estado contextual de servicio, (b) banner superior EXISTENTE mientras persista una falla y el cliente autenticado tenga ese servicio, (c) una notificación en campana con dedupe/idempotencia por cliente y revisión; Gixy puede anunciar solo el evento de notificación nuevo y prioritario. No añadir una tarjeta independiente. Sin sesión o servicio afectado, el banner dirigido se oculta; una indisponibilidad de catálogo pública es un caso aparte a decidir, no se disfraza de aviso personal.
- **Enviar únicamente a afectados:** un cliente con dos accesos afectados recibe **un aviso** por incidente/revisión, manteniendo detalle de los servicios. Excluir suspendidos, cuentas de prueba, no contratados y servicios cancelados, con revalidación justo antes de entrega. La campana recupera la notificación mediante `notificaciones-cliente`, no un feed paralelo.
- **Al resolver la falla:** actualizar la misma incidencia, ocultar el banner y devolver el servicio a `Activo`; evitar repetir la primera notificación; eventual aviso de resolución solo con evento/versión distintos y reglas autorizadas.
- **No reabrir diseños B1/B3.** Conservar Gixy notificaciones cercano a campana, botón a Goxy debajo del globo y tarjeta dinámica original. Reusar el modal y encabezado superior actuales.
- **QA obligado:** Admin guardar/incidente confirmado → copia de datos → audiencia exacta → banner solo afectados → campana una vez → marcar leído → reconexión → resolver → desaparecer banner/estado; pruebas público/no afectado/varias cuentas/servicios con nombres similares/concurrencia multiincidente.
- **Límite:** este documento es auditoría y contrato propuesto para beta. Nada de lo anterior está conectado todavía a backend real; NO modificar oficial ni enviar a clientes. Conservar Issue #142 abierto.

## Interfaces relacionadas de las otras novedades
- **Lealtad/5% secreto:** tomar del motor de pagos/beneficios y registrar el cupón desde backend; Admin de misiones y promociones no debe calcularlo otra vez.
- **Misiones:** eventos reales desde `gamificacion`/`cliente_misiones_progreso`; no acreditar progreso por tocar un Gixy.
- **Notificaciones/Estado de cuenta:** usar `cliente_notificaciones` y las obligaciones del motor B2, no otro almacén. Admin controla el negocio, Ayuda muestra el resultado.
