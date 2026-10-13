-- GOXION · Prórroga AUTOGESTIONADA. Solo servidor autenticado llama RPC.
-- Confirmar el acuerdo es automático y transaccional. Se conserva la
-- fecha de corte ORIGINAL; no hay aprobación ni estado intermedio.
create or replace function public.goxion_prorroga_auto_global(
 p_cliente_id uuid,p_fecha_pactada date,p_operation_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_c record;v_pact record;v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_original date;v_base numeric;v_estado jsonb;v_mora numeric;v_total numeric;
 v_racha int;
begin
 if p_cliente_id is null or p_fecha_pactada is null or p_operation_id is null then
  raise exception 'PRORROGA_DATOS_INVALIDOS';end if;
 select * into v_c from public.clientes where id=p_cliente_id for update;
 if not found or v_c.estado='suspendido' then raise exception 'PRORROGA_CUENTA_NO_ELEGIBLE';end if;
 select * into v_pact from public.acuerdos_cobro where cliente_id=p_cliente_id
   and periodo=v_c.periodo_pendiente for update;
 if found then
  if v_pact.operation_id=p_operation_id and v_pact.fecha_pactada=p_fecha_pactada
  then return jsonb_build_object('ok',true,'repetida',true,'estado','activo',
   'fecha_original',v_pact.fecha_original,'fecha_pactada',v_pact.fecha_pactada,
   'acuerdo_id',v_pact.id,'aprobacion','automatica');end if;
  raise exception 'PRORROGA_YA_UTILIZADA_EN_PERIODO';
 end if;
 if v_c.pago_en_revision then raise exception 'PRORROGA_PAGO_EN_REVISION';end if;
 if exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  raise exception 'PRORROGA_USAR_CALENDARIO_B2';end if;
 if v_c.periodo_pendiente is null then raise exception 'PRORROGA_PERIODO_DESCONOCIDO';end if;
 v_original=make_date(extract(year from v_c.periodo_pendiente)::int,
  extract(month from v_c.periodo_pendiente)::int,
  least(v_c.dia_pago,extract(day from
   date_trunc('month',v_c.periodo_pendiente)+interval '1 month - 1 day')::int));
 -- La opción se habilita SOLO el día de pago, ni antes ni después.
 if v_hoy<>v_original then raise exception 'PRORROGA_SOLO_DIA_DE_PAGO';end if;
 if p_fecha_pactada<=v_original or p_fecha_pactada>v_original+5 then
  raise exception 'PRORROGA_MAX_5_DIAS';end if;
 if exists(select 1 from public.pagos where cliente_id=p_cliente_id and estado='pagado'
  and public.goxion_periodo_pago_canonico(periodo)=v_c.periodo_pendiente) then
  raise exception 'PRORROGA_YA_PAGADO';end if;
 -- No ofrecer prórroga si esta cuenta está atrasada por obligaciones de
 -- distintos vencimientos; mientras no haya B2, esta condición basta.
 v_estado=public.goxion_estado_financiero(p_cliente_id);
 if v_estado->>'fuente_financiera'<>'supabase:goxion_estado_financiero'
 or coalesce((v_estado->'cargos'->>'mora')::numeric,0)>0 then
  raise exception 'PRORROGA_ESTADO_NO_CONCILIADO';end if;
 insert into public.acuerdos_cobro(cliente_id,periodo,fecha_original,
  fecha_pactada,motivo,activo,estado,operation_id)
 values(p_cliente_id,v_c.periodo_pendiente,v_original,p_fecha_pactada,
  'Prórroga automática confirmada desde Mi Espacio',true,'activo',p_operation_id)
 returning * into v_pact;
 -- Monto protegido desde el estado oficial, ahora con la prórroga vigente.
 v_estado=public.goxion_estado_financiero(p_cliente_id);
 v_total=coalesce((v_estado->>'total_actual')::numeric,0);
 v_base=coalesce((v_estado->>'subtotal')::numeric,v_total);
 v_mora=round(v_base*least(0.5,((p_fecha_pactada-v_original+1)*0.05)),2);
 return jsonb_build_object('ok',true,'estado','activo','aprobacion','automatica',
  'repetida',false,'acuerdo_id',v_pact.id,'fecha_original',v_original,
  'fecha_pactada',p_fecha_pactada,'total_protegido',v_total,
  'mora_retroactiva_estimada',v_mora,
  'vencimiento_original_intacto',true,'requiere_admin',false);
end $$;
revoke all on function public.goxion_prorroga_auto_global(uuid,date,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_prorroga_auto_global(uuid,date,uuid)
 to service_role;
