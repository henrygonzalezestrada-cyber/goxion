import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import bcrypt from "npm:bcryptjs@2.4.3";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store, private, max-age=0","Pragma":"no-cache","Expires":"0"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
function b64t(t:string){return new TextDecoder().decode(b64b(t))}
async function verify(token:string,secret:string){const p=token.trim().split(".");if(p.length!==2)return null;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return null;try{const j=JSON.parse(b64t(p[0]));return j.role==="goxion_client"&&j.cliente_id&&j.exp>Math.floor(Date.now()/1000)?j:null}catch{return null}}

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
    const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!u||!k)throw new Error("Configuración interna incompleta");
    const token=req.headers.get("X-Client-Token")||"";const p=await verify(token,k);if(!p)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});const body=await req.json().catch(()=>({}));const accion=String(body?.accion||"listar");const d=body?.datos||{};const clienteId=String(p.cliente_id);const acceso=await exigirClienteActivo(sb,clienteId);if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);
    if(clienteId==="091e79b7-c60b-4d50-bb98-a047bfc0dbb4"){
      const g=await sb.rpc("goxion_legal_piloto_estado",{p_cliente_id:clienteId});
      if(g.error)throw g.error;
      if(g.data?.restringido===true)return res({ok:false,codigo:"ACCESO_RESTRINGIDO",
        error:"Tu periodo contratado finalizó. Revisa los términos 2.0 para recuperar tu espacio."},403);
    }


    if(accion==="listar"){
      const q=await sb.from("credenciales_entregas").select("id,credencial_id,cliente_servicio_id,estado,disponible_desde,expira_at,vista_at,created_at,credenciales_plataforma(plataforma,cuenta_login,version,activa),cliente_servicios(nombre,activo)").eq("cliente_id",clienteId).order("created_at",{ascending:false});
      if(q.error)throw q.error;
      const now=Date.now();
      const items=(q.data||[]).map((x:any)=>{
        const expired=x.expira_at&&new Date(x.expira_at).getTime()<now;
        return {
          id:x.id,
          credencial_id:x.credencial_id,
          cliente_servicio_id:x.cliente_servicio_id,
          estado:expired&&x.estado==="pendiente"?"expirada":x.estado,
          disponible_desde:x.disponible_desde,
          expira_at:x.expira_at,
          vista_at:x.vista_at,
          created_at:x.created_at,
          plataforma:x.credenciales_plataforma?.plataforma||x.cliente_servicios?.nombre||"Servicio",
          servicio_nombre:x.cliente_servicios?.nombre||x.credenciales_plataforma?.plataforma||"Servicio",
          cuenta_login:x.credenciales_plataforma?.cuenta_login||"",
          version:x.credenciales_plataforma?.version||1,
          activa:x.credenciales_plataforma?.activa===true,
          servicio_activo:x.cliente_servicios?.activo===true
        };
      });
      return res({ok:true,entregas:items});
    }

    if(accion==="revelar"){
      const entregaId=String(d.entrega_id||""),pin=String(d.pin||"").trim();
      if(!entregaId||!/^\d{4}$/.test(pin))return res({ok:false,error:"Entrega o PIN inválido"},400);
      const cq=await sb.from("clientes").select("id,codigo_hash").eq("id",clienteId).single();if(cq.error)throw cq.error;
      if(!cq.data.codigo_hash||!bcrypt.compareSync(pin,String(cq.data.codigo_hash)))return res({ok:false,error:"PIN incorrecto"},401);

      const q=await sb.from("credenciales_entregas").select("id,credencial_id,cliente_id,cliente_servicio_id,estado,expira_at,credenciales_plataforma(vault_secret_id,plataforma,cuenta_login,version,activa),cliente_servicios(nombre,activo)").eq("id",entregaId).eq("cliente_id",clienteId).single();
      if(q.error)throw q.error;const row:any=q.data;
      if(row.estado!=="pendiente")return res({ok:false,error:"Esta contraseña ya no está disponible"},409);
      if(row.expira_at&&new Date(row.expira_at).getTime()<Date.now()){
        await sb.from("credenciales_entregas").update({estado:"expirada",updated_at:new Date().toISOString()}).eq("id",entregaId).eq("estado","pendiente");
        return res({ok:false,error:"Esta contraseña ya expiró"},410);
      }
      if(row.credenciales_plataforma?.activa!==true||row.cliente_servicios?.activo!==true)return res({ok:false,error:"Esta contraseña fue revocada"},410);

      const secret=await sb.rpc("goxion_vault_read_secret",{p_id:row.credenciales_plataforma.vault_secret_id});if(secret.error)throw secret.error;const password=String(secret.data||"");if(!password)throw new Error("La contraseña ya no está disponible");
      const now=new Date().toISOString();
      const up=await sb.from("credenciales_entregas").update({estado:"vista",vista_at:now,updated_at:now}).eq("id",entregaId).eq("estado","pendiente").select("id");
      if(up.error)throw up.error;if(!(up.data||[]).length)return res({ok:false,error:"Esta contraseña ya fue consultada"},409);
      return res({ok:true,cliente_servicio_id:row.cliente_servicio_id,plataforma:row.credenciales_plataforma.plataforma,cuenta_login:row.credenciales_plataforma.cuenta_login,version:row.credenciales_plataforma.version,password,vista_at:now,one_time:true});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible gestionar la contraseña"},500)}
});