-- GOXION · Consentimiento explícito versionado; NO altera las reglas financieras.
CREATE TABLE IF NOT EXISTS public.goxion_legal_decisiones (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 secuencia bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
 version text NOT NULL CHECK (version ~ '^[0-9]+\.[0-9]+$'),
 documento_sha256 text NOT NULL CHECK(documento_sha256 ~ '^[0-9a-f]{64}$'),
 decision text NOT NULL CHECK(decision IN ('aceptado','rechazado')),
 operation_id uuid NOT NULL UNIQUE,
 origen text NOT NULL DEFAULT 'mi_espacio' CHECK(origen='mi_espacio'),
 registrado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goxion_legal_decisiones_cliente_version_fecha
 ON public.goxion_legal_decisiones(cliente_id,version,secuencia DESC);
ALTER TABLE public.goxion_legal_decisiones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.goxion_legal_decisiones FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON TABLE public.goxion_legal_decisiones TO service_role;
COMMENT ON TABLE public.goxion_legal_decisiones IS 'Registro inmutable de decisiones expresas por versión. El rechazo no suspende periodos pagados ni ejecuta bajas.';
