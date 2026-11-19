# GOXION · Punto 3 — Garantía de Continuidad y Trato Justo
**Estado: esquema de expedientes desplegado y verificado; API y UI en preparación, sin activación financiera de nuevas reglas.**

## Auditoría del sistema oficial
- Ya existe `trato_justo_compensaciones` con clave única por servicio y mes, `dias_falla` de 0 a 10 y `porcentaje` máximo 50. Actualmente hay **8 registros históricos y 0 activos**.
- `assets/js/admin/12-admin-v10-trato-justo-controller.js` ofrece un selector de “motivo”, incluye mantenimiento de plataforma y aplica inmediatamente 5% por día. **No acredita ni conserva prueba de origen GOXION, reporte de cliente, ni periodo comprobado.**
- `assets/js/admin/19-admin-trato-justo-masivo-controller.js` permite descuentos masivos sin validar causas. 
- `acciones-financieras` llama a `trato-justo` para guardar/eliminar sin identidad de incidente; `trato-justo` v3 mantiene los cálculos actuales.
- Ayuda tiene soporte que genera avisos y envía a WhatsApp, pero no un expediente estructurado verificable con fecha de reporte, servicio afectado y decisión en Admin.

## Regla de negocio — acordada
1. Cliente reporta oportunamente el problema desde Mi Espacio; la fecha real de recepción se guarda en servidor. La fecha indicada por el usuario no se presume verificada.
2. Admin investiga y clasifica `GOXION`, `plataforma externa`, `cliente` u `otro` con evidencia y periodo acreditado. Las fallas de plataformas externas **no generan por sí mismas** el descuento comercial GOXION.
3. Solo tras verificar causa **atribuible a GOXION** se aplica **5% por día completo**, máximo **50% del servicio afectado** en el periodo; no sobre otros servicios ni sobre mora. Nunca se aplica automáticamente por enviar un reporte.
4. Evitar doble compensación. La restricción actual única por (servicio, periodo) se conserva para evitar duplicaciones; una incidencia posterior del mismo periodo requiere sumar días verificados sin duplicar beneficios, hasta 10 días.
5. Conservar remedios legales aplicables, aun cuando la falla sea del proveedor.
6. Registro de hechos, revisión, identificación del operador y compensación, consultables en Admin y en resumen del cliente. No solicitar ni mostrar contraseñas, PIN ni credenciales en reportes.

## Preparado
- `docs/sql/GOXION_GARANTIA_CONTINUIDAD_V2_PREPARACION.sql`: expediente por servicio, fecha server, atribución, evidencia y días completos verificados; RLS habilitada y acceso restringido a funciones autenticadas con `service_role`. Enlace opcional a la compensación, preservando históricos.
- SQL comprobado primero con `ROLLBACK` y después aplicado como migración `goxion_garantia_continuidad_incidentes_v2` en Supabase. Comprobación: cero incidencias, columna de vinculación existente, RLS activa y sin lectura directa por `anon` ni `authenticated`.
- Archivos de API preparados **solo en rama**, sin desplegar: `docs/backend/trato-justo-v4-incidencias.ts`, `docs/backend/acciones-financieras-v13-garantia.ts` y `docs/frontend/financial-actions-garantia-v2.js`. Exigen incidente validado de causa GOXION antes de descuentos individuales o masivos.
- Las funciones oficiales `trato-justo` y `acciones-financieras` mantienen la versión anterior mientras se integra la captura y aprobación completa, para no cortar la operación financiera existente.

## Secuencia pendiente para finalizar el punto 3
1. API privada `reportar_incidencia` con sesión cliente y selección de servicio propio.
2. Admin: lista de incidencias reportadas, comprobación de origen y días, decisión explícita.
3. Endurecer escrituras individuales y masivas en `trato-justo`; el motor financiero sigue como fuente única.
4. Conectar UI de Ayuda y Admin a los endpoints; mostrar estado reportada/validada/descartada sin exponer información sensible.
5. QA con cliente de prueba: 1 y 10 días, fallo ajeno a GOXION, reporte tardío sin evidencia, varias fechas, varios servicios, solicitud duplicada, compensación repetida, pago en revisión, actualización del saldo.
6. Desplegar coordinado, verificando que los históricos y descuentos vigentes no se alteren.

**No se incluyen cambios en pop-up de términos ni consentimiento: siguiente bloque acordado.**
