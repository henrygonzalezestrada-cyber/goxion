import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
async function auth(req:Request){
  const token=(req.headers.get("X-Admin-Token")||"").trim(),p=token.split(".");
  if(p.length!==2)return false;
  const s=Deno.env.get("ADMIN_SESSION_SECRET"); if(!s)throw new Error("ADMIN_SESSION_SECRET no configurado");
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return false;
  try{const j=JSON.parse(new TextDecoder().decode(b64b(p[0])));return j.role==="goxion_admin"&&j.exp>Math.floor(Date.now()/1000)}catch{return false}
}
const num=(v:unknown,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp3=(v:unknown)=>Math.max(0,Math.min(3,Math.trunc(num(v,0))));
function mesesAuto(fecha:string|null|undefined){
  if(!fecha)return 0;
  const ini=new Date(`${fecha}T12:00:00`); if(Number.isNaN(ini.getTime()))return 0;
  const hoy=new Date(); let m=(hoy.getFullYear()-ini.getFullYear())*12+(hoy.getMonth()-ini.getMonth());
  if(hoy.getDate()<ini.getDate())m--; return clamp3(m);
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);
  try{
    if(!(await auth(req)))return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);
    const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!u||!k)throw new Error("Configuración incompleta");
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json(); const accion=String(body?.accion||""); const d=body?.datos||{}; const cid=String(d.cliente_id||"");

    async function cliente(){
      const q=await sb.from("clientes").select("id,nombre,folio,pagos_puntuales,dia_pago,estado,pago_en_revision,pago_revision_estado").eq("id",cid).single();
      if(q.error)throw q.error; return q.data;
    }
    async function notif(tipo:string,titulo:string,mensaje:string,c:any,referencia:string|null=null){
      const {error}=await sb.from("notificaciones_admin").insert({cliente_id:c?.id||null,cliente_nombre:c?.nombre||null,tipo,titulo,mensaje,referencia,leida:false});
      if(error)console.error("No se pudo registrar notificación",error);
    }
    async function referidoActivo(){
      const q=await sb.from("referidos").select("*").eq("cliente_id",cid).eq("activo",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(q.error)throw q.error; return q.data;
    }

    if(accion==="pago_incompleto"||accion==="rechazar_pago"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400);
      const c=await cliente(); const estado=accion==="pago_incompleto"?"incompleto":"rechazado";
      const msg=String(d.mensaje||(estado==="incompleto"?"El pago está incompleto.":"El comprobante fue rechazado."));
      const faltante=Math.max(0,num(d.monto_faltante));
      const q=await sb.from("clientes").update({estado:"pendiente",pago_en_revision:false,pago_revision_estado:estado,pago_revision_mensaje:msg,pago_revision_monto_faltante:faltante,pago_revision_updated_at:new Date().toISOString()}).eq("id",cid);
      if(q.error)throw q.error;
      await notif(estado,estado==="incompleto"?"⚠️ Pago incompleto":"✕ Comprobante rechazado",msg,c,c.folio);
      return res({ok:true,accion,estado,monto_faltante:faltante});
    }

    if(accion==="aprobar_pago"){
      // Escritor obsoleto RETIRADO. Las operaciones oficiales de pago
      // solo se admiten por acciones-financieras y comprobantes B2.
      return res({ok:false,codigo:"MOTOR_UNICO_APROBACION_RETIRO",
        error:"Usa la aprobación financiera actual de Admin; esta ruta antigua no acredita pagos."},409);

      if(!cid)return res({ok:false,error:"Falta cliente_id"},400);
      const c=await cliente(); const monto=num(d.monto); const puntual=d.puntual!==false; const hoy=new Date();
      const periodo=hoy.toLocaleDateString("es-MX",{month:"long",year:"numeric"});
      const fecha=hoy.toISOString().slice(0,10); const notas=String(d.notas||"");
      const {data:existente,error:findError}=await sb.from("pagos").select("id,estado,monto,periodo").eq("cliente_id",cid).eq("periodo",periodo).maybeSingle();
      if(findError)throw findError;

      let reutilizado=false; let yaContabilizado=false;
      if(existente?.id){
        reutilizado=true;
        yaContabilizado=String(existente.estado||"").toLowerCase()==="pagado";
        const up=await sb.from("pagos").update({fecha,monto,estado:"pagado",notas}).eq("id",existente.id);
        if(up.error)throw up.error;
      }else{
        const ins=await sb.from("pagos").insert({cliente_id:cid,fecha,periodo,monto,estado:"pagado",notas});
        if(ins.error)throw ins.error;
      }

      const actual=Math.max(0,Number(c.pagos_puntuales||0));
      const nuevaRacha=yaContabilizado?actual:(puntual?actual+1:0);
      const q=await sb.from("clientes").update({estado:"pagado",pago_en_revision:false,pagos_puntuales:nuevaRacha,descuento_fallas:0,pago_revision_estado:"aprobado",pago_revision_mensaje:null,pago_revision_monto_faltante:0,pago_revision_updated_at:new Date().toISOString()}).eq("id",cid);
      if(q.error)throw q.error;
      await notif("pago_aprobado","✓ Pago aprobado",yaContabilizado?`Pago validado. El periodo ${periodo} ya estaba registrado, por lo que la lealtad no se duplicó.`:(puntual?`Pago aprobado. Nueva racha: ${nuevaRacha}.`:`Pago aprobado fuera de fecha. La racha se reinició a 0.`),c,c.folio);
      return res({ok:true,accion,pagos_puntuales:nuevaRacha,puntual,reutilizado,lealtad_duplicada:false});
    }

    if(accion==="marcar_notificaciones_leidas"){
      const ids=Array.isArray(d.ids)?d.ids:[]; let q=sb.from("notificaciones_admin").update({leida:true});
      if(ids.length)q=q.in("id",ids); else q=q.eq("leida",false); const r=await q; if(r.error)throw r.error; return res({ok:true});
    }

    if(accion==="guardar_referido_inteligente"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400);
      const servicios=Array.isArray(d.servicios)?[...new Set(d.servicios.map(String).map((x:string)=>x.trim()).filter(Boolean))]:[];
      const fechaInicio=String(d.fecha_inicio||new Date().toISOString().slice(0,10)); const plataformas=servicios.length;
      const ex=await referidoActivo();
      const payload={cliente_id:cid,nombre:String(d.nombre??ex?.nombre??""),plataformas,servicios,fecha_inicio:fechaInicio,progreso_pausado:plataformas<2,activo:true};
      let r:any;
      if(ex?.id)r=await sb.from("referidos").update(payload).eq("id",ex.id).select().single(); else r=await sb.from("referidos").insert(payload).select().single();
      if(r.error)throw r.error; return res({ok:true,referido:r.data,servicios_total:servicios.length});
    }

    if(accion==="reiniciar_referido_inteligente"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400); const r0=await referidoActivo(); if(!r0)return res({ok:false,error:"No hay referido activo"},404);
      const servicios=Array.isArray(r0.servicios)?r0.servicios:[]; const hoy=new Date().toISOString().slice(0,10);
      const r=await sb.from("referidos").update({fecha_inicio:hoy,meses:0,meses_override:null,beneficio_reclamado:false,beneficio_reclamado_at:null,progreso_pausado:servicios.length<2}).eq("id",r0.id).select().single();
      if(r.error)throw r.error; return res({ok:true,referido:r.data,meses_efectivos:0});
    }

    if(accion==="eliminar_referido_inteligente"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400); const r0=await referidoActivo(); if(!r0)return res({ok:true});
      const q=await sb.from("referidos").update({activo:false}).eq("id",r0.id); if(q.error)throw q.error; return res({ok:true});
    }

    if(accion==="ajustar_meses_referido"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400); const r0=await referidoActivo(); if(!r0)return res({ok:false,error:"No hay referido activo"},404);
      const base=r0.meses_override===null||r0.meses_override===undefined?mesesAuto(r0.fecha_inicio):clamp3(r0.meses_override);
      const nuevo=clamp3(base+num(d.delta));
      const q=await sb.from("referidos").update({meses_override:nuevo,meses:nuevo}).eq("id",r0.id).select().single(); if(q.error)throw q.error;
      return res({ok:true,referido:q.data,meses_efectivos:nuevo,modo:"manual"});
    }

    if(accion==="modo_automatico_referido"){
      if(!cid)return res({ok:false,error:"Falta cliente_id"},400); const r0=await referidoActivo(); if(!r0)return res({ok:false,error:"No hay referido activo"},404);
      const efectivo=mesesAuto(r0.fecha_inicio); const q=await sb.from("referidos").update({meses_override:null,meses:efectivo}).eq("id",r0.id).select().single(); if(q.error)throw q.error;
      return res({ok:true,referido:q.data,meses_efectivos:efectivo,modo:"automatico"});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible realizar la operación"},500)}
});