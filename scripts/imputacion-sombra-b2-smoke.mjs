import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const rpc=readFileSync("supabase/migrations/202610120006_imputacion_sombra_aprobada.sql","utf8");
const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const audit=readFileSync("supabase/migrations/202610120003_abonos_b2_auditoria.sql","utf8");
const start=edge.indexOf('if (action === "preparar_imputacion_sombra")');
const end=edge.indexOf('if (action === "aprobar_pago")',start);
assert(start>=0&&end>start,"Gateway conserva acción de aprobación oficial y prepara sombra aparte");
const route=edge.slice(start,end);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const actionFn=new AsyncFunction("action","data","operationId","sb","json",route);
let checks=0;
const check=(value,label)=>{assert(value,label);checks++};
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++};
const uuid=(v)=>v.toString(16).padStart(8,"0")+"-9e19-4c9d-b21a-ff735d972108";
const id1=uuid(1),id2=uuid(2),key=uuid(3);
async function invoke(payload={},dbErr=null){
  const calls=[];
  const r=await actionFn("preparar_imputacion_sombra",{
    obligacion_id:id1,pago_id:id2,clave_idempotencia:key,monto_centavos:1200,...payload
  },"temp-op",{
    rpc:async(name,args)=>{calls.push({name,args});return dbErr?{error:{message:dbErr}}:
      {data:{ok:true,imputacion_id:id1,estado:"propuesta",repetida:false,acreditada:false}};}
  },(payload,status=200)=>({...payload,status}));
  return {r,calls};
}
let x=await invoke();
eq(x.r.status,200,"Admin aceptado para sombra");
eq(x.r.acreditada,false,"Nunca acredita pago");
eq(x.r.cobrable,false,"Nunca habilita checkout");
eq(x.r.modo,"propuesta_sin_acreditacion","Estado informativo");
eq(x.calls.length,1,"Solo una operación SQL");
eq(x.calls[0].name,"goxion_preparar_imputacion_sombra","Reutiliza transacción");
eq(x.calls[0].args.p_clave_idempotencia,key,"Clave de reintento intacta");
eq(x.calls[0].args.p_monto_centavos,1200,"Importe exacto en centavos");
for(const val of [{pago_id:"falso"},{obligacion_id:"falso"},{clave_idempotencia:"falso"},
 {monto_centavos:0},{monto_centavos:1.1},{monto_centavos:-100}]){
  x=await invoke(val);
  eq(x.r.status,400,"Datos inválidos rechazados");
  eq(x.calls.length,0,"Error local no llega a SQL");
}
x=await invoke({}, "El pago no pertenece a este cliente");
eq(x.r.status,409,"Se propaga conflicto sin acreditar");
eq(x.r.acreditada,false,"Fallos no generan acreditación");
eq(x.r.codigo,"IMPUTACION_NO_VALIDADA","Error distinguible de cobro oficial");
check(edge.indexOf("const auth = await validAdmin(req, adminSecret)")<start,
 "La acción sigue detrás de validación de X-Admin-Token");
check(!/\.from\("pagos"\)|\.from\("pagos_parciales"\)|\.from\("clientes"\)/.test(route),
 "No modifica cuentas oficiales desde Edge");
check(!/accion.*aprobar_pago|aprobar_pago_periodo/.test(route),
 "No llama al aprobador tradicional");
check(rpc.includes("v_pago_estado is distinct from 'pagado'"),
 "El comprobante debe estar aprobado en SQL");
check(rpc.includes("public.goxion_periodo_pago_canonico(p.periodo)"),
 "Normalización del período histórico");
check(rpc.includes("v_periodo is distinct from date_trunc('month',v_ciclo)::date"),
 "Comprobante y obligación del mismo mes");
check(rpc.includes("v_cliente is distinct from v_pago_cliente"),
 "Propietario del pago coincide");
check(rpc.includes("v_monto is null or new.monto_centavos+v_usado>v_monto"),
 "Una fuente no puede cubrir más de lo recibido");
check(rpc.includes("new.monto_centavos+v_otras>v_total"),
 "Una obligación no recibe más de su total");
check(rpc.includes("for update"),"Bloqueos transaccionales");
check(rpc.includes("'repetida',true")&&rpc.includes("'acreditada',false"),
 "RPC acepta reintentos sin acreditar");
check(rpc.includes("goxion_imputaciones_sombra_idempotencia_uq"),
 "Índice de idempotencia por imputación");
check(rpc.includes("revoke all on function public.goxion_preparar_imputacion_sombra")&&
 rpc.includes("to service_role"),"Solo backend puede preparar");
check(audit.includes("goxion_b2_imputacion_audit"),
 "Auditado por trigger existente");
check(!/insert into public\.pagos\b|update public\.pagos\b|update public\.clientes\b/.test(rpc),
 "La migración no edita pagos oficiales");
check(edge.includes('if (action === "registrar_pago_parcial")')&&
 edge.includes('if (action === "aprobar_pago")'),
 "Los pagos legados siguen operativos");
console.log("GOXION imputación B2 sombra: "+checks+" casos y guardas PASS");
