# GOXION · Auditoría de Ayuda, Admin y Supabase · Términos v2.0
**Corte: 19 de noviembre de 2026 (UTC)**

## Resultado operativo
- **Ayuda:** el modal existente `modal-terminos` contenía solo un resumen operativo; no presentaba los documentos completos. Se conserva el modal y su estilo, con lectura desplazable y pestañas para Términos, Referidos y Cupones.
- **Admin:** no hizo falta alterar los módulos de pagos B2, prórrogas, cancelaciones, soporte ni Trato Justo. Se conserva el retiro manual y el soporte existente.
- **Supabase:** no existía consentimiento por versión. Se creó una bitácora protegida de decisiones expresas, sin introducir un candado de soporte ni modificar la facturación.
- **Notificaciones:** se reutilizó `cliente_notificaciones` y el panel de notificaciones existente; el nuevo aviso `legal_actualizacion` enlaza al lector ya presente en Ayuda.

## Implementación en main
- `ayuda.html` carga el CSS/JS legal y las versiones de caché correspondientes.
- `assets/js/ayuda/21-legal-v2-documents.js` reemplaza visualmente el contenido del modal ya existente; inserta accesos en el dashboard y presenta el aviso a la cuenta piloto.
- `assets/css/goxion-legal-v2.css` adapta lectura y diálogo a móvil, con atención a contraste, desplazamiento y controles de teclado.
- `assets/legal/lector.html` muestra los tres documentos completos por URL.
- `assets/legal/{terminos,referidos,cupones}-v2.txt` son las copias de distribución que no dependen de transformación Jekyll; fuente editorial `docs/legal/*_V2.md`.
- `assets/js/ayuda/04-client-notifications-realtime.js` interpreta la acción `legal` y abre el documento sin abandonar Mi Espacio.
- `assets/js/core/runtime.js` registra la función `legal-consent-v2`.

## Backend
- Migraciones `goxion_legal_decisiones_v2` y `goxion_legal_decisiones_orden_estable_v2`.
- Tabla `public.goxion_legal_decisiones` con propietario, versión, SHA-256, decisión, operation_id idempotente y secuencia cronológica.
- RLS habilitada; sin acceso directo `anon` ni `authenticated` para lectura o escritura. Las operaciones requieren sesión de cliente firmada y se procesan mediante Edge Function.
- `legal-consent-v2` v2: acciones `estado` y `decidir`. **Solo la cuenta piloto Luis** recibe `habilitado:true` hasta validar el flujo.
- `notificaciones-cliente` v7: acción `legal` muestra botón «Leer términos» y conserva el aviso aun después de la decisión.
- La notificación se registra una sola vez por cliente/versión por `dedupe_key`.
- La aceptación exige que el navegador verifique la huella del texto completo y marque lectura; el rechazo dispone de confirmación explícita. Ambas decisiones se guardan en servidor con sello de tiempo.

## QA realizado
1. Syntax de JS de `21-legal-v2-documents.js`, `04-client-notifications-realtime.js` y `runtime.js`: **PASS**.
2. Referencias de CSS/JS desde `ayuda.html`: **PASS**.
3. Huella SHA-256 de copia estática de Términos: **901a521e4101107b2cb7529c3e7c87cea1a7cddbe2dbf77cc6821533e8750cf6**, igual a la huella configurada en el backend.
4. Prueba SQL transaccional con `ROLLBACK`: rechazo seguido de aceptación, secuencia consistente, deduplicación del aviso. **PASS** sin conservar cambios en datos de cliente.
5. Cero decisiones reales y cero avisos legales registrados antes de la prueba de sesión cliente; no se alteraron saldos.
6. `legal-consent-v2` v2 y `notificaciones-cliente` v7 publicados; no se pudo comprobar la UX en sesión autenticada con el iPhone del usuario ni la entrega final de GitHub Pages mediante una sesión de navegador.

## Alcance deliberadamente limitado
- **No se bloquean renovaciones automáticamente si un cliente rechaza la versión**; el estado `rechazado` queda registrado para gestión posterior. Antes de activar la política obligatoria para todos los clientes habrá que decidir cómo Admin controla futuras renovaciones sin perjudicar periodos ya pagados.
- La cuenta piloto Luis es la única convocada al pop-up automático. El lector documental es público.
- El rechazo no retira servicios y las funciones financieras actuales siguen intactas.
- No se agregó módulo de reporte de fallas: el soporte existente (incluido WhatsApp) continúa.
- Las bases de Referidos y Cupones son documentos informativos vinculados al lector, sin alterar los mecanismos de promociones y lealtad.

## Prueba manual de salida del piloto
1. Entrar a Mi Espacio con Luis y esperar a que desaparezca el splash/anuncio previo.
2. Leer, desplazar al final, marcar la casilla y **aceptar**; verificar indicador «Versión 2.0 aceptada».
3. Reabrir «Términos y Condiciones» desde el dashboard y leer las tres pestañas.
4. En notificaciones pulsar «Leer términos»: debe abrir el documento aunque esté aceptado.
5. Reabrir el diálogo «Revisar mi decisión» para validar el rechazo y registro si se desea; la prueba sobre la cuenta de cliente sí deja decisiones persistidas.
6. Solo tras aprobación del piloto decidir el despliegue general y la gestión de rechazos en renovaciones.
