-- GOXION global: acuerdo sin penalidad mientras esté vigente,
-- con mora RETROACTIVA desde corte original si incumple.
CREATE OR REPLACE FUNCTION public.goxion_estado_cuenta_core_v1(p_cliente_id uuid, p_hoy date DEFAULT (timezone('America/Mexico_City'::text, now()))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  c public.clientes%rowtype;
  v_period date;
  v_period_key text;
  v_period_label text;
  v_month_name text;
  v_last_day int;
  v_cut_day int;
  v_cut_original date;
  v_cut date;
  v_pact_id uuid;
  v_pact_date date;
  v_pact_reason text;
  v_diff int;
  v_review text;
  v_en_revision boolean;
  v_pago_incompleto boolean;
  v_faltante numeric := 0;
  v_partial_id uuid;
  v_partial_date date;
  v_partial_amount numeric := 0;
  v_partial_balance numeric := 0;
  v_partial_mora_days int := 0;
  v_paid_period boolean := false;
  v_paid boolean := false;
  v_subtotal_normal numeric := 0;
  v_subtotal numeric := 0;
  v_promo_engine jsonb := '{}'::jsonb;
  v_promo_total numeric := 0;
  v_promo_details jsonb := '[]'::jsonb;
  v_streak_original int := 0;
  v_streak int := 0;
  v_streak_lost boolean := false;
  v_loyalty_pct numeric := 0;
  v_loyalty_amount numeric := 0;
  v_special numeric := 0;
  v_tj numeric := 0;
  v_discount_total numeric := 0;
  v_days_late int := 0;
  v_mora_pct numeric := 0;
  v_mora numeric := 0;
  v_mora_base numeric := 0;
  v_reactivation numeric := 0;
  v_total_calc numeric := 0;
  v_total_display numeric := 0;
  v_status text := 'pendiente';
  v_status_label text := 'Pendiente';
  v_total_label text := 'Total a Pagar';
  v_services jsonb := '[]'::jsonb;
  v_special_details jsonb := '[]'::jsonb;
  v_tj_details jsonb := '[]'::jsonb;
  v_breakdown jsonb := '[]'::jsonb;
  v_discount_details jsonb := '[]'::jsonb;
begin
  select * into c from public.clientes where id=p_cliente_id;
  if c.id is null then raise exception 'Cliente inexistente'; end if;

  v_period := coalesce(c.periodo_pendiente, date_trunc('month',p_hoy)::date);
  v_period_key := to_char(v_period,'YYYY-MM');
  v_month_name := (array['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'])[extract(month from v_period)::int];
  v_period_label := v_month_name||' de '||extract(year from v_period)::int;
  v_last_day := extract(day from (date_trunc('month',v_period)+interval '1 month - 1 day'))::int;
  v_cut_day := least(greatest(coalesce(c.dia_pago,15),1),v_last_day);
  v_cut_original := make_date(extract(year from v_period)::int,extract(month from v_period)::int,v_cut_day);

  select a.id,a.fecha_pactada,a.motivo
    into v_pact_id,v_pact_date,v_pact_reason
  from public.acuerdos_cobro a
  where a.cliente_id=p_cliente_id and a.periodo=v_period and a.activo=true and a.estado='activo'
  order by a.updated_at desc,a.created_at desc limit 1;

  -- Prórroga: conservamos la fecha original del ciclo.
  -- Si la fecha pactada se incumple, se pierde la lealtad
  -- y se reclaman TODOS los días desde el corte original.
  v_cut := case when v_pact_date is not null and p_hoy<=v_pact_date
    then v_pact_date else v_cut_original end;
  v_diff := v_cut-p_hoy;

  select coalesce(sum(monto),0),
         coalesce(jsonb_agg(jsonb_build_object('id',id,'nombre',nombre,'monto',monto) order by created_at),'[]'::jsonb)
  into v_subtotal_normal,v_services
  from public.cliente_servicios
  where cliente_id=p_cliente_id and activo=true;

  v_promo_engine := public.goxion_promociones_periodo(p_cliente_id,v_period);
  v_promo_total := least(v_subtotal_normal,greatest(0,coalesce((v_promo_engine->>'total_ahorro')::numeric,0)));
  v_promo_details := coalesce(v_promo_engine->'detalles','[]'::jsonb);
  v_subtotal := greatest(0,v_subtotal_normal-v_promo_total);

  select exists(
      select 1 from public.pagos
      where cliente_id=p_cliente_id
        and lower(coalesce(estado,'pagado'))='pagado'
        and public.goxion_period_key(coalesce(periodo,fecha::text))=v_period_key
  ) into v_paid_period;

  v_review := lower(coalesce(c.pago_revision_estado,''));
  v_en_revision := c.pago_en_revision=true or v_review='revision';
  v_paid := v_paid_period;
  if c.estado in ('pendiente','suspendido') or v_en_revision then v_paid:=false; end if;

  select pp.id,pp.fecha_pago,pp.monto_pagado,pp.saldo_restante
    into v_partial_id,v_partial_date,v_partial_amount,v_partial_balance
  from public.pagos_parciales pp
  where pp.cliente_id=p_cliente_id and pp.periodo=v_period and pp.activo=true and pp.estado='pendiente'
  order by pp.fecha_pago desc,pp.created_at desc limit 1;

  v_faltante := greatest(0,coalesce(case when v_partial_id is not null then v_partial_balance else null end,c.pago_revision_monto_faltante,0));
  v_pago_incompleto := (not v_paid) and (not v_en_revision) and (v_partial_id is not null or v_review='incompleto');

  v_streak_original := greatest(0,coalesce(c.pagos_puntuales,0));
  v_streak := v_streak_original;
  if (not v_paid) and v_diff<0 and v_streak_original>0 then
    v_streak:=0; v_streak_lost:=true;
  end if;

  if v_streak>=9 then v_loyalty_pct:=0.06;
  elsif v_streak>=4 then v_loyalty_pct:=0.03;
  else v_loyalty_pct:=0;
  end if;

  if v_en_revision then
    v_status:='revision'; v_status_label:='Pago en revisión';
  elsif v_paid then
    v_status:='pagado'; v_status_label:='Al corriente este mes';
  elsif v_pago_incompleto then
    v_status:='incompleto';
    v_status_label:=case when v_faltante>0 then 'Pago parcial · resta $'||to_char(v_faltante,'FM999999990.00') else 'Pago parcial' end;
  elsif v_diff>0 then
    v_status:='por_vencer'; v_status_label:='Vence en '||v_diff||' día(s)';
  elsif v_diff=0 then
    v_status:='vence_hoy'; v_status_label:='Tu corte es HOY';
  else
    v_status:='vencido'; v_days_late:=abs(v_diff); v_status_label:='Vencido hace '||v_days_late||' día(s)';
  end if;

  if (not v_paid) and v_diff<0 then
    if v_pago_incompleto and v_partial_id is not null then
      v_partial_mora_days:=greatest(0,p_hoy-greatest(v_cut,v_partial_date));
      v_mora_pct:=least(v_partial_mora_days*0.05,0.50);
      v_mora_base:=v_faltante;
      v_mora:=round(v_mora_base*v_mora_pct);
      v_days_late:=abs(v_diff);
    else
      v_days_late:=abs(v_diff);
      v_mora_pct:=least(v_days_late*0.05,0.50);
      v_mora_base:=v_subtotal;
      v_mora:=round(v_mora_base*v_mora_pct);
    end if;
  end if;

  if (not v_paid) and (v_days_late>15 or c.estado='suspendido') then
    if v_pago_incompleto then
      v_reactivation:=round((v_faltante+v_mora)*0.20);
    else
      v_reactivation:=round((v_subtotal+v_mora)*0.20);
    end if;
  end if;

  if v_days_late=0 and c.estado<>'suspendido' and not v_paid then
    v_loyalty_amount:=round(v_subtotal*v_loyalty_pct);
  end if;

  select coalesce(sum(monto),0),
         coalesce(jsonb_agg(jsonb_build_object('id',id,'concepto',descripcion,'monto',monto,'tipo','especial') order by created_at),'[]'::jsonb)
  into v_special,v_special_details
  from public.descuentos_especiales
  where cliente_id=p_cliente_id and activo=true and monto>0;

  select coalesce(sum(t.monto),0),
         coalesce(jsonb_agg(jsonb_build_object('id',t.id,'concepto','Trato Justo · '||coalesce(cs.nombre,'Servicio')||' ('||t.dias_falla||' día'||case when t.dias_falla=1 then '' else 's' end||')','monto',t.monto,'tipo','trato_justo','dias_falla',t.dias_falla,'porcentaje',t.porcentaje,'cliente_servicio_id',t.cliente_servicio_id) order by t.created_at),'[]'::jsonb)
  into v_tj,v_tj_details
  from public.trato_justo_compensaciones t
  left join public.cliente_servicios cs on cs.id=t.cliente_servicio_id
  where t.cliente_id=p_cliente_id and t.activo=true and t.periodo=v_period and t.monto>0;

  v_discount_total:=v_loyalty_amount+v_special+v_tj;
  v_total_calc:=greatest(0,v_subtotal-v_discount_total+v_mora+v_reactivation);
  v_total_display:=v_total_calc;

  if v_paid then
    v_total_display:=0; v_total_label:='Saldo Pendiente';
  elsif v_pago_incompleto then
    v_total_display:=greatest(0,v_faltante+v_mora+v_reactivation);
    v_total_label:='Saldo Pendiente';
  end if;

  if v_promo_total>0 then
    v_discount_details:=v_discount_details||jsonb_build_array(jsonb_build_object('tipo','promocion','concepto','Promoción aplicada','monto',v_promo_total,'detalles',v_promo_details));
  end if;
  if v_loyalty_amount>0 then
    v_discount_details:=v_discount_details||jsonb_build_array(jsonb_build_object('tipo','lealtad','concepto','Descuento Lealtad','monto',v_loyalty_amount,'porcentaje',v_loyalty_pct*100));
  end if;
  v_discount_details:=v_discount_details||v_special_details||v_tj_details;

  v_breakdown:=jsonb_build_array(jsonb_build_object('tipo','subtotal','concepto','Subtotal Mensual','monto',v_subtotal_normal));
  if v_promo_total>0 then
    v_breakdown:=v_breakdown||jsonb_build_array(jsonb_build_object('tipo','descuento','subtipo','promocion','concepto','Promociones activas','monto',-v_promo_total,'detalles',v_promo_details));
  end if;
  if v_loyalty_amount>0 then
    v_breakdown:=v_breakdown||jsonb_build_array(jsonb_build_object('tipo','descuento','subtipo','lealtad','concepto','Descuento Lealtad','monto',-v_loyalty_amount,'porcentaje',v_loyalty_pct*100));
  end if;
  if jsonb_array_length(v_special_details)>0 then
    v_breakdown:=v_breakdown||(select coalesce(jsonb_agg(jsonb_build_object('tipo','descuento','subtipo','especial','concepto',x->>'concepto','monto',-(x->>'monto')::numeric)),'[]'::jsonb) from jsonb_array_elements(v_special_details) x);
  end if;
  if jsonb_array_length(v_tj_details)>0 then
    v_breakdown:=v_breakdown||(select coalesce(jsonb_agg(jsonb_build_object('tipo','descuento','subtipo','trato_justo','concepto',x->>'concepto','monto',-(x->>'monto')::numeric)),'[]'::jsonb) from jsonb_array_elements(v_tj_details) x);
  end if;
  if v_pago_incompleto and v_partial_id is not null then
    v_breakdown:=v_breakdown||jsonb_build_array(jsonb_build_object('tipo','pago_parcial','concepto','Pago parcial registrado','monto',-v_partial_amount,'saldo_restante',v_faltante,'fecha',v_partial_date));
  end if;
  if v_mora>0 then
    v_breakdown:=v_breakdown||jsonb_build_array(jsonb_build_object('tipo','cargo','subtipo','mora','concepto','Mora (+'||(v_mora_pct*100)::int||'%)','monto',v_mora,'porcentaje',v_mora_pct*100,'base',v_mora_base));
  end if;
  if v_reactivation>0 then
    v_breakdown:=v_breakdown||jsonb_build_array(jsonb_build_object('tipo','cargo','subtipo','reactivacion','concepto','Cargo Reactivación','monto',v_reactivation,'porcentaje',20));
  end if;

  return jsonb_build_object(
    'cliente_id',c.id,'folio',c.folio,'nombre',c.nombre,
    'fuente','supabase:goxion_estado_cuenta','fecha_calculo',p_hoy,
    'periodo',v_period,'periodo_key',v_period_key,'periodo_label',v_period_label,
    'dia_pago',v_cut_day,'fecha_corte_original',v_cut_original,'fecha_corte',v_cut,'fecha_pactada',v_pact_date,
    'acuerdo_cobro',case when v_pact_id is null then null else jsonb_build_object('id',v_pact_id,'fecha_original',v_cut_original,'fecha_pactada',v_pact_date,'motivo',v_pact_reason,'activo',true) end,
    'dias_para_corte',case when v_diff>0 then v_diff else 0 end,'dias_atraso',v_days_late,
    'estado',v_status,'estado_label',v_status_label,'estado_db',c.estado,
    'pago_en_revision',v_en_revision,'pago_incompleto',v_pago_incompleto,'monto_faltante_revision',v_faltante,
    'pago_parcial',case when v_partial_id is null then null else jsonb_build_object('id',v_partial_id,'fecha_pago',v_partial_date,'monto_pagado',v_partial_amount,'saldo_restante',v_faltante,'activo',true) end,
    'esta_pagado_periodo',v_paid,
    'subtotal',v_subtotal_normal,'subtotal_efectivo',v_subtotal,
    'promociones',jsonb_build_object('total_ahorro',v_promo_total,'detalles',v_promo_details),
    'total_calculado',v_total_calc,'total_actual',v_total_display,'total_label',v_total_label,
    'servicios',v_services,
    'lealtad',jsonb_build_object('pagos_guardados',v_streak_original,'pagos_efectivos',v_streak,'racha_reiniciada_virtual',v_streak_lost,'nivel',case when v_streak>=9 then 2 when v_streak>=4 then 1 else 0 end,'porcentaje',v_loyalty_pct*100,'monto',v_loyalty_amount),
    'descuentos',jsonb_build_object('promociones',v_promo_total,'lealtad',v_loyalty_amount,'especiales',v_special,'trato_justo',v_tj,'total',v_promo_total+v_discount_total,'detalles',v_discount_details),
    'cargos',jsonb_build_object('mora',v_mora,'mora_porcentaje',v_mora_pct*100,'mora_base',v_mora_base,'mora_dias',case when v_pago_incompleto then v_partial_mora_days else v_days_late end,'reactivacion',v_reactivation,'total',v_mora+v_reactivation),
    'desglose',v_breakdown
  );
end;
$function$


create or replace function public.goxion_proteger_prorroga_global()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_periodo date;v_cut date;v_dia int;
begin
 if tg_op='UPDATE' then
  if new.cliente_id is distinct from old.cliente_id or
     new.periodo is distinct from old.periodo or
     new.fecha_original is distinct from old.fecha_original or
     new.fecha_pactada is distinct from old.fecha_pactada or
     (old.activo=false and new.activo=true) or
     (old.estado='cancelado' and new.estado='activo') then
   raise exception 'PRORROGA_UNICA_POR_PERIODO: no renovar ni reactivar';
  end if;
  return new;
 end if;
 if new.estado is distinct from 'activo' or new.activo is distinct from true
   then raise exception 'Nueva prórroga debe estar activa';end if;
 if new.fecha_pactada<=new.fecha_original or
    new.fecha_pactada>new.fecha_original+5
 then raise exception 'PRORROGA_MAX_5_DIAS';end if;
 if v_hoy>new.fecha_original then
  raise exception 'PRORROGA_SOLICITUD_FUERA_DE_PLAZO';end if;
 select periodo_pendiente,dia_pago into v_periodo,v_dia
 from public.clientes where id=new.cliente_id for update;
 if not found or new.periodo is distinct from v_periodo then
  raise exception 'PRORROGA_PERIODO_DESACTUALIZADO';end if;
 v_cut=make_date(extract(year from v_periodo)::int,
 extract(month from v_periodo)::int,
 least(v_dia,extract(day from date_trunc('month',v_periodo)+
 interval '1 month - 1 day')::int));
 if v_cut is distinct from new.fecha_original then
  raise exception 'PRORROGA_FECHA_ORIGINAL_INCORRECTA';end if;
 if exists(select 1 from public.pagos p where p.cliente_id=new.cliente_id
 and public.goxion_periodo_pago_canonico(p.periodo)=new.periodo
 and p.estado='pagado') then raise exception 'PRORROGA_CICLO_PAGADO';end if;
 return new;
end $$;
drop trigger if exists goxion_proteger_prorroga_global on public.acuerdos_cobro;
create trigger goxion_proteger_prorroga_global
before insert or update on public.acuerdos_cobro
for each row execute function public.goxion_proteger_prorroga_global();
revoke all on function public.goxion_proteger_prorroga_global()
 from public,anon,authenticated;
grant execute on function public.goxion_proteger_prorroga_global()
 to service_role;
