import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const read = path => readFileSync(path, "utf8");
const financial = read("assets/js/core/financial-actions.js");
const admin = read("assets/js/admin/07-admin-ops-v2.js");
const partial = read("assets/js/admin/08-admin-payment-referral-guards.js");
const agents = read("AGENTS.md");
const policy = read("docs/ENGINEERING_HYGIENE_POLICY.md");
const catalog = read("docs/FINANCIAL_ERROR_CATALOG.md");

const context = vm.createContext({ window: { GOXION_CORE: {} } });
vm.runInContext(financial, context);
const describe = context.window.GOXION_FINANCIAL_ACTIONS?.describeError;
assert.equal(typeof describe, "function", "Admin expone traductor de errores financieros");

const checks = [
  [{message:'record "v_parcial" is not assigned yet',code:"MOTOR_UNICO_APROBACION_FALLIDA"}, "FIN-PARCIAL-001"],
  [{message:"MOTOR_ADMIN_PAGO_FINAL_MONTO_DESACTUALIZADO"}, "FIN-SALDO-409"],
  [{message:"PERIODO_DESACTUALIZADO"}, "FIN-PERIODO-409"],
  [{message:"COMPROBANTE_NO_EXISTE"}, "FIN-COMPROBANTE-409"],
  [{message:"PAGO_EN_REVISION"}, "FIN-REVISION-409"],
  [{message:"Calendarios verificados insuficientes"}, "FIN-CALENDARIO-409"],
  [{message:"MOTOR_V1_DESGLOSE_OBLIGACIONES_DESACTUALIZADO"}, "FIN-CONCILIACION-409"],
  [{message:"Sin permiso",status:401}, "FIN-AUTORIZACION-401"],
  [{message:"Importe de pago inválido"}, "FIN-DATOS-400"],
  [{message:"Unexpected error at plpgsql variable foo", operationId:"op-test-1"}, "FIN-INTERNO-500"]
];
for(const [e,code] of checks){
  const result = describe(e);
  assert(result.includes("Código: "+code), "Código inesperado para "+JSON.stringify(e));
  assert(result.includes("Qué hacer:"), "Sin recomendación para "+code);
  assert(!result.includes("plpgsql") && !result.includes('record "v_parcial"'),
    "Error SQL sin sanitizar para "+code);
}
assert(describe(checks[9][0]).includes("Operación: op-test-1"));
assert(admin.includes("GOXION_FINANCIAL_ACTIONS?.describeError?.(e)"),
  "Admin debe traducir fallos de aprobación completa");
assert(partial.includes("GOXION_FINANCIAL_ACTIONS?.describeError?.(e)"),
  "Admin debe traducir fallos de parcialidad");
assert(agents.includes("docs/ENGINEERING_HYGIENE_POLICY.md"),"AGENTS exige higiene");
assert(agents.includes("docs/FINANCIAL_ERROR_CATALOG.md"),"AGENTS exige códigos");
assert(policy.includes("Una sustitución solo está terminada"),"Regla de reemplazo ausente");
for(const [,code] of checks) assert(catalog.includes(code),"Código sin documentación: "+code);

console.log("GOXION errores financieros Admin: "+checks.length+
  " casos y política de reemplazo limpio PASS");
