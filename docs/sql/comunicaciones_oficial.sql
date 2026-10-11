-- GOXION · Comunicaciones oficiales | snapshot SQL verificable 2026-10-11
-- La base recibió estas tablas vía migraciones aplicadas; este archivo es referencia
-- de instalación idempotente y auditoría. Nunca ejecutar dos veces sin cotejar esquema.

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

CREATE TABLE IF NOT EXISTS public.goxion_comunicacion_campanas (
 id uuid PRIMARY KEY, tipo text NOT NULL CHECK(tipo IN ('missions','pay','promo','general')),
 titulo text NOT NULL, mensaje text NOT NULL,
 promocion_id uuid REFERENCES public.promociones_catalogo(id),
 estado text NOT NULL DEFAULT 'procesando', creados integer NOT NULL DEFAULT 0,
 omitidos integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(),
 ejecutada_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.goxion_comunicacion_entregas (
 campana_id uuid NOT NULL REFERENCES public.goxion_comunicacion_campanas(id),
 cliente_id uuid NOT NULL REFERENCES public.clientes(id),
 estado text NOT NULL, motivo text,
 notificacion_id uuid REFERENCES public.cliente_notificaciones(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(campana_id,cliente_id)
);
CREATE TABLE IF NOT EXISTS public.goxion_comunicacion_agenda (
 id uuid PRIMARY KEY, tipo text NOT NULL CHECK(tipo IN ('missions','pay','promo','general')),
 titulo text NOT NULL, mensaje text NOT NULL,
 promocion_id uuid REFERENCES public.promociones_catalogo(id),
 agregar_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
 excluir_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
 programada_at timestamptz NOT NULL,
 estado text NOT NULL DEFAULT 'programada',
 intentos int NOT NULL DEFAULT 0,
 resultado jsonb,error text,created_at timestamptz NOT NULL DEFAULT now(),ejecutada_at timestamptz
);
ALTER TABLE public.goxion_comunicacion_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goxion_comunicacion_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goxion_comunicacion_agenda ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.goxion_comunicacion_campanas,public.goxion_comunicacion_entregas,public.goxion_comunicacion_agenda FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_goxion_com_entregas_cliente ON public.goxion_comunicacion_entregas(cliente_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goxion_com_agenda_pending ON public.goxion_comunicacion_agenda(programada_at) WHERE estado IN ('programada','error');

CREATE OR REPLACE FUNCTION public.goxion_comunicaciones_emitir(p_campana_id uuid, p_tipo text, p_titulo text, p_mensaje text, p_clientes uuid[], p_promocion_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_now timestamptz := now();
  v_row public.clientes%rowtype;
  v_gam record;
  v_lines text[];
  v_total int;
  v_hechas int;
  v_pendientes int;
  v_fin jsonb;
  v_promo jsonb;
  v_disp jsonb;
  v_promo_title text;
  v_reason text;
  v_note_id uuid;
  v_existing uuid;
  v_template_title text;
  v_template_body text;
  v_id uuid;
  v_sent int:=0;
  v_omitted int:=0;
  v_campaign_id uuid;
  v_key text;
  v_days int;
BEGIN
  IF p_tipo NOT IN ('missions','pay','promo','general') OR
     p_campana_id IS NULL OR
     char_length(coalesce(trim(p_titulo),'')) NOT BETWEEN 3 AND 90 OR
     char_length(coalesce(trim(p_mensaje),'')) NOT BETWEEN 6 AND 420 OR
     p_clientes IS NULL OR cardinality(p_clientes)>500 OR
     p_promocion_id IS NOT NULL AND p_tipo<>'promo' OR
     p_tipo='promo' AND p_promocion_id IS NULL
  THEN RAISE EXCEPTION 'Campaña inválida o fuera de límites'; END IF;
  -- La inserción es el candado idempotente: reintentos con el mismo UUID no reenvían.
  INSERT INTO public.goxion_comunicacion_campanas(id,tipo,titulo,mensaje,promocion_id)
  VALUES(p_campana_id,p_tipo,trim(p_titulo),trim(p_mensaje),p_promocion_id)
  ON CONFLICT (id) DO NOTHING RETURNING id INTO v_campaign_id;
  IF v_campaign_id IS NULL THEN
    SELECT creados,omitidos INTO v_sent,v_omitted
    FROM public.goxion_comunicacion_campanas WHERE id=p_campana_id;
    RETURN jsonb_build_object('ok',true,'repetido',true,'campana_id',p_campana_id,'creados',coalesce(v_sent,0),'omitidos',coalesce(v_omitted,0));
  END IF;
  IF p_tipo='promo' THEN
    SELECT to_jsonb(p),coalesce(nullif(p.titulo_publico,''),p.nombre)
      INTO v_promo,v_promo_title
    FROM public.promociones_catalogo p
    WHERE p.id=p_promocion_id AND p.activa AND p.publicada AND p.adquisicion_habilitada
      AND p.inicio<=v_now AND p.fin>v_now;
    IF v_promo IS NULL THEN RAISE EXCEPTION 'Promoción ya no está disponible'; END IF;
  END IF;
  v_key:='comunicaciones:'||p_campana_id::text||':'||p_tipo;
  FOR v_id IN SELECT DISTINCT x FROM unnest(p_clientes) AS x ORDER BY x LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('goxion-com:'||v_id::text,0));
    v_reason:=NULL;v_note_id:=NULL;v_days:=NULL;v_total:=0;v_hechas:=0;v_pendientes:=0;
    SELECT * INTO v_row FROM public.clientes WHERE id=v_id;
    IF NOT FOUND OR v_row.estado='suspendido' OR
       coalesce(v_row.nombre,'')~*'^(cliente[[:space:]]+)?(prueba|test|demo)([[:space:]]|$)' OR
       NOT EXISTS(SELECT 1 FROM public.cliente_servicios cs WHERE cs.cliente_id=v_id AND cs.activo)
      THEN v_reason:='cliente_inactivo';
    ELSIF p_tipo='missions' THEN
      SELECT tareas,misiones_version INTO v_gam FROM public.gamificacion
        WHERE cliente_id=v_id AND misiones_activas;
      v_lines:=ARRAY(SELECT trim(x) FROM unnest(string_to_array(coalesce(v_gam.tareas,''),E'\n')) x WHERE trim(x)<>'');
      v_total:=coalesce(cardinality(v_lines),0);
      SELECT count(DISTINCT mision_index) INTO v_hechas FROM public.cliente_misiones_progreso
        WHERE cliente_id=v_id AND misiones_version=v_gam.misiones_version
        AND completada_at IS NOT NULL AND mision_index>=0 AND mision_index<v_total;
      v_pendientes:=v_total-coalesce(v_hechas,0);
      IF v_pendientes<=0 THEN v_reason:='misiones_completadas_o_inactivas'; END IF;
    ELSIF p_tipo='pay' THEN
      v_fin:=public.goxion_estado_financiero(v_id);
      IF v_fin IS NULL OR coalesce((v_fin->>'esta_pagado_periodo')::boolean,false)
        OR coalesce((v_fin->>'total_actual')::numeric,0)<=0
        OR v_fin->>'fecha_corte' IS NULL
        OR v_fin->>'dias_para_corte' IS NULL THEN v_reason:='pago_cubierto_o_no_verificado';
      ELSE
        v_days:=(v_fin->>'dias_para_corte')::int;
        IF v_days<0 THEN v_reason:='fecha_de_cobro_pasada'; END IF;
      END IF;
    ELSIF p_tipo='promo' THEN
      v_promo:=public.goxion_promocion_elegibilidad(v_id,p_promocion_id,v_now);
      v_disp:=public.goxion_promocion_disponibilidad(p_promocion_id,v_id);
      IF coalesce((v_promo->>'elegible')::boolean,false)<>true
        OR coalesce((v_disp->>'disponible')::boolean,false)<>true THEN
        v_reason:='promocion_no_elegible_o_sin_stock';
      END IF;
    END IF;
    -- No inundar a un cliente con comunicaciones comerciales repetidas.
    IF v_reason IS NULL AND p_tipo IN ('promo','general') AND EXISTS(
      SELECT 1 FROM public.cliente_notificaciones n
      WHERE n.cliente_id=v_id AND n.tipo IN ('campana_promo','campana_general')
        AND n.created_at>v_now-interval '72 hours'
    ) THEN v_reason:='frecuencia_comercial_72h'; END IF;
    -- Permitir una sola comunicación equivalente por cliente y día, incluso con otra campaña UUID.
    IF v_reason IS NULL AND p_tipo IN ('missions','pay') AND EXISTS(
      SELECT 1 FROM public.cliente_notificaciones n WHERE n.cliente_id=v_id
        AND n.tipo='campana_'||p_tipo AND n.created_at>v_now-interval '20 hours'
    ) THEN v_reason:='recordatorio_reciente'; END IF;
    IF v_reason IS NULL THEN
      v_template_title:=replace(trim(p_titulo),'{nombre}',v_row.nombre);
      v_template_body:=replace(trim(p_mensaje),'{nombre}',v_row.nombre);
      v_template_body:=replace(v_template_body,'{hechas}',v_hechas::text);
      v_template_body:=replace(v_template_body,'{total}',v_total::text);
      v_template_body:=replace(v_template_body,'{pendientes}',v_pendientes::text);
      IF v_days IS NOT NULL THEN
        v_template_body:=replace(v_template_body,'{dias_cobro}',v_days::text);
        v_template_body:=replace(v_template_body,'{aviso_cobro}',CASE WHEN v_days=0 THEN 'tu fecha de corte es hoy'
          WHEN v_days=1 THEN 'falta 1 día para tu próxima fecha de corte'
          ELSE 'faltan '||v_days||' días para tu próxima fecha de corte' END);
      END IF;
      IF v_promo_title IS NOT NULL THEN
        v_template_body:=replace(v_template_body,'{promocion}',v_promo_title);
        v_template_title:=replace(v_template_title,'{promocion}',v_promo_title);
      END IF;
      INSERT INTO public.cliente_notificaciones(cliente_id,tipo,titulo,mensaje,referencia,prioridad,dedupe_key)
      VALUES(v_id,'campana_'||p_tipo,left(v_template_title,90),left(v_template_body,420),
        CASE WHEN p_tipo='missions' THEN 'recompensas'
          WHEN p_tipo='promo' THEN 'promociones'
          WHEN p_tipo='pay' THEN 'estado-cuenta' ELSE 'mi-espacio' END,
        CASE WHEN p_tipo='pay' THEN 2 ELSE 1 END,v_key)
      ON CONFLICT DO NOTHING RETURNING id INTO v_note_id;
      IF v_note_id IS NULL THEN v_reason:='duplicado'; END IF;
    END IF;
    INSERT INTO public.goxion_comunicacion_entregas(campana_id,cliente_id,estado,motivo,notificacion_id)
    VALUES(p_campana_id,v_id,CASE WHEN v_note_id IS NOT NULL THEN 'insertada'
      WHEN v_reason='duplicado' THEN 'duplicada' ELSE 'omitida' END,v_reason,v_note_id);
    IF v_note_id IS NOT NULL THEN v_sent:=v_sent+1; ELSE v_omitted:=v_omitted+1; END IF;
  END LOOP;
  UPDATE public.goxion_comunicacion_campanas SET estado='finalizada',
    ejecutada_at=now(), creados=v_sent,omitidos=v_omitted WHERE id=p_campana_id;
  RETURN jsonb_build_object('ok',true,'repetido',false,'campana_id',p_campana_id,'creados',v_sent,'omitidos',v_omitted);
END $function$


CREATE OR REPLACE FUNCTION public.goxion_comunicaciones_procesar_agenda()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v public.goxion_comunicacion_agenda%rowtype;
  ids uuid[];
  cid uuid;
  f jsonb;
  salida jsonb;
  processed int:=0;
  canceled int:=0;
BEGIN
  FOR v IN
    SELECT * FROM public.goxion_comunicacion_agenda
    WHERE estado IN ('programada','error') AND programada_at<=now()
      AND intentos<3
    ORDER BY programada_at,id LIMIT 10 FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE public.goxion_comunicacion_agenda SET estado='en_proceso',intentos=intentos+1,error=NULL WHERE id=v.id;
      IF v.tipo='missions' THEN
        SELECT array_agg(c.id ORDER BY c.id) INTO ids FROM public.clientes c
          JOIN public.gamificacion g ON g.cliente_id=c.id AND g.misiones_activas
          WHERE c.estado<>'suspendido'
            AND NOT (coalesce(c.nombre,'') ~* '^(cliente[[:space:]]+)?(prueba|test|demo)([[:space:]]|$)')
            AND EXISTS(SELECT 1 FROM public.cliente_servicios cs WHERE cs.cliente_id=c.id AND cs.activo);
      ELSIF v.tipo='pay' THEN
        ids:=ARRAY[]::uuid[];
        FOR cid IN SELECT c.id FROM public.clientes c
          WHERE c.estado<>'suspendido' AND NOT (coalesce(c.nombre,'') ~* '^(cliente[[:space:]]+)?(prueba|test|demo)([[:space:]]|$)')
          AND EXISTS(SELECT 1 FROM public.cliente_servicios cs WHERE cs.cliente_id=c.id AND cs.activo)
        LOOP
          f:=public.goxion_estado_financiero(cid);
          IF f IS NOT NULL AND coalesce((f->>'esta_pagado_periodo')::boolean,false) = false
            AND (f->>'dias_para_corte') IS NOT NULL AND (f->>'dias_para_corte')::int BETWEEN 0 AND 7
            THEN ids:=array_append(ids,cid); END IF;
        END LOOP;
      ELSE
        SELECT array_agg(c.id ORDER BY c.id) INTO ids FROM public.clientes c
          WHERE c.estado<>'suspendido'
            AND NOT (coalesce(c.nombre,'') ~* '^(cliente[[:space:]]+)?(prueba|test|demo)([[:space:]]|$)')
            AND EXISTS(SELECT 1 FROM public.cliente_servicios cs WHERE cs.cliente_id=c.id AND cs.activo);
      END IF;
      ids:=coalesce(ids,ARRAY[]::uuid[]);
      ids:=ARRAY(SELECT DISTINCT id FROM unnest(ids||v.agregar_ids) id
                  WHERE id<>ALL(v.excluir_ids) ORDER BY id);
      IF cardinality(ids)>500 THEN
         RAISE EXCEPTION 'Hay más de 500 candidatos; segmentación requerida';
      END IF;
      salida:=public.goxion_comunicaciones_emitir(v.id,v.tipo,v.titulo,v.mensaje,ids,v.promocion_id);
      UPDATE public.goxion_comunicacion_agenda SET estado='completada',resultado=salida,
        ejecutada_at=now() WHERE id=v.id;
      processed:=processed+1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.goxion_comunicacion_agenda SET estado='error',error=left(SQLERRM,240)
        WHERE id=v.id;
      canceled:=canceled+1;
    END;
  END LOOP;
  RETURN jsonb_build_object('procesadas',processed,'fallidas',canceled);
END $function$


REVOKE ALL ON FUNCTION public.goxion_comunicaciones_emitir(uuid,text,text,text,uuid[],uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.goxion_comunicaciones_emitir(uuid,text,text,text,uuid[],uuid) TO service_role;
REVOKE ALL ON FUNCTION public.goxion_comunicaciones_procesar_agenda() FROM PUBLIC,anon,authenticated,service_role;
-- Crear cron sólo una vez.
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM cron.job WHERE jobname='goxion-comunicaciones-programadas') THEN
   PERFORM cron.schedule('goxion-comunicaciones-programadas','*/15 * * * *','SELECT public.goxion_comunicaciones_procesar_agenda();');
 END IF;
END $$;
