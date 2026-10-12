import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const sql=readFileSync("supabase/migrations/202610120007_confirmar_imputacion_sombra.sql","utf8");
const anterior=readFileSync("supabase/migrations/202610120006_imputacion_sombra_aprobada.sql","utf8");
const head=edge.indexOf('if (action === "confirmar_imputacion_sombra")');
const tail=edge.indexOf('if (action === "preparar_imputacion_sombra")',head);
assert(head>0&&tail>head,"El gateway debe preservar la ruta de preparación");
const scoped=edge.slice(head,tail);
const auth=edge.indexOf("const auth = await validAdmin(req, adminSecret)");
assert(auth>=0&&auth<head,"Confirmación solo detrás de sesión Admin");
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const v=async function(action,data,backend){
 const calls=[];
 const sb={rpc:async(name,args)=>{
  calls.push({name,args});return backend?.error?{error:{message:backend.error}}:
   {data:{ok:true,estado:"imputada_sombra",repetida:false,
      acreditada_oficial:false,saldo_proyectado:{saldo_proyectado_centavos:1600}}};
 }};
 const f=new AsyncFunction("action","data","sb","json",scoped);
 return {out:await f(action,data,sb,(value,httpStatus=200)=>({...value,httpStatus})),calls};
};
const id="efa891b8-56ac-42cf-ade8-f9c2bdf822a6";
const key="a6e0d69b-90bd-44d5-ab97-ac8d8ff194dc";
let tests=0;
const check=(x,msg)=>{assert(x,msg);tests++};
const equal=(a,b,msg)=>{assert.deepEqual(a,b,msg);tests++};
let r=await v("confirmar_imputacion_sombra",{imputacion_id:id,clave_confirmacion:key});
equal(r.out.httpStatus,200,"Éxito");
equal(r.out.acreditada_oficial,false,"Nunca acredita fuente oficial");
equal(r.out.cobrable,false,"Sin facturación");
equal(r.out.modo,"asignacion_sombra_sin_cobro","Estado sombra explícito");
equal(r.calls.length,1,"Una sola transacción de confirmación");
equal(r.calls[0].name,"goxion_confirmar_imputacion_sombra","RPC única");
equal(r.calls[0].args.p_clave_confirmacion,key,"Clave íntegra");
equal(r.calls[0].args.p_imputacion_id,id,"Identidad exacta");
r=await v("confirmar_imputacion_sombra",{imputacion_id:"1",clave_confirmacion:key});
equal(r.out.httpStatus,400,"Rechaza UUID inválido");
equal(r.calls.length,0,"No consulta DB con parámetros malos");
r=await v("confirmar_imputacion_sombra",{imputacion_id:id,clave_confirmacion:key},{error:"Comprobante no aprobado"});
equal(r.out.httpStatus,409,"Pago sin aprobación rechazado");
equal(r.out.acreditada_oficial,false,"No acredita fallas");
r=await v("resumen_obligacion_sombra",{obligacion_id:id});
equal(r.calls[0].name,"goxion_resumen_imputacion_sombra","Única ruta informativa");
equal(r.out.cobrable,false,"No muestra cuenta cobrable");
check(!/\.from\("pagos"\)|\.from\("clientes"\)|\.from\("pagos_parciales"\)/.test(scoped),
 "Ninguna escritura en estados heredados");
check(sql.includes("'imputada_sombra'")&&sql.includes("'propuesta'"),"Dos estados separados");
check(sql.includes("new.confirmacion_clave is null"),"Requiere constancia idempotente");
check(sql.includes("confirmacion_clave is not null and confirmado_en is not null"),
 "Estado confirmado exige sello de tiempo");
check(sql.includes("v_imputado")&&sql.includes("v_pendiente"),"Contabilidad separa confirmado/pendiente");
check(sql.includes("'acreditada_oficial',false"),"No sustituye deuda oficial");
check(sql.includes("where id=p_imputacion_id for update"),"Lock explícito de fila");
check(sql.includes("on public.goxion_imputaciones_sombra(confirmacion_clave)"),"Clave única de confirmación");
check(sql.includes("estado in ('propuesta','imputada_sombra')"),
 "Total comprometido comprende pendientes más confirmados");
check(sql.includes("new.monto_centavos+v_otras>v_total"),
 "Impedir sobreimputación de una obligación");
check(anterior.includes("v_pago_estado is distinct from 'pagado'"),
 "La validación de pago aprobado se conserva");
check(!/update public\.pagos\b|insert into public\.pagos\b|update public\.clientes\b/i.test(sql),
 "La migración no acredita facturas de producción");
check(edge.includes('if (action === "aprobar_pago")'),"Conservar aprobación global");
console.log("GOXION confirmar imputación sombra: "+tests+" pruebas PASS");
