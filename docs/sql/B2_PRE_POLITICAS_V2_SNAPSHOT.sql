-- Snapshot de funciones previas a políticas v2 para reversión controlada.
-- No ejecutar automáticamente en producción. La reversión de restricciones
-- podría fallar si ya hay prórrogas de +10 días o varias por ciclo.
BEGIN;
-- goxion_b2_aprobar_abono
CREATE OR REPLACE FUNCTION public.goxion_b2_aprobar_abono(p_cliente_id uuid, p_cargo_id uuid, p_monto_centavos integer, p_saldo_esperado_centavos integer, p_operation_id uuid, p_nota text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
    declare
     v_cliente record; v_ciclo record; v_cargo record; v_op record; v_cargo_locator record;
      v_hoy date:=(now() at time zone 'America/Merida')::date;
       v_lealtad_perdida boolean; v_daydelta int; v_cobro_mora int;
        v_principal_pago int; v_mora_pago int; v_total int;
         v_estado text; v_streak int; v_label text; v_fin int; v_sum bigint;
          v_res jsonb; v_fechas int; v_siguiente jsonb:=null; v_error_siguiente text:=null;
           v_convertido jsonb:=null; v_error_conversion text:=null;
            v_atrib jsonb; v_item record;
            begin
             if p_cliente_id is null
               or p_cargo_id is null
                 or p_operation_id is null
                   or p_monto_centavos is null
                     or p_monto_centavos<=0
                       or p_saldo_esperado_centavos is null
                         or p_saldo_esperado_centavos<=0
                           or p_monto_centavos>p_saldo_esperado_centavos
                             or length(coalesce(p_nota,''))>400 then
                                raise exception 'Datos de abono multifecha incompletos';
                                 end if;
                                  -- Una sola exclusión para todos los accesos del cliente.
                                   select * into v_cliente from public.clientes where id=p_cliente_id for update;
                                    if not found or v_cliente.estado='suspendido' then raise exception 'Cliente suspendido o inexistente';end if;
                                     -- Idempotencia PERMANENTE, incluso si el ciclo avanzó después del primer intento.
                                      select * into v_op from public.goxion_b2_abonos_aprobados where operation_id=p_operation_id;
                                       if found then
                                         if v_op.cliente_id is distinct from p_cliente_id
                                            or v_op.cargo_id is distinct from p_cargo_id
                                               or v_op.monto_centavos is distinct from p_monto_centavos
                                                  or v_op.concepto is distinct from coalesce(p_nota,'') then
                                                      raise exception 'Operation ID reutilizada con distintos datos';end if;
                                                        return jsonb_build_object('ok',true,'repetida',true,'operation_id',p_operation_id,
                                                           'cargo_id',p_cargo_id,'monto_centavos',v_op.monto_centavos,
                                                              'acreditada_b2',true,'acreditada_global',false);
                                                               end if;
                                                                if not exists(select 1 from public.goxion_b2_regimen_cliente r
                                                                  where r.cliente_id=p_cliente_id and r.activo) then
                                                                     raise exception 'Régimen B2 no habilitado para esta cuenta';
                                                                      end if;
                                                                       select b.ciclo_id into v_cargo_locator
                                                                        from public.goxion_b2_cargos b
                                                                         where b.id=p_cargo_id and b.cliente_id=p_cliente_id;
                                                                          if not found then raise exception 'Cobro no pertenece a la cuenta';end if;
                                                                           select * into v_ciclo from public.goxion_b2_ciclos
                                                                            where id=v_cargo_locator.ciclo_id and cliente_id=p_cliente_id for update;
                                                                             if not found or v_ciclo.estado<>'pendiente' then
                                                                               raise exception 'Ciclo B2 liquidado o inexistente';end if;
                                                                                if v_ciclo.periodo is distinct from v_cliente.periodo_pendiente then
                                                                                   raise exception 'Estado global cambió, requiere conciliación';end if;
                                                                                   -- Una promoción/cupón que cambió desde la creación del ciclo NO
                                                                                   -- puede cobrarse sobre la asignación comercial anterior.
                                                                                    v_atrib=public.goxion_b2_validar_atribuciones(p_cliente_id,v_ciclo.periodo);
                                                                                     if v_atrib->>'ok'<>'true' or v_atrib->>'conciliado'<>'true'
                                                                                      then raise exception 'B2_BENEFICIOS_CAMBIARON_DESDE_CICLO';end if;
                                                                                      -- Bloquear todas las obligaciones, ordenadas, para evitar dobles cruces.
                                                                                       perform 1 from public.goxion_b2_cargos b
                                                                                        where b.ciclo_id=v_ciclo.id order by b.id for update;
                                                                                         -- Si algún acceso ya venció y sigue impago, se pierde la racha
                                                                                          -- global y el descuento de TODOS los accesos aún pendientes.
                                                                                           select v_ciclo.lealtad_perdida or exists(
                                                                                             select 1 from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
                                                                                                and b.fecha_vencimiento<v_hoy and not b.liquidado
                                                                                                  and not exists(select 1 from public.goxion_b2_prorrogas pr
                                                                                                     where pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento and pr.estado='aprobada'
                                                                                                          and pr.fecha_pactada>=v_hoy)) into v_lealtad_perdida;
                                                                                                           if v_lealtad_perdida and not v_ciclo.lealtad_perdida then
                                                                                                              update public.goxion_b2_ciclos set lealtad_perdida=true
                                                                                                                   where id=v_ciclo.id;
                                                                                                                      update public.goxion_b2_cargos set
                                                                                                                          principal_pendiente_centavos=principal_pendiente_centavos+descuento_vigente_centavos,
                                                                                                                              descuento_vigente_centavos=0
                                                                                                                                  where ciclo_id=v_ciclo.id and not liquidado;
                                                                                                                                   end if;
                                                                                                                                    -- Cada obligación genera mora POR SEPARADO desde el día posterior
                                                                                                                                     -- a su vencimiento; 5% al día del saldo principal, tope 50% de SU base.
                                                                                                                                      -- Un abono posterior reduce el saldo para la siguiente actualización.
                                                                                                                                       update public.goxion_b2_cargos b set
                                                                                                                                         mora_generada_centavos=b.mora_generada_centavos+
                                                                                                                                            least(greatest(0,round(b.base_centavos*.5)::int-b.mora_generada_centavos),
                                                                                                                                                greatest(0,v_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
                                                                                                                                                     round(b.principal_pendiente_centavos*.05)::int),
                                                                                                                                                       mora_pendiente_centavos=b.mora_pendiente_centavos+
                                                                                                                                                          least(greatest(0,round(b.base_centavos*.5)::int-b.mora_generada_centavos),
                                                                                                                                                              greatest(0,v_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
                                                                                                                                                                   round(b.principal_pendiente_centavos*.05)::int),
                                                                                                                                                                     mora_calculada_hasta=greatest(b.mora_calculada_hasta,v_hoy)
                                                                                                                                                                      where b.ciclo_id=v_ciclo.id and not b.liquidado
                                                                                                                                                                        and not exists(select 1 from public.goxion_b2_prorrogas pr
                                                                                                                                                                            where pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento and pr.estado='aprobada'
                                                                                                                                                                                  and pr.fecha_pactada>=v_hoy);
                                                                                                                                                                                   select * into v_cargo from public.goxion_b2_cargos
                                                                                                                                                                                    where id=p_cargo_id for update;
                                                                                                                                                                                     if v_cargo.liquidado then raise exception 'Cargo B2 ya liquidado';end if;
                                                                                                                                                                                      v_total=v_cargo.principal_pendiente_centavos+v_cargo.mora_pendiente_centavos;
                                                                                                                                                                                       if v_total is distinct from p_saldo_esperado_centavos then
                                                                                                                                                                                         raise exception 'SALDO_B2_DESACTUALIZADO: %', v_total;end if;
                                                                                                                                                                                          if p_monto_centavos>v_total then raise exception 'Abono superior al saldo';end if;
                                                                                                                                                                                           v_principal_pago=least(v_cargo.principal_pendiente_centavos,p_monto_centavos);
                                                                                                                                                                                            v_mora_pago=p_monto_centavos-v_principal_pago;
                                                                                                                                                                                             update public.goxion_b2_cargos b set
                                                                                                                                                                                               principal_pendiente_centavos=principal_pendiente_centavos-v_principal_pago,
                                                                                                                                                                                                 mora_pendiente_centavos=mora_pendiente_centavos-v_mora_pago,
                                                                                                                                                                                                   liquidado=(v_total=p_monto_centavos)
                                                                                                                                                                                                    where id=p_cargo_id;
                                                                                                                                                                                                     insert into public.goxion_b2_abonos_aprobados(operation_id,cargo_id,cliente_id,
                                                                                                                                                                                                       monto_centavos,aplicado_principal_centavos,aplicado_mora_centavos,
                                                                                                                                                                                                         fecha_aprobacion,concepto)
                                                                                                                                                                                                          values(p_operation_id,p_cargo_id,p_cliente_id,p_monto_centavos,
                                                                                                                                                                                                            v_principal_pago,v_mora_pago,v_hoy,coalesce(p_nota,''));
                                                                                                                                                                                                             -- El estado de la CUENTA sólo cambia una vez, cuando están liquidadas
                                                                                                                                                                                                              -- TODAS las unidades: pagos ya aprobados no pierden su importe.
                                                                                                                                                                                                               select count(*) into v_fin from public.goxion_b2_cargos
                                                                                                                                                                                                                where ciclo_id=v_ciclo.id and not liquidado;
                                                                                                                                                                                                                 if v_fin=0 then
                                                                                                                                                                                                                   v_streak=case when v_lealtad_perdida then 0 else v_ciclo.racha_inicio+1 end;
                                                                                                                                                                                                                     update public.goxion_b2_ciclos set
                                                                                                                                                                                                                        estado='liquidado',liquidado_en=now(),racha_aplicada=true
                                                                                                                                                                                                                           where id=v_ciclo.id and estado='pendiente';
                                                                                                                                                                                                                             if not found then raise exception 'Ciclo ya cerrado';end if;
                                                                                                                                                                                                                               select coalesce(sum(monto_centavos),0) into v_sum
                                                                                                                                                                                                                                  from public.goxion_b2_abonos_aprobados a
                                                                                                                                                                                                                                     join public.goxion_b2_cargos b on b.id=a.cargo_id
                                                                                                                                                                                                                                        where b.ciclo_id=v_ciclo.id;
                                                                                                                                                                                                                                          v_label=(array['enero', 'febrero','marzo','abril','mayo','junio',
                                                                                                                                                                                                                                             'julio','agosto','septiembre','octubre','noviembre','diciembre'])
                                                                                                                                                                                                                                                 [extract(month from v_ciclo.periodo)::integer]
                                                                                                                                                                                                                                                     || ' de ' ||
                                                                                                                                                                                                                                                          extract(year from v_ciclo.periodo)::integer;
                                                                                                                                                                                                                                                            if exists(select 1 from public.pagos where cliente_id=p_cliente_id
                                                                                                                                                                                                                                                                and public.goxion_periodo_pago_canonico(periodo)=v_ciclo.periodo) then
                                                                                                                                                                                                                                                                   raise exception 'Pago global ya existe: impedir doble acreditación';
                                                                                                                                                                                                                                                                     end if;
                                                                                                                                                                                                                                                                       -- Sólo ESTA transacción puede insertar el recibo global B2.
                                                                                                                                                                                                                                                                         -- El trigger de guardia bloqueará cualquier aprobación mensual paralela.
                                                                                                                                                                                                                                                                           perform pg_catalog.set_config('goxion.b2_recibo_autorizado',v_ciclo.id::text,true);
                                                                                                                                                                                                                                                                             -- ÚNICO comprobante consolidado para historial y triggers existentes.
                                                                                                                                                                                                                                                                               insert into public.pagos(cliente_id,fecha,periodo,monto,estado,notas,
                                                                                                                                                                                                                                                                                  puntual,lealtad_efecto,racha_resultado)
                                                                                                                                                                                                                                                                                    values(p_cliente_id,v_hoy,v_label, v_sum::numeric/100,'pagado',
                                                                                                                                                                                                                                                                                       'B2: liquidación de vencimientos por acceso',
                                                                                                                                                                                                                                                                                          not v_lealtad_perdida,
                                                                                                                                                                                                                                                                                             case when v_lealtad_perdida then 'reinicio' else 'sumo' end,v_streak);
                                                                                                                                                                                                                                                                                               perform pg_catalog.set_config('goxion.b2_recibo_autorizado','',true);
                                                                                                                                                                                                                                                                                                 -- Sólo el recibo consolidado dispara el consumo existente de beneficios.
                                                                                                                                                                                                                                                                                                   -- Comprobar el mismo monto/origen; cualquier diferencia revierte el recibo
                                                                                                                                                                                                                                                                                                     -- y todas las aplicaciones de este comprobante.
                                                                                                                                                                                                                                                                                                       for v_item in
                                                                                                                                                                                                                                                                                                          select fuente,referencia_id,sum(monto_centavos) cents
                                                                                                                                                                                                                                                                                                             from public.goxion_b2_atribuciones_comerciales
                                                                                                                                                                                                                                                                                                                where cliente_id=p_cliente_id and periodo=v_ciclo.periodo
                                                                                                                                                                                                                                                                                                                   group by fuente,referencia_id
                                                                                                                                                                                                                                                                                                                     loop
                                                                                                                                                                                                                                                                                                                        if v_item.fuente='programado' and not exists(
                                                                                                                                                                                                                                                                                                                            select 1 from public.beneficio_aplicaciones a
                                                                                                                                                                                                                                                                                                                                where a.beneficio_id=v_item.referencia_id
                                                                                                                                                                                                                                                                                                                                     and a.cliente_id=p_cliente_id and a.periodo=v_ciclo.periodo
                                                                                                                                                                                                                                                                                                                                          and a.estado='consumido'
                                                                                                                                                                                                                                                                                                                                               and round(a.monto_aplicado*100)::bigint=v_item.cents) then
                                                                                                                                                                                                                                                                                                                                                   raise exception 'B2_CONSUMO_BENEFICIO_NO_COINCIDE';end if;
                                                                                                                                                                                                                                                                                                                                                      if v_item.fuente='promocion' and not (
                                                                                                                                                                                                                                                                                                                                                          exists(select 1 from public.promocion_adquisiciones a
                                                                                                                                                                                                                                                                                                                                                               where a.adquisicion_id=v_item.referencia_id
                                                                                                                                                                                                                                                                                                                                                                     and a.cliente_id=p_cliente_id and a.periodo=v_ciclo.periodo
                                                                                                                                                                                                                                                                                                                                                                           and a.estado='consumido'
                                                                                                                                                                                                                                                                                                                                                                                 and round(a.ahorro_aplicado*100)::bigint=v_item.cents)
                                                                                                                                                                                                                                                                                                                                                                                     or exists(select 1 from public.promocion_aplicaciones a
                                                                                                                                                                                                                                                                                                                                                                                          where a.asignacion_id=v_item.referencia_id
                                                                                                                                                                                                                                                                                                                                                                                                and a.cliente_id=p_cliente_id and a.periodo=v_ciclo.periodo
                                                                                                                                                                                                                                                                                                                                                                                                      and a.estado='consumido'
                                                                                                                                                                                                                                                                                                                                                                                                            and round(a.ahorro_aplicado*100)::bigint=v_item.cents)) then
                                                                                                                                                                                                                                                                                                                                                                                                                raise exception 'B2_CONSUMO_PROMOCION_NO_COINCIDE';end if;
                                                                                                                                                                                                                                                                                                                                                                                                                   if v_item.fuente='trato_justo' and exists(
                                                                                                                                                                                                                                                                                                                                                                                                                       select 1 from public.trato_justo_compensaciones a
                                                                                                                                                                                                                                                                                                                                                                                                                           where a.id=v_item.referencia_id and a.cliente_id=p_cliente_id and a.activo)
                                                                                                                                                                                                                                                                                                                                                                                                                               then raise exception 'B2_CONSUMO_TRATO_JUSTO_NO_COINCIDE';end if;
                                                                                                                                                                                                                                                                                                                                                                                                                                 end loop;
                                                                                                                                                                                                                                                                                                                                                                                                                                   update public.clientes set
                                                                                                                                                                                                                                                                                                                                                                                                                                      pagos_puntuales=v_streak,estado='pagado',pago_en_revision=false,
                                                                                                                                                                                                                                                                                                                                                                                                                                         periodo_pendiente=(v_ciclo.periodo+interval '1 month')::date,
                                                                                                                                                                                                                                                                                                                                                                                                                                            pago_revision_estado='aprobado',pago_revision_mensaje=null,
                                                                                                                                                                                                                                                                                                                                                                                                                                               pago_revision_monto_faltante=0,pago_revision_updated_at=now()
                                                                                                                                                                                                                                                                                                                                                                                                                                                 where id=p_cliente_id;
                                                                                                                                                                                                                                                                                                                                                                                                                                                   -- Siguiente vencimiento de cada acceso (29/30/31 sujeto a mes).
                                                                                                                                                                                                                                                                                                                                                                                                                                                     -- Sólo se renuevan los calendarios de accesos y servicios ACTIVOS:
                                                                                                                                                                                                                                                                                                                                                                                                                                                       -- un calendario de un servicio ya cancelado no se toca (el trigger
                                                                                                                                                                                                                                                                                                                                                                                                                                                         -- goxion_validar_calendario_acceso rechaza cualquier update de un
                                                                                                                                                                                                                                                                                                                                                                                                                                                           -- calendario inactivo y revertiría el cierre entero). Mismo patrón
                                                                                                                                                                                                                                                                                                                                                                                                                                                             -- que la regla por-cargo (Fase 2) y la conversión: de cuenta a activo.
                                                                                                                                                                                                                                                                                                                                                                                                                                                               update public.goxion_calendario_accesos cal set
                                                                                                                                                                                                                                                                                                                                                                                                                                                                   cobertura_hasta=make_date(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                        extract(year from v_ciclo.periodo+interval '1 month')::integer,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                             extract(month from v_ciclo.periodo+interval '1 month')::integer,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  least(cal.dia_corte,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        extract(day from
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                date_trunc('month', v_ciclo.periodo+interval '2 months')-interval '1 day')::integer)),
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    verificado_en=now(),actualizado_por='b2:renovacion_acreditada'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      where cal.cliente_id=p_cliente_id and cal.estado='verificado'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and exists(select 1 from public.goxion_b2_cargos b
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               where b.ciclo_id=v_ciclo.id and b.cliente_acceso_id=cal.cliente_acceso_id)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   and exists(select 1 from public.cliente_accesos a
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        join public.cliente_servicios s on s.id=a.cliente_servicio_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             where a.id=cal.cliente_acceso_id and a.activo and s.activo
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    and s.cliente_id=p_cliente_id);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      -- Conversión automática a fecha única (Fase 7, principio 9): si al
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        -- cerrar el ciclo queda UNA sola fecha de cobro entre los calendarios
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          -- verificados de los accesos activos, el régimen B2 se desactiva en
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            -- esta misma operación y el cliente pasa a fecha única desde el
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              -- siguiente periodo. La conversión vive dentro del propio motor
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                -- (en el cierre de ciclo), no en otro proceso.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  -- Se mide en FECHAS, no en servicios: un cliente con un solo
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    -- servicio pero dos fechas (Nayeli: Vix días 6 y 30) no se convierte.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      select count(distinct cal.dia_corte) into v_fechas
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         from public.goxion_calendario_accesos cal
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            join public.cliente_accesos a on a.id=cal.cliente_acceso_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               join public.cliente_servicios s on s.id=a.cliente_servicio_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   and s.activo and s.cliente_id=p_cliente_id
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      where cal.cliente_id=p_cliente_id and cal.estado='verificado'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          and a.activo;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            if v_fechas=1 then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               begin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   v_convertido=public.goxion_b2_desactivar_cliente(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         p_cliente_id,true,'sistema:cierre-ciclo',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               'una sola fecha al cerrar el ciclo');
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  exception when others then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      get stacked diagnostics v_error_conversion=MESSAGE_TEXT;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           end if;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             -- Si no se convirtió (más de una fecha, o la conversión falló), se
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               -- prepara el siguiente ciclo B2 como hoy. Si la conversión falló,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 -- iniciar_ciclo fallará igual y quedará en revisión por Admin: el
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   -- cierre NO se revierte por eso.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     if coalesce(v_convertido->>'regimen_activo','true')<>'false' then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        begin
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            v_siguiente=public.goxion_b2_iniciar_ciclo(
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  p_cliente_id,(v_ciclo.periodo+interval '1 month')::date);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     exception when others then
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         get stacked diagnostics v_error_siguiente=MESSAGE_TEXT;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              end if;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               end if;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                return jsonb_build_object('ok',true,'repetida',false,'operation_id',p_operation_id,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  'cargo_id',p_cargo_id,'monto_centavos',p_monto_centavos,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'saldo_restante_centavos',v_total-p_monto_centavos,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      'mora_aplicada_centavos',v_mora_pago,'principal_aplicado_centavos',v_principal_pago,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        'ciclo_liquidado',v_fin=0,'lealtad_perdida',v_lealtad_perdida,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          'proximo_ciclo_preparado',coalesce(v_siguiente->>'ok','false')='true',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            'proximo_ciclo_requiere_revision',v_error_siguiente is not null,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              'convertido_fecha_unica',coalesce(v_convertido->>'regimen_activo','true')='false',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                'conversion_requiere_revision',coalesce(v_fechas,0)=1 and coalesce(v_convertido->>'regimen_activo','true')<>'false',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  'error_conversion',v_error_conversion,
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    'acreditada_b2',true,'acreditada_global',v_fin=0);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    end;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    $function$
;

-- goxion_b2_cotizar_ciclo
CREATE OR REPLACE FUNCTION public.goxion_b2_cotizar_ciclo(p_cliente_id uuid, p_periodo date, p_hoy date DEFAULT ((now() AT TIME ZONE 'America/Merida'::text))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_ciclo record;v_descartado boolean;v_res jsonb;v_base int;v_n int;
begin
 if p_cliente_id is null or p_periodo is null or p_hoy is null or
  p_periodo<>date_trunc('month',p_periodo)::date then
  raise exception 'Cotización multifecha requiere cliente/periodo/día';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where cliente_id=p_cliente_id and periodo=p_periodo;
 if not found then return jsonb_build_object('ok',false,
   'codigo','CICLO_NO_PREPARADO','cobrable',false);end if;
 if not exists(select 1 from public.goxion_b2_regimen_cliente
  where cliente_id=p_cliente_id and activo) then
  return jsonb_build_object('ok',false,'codigo','REGIMEN_INACTIVO','cobrable',false);
 end if;
 select v_ciclo.lealtad_perdida or exists(select 1
  from public.goxion_b2_cargos b where b.ciclo_id=v_ciclo.id
  and b.fecha_vencimiento<p_hoy and not b.liquidado
  and not exists(select 1 from public.goxion_b2_prorrogas pr
    where pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento and pr.estado='aprobada' and pr.fecha_pactada>=p_hoy))
 into v_descartado;
 select coalesce(jsonb_agg(jsonb_build_object(
 'cargo_id',q.id,'acceso_id',q.cliente_acceso_id,'vence',q.fecha_vencimiento,
 'base_centavos',q.base_centavos,
 'descuento_centavos',q.descuento_efectivo,
 'descuento_comercial_centavos',q.descuento_comercial_centavos,
 'descuento_total_centavos',q.descuento_efectivo+q.descuento_comercial_centavos,
 'principal_centavos',q.principal_efectivo,
 'mora_centavos',q.mora_efectiva,
 'total_centavos',q.principal_efectivo+q.mora_efectiva,
 'pagado',q.liquidado,
 'fecha_pactada',q.fecha_pactada,'prorroga_estado',q.prorroga_estado) order by q.fecha_vencimiento,q.id),'[]'::jsonb)
 into v_res
 from (
 select b.*,case when v_descartado and not b.liquidado then 0
    else b.descuento_vigente_centavos end descuento_efectivo,
   (b.principal_pendiente_centavos +
    case when v_descartado and not b.liquidado
      then b.descuento_vigente_centavos else 0 end) principal_efectivo,
   b.mora_pendiente_centavos +
     case when pr.estado='aprobada' and p_hoy<=pr.fecha_pactada
       then 0 else
     least(greatest(0,round(b.base_centavos*.50)::int-b.mora_generada_centavos),
      greatest(0,p_hoy-greatest(b.mora_calculada_hasta,b.fecha_vencimiento))*
       round((b.principal_pendiente_centavos+
        case when v_descartado and not b.liquidado
          then b.descuento_vigente_centavos else 0 end)*.05)::int)
     end as mora_efectiva,pr.fecha_pactada,pr.estado as prorroga_estado
 from public.goxion_b2_cargos b
 left join public.goxion_b2_prorrogas pr on pr.ciclo_id=b.ciclo_id and pr.fecha_original=b.fecha_vencimiento
 where b.ciclo_id=v_ciclo.id
 ) q;
 return jsonb_build_object('ok',true,'modo','b2_multifecha',
  'cobrable',true,'solo_cotizacion',true,'requiere_aprobacion_admin',true,
  'cliente_id',p_cliente_id,
  'periodo',p_periodo,'lealtad_global_perdida',v_descartado,
  'cargos',v_res,
  'total_pendiente_centavos',(
   select coalesce(sum((i->>'total_centavos')::bigint),0)
   from jsonb_array_elements(v_res) i));
end $function$
;

-- goxion_b2_resolver_prorroga
CREATE OR REPLACE FUNCTION public.goxion_b2_resolver_prorroga(p_cliente_id uuid, p_solicitud_id uuid, p_aprobar boolean, p_actor text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_pr record;v_cliente record;v_cargo record;v_ciclo record;
 v_hoy date:=(now() at time zone 'America/Merida')::date;
begin
 if p_cliente_id is null or p_solicitud_id is null or p_aprobar is null
  or length(btrim(coalesce(p_actor,'')))<3 or length(p_actor)>120 then
   raise exception 'Resolución administrativa inválida';end if;
 select * into v_cliente from public.clientes where id=p_cliente_id for update;
 if not found or v_cliente.estado='suspendido' then raise exception 'Cuenta no válida';end if;
 select * into v_pr from public.goxion_b2_prorrogas
 where id=p_solicitud_id and cliente_id=p_cliente_id for update;
 if not found then raise exception 'Solicitud inexistente';end if;
 if v_pr.estado<>'solicitada' then
  if (v_pr.estado='aprobada')=p_aprobar then
   return jsonb_build_object('ok',true,'repetida',true,'estado',v_pr.estado,
    'solicitud_id',v_pr.id);
  end if;
  raise exception 'Solicitud previamente resuelta';
 end if;
 select * into v_ciclo from public.goxion_b2_ciclos
 where id=v_pr.ciclo_id for update;
 select * into v_cargo from public.goxion_b2_cargos
 where id=v_pr.cargo_id for update;
 if v_ciclo.estado<>'pendiente' or v_cargo.liquidado then
   raise exception 'Solicitud sobre cargo liquidado';end if;
 if p_aprobar and (v_hoy>v_pr.fecha_original or v_ciclo.lealtad_perdida)
 then raise exception 'Prórroga vencida; ya no conserva lealtad';end if;
 update public.goxion_b2_prorrogas set
  estado=case when p_aprobar then 'aprobada' else 'rechazada' end,
  revisado_en=now(),revisado_por=p_actor where id=p_solicitud_id;
 return jsonb_build_object('ok',true,'solicitud_id',p_solicitud_id,
  'estado',case when p_aprobar then 'aprobada' else 'rechazada' end,
  'fecha_pactada',v_pr.fecha_pactada,'fecha_original',v_pr.fecha_original,
  'lealtad_se_conserva_hasta',case when p_aprobar then v_pr.fecha_pactada else null end);
end $function$
;

-- goxion_b2_solicitar_prorroga
CREATE OR REPLACE FUNCTION public.goxion_b2_solicitar_prorroga(p_cliente_id uuid, p_cargo_id uuid, p_fecha_pactada date, p_operation_id uuid, p_motivo text DEFAULT 'Solicito prórroga'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- goxion_estado_cuenta_core_v1
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
;

-- goxion_estado_financiero
CREATE OR REPLACE FUNCTION public.goxion_estado_financiero(p_cliente_id uuid, p_hoy date DEFAULT (timezone('America/Mexico_City'::text, now()))::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_base jsonb;
  v_promos jsonb;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_subtotal_efectivo numeric := 0;
begin
  v_base := public.goxion_estado_cuenta_beneficios(p_cliente_id,p_hoy);
  if v_base is null then return null; end if;

  v_promos := coalesce(v_base->'promociones',public.goxion_promociones_periodo(p_cliente_id,(v_base->>'periodo')::date),'{}'::jsonb);
  v_total := greatest(0,coalesce((v_base->>'total_actual')::numeric,0));
  v_subtotal := greatest(0,coalesce((v_base->>'subtotal')::numeric,0));
  v_subtotal_efectivo := greatest(0,coalesce((v_base->>'subtotal_efectivo')::numeric,v_subtotal));

  return v_base||jsonb_build_object(
    'fuente_financiera','supabase:goxion_estado_financiero',
    'contrato_financiero',jsonb_build_object(
      'version','1.1','motor','goxion-financial-v1','modo','oficial','total_oficial_preservado',false,
      'promociones_p3',true
    ),
    'promociones',v_promos,
    'shadow',jsonb_build_object(
      'subtotal_oficial',round(v_subtotal,2),
      'subtotal_con_promociones',round(v_subtotal_efectivo,2),
      'total_oficial',round(v_total,2),
      'total_con_promociones',round(v_total,2),
      'delta_total',0,
      'coincide_con_oficial',true
    ),
    'reglas',jsonb_build_object(
      'lealtad',jsonb_build_array(
        jsonb_build_object('nivel',1,'pagos',4,'porcentaje',3),
        jsonb_build_object('nivel',2,'pagos',9,'porcentaje',6)
      ),
      'mora',jsonb_build_object('porcentaje_diario',5,'tope_porcentaje',50),
      'reactivacion',jsonb_build_object('despues_de_dias',15,'porcentaje',20),
      'trato_justo',jsonb_build_object('porcentaje_diario',5,'tope_dias',10),
      'promociones',jsonb_build_object(
        'aplicacion','adquisicion_inmutable',
        'consumo','por_periodo_pagado',
        'componentes','multi_plataforma',
        'stacking','snapshot_por_adquisicion'
      ),
      'pagos_parciales',jsonb_build_object('mora_sobre_saldo',true,'reinicia_base_mora_en_parcial',true),
      'acuerdos_cobro',jsonb_build_object('solo_periodo_actual',true,'preserva_dia_original',true)
    )
  );
end;
$function$
;

-- goxion_prorroga_auto_cotizar
CREATE OR REPLACE FUNCTION public.goxion_prorroga_auto_cotizar(p_cliente_id uuid, p_fecha_pactada date, p_cargo_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_cliente record;v_hoy date:=(now() at time zone 'America/Merida')::date;
 v_original date;v_actual jsonb;v_futuro jsonb;
 v_periodo date;v_cargo record;v_base integer;v_fut_base integer;
 v_hoy_base jsonb;v_next_base jsonb;
 v_al_dia integer;v_incumplimiento integer;v_mora integer;v_desc integer;
 v_corte date;v_next date;
begin
 if p_cliente_id is null or p_fecha_pactada is null then
  raise exception 'PRORROGA_FECHA_INVALIDA';end if;
 select id,periodo_pendiente,dia_pago,estado,pago_en_revision
 into v_cliente from public.clientes where id=p_cliente_id;
 if not found or v_cliente.estado='suspendido' or v_cliente.pago_en_revision then
  raise exception 'PRORROGA_CUENTA_NO_DISPONIBLE';end if;
 if p_cargo_id is not null then
  select b.* into v_cargo from public.goxion_b2_cargos b
  join public.goxion_b2_ciclos c on c.id=b.ciclo_id and c.estado='pendiente'
  join public.goxion_b2_regimen_cliente reg on reg.cliente_id=b.cliente_id and reg.activo
  where b.id=p_cargo_id and b.cliente_id=p_cliente_id and not b.liquidado;
  if not found then raise exception 'PRORROGA_CARGO_NO_DISPONIBLE';end if;
  v_original=v_cargo.fecha_vencimiento;v_periodo=v_cargo.periodo;
  if exists(select 1 from public.goxion_b2_comprobantes r
   where r.cliente_id=p_cliente_id and r.ciclo_id=v_cargo.ciclo_id
   and r.estado='reportado')
  then raise exception 'PRORROGA_PAGO_EN_REVISION_B2';end if;
  if exists(select 1 from public.goxion_b2_prorrogas where cliente_id=p_cliente_id and ciclo_id=v_cargo.ciclo_id)
   then raise exception 'PRORROGA_YA_UTILIZADA_EN_PERIODO';end if;
  if exists(select 1 from public.goxion_b2_cargos b
    where b.ciclo_id=v_cargo.ciclo_id and b.id<>v_cargo.id and not b.liquidado
    and b.fecha_vencimiento>v_original and b.fecha_vencimiento<=p_fecha_pactada)
   then raise exception 'PRORROGA_CRUZA_OTRO_VENCIMIENTO';end if;
  v_actual=public.goxion_b2_cotizar_ciclo(p_cliente_id,v_periodo,v_hoy);
  v_futuro=public.goxion_b2_cotizar_ciclo(p_cliente_id,v_periodo,p_fecha_pactada+1);
  if coalesce((v_actual->>'lealtad_global_perdida')::boolean,false) then
   raise exception 'PRORROGA_LEALTAD_YA_PERDIDA';end if;
  -- Si varios accesos vencen el mismo día, el acuerdo se aplica al
  -- conjunto. Mostrar su IMPORTE SUMADO (nunca sólo un perfil).
  select coalesce(sum((j.item->>'total_centavos')::int),0)
    into v_al_dia from jsonb_array_elements(v_actual->'cargos') as j(item)
    join public.goxion_b2_cargos b on b.id=(j.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
  select coalesce(sum((j.item->>'total_centavos')::int),0),
    coalesce(sum((j.item->>'mora_centavos')::int),0)
    into v_incumplimiento,v_mora
    from jsonb_array_elements(v_futuro->'cargos') as j(item)
    join public.goxion_b2_cargos b on b.id=(j.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
  select coalesce(sum(greatest(0,
    (a.item->>'descuento_centavos')::int-
    (f.item->>'descuento_centavos')::int)),0)
    into v_desc
    from jsonb_array_elements(v_actual->'cargos') as a(item)
    join jsonb_array_elements(v_futuro->'cargos') as f(item)
      on a.item->>'cargo_id'=f.item->>'cargo_id'
    join public.goxion_b2_cargos b on b.id=(a.item->>'cargo_id')::uuid
    where b.ciclo_id=v_cargo.ciclo_id and b.fecha_vencimiento=v_original
      and not b.liquidado;
 else
  if exists(select 1 from public.goxion_b2_regimen_cliente
   where cliente_id=p_cliente_id and activo) then
   raise exception 'PRORROGA_REQUIERE_ACCESO';end if;
  v_periodo=v_cliente.periodo_pendiente;
  v_original=make_date(extract(year from v_periodo)::int,
   extract(month from v_periodo)::int,
   least(v_cliente.dia_pago,extract(day from date_trunc('month',v_periodo)+
     interval '1 month - 1 day')::int));
  if exists(select 1 from public.acuerdos_cobro
   where cliente_id=p_cliente_id and periodo=v_periodo) then
   raise exception 'PRORROGA_YA_UTILIZADA_EN_PERIODO';end if;
  v_actual=public.goxion_estado_financiero(p_cliente_id,v_hoy);
  v_futuro=public.goxion_estado_financiero(p_cliente_id,p_fecha_pactada+1);
  v_al_dia=round(coalesce((v_actual->>'total_actual')::numeric,0)*100)::int;
  v_incumplimiento=round(coalesce((v_futuro->>'total_actual')::numeric,0)*100)::int;
  v_mora=round(coalesce((v_futuro->'cargos'->>'mora')::numeric,0)*100)::int;
  v_desc=greatest(0,round((
   coalesce((v_actual->'descuentos'->>'lealtad')::numeric,0)-
   coalesce((v_futuro->'descuentos'->>'lealtad')::numeric,0))*100)::int);
 end if;
 if v_original is distinct from v_hoy then raise exception 'PRORROGA_SOLO_DIA_DE_PAGO';end if;
 if p_fecha_pactada<=v_original or p_fecha_pactada>v_original+5 then
  raise exception 'PRORROGA_MAX_5_DIAS';end if;
 return jsonb_build_object('ok',true,'fecha_original',v_original,
  'fecha_pactada',p_fecha_pactada,'periodo',v_periodo,
  'cargo_id',p_cargo_id,'importe_pactado_centavos',v_al_dia,
  'importe_si_incumple_centavos',v_incumplimiento,
  'mora_si_incumple_centavos',v_mora,'lealtad_en_riesgo_centavos',v_desc,
  'requiere_admin',false,'confirmacion_necesaria',true);
end $function$
;

-- goxion_prorroga_auto_global
CREATE OR REPLACE FUNCTION public.goxion_prorroga_auto_global(p_cliente_id uuid, p_fecha_pactada date, p_operation_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;

-- goxion_proteger_prorroga_global
CREATE OR REPLACE FUNCTION public.goxion_proteger_prorroga_global()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
COMMIT;
