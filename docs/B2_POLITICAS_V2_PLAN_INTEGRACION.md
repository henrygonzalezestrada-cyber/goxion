# B2 · Plan de integración de políticas v2 (sin activación de consentimiento)
Estado: **motor B2 desplegado parcialmente** en Supabase y Ayuda oficial (18/nov/2026 UTC).

## Hallazgos comprobados en Supabase
- Edge Function activa `estado-financiero-b2-beta` utiliza RPC de prórroga.
- Funciones SQL `goxion_prorroga_auto_cotizar`, `goxion_prorroga_auto_global` y `goxion_b2_solicitar_prorroga` existen en `public`.
- El SQL actual exige fecha de solicitud **igual** al vencimiento y fecha pactada **máximo +5 días**. La función también contiene `lealtad_perdida` y una restricción de solapamiento con otros vencimientos; esto contradice las nuevas reglas y debe revisarse antes de cambiar la interfaz.
- La pantalla `assets/js/ayuda/17-b2-prorroga-oficial.js` todavía presenta mensajes con límite de 5 días en su flujo automático.
- Los documentos legales v2 y el lector están en esta rama, pero no se activa consentimiento en este bloque.

## Reglas a implementar en el backend como fuente única
1. Solicitud permitida cuando `fecha_original <= hoy <= fecha_original + 3 días`; fecha pactada `fecha_original < fecha_pactada <= fecha_original + 10 días`. Fechas naturales locales de la operación; no depender del huso UTC del navegador.
2. Cada `cargo_id` se verifica por titular, ciclo, estado, pago e idempotencia; nunca se extiende otro cargo por coincidencia de cliente.
3. La prórroga cumplida exime mora **solo** sobre el cargo afectado. La solicitud sola no la exime; el estado aprobado y la fecha pactada deben persistir.
4. Al pagar después de la fecha original se pierde lealtad, **incluso con prórroga**. Recalcular el importe sin descuento de puntualidad y registrar el cambio una sola vez. No alterar pagos puntuales de otros cargos.
5. Si se incumple la prórroga, mora simple de 5% diario, máximo 50% sobre saldo vencido, sin capitalización ni cargo administrativo del 20%.
6. Retiro posible desde día 11, previa conciliación de pagos y solicitudes pendientes; **solo servicio impagado**. Las cancelaciones voluntarias y por mal uso son estados distintos, auditables.
7. Garantía: reporte y verificación de incidencia atribuible a GOXION; descuento comercial 5% por día completo, máximo 50% del servicio afectado, sin confundir con mora.

## Secuencia técnica de cambio
1. Preparar migración versionada que actualice las RPC de cotización y activación **en una sola transacción**. Conservar firma y contratos JSON actuales o versionarlos de manera explícita.
2. Validar permisos, propiedad, fechas, idempotencia, concurrencia y compatibilidad de registros previos.
3. Ajustar `estado-financiero-b2-beta` y demás consumidores de cotización al nuevo contrato.
4. Actualizar `17-b2-prorroga-oficial.js` y textos de Ayuda. El servidor decide elegibilidad; el cliente solo la representa.
5. Pruebas: vencimiento 15 → solicitud días 15/16/17/18 sí, día 19 no; fecha pactada 25 sí, 26 no; pago en fecha pactada sin mora pero sin lealtad; incumplimiento con tope; dos fechas y baja individual; comprobante pendiente.
6. Despliegue coordinado después de probar en cuenta de prueba y verificar reversión.

## Fuera de este bloque
Popup obligatorio, registro de consentimiento, rechazo y notificaciones persistentes: siguiente bloque solicitado por el usuario.

**Advertencia:** no publicar nuevas reglas de prórroga solo en frontend mientras las RPC de producción sigan aplicando +5 días y solo día 0.

## Avances desplegados y comprobados (18/nov/2026 UTC)
- Migración `b2_politicas_v2_prorrogas_mora_lealtad` aplicada correctamente en Supabase. Las 9 funciones SQL modificadas están almacenadas en `docs/sql/B2_POLITICAS_V2_CAMBIO_PROPUESTO.sql` y el snapshot de reversión en `docs/sql/B2_PRE_POLITICAS_V2_SNAPSHOT.sql`.
- Restricción de fecha pactada en `goxion_b2_prorrogas` ampliada hasta original+10 días y unicidad por ciclo eliminada; permanece unicidad por cargo/operación.
- Edge Function `estado-financiero-b2-beta` desplegada como versión 9, con elegibilidad 0–3, selección de cargos individuales y revisión de comprobantes por cargo.
- `assets/js/ayuda/17-b2-prorroga-oficial.js` y `ayuda.html` actualizados en `main` con mensajes, 10 días y versión de caché actualizada. También se actualizaron los resúmenes de pagos/garantía/lealtad de los modales existentes, **sin activar pantalla de consentimiento**.
- Pruebas en transacción con `ROLLBACK`: cotización a día+7 aceptada, día+11 rechazado, solicitud aprobada, idempotencia, racha perdida, descuento del cargo cancelado y saldo de otros cargos intacto. Prueba de cotización en vivo, **de solo lectura**, devolvió `quote_ok=true`, `descuento_no_aplica=true`, `dias_desde_original=7`.
- No se crearon ni alteraron prórrogas reales durante las pruebas; la tabla contenía 0 prórrogas antes y después de los ensayos.

## Pendiente de este bloque / QA funcional
- Probar sesión autenticada completa con la cuenta de prueba: selección de cargo, cuota mostrada, confirmación efectiva, pago/recibo aprobado y reinicio de lealtad. Esa prueba **no** se ha ejecutado aún de extremo a extremo.
- Revisar con especial atención la lógica de cancelaciones y baja día 11, limpieza de servicios en Admin y cálculo de Garantía de Continuidad por causa atribuible a GOXION y reporte verificable. El motor de prórroga no sustituye esos flujos.
- Consentimiento versionado y notificaciones persistentes quedan para el siguiente bloque por petición expresa del usuario.

## Validación con cliente de prueba y correcciones posteriores
- La cuenta de prueba Luis tiene una prórroga aprobada para el **25/nov/2026** sobre un cargo vigente; su ciclo noviembre conserva otros **dos cargos liquidados e inactivos** como historial, condición legítima tras bajas.
- Error observado: el lector F5 de Ayuda mostraba `b2_sin_estado_cobrable` porque la función `mi_estado` exigía que todo cargo del ciclo perteneciera a un acceso **activo**, incluso si estaba pagado y cancelado.
- Corrección desplegada: `estado-financiero-b2-beta` **v10** admite registros históricos pagados, los separa en `cargos_historicos`, y conserva en `cargos` solo accesos vigentes. Un cargo pendiente e inactivo **continúa bloqueado** para evitar ocultar adeudos sin conciliación. Se comprueba que la suma de activos coincide con el motor B2.
- Validación read-only Luis: 3 cargos del ciclo, 2 históricos pagados, 1 vigente; saldo de cargo vigente **7900 centavos** igual a total del motor. No se borraron pagos ni obligaciones.
- API v11: `mi_prorroga` devuelve `pronostico_incumplimiento` para el cargo pactado, calculado por la cotización oficial B2 en el día posterior a la fecha acordada. Para Luis, **26/nov/2026: total estimado 11850 centavos**, incluidos **3950 centavos** de mora, sujeto a no recibir pagos/ajustes.
- Ayuda en `main` muestra fecha de riesgo, estimación y aviso de acceso sujeto a retiro, además de distinguir **Acuerdo pactado** de **Acuerdo vencido**.
- La suspensión automática todavía no está activada: debe verificarse conciliación de comprobantes, acceso técnico, contrato y ruta de reconexión antes de causar bajas reales. El criterio normativo de prórroga incumplida se incorporó al borrador legal v2, pendiente de publicación de consentimiento.
- Próxima prueba: repetir apertura de ruta al ticket con sesión de Luis, verificar ausencia del aviso y confirmar que no aparecen cargos históricos como servicios actuales.
