import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store, private, max-age=0","Pragma":"no-cache"}
  });
}
function b64b(t:string){
  const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");
  const x=atob(b);
  return Uint8Array.from(x,c=>c.charCodeAt(0));
}
function b64t(t:string){return new TextDecoder().decode(b64b(t));}
async function verify(token:string,secret:string){
  const p=String(token||"").trim().split(".");
  if(p.length!==2)return null;
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return null;
  try{
    const j=JSON.parse(b64t(p[0]));
    return j?.role==="goxion_client"&&j?.cliente_id&&j?.exp>Math.floor(Date.now()/1000)?j:null;
  }catch{return null;}
}
const clean=(v:unknown)=>String(v??"").trim();

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
    const url=Deno.env.get("SUPABASE_URL"),serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!url||!serviceKey)throw new Error("Configuración interna incompleta");
    const payload=await verify(req.headers.get("X-Client-Token")||"",serviceKey);
    if(!payload?.cliente_id)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);

    const sb=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const acceso=await exigirClienteActivo(sb,String(payload.cliente_id));if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);
    if(String(payload.cliente_id)==="091e79b7-c60b-4d50-bb98-a047bfc0dbb4"){
      const g=await sb.rpc("goxion_legal_piloto_estado",{p_cliente_id:String(payload.cliente_id)});
      if(g.error)throw g.error;
      if(g.data?.restringido===true)return res({ok:false,codigo:"ACCESO_RESTRINGIDO",
        error:"Tu periodo contratado finalizó. Revisa los términos 2.0 para continuar."},403);
    }

    const q=await sb.from("cliente_accesos")
      .select("id,cliente_servicio_id,servicio_id,ordinal,cuenta_id,modo_config,correo_override,perfil_nombre,perfil_pin,estado_invitacion,activo,servicios(nombre,modo_acceso),servicio_cuentas(alias,correo_login)")
      .eq("cliente_id",String(payload.cliente_id))
      .eq("activo",true)
      .order("cliente_servicio_id")
      .order("servicio_id")
      .order("ordinal");
    if(q.error)throw q.error;

    const accesos=(q.data||[]).map((x:any)=>{
      const modo=clean(x.servicios?.modo_acceso)||"compartido";
      const override=clean(x.correo_override);
      const cuentaCorreo=clean(x.servicio_cuentas?.correo_login);
      const correoEfectivo=modo==="invitacion"
        ? override
        : (clean(x.modo_config)==="personalizado"&&override ? override : (cuentaCorreo||override));
      return {
        id:x.id,
        cliente_servicio_id:x.cliente_servicio_id,
        servicio_id:x.servicio_id,
        servicio:clean(x.servicios?.nombre)||"Servicio",
        modo_acceso:modo,
        ordinal:Number(x.ordinal||1),
        cuenta_id:x.cuenta_id||null,
        cuenta_alias:clean(x.servicio_cuentas?.alias),
        correo:correoEfectivo,
        perfil_nombre:clean(x.perfil_nombre),
        perfil_pin:modo==="invitacion"?"":clean(x.perfil_pin),
        estado_invitacion:modo==="invitacion"?(clean(x.estado_invitacion)||"sin_verificar"):"",
        configurado:modo==="invitacion"?Boolean(override):Boolean(correoEfectivo||x.perfil_nombre||x.perfil_pin)
      };
    });

    return res({ok:true,accesos,fuente:"supabase:cliente_accesos"});
  }catch(e){
    console.error(e);
    return res({ok:false,error:e instanceof Error?e.message:"No fue posible cargar los accesos"},500);
  }
});