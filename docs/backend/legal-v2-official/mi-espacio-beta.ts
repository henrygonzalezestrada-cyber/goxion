import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-client-token",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function respuesta(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
function base64UrlToBytes(text:string){const base64=text.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"=");const binary=atob(base64);return Uint8Array.from(binary,c=>c.charCodeAt(0))}
function base64UrlToText(text:string){return new TextDecoder().decode(base64UrlToBytes(text))}
async function validarToken(token:string,secreto:string){const partes=token.trim().split(".");if(partes.length!==2)return null;const[p,f]=partes;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secreto),{name:"HMAC",hash:"SHA-256"},false,["verify"]);const ok=await crypto.subtle.verify("HMAC",key,base64UrlToBytes(f),new TextEncoder().encode(p));if(!ok)return null;try{const payload=JSON.parse(base64UrlToText(p));const ahora=Math.floor(Date.now()/1000);if(payload.role!=="goxion_client"||!payload.cliente_id||!payload.exp||payload.exp<=ahora)return null;return payload}catch{return null}}
const clamp3=(v:unknown)=>Math.max(0,Math.min(3,Math.trunc(Number.isFinite(Number(v))?Number(v):0)));
function mesesAuto(fecha:string|null|undefined){if(!fecha)return 0;const ini=new Date(`${fecha}T12:00:00`);if(Number.isNaN(ini.getTime()))return 0;const hoy=new Date();let m=(hoy.getFullYear()-ini.getFullYear())*12+(hoy.getMonth()-ini.getMonth());if(hoy.getDate()<ini.getDate())m--;return clamp3(m)}
function adaptarReferido(r:any){const servicios=Array.isArray(r?.servicios)?r.servicios:[];const manual=r?.meses_override!==null&&r?.meses_override!==undefined;const efectivo=manual?clamp3(r.meses_override):mesesAuto(r?.fecha_inicio);return {...r,servicios,plataformas:servicios.length||Number(r?.plataformas||0),meses_efectivos:efectivo,meses_modo:manual?"manual":"automatico",progreso_pausado:servicios.length<2}}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  if(req.method!=="POST")return respuesta({ok:false,error:"Método no permitido"},405);
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!supabaseUrl||!serviceRoleKey)throw new Error("Configuración interna incompleta");
    const supabase=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));const modo=String(body?.modo??"");

    if(modo==="publico"){
      const[catalogoRes,alertasRes,configuracionRes]=await Promise.all([
        supabase.from("servicios").select("id,nombre,precio,costo,cuentas,limite,stock_manual,etiqueta,beneficios,activo").eq("activo",true).order("nombre"),
        supabase.from("alertas").select("id,activa,plataforma,falla,mensaje").limit(1).maybeSingle(),
        supabase.from("configuracion").select("id,combo_upsell").limit(1).maybeSingle()
      ]);
      const err=catalogoRes.error||alertasRes.error||configuracionRes.error;if(err)throw err;
      return respuesta({ok:true,catalogo:catalogoRes.data??[],alertas:alertasRes.data??null,configuracion:configuracionRes.data??null});
    }

    const token=req.headers.get("X-Client-Token")||"";const payload=await validarToken(token,serviceRoleKey);
    if(!payload)return respuesta({ok:false,error:"Sesión de cliente inválida o expirada"},401);
    const clienteId=payload.cliente_id;
    // Ruta histórica: aplicar el MISMO estado de restricciones que Mi Espacio oficial.
    if(clienteId){
      const g=await supabase.rpc("goxion_legal_estado_acceso",{p_cliente_id:String(clienteId)});
      if(g.error)throw g.error;
      if(g.data?.bloquea_operaciones===true&&modo){
        return respuesta({ok:false,codigo:"TERMINOS_RECHAZADOS",
          error:"No puedes realizar operaciones comerciales después de rechazar los términos."},409);
      }
      if(g.data?.restringido===true){
        const [c,h]=await Promise.all([
          supabase.from("clientes").select("id,clave,nombre,folio,estado").eq("id",clienteId).single(),
          supabase.from("pagos").select("id,fecha,periodo,monto,estado,notas")
            .eq("cliente_id",clienteId).order("fecha",{ascending:false}).limit(80)
        ]);
        if(c.error||h.error)throw c.error||h.error;
        return respuesta({ok:true,acceso_restringido:true,cliente:c.data,pagos:h.data||[],
          servicios:[],catalogo:[],referidos:[],gamificacion:null,descuentos:[],alertas:null,configuracion:null});
      }
    }

    if(modo==="marcar_pago_revision"){
      const {data:c,error:cErr}=await supabase.from("clientes").select("id,nombre,folio").eq("id",clienteId).single();if(cErr)throw cErr;
      const {error}=await supabase.from("clientes").update({pago_en_revision:true,pago_revision_estado:"revision",pago_revision_mensaje:null,pago_revision_monto_faltante:0,pago_revision_updated_at:new Date().toISOString()}).eq("id",clienteId);if(error)throw error;
      await supabase.from("notificaciones_admin").insert({cliente_id:c.id,cliente_nombre:c.nombre,tipo:"pago_revision",titulo:"💳 Comprobante recibido",mensaje:`${c.nombre} envió un comprobante y requiere revisión.`,referencia:c.folio,leida:false});
      return respuesta({ok:true,pago_en_revision:true});
    }

    if(modo==="reclamar_cupon"){
      const {data:gamif,error:gamifError}=await supabase.from("gamificacion").select("id,misiones_activas,descuento,tareas,cupon_reclamado,cupon_reclamado_at,cupon_ciclo,cupon_reclamado_ciclo").eq("cliente_id",clienteId).maybeSingle();
      if(gamifError)throw gamifError;if(String(gamif?.tareas||"").split("\n").some(line=>/\[PUSH_PILOTO_[^\]]+\]\s*$/i.test(line)))return respuesta({ok:false,error:"El canje de esta misión piloto estará disponible después de validar su funcionamiento."},409);if(!gamif||gamif.misiones_activas!==true)return respuesta({ok:false,error:"No tienes un cupón activo para reclamar."},400);
      const ciclo=Math.max(1,Number(gamif.cupon_ciclo||1)),reclamadoCiclo=Math.max(0,Number(gamif.cupon_reclamado_ciclo||0));
      if(reclamadoCiclo>=ciclo)return respuesta({ok:true,ya_reclamado:true,cupon_reclamado:true,descuento:Number(gamif.descuento||0),ciclo,reclamado_at:gamif.cupon_reclamado_at});
      const ahora=new Date().toISOString();const {error}=await supabase.from("gamificacion").update({cupon_reclamado:true,cupon_reclamado_at:ahora,cupon_reclamado_ciclo:ciclo}).eq("id",gamif.id);if(error)throw error;
      return respuesta({ok:true,cupon_reclamado:true,descuento:Number(gamif.descuento||0),ciclo,reclamado_at:ahora});
    }

    if(modo==="reclamar_mes_referido"){
      const {data:raw,error:refError}=await supabase.from("referidos").select("id,nombre,plataformas,meses,servicios,fecha_inicio,progreso_pausado,meses_override,activo,beneficio_reclamado,beneficio_reclamado_at").eq("cliente_id",clienteId).eq("activo",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(refError)throw refError;if(!raw)return respuesta({ok:false,error:"No tienes un referido activo."},400);
      const referido=adaptarReferido(raw);if(Number(referido.plataformas||0)<2||Number(referido.meses_efectivos||0)<3)return respuesta({ok:false,error:"Tu referido todavía no cumple los requisitos para el mes gratis."},400);
      if(referido.beneficio_reclamado===true)return respuesta({ok:true,ya_reclamado:true,beneficio_reclamado:true,referido:referido.nombre,reclamado_at:referido.beneficio_reclamado_at});
      const ahora=new Date().toISOString();const {error}=await supabase.from("referidos").update({beneficio_reclamado:true,beneficio_reclamado_at:ahora}).eq("id",referido.id).eq("beneficio_reclamado",false);if(error)throw error;
      return respuesta({ok:true,beneficio_reclamado:true,referido:referido.nombre,reclamado_at:ahora});
    }

    const[clienteRes,serviciosRes,pagosRes,gamifRes,referidosRes,descuentosRes,catalogoRes,alertasRes,configuracionRes]=await Promise.all([
      supabase.from("clientes").select("id,clave,folio,nombre,usuario_acceso,dia_pago,estado,pago_en_revision,pago_revision_estado,pago_revision_mensaje,pago_revision_monto_faltante,pago_revision_updated_at,pagos_puntuales,descuento_fallas").eq("id",clienteId).single(),
      supabase.from("cliente_servicios").select("id,nombre,monto,correo_login,perfil_nombre,perfil_pin,activo").eq("cliente_id",clienteId).eq("activo",true).order("created_at",{ascending:true}),
      supabase.from("pagos").select("id,fecha,periodo,monto,estado,notas").eq("cliente_id",clienteId).order("fecha",{ascending:false}),
      supabase.from("gamificacion").select("misiones_activas,descuento,tareas,cupon_reclamado,cupon_reclamado_at,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").eq("cliente_id",clienteId).maybeSingle(),
      supabase.from("referidos").select("id,nombre,plataformas,meses,servicios,fecha_inicio,progreso_pausado,meses_override,activo,beneficio_reclamado,beneficio_reclamado_at").eq("cliente_id",clienteId).eq("activo",true).order("created_at",{ascending:false}),
      supabase.from("descuentos_especiales").select("id,descripcion,monto,activo").eq("cliente_id",clienteId).eq("activo",true),
      supabase.from("servicios").select("id,nombre,precio,costo,cuentas,limite,stock_manual,etiqueta,beneficios,activo").eq("activo",true).order("nombre"),
      supabase.from("alertas").select("id,activa,plataforma,falla,mensaje").limit(1).maybeSingle(),
      supabase.from("configuracion").select("id,combo_upsell").limit(1).maybeSingle()
    ]);
    const err=clienteRes.error||serviciosRes.error||pagosRes.error||gamifRes.error||referidosRes.error||descuentosRes.error||catalogoRes.error||alertasRes.error||configuracionRes.error;if(err)throw err;
    const refs=(referidosRes.data??[]).map(adaptarReferido);
    return respuesta({ok:true,cliente:clienteRes.data,servicios:serviciosRes.data??[],pagos:pagosRes.data??[],gamificacion:gamifRes.data??null,referidos:refs,descuentos:descuentosRes.data??[],catalogo:catalogoRes.data??[],alertas:alertasRes.data??null,configuracion:configuracionRes.data??null});
  }catch(error){console.error(error);return respuesta({ok:false,error:"No fue posible cargar Mi Espacio Beta."},500)}
});