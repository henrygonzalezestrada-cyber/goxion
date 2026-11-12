import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const admin=readFileSync("assets/js/core/financial-actions.js","utf8");
const start=edge.indexOf('if (action === "registrar_pago_parcial")');
const end=edge.indexOf('if (action === "pactar_fecha_pago")',start);
assert(start>0&&end>start,"La ruta parcial oficial permanece en Admin");
const scope=edge.slice(start,end);
let count=0;
const check=(message,condition)=>{assert(condition,message);count++};

check("Admin exige token HMAC verificado",
 edge.includes("const auth = await validAdmin(req, adminSecret)") &&
 edge.indexOf("const auth = await validAdmin(req, adminSecret)")<start);
check("No existe secreto HMAC falso o puerta de QA en producción",
 edge.includes('Deno.env.get("ADMIN_SESSION_SECRET")') &&
 !edge.includes("goxion_motor_qa_auth_secret_v1"));
check("Parcial se acredita exclusivamente por el motor V1",
 scope.includes('sb.rpc("goxion_motor_admin_mensual_v1"') &&
 !scope.includes('goxion_registrar_pago_parcial_atomico'));
check("Una RPC, sin escrituras directas múltiples",
 (scope.match(/sb\.rpc\(/g)||[]).length===1 &&
 !/\.from\(["'](?:pagos|pagos_parciales|clientes)["']\)\.(?:insert|update|delete|upsert)/.test(scope));
check("Cliente, periodo, saldo en centavos e idempotencia",
 ["p_cliente_id:clienteId",'p_periodo:periodoEsperado+"-01"',
 "p_saldo_restante_centavos:saldoCentavos","p_operation_id:effectiveId",
 "p_monto_centavos:null","p_actor:"].every(x=>scope.includes(x)));
check("Rechaza fracciones de centavo",
 scope.includes("Math.abs(saldoRaw*100-saldoCentavos)>1e-5"));
check("Parcial requiere saldo positivo y un período válido",
 scope.includes("saldoCentavos<=0")&&scope.includes("periodoEsperado"));
check("Clave de reintento se valida",
 scope.includes("CLAVE")||scope.includes("Clave idempotente inválida"));
check("Error antiguo de período y nuevo saldo distinguibles",
 scope.includes("PERIODO_DESACTUALIZADO")&&scope.includes("SALDO_DESACTUALIZADO"));
check("Error HTTP es 409 cuando SQL no acredita",
 scope.includes("PARCIAL_NO_APLICADO")&&scope.includes("},409)"));
check("Estado anterior y posterior se preservan",
 scope.includes("estado_anterior:before.data")&&scope.includes("estado_financiero:after.error"));
check("Respuesta conserva pago parcial y montos",
 scope.includes("pago_parcial:applied.data?.pago_parcial") &&
 scope.includes("monto_pagado:applied.data?.monto_pagado") &&
 scope.includes("saldo_restante:applied.data?.saldo_restante"));
check("Respuesta reconoce reintentos",
 scope.includes("repetida:applied.data?.repetida===true"));
check("Client UI usa la ruta original con token Admin",
 admin.includes("async function registerPartialPayment({")&&
 admin.includes("invoke('registrar_pago_parcial'"));
check("El pago completo comparte el mismo escritor",
 edge.includes('if (action === "aprobar_pago")')&&
 (edge.match(/sb\.rpc\("goxion_motor_admin_mensual_v1"/g)||[]).length===2 &&
 !edge.includes('callFunction(url, "periodo-cobro", "aprobar_pago_periodo"'));
check("Acuerdos y fecha pactada se mantienen en su acción",
 edge.includes('if (action === "pactar_fecha_pago")')&&edge.includes("fecha_corte"));

console.log("GOXION motor V1, parcial y mensual: "+count+" invariantes de gateway PASS");
