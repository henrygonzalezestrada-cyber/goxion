import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
function responder(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})}
function base64UrlToBytes(text:string){const base64=text.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(text.length/4)*4,"=");const binary=atob(base64);return Uint8Array.from(binary,c=>c.charCodeAt(0))}
function base64UrlToText(text:string){return new TextDecoder().decode(base64UrlToBytes(text))}
async function verificarFirma(p:string,f:string,s:string){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["verify"]);return await crypto.subtle.verify("HMAC",key,base64UrlToBytes(f),new TextEncoder().encode(p))}
async function validarToken(req:Request){const token=(req.headers.get("X-Admin-Token")||"").trim();if(!token)return false;const partes=token.split(".");if(partes.length!==2)return false;const secreto=Deno.env.get("ADMIN_SESSION_SECRET");if(!secreto)throw new Error("ADMIN_SESSION_SECRET no configurado");const[p,f]=partes;if(!(await verificarFirma(p,f,secreto)))return false;try{const payload=JSON.parse(base64UrlToText(p));const ahora=Math.floor(Date.now()/1000);return payload.role==="goxion_admin"&&payload.exp&&payload.exp>ahora}catch{return false}}
function numeroONull(v:unknown){if(v===null||v===undefined||String(v).trim()==="")return null;const n=Number(v);return Number.isFinite(n)?Math.max(0,Math.trunc(n)):null}
function numeroSeguro(v:unknown,d:number){const n=Number(v);return Number.isFinite(n)?n:d}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return responder({ok:false,error:"Método no permitido"},405);
 try{
  if(!(await validarToken(req)))return responder({ok:false,error:"Sesión administrativa inválida o expirada"},401);
  const supabaseUrl=Deno.env.get("SUPABASE_URL"),serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!supabaseUrl||!serviceRoleKey)throw new Error("Configuración interna incompleta");
  const supabase=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});const body=await req.json();const accion=String(body?.accion??"").trim();const datos=body?.datos&&typeof body.datos==="object"?body.datos:{};

  if(["guardar_referido","reiniciar_misiones_cliente","nueva_ronda_cupon"].includes(accion)&&String(datos?.cliente_id||"").length>0){
    const g=await supabase.rpc("goxion_legal_estado_acceso",{p_cliente_id:String(datos.cliente_id)});
    if(g.error)throw g.error;
    if(g.data?.bloquea_operaciones===true)
      return responder({ok:false,codigo:"TERMINOS_RECHAZADOS",
        error:"Beneficios nuevos no disponibles hasta aceptar los términos vigentes."},409);
  }


  if(accion==="obtener_stock_manual"){const{data,error}=await supabase.from("servicios").select("id,stock_manual").order("nombre");if(error)throw error;return responder({ok:true,stock:data??[]})}
  if(accion==="guardar_stock_manual"){const id=String(datos.id??"").trim();if(!id)return responder({ok:false,error:"Falta el ID del servicio"},400);const stockManual=numeroONull(datos.stock_manual);const{data,error}=await supabase.from("servicios").update({stock_manual:stockManual}).eq("id",id).select("id,stock_manual").single();if(error)throw error;return responder({ok:true,servicio:data})}
  if(accion==="guardar_referido"){
   const clienteId=String(datos.cliente_id??"").trim();if(!clienteId)return responder({ok:false,error:"Falta cliente_id"},400);const{data:existentes,error:buscarError}=await supabase.from("referidos").select("id,nombre,plataformas,meses,activo,created_at").eq("cliente_id",clienteId).order("created_at",{ascending:false}).limit(1);if(buscarError)throw buscarError;
   const existente=existentes?.[0]??null,nombreEntrante=String(datos.nombre??"").trim();const payload={cliente_id:clienteId,nombre:nombreEntrante||existente?.nombre||"",plataformas:numeroSeguro(datos.plataformas,Number(existente?.plataformas??1)),meses:numeroSeguro(datos.meses,Number(existente?.meses??1)),activo:datos.activo===undefined?true:Boolean(datos.activo)};
   let resultado;if(existente?.id)resultado=await supabase.from("referidos").update(payload).eq("id",existente.id).select().single();else resultado=await supabase.from("referidos").insert(payload).select().single();if(resultado.error)throw resultado.error;return responder({ok:true,referido:resultado.data});
  }
  // K4a: only the existing pilot account may start this real visual round. No financial reward is issued here.
  if(accion==="activar_mision_push_piloto"){
   const clienteId=String(datos.cliente_id??"").trim();
   if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clienteId))return responder({ok:false,error:"Cliente no válido"},400);
   const {data:cliente,error:clienteError}=await supabase.from("clientes").select("id,clave").eq("id",clienteId).eq("clave","casone").maybeSingle();
   if(clienteError)throw clienteError;
   if(!cliente)return responder({ok:false,error:"Disponible exclusivamente para Casone."},403);
   const legal=await supabase.rpc("goxion_legal_estado_acceso",{p_cliente_id:clienteId});if(legal.error)throw legal.error;
   if(legal.data?.bloquea_operaciones===true||legal.data?.restringido===true)return responder({ok:false,error:"Acepta los términos vigentes antes de activar beneficios."},409);
   const gate=await supabase.rpc("goxion_push_eligible",{p_cliente_id:clienteId});if(gate.error)throw gate.error;
   if(gate.data!==true)return responder({ok:false,error:"El piloto de avisos no está habilitado."},409);
   const tareas="Conoce tus avisos [PUSH_PILOTO_GUIA]\nActiva los avisos en tu teléfono [PUSH_PILOTO_ACTIVAR]\nComparte tu experiencia [PUSH_PILOTO_FEEDBACK]";
   const {data:g,error:buscarError}=await supabase.from("gamificacion").select("id,misiones_activas,descuento,tareas,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").eq("cliente_id",clienteId).maybeSingle();
   if(buscarError)throw buscarError;
   if(!g)return responder({ok:false,error:"No hay una ronda anterior para preservar."},409);
   if(g.tareas===tareas&&g.misiones_activas===true&&Number(g.descuento)===20)return responder({ok:true,ya_activa:true,misiones_version:g.misiones_version,cupon_ciclo:g.cupon_ciclo});
   if(Number(g.cupon_reclamado_ciclo)<Number(g.cupon_ciclo))return responder({ok:false,error:"Hay una ronda anterior pendiente. No se reemplazará."},409);
   const version=Number(g.misiones_version)+1,ciclo=Number(g.cupon_ciclo)+1;
   let changes=supabase.from("gamificacion").update({misiones_activas:true,descuento:20,tareas,misiones_version:version,cupon_ciclo:ciclo,cupon_reclamado:false,cupon_reclamado_at:null})
     .eq("id",g.id).eq("cliente_id",clienteId).eq("misiones_version",g.misiones_version).eq("cupon_ciclo",g.cupon_ciclo).eq("cupon_reclamado_ciclo",g.cupon_reclamado_ciclo).eq("misiones_activas",g.misiones_activas).eq("descuento",g.descuento);
   changes=g.tareas===null?changes.is("tareas",null):changes.eq("tareas",g.tareas);
   const {data,error}=await changes.select("misiones_version,cupon_ciclo").maybeSingle();
   if(error)throw error;if(!data)return responder({ok:false,error:"La ronda cambió. Actualiza Admin e inténtalo de nuevo."},409);
   return responder({ok:true,misiones_version:data.misiones_version,cupon_ciclo:data.cupon_ciclo});
  }
  if(accion==="reiniciar_misiones_cliente"){
   const clienteId=String(datos.cliente_id??"").trim();if(!clienteId)return responder({ok:false,error:"Falta cliente_id"},400);const{data:gamif,error:buscarError}=await supabase.from("gamificacion").select("id,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").eq("cliente_id",clienteId).maybeSingle();if(buscarError)throw buscarError;if(!gamif)return responder({ok:false,error:"El cliente no tiene configuración de misiones"},404);
   const nuevaVersion=Math.max(1,Number(gamif.misiones_version||1)+1);const{data,error}=await supabase.from("gamificacion").update({misiones_version:nuevaVersion}).eq("id",gamif.id).select("id,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").single();if(error)throw error;return responder({ok:true,misiones_version:nuevaVersion,cupon_ciclo:data.cupon_ciclo,cupon_reclamado_ciclo:data.cupon_reclamado_ciclo});
  }
  if(accion==="nueva_ronda_cupon"){
   const clienteId=String(datos.cliente_id??"").trim();if(!clienteId)return responder({ok:false,error:"Falta cliente_id"},400);const{data:gamif,error:buscarError}=await supabase.from("gamificacion").select("id,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").eq("cliente_id",clienteId).maybeSingle();if(buscarError)throw buscarError;if(!gamif)return responder({ok:false,error:"El cliente no tiene configuración de misiones"},404);
   const nuevaVersion=Math.max(1,Number(gamif.misiones_version||1)+1),nuevoCiclo=Math.max(1,Number(gamif.cupon_ciclo||1)+1);const{data,error}=await supabase.from("gamificacion").update({misiones_version:nuevaVersion,cupon_ciclo:nuevoCiclo}).eq("id",gamif.id).select("id,misiones_version,cupon_ciclo,cupon_reclamado_ciclo").single();if(error)throw error;return responder({ok:true,misiones_version:data.misiones_version,cupon_ciclo:data.cupon_ciclo,cupon_reclamado_ciclo:data.cupon_reclamado_ciclo});
  }
  return responder({ok:false,error:`Acción no reconocida: ${accion}`},400);
 }catch(error){console.error(error);return responder({ok:false,error:"No fue posible aplicar el ajuste"},500)}
});