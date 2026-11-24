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

const uuid=(v:unknown)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v||""));
const day=(v:unknown)=>{const s=String(v||"");const t=Date.parse(s+"T00:00:00Z");return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===s?s:null};
const reasons:Record<string,string>={interrumpido:"Servicio interrumpido",frecuente:"Fallas frecuentes",sin_acceso:"Sin acceso a la plataforma",otro:"Otra afectación"};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return answer({ok:false,error:"Método no permitido."},405);
 try{
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",url=Deno.env.get("SUPABASE_URL")||"";
  const admin=await signed(req.headers.get("X-Admin-Token")||"",Deno.env.get("ADMIN_SESSION_SECRET")||"","goxion_admin");
  if(!admin)return answer({ok:false,error:"Sesión administrativa inválida o expirada."},401);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const body=await req.json().catch(()=>({})),action=String(body.accion||""),d=body.datos||{};
  const reports=sb.from("goxion_reportes_trato_justo"),incidents=sb.from("goxion_garantia_incidencias");
  if(action==="calificaciones"){
   const q=await sb.from("goxion_calificaciones_plataforma").select("plataforma_clave,plataforma,calificacion,comentario,actualizado_en,clientes(nombre,folio)").order("actualizado_en",{ascending:false}).limit(500);
   if(q.error)throw q.error;return answer({ok:true,calificaciones:q.data||[],limitado:(q.data||[]).length===500});
  }
  if(action==="reportes"){
   const q=await reports.select("id,cliente_id,cliente_servicio_id,plataforma,motivo,descripcion,afectacion_desde,creado_en,estado,clientes(nombre,folio)").in("estado",["pendiente","en_revision"]).order("creado_en",{ascending:false}).limit(300);
   if(q.error)throw q.error;
   const rows=q.data||[],ids=rows.map(r=>r.id);
   const i=ids.length?await incidents.select("id,estado,periodo,dias_completos_verificados,verificado_desde,verificado_hasta").in("id",ids):{data:[],error:null};
   if(i.error)throw i.error;
   const map=new Map((i.data||[]).map(x=>[x.id,x]));
   return answer({ok:true,reportes:rows.map(r=>({...r,incidencia:map.get(r.id)||null})),limitado:rows.length===300});
  }
  if(!uuid(d.id))return answer({ok:false,error:"Reporte inválido."},400);
  const q=await reports.select("id,cliente_id,cliente_servicio_id,plataforma,motivo,descripcion,afectacion_desde,creado_en,estado").eq("id",d.id).maybeSingle();
  if(q.error)throw q.error;const r=q.data;if(!r)return answer({ok:false,error:"Reporte no disponible."},404);
  if(["resuelto","no_procede"].includes(r.estado))return answer({ok:false,error:"El reporte ya está cerrado."},409);
  if(!r.cliente_servicio_id)return answer({ok:false,error:"El servicio ya no tiene referencia disponible."},409);
  const s=await sb.from("cliente_servicios").select("id,cliente_id").eq("id",r.cliente_servicio_id).eq("cliente_id",r.cliente_id).maybeSingle();
  if(s.error)throw s.error;if(!s.data)return answer({ok:false,error:"No se encontró el servicio asociado."},409);
  if(action==="revisar"||action==="descartar"){
   const ins=await incidents.upsert({id:r.id,cliente_id:r.cliente_id,cliente_servicio_id:r.cliente_servicio_id,periodo:String(r.afectacion_desde).slice(0,7)+"-01",descripcion:(reasons[r.motivo]||"Afectación reportada")+(r.descripcion?" · "+r.descripcion:""),fecha_inicio_declarada:r.afectacion_desde,reportado_en:r.creado_en,estado:"reportada",origen:"sin_determinar"},{onConflict:"id",ignoreDuplicates:true});
   if(ins.error)throw ins.error;
   if(action==="descartar"){
    const x=await incidents.update({estado:"descartada",updated_at:new Date().toISOString()}).eq("id",r.id).in("estado",["reportada","descartada"]).select("id").maybeSingle();
    if(x.error)throw x.error;if(!x.data)return answer({ok:false,error:"La incidencia ya fue validada; revisa su compensación."},409);
   }
   const u=await reports.update({estado:action==="revisar"?"en_revision":"no_procede"}).eq("id",r.id).in("estado",["pendiente","en_revision"]).select("id").maybeSingle();
   if(u.error)throw u.error;if(!u.data)return answer({ok:false,error:"El reporte cambió de estado."},409);
   return answer({ok:true});
  }
  if(action==="validar"){
   if(r.estado!=="en_revision")return answer({ok:false,error:"Primero inicia la revisión."},409);
   const desde=day(d.desde),hasta=day(d.hasta),periodo=day(String(d.periodo||"")+"-01"),days=Number(d.dias),proof=String(d.evidencia||"").trim();
   const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
   if(!desde||!hasta||!periodo||desde>hasta||hasta>today||desde<r.afectacion_desde||!Number.isInteger(days)||days<1||days>10||days>Math.floor((Date.parse(hasta)-Date.parse(desde))/86400000)+1||proof.length<12||proof.length>1500||d.origen!=="goxion")return answer({ok:false,error:"Confirma origen GOXION, fechas, días completos y evidencia."},400);
   const u=await incidents.update({estado:"validada",origen:"goxion",periodo,dias_completos_verificados:days,verificado_desde:desde,verificado_hasta:hasta,evidencia_verificacion:proof,verificado_por:String(admin.usuario||admin.sub||admin.username||"Admin GOXION").slice(0,180),verificado_en:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",r.id).eq("estado","reportada").select("id").maybeSingle();
   if(u.error)throw u.error;if(!u.data)return answer({ok:false,error:"La incidencia ya fue revisada."},409);return answer({ok:true});
  }
  if(action==="cerrar"){
   const i=await incidents.select("id,periodo,dias_completos_verificados,estado").eq("id",r.id).eq("estado","validada").maybeSingle();
   if(i.error)throw i.error;if(!i.data)return answer({ok:false,error:"Primero valida la incidencia."},409);
   const c=await sb.from("trato_justo_compensaciones").select("id,incidencia_id,dias_falla").eq("cliente_id",r.cliente_id).eq("cliente_servicio_id",r.cliente_servicio_id).eq("periodo",i.data.periodo).eq("activo",true).maybeSingle();
   if(c.error)throw c.error;
   if(!c.data||Number(c.data.dias_falla)!==Number(i.data.dias_completos_verificados)||c.data.incidencia_id&&c.data.incidencia_id!==r.id)return answer({ok:false,error:"No existe una compensación activa coincidente y disponible para vincular."},409);
   const x=await sb.from("trato_justo_compensaciones").update({incidencia_id:r.id}).eq("id",c.data.id).eq("activo",true).eq("dias_falla",i.data.dias_completos_verificados).or("incidencia_id.is.null,incidencia_id.eq."+r.id).select("id").maybeSingle();
   if(x.error)throw x.error;if(!x.data)return answer({ok:false,error:"La compensación cambió antes de vincularla."},409);
   const u=await reports.update({estado:"resuelto"}).eq("id",r.id).eq("estado","en_revision").select("id").maybeSingle();if(u.error)throw u.error;if(!u.data)return answer({ok:false,error:"El reporte cambió de estado."},409);
   return answer({ok:true});
  }
  return answer({ok:false,error:"Acción no disponible."},400);
 }catch(e){console.error("experiencia-servicio-admin",e);return answer({ok:false,error:"No fue posible completar la operación administrativa."},500)}
});