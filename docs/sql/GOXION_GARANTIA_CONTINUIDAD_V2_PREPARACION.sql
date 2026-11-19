-- GOXION · Garantía de Continuidad v2 — Registro de incidencias
-- PREPARACIÓN: no ejecutar automáticamente hasta conectar Ayuda y Admin.
-- La tabla contiene reportes, no genera compensaciones financieras.
BEGIN;

CREATE TABLE IF NOT EXISTS public.goxion_garantia_incidencias (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cliente_id uuid NOT NULL REFERENCES public.clientes(id),
 cliente_servicio_id uuid NOT NULL REFERENCES public.cliente_servicios(id),
 periodo date NOT NULL,
 descripcion text NOT NULL CHECK(length(btrim(descripcion)) BETWEEN 12 AND 1500),
 fecha_inicio_declarada date,
 reportado_en timestamptz NOT NULL DEFAULT now(),
 estado text NOT NULL DEFAULT 'reportada' CHECK (estado IN ('reportada','validada','descartada')),
 origen text NOT NULL DEFAULT 'sin_determinar' CHECK (origen IN ('sin_determinar','goxion','plataforma_externa','cliente','otro')),
 dias_completos_verificados smallint NOT NULL DEFAULT 0 CHECK(dias_completos_verificados BETWEEN 0 AND 10),
 verificado_desde date,
 verificado_hasta date,
 evidencia_verificacion text,
 verificado_por text,
 verificado_en timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT goxion_garantia_validacion CHECK (
   estado <> 'validada' OR (
     origen='goxion' AND dias_completos_verificados BETWEEN 1 AND 10
     AND verificado_desde IS NOT NULL AND verificado_hasta IS NOT NULL
     AND verificado_hasta >= verificado_desde
     AND length(btrim(coalesce(evidencia_verificacion,''))) >= 12
     AND verificado_en IS NOT NULL AND verificado_por IS NOT NULL
   )
 )
);

CREATE INDEX IF NOT EXISTS goxion_garantia_cliente_periodo_idx
 ON public.goxion_garantia_incidencias(cliente_id,periodo,reportado_en DESC);

CREATE INDEX IF NOT EXISTS goxion_garantia_pendientes_idx
 ON public.goxion_garantia_incidencias(reportado_en)
 WHERE estado='reportada';

-- Las solicitudes no son públicas; solo Edge Functions autenticadas usan service_role.
ALTER TABLE public.goxion_garantia_incidencias ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.goxion_garantia_incidencias FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE ON TABLE public.goxion_garantia_incidencias TO service_role;

-- Enlace auditable opcional: los históricos anteriores se conservan.
ALTER TABLE public.trato_justo_compensaciones
 ADD COLUMN IF NOT EXISTS incidencia_id uuid
 REFERENCES public.goxion_garantia_incidencias(id);
CREATE INDEX IF NOT EXISTS trato_justo_compensaciones_incidencia_idx
 ON public.trato_justo_compensaciones(incidencia_id) WHERE incidencia_id IS NOT NULL;

COMMENT ON TABLE public.goxion_garantia_incidencias IS
 'Expedientes verificables de continuidad. Reportar no otorga descuentos; resolución administrativa obligatoria.';
COMMENT ON COLUMN public.goxion_garantia_incidencias.fecha_inicio_declarada IS
 'Fecha indicada por cliente: no equivale a periodo de interrupción acreditado.';
COMMENT ON COLUMN public.goxion_garantia_incidencias.dias_completos_verificados IS
 'Días completos acreditados por operación GOXION, máximo 10; no se calcula automáticamente desde un reporte.';

COMMIT;
