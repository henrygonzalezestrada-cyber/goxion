-- GOXION B2 F2: corrige lectura incompleta en confirmación de prórroga.
-- La función instalada antes omitía pago_en_revision y fallaba en ejecución.
-- Sin escrituras de datos; mantiene guard de comprobante B2 pendiente.
create or replace function public.goxion_b2_solicitar_prorroga(
 p_cliente_id uuid,p_cargo_id uuid,p_fecha_pactada date,
 p_operation_id uuid,p_motivo text default 'Solicito prórroga'
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_cliente record;v_cargo record;v_ciclo record;v_prev record;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_result record;
begin
 if p_cliente_id is null or p_cargo_id is null or p_operation_id is null
 or p_fecha_pactada is null or length(btrim(coalesce(p_motivo,''))) not between 3 and 300
 then raise exception 'Solicitud de prórroga incompleta';end if;
 select id,estado,periodo_pendiente,pago_en_revision into v_cliente from public.clientes
 where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then
  raise exception 'Cliente no disponible';end if;
 select * into v_prev from public.goxion_b2_prorrogas
 where operation_id=p_operation_id;
 if found then
  if v_prev.cliente_id is distinct from p_cliente_id or
     v_prev.cargo_id is distinct from p_cargo_id or
     v_prev.fecha_pactada is distinct from p_fecha_pactada or
     v_prev.motivo is distinct from p_motivo then
    raise exception 'PRORROGA_IDEMPOTENCIA_INCOMPATIBLE';
  end if;
  return jsonb_build_object('ok',true,'repetida',true,
    'solicitud_id',v_prev.id,'estado',v_prev.estado,
    'acuerdo_activo',v_prev.estado='aprobada','aprobacion','automatica');
 end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  raise exception 'B2_NO_ACTIVO';end if;
 select * into v_cargo from public.goxion_b2_cargos
 where id=p_cargo_id and cliente_id=p_cliente_id for update;
 if not found or v_cargo.liquidado or v_cargo.principal_pendiente_centavos<=0
 then raise exception 'OBLIGACION_NO_ELEGIBLE';end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_cargo.ciclo_id and cliente_id=p_cliente_id for update;
 if v_ciclo.estado<>'pendiente' or
    v_ciclo.periodo is distinct from v_cliente.periodo_pendiente
 then raise exception 'CICLO_NO_DISPONIBLE';end if;
 if v_cliente.pago_en_revision then raise exception 'PRORROGA_PAGO_EN_REVISION';end if;
 -- Un comprobante B2 reportado y todavía pendiente congela la fecha.
 -- Es el mismo ciclo: no prometer nueva fecha mientras Admin revisa cobro.
 if exists(select 1 from public.goxion_b2_comprobantes r
   where r.cliente_id=p_cliente_id and r.ciclo_id=v_ciclo.id
   and r.estado='reportado')
 then raise exception 'PRORROGA_PAGO_EN_REVISION_B2';end if;
 if v_hoy<>v_cargo.fecha_vencimiento
  or p_fecha_pactada<=v_cargo.fecha_vencimiento
  or p_fecha_pactada>v_cargo.fecha_vencimiento+5
  or v_ciclo.lealtad_perdida then
  raise exception 'PRORROGA_FUERA_DE_PLAZO';
 end if;
 if exists(select 1 from public.goxion_b2_prorrogas
  where cliente_id=p_cliente_id and ciclo_id=v_ciclo.id)
 then raise exception 'PRORROGA_USADA_EN_ESTE_CICLO';end if;
 -- La extensión NO puede solaparse con otro acceso cuyo vencimiento
 -- todavía está pendiente: sin esto prometería conservar lealtad cuando
 -- otra fecha se perdería antes.
 if exists(select 1 from public.goxion_b2_cargos b
  where b.ciclo_id=v_ciclo.id and b.id<>v_cargo.id and not b.liquidado
  and b.fecha_vencimiento>v_cargo.fecha_vencimiento
  and b.fecha_vencimiento<=p_fecha_pactada)
 then raise exception 'PRORROGA_CRUZA_OTRO_VENCIMIENTO';end if;
 -- Una fecha independiente que ya se venció descalifica la prórroga:
 -- la lealtad global ya se perdió y no puede revivirse.
 if exists(select 1 from public.goxion_b2_cargos b
  where b.ciclo_id=v_ciclo.id and b.id<>v_cargo.id and
    b.fecha_vencimiento<v_hoy and not b.liquidado and
    not exists(select 1 from public.goxion_b2_prorrogas pr
       where pr.cargo_id=b.id and pr.estado='aprobada'
         and pr.fecha_pactada>=v_hoy))
 then raise exception 'OTRA_FECHA_DEL_CLIENTE_INCUMPLIDA';end if;
 insert into public.goxion_b2_prorrogas(cliente_id,ciclo_id,cargo_id,
  fecha_original,fecha_pactada,estado,motivo,operation_id)
 values(p_cliente_id,v_ciclo.id,p_cargo_id,v_cargo.fecha_vencimiento,
  p_fecha_pactada,'aprobada',p_motivo,p_operation_id)
 returning * into v_result;
 return jsonb_build_object('ok',true,'solicitud_id',v_result.id,
   'estado','aprobada','aprobacion','automatica','requiere_aprobacion_admin',false,
   'fecha_original',v_result.fecha_original,
   'fecha_pactada',v_result.fecha_pactada,
   'mantiene_fecha_corte_original',true,'acuerdo_activo',true);
end $$;




revoke all on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text)
 from public,anon,authenticated;
grant execute on function public.goxion_b2_solicitar_prorroga(uuid,uuid,date,uuid,text)
 to service_role;
