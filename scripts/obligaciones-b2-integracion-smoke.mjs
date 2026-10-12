import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const prepare=readFileSync("supabase/migrations/202610120009_preparar_obligaciones_por_calendario.sql","utf8");
const evidence=readFileSync("supabase/migrations/202610120008_evidencia_imputacion_sombra.sql","utf8");
const code=edge.slice(edge.indexOf('if (action === "preparar_obligaciones_sombra")'),
 edge.indexOf('if (action === "confirmar_imputacion_sombra")'));
assert(code.includes('if (action === "preparar_obligaciones_sombra")'));
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const run=new AsyncFunction("action","data","sb","json","operationId",code);
const uuid="efa891b8-56ac-42cf-ade8-f9c2bdf822a6";
let checks=0;
const check=(value,message)=>{assert(value,message);checks++};
const eq=(v,w,message)=>{assert.deepEqual(v,w,message);checks++};
async function call(input={},dbData={ok:true,aplicable:false,motivo:"periodo_o_beneficios_requieren_conciliacion_individual"}){
 const calls=[];
 const sb={rpc:async(name,values)=>{calls.push({name,values});return {data:dbData}}};
 const result=await run("preparar_obligaciones_sombra",{
  cliente_id:uuid,periodo:"2026-11-01",...input
 },sb,(obj,status=200)=>({...obj,httpStatus:status}),"test-op");
 return {result,calls};
}
let r=await call();
eq(r.result.httpStatus,200,"Estado de validación disponible");
eq(r.result.resultado.aplicable,false,"Calendario incompleto bloqueado");
eq(r.result.cobrable,false,"Nunca cobrar con esquema sombra");
eq(r.result.acreditada_oficial,false,"No acreditar de forma silenciosa");
eq(r.calls.length,1,"Una sola llamada SQL");
eq(r.calls[0].name,"goxion_preparar_obligaciones_calendario_sombra","Ruta oficial");
eq(r.calls[0].values.p_solo_validar,true,"Solo validar por omisión");
r=await call({confirmar_materializacion:true});
eq(r.calls[0].values.p_solo_validar,false,"Persistir únicamente por elección Admin");
r=await call({confirmar_materializacion:"true"});
eq(r.calls[0].values.p_solo_validar,true,"No convertir string en aprobación");
r=await call({periodo:"2026-11-15"});
eq(r.result.httpStatus,400,"Período solo primer día");
eq(r.calls.length,0,"No llamar DB con período incorrecto");
r=await call({cliente_id:"mal"});
eq(r.result.httpStatus,400,"ID de cliente inválido");
eq(r.calls.length,0,"Sin RPC al no validar cliente");
check(edge.indexOf("const auth = await validAdmin(req, adminSecret)")<
 edge.indexOf('if (action === "preparar_obligaciones_sombra")'),
 "El Admin requiere autenticación");
check(prepare.includes("p_solo_validar boolean default true"),"Modo validación por defecto");
check(prepare.includes("v_validos<>v_days"),"Todos los accesos verificables");
check(prepare.includes("v_contratos_verificados<>v_count"),"No omitir contratos");
check(prepare.includes("v_total_accesos<>v_total_contratado"),"No inventar importes de X2");
check(prepare.includes("v_fechas_distintas<2"),"Clientes fecha única no se migran");
check(prepare.includes("v_disc<>0 or v_fees<>0"),"Bloquear lealtad/cupones/mora sin atribuir");
check(prepare.includes("or v_ya_pagado or v_revisando or v_partial"),"Bloquear pagado/revisión/abono previo");
check(prepare.includes("v_official_period is distinct from p_periodo"),"Conciliar período del motor");
check(prepare.includes("for share of cal"),"Calendario bloqueado en preparación");
check(prepare.includes("cal.revision"),"Guardar revisión exacta");
check(prepare.includes("on conflict (cliente_acceso_id,ciclo_inicio) do nothing"),"Idempotencia de ciclo");
check(prepare.includes("if (select count(*) from public.goxion_obligaciones_sombra"),"No dejar obligaciones parciales");
check(evidence.includes("v_cal.revision is distinct from v_ob.calendario_revision"),"Confirmar revisión vigente");
check(evidence.includes("v_cal.cobertura_hasta is distinct from v_ob.fecha_vencimiento"),"Validar fecha igual");
check(evidence.includes("v_cal.precio_centavos is distinct from v_ob.base_centavos"),"Validar precio igual");
check(evidence.includes("if v.pago_id is null then"),"Abonos sin comprobante aprobado no se confirman");
check(evidence.includes("v_ob.descuentos_centavos>0 or v_ob.mora_centavos>0"),"Bloquear beneficios/mora sin atribuir");
check(prepare.includes("'cobrable',false"),"Esquema no se vuelve cobrable");
check(!/update public\.pagos\b|update public\.clientes\b|insert into public\.pagos\b/i.test(prepare+evidence),
 "Migraciones no modifican pagos ni cliente oficiales");
console.log("GOXION B2 obligaciones e imputación: "+checks+" pruebas PASS; sin cobros ni UI nuevos");
