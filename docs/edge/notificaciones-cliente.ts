import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};

function res(body:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store, private, max-age=0"}
  });
}
function b64b(t:string){
  const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");
  const x=atob(b);
  return Uint8Array.from(x,c=>c.charCodeAt(0));
}
function b64t(t:string){return new TextDecoder().decode(b64b(t))}
async function verify(token:string,secret:string){
  const p=String(token||"").trim().split(".");
  if(p.length!==2)return null;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return null;
  try{
    const j=JSON.parse(b64t(p[0]));
    return j.role==="goxion_client"&&j.cliente_id&&j.exp>Math.floor(Date.now()/1000)?j:null;
  }catch{return null}
}
function actionFor(tipo:string,source:string,referencia?:string|null,clienteServicioId?:string|null){
  const t=String(tipo||"").toLowerCase();
  const src=String(source||"general");
  if(src==="servicio"){
    return {accion:"service",accion_label:"Ver servicio",accion_ref:String(clienteServicioId||referencia||"")};
  }
  if(t.startsWith("pago_")||t==="beneficio_aplicado"){
    return {accion:"account",accion_label:"Ver estado de cuenta",accion_ref:String(referencia||"")};
  }
  if(t.startsWith("referido_")){
    return {accion:"referral",accion_label:"Ver referidos",accion_ref:String(referencia||"")};
  }
  if(t.startsWith("mision_")||t.startsWith("cupon_")){
    return {accion:"coupon",accion_label:"Ver recompensas",accion_ref:String(referencia||"")};
  }
  if(t.startsWith("pedido_")){
    return {accion:"services",accion_label:"Ver servicios",accion_ref:String(referencia||"")};
  }
  if(t==="cancelacion"){
    return {accion:"services",accion_label:"Ver solicitud",accion_ref:String(referencia||"")};
  }
  return {accion:"",accion_label:"",accion_ref:""};
}

async function exigirClienteActivo(sb:any,clienteId:string){
  const q=await sb.from("clientes").select("estado").eq("id",clienteId).maybeSingle();
  if(q.error)throw q.error;
  if(!q.data)return {ok:false,status:404,error:"Espacio no encontrado"};
  if(String(q.data.estado||"").toLowerCase()==="suspendido")return {ok:false,status:403,error:"Tu espacio se encuentra suspendido. Contacta a soporte para reactivarlo."};
  return {ok:true,status:200,error:""};
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);
  try{
    const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!u||!k)throw new Error("Configuración interna incompleta");
    const payload=await verify(req.headers.get("X-Client-Token")||"",k);
    if(!payload)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);

    const clienteId=String(payload.cliente_id);
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
    const acceso=await exigirClienteActivo(sb,clienteId);
    if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);

    const body=await req.json().catch(()=>({}));
    const accion=String(body?.accion||"listar");
    const d=body?.datos||{};

    if(accion==="listar"){
      const now=new Date().toISOString();
      const [general,servicio]=await Promise.all([
        sb.from("cliente_notificaciones")
          .select("id,tipo,titulo,mensaje,referencia,prioridad,leida_at,created_at")
          .eq("cliente_id",clienteId)
          .order("created_at",{ascending:false})
          .limit(50),
        sb.from("cliente_servicio_novedades")
          .select("id,cliente_servicio_id,tipo,titulo,resumen,referencia,prioridad,leida_at,expira_at,created_at")
          .eq("cliente_id",clienteId)
          .neq("tipo","password")
          .order("created_at",{ascending:false})
          .limit(50)
      ]);
      if(general.error)throw general.error;
      if(servicio.error)throw servicio.error;

      const a=(general.data||[]).map((x:any)=>({
        id:x.id,source:"general",tipo:x.tipo,titulo:x.titulo,mensaje:x.mensaje,
        referencia:x.referencia,prioridad:Number(x.prioridad||0),leida:x.leida_at!=null,
        leida_at:x.leida_at,created_at:x.created_at,
        ...actionFor(x.tipo,"general",x.referencia,null)
      }));
      const b=(servicio.data||[])
        .filter((x:any)=>!x.expira_at||String(x.expira_at)>now)
        .map((x:any)=>({
          id:x.id,source:"servicio",tipo:x.tipo,titulo:x.titulo,mensaje:x.resumen,
          referencia:x.referencia,cliente_servicio_id:x.cliente_servicio_id,
          prioridad:Number(x.prioridad||0),leida:x.leida_at!=null,
          leida_at:x.leida_at,created_at:x.created_at,
          ...actionFor(x.tipo,"servicio",x.referencia,x.cliente_servicio_id)
        }));

      const items=[...a,...b]
        .sort((x:any,y:any)=>Number(y.prioridad||0)-Number(x.prioridad||0)||new Date(y.created_at).getTime()-new Date(x.created_at).getTime())
        .slice(0,60);

      return res({ok:true,items,no_leidas:items.filter((x:any)=>x.leida!==true).length});
    }

    if(accion==="marcar_leida"){
      const id=String(d?.id||"").trim();
      const source=String(d?.source||"general");
      if(!id)return res({ok:false,error:"Falta id"},400);
      const now=new Date().toISOString();

      if(source==="servicio"){
        const q=await sb.from("cliente_servicio_novedades")
          .update({leida_at:now,updated_at:now})
          .eq("id",id).eq("cliente_id",clienteId).neq("tipo","password")
          .select("id");
        if(q.error)throw q.error;
        return res({ok:true,marcadas:(q.data||[]).length});
      }

      const q=await sb.from("cliente_notificaciones")
        .update({leida_at:now})
        .eq("id",id).eq("cliente_id",clienteId)
        .select("id");
      if(q.error)throw q.error;
      return res({ok:true,marcadas:(q.data||[]).length});
    }

    if(accion==="marcar_todas"){
      const now=new Date().toISOString();
      const [a,b]=await Promise.all([
        sb.from("cliente_notificaciones").update({leida_at:now}).eq("cliente_id",clienteId).is("leida_at",null).select("id"),
        sb.from("cliente_servicio_novedades").update({leida_at:now,updated_at:now}).eq("cliente_id",clienteId).is("leida_at",null).neq("tipo","password").select("id")
      ]);
      if(a.error)throw a.error;
      if(b.error)throw b.error;
      return res({ok:true,marcadas:(a.data||[]).length+(b.data||[]).length});
    }


    if(accion==="eliminar_una"){
      const id=String(d?.id||"").trim();
      const source=String(d?.source||"general");
      if(!id)return res({ok:false,error:"Falta id"},400);

      if(source==="servicio"){
        const q=await sb.from("cliente_servicio_novedades")
          .delete()
          .eq("id",id)
          .eq("cliente_id",clienteId)
          .neq("tipo","password")
          .select("id");
        if(q.error)throw q.error;
        return res({ok:true,eliminadas:(q.data||[]).length});
      }

      const q=await sb.from("cliente_notificaciones")
        .delete()
        .eq("id",id)
        .eq("cliente_id",clienteId)
        .select("id");
      if(q.error)throw q.error;
      return res({ok:true,eliminadas:(q.data||[]).length});
    }

    if(accion==="eliminar_todas"){
      const [general,servicio]=await Promise.all([
        sb.from("cliente_notificaciones")
          .delete()
          .eq("cliente_id",clienteId)
          .select("id"),
        sb.from("cliente_servicio_novedades")
          .delete()
          .eq("cliente_id",clienteId)
          .neq("tipo","password")
          .select("id")
      ]);
      if(general.error)throw general.error;
      if(servicio.error)throw servicio.error;
      return res({ok:true,eliminadas:(general.data||[]).length+(servicio.data||[]).length});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(error){
    console.error(error);
    return res({ok:false,error:error instanceof Error?error.message:"No fue posible cargar notificaciones"},500);
  }
});