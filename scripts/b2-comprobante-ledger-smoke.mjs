import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ddl=readFileSync("supabase/migrations/202610130001_b2_comprobantes_transaccionales.sql","utf8");
let checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++};
const includes=(needle,label)=>check(ddl.includes(needle),label);
for(const table of ["goxion_b2_comprobantes","goxion_b2_comprobante_aplicaciones"]){
 includes("create table if not exists public."+table,table+" presente");
 includes("alter table public."+table+" enable row level security",table+" protege RLS");
}
for(const fn of ["goxion_b2_registrar_comprobante","goxion_b2_aprobar_comprobante"]){
 includes("create or replace function public."+fn+"(",fn+" disponible");
 includes("revoke all on function public."+fn+"(",fn+" cerrado a anon y authenticated");
 includes("grant execute on function public."+fn+"(",fn+" solo service role");
}
includes("unique(cliente_id,evidencia_ref)","Archivo no se usa dos veces");
includes("reporte_operation_id uuid not null unique","Reporte idempotente");
includes("aprobado_operation_id uuid unique","Aprobación idempotente");
includes("primary key(reporte_id,cargo_id)","El mismo comprobante no paga dos veces un cargo");
includes("unique(operation_id)","Un abono no se atribuye a dos comprobantes");
includes("where id=p_cliente_id for update","Bloqueo del cliente antes que recibo");
includes("where id=p_reporte_id and cliente_id=p_cliente_id for update","Bloqueo de comprobante por cliente");
includes("v_reporte.estado='aprobado'","Repetición reconoce operación anterior");
includes("v_reporte.aprobado_operation_id is distinct from p_operation_id","Clave diferente no reutiliza pago");
includes("v_cargo.cliente_id is distinct from p_cliente_id","No mezclar clientes");
includes("v_cargo.ciclo_id is distinct from v_reporte.ciclo_id","No mezclar períodos/ciclos");
includes("v_total is distinct from v_reporte.monto_reportado_centavos","Monto debe cuadrar exactamente");
includes("not p_excepcion_parcial and v_amount<>v_expected","Pago ordinario no queda incompleto");
includes("length(btrim(coalesce(p_motivo,'')))<10","Excepción Admin requiere explicación");
includes("public.goxion_b2_aprobar_abono(","Usar propietario financiero transaccional");
includes("insert into public.goxion_b2_comprobante_aplicaciones","Auditoría de aplicaciones");
includes("estado='aprobado',aprobado_operation_id=p_operation_id","Marcar aprobado solo tras todas las aplicaciones");
check(!/\b(?:drop|truncate)\s+(?:table|function)\b/i.test(ddl),"No contiene DROP/TRUNCATE");
check(!/grant\s+execute\s+on\s+function[\s\S]{0,180}\s+to\s+(?:anon|authenticated)/i.test(ddl),
  "No da acceso financiero a perfiles públicos");

// Simulación pura del contrato de transacción: el DB hará esto bajo lock.
// No sustituye la futura prueba SQL real, pero captura errores de reglas.
function approveProof(state,proofId,rows,opId,{allowPartial=false,reason="",failAt=-1}={}){
 const snapshot=structuredClone(state);
 const proof=state.proofs[proofId];
 if(!proof)throw Error("no-existe");
 if(proof.status==="approved"){
   if(proof.approveOp!==opId)throw Error("comprobante-repetido-con-otra-clave");
   return {...proof.result,repeated:true};
 }
 if(proof.status!=="reported")throw Error("comprobante-cerrado");
 if(!rows.length||new Set(rows.map(x=>x.charge)).size!==rows.length)throw Error("duplicado");
 if(allowPartial && reason.length<10)throw Error("motivo");
 if(rows.reduce((a,r)=>a+r.amount,0)!==proof.amount)throw Error("descuadre");
 try{
  for(const [i,r] of rows.entries()){
   const charge=state.charges[r.charge];
   if(!charge||charge.client!==proof.client||charge.cycle!==proof.cycle)throw Error("propiedad");
   if(r.amount<=0||r.expected!==charge.due)throw Error("saldo-desactualizado");
   if(!allowPartial && r.amount!==charge.due)throw Error("pago-parcial-no-autorizado");
   if(r.amount>charge.due)throw Error("exceso");
   if(i===failAt)throw Error("trigger-fail");
   charge.due-=r.amount;
  }
  proof.status="approved";proof.approveOp=opId;
  proof.result={ok:true,amount:proof.amount,repeated:false};
  return proof.result;
 }catch(e){
  state.proofs=snapshot.proofs;state.charges=snapshot.charges;
  throw e;
 }
}
const fixture=()=>({
 proofs:{p1:{client:"c",cycle:"nov",status:"reported",amount:9212}},
 charges:{a:{client:"c",cycle:"nov",due:4606},b:{client:"c",cycle:"nov",due:4606},
 other:{client:"other",cycle:"nov",due:4606}}
});
const apply=[{charge:"a",amount:4606,expected:4606},{charge:"b",amount:4606,expected:4606}];
{
 const state=fixture();const r=approveProof(state,"p1",apply,"op1");
 check(r.ok&&state.charges.a.due===0&&state.charges.b.due===0,"Pago conjunto se acredita una sola vez");
 check(approveProof(state,"p1",apply,"op1").repeated===true,"Reintento inocuo");
 assert.throws(()=>approveProof(state,"p1",apply,"op2"),/otra-clave/);checks++;
}
{
 const state=fixture();assert.throws(()=>approveProof(state,"p1",apply,"op1",{failAt:1}),/trigger-fail/);checks++;
 check(state.charges.a.due===4606&&state.charges.b.due===4606&&state.proofs.p1.status==="reported",
   "Fallo en cargo 2 revierte cargo 1");
}
{
 const state=fixture();assert.throws(()=>approveProof(state,"p1",[apply[0],apply[0]],"op1"),/duplicado/);checks++;
}
{
 const state=fixture();assert.throws(()=>approveProof(state,"p1",[{charge:"other",amount:9212,expected:4606}],"op1"),/propiedad|exceso/);checks++;
}
{
 const state=fixture();assert.throws(()=>approveProof(state,"p1",[{charge:"a",amount:4500,expected:4606},{charge:"b",amount:4606,expected:4606}],"op1"),/descuadre/);checks++;
}
{
 const state=fixture();state.charges.a.due=4650;
 assert.throws(()=>approveProof(state,"p1",apply,"op1"),/saldo-desactualizado/);checks++;
}
{
 const state=fixture();state.proofs.p1.amount=2500;
 assert.throws(()=>approveProof(state,"p1",[{charge:"a",amount:2500,expected:4606}],"op1"),/pago-parcial-no-autorizado/);checks++;
 const r=approveProof(state,"p1",[{charge:"a",amount:2500,expected:4606}],"op1",
  {allowPartial:true,reason:"Autorización excepcional documentada"});
 check(r.ok&&state.charges.a.due===2106,"Excepción Admin conserva saldo restante");
}

// Gateway beta sólo Admin: no autoriza pagos por acceso sin recibo.
const gateway=readFileSync("docs/edge/acciones-financieras-b2-beta/index.ts","utf8");
check(gateway.includes('if(action==="b2_aprobar_comprobante")'),"Acción de comprobante Admin existe");
check(gateway.includes('if(action==="b2_aprobar_abono"){')&&
  gateway.includes('codigo:"B2_REQUIERE_COMPROBANTE"'),"Prohibida ruta directa sin prueba");
check(gateway.includes('if (!auth.ok)') &&
  gateway.indexOf('if (!auth.ok)') < gateway.indexOf('if(action==="b2_aprobar_comprobante")'),
  "Token Admin se valida antes de acreditación");
check(gateway.includes('rpc("goxion_b2_aprobar_comprobante"'),"Aprobación delega a SQL transaccional");
check(gateway.includes('confirmar_aprobacion!==true'),"Aprobación explícita de Admin");
check(gateway.includes('new Set(rows.map((r:any)=>String(r.operation_id))).size!==rows.length'),
  "Evita reutilizar operation IDs entre cargos");
check(gateway.includes('acreditada_b2:false,operation_id:key'),"Error nunca simula acreditación");


// Evidencia privada: validar contrato de extremo a extremo sin credenciales.
const privateLedger=readFileSync("supabase/migrations/202610130003_b2_prueba_privada_y_cargos.sql","utf8");
const receiver=readFileSync("docs/edge/comprobantes-b2-beta/index.ts","utf8");
check(privateLedger.includes("storage.buckets")&&privateLedger.includes("'goxion-b2-evidencias'"),
  "Existe almacén privado de evidencia");
check(privateLedger.includes("false,6291456"),"Bucket no público y máximo 6 MB");
check(privateLedger.includes("storage.objects")&&privateLedger.includes("COMPROBANTE_ARCHIVO_NO_VERIFICADO"),
  "SQL no acepta ruta de archivo sin evidencia almacenada");
check(privateLedger.includes("cargos_solicitados")&&privateLedger.includes("COMPROBANTE_CARGOS_NO_COINCIDEN_CON_SOLICITUD"),
  "Admin no cambia servicios seleccionados por el cliente");
check(privateLedger.includes("B2_REPORTE_REQUIERE_EVIDENCIA_AUTENTICADA"),
  "Firma antigua que aceptaba texto queda cerrada");
check(receiver.includes('clientIdentity(req.headers.get("X-Client-Token")'),
  "Reporte exige sesión del cliente derivada del HMAC");
check(!receiver.includes("X-Admin-Token"),"Cliente no usa token administrativo");
check(receiver.includes("attachment instanceof File")&&receiver.includes("validImage(bytes,attachment.type)"),
  "Sólo captura con bytes verificables");
check(receiver.includes('crypto.subtle.digest("SHA-256",bytes)')&&
  receiver.includes("clientId+\"/\"+fileName"),
  "Evidencia privada se identifica por cliente y SHA, no nombre original");
check(receiver.includes("storage.from(BUCKET).upload")&&receiver.includes("upsert:false"),
  "Sin archivos reescritos ni subida directa pública");
check(receiver.includes('rpc("goxion_b2_registrar_comprobante_seguro"'),
  "El registro SQL está ligado al archivo y a los cargos");
check(receiver.includes("acreditado:false")&&
 !receiver.includes('goxion_b2_aprobar_comprobante'),
  "El reporte cliente no puede acreditar ni aprobar recibos");
check(receiver.includes('new Set(ids.map((id:unknown)=>String(id).toLowerCase()))'),
  "Los cargos duplicados también se bloquean con UUID de distinto case");
check(receiver.includes('select("cliente_id").eq("reporte_operation_id",opId)'),
  "La Edge detecta la operación idempotente antes de recalcular");
check(receiver.indexOf('const existing=') <
  receiver.indexOf('const cycle=await sb.from("goxion_b2_ciclos")'),
  "Replay de comprobante aprobado se atiende antes del preflight");
check(receiver.indexOf('const cycle=await sb.from("goxion_b2_ciclos")') <
  receiver.indexOf('storage.from(BUCKET).upload'),
  "El upload privado requiere ciclo elegible previamente");
check(receiver.includes('p_periodo:cycle.data.periodo')&&
 receiver.includes('B2_IMPORTES_NO_CONCILIADOS'),
  "Cargos, saldo y cotización SQL se validan antes del upload");
check(receiver.includes('return reply({ok:true,resultado:replay.data,'),
  "Idempotencia responde con resultado autoritativo de SQL");


console.log("GOXION B2 comprobantes: "+checks+" verificaciones de contrato + modelo transaccional PASS (sin acreditación real)");
