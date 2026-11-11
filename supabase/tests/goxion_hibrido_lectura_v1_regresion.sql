-- GOXION híbrido · regresión de lectura no cobrable en entorno B2 aislado.
-- No modifica datos. Se ejecuta en el SQL editor usando una cuenta DB administrativa.
-- Verifica: contrato seguro, exclusividad de fuente, importes y modo de revisión.
do $test$
declare
  v record;
  v_result jsonb;
  v_quote jsonb;
  v_legacy jsonb;
  v_rows int := 0;
  v_checked int := 0;
begin
  for v in
    select c.id,c.periodo_pendiente,
      coalesce((select r.activo from public.goxion_b2_regimen_cliente r where r.cliente_id=c.id),false) as b2,
      exists(select 1 from public.goxion_b2_ciclos ci where ci.cliente_id=c.id and ci.periodo=c.periodo_pendiente) as has_cycle
    from public.clientes c
  loop
    v_rows := v_rows + 1;
    v_result := public.goxion_hibrido_estado_financiero_v1(v.id,'2026-11-11'::date);
    if v_result is null or coalesce((v_result->>'cobrable')::boolean,true) then
      raise exception 'Resultado cobrable o nulo para caso %',v_rows;
    end if;
    if coalesce((v_result->>'ok')::boolean,false) then
      if (v_result->>'total_pendiente_centavos')::bigint<0 then
        raise exception 'Saldo negativo para caso %',v_rows;
      end if;
      if v.b2 and v.has_cycle then
        v_quote := public.goxion_b2_cotizar_ciclo(v.id,v.periodo_pendiente,'2026-11-11'::date);
        if v_result->>'fuente_saldo'<>'obligaciones_b2'
          or (v_quote->>'total_pendiente_centavos')::bigint
            is distinct from (v_result->>'total_pendiente_centavos')::bigint then
          raise exception 'Desacuerdo B2 para caso %',v_rows;
        end if;
      elsif not v.b2 and not v.has_cycle then
        v_legacy := public.goxion_estado_financiero(v.id,'2026-11-11'::date);
        if v_result->>'fuente_saldo'<>'global_legacy'
          or round((v_legacy->>'total_actual')::numeric*100)::bigint
            is distinct from (v_result->>'total_pendiente_centavos')::bigint then
          raise exception 'Desacuerdo global para caso %',v_rows;
        end if;
      else
        raise exception 'No debe aprobar estado inconsistente B2 en caso %',v_rows;
      end if;
      v_checked := v_checked + 1;
    else
      if v_result->>'requiere_revision'<>'true'
        or v_result ? 'total_pendiente_centavos' then
        raise exception 'Fallo no seguro para caso %',v_rows;
      end if;
    end if;
  end loop;
  if v_rows=0 or v_checked=0 then
    raise exception 'Fixtures insuficientes para la prueba: casos=%, conciliados=%',v_rows,v_checked;
  end if;
  raise notice 'GOXION híbrido: % casos, % conciliados, % para revisión; solo lectura', v_rows,v_checked,v_rows-v_checked;
end $test$;

-- Resumen no sensible para comparar resultados sin exponer cuentas:
with s as (
  select public.goxion_hibrido_estado_financiero_v1(id,'2026-11-11'::date) as estado
  from public.clientes
)
select estado->>'codigo' as codigo,count(*) as casos
from s group by 1 order by 1;
