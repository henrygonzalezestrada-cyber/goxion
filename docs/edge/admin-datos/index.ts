import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
function responder(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
async function auth(req:Request){const token=(req.headers.get("X-Admin-Token")||"").trim(),p=token.split(".");if(p.length!==2)return false;const s=Deno.env.get("ADMIN_SESSION_SECRET");if(!s)throw new Error("ADMIN_SESSION_SECRET no configurado");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["verify"]);if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return false;try{const j=JSON.parse(new TextDecoder().decode(b64b(p[0])));return j.role==="goxion_admin"&&j.exp>Math.floor(Date.now()/1000)}catch{return false}}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});if(req.method!=="POST")return responder({ok:false,error:"Método no permitido"},405);try{if(!(await auth(req)))return responder({ok:false,error:"Sesión administrativa inválida o expirada"},401);const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!u||!k)throw new Error("Configuración incompleta");const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
const [c,s,cs,p,r,d,g,a,cfg,n,pa]=await Promise.all([
sb.from("clientes").select("id,clave,folio,nombre,dia_pago,estado,pago_en_revision,pago_revision_estado,pago_revision_mensaje,pago_revision_monto_faltante,pago_revision_updated_at,pagos_puntuales,created_at,updated_at").order("nombre"),
sb.from("servicios").select("id,nombre,precio,costo,cuentas,limite,etiqueta,beneficios,categoria_catalogo,activo,stock_manual,created_at,updated_at").order("nombre"),
sb.from("cliente_servicios").select("id,cliente_id,servicio_id,nombre,monto,correo_login,perfil_nombre,perfil_pin,activo,created_at,updated_at"),
sb.from("pagos").select("id,cliente_id,fecha,periodo,monto,estado,notas,created_at").order("fecha",{ascending:false}),
sb.from("referidos").select("id,cliente_id,nombre,plataformas,meses,servicios,fecha_inicio,progreso_pausado,meses_override,activo,beneficio_reclamado,beneficio_reclamado_at,created_at"),
sb.from("descuentos_especiales").select("id,cliente_id,descripcion,monto,activo,created_at"),
sb.from("gamificacion").select("id,cliente_id,misiones_activas,descuento,tareas,cupon_reclamado,cupon_reclamado_at,misiones_version,cupon_ciclo,cupon_reclamado_ciclo,created_at,updated_at"),
sb.from("alertas").select("id,activa,plataforma,falla,mensaje,created_at,updated_at"),
sb.from("configuracion").select("id,combo_upsell").maybeSingle(),
sb.from("notificaciones_admin").select("id,cliente_id,cliente_nombre,tipo,titulo,mensaje,referencia,leida,created_at").order("created_at",{ascending:false}).limit(80),
sb.from("promociones_catalogo")
  .select("id,nombre,titulo_publico,badge,mecanica,precio_promocional,descuento_porcentaje,duracion_periodos,duracion_tipo,inicio,fin,publicada,adquisicion_habilitada,activa,audiencia,prioridad")
  .eq("publicada",true)
  .eq("adquisicion_habilitada",true)
  .eq("activa",true)
  .lte("inicio",new Date().toISOString())
  .gt("fin",new Date().toISOString())
  .order("prioridad",{ascending:false})
]);
const arr=[c,s,cs,p,r,d,g,a,cfg,n,pa];const bad=arr.find(x=>x.error);if(bad?.error)throw bad.error;
// No recalcular pagos ni sumarlos a nivel de Admin. La lista oficial usa
// la MISMA RPC que Index/Ayuda a través de estado-financiero.
// Si está activada la integración, la falta de RPC detiene la lectura:
// nunca regresar silenciosamente al total global heredado.
const hybridEnabled=Deno.env.get("GOXION_HIBRIDO_LECTURA")==="1";
let official:any=null;
if(hybridEnabled){
  const q=await sb.rpc("goxion_hibrido_admin_estados_v1");
  if(q.error||q.data?.ok!==true||!Array.isArray(q.data?.estados))
    return responder({ok:false,codigo:"HÍBRIDO_ADMIN_NO_CONCILIADO",
      error:"El estado financiero único no está disponible"},503);
  official=q.data;
}
return responder({ok:true,clientes:c.data??[],catalogo:s.data??[],cliente_servicios:cs.data??[],pagos:p.data??[],referidos:r.data??[],descuentos:d.data??[],gamificacion:g.data??[],alertas:a.data??[],configuracion:cfg.data??null,notificaciones:n.data??[],promociones_activas:pa.data??[],
...(hybridEnabled?{
  estados_financieros:official.estados,
  estado_financiero_fuente:official.fuente,
  estado_financiero_conciliados:official.conciliados,
  estado_financiero_pendientes_revision:official.pendientes_revision
}:{})
});}catch(e){console.error(e);return responder({ok:false,error:"No fue posible cargar los datos administrativos"},500)}});