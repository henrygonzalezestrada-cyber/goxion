# GOXION · Mapa canónico de funciones, propietarios y dependencias

Fecha de revisión: 10/oct/2026. **Alcance: documentación únicamente.** No proponer una cuarta reorganización visual. Conservar Inicio, Clientes, Operaciones y Gestión, además del comportamiento aprobado de Admin/Ayuda/Index.

Este registro es la primera consulta obligatoria antes de implementar una función nueva. **No todos los nombres repetidos son errores:** algunos son wrappers, adaptadores de compatibilidad, etapas de un motor o triggers. No eliminar nada sin detectar sus consumidores y probar equivalencia.

## 1. Qué módulo es dueño de cada función

| Necesidad | Dónde se configura (sin duplicar) | Datos y rutas existentes | Qué debe hacer otra sección |
|---|---|---|---|
| Registro / identidad / PIN | Clientes; Gestión → Registro | clientes, registro_solicitudes, activaciones_cuenta; registro-admin, activar-cuenta-goxion | Consultar identidad y estado, sin volver a dar de alta |
| Servicios contratados | Catálogo y expediente de Clientes | servicios, cliente_servicios, servicio_componentes | Consultar contrato, no crear otro catálogo |
| Cuentas madre y perfiles | Gestión → Cuentas y Accesos | servicio_cuentas, cliente_accesos, credenciales_plataforma, credenciales_entregas | Mostrar ocupación o destinatarios usando los contratos reales |
| Cobros y aprobación | Clientes/Operaciones, motor financiero | pagos, periodo-cobro, acciones-financieras, goxion_estado_financiero | Consumir monto, periodo y estado oficial, sin recalcular |
| Mora, lealtad y recompensas | Finanzas y Beneficios | pagos, clientes.pagos_puntuales, goxion_estado_cuenta y complementos | Leer saldos, no inventar fórmulas |
| Misiones y cupones | Gestión → Beneficios → Misiones | gamificacion, cliente_misiones_progreso, beneficios_programados | Recordar avances, jamás acreditar una misión desde campaña |
| Referidos | Expediente/Beneficios | referidos, beneficios_programados | Avisar cambios sin reservar nuevamente beneficios |
| Compensaciones de Trato Justo | Gestión → Beneficios → Trato Justo | trato_justo_compensaciones, acciones-financieras | Informar compensación aprobada |
| Incidencias y fallas | Gestión → Experiencia → Incidencias | alertas, admin-acciones | Notificar a afectados tomando incidencia existente; NO segundo formulario |
| Promociones, combos, descuentos comerciales | Catálogo → Promotions Studio | promociones_catalogo, promocion_items, promociones-admin-beta, acciones-financieras | Enlazar oferta existente, validar elegibilidad y anunciar; NO editar oferta |
| Beneficios programados / descuentos personales | Expediente y Beneficios | beneficios_programados, beneficio_aplicaciones, beneficios-admin-beta | Comunicar un beneficio real sin aplicarlo otra vez |
| Cancelaciones / retención | Operaciones | solicitudes_cancelacion, retencion_ofertas | Avisar el resultado y mostrarlo |
| Opiniones / FEEDBACK | Gestión → Experiencia → Opiniones | opiniones_clientes, opiniones-goxion | Consumir la opinión registrada y misión vigente |
| Campana y notificaciones | Infraestructura compartida | cliente_notificaciones, notificaciones-cliente, cliente_servicio_novedades | Insertar avisos legítimos sin reconstruir bandeja ni estados leído/no leído |
| Notificaciones internas / Discord | Operaciones | notificaciones_admin, notificar-goxion | No confundir alerta de operador con campaña al cliente |
| Realtime | Infraestructura compartida | goxion_realtime_invalidate, core/realtime.js | Invalidar y refrescar módulos sin recargar o cerrar toda la pantalla |
| **Comunicaciones (futuro)** | Emisión y seguimiento **exclusivamente** | Campañas, selección, programación, bitácora **aún por desarrollar** | Consultar fuentes anteriores. Nunca convertirse en segundo editor de negocio |

## 2. Frontend Admin: ubicación de los controladores

El HTML oficial carga 39 scripts, contando core y librerías. El orden de carga es parte del contrato. Los siguientes archivos están en assets/js/admin/:

| Archivo | Área que gobierna o complementa |
|---|---|
| 01-01-inline.js | Lógica histórica del panel, cliente, expediente y eventos de UI |
| 02-admin-supabase-layer.js | Sesión Admin, carga, transformación de datos, conciliación financiera |
| 03-supabase-v3-writes.js | Escrituras y adaptadores; aprobación reciente vía GOXION_FINANCIAL_ACTIONS |
| 04-admin-v4-fixes.js | Misiones: reiniciar progreso y nueva ronda de cupón |
| 05-admin-v5-inventory.js | Inventario |
| 06-admin-operations-ui.js | Navegación, resumen, expediente y funciones base |
| 07-admin-ops-v2.js | Constructor de misiones, notificaciones, revisión y pagos |
| 08-admin-payment-referral-guards.js | Guardas y wrappers de pagos/referidos |
| 09-admin-v4-ergonomics.js | Manejo y experiencia de referidos |
| 10-admin-v6-referral-linking.js | Referidos vinculados y sincronización |
| 11-admin-v9-cycle-ui.js | Modo del ciclo de cobro |
| 12-admin-v10-trato-justo-controller.js | Compensación individual |
| 13-admin-ayuda-bridge-controller.js | Puente operativo, incidencias, novedades y solicitudes |
| 14-admin-mobile-controller.js | Navegación móvil y expediente |
| 15-admin-catalog-controller.js | Catálogo en Admin y acciones adaptativas |
| 16-admin-filters-pin-controller.js | Filtros y PIN |
| 17-admin-loyalty-controller.js | Lealtad masiva |
| 18-admin-responsive-controller.js | Ajustes responsivos |
| 19-admin-trato-justo-masivo-controller.js | Compensación masiva |
| 20-admin-security-controller.js | Cancelaciones, credenciales y controles |
| 21-admin-smart-operations-controller.js | Operaciones inteligentes, cuentas madre, asignaciones |
| 22-admin-registration-controller.js | Registro y activación |
| 23-admin-beta-13-access-controller.js | Acceso técnico, perfiles, diagnóstico y producto; utilizado en oficial |
| 24-admin-beta-18-central-billing-hooks.js | Puentes pequeños al motor financiero |
| 25-admin-beta-19-controller.js | Gestión, experiencia, controlador previo de promoción, expediente |
| 29-promotions-studio-v2.js | Promotions Studio actual; reemplaza métodos del controlador previo |
| 26-admin-beta-19-5-behavior.js | Wrappers de expediente |
| 27-admin-beta-19-8-behavior.js | Wrapper de subsecciones |
| 28-admin-beta-20-benefits.js | Beneficios programados, modal y estado |
| 29-admin-beta-22-behavior.js | Archivo pequeño de compatibilidad; no quitar por tamaño |
| 30-admin-audit-closure.js | Ajustes finales y wrappers de expediente/cobro |
| 31-admin-realtime.js | Actualizaciones parciales en tiempo real |

**Funciones globales con más de una capa/definición observada:** gxOpenClientFocus, gxSettingsView, goAdminTab, gxFocusSection, gxPromoSave, gxPromoLoad, gxUpdateOperationsSummary, gxReloadAdminClient. Antes de sobrescribir una función window.*, rastrear dónde fue declarada, guardada como referencia y modificada posteriormente. El hecho de que aparezca varias veces NO basta para retirarla.

### Servicios compartidos y superficies del cliente

- assets/js/core/runtime.js: directorio central de endpoints y token de sesión.
- assets/js/core/financial-actions.js: **contrato actual de escrituras financieras**.
- assets/js/core/financial-engine.js: comparación/selección compatible del estado de cuenta.
- assets/js/core/realtime.js: invalidación compartida.
- assets/js/ayuda/02-client-supabase-layer.js: carga de datos privados y compatibilidad financiera.
- assets/js/ayuda/04-client-notifications-realtime.js: campana oficial del cliente.
- assets/js/ayuda/15-promotions-catalog-c1.js y 16-cart-v2.js: catálogo promocional y carrito.
- assets/js/index/01-index-supabase-layer.js: estado de cuenta en Index.
- assets/js/opiniones/store.js, ayuda.js y admin.js: registro de opiniones, presentación y moderación.

## 3. Edge Functions Supabase: rutas que ya existen

Al corte: **46 Edge Functions ACTIVE**, de ellas **19** con sufijo beta/preview. Algunas rutas beta son dependencias de páginas oficiales; no apagar automáticamente.

| Propietario lógico | Endpoints existentes |
|---|---|
| Autenticación y Mi Espacio | login-admin; login-goxion; login-goxion-beta; mi-espacio; mi-espacio-beta |
| Datos y acciones administrativas | admin-datos; admin-datos-beta; admin-campos-beta; admin-acciones; admin-ajustes; admin-ajustes-beta; admin-operaciones; admin-operaciones-beta |
| Registro | registro-goxion; registro-admin; activar-cuenta-goxion |
| Cobros, periodos y estado financiero | periodo-cobro; periodo-cobro-beta; estado-cuenta-beta; estado-financiero; acciones-financieras |
| Trato Justo | trato-justo; trato-justo-beta |
| Promociones y beneficios | promociones-admin-beta; promociones-catalogo; beneficios-admin-beta |
| Inventario | inventario; inventario-beta; inventario-publico; inventario-publico-beta |
| Cuentas, accesos y credenciales | accesos-admin-beta; accesos-cliente-beta; cuentas-plataforma-admin; cuentas-plataforma-admin-beta; credenciales-admin; credenciales-admin-beta; credenciales-cliente |
| Atención y mensajes | notificar-goxion; notificar-goxion-beta; cancelaciones-admin; cancelaciones-cliente; novedades-cliente; notificaciones-cliente; opiniones-goxion |
| Auditoría / laboratorio | autotest-goxion; comunicaciones-admin-preview (solo lectura, no permite enviar) |

**Dependencias especialmente sensibles:**
- La vista Admin oficial consume beneficios-admin-beta, promociones-admin-beta y accesos-admin-beta.
- Ayuda e Index consumen estado-cuenta-beta para compatibilidad además del estado financiero actual.
- Promotions Studio guarda a través de acciones-financieras, que invoca promociones-admin-beta y la rutina goxion_guardar_promocion_v2.
- La bandera notificar_cliente en Promotions Studio es **metadato**, no constancia de un mensaje entregado.

## 4. Operaciones y efectos automáticos en PostgreSQL

La base contiene 37 tablas de negocio, 58 funciones SQL y 50 triggers propios. Esta lista ubica efectos secundarios que el frontend NO debe volver a ejecutar.

| Evento de escritura | Motor automático o efecto registrado |
|---|---|
| Insertar/actualizar pagos pagados | Consumir beneficios, promociones y retención; cerrar compensación Trato Justo, emitir aviso, invalidar Realtime |
| Reclamar cupón de misiones | goxion_sync_cupon_misiones_beneficio reserva el beneficio; puede crear notificación interna |
| Referido que cumple/reclama | goxion_sync_referido_beneficio y goxion_notify_referral_progress |
| Avance de misión | goxion_notify_mission_progress, Realtime |
| Beneficio aplicado | goxion_notify_beneficio_cliente, Realtime |
| Contrato de cliente | goxion_apply_master_account_to_client_service, goxion_sync_cliente_accesos, novedades |
| Acceso/credenciales | goxion_validate_cliente_acceso, novedades, invalidación |
| Pago en revisión | goxion_notify_payment_review |
| Cancelación | goxion_notify_cancelacion_cliente |
| Pedido/actividad interna | goxion_notify_order_activity |
| Cambiar cuenta madre | goxion_sync_cuenta_email_to_clients |
| Registros operativos | Triggers de actualización/Realtime |

**Cadena financiera que se debe conservar:** goxion_estado_cuenta_core_v1 → goxion_estado_cuenta → goxion_estado_cuenta_beneficios → goxion_estado_financiero. Son etapas encadenadas, no cuatro motores independientes. GOXION_FINANCIAL.selectCompatibleState compara fuentes en la interfaz.

**Rutas antiguas de aprobación de pago existentes:** admin-acciones.aprobar_pago; admin-operaciones.aprobar_pago; periodo-cobro.aprobar_pago_periodo. Ruta principal actual: GOXION_FINANCIAL_ACTIONS.approvePayment → acciones-financieras. **No está demostrado un doble cobro**, pero sí múltiples rutas con reglas de escritura: no añadir otras y auditar dependencias antes de retirar.

**Excepción deliberada:** el trigger goxion_asignar_promocion_on_servicio devuelve NEW y no aplica promocionalmente nada. La adquisición actual debe ser explícita por goxion_adquirir_promocion; NO reactivar asignación implícita.

**Integración delicada:** opiniones-goxion guarda opiniones; luego el JavaScript de Ayuda intenta completar FEEDBACK mediante completarMisionInteligente. No es una transacción única de backend. Preservar misiones históricas y probar fallos parciales.

## 5. Decisión obligatoria antes de una implementación

1. **REUTILIZAR:** si hay lógica oficial, solo consumir datos/invocar su API; no construir otra. Ej.: anunciar una promoción de Studio.
2. **EXTENDER:** si falta capacidad en el módulo dueño, ampliar contrato existente y registrar pruebas; no abrir un camino paralelo. Ej.: programar recordatorio a partir del avance de misiones.
3. **CREAR:** solo si el evento/operación no tiene propietario existente; definir quién la posee, validación, persistencia y notificaciones.
4. **BLOQUEAR Y REVISAR:** pagos, credenciales, descuentos, permisos y suspensión nunca se duplican, ni siquiera para simplificar una pantalla.

### Checklist para cada cambio

- [ ] Pantalla propietaria actual localizada.
- [ ] Archivo JS y funciones globales relacionadas identificados.
- [ ] Endpoint Edge y llamadas RPC/SQL identificados.
- [ ] Tablas y triggers secundarios revisados.
- [ ] Se descarta recrear automatismos existentes.
- [ ] Cambio sin alteración de navegación/estética aprobadas.
- [ ] Pruebas existentes y escenario de regresión específico ejecutados.
- [ ] Se anota cómo volver atrás y se actualiza esta matriz.

## 6. Aplicación al futuro módulo Comunicaciones

**No será otra pantalla para crear promociones, descuentos, fallas o misiones.** Será una interfaz para seleccionar información ya existente, escoger audiencia real, previsualizar, enviar/programar y consultar historial. El motor de negocio permanece donde está hoy.

- Misiones: consultar gamificacion + cliente_misiones_progreso, excluir completadas al emitir.
- Ofertas: seleccionar promociones_catalogo; comprobar elegibilidad, stock, vigencia, precio y acumulación desde backend existente.
- Incidencias: partir de alertas/Experiencia; mostrar acción opcional Notificar afectados EN el módulo de Incidencias.
- Cobros: consultar el estado y fechas oficiales; no usar la aproximación por día del prototipo.
- Beneficios: notificar sobre registros aprobados, no calcular ni conceder otros.
- Entrega: escribir en cliente_notificaciones de forma autorizada, con dedupe_key, auditoría y campana notificaciones-cliente.
- Programación: fecha límite en texto no es expiración real. No se observó pg_cron instalado al corte; se requiere un scheduler validado para campañas reales.

La beta preview/comunicaciones es **solo un prototipo aislado**, no está integrada en la navegación aprobada. Puede evolucionar únicamente después de pasar por esta revisión de dependencias.

## 7. Fuentes de verificación

- admin.html, ayuda.html e index.html y su orden de scripts.
- assets/js/core/runtime.js; financial-actions.js; financial-engine.js.
- docs/REALTIME.md y docs/COMUNICACIONES.md.
- scripts/verify-integrity.mjs, browser-smoke.mjs, cart-v2-smoke.mjs, realtime-notifications-smoke.mjs y pruebas de opiniones.
- Inventario vivo de Supabase: Edge Functions, esquema de tablas, rutinas, triggers y estados.

**Límite de evidencia:** este mapa agrupa responsabilidades identificadas por inspección de código y base; no equivale a una certificación funcional de cada ruta. Para retirar una capa de compatibilidad o mover escrituras se requiere prueba autenticada de extremo a extremo.

**Principio permanente:** mejoramos el Admin que ya existe; no lo rediseñamos por cuarta vez.
