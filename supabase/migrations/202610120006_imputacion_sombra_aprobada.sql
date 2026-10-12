-- GOXION B2 · Solo PROYECCIÓN de imputación, jamás acreditación financiera.
-- No escribe pagos ni saldos; obliga a pago fuente APROBADO, mismo cliente,
-- período canónico y límites en centavos. Las filas antiguas siguen intactas.
-- Los períodos históricos pueden estar en español: se normaliza el MES,
-- nunca se infiere qué perfil pagaron ni se asignan automáticamente.

create or replace function public.goxion_periodo_pago_canonico(p_texto text)
returns date language plpgsql immutable set search_path='' as $$
declare
 v_text text:=lower(btrim(coalesce(p_texto,'')));
 v_match text[]; v_mes int; v_anio int;
 v_nombres text[]:=array['enero','febrero','marzo','abril','mayo','junio',
                       'julio','agosto','septiembre','octubre','noviembre','diciembre'];
begin
 if v_text ~ '^[0-9]{4}-(0[1-9]|1[0-2])(-[0-9]{2})?$' then
   v_anio=left(v_text,4)::int;
   v_mes=substring(v_text,6,2)::int;
   if v_anio between 2020 and 2100 then
     if length(v_text)=10 and to_char(make_date(v_anio,v_mes,least(substring(v_text,9,2)::int,28)),'YYYY-MM')<>
         left(v_text,7) then return null;end if;
     return make_date(v_anio,v_mes,1);
   end if;
   return null;
 end if;
 v_match=regexp_match(v_text,
 '^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)[[:space:]]+(de[[:space:]]+)?([0-9]{4})$');
 if v_match is null then return null;end if;
 v_mes=array_position(v_nombres,case when v_match[1]='setiembre' then 'septiembre' else v_match[1] end);
 v_anio=v_match[3]::int;
 if v_mes is null or v_anio not between 2020 and 2100 then return null;end if;
 return make_date(v_anio,v_mes,1);
exception when others then
 return null;
end $$;

alter table public.goxion_imputaciones_sombra
 add column if not exists clave_idempotencia uuid;
create unique index if not exists goxion_imputaciones_sombra_idempotencia_uq
 on public.goxion_imputaciones_sombra(clave_idempotencia)
 where clave_idempotencia is not null;

create or replace function public.goxion_validar_imputacion_sombra()
returns trigger language plpgsql set search_path='' as $$
declare
 v_cliente uuid;v_total integer;v_ciclo date;v_estado text;
 v_pago_cliente uuid;v_monto bigint;v_pago_estado text;v_periodo date;
 v_otras bigint;v_usado bigint;v_fecha date;
begin
 -- Serializa intentos sobre el mismo vencimiento.
 select cliente_id,total_estimado_centavos,ciclo_inicio,estado
 into v_cliente,v_total,v_ciclo,v_estado
 from public.goxion_obligaciones_sombra
 where id=new.obligacion_id for update;
 if v_cliente is null or v_estado<>'conciliado' then
  raise exception 'Obligación sin conciliación';
 end if;
 if tg_op='UPDATE' and (
   old.obligacion_id is distinct from new.obligacion_id or
   old.pago_id is distinct from new.pago_id or
   old.pago_parcial_id is distinct from new.pago_parcial_id or
   old.monto_centavos is distinct from new.monto_centavos or
   old.clave_idempotencia is distinct from new.clave_idempotencia
 ) then
   raise exception 'No se puede alterar una imputación existente';
 end if;
 if new.pago_id is not null then
  select p.cliente_id,round(p.monto*100)::bigint,p.estado,
         public.goxion_periodo_pago_canonico(p.periodo)
   into v_pago_cliente,v_monto,v_pago_estado,v_periodo
  from public.pagos p where p.id=new.pago_id for update;
  if v_pago_estado is distinct from 'pagado' then
   raise exception 'Comprobante no aprobado';
  end if;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_id=new.pago_id and estado='propuesta'
    and (tg_op='INSERT' or id<>new.id);
 else
  select p.cliente_id,round(p.monto_pagado*100)::bigint,p.estado,p.periodo,p.fecha_pago
   into v_pago_cliente,v_monto,v_pago_estado,v_periodo,v_fecha
  from public.pagos_parciales p
  where p.id=new.pago_parcial_id and p.activo=true for update;
  if v_pago_estado is distinct from 'pendiente' then
   raise exception 'Abono incompleto no confirmado o ya liquidado';
  end if;
  -- Puede existir pago total del mismo mes: no atribuir el parcial dos veces.
  if exists(select 1 from public.pagos fullp
    where fullp.cliente_id=v_pago_cliente and fullp.estado='pagado'
     and public.goxion_periodo_pago_canonico(fullp.periodo)=v_periodo) then
    raise exception 'Existe pago completo del período; revisar abono antes de asignar';
  end if;
  select coalesce(sum(monto_centavos),0) into v_usado
  from public.goxion_imputaciones_sombra
  where pago_parcial_id=new.pago_parcial_id and estado='propuesta'
    and (tg_op='INSERT' or id<>new.id);
 end if;
 if v_pago_cliente is null or v_cliente is distinct from v_pago_cliente then
   raise exception 'El pago no pertenece a este cliente';
 end if;
 if v_periodo is null or v_periodo is distinct from date_trunc('month',v_ciclo)::date then
   raise exception 'El período del pago no corresponde al ciclo del vencimiento';
 end if;
 if new.estado='propuesta' and (v_monto is null or new.monto_centavos+v_usado>v_monto) then
   raise exception 'Imputación duplicada o superior al pago confirmado';
 end if;
 select coalesce(sum(monto_centavos),0) into v_otras
 from public.goxion_imputaciones_sombra
 where obligacion_id=new.obligacion_id and estado='propuesta'
   and (tg_op='INSERT' or id<>new.id);
 if new.estado='propuesta' and new.monto_centavos+v_otras>v_total then
   raise exception 'Imputación superior al importe de la obligación';
 end if;
 -- Una propuesta no modifica pagos, lealtad, fechas ni saldo oficial.
 return new;
end $$;

create or replace function public.goxion_preparar_imputacion_sombra(
 p_obligacion_id uuid,p_pago_id uuid,p_monto_centavos integer,
 p_clave_idempotencia uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_existente record;v_nueva record;
begin
 if p_obligacion_id is null or p_pago_id is null or
    p_monto_centavos is null or p_monto_centavos<=0 or p_clave_idempotencia is null then
   raise exception 'Parámetros de imputación incompletos';
 end if;
 -- Revisar la clave bajo lock de pago + obligación, no solo un SELECT suelto.
 perform 1 from public.goxion_obligaciones_sombra
 where id=p_obligacion_id for update;
 if not found then raise exception 'Obligación inexistente';end if;
 perform 1 from public.pagos where id=p_pago_id for update;
 if not found then raise exception 'Comprobante inexistente';end if;
 select * into v_existente from public.goxion_imputaciones_sombra
 where clave_idempotencia=p_clave_idempotencia;
 if found then
  if v_existente.obligacion_id is distinct from p_obligacion_id
    or v_existente.pago_id is distinct from p_pago_id
    or v_existente.monto_centavos is distinct from p_monto_centavos then
   raise exception 'Clave de imputación reutilizada con distintos datos';
  end if;
  return jsonb_build_object('ok',true,'imputacion_id',v_existente.id,
   'estado',v_existente.estado,'repetida',true,'acreditada',false);
 end if;
 -- El trigger valida que el pago esté aprobado, mismo cliente, mismo mes,
 -- sin asignar más de lo efectivamente recibido ni superar la obligación.
 insert into public.goxion_imputaciones_sombra
 (obligacion_id,pago_id,monto_centavos,clave_idempotencia,estado)
 values(p_obligacion_id,p_pago_id,p_monto_centavos,p_clave_idempotencia,'propuesta')
 returning * into v_nueva;
 return jsonb_build_object('ok',true,'imputacion_id',v_nueva.id,
   'estado',v_nueva.estado,'repetida',false,'acreditada',false);
end $$;

revoke all on function public.goxion_preparar_imputacion_sombra(uuid,uuid,integer,uuid)
 from public,anon,authenticated;
grant execute on function public.goxion_preparar_imputacion_sombra(uuid,uuid,integer,uuid)
 to service_role;
-- Función helper solo disponible desde el backend/DB, no desde cliente.
revoke all on function public.goxion_periodo_pago_canonico(text)
 from public,anon,authenticated;
grant execute on function public.goxion_periodo_pago_canonico(text) to service_role;
