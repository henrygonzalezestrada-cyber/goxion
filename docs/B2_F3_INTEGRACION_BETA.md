# GOXION B2 · F3 Beta integrada sin tocar producción

**13 de octubre de 2026 · Rama:** `feature/b2-f3-integracion-beta-20261013` · **PR #99 (borrador)** sobre PR #97.
F0 cerrada, F1 visual aprobada, F2 motor entregado para beta. No implica habilitar clientes ni fusionar a `main`.

## Alcance instalado de F3

**Index espejo:** la versión explícita `?f3=1&cliente=<clave_autenticada>` consulta `estado-financiero-b2-beta`; valida ciclo, cotización cobrable, identificador de perfil, nombre contractual, ordinal, beneficios comerciales y revisión de reporte. En régimen global permanece el Index heredado. Si la identidad del cargo no concilia, el cobro queda bloqueado. La selección próximo/todo utiliza únicamente cargos SQL y respeta centavos reales.

**Comprobante:** el formulario ya existente carga la imagen por HTTPS a `comprobantes-b2-beta` (privado), con cliente derivado de token HMAC, `ciclo_id`, `cargo_ids`, monto exacto y operación idempotente. El estado resultante es `reportado`, **nunca se marca pagado sin Admin**. Reintento conserva clave durante esa sesión; la cotización se revalida al registrar. Cuentas sin B2 no acceden a esta ruta por diseño del adaptador.

**Mi Espacio espejo:** conserva los estilos y animaciones aprobados. Sólo muestra la prórroga B2 de la beta para régimen `b2_multifecha` y navega a Index espejo con la clave de sesión, sin abrir Index oficial por accidente.

**Admin espejo:** copia de `admin.html` sin cambios al archivo productivo; mantiene el modal original `gx-payment-modal`, no crea una quinta interfaz. Los POST heredados de mutación están bloqueados por `admin-sandbox.js`; sólo permite las lecturas estrictamente necesarias y tres acciones B2 con `X-Admin-Token`. El servidor `acciones-financieras-b2-beta` v6 permite listar reportes B2, mostrar evidencia privada con URL temporal de 90 segundos y aprobar reportes contra los cargos exactos del ciclo por el procedimiento atómico F2. El adaptador rechaza pagos globales, incompletos o rechazos heredados desde esta copia beta; exige visualizar la evidencia y confirmación expresa.

**Seguridad:** la demo `?demo=1` se mantiene sin escrituras y con datos bancarios de ejemplo. El modo `?f3=1` es explícito y sólo pasa acciones autenticadas restringidas. Toda autorización material la hace el servidor HMAC + opt-in B2 + RPC, nunca la bandera del navegador.

## Validación ejecutada

- `GOXION · B2 F3 Integración Beta`: contratos/sintaxis Node y pruebas visuales Chromium/WebKit, primeros dos jobs **PASS** en GitHub Actions (ejecución 38505978136). Las corridas posteriores que incorporan Admin deben comprobarse por separado.
- `estado-financiero-b2-beta` v5 y `acciones-financieras-b2-beta` v6 desplegadas como funciones exclusivamente beta. La primera se verificó idéntica a su origen en GitHub. Las funciones productivas `acciones-financieras` y `periodo-cobro` no cambiaron.
- Base Supabase: 22 clientes, 28 pagos; **0** régimen B2 activo, recibos B2 y cargos. Ninguna cuenta real fue sometida a este recorrido.

## Puertas de aceptación limitadas: NO inventar pruebas

1. Recorrido HTTP autenticado con un **cliente técnico B2**: foto binaria válida e inválida, selección de un acceso y de dos, aprobación Admin, revisión de consumos y replay después de liquidar. No acreditado aún; cero B2 activos.
2. Dos transacciones independientes concurrentes con **COMMIT real en un entorno desechable**, confirmando que sólo una aprueba y sin doble recibo. Las pruebas SQL con ROLLBACK F2 son sólidas pero no prueban carreras independientes.
3. Verificación de esta última copia Admin en navegador y posterior corrida CI, sin otra ronda de cambios estéticos sobre F1. Revisión de conflictos antes de combinar PR #96/#97/#99.
4. **F4:** notificación única Admin/Discord y distintivo del acuerdo desde Issue #98, sin aprobación manual. **F5:** despliegue gradual reversible con opt-in, autorización explícita y validación de indicadores.
 
**Regla final:** no abrir otra fase de rediseño ni reiterar el motor F2. Si una prueba descubre un fallo, corregir sólo esa causa y retestar el recorrido afectado. Sin autorización explícita, no activar personas ni fusionar `main`.
