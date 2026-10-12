import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const migration=readFileSync("supabase/migrations/202610120005_pago_parcial_atomico_legacy.sql","utf8");
const admin=readFileSync("assets/js/core/financial-actions.js","utf8");
const start=edge.indexOf('if (action === "registrar_pago_parcial")');
const end=edge.indexOf('if (action === "pactar_fecha_pago")',start);
assert(start>0&&end>start,"La acción de abonos debe permanecer en el gateway central");
const scope=edge.slice(start,end);
let count=0;
function test(desc,condition){assert(condition,desc);count++}
test("El cliente no puede escribir sin validación Admin",
 edge.indexOf("const auth = await validAdmin(")<start);
test("Operación usa RPC atómica existente",
 scope.includes('sb.rpc("goxion_registrar_pago_parcial_atomico"'));
test("Se mandan cliente, período, monto en centavos y clave",
 ["p_cliente_id:clienteId","p_periodo_esperado:periodoEsperado",
  "p_saldo_restante_centavos:saldoCentavos","p_operation_id:effectiveId"]
 .every(s=>scope.includes(s)));
test("No más tres escrituras secuenciales en Edge",
 !/\.from\("pagos_parciales"\)|\.from\("clientes"\)/.test(scope));
test("Error de período sigue reconocido",
 scope.includes('"PERIODO_DESACTUALIZADO"'));
test("Estructura de respuesta para Admin sigue presente",
 ["estado_anterior:before.data","estado_financiero:after.error",
  "resultado:{pago_parcial:applied.data?.pago_parcial",
  "monto_pagado:applied.data?.monto_pagado",
  "saldo_restante:applied.data?.saldo_restante"]
 .every(s=>scope.includes(s)));
test("Operación devuelve si fue un reintento",
 scope.includes("repetida:applied.data?.repetida===true"));
test("Conserva registro antiguo en la capa de UI",
 admin.includes("async function registerPartialPayment({")&&
 admin.includes("invoke('registrar_pago_parcial'"));
test("Bloqueo transaccional por cliente",
 migration.includes("from public.clientes where id=p_cliente_id for update"));
test("Recalcula total oficial bajo bloqueo",
 migration.includes("v_financial=public.goxion_estado_financiero(p_cliente_id)"));
test("Valida periodo esperado y estado pagado",
 migration.includes("PERIODO_DESACTUALIZADO")&&
 migration.includes("esta_pagado_periodo"));
test("Idempotencia por clave de operación",
 migration.includes("where operation_id=p_operation_id")&&
 migration.includes("'repetida',true"));
test("Índice único de clave",
 migration.includes("goxion_parcial_operation_id_uq"));
test("Máximo un parcial activo por período",
 migration.includes("goxion_parcial_activo_por_periodo_uq"));
test("Desactiva, inserta y actualiza cliente en SQL",
 migration.includes("update public.pagos_parciales set activo=false")&&
 migration.includes("insert into public.pagos_parciales")&&
 migration.includes("update public.clientes set"));
test("Solo rol del gateway tiene permiso para la RPC",
 migration.includes("revoke all on function public.goxion_registrar_pago_parcial_atomico")&&
 migration.includes("to service_role"));
test("No se activaron los importes de obligaciones sombra en el pago legacy",
 !scope.includes("goxion_obligaciones_sombra")&&!scope.includes("goxion_imputaciones_sombra"));
test("No altera por este cambio la aprobación de pago completo",
 edge.includes('if (action === "aprobar_pago")')&&edge.includes('"aprobar_pago_periodo"'));
test("No altera acuerdos pactados",
 edge.includes('if (action === "pactar_fecha_pago")')&&edge.includes("fecha_corte"));
console.log("GOXION pagos parciales atómicos: "+count+" guardas PASS");
