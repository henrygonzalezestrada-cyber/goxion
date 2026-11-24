# GOXION · Paridad fase 2: historial real · 24 nov 2026
Candidato: ayuda-espejo-feed-v2.html?v=feed-history-b2-20261124. Diseño, filtros, iconos y composición intactos.
- Pagos tradicionales: fuente mi-espacio. B2: comprobantes y abonos aprobados, deduplicados por enlaces de aplicaciones oficiales; el importe acreditado es el aplicado y no el reportado. No confundir abono con liquidación total.
- Altas: cliente_servicios.created_at (registro, no necesariamente activación), incluso servicios inactivos conservados. Bajas: efectiva_at/fecha_efectiva para estado efectivo; solicitud y resolución usan sus fechas correspondientes.
- Beneficios: reservas históricas de misiones/referidos y aplicaciones consumidas, sin duplicar reclamos de fuente actual. Fallo parcial indicado en pie existente.
- Edge historial-cliente v2: solo lectura, token cliente firmado, verificación cuenta y restricción legal, consultas por identidad autenticada, sin credenciales de plataforma. Límite explícito 500 por fuente y 1000 enlaces.
- Renovación individual: no se identificó fuente independiente que confirme renovación. No inventar ni duplicar pagos; pendiente de contrato real de evento si negocio requiere distinguirla. B2 se muestra como abono, no renovación.
- Verificación: esquema y permisos de lectura de fuentes, FK de enlaces, función desplegada, sintaxis JS, 35/35 contratos previos, caso combinado de ocho movimientos (deduplicación B2/cupón, baja efectiva, alta, beneficio). No se ejecutó HTTP autenticado ni Safari. No se modificaron datos de clientes, cobros o ayuda.html.
- Siguiente fase: conexiones Admin/Trato Justo y calificaciones; después aceptación aislada, regresión integral y limpieza/publicación.
