import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-token, x-admin-token, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Cache-Control":"no-store"
};
const answer=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{
  status,headers:{...cors,"Content-Type":"application/json; charset=utf-8"}
});
const bytes=(s:string)=>{
  const b=s.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(s.length/4)*4,"=");
  return Uint8Array.from(atob(b),x=>x.charCodeAt(0));
};
async function signed(token:string,secret:string,role:string){
  if(!secret||!token||token.length>8192)return null;
  const parts=token.trim().split(".");
  if(parts.length!==2)return null;
  try{
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
      {name:"HMAC",hash:"SHA-256"},false,["verify"]);
    const valid=await crypto.subtle.verify("HMAC",key,bytes(parts[1]),
      new TextEncoder().encode(parts[0]));
    if(!valid)return null;
    const payload=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
    if(payload.role!==role||!Number.isFinite(Number(payload.exp))||
       Number(payload.exp)<=Math.floor(Date.now()/1000))return null;
    if(role==="goxion_client"&&!/^[0-9a-f-]{36}$/i.test(String(payload.cliente_id||"")))return null;
    return payload;
  }catch{return null}
}
const normalized=(v:unknown)=>String(v??"").trim().replace(/\s+/g," ");

const uuid=(s:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s||""));
function platform(name:string,id:string|null){
 const n=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const families=[[/disney/,"disney-plus"],[/netflix/,"netflix"],[/google.*(one|foto|photo|tb)/,"google-one"],[/hbo|\bmax\b/,"hbo-max"],[/youtube/,"youtube"],[/prime|amazon/,"prime-video"],[/crunchy/,"crunchyroll"],[/microsoft|office|365/,"microsoft-365"],[/\bvix\b/,"vix"]] as const;
 return families.find(([re])=>re.test(n))?.[1]||id||n.trim().slice(0,180);
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return answer({ok:false,error:"Método no permitido."},405);
 try{
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",url=Deno.env.get("SUPABASE_URL")||"";
  const session=await signed(req.headers.get("X-Client-Token")||"",key,"goxion_client");
  if(!session)return answer({ok:false,error:"Inicia sesión nuevamente."},401);
  const body=await req.json().catch(()=>({})),d=body.datos||{},action=String(body.accion||"");
  if(!uuid(d.cliente_servicio_id))return answer({ok:false,error:"Servicio inválido."},400);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:client,error:ce}=await sb.from("clientes").select("id,estado,folio").eq("id",session.cliente_id).maybeSingle();
  if(ce)throw ce;
  if(!client||client.estado==="suspendido")return answer({ok:false,error:"Cuenta no disponible."},403);
  const {data:service,error:se}=await sb.from("cliente_servicios").select("id,cliente_id,nombre,servicio_id,activo").eq("id",d.cliente_servicio_id).eq("cliente_id",client.id).maybeSingle();
  if(se)throw se;
  if(!service||service.activo===false)return answer({ok:false,error:"Servicio no disponible."},404);
  const name=String(service.nombre||"Servicio"),k=platform(name,service.servicio_id);
  const ratings=sb.from("goxion_calificaciones_plataforma");
  if(action==="consultar"){
   const {data,error}=await ratings.select("calificacion,comentario,actualizado_en").eq("cliente_id",client.id).eq("plataforma_clave",k).maybeSingle();
   if(error)throw error;return answer({ok:true,calificacion:data});
  }
  if(action==="calificar"){
   const n=Number(d.calificacion),comment=String(d.comentario||"").trim();
   if(!Number.isInteger(n)||n<1||n>5||comment.length>500)return answer({ok:false,error:"Revisa las estrellas y el comentario."},400);
   const {data,error}=await ratings.upsert({cliente_id:client.id,plataforma_clave:k,plataforma:name,calificacion:n,comentario:comment,actualizado_en:new Date().toISOString()},{onConflict:"cliente_id,plataforma_clave"}).select("calificacion,comentario,actualizado_en").single();
   if(error)throw error;return answer({ok:true,calificacion:data});
  }
  if(action==="reportar"){
   const id=String(d.id||""),reason=String(d.motivo||""),description=String(d.descripcion||"").trim(),day=String(d.afectacion_desde||"");
   const ms=Date.parse(day+"T00:00:00Z"),today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Mexico_City"});
   if(!uuid(id)||!["interrumpido","frecuente","sin_acceso","otro"].includes(reason)||description.length>500||!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==day||day>today)return answer({ok:false,error:"Revisa el motivo y la fecha de afectación."},400);
   const table=sb.from("goxion_reportes_trato_justo");
   const {error}=await table.insert({id,cliente_id:client.id,cliente_servicio_id:service.id,plataforma:name,motivo:reason,descripcion:description,afectacion_desde:day});
   if(error&&error.code!=="23505")throw error;
   const {data,error:re}=await table.select("id,plataforma,motivo,descripcion,afectacion_desde,creado_en,estado").eq("id",id).eq("cliente_id",client.id).eq("cliente_servicio_id",service.id).single();
   if(re)throw re;return answer({ok:true,reporte:data,folio:client.folio});
  }
  return answer({ok:false,error:"Operación no disponible."},400);
 }catch(e){console.error("experiencia-servicio",e);return answer({ok:false,error:"No pudimos completar tu solicitud. Intenta nuevamente."},500)}
});