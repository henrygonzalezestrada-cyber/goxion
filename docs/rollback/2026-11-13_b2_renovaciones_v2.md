# Restauración controlada · renovaciones B2 (13/nov/2026)

Objetivo: regresar el preflight de B2 y su escritor a la versión anterior, sin eliminar historiales de cobros.

## Fuente anterior y respaldo

- **SQL escritor original:** `supabase/migrations/202610140004_b2_redondeo_lealtad_por_acceso.sql` (función `public.goxion_b2_iniciar_ciclo`). Digest `md5(pg_get_functiondef(...))` antes del cambio: `aa8b1f9e820bddbc50c4ffb722e3baa0`; confirmar tras restaurar.
- **Edge original:** `docs/edge/acciones-financieras-b2-beta/index.ts` en commit `1f019ca86aa85d0c22e6dc6e404b16ff37f8ec3e`; versión desplegada antes del cambio: **v12** de producción, `verify_jwt=false`, autenticación Admin por HMAC propio.
- **Migración nueva:** `supabase/migrations/202611130001_b2_renovacion_proyectada_v2.sql`.
- Ningún secreto, credencial o dato de clientes se guarda aquí.

## Procedimiento seguro

1. Bloquear temporalmente nuevas activaciones B2 (no bloquear aprobación de cargos ya creados); capturar saldos, recibos, periodos y proyección actual. Confirmar si existen ciclos creados por el nuevo código.
2. Desplegar Edge anterior de referencia como versión nueva, manteniendo `verify_jwt=false`; comprobar su autenticación y respuesta de preflight.
3. Restaurar `public.goxion_b2_iniciar_ciclo` desde la migración original; confirmar digest, rol y permisos. No tocar `pagos` ni `goxion_b2_cargos` existentes.
4. Tras comprobar que ningún consumidor invoca las funciones nuevas, ejecutar:
   ```sql
   DROP FUNCTION IF EXISTS public.goxion_b2_previsualizar_renovaciones(uuid,date);
   DROP FUNCTION IF EXISTS public.goxion_b2_proxima_renovacion(date,smallint);
   ```
5. Comprobar cotizaciones actuales de Luis y Nayeli, conteos de clientes, cargos, recibos y cero pagos duplicados.

**Advertencia:** si ya se materializaron ciclos nuevos con vencimientos proyectados, NO ejecutar la reversión automáticamente. Revisar obligaciones y coberturas por unidad antes de cualquier rollback. El cambio no se revierte borrando pagos reales.

## Límite de alcance

Esta migración separa cobertura pagada y próxima renovación para iniciar un ciclo **sin deuda previa**. No implementa aún incorporación o baja contractual de servicios durante un ciclo B2 activo; esos cambios requieren contratos de vigencia efectiva y pruebas independientes.
