import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync("supabase/migrations/202610120010_aprobacion_pago_global_atomica.sql","utf8");
const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const legacy=readFileSync("docs/edge/periodo-cobro/index.ts","utf8");
const client=readFileSync("assets/js/core/financial-actions.js","utf8");
let tested=0;
const check=(cond,message)=>{assert(cond,message);tested++};
const includes=(s,p,m)=>check(s.includes(p),m||p);

includes(sql,"for update","El cliente queda serializado");
includes(sql,"v_financial=public.goxion_estado_financiero(p_cliente_id)","Fuente oficial bajo lock");
includes(sql,"PERIODO_DESACTUALIZADO","No aprobar periodos obsoletos");
includes(sql,"v_pagos>1","Ambigüedad en comprobantes históricos");
includes(sql,"v_pago.estado='pagado'","No recuperar otro pago ya liquidado");
includes(sql,"goxion_periodo_pago_canonico","Normalizar meses históricos");
includes(sql,"p_monto*100<>round(p_monto*100)","Precisión monetaria");
includes(sql,"update public.pagos_parciales set activo=false,estado='liquidado'","Liquidar parcial en misma transacción");
includes(sql,"update public.acuerdos_cobro set activo=false,estado='cumplido'","Liquidar acuerdo en misma transacción");
includes(sql,"update public.clientes set estado='pagado'","Marcar cliente pagado en la transacción");
includes(sql,"lealtad_efecto=v_efecto","Auditoría de lealtad");
includes(sql,"goxion_aprobaciones_pago_operaciones","Bitácora idempotente persistida");
includes(sql,"if found then\n   if v_op.cliente_id","Reintento no vuelve a escribir");
includes(sql,"return v_op.resultado || jsonb_build_object('repetida',true)","Repetición en misma clave");
includes(sql,"alter table public.goxion_aprobaciones_pago_operaciones enable row level security","Tabla protegida con RLS");
includes(sql,"from public,anon,authenticated","Revocación de RPC pública");
includes(sql,"'acreditada_b2',false","No activa individualización");
check(!/update public\.goxion_obligaciones_sombra|insert into public\.goxion_obligaciones_sombra/.test(sql),
 "Sin obligaciones reales B2");

const a=edge.indexOf('if (action === "aprobar_pago")');
const b=edge.indexOf('if (action === "trato_justo_guardar")',a);
check(a>0&&b>a,"Gateway conserva ramas");
const route=edge.slice(a,b);
includes(route,'goxion_aprobar_pago_periodo_atomico',"Solo RPC atómica");
check(!route.includes('callFunction(')&&!route.includes('.from("pagos_parciales")')&&
  !route.includes('.from("acuerdos_cobro")'),"Sin escrituras financieras sueltas");
includes(route,'clave_idempotencia',"Clave de reintento recibida");
includes(client,"approvalRetryKeys","Idempotencia cliente");
includes(client,"clave_idempotencia,","Cliente propaga clave al gateway");
includes(legacy,'goxion_aprobar_pago_periodo_atomico',"Ruta legacy reutiliza RPC");
check(!legacy.includes('const paymentUpdate')&&!legacy.includes('.from("pagos").insert('),
 "Ruta histórica no escribe un recibo en varios pasos");

const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const mocked=new AsyncFunction("action","data","sb","json","financialState","operationId","uuid",route);
const clientId="3798865f-9a7e-4c4b-a16d-efec82f262ed";
const key="a8bf4671-18f5-4f5b-97de-45c8fc87b186";
async function invoke(data,fail){
 const calls=[];let reads=0;
 const sb={rpc:async(name,args)=>{
  calls.push({name,args});
  return fail?{error:{message:"PERIODO_DESACTUALIZADO"}}:
   {data:{ok:true,periodo_pagado:"octubre de 2026",acreditada_b2:false}};
 }};
 const financialState=async()=>{reads++;return {data:{periodo:reads===1?
  "2026-10-01":"2026-11-01"},error:null}};
 const output=await mocked("aprobar_pago",data,sb,(o,status=200)=>({...o,status}),financialState,
   "39a99f99-8bb8-4a88-9b3c-663039999999",
   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
 return {output,calls,reads};
}
const base={cliente_id:clientId,periodo_esperado:"2026-10",monto:92,puntual:true,notas:"Pago",clave_idempotencia:key};
let r=await invoke(base);
check(r.output.status===200&&r.output.resultado.acreditada_b2===false,"Aprobación global sin B2");
check(r.calls.length===1&&r.calls[0].name==="goxion_aprobar_pago_periodo_atomico",
 "Una sola escritura en gateway");
check(r.calls[0].args.p_operation_id===key,"Clave de reintento íntegra");
check(r.calls[0].args.p_periodo_esperado==="2026-10","Periodo íntegro");
r=await invoke({...base,clave_idempotencia:"no-uuid"});
check(r.output.status===400&&r.calls.length===0,"Clave inválida no se envía a DB");
r=await invoke({...base,periodo_esperado:"2026-09"});
check(r.output.status===409&&r.calls.length===0,"Periodo incorrecto no se envía a DB");
r=await invoke(base,true);
check(r.output.status===409&&r.output.codigo==="PERIODO_DESACTUALIZADO","RPC obsoleta falla cerrada");
console.log("GOXION aprobación global atómica: "+tested+" contratos y simulaciones PASS (SIN SQL productivo)");
