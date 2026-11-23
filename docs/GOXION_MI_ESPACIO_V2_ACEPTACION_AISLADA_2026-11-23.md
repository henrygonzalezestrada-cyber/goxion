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

## Actualización de continuidad · 23/nov/2026, 17:31–17:35 (hora de México)

**Estado vigente: fase de conexiones oficiales / preparación de aceptación.** Sustituye el estado COMING_UP de la primera anotación, que queda como histórico. Supabase de aceptación `nsvybyvvdpdgbgtvydfb` está ACTIVE_HEALTHY; consulta SQL de lectura comprobada a las 17:29. Producción `hmpevcwodcgbkviarfic` no se ha modificado en esta revisión.

- 59 tablas base públicas en aceptación; 10 Edge Functions activas. Comparación de metadatos de columnas de clientes, gamificación, referidos, prórrogas, cargos B2 y sesiones: 79 columnas coinciden en nombre y tipo. Comparación amplia: faltan siete relaciones públicas, incluida la tabla de precios de referencia, y la columna `trato_justo_compensaciones.incidencia_id`. No interpretar coincidencia parcial como paridad completa.
- Ocho clientes preexistentes; siete tienen identificadores de prueba reconocibles por patrón, ninguno tiene teléfono normalizado ni vínculo Auth. El octavo no está confirmado. No usar, borrar ni modificar registros preexistentes sin verificar identidad; preferir cuentas sintéticas nuevas. Sin copia de datos/secretos de producción.
- Sin extensión pg_cron instalada en aceptación; hay triggers locales de notificaciones y cuatro rutinas con referencias externas que deben clasificarse antes de escribir datos. No habilitar envíos externos, Discord, cobros, ni reutilizar el bridge temporal como entrada pública.
- Comparación de 11 endpoints necesarios:

| Endpoint | Aceptación | Versión oficial observada |
|---|---:|---:|
| login-goxion | Ausente | 10 |
| mi-espacio | Ausente | 20 |
| estado-cuenta-beta | Ausente | 4 |
| estado-financiero-b2-beta | 5 | 13 |
| acciones-financieras-b2-beta | 6 | 16 |
| comprobantes-b2-beta | 2 | 6 |
| cancelaciones-cliente | Ausente | 6 |
| notificaciones-cliente | Ausente | 8 |
| credenciales-cliente | Ausente | 6 |
| novedades-cliente | Ausente | 3 |
| accesos-cliente-beta | Ausente | 5 |

Se inspeccionaron los fuentes de login, Mi Espacio, estado de cuenta y notificaciones: usan variables Supabase del proyecto de ejecución; no se identificó fetch externo literal en esos cuatro archivos. Esto NO sustituye la revisión de RPC/triggers, autorización y dependencias de esquema. No se desplegaron funciones ni se crearon clientes en esta revisión.

### Siguiente entrega, en este orden
1. Verificar aislamiento y dependencias de login/Mi Espacio/notificaciones/estado de cuenta; actualizar sólo funciones necesarias del entorno QA. Revisar llamadas a integraciones y bloquearlas; conservar seguridad real.
2. Preparar cuentas QA nuevas y ruta de aceptación del **mismo código aprobado**, con sesión y host aislados, sin botones de escenarios. Confirmar login + lectura y persistencia contra QA y comprobar que no hay tráfico a producción. Entregar acceso únicamente cuando esto funcione; nunca guardar PIN/token en el repositorio.
3. Primer bloque de validación de usuario: al corriente, próximo vencimiento, vencido/suspendido, comprobante en revisión/rechazo/acreditación y prórroga. Preparar condiciones y ejecutar controladores reales, no cambiar banderas para fingir una transición. Segundo bloque: dos fechas B2 y cancelación/retención. Tercero: misiones, referidos, lealtad, cupón, confeti y corazón roto. Finalmente notificaciones, accesos, historial y regresión de Catálogo/Soporte.
4. Registrar por escenario: preparado, lectura, operación confirmada, persistencia, UI y validación Safari. Ningún escenario real de aceptación se declara aprobado todavía. Los 30 contratos de presentación aprobados son una comprobación distinta.

### Reglas de continuidad
- Espejo actual aprobado visualmente: `ayuda-espejo-feed-v2.html`; laboratorio de referencia `preview/experiencia-mi-espacio-inteligente/morph-v2.html`. No reconstruir ni reinterpretar su diseño. La futura oficial se promueve desde el código probado.
- `ayuda.html`, portada/login, Catálogo y Soporte oficiales no se modifican durante aceptación. Cápsula única compartida, cristal neutro, estados dinámicos y animaciones aprobadas; conservar funciones reales. Mantener escritura V2 deshabilitada en espejo público. No alterar clientes reales ni protecciones de prórroga.
- El usuario quiere rapidez y validar la experiencia sin preparar fechas/comprobantes manualmente. Entregar bloques utilizables y resultados verificados, no largas rondas de diagnóstico o supuestas pruebas reales.
- Consultar auditoría de paridad, contrato técnico y plan de pruebas existentes en `docs/`. Leer primero este registro y confirmar estado actual de Supabase antes de retomar.
