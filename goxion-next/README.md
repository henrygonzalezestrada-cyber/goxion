# GOXION Next

Modernización paralela de GOXION sobre React + TypeScript + Vite + Motion.

## Regla de seguridad

- `main` es producción/referencia y no se modifica durante la migración.
- Todo el trabajo moderno vive en `goxion-next`.
- Los tres archivos oficiales (`index.html`, `ayuda.html`, `admin.html`) se
  usan como especificación funcional y visual.
- Los contratos de Supabase se conservan. Cuando existe un contrato nuevo más
  seguro, Next sustituye el flujo antiguo en lugar de duplicarlo.
- Las pruebas automáticas no disparan escrituras sobre clientes reales.

## Arquitectura

GOXION Next conserva tres superficies separadas dentro del mismo proyecto:

- `index.html` → resumen de cuenta y reporte de pago.
- `ayuda.html` → experiencia pública, registro, activación, catálogo,
  Mi Espacio y soporte.
- `admin.html` → centro de operaciones administrativo.

Comparten contratos, estilos y componentes reutilizables sin mezclar sus
sesiones ni responsabilidades.

## Stack

- React
- TypeScript
- Vite
- Motion
- Tailwind CSS
- Supabase Edge Functions existentes

## Estado actual · 21 sep 2026

### Ayuda / Mi Espacio

Migrado y conectado:

- Shell Inicio / Catálogo / Soporte.
- Catálogo real desde `mi-espacio` en modo público + `inventario-publico`.
- Login real mediante `login-goxion`.
- Restauración de sesión con `goxion_client_token`.
- Estado de cuenta central.
- Servicios y accesos.
- Entrega segura de credenciales de una sola vista.
- Historial de pagos.
- Lealtad.
- Misiones y referidos.
- Registro de cliente nuevo.
- Activación con GOXION ID + código de 6 dígitos + PIN de 4 dígitos.
- Soporte dentro de la app con contexto de cliente/servicio.

### Index

Migrado y conectado:

- Sesión protegida.
- Resumen de cuenta.
- Estado/corte/desglose.
- Datos bancarios.
- Reporte de comprobante desde GOXION.
- Marcado de pago en revisión y notificación administrativa.

### Admin

Migrado por módulos:

- Login administrativo.
- Inicio y panorama financiero.
- Clientes y ficha operativa.
- Alta de cliente.
- Edición de cliente.
- Servicios del cliente.
- PIN único.
- Identidad comercial (teléfono/origen/elegibilidad bienvenida).
- Lealtad individual y reinicio.
- Referido inteligente, ajuste de meses, automático y reinicio.
- Misiones individuales.
- Descuentos especiales.
- Periodo pendiente y ciclo manual/automático.
- Pagos: incompleto, rechazo y aprobación por periodo.
- Cancelaciones.
- Centro de registros/activaciones.
- Soporte y actividad administrativa.
- Catálogo: alta, edición, activar/desactivar, sincronizar precio y borrado
  físico protegido para servicios inactivos sin contrataciones activas.
- Promociones: crear, editar, pausar, activar y retirar.
- Beneficios programados.
- Trato Justo masivo e individual por cliente/servicio/periodo.
- Cuentas madre.
- Asignación inteligente de accesos.
- Edición y liberación de accesos.
- Publicación/revocación segura de credenciales.
- Productos/combos compuestos.
- Modo de acceso compartido/invitación.
- Asignación de accesos en lote.
- Diagnóstico de arquitectura.
- Stock manual.
- Misiones masivas.
- Lealtad masiva.
- Alertas públicas.
- Combo upsell.
- Nueva ronda de cupón.
- Limpieza de actividad administrativa.

## Sustituciones deliberadas en Admin

Las siguientes acciones antiguas no se reintroducen porque ya existe una ruta
más segura:

- `aprobar_pago` → `periodo-cobro / aprobar_pago_periodo`.
- `cambiar_pin` → `admin-operaciones / cambiar_pin_unico`.
- `guardar_referido` / `desactivar_referido` → referido inteligente.
- `asignar` / `sugerir_pin` → asignación inteligente, lote y edición de acceso.
- Trato Justo acumulativo antiguo → compensación por servicio y periodo.

Esto evita mantener dos lógicas distintas para la misma operación.

## Validación

El workflow **GOXION Next · Build Check** ejecuta:

1. instalación limpia de dependencias;
2. `tsc --noEmit`;
3. `vite build`;
4. artefacto `goxion-next-dist`.

El build multipágina debe producir:

- `dist/index.html`
- `dist/ayuda.html`
- `dist/admin.html`

## Antes de producción

No fusionar a `main` todavía. El cierre requiere:

1. revisión visual/táctil en dispositivo real;
2. prueba controlada con cliente de prueba;
3. prueba controlada de Admin sin tocar clientes reales;
4. comparación final contra los tres archivos oficiales;
5. auditoría de conexiones y código descartado;
6. sólo después, decisión explícita de producción.
