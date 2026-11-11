-- GOXION · Prueba de contrato operativo híbrido.
-- SOLO LECTURA: valida saldos, contrataciones, historial B2 y permisos.
do $test$
declare
  v_cliente record;
  v_res jsonb;
  v_fin jsonb;
  v_item jsonb;
  v_casos int:=0;
  v_validos int:=0;
  v_hist int:=0;
  v_no_conciliados int:=0;
  v_cargos_preservados int:=0;
begin
  for v_cliente in select id from public.clientes loop
    v_casos:=v_casos+1;
    v_res:=public.goxion_hibrido_resumen_operativo_v1(
      v_cliente.id,date '2026-11-11');
    v_fin:=public.goxion_hibrido_estado_financiero_v1(
      v_cliente.id,date '2026-11-11');

    if v_res->>'cobrable'<>'false'
      or v_res->>'publicable'<>'false'
      or v_res->>'cliente_id' is distinct from v_cliente.id::text then
      raise exception 'Resumen inseguro o mezclado entre clientes';
    end if;
    if jsonb_typeof(v_res->'contrataciones')<>'array' then
      raise exception 'Contrato de servicios no es arreglo';
    end if;
    if (v_res->>'servicios_vigentes')::int
       +(v_res->>'servicios_historicos')::int
       is distinct from jsonb_array_length(v_res->'contrataciones') then
      raise exception 'Servicios históricos o vigentes faltantes';
    end if;

    if jsonb_array_length(v_res->'contrataciones_vigentes')
        is distinct from (v_res->>'servicios_vigentes')::int
      or jsonb_array_length(v_res->'contrataciones_historicas')
        is distinct from (v_res->>'servicios_historicos')::int then
      raise exception 'Las listas operativas no coinciden con los estados de servicio';
    end if;
    if exists (
      select 1 from jsonb_array_elements(v_res->'contrataciones_vigentes') x
      where x.value->>'activo'<>'true'
    ) or exists (
      select 1 from jsonb_array_elements(v_res->'contrataciones_historicas') x
      where x.value->>'activo'<>'false'
    ) then
      raise exception 'Contrato cancelado mezclado entre servicios vigentes';
    end if;
    if v_fin->>'ok'='true' then
      if (v_res->>'total_pendiente_centavos')::bigint
        is distinct from (v_fin->>'total_pendiente_centavos')::bigint then
        raise exception 'Desacuerdo de saldo del motor híbrido';
      end if;
      if v_res->>'fuente_saldo' is distinct from v_fin->>'fuente_saldo' then
        raise exception 'La fuente contable cambió en la capa administrativa';
      end if;
      v_validos:=v_validos+1;
    else
      if v_res->>'total_pendiente_centavos' is not null then
        raise exception 'Se creó deuda ficticia en un estado sin conciliar';
      end if;
      v_no_conciliados:=v_no_conciliados+1;
    end if;

    for v_item in select value from jsonb_array_elements(v_res->'contrataciones') loop
      if (v_item->>'activo')::boolean is distinct from
        (v_item->>'estado'='vigente') then
        raise exception 'Servicio cancelado aparece vigente';
      end if;
      if v_item ? 'correo_login' or v_item ? 'perfil_pin'
        or v_item ? 'perfil_nombre' or v_item ? 'correo_override' then
        raise exception 'Información privada expuesta en el resumen';
      end if;
      if v_item->>'estado'='historico' then
        v_hist:=v_hist+1;
        v_cargos_preservados:=v_cargos_preservados+
          coalesce((v_item->>'cargos_b2_totales')::int,0);
      end if;
      if v_item->>'cancelacion_efectiva'='true' and
        v_item->>'activo'='true' and
        v_res->>'codigo'<>'CONTRATOS_REQUIEREN_CONCILIACION' then
        raise exception 'Cancelación efectiva vigente sin advertencia';
      end if;
    end loop;
  end loop;
  if v_casos<1 or v_validos<1 or v_hist<1 then
    raise exception 'Cobertura insuficiente: % casos, % saldos, % históricos',
      v_casos,v_validos,v_hist;
  end if;

  if not exists(
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.proname='goxion_hibrido_resumen_operativo_v1'
      and not p.prosecdef
      and not has_function_privilege('anon',p.oid,'EXECUTE')
      and not has_function_privilege('authenticated',p.oid,'EXECUTE')
      and has_function_privilege('service_role',p.oid,'EXECUTE')
  ) then
    raise exception 'Función expuesta a navegadores';
  end if;
  raise notice 'PASS: % cuentas, % saldos conciliados, % a revisión, % servicios históricos, % cargos históricos preservados',
    v_casos,v_validos,v_no_conciliados,v_hist,v_cargos_preservados;
end $test$;

-- Informe sin identificadores personales
with s as (
  select public.goxion_hibrido_resumen_operativo_v1(
    id,date '2026-11-11') x from public.clientes
)
select x->>'codigo' as estado,
       sum((x->>'servicios_vigentes')::int) as contratos_vigentes,
       sum((x->>'servicios_historicos')::int) as contratos_historicos,
       count(*) as cuentas
from s group by 1 order by 1;
