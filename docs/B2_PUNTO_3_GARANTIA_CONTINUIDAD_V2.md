# GOXION · Punto 3 — Garantía de Continuidad y Trato Justo
**Estado: esquema de expedientes desplegado y verificado; API y UI en preparación, sin activación financiera de nuevas reglas.**

## Auditoría del sistema oficial
- Ya existe `trato_justo_compensaciones` con clave única por servicio y mes, `dias_falla` de 0 a 10 y `porcentaje` máximo 50. Actualmente hay **8 registros históricos y 0 activos**.
- `assets/js/admin/12-admin-v10-trato-justo-controller.js` ofrece un selector de “motivo”, incluye mantenimiento de plataforma y aplica inmediatamente 5% por día. **No acredita ni conserva prueba de origen GOXION, reporte de cliente, ni periodo comprobado.**
- `assets/js/admin/19-admin-trato-justo-masivo-controller.js` permite descuentos masivos sin validar causas. 
- `acciones-financieras` llama a `trato-justo` para guardar/eliminar sin identidad de incidente; `trato-justo` v3 mantiene los cálculos actuales.
- Ayuda tiene soporte que genera avisos y envía a WhatsApp, pero no un expediente estructurado verificable con fecha de reporte, servicio afectado y decisión en Admin.

## Regla de negocio — acordada
1. El cliente puede notificar oportunamente el problema por **cualquier canal oficial**, incluyendo WhatsApp o trato directo. Si usa Mi Espacio, la fecha real de recepción se guarda en servidor; ninguna captura de formulario será condición obligatoria para que Admin aplique una compensación.
2. Admin decide y documenta de forma práctica el motivo y los días completos reconocidos. Puede asociar un expediente verificado si existe, pero **el expediente y su validación no son un candado obligatorio** para la aplicación manual. Las fallas de plataformas externas **no generan por sí mismas** el descuento comercial GOXION.
3. Se conserva la decisión administrativa: **5% por día completo**, máximo **50% del servicio afectado** en el periodo; no sobre otros servicios ni sobre mora. La garantía comercial ordinaria corresponde a incidencias atribuibles a GOXION, sin impedir que el operador otorgue una cortesía comercial excepcional. Un reporte nunca genera descuento automático.
4. Evitar doble compensación. La restricción actual única por (servicio, periodo) se conserva para evitar duplicaciones; una incidencia posterior del mismo periodo requiere sumar días verificados sin duplicar beneficios, hasta 10 días.
5. Conservar remedios legales aplicables, aun cuando la falla sea del proveedor.
6. Registro de hechos, revisión, identificación del operador y compensación, consultables en Admin y en resumen del cliente. No solicitar ni mostrar contraseñas, PIN ni credenciales en reportes.

## Preparado
- `docs/sql/GOXION_GARANTIA_CONTINUIDAD_V2_PREPARACION.sql`: expediente por servicio, fecha server, atribución, evidencia y días completos verificados; RLS habilitada y acceso restringido a funciones autenticadas con `service_role`. Enlace opcional a la compensación, preservando históricos.
- SQL comprobado primero con `ROLLBACK` y después aplicado como migración `goxion_garantia_continuidad_incidentes_v2` en Supabase. Comprobación: cero incidencias, columna de vinculación existente, RLS activa y sin lectura directa por `anon` ni `authenticated`.
- Archivos de API preparados **solo en rama**, sin desplegar: `docs/backend/trato-justo-v4-incidencias.ts`, `docs/backend/acciones-financieras-v13-garantia.ts` y `docs/frontend/financial-actions-garantia-v2.js`. Exigen incidente validado de causa GOXION antes de descuentos individuales o masivos.
- Las funciones oficiales `trato-justo` y `acciones-financieras` mantienen la versión anterior mientras se integra la captura y aprobación completa, para no cortar la operación financiera existente.

## Secuencia pendiente para finalizar el punto 3
1. Opcional: API privada `reportar_incidencia` con sesión cliente y selección de servicio propio; jamás requisito de compensación.
2. Admin: consulta opcional de incidencias y espacio para observaciones; mantener intacta la aplicación manual directa.
3. Conservar escrituras individuales y masivas de `trato-justo` sin exigir expediente; permitir vínculo opcional con incidencia validada. El motor financiero sigue como fuente única.
4. Conectar UI de Ayuda y Admin a los endpoints; mostrar estado reportada/validada/descartada sin exponer información sensible.
5. QA con cliente de prueba: 1 y 10 días, fallo ajeno a GOXION, reporte tardío sin evidencia, varias fechas, varios servicios, solicitud duplicada, compensación repetida, pago en revisión, actualización del saldo.
6. Desplegar coordinado, verificando que los históricos y descuentos vigentes no se alteren.

**No se incluyen cambios en pop-up de términos ni consentimiento: siguiente bloque acordado.**

## Ajuste de alcance — decisión del usuario (19/nov/2026)
La interfaz y operación **actual** de Trato Justo en Admin son suficientes como base. El usuario administra personalmente compensaciones; no desea imponer registro por Mi Espacio ni validación previa forzosa. Se ajustaron los archivos preparados `trato-justo-v4-incidencias.ts` y `acciones-financieras-v13-garantia.ts` para dejar `incidencia_id` opcional y mantener la acción manual. **No desplegar una variante que bloquee los descuentos cuando el cliente no haya generado reporte web.** La migración de tabla creada se conserva exclusivamente como mecanismo opcional de trazabilidad y no obliga a usarla.
