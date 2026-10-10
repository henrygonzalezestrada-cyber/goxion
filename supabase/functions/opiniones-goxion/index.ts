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
function alias(nombre:unknown){
  const parts=normalized(nombre).split(" ").filter(Boolean);
  const first=(parts[0]||"Cliente").slice(0,36).replace(/[^\p{L}\p{M}'-]/gu,"")||"Cliente";
  const initial=(parts.length>1?parts[parts.length-1][0]:"").replace(/[^\p{L}]/gu,"");
  return (first+(initial?" "+initial.toUpperCase()+".":" GOXION")).slice(0,90);
}
const shape=(r:any)=>({
  id:r.id,rating:Number(r.calificacion),text:r.comentario,author:r.autor_publico,
  consent:Boolean(r.consentimiento_publicacion),verified:Boolean(r.cliente_verificado),
  status:({pendiente:"pending",publicada:"published",privada:"private",oculta:"hidden"} as Record<string,string>)[r.estado]||"pending",
  date:r.creado_en,reply:r.respuesta_admin||"",reviewedAt:r.revisado_en||null
});
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return answer({ok:false,error:"Método no permitido."},405);
  try{
    const body=await req.json().catch(()=>({}));
    const modo=String(body?.modo||"");
    const url=Deno.env.get("SUPABASE_URL")||"";
    const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!url||!serviceKey)throw new Error("Configuración interna incompleta");
    const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const table=()=>sb.from("opiniones_clientes");
    if(modo==="publicas"){
      const {data,error}=await table().select("id,calificacion,comentario,autor_publico,consentimiento_publicacion,cliente_verificado,estado,creado_en,respuesta_admin,revisado_en")
        .eq("estado","publicada").eq("consentimiento_publicacion",true)
        .eq("cliente_verificado",true).order("creado_en",{ascending:false}).limit(30);
      if(error)throw error;
      return answer({ok:true,opiniones:(data||[]).map(shape)});
    }
    if(modo==="enviar"){
      const session=await signed(req.headers.get("X-Client-Token")||"",serviceKey,"goxion_client");
      if(!session)return answer({ok:false,error:"Inicia sesión en Mi Espacio para compartir tu opinión."},401);
      const rating=Number(body?.rating);
      const comment=normalized(body?.text);
      if(!Number.isInteger(rating)||rating<1||rating>5)return answer({ok:false,error:"Selecciona de 1 a 5 estrellas."},400);
      if(comment.length<12||comment.length>500)return answer({ok:false,error:"Escribe entre 12 y 500 caracteres."},400);
      const consent=body?.consent===true;
      const {data:client,error:clientErr}=await sb.from("clientes").select("id,nombre,estado")
        .eq("id",session.cliente_id).maybeSingle();
      if(clientErr)throw clientErr;
      if(!client||client.estado==="suspendido")return answer({ok:false,error:"Tu cuenta no está disponible para esta acción."},403);
      const since=new Date(Date.now()-24*3600*1000).toISOString();
      const {data:previous,error:checkErr}=await table().select("id")
        .eq("cliente_id",client.id).gte("creado_en",since).limit(1);
      if(checkErr)throw checkErr;
      if(previous?.length)return answer({ok:false,error:"Ya recibimos tu opinión recientemente. Podrás compartir otra en 24 horas."},429);
      const {data,error}=await table().insert({
        cliente_id:client.id,calificacion:rating,comentario:comment,
        consentimiento_publicacion:consent,cliente_verificado:true,
        autor_publico:alias(client.nombre),estado:consent?"pendiente":"privada"
      }).select("id,calificacion,comentario,autor_publico,consentimiento_publicacion,cliente_verificado,estado,creado_en,respuesta_admin,revisado_en").single();
      if(error)throw error;
      return answer({ok:true,opinion:shape(data)});
    }
    if(modo==="admin_listar"||modo==="admin_accion"){
      const secret=Deno.env.get("ADMIN_SESSION_SECRET")||"";
      const admin=await signed(req.headers.get("X-Admin-Token")||"",secret,"goxion_admin");
      if(!admin)return answer({ok:false,error:"Sesión administrativa inválida o expirada."},401);
      if(modo==="admin_listar"){
        const {data,error}=await table().select("id,calificacion,comentario,autor_publico,consentimiento_publicacion,cliente_verificado,estado,creado_en,respuesta_admin,revisado_en")
          .order("creado_en",{ascending:false}).limit(300);
        if(error)throw error;
        return answer({ok:true,opiniones:(data||[]).map(shape)});
      }
      const id=String(body?.id||"");
      if(!/^[0-9a-f-]{36}$/i.test(id))return answer({ok:false,error:"Opinión inválida."},400);
      const action=String(body?.accion||"");
      const {data:review,error:getErr}=await table().select("id,consentimiento_publicacion,cliente_verificado,estado")
        .eq("id",id).maybeSingle();
      if(getErr)throw getErr;
      if(!review)return answer({ok:false,error:"Opinión no disponible."},404);
      let patch:Record<string,unknown>={revisado_en:new Date().toISOString()};
      if(action==="publicar"){
        if(!review.consentimiento_publicacion||!review.cliente_verificado)
          return answer({ok:false,error:"No puede publicarse sin consentimiento y verificación."},403);
        patch.estado="publicada";
      }else if(action==="ocultar"){
        patch.estado="oculta";
      }else if(action==="responder"){
        const reply=normalized(body?.respuesta);
        if(reply.length<2||reply.length>200)return answer({ok:false,error:"La respuesta debe contener entre 2 y 200 caracteres."},400);
        patch.respuesta_admin=reply;
      }else return answer({ok:false,error:"Acción no permitida."},400);
      const {data,error}=await table().update(patch).eq("id",id)
        .select("id,calificacion,comentario,autor_publico,consentimiento_publicacion,cliente_verificado,estado,creado_en,respuesta_admin,revisado_en").single();
      if(error)throw error;
      return answer({ok:true,opinion:shape(data)});
    }
    return answer({ok:false,error:"Operación no disponible."},400);
  }catch(e){
    console.error("opiniones-goxion",e);
    return answer({ok:false,error:"No fue posible completar esta solicitud."},500);
  }
});
