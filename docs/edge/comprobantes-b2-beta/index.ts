// GOXION B2 · recepcion de evidencia privada (beta aislada)
// Única finalidad: archivo -> almacenamiento privado -> reporte pendiente.
// NO acredita pagos, no activa B2, no permite acceso anónimo ni Admin por
// esta ruta. El cliente se deriva del HMAC, nunca del formulario.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const BUCKET="goxion-b2-evidencias";
const MAX_BYTES=6*1024*1024;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const headers={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, apikey, x-client-token, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function reply(body:Record<string,unknown>,status=200){
 return new Response(JSON.stringify(body),{
  status,headers:{...headers,"Content-Type":"application/json","Cache-Control":"no-store"}
 });
}
function b64(value:string){
 const data=value.replace(/-/g,"+").replace(/_/g,"/")
   .padEnd(Math.ceil(value.length/4)*4,"=");
 return Uint8Array.from(atob(data),x=>x.charCodeAt(0));
}
async function clientIdentity(token:string,serviceKey:string){
 try{
  const split=String(token||"").trim().split(".");
  if(split.length!==2)return null;
  const key=await crypto.subtle.importKey("raw",
   new TextEncoder().encode(serviceKey),
   {name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!await crypto.subtle.verify("HMAC",key,b64(split[1]),
      new TextEncoder().encode(split[0])))return null;
  const data=JSON.parse(new TextDecoder().decode(b64(split[0])));
  if(data?.role!=="goxion_client"||!uuid.test(String(data?.cliente_id||""))||
    Number(data?.exp||0)<=Math.floor(Date.now()/1000))return null;
  return String(data.cliente_id);
 }catch{return null;}
}
function validImage(bytes:Uint8Array,type:string){
 if(bytes.length<12||bytes.length>MAX_BYTES)return null;
 if(type==="image/jpeg"&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)
  return ".jpg";
 if(type==="image/png"&&[137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))
  return ".png";
 if(type==="image/webp"&&
  new TextDecoder().decode(bytes.slice(0,4))==="RIFF"&&
  new TextDecoder().decode(bytes.slice(8,12))==="WEBP")return ".webp";
 return null;
}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return reply({ok:false,error:"Método no permitido"},405);
 const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const endpoint=Deno.env.get("SUPABASE_URL")||"";
 if(!endpoint||!key)return reply({ok:false,error:"Servicio no configurado"},503);
 const clientId=await clientIdentity(req.headers.get("X-Client-Token")||"",key);
 if(!clientId)return reply({ok:false,error:"Sesión expirada"},401);
 const size=Number(req.headers.get("content-length")||0);
 if(size>MAX_BYTES+10000)return reply({ok:false,error:"La captura supera 6 MB"},413);
 const sb=createClient(endpoint,key,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const data=await req.formData();
  const cycleId=String(data.get("ciclo_id")||"").trim();
  const opId=String(data.get("clave_idempotencia")||"").trim();
  const amount=Number(data.get("monto_centavos"));
  const ids=JSON.parse(String(data.get("cargo_ids")||"[]"));
  const attachment=data.get("archivo");
  if(!uuid.test(cycleId)||!uuid.test(opId)||
   !Number.isSafeInteger(amount)||amount<=0||amount>100_000_000||
   !Array.isArray(ids)||ids.length<1||ids.length>80||
   ids.some((id:unknown)=>!uuid.test(String(id||"")))||
   new Set(ids).size!==ids.length||
   !(attachment instanceof File)||attachment.size<12||attachment.size>MAX_BYTES)
   return reply({ok:false,error:"Comprobante, cargos o importes inválidos"},400);
  const bytes=new Uint8Array(await attachment.arrayBuffer());
  const ext=validImage(bytes,attachment.type);
  if(!ext)return reply({ok:false,error:"Solo capturas JPG, PNG o WEBP válidas"},400);
  const dig=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
  const sha=[...dig].map(x=>x.toString(16).padStart(2,"0")).join("");
  // La ruta no contiene ni nombre original ni datos de la cuenta bancaria.
  const fileName=opId+"-"+sha.slice(0,24)+ext;
  const path=clientId+"/"+fileName;
  const uploaded=await sb.storage.from(BUCKET).upload(path,bytes,{
   upsert:false,contentType:attachment.type,cacheControl:"0"
  });
  if(uploaded.error){
   // Sólo tolerar una repetición con el MISMO hash y archivo ya privado.
   const prior=await sb.storage.from(BUCKET).list(clientId,{
    search:fileName,limit:5
   });
   if(prior.error||!prior.data?.some((x:any)=>x.name===fileName))
    return reply({ok:false,error:"No se pudo guardar la evidencia"},409);
  }
  const reported=await sb.rpc("goxion_b2_registrar_comprobante_seguro",{
   p_cliente_id:clientId,p_ciclo_id:cycleId,p_monto_centavos:amount,
   p_evidencia_ref:path,p_operation_id:opId,p_cargo_ids:ids
  });
  if(reported.error||reported.data?.ok!==true){
   // No se registra un pago cuando SQL no concilia cliente, fecha o importe.
   return reply({ok:false,error:reported.error?.message||
    "No fue posible validar este comprobante con tu saldo actual",
    codigo:"REPORTE_B2_NO_CONCILIADO",acreditado:false},409);
  }
  return reply({ok:true,resultado:reported.data,reporte_id:reported.data.reporte_id,
   estado:reported.data.estado,acreditado:false});
 }catch(error){
  console.error("goxion_b2_evidencia",error instanceof Error?error.name:"desconocido");
  return reply({ok:false,error:"No pudimos procesar la captura"},500);
 }
});
