import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const headers={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json",
  "Cache-Control":"no-store, private, max-age=0"
};
const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
function decodeB64(value:string){
  const safe=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");
  return Uint8Array.from(atob(safe),c=>c.charCodeAt(0));
}
async function verifyAdmin(token:string){
  const parts=token.trim().split(".");
  if(parts.length!==2)return false;
  const secret=Deno.env.get("ADMIN_SESSION_SECRET");
  if(!secret)throw new Error("Configuración de autenticación incompleta");
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  let verified=false;
  try{
    verified=await crypto.subtle.verify("HMAC",key,decodeB64(parts[1]),new TextEncoder().encode(parts[0]));
  }catch{return false;}
  if(!verified)return false;
  try{
    const payload=JSON.parse(new TextDecoder().decode(decodeB64(parts[0])));
    return payload.role==="goxion_admin"&&Number(payload.exp)>Math.floor(Date.now()/1000);
  }catch{return false;}
}
function businessDay(){
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Merida",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const val=(type:string)=>Number(parts.find(x=>x.type===type)?.value||0);
  return {year:val("year"),month:val("month"),day:val("day")};
}
function dayDifference(a:Date,b:Date){return Math.round((b.getTime()-a.getTime())/86400000)}
function ageDays(iso:string|null,day:{year:number;month:number;day:number}){
  if(!iso)return null;
  const created=new Date(iso);
  if(!Number.isFinite(created.getTime()))return null;
  return Math.max(0,dayDifference(new Date(Date.UTC(created.getUTCFullYear(),created.getUTCMonth(),created.getUTCDate())),
    new Date(Date.UTC(day.year,day.month-1,day.day))));
}

const uuidRx=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function idsAllowed(list:unknown){
 return Array.isArray(list)&&list.length<=200&&list.every(x=>typeof x==="string"&&uuidRx.test(x));
}
async function validarPlan(sb:any,body:any,clients:any[],promociones:any[]){
 const plan=body.plan;
 if(!plan||typeof plan!=="object"||Array.isArray(plan))return respond({ok:false,error:"Falta el plan."},400);
 const tipo=plan.tipo;
 if(!["missions","pay","promo","general"].includes(tipo))return respond({ok:false,error:"Motivo inválido."},400);
 if(!uuidRx.test(String(plan.id_campana||"")))return respond({ok:false,error:"El plan necesita un ID de campaña UUID."},400);
 const agregar=plan.agregar_ids??[],excluir=plan.excluir_ids??[];
 if(!idsAllowed(agregar)||!idsAllowed(excluir))return respond({ok:false,error:"IDs manuales inválidos o demasiados."},400);
 const addSet=new Set<string>(agregar),removeSet=new Set<string>(excluir);
 if([...addSet].some(id=>removeSet.has(id)))return respond({ok:false,error:"Un cliente no puede estar incluido y excluido simultáneamente."},400);
 const disponible=promociones.find(p=>p.id===plan.promocion_id && p.adquisicion_habilitada===true);
 if(tipo==="promo"&&!disponible)return respond({ok:false,error:"La promoción no está disponible, publicada o habilitada para contratación."},400);
 if(tipo!=="promo"&&plan.promocion_id)return respond({ok:false,error:"El motivo no requiere una promoción."},400);
 // Los clientes ya son la lista activa, no suspendida, sin perfiles de prueba y con servicio.
 const live=new Map(clients.map(c=>[c.id,c]));
 const omitidos:any[]=[];
 for(const id of addSet){
   if(!live.has(id))omitidos.push({id,motivo:"cliente_no_autorizado_o_sin_servicio"});
 }
 let candidatos=0;
 const queue:any[]=[];
 for(const c of clients){
   const manual=addSet.has(c.id);
   if(removeSet.has(c.id)){omitidos.push({id:c.id,nombre:c.nombre,motivo:"exclusion_manual"});continue}
   let auto=false,valid=false,motivo="";
   if(tipo==="missions"){
     auto=c.misiones_total>0&&c.misiones_pendientes>0;
     valid=auto;motivo="sin_misiones_pendientes";
   }else if(tipo==="pay"){
     const dias=c.dias_para_cobro;
     valid=c.cobro_oficial===true&&c.cobro_pagado===false&&typeof dias==="number"&&Number.isFinite(dias)&&dias>=0;
     auto=valid&&dias<=7;motivo="sin_cobro_futuro_verificado";
   }else if(tipo==="promo"){
     auto=true;valid=true;motivo="sin_promocion_publicada";
   }else {auto=true;valid=true;}
   if(!auto&&!manual)continue;
   candidatos++;
   if(!valid){omitidos.push({id:c.id,nombre:c.nombre,motivo});continue}
   queue.push({cliente:c,agregado_manualmente:manual&&!auto});
 }
 if(queue.length>500)return respond({ok:false,error:"El plan excede el máximo de evaluación. Divídelo en lotes."},400);
 let pend=new Array(queue.length).fill(false);
 if(tipo==="promo"){
   let next=0;const workers=Math.min(6,queue.length);
   await Promise.all(Array.from({length:workers},async()=>{
     while(true){
       const i=next++;if(i>=queue.length)break;
       try{
         const id=queue[i].cliente.id,pid=disponible.id;
         const [elig,stock]=await Promise.all([
           sb.rpc("goxion_promocion_elegibilidad",{p_cliente_id:id,p_promocion_id:pid}),
           sb.rpc("goxion_promocion_disponibilidad",{p_promocion_id:pid,p_cliente_id:id})
         ]);
         // Ante fallo o desconocimiento, no ofrecer nunca el anuncio como elegible.
         pend[i]=!elig.error&&!stock.error&&elig.data?.elegible===true&&stock.data?.disponible===true;
       }catch{pend[i]=false}
     }
   }));
 }else pend=queue.map(()=>true);
 const aprobados:any[]=[];
 queue.forEach((row,i)=>{
   if(pend[i])aprobados.push(row);
   else omitidos.push({id:row.cliente.id,nombre:row.cliente.nombre,motivo:"promocion_no_elegible_o_sin_stock"});
 });
 const dedupe_key="comunicaciones:"+plan.id_campana+":"+tipo;
 const seen=new Set<string>();
 // Leer siempre la clave exacta; el historial resumido es insuficiente para idempotencia.
 for(let i=0;i<aprobados.length;i+=100){
   const ids=aprobados.slice(i,i+100).map(x=>x.cliente.id);
   const {data,error}=await sb.from("cliente_notificaciones").select("cliente_id").eq("dedupe_key",dedupe_key).in("cliente_id",ids);
   if(error)return respond({ok:false,error:"No fue posible comprobar avisos anteriores; envío bloqueado."},503);
   for(const r of data||[])seen.add(r.cliente_id);
 }
 const seleccionados:any[]=[];
 for(const row of aprobados){
   const c=row.cliente;
   if(seen.has(c.id)){
     omitidos.push({id:c.id,nombre:c.nombre,motivo:"aviso_ya_registrado"});
     continue;
   }
   seleccionados.push({id:c.id,nombre:c.nombre,agregado_manualmente:row.agregado_manualmente});
 }
 return respond({ok:true,modo:"validacion_sin_envio",id_campana:plan.id_campana,tipo,
   dedupe_key,candidatos,elegibles:seleccionados.length,seleccionados,omitidos,
   advertencias:tipo==="promo"?["Revalidar promoción y disponibilidad nuevamente al enviar."]:
       ["Revalidar estado del cliente y condiciones nuevamente al enviar."],
   envios_realizados:0,habilita_envio:false});
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers});
 if(req.method!=="POST")return respond({ok:false,error:"Método no permitido"},405);
 try{
   if(!(await verifyAdmin(req.headers.get("X-Admin-Token")||"")))return respond({ok:false,error:"Inicia sesión como administrador para consultar comunicaciones."},401);
   const body=await req.json().catch(()=>({}));
   if(!["resumen","validar_plan"].includes(body.accion))return respond({ok:false,error:"La beta solo permite consultas y validación; los envíos están deshabilitados."},400);
   const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
   if(!url||!key)throw new Error("Falta configuración de base de datos");
   const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
   const [c,s,cs,g,p,alert,promo,history]=await Promise.all([
     sb.from("clientes").select("id,nombre,estado,dia_pago,created_at").limit(5000),
     sb.from("servicios").select("id,nombre,activo").order("nombre").limit(5000),
     sb.from("cliente_servicios").select("cliente_id,servicio_id,nombre,activo").eq("activo",true).limit(5000),
     sb.from("gamificacion").select("cliente_id,misiones_activas,tareas,misiones_version,cupon_reclamado").limit(5000),
     sb.from("cliente_misiones_progreso").select("cliente_id,misiones_version,mision_index").limit(5000),
     sb.from("alertas").select("id,plataforma,falla,mensaje,activa").eq("activa",true).limit(100),
     sb.from("promociones_catalogo").select("id,nombre,titulo_publico,inicio,fin,activa,publicada,audiencia,servicio_id,notificar_cliente,adquisicion_habilitada").eq("activa",true).eq("publicada",true).limit(100),
     sb.from("cliente_notificaciones").select("cliente_id,tipo,titulo,created_at,dedupe_key,leida_at").order("created_at",{ascending:false}).limit(1000)
   ]);
   const results=[c,s,cs,g,p,alert,promo,history];
   if(results.some(x=>x.error))throw results.find(x=>x.error)?.error;
   const today=businessDay(),stamp=`${today.year}-${String(today.month).padStart(2,"0")}-${String(today.day).padStart(2,"0")}`;
   const requested=String(body.fecha_simulacion||stamp).trim();
   if(!/^\d{4}-\d{2}-\d{2}$/.test(requested))return respond({ok:false,error:"Fecha de simulación inválida."},400);
   const start=Date.parse(stamp+"T00:00:00Z"),end=Date.parse(requested+"T00:00:00Z");
   if(!Number.isFinite(end)||new Date(end).toISOString().slice(0,10)!==requested||
       end<start||end-start>92*86400000)return respond({ok:false,error:"Simula una fecha válida de hoy a 92 días adelante."},400);
   const assignments=new Map<string,any[]>(),gamif=new Map<string,any>(),progress=new Map<string,any[]>();
   for(const item of cs.data||[]){const a=assignments.get(item.cliente_id)||[];a.push(item);assignments.set(item.cliente_id,a)}
   for(const item of g.data||[])gamif.set(item.cliente_id,item);
   for(const item of p.data||[]){const a=progress.get(item.cliente_id)||[];a.push(item);progress.set(item.cliente_id,a)}
   const totals={suspendidos:0,sin_servicios:0,prueba:0};
   const clients=[];
   for(const cl of c.data||[]){
     if(cl.estado==="suspendido"){totals.suspendidos++;continue}
     if(/^(cliente\s+)?(prueba|test|demo)(\b|$)/i.test(String(cl.nombre||"").trim())){totals.prueba++;continue}
     const active=assignments.get(cl.id)||[];
     if(!active.length){totals.sin_servicios++;continue}
     const m=gamif.get(cl.id);
     const lines=m?.misiones_activas?String(m.tareas||"").split(/\r?\n/).map((x:string)=>x.trim()).filter(Boolean):[];
     const completed=new Set((progress.get(cl.id)||[]).filter((r:any)=>
        r.misiones_version===m?.misiones_version && Number.isInteger(r.mision_index)&&r.mision_index>=0&&r.mision_index<lines.length
     ).map((r:any)=>r.mision_index));
     const missions=lines.map((line:string,index:number)=>({
       titulo:line.replace(/\s*\[[^\]]+\]\s*$/,"").trim(),
       completada:completed.has(index)
     }));
     clients.push({
       id:cl.id,nombre:cl.nombre,estado:cl.estado,dia_pago:cl.dia_pago,
       dias_para_cobro:null,fecha_corte:null,cobro_oficial:false,cobro_estado:null,cobro_pagado:false,cobro_total:null,
       antiguedad_dias:ageDays(cl.created_at,today),
       servicios:active.map((x:any)=>({id:x.servicio_id,nombre:x.nombre})),
       misiones:missions,
       misiones_total:missions.length,
       misiones_hechas:completed.size,
       misiones_pendientes:Math.max(0,missions.length-completed.size)
     });
   }
   // Lectura del único motor financiero oficial. No calcular una fecha paralela por dia_pago.
   // Limitar consultas financieras simultáneas evita saturar el proyecto si crece la audiencia.
   const cortes:Array<any|null>=new Array(clients.length).fill(null);
   const parallel=Math.min(8,clients.length);
   let nextClient=0;
   await Promise.all(Array.from({length:parallel},async()=>{
     while(true){
       const i=nextClient++;
       if(i>=clients.length)break;
       try{
         const {data:estado,error}=await sb.rpc("goxion_estado_financiero",{p_cliente_id:clients[i].id,p_hoy:requested});
         if(!error&&estado?.fuente_financiera==="supabase:goxion_estado_financiero")cortes[i]=estado;
       }catch {/* Una cuenta sin estado fiable se excluye del filtro financiero. */}
     }
   }));
   let financialFailures=0;
   const avisos=new Map<string,any[]>();
   for(const note of history.data||[]){
     if(!note.cliente_id)continue;
     const a=avisos.get(note.cliente_id)||[];
     a.push({tipo:note.tipo,dedupe_key:note.dedupe_key,created_at:note.created_at});
     avisos.set(note.cliente_id,a);
   }
   clients.forEach((cl:any,index:number)=>{
     const f=cortes[index];
     cl.notificaciones_previas=(avisos.get(cl.id)||[]).filter((x:any)=>x.tipo==="mision_recordatorio").slice(0,15);
     if(!f){financialFailures++;return;}
     cl.cobro_oficial=true;
     cl.fecha_corte=f.fecha_corte||null;
     cl.periodo_cobro=f.periodo||null;
     cl.cobro_estado=f.estado||null;
     cl.cobro_pagado=f.esta_pagado_periodo===true||Number(f.total_actual||0)<=0;
     cl.cobro_total=Number(f.total_actual||0);
     const days=Number(f.dias_para_corte);
     cl.dias_para_cobro=(!cl.cobro_pagado&&f.fecha_corte&&Number.isFinite(days)&&days>=0)?days:null;
     // estado del motor, distinto de clientes.estado. Útil para segmentación de avisos.
     cl.estado_cuenta=f.estado||null;
   });
   const automatismos=[
     {id:"pago",nombre:"Pago acreditado",owner:"Finanzas",trigger:"goxion_notify_pago_cliente",estado:"activo",tipo:"evento"},
     {id:"revision",nombre:"Comprobante en revisión",owner:"Operaciones",trigger:"goxion_notify_payment_review",estado:"activo",tipo:"evento"},
     {id:"mision",nombre:"Misión completada / cupón listo",owner:"Misiones",trigger:"goxion_notify_mission_progress",estado:"activo",tipo:"evento"},
     {id:"beneficio",nombre:"Beneficio aplicado",owner:"Beneficios",trigger:"goxion_notify_beneficio_cliente",estado:"activo",tipo:"evento"},
     {id:"referido",nombre:"Progreso de referidos",owner:"Referidos",trigger:"goxion_notify_referral_progress",estado:"activo",tipo:"evento"},
     {id:"cancelacion",nombre:"Solicitud de cancelación",owner:"Operaciones",trigger:"goxion_notify_cancelacion_cliente",estado:"activo",tipo:"evento"},
     {id:"acceso",nombre:"Novedades de acceso y credenciales",owner:"Cuentas y accesos",trigger:"goxion_cliente_acceso_novedad_trigger",estado:"activo",tipo:"evento"},
     {id:"recordatorio_mision",nombre:"Recordatorio por vencimiento de misiones",owner:"Misiones",trigger:"pendiente de regla horaria",estado:"simulacion",tipo:"condicion"},
     {id:"recordatorio_cobro",nombre:"Próximo cobro según Finanzas",owner:"Finanzas",trigger:"pendiente de regla horaria",estado:"simulacion",tipo:"condicion"},
     {id:"publicar_promo",nombre:"Anunciar promoción existente",owner:"Promotions Studio",trigger:"notificar_cliente (metadato)",estado:"simulacion",tipo:"manual"},
     {id:"incidencia",nombre:"Avisar sobre incidencia existente",owner:"Incidencias",trigger:"alertas (sin servicio_id)",estado:"requiere_vinculo",tipo:"manual"}
   ];
   const now=Date.now();
   const promociones=(promo.data||[]).filter((x:any)=>new Date(x.inicio).getTime()<=now&&new Date(x.fin).getTime()>now);
   if(body.accion==="validar_plan")return await validarPlan(sb,body,clients,promociones);
   return respond({ok:true,modo:"solo_lectura",fecha_local:stamp,fecha_simulada:requested,clientes:clients,
     exclusiones:totals,servicios:(s.data||[]).filter((x:any)=>x.activo),alertas:alert.data||[],
     promociones, automatismos,fiabilidad:{motor_financiero:"goxion_estado_financiero",consultas_correctas:clients.length-financialFailures,consultas_fallidas:financialFailures}, historial:(history.data||[]).slice(0,80)});
 }catch(e){console.error("communications preview",e);return respond({ok:false,error:"No fue posible obtener el análisis de comunicaciones."},500)}
});
