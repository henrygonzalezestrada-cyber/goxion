-- GOXION · Política legal 2.0 general, con validación por cobertura pagada.
CREATE TABLE IF NOT EXISTS public.goxion_legal_bajas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cliente_id uuid NOT NULL REFERENCES public.clientes(id),
 version text NOT NULL DEFAULT '2.0',
 rechazo_id uuid NOT NULL REFERENCES public.goxion_legal_decisiones(id) UNIQUE,
 servicios jsonb NOT NULL DEFAULT '[]'::jsonb,
 accesos_desactivados integer NOT NULL DEFAULT 0,
 servicios_desactivados integer NOT NULL DEFAULT 0,
 confirmado_en timestamptz NOT NULL DEFAULT now(),
 retiro_externo_estado text NOT NULL DEFAULT 'pendiente_manual',
 operacion text NOT NULL DEFAULT 'admin_confirmacion'
);
ALTER TABLE public.goxion_legal_bajas ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.goxion_legal_bajas FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.goxion_legal_bajas TO service_role;

-- Conservar la baja histórica del perfil de prueba sin modificar sus servicios.
INSERT INTO public.goxion_legal_bajas
(cliente_id,version,rechazo_id,servicios,accesos_desactivados,servicios_desactivados,confirmado_en,operacion)
SELECT b.cliente_id,b.version,
  (SELECT d.id FROM public.goxion_legal_decisiones d
   WHERE d.cliente_id=b.cliente_id AND d.version=b.version AND d.decision='rechazado'
   ORDER BY d.secuencia DESC LIMIT 1),
  b.servicios,b.accesos_desactivados,b.servicios_desactivados,b.confirmado_en,'historico_piloto'
FROM public.goxion_legal_bajas_piloto b
WHERE EXISTS(SELECT 1 FROM public.goxion_legal_decisiones d
  WHERE d.cliente_id=b.cliente_id AND d.version=b.version AND d.decision='rechazado')
ON CONFLICT(rechazo_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.goxion_legal_estado_acceso(p_cliente_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path=public,pg_temp
AS $f$
DECLARE
  v_today date := (now() AT TIME ZONE 'America/Merida')::date;
  v_decision text;
  v_rechazo uuid;
  v_cliente_estado text;
  v_periodo date;
  v_total int := 0;
  v_sin_cobertura int := 0;
  v_ultima date;
  v_servicios jsonb := '[]'::jsonb;
  v_revision boolean := false;
  v_b2 boolean := false;
  v_baja_confirmada boolean := false;
  v_fase text := 'pendiente';
BEGIN
  SELECT c.estado,c.periodo_pendiente INTO v_cliente_estado,v_periodo
  FROM public.clientes c WHERE c.id=p_cliente_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente'; END IF;

  SELECT d.decision,d.id INTO v_decision,v_rechazo
  FROM public.goxion_legal_decisiones d
  WHERE d.cliente_id=p_cliente_id AND d.version='2.0'
  ORDER BY d.secuencia DESC LIMIT 1;
  IF v_decision IS DISTINCT FROM 'rechazado' THEN
    RETURN jsonb_build_object('politica','legal-v2.0','habilitado',true,
      'fase',CASE WHEN v_decision='aceptado' THEN 'aceptado' ELSE 'pendiente' END,
      'decision',coalesce(v_decision,'pendiente'),'restringido',false,
      'bloquea_operaciones',false,'requiere_revision',false,'baja_pendiente',false,
      'fecha_consulta',v_today);
  END IF;

  WITH contratos AS (
    SELECT s.id servicio_id,s.nombre,
      count(a.id)::int n_accesos,
      count(x.id) FILTER(WHERE x.estado='verificado')::int n_verificados,
      max(x.cobertura_hasta) FILTER(WHERE x.estado='verificado') AS cal_hasta,
      max(l.cobertura_hasta) AS contrato_hasta
    FROM public.cliente_servicios s
    LEFT JOIN public.cliente_accesos a
      ON a.cliente_servicio_id=s.id AND a.cliente_id=p_cliente_id AND a.activo=true
    LEFT JOIN public.goxion_calendario_accesos x
      ON x.cliente_acceso_id=a.id AND x.cliente_servicio_id=s.id AND x.cliente_id=p_cliente_id
    LEFT JOIN public.goxion_coberturas_legales_contrato l
      ON l.cliente_servicio_id=s.id AND l.cliente_id=p_cliente_id
    WHERE s.cliente_id=p_cliente_id AND s.activo=true
    GROUP BY s.id,s.nombre
  ), cubiertos AS (
    SELECT servicio_id,nombre,n_accesos,
      CASE
        WHEN n_accesos>0 AND n_verificados=n_accesos THEN cal_hasta
        WHEN n_accesos>1 AND n_verificados=0 AND contrato_hasta IS NOT NULL THEN contrato_hasta
        ELSE NULL::date
      END AS hasta
    FROM contratos
  )
  SELECT count(*)::int,
    count(*) FILTER(WHERE hasta IS NULL)::int,
    max(hasta),
    coalesce(jsonb_agg(jsonb_build_object('servicio_id',servicio_id,'nombre',nombre,
       'cobertura_hasta',hasta,'accesos',n_accesos) ORDER BY hasta,nombre),'[]'::jsonb)
  INTO v_total,v_sin_cobertura,v_ultima,v_servicios
  FROM cubiertos;

  SELECT EXISTS(SELECT 1 FROM public.goxion_b2_regimen_cliente r
    WHERE r.cliente_id=p_cliente_id AND r.activo=true) INTO v_b2;

  SELECT
    EXISTS(SELECT 1 FROM public.clientes c
      WHERE c.id=p_cliente_id AND
      (c.pago_en_revision=true OR c.pago_revision_estado IN ('revision','pendiente')))
    OR EXISTS(SELECT 1 FROM public.goxion_b2_comprobantes b
      WHERE b.cliente_id=p_cliente_id AND b.estado='reportado')
    OR EXISTS(SELECT 1 FROM public.pagos_parciales pp
      WHERE pp.cliente_id=p_cliente_id AND pp.activo=true AND pp.saldo_restante>0)
    OR EXISTS(SELECT 1 FROM public.acuerdos_cobro ac
      WHERE ac.cliente_id=p_cliente_id AND ac.activo=true
        AND ac.estado NOT IN ('cancelada','cancelado','rechazada','finalizado','cumplido'))
    OR EXISTS(SELECT 1 FROM public.goxion_b2_prorrogas pr
      JOIN public.goxion_b2_cargos cargo ON cargo.id=pr.cargo_id
      WHERE pr.cliente_id=p_cliente_id AND pr.estado='aprobada' AND cargo.liquidado=false)
    OR EXISTS(SELECT 1 FROM public.solicitudes_cancelacion sc
      WHERE sc.cliente_id=p_cliente_id AND sc.estado IN ('pendiente','aprobada'))
    OR (
      NOT v_b2 AND v_cliente_estado='pagado' AND v_total>0 AND v_ultima IS NOT NULL
      AND v_periodo IS NOT NULL AND v_periodo>date_trunc('month',v_ultima)::date
    )
  INTO v_revision;

  SELECT EXISTS(SELECT 1 FROM public.goxion_legal_bajas b
    WHERE b.rechazo_id=v_rechazo) INTO v_baja_confirmada;

  IF v_cliente_estado='suspendido' THEN v_fase:='cuenta_suspendida';
  ELSIF v_sin_cobertura>0 OR v_revision THEN v_fase:='revision_manual';
  ELSIF v_ultima IS NOT NULL AND v_ultima>=v_today THEN v_fase:='rechazado_vigente';
  ELSE v_fase:='restringido';
  END IF;

  RETURN jsonb_build_object(
    'politica','legal-v2.0','habilitado',true,'fase',v_fase,
    'decision','rechazado','decision_id',v_rechazo,'restringido',v_fase='restringido',
    'bloquea_operaciones',true,'fecha_consulta',v_today,'ultima_cobertura',v_ultima,
    'servicios_activos',v_total,'servicios',v_servicios,
    'requiere_revision',v_revision OR v_sin_cobertura>0 OR v_fase='cuenta_suspendida',
    'baja_confirmada',v_baja_confirmada,
    'baja_pendiente',v_fase='restringido' AND v_total>0 AND NOT v_baja_confirmada
  );
END;
$f$;
REVOKE ALL ON FUNCTION public.goxion_legal_estado_acceso(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.goxion_legal_estado_acceso(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.goxion_legal_finalizar_servicios(p_cliente_id uuid)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path=public,pg_temp
AS $f$
DECLARE
  v_state jsonb;
  v_snapshot jsonb;
  v_rechazo uuid;
  v_acc int:=0;
  v_svc int:=0;
BEGIN
  PERFORM 1 FROM public.clientes WHERE id=p_cliente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente'; END IF;

  v_state:=public.goxion_legal_estado_acceso(p_cliente_id);
  IF v_state->>'decision'<>'rechazado' OR v_state->>'fase'<>'restringido'
     OR (v_state->>'requiere_revision')::boolean IS TRUE THEN
    RAISE EXCEPTION 'Baja denegada: cobertura activa, revisión pendiente o términos aceptados';
  END IF;
  v_rechazo:=(v_state->>'decision_id')::uuid;
  IF EXISTS(SELECT 1 FROM public.goxion_legal_bajas WHERE rechazo_id=v_rechazo) THEN
    RETURN jsonb_build_object('ok',true,'ya_confirmada',true,'servicios_desactivados',0,'accesos_desactivados',0);
  END IF;

  v_snapshot:=coalesce(v_state->'servicios','[]'::jsonb);
  UPDATE public.cliente_accesos SET activo=false,updated_at=now()
  WHERE cliente_id=p_cliente_id AND activo=true;
  GET DIAGNOSTICS v_acc=ROW_COUNT;
  UPDATE public.cliente_servicios SET activo=false,updated_at=now()
  WHERE cliente_id=p_cliente_id AND activo=true;
  GET DIAGNOSTICS v_svc=ROW_COUNT;

  INSERT INTO public.goxion_legal_bajas
    (cliente_id,version,rechazo_id,servicios,accesos_desactivados,servicios_desactivados)
  VALUES(p_cliente_id,'2.0',v_rechazo,v_snapshot,v_acc,v_svc);

  RETURN jsonb_build_object('ok',true,'ya_confirmada',false,
    'servicios_desactivados',v_svc,'accesos_desactivados',v_acc,
    'retiro_externo','pendiente_manual');
END;
$f$;
REVOKE ALL ON FUNCTION public.goxion_legal_finalizar_servicios(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.goxion_legal_finalizar_servicios(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.goxion_legal_serializar_decision()
RETURNS trigger LANGUAGE plpgsql VOLATILE SECURITY INVOKER
SET search_path=public,pg_temp
AS $f$
BEGIN
  IF NEW.version='2.0' THEN
    PERFORM 1 FROM public.clientes WHERE id=NEW.cliente_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cliente inexistente'; END IF;
  END IF;
  RETURN NEW;
END;
$f$;
REVOKE ALL ON FUNCTION public.goxion_legal_serializar_decision() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.goxion_legal_serializar_decision() TO service_role;
DROP TRIGGER IF EXISTS tr_goxion_legal_bloquear_piloto ON public.goxion_legal_decisiones;
DROP TRIGGER IF EXISTS tr_goxion_legal_serializar ON public.goxion_legal_decisiones;
CREATE TRIGGER tr_goxion_legal_serializar
BEFORE INSERT ON public.goxion_legal_decisiones
FOR EACH ROW EXECUTE FUNCTION public.goxion_legal_serializar_decision();

SELECT
 (SELECT count(*) FROM public.goxion_legal_bajas) AS bajas_historicas,
 (SELECT count(*) FROM public.goxion_coberturas_legales_contrato) AS contratos_agrupados,
 has_function_privilege('anon','public.goxion_legal_finalizar_servicios(uuid)','EXECUTE') AS anon_puede_finalizar;
