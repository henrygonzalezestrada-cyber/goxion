# Preparación de aceptación aislada de Mi Espacio V2 · 23 nov 2026

## Estado real de esta entrega
- Proyecto anterior de aceptación B2 identificado: `nsvybyvvdpdgbgtvydfb`. Solicitud de restauración aceptada; último estado observado `COMING_UP`. **No se han creado clientes ni ejecutado mutaciones de prueba**. No conectar el espejo público hasta confirmar aislamiento.
- Oficial `ayuda.html`, controladores compartidos y base de producción intactos; `ENABLE_WRITES=false`.
- Primer ensayo puro del runtime: 25 de 26 casos esperados. El caso combinado hipotético de vencimiento + prórroga confirmada necesita cotejarse con datos reales del controlador.
- Se detectaron tres diferencias de lectura comprobadas con código oficial: la API de misiones devuelve filas ya filtradas por versión (sin número de versión individual), la lealtad usa pagos efectivos del estado de cuenta, y referidos entrega cantidad de plataformas normalizada. Correcciones limitadas al runtime del espejo.
- `node scripts/mi-espacio-v2-qa-contracts.mjs` comprueba los estados del código existente, no servicios reales.
- `node scripts/mi-espacio-v2-qa-api.mjs` preparado para el proyecto aislado. Modos `--missions` y `--referral` verifican las operaciones reales y el reintento idempotente sólo con una cuenta QA identificada. No ejecutar hasta validar el proyecto, esquema, datos, funciones y ausencia de notificaciones externas. PIN/token nunca en GitHub ni logs.

## Puertas para habilitar la validación del usuario
1. Proyecto aislado en ACTIVE_HEALTHY; comparar únicamente metadatos de esquema, funciones SQL, RLS y versiones de endpoints con producción. Inspeccionar cantidad y origen de clientes existentes; usar exclusivamente cuentas sintéticas, nunca copiar datos reales ni credenciales.
2. Verificar cron, triggers, outbox, webhooks y secretos de integraciones externas; no desplegar dispatcher Discord, comunicaciones reales ni integraciones de cobro. Cualquier llamada interna queda limitada al proyecto aislado.
3. Sembrar estados iniciales independientes de QA con fechas de corte adecuadas a los casos, datos de comprobante sintético y configuración de misiones/referidos. La evolución se produce por API/operaciones originales, no por cambiar flags para fabricar un PASS.
4. Conectar una ruta de aceptación que use el mismo HTML/CSS/JS del espejo actual, sesión independiente, bloqueo de red al host de producción (incluidas XHR, realtime y navegación de cuenta/Admin), sin botones de simulación en el feed. No reutilizar la sesión de producción en el mismo almacenamiento del navegador. Comprobar que ninguna petición sale del aislamiento antes de entregar URL.
5. Verificar estos recorridos por separado: al corriente, vencido, suspensión, revisión/rechazo/acreditación, prórroga elegible/aprobada/expirada, dos fechas B2 y liquidación de una, cancelación y retención, lealtad (racha efectiva y ruptura), misiones y confeti tras éxito, referido y recompensa, notificaciones e historial. Para el usuario preparar cada cuenta en el estado inicial y acciones concretas; no exigirle preparar fechas o comprobantes.
6. Ejecutar Playwright sobre el espejo con backend aislado real y estados persistidos; repetir en Safari. No confundir los tests de contratos o los mocks previos con pruebas transaccionales. Registrar por separado UI, API, persistencia, errores/reintentos y efectos.
7. Mantener producción intacta; retirar legado sólo tras paridad certificada.

**No autorizado para lanzamiento.** El proyecto restaurándose es un bloqueo de infraestructura, no una aprobación funcional.
