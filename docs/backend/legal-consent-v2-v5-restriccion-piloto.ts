import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const VERSION="2.0";
const SHA="901a521e4101107b2cb7529c3e7c87cea1a7cddbe2dbf77cc6821533e8750cf6";
// Versión 2.0 habilitada para todas las cuentas con sesión válida.
// La aceptación histórica del piloto Luis (secuencia 3) fue reabierta
// expresamente para probar el diseño final; no se borra su registro.
const PILOTO_CLIENTE="9975731b-d991-453e-94a1-81c213db474c";
const PILOTO_REAPERTURA_HASTA_SECUENCIA=3;
const cors={
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, x-client-token, x-client-info, apikey, content-type",
 "Access-Control-Allow-Methods":"POST, OPTIONS"
};
const response=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}
});
function decode(part:string){
 const b=part.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(part.length/4)*4,"=");
 return Uint8Array.from(atob(b),ch=>ch.charCodeAt(0));
}
async function verify(token:string,secret:string){
 const parts=token.trim().split(".");
 if(parts.length!==2)return null;
 try{
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
   {name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,decode(parts[1]),
   new TextEncoder().encode(parts[0]))))return null;
  const claims=JSON.parse(new TextDecoder().decode(decode(parts[0])));
  if(claims.role!=="goxion_client"||!claims.cliente_id||
   Number(claims.exp)<=Math.floor(Date.now()/1000))return null;
  return claims;
 }catch{return null}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return response({ok:false,error:"Método no permitido"},405);
 try{
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)throw Error("Configuración del servidor no disponible");
  const user=await verify(req.headers.get("X-Client-Token")||"",secret);
  if(!user)return response({ok:false,error:"Sesión de Mi Espacio no válida"},401);
  const sb=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const clienteId=String(user.cliente_id);
  const body=await req.json().catch(()=>({}));
  const accion=String(body?.accion||"estado");
  if(!["estado","decidir"].includes(accion))return response({ok:false,error:"Acción inválida"},400);
  const client=await sb.from("clientes").select("id,estado").eq("id",clienteId).maybeSingle();
  if(client.error)throw client.error;
  if(!client.data)return response({ok:false,error:"Cuenta no disponible"},404);
  const latest=async()=>{
   const q=await sb.from("goxion_legal_decisiones")
    .select("decision,registrado_en,id,secuencia")
    .eq("cliente_id",clienteId).eq("version",VERSION)
    .order("secuencia",{ascending:false})
    .limit(1).maybeSingle();
   if(q.error)throw q.error;
   return q.data||null;
  };
  const estadoVigente=(row:any)=>
    !row?"pendiente":
      clienteId===PILOTO_CLIENTE&&Number(row.secuencia)<=PILOTO_REAPERTURA_HASTA_SECUENCIA?
        "pendiente":row.decision;
  // Restricción calculada en DB, nunca a partir del nombre o del estado visual.
  // La RPC retorna fase normal para cualquier cuenta distinta de Cliente Prueba.
  const accesoPiloto=async()=>{
    const x=await sb.rpc("goxion_legal_piloto_estado",{p_cliente_id:clienteId});
    if(x.error)throw x.error;
    return x.data;
  };
  if(accion==="decidir"){
    const decision=String(body?.decision||"");
    const op=String(body?.operation_id||"");
    if(!["aceptado","rechazado"].includes(decision)||!uuid.test(op))
      return response({ok:false,error:"Se necesita una decisión explícita válida"},400);
    const created=await sb.from("goxion_legal_decisiones").upsert({
      cliente_id:clienteId,version:VERSION,documento_sha256:SHA,
      decision,operation_id:op,origen:"mi_espacio"
     },{onConflict:"operation_id",ignoreDuplicates:true}).select("id,cliente_id,decision");
    if(created.error)throw created.error;
    if(!created.data?.length){
      const already=await sb.from("goxion_legal_decisiones")
       .select("cliente_id,decision,documento_sha256")
       .eq("operation_id",op).maybeSingle();
      if(already.error)throw already.error;
      if(!already.data||already.data.cliente_id!==clienteId||
         already.data.decision!==decision||already.data.documento_sha256!==SHA)
        return response({ok:false,error:"La operación ya corresponde a otra decisión"},409);
    }
    const state=await latest();
    const acceso=await accesoPiloto();
    return response({ok:true,habilitado:true,cliente_id:clienteId,version:VERSION,
      estado:estadoVigente(state),acceso,registrado_en:state?.registrado_en||null,
      rechazo_no_interrumpe_periodo_pagado:true,
      bloqueo_de_renovacion_automatico:false});
  }
  // El aviso permanece en notificaciones incluso tras decidir.
  const notice=await sb.from("cliente_notificaciones").insert({
    cliente_id:clienteId,tipo:"legal_actualizacion",
    titulo:"Actualizamos los Términos y Condiciones",
    mensaje:"Revisa la versión 2.0 y elige aceptar o rechazar. Si decides hacerlo después, podrás volver desde esta notificación.",
    referencia:"terminos-v2.0",prioridad:2,
    dedupe_key:"legal-terminos-v2.0"
  });
  if(notice.error&&notice.error.code!=="23505")
    console.warn("Aviso legal no insertado",notice.error.code);
  const state=await latest();
  const acceso=await accesoPiloto();
  return response({ok:true,habilitado:true,cliente_id:clienteId,version:VERSION,documento_sha256:SHA,
    estado:estadoVigente(state),acceso,registrado_en:state?.registrado_en||null,
    rechazo_no_interrumpe_periodo_pagado:true,
    bloqueo_de_renovacion_automatico:false});
 }catch(err){
  console.error("legal v2",err);
  return response({ok:false,error:"No fue posible consultar o guardar la decisión"},500);
 }
});
