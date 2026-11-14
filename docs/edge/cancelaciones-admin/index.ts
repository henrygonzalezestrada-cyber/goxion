import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
async function auth(req:Request){
  const token=(req.headers.get("X-Admin-Token")||"").trim(),p=token.split(".");
  if(p.length!==2)return false;
  const s=Deno.env.get("ADMIN_SESSION_SECRET"); if(!s)throw new Error("ADMIN_SESSION_SECRET no configurado");
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(s),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return false;
  try{const j=JSON.parse(new TextDecoder().decode(b64b(p[0])));return j.role==="goxion_admin"&&j.exp>Math.floor(Date.now()/1000)}catch{return false}
}
const norm=(v:unknown)=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function cancellationNotif(n:any){const s=norm(`${n?.titulo||""} ${n?.mensaje||""}`);return s.includes("solicitud de cancelacion")||s.includes("proceso de cancelacion")||s.includes("cancelacion de este servicio")}
function line(message:string,label:string){const re=new RegExp(`^${label}\\s*:\\s*(.+)$`,`im`);return String(message||"").match(re)?.[1]?.trim()||""}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);
  try{
    if(!(await auth(req)))return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);
    const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(!u||!k)throw new Error("Configuración incompleta");
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})); const accion=String(body?.accion||"listar"); const d=body?.datos||{};

    async function listar(){
      const [rq,nq]=await Promise.all([
        sb.from("solicitudes_cancelacion").select("id,cliente_id,cliente_servicio_id,notificacion_id,estado,motivo,nota_admin,solicitada_at,resuelta_at,fecha_efectiva,efectiva_at,created_at,updated_at,clientes(nombre,folio),cliente_servicios(nombre,monto,correo_login,activo)").order("created_at",{ascending:false}),
        sb.from("notificaciones_admin").select("id,cliente_id,cliente_nombre,tipo,titulo,mensaje,referencia,leida,created_at").order("created_at",{ascending:false}).limit(200)
      ]);
      if(rq.error)throw rq.error;if(nq.error)throw nq.error;
      const linked=new Set((rq.data||[]).map((x:any)=>String(x.notificacion_id||"")).filter(Boolean));
      const legacy=(nq.data||[]).filter((n:any)=>cancellationNotif(n)&&!linked.has(String(n.id))).map((n:any)=>({legacy:true,notificacion_id:n.id,cliente_id:n.cliente_id,cliente_nombre:n.cliente_nombre,titulo:n.titulo,mensaje:n.mensaje,referencia:n.referencia,leida:n.leida,created_at:n.created_at,servicio_id:line(n.mensaje,"Servicio ID"),servicio_nombre:line(n.mensaje,"Servicio")}));
      return res({ok:true,solicitudes:rq.data||[],legacy});
    }

    async function resolveLegacy(notifId:string){
      const nq=await sb.from("notificaciones_admin").select("id,cliente_id,cliente_nombre,mensaje,referencia").eq("id",notifId).single();
      if(nq.error)throw nq.error; const n=nq.data; if(!n?.cliente_id)throw new Error("La solicitud no tiene cliente asociado");
      let serviceId=line(n.mensaje,"Servicio ID"); const serviceName=line(n.mensaje,"Servicio");
      if(serviceId){
        const q=await sb.from("cliente_servicios").select("id,cliente_id,nombre,activo").eq("id",serviceId).maybeSingle();
        if(q.error)throw q.error;if(!q.data||String(q.data.cliente_id)!==String(n.cliente_id))serviceId="";
      }
      if(!serviceId&&serviceName){
        const q=await sb.from("cliente_servicios").select("id,cliente_id,nombre,activo").eq("cliente_id",n.cliente_id);
        if(q.error)throw q.error; const found=(q.data||[]).find((x:any)=>norm(x.nombre)===norm(serviceName)); if(found)serviceId=found.id;
      }
      if(!serviceId)throw new Error("No fue posible identificar el servicio de la solicitud");
      const ex=await sb.from("solicitudes_cancelacion").select("id").eq("notificacion_id",notifId).maybeSingle();
      if(ex.error)throw ex.error;if(ex.data?.id)return ex.data.id;
      const ins=await sb.from("solicitudes_cancelacion").insert({cliente_id:n.cliente_id,cliente_servicio_id:serviceId,notificacion_id:notifId,estado:"solicitada",motivo:"Solicitud recibida desde Mi Espacio"}).select("id").single();
      if(ins.error){
        const open=await sb.from("solicitudes_cancelacion").select("id").eq("cliente_servicio_id",serviceId).in("estado",["solicitada","aprobada"]).maybeSingle();
        if(open.error)throw ins.error; if(open.data?.id)return open.data.id; throw ins.error;
      }
      return ins.data.id;
    }

    if(accion==="listar")return await listar();

    if(accion==="resolver"){
      let id=String(d.solicitud_id||""); const notifId=String(d.notificacion_id||""); const decision=String(d.decision||"").toLowerCase();
      if(!["aprobada","rechazada"].includes(decision))return res({ok:false,error:"Decisión inválida"},400);
      if(!id&&notifId)id=await resolveLegacy(notifId);
      if(!id)return res({ok:false,error:"Falta solicitud_id o notificacion_id"},400);
      const q=await sb.from("solicitudes_cancelacion").select("id,cliente_id,cliente_servicio_id,notificacion_id,estado").eq("id",id).single();if(q.error)throw q.error;
      if(["efectiva","cancelada"].includes(String(q.data.estado)))return res({ok:false,error:"La solicitud ya no admite esta decisión"},409);
      const fecha=String(d.fecha_efectiva||"").match(/^\d{4}-\d{2}-\d{2}$/)?.[0]||null;
      const up=await sb.from("solicitudes_cancelacion").update({estado:decision,nota_admin:String(d.nota_admin||""),resuelta_at:new Date().toISOString(),fecha_efectiva:decision==="aprobada"?fecha:null,updated_at:new Date().toISOString()}).eq("id",id).select().single();if(up.error)throw up.error;
      if(q.data.notificacion_id)await sb.from("notificaciones_admin").update({leida:true}).eq("id",q.data.notificacion_id);
      return res({ok:true,solicitud:up.data});
    }

    if(accion==="hacer_efectiva"){
      const id=String(d.solicitud_id||"");
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
        return res({ok:false,codigo:"CANCELACION_DATOS_INVALIDOS",
          error:"Selecciona una solicitud válida."},400);
      // Una sola transacción SQL confirma solicitud+servicio+calendario.
      // Jamás usar aquí UPDATE de cliente_servicios seguido de otro UPDATE separado.
      const result=await sb.rpc("goxion_hacer_efectiva_cancelacion_admin_v1",{
        p_solicitud_id:id,p_actor:"admin:cancelaciones_oficial"
      });
      if(result.error){
        const code=String(result.error.message||"");
        const reasons:Record<string,string>={
          CANCELACION_NO_EXISTE:"La solicitud ya no existe. Recarga las cancelaciones.",
          CANCELACION_REQUIERE_APROBACION:"Primero aprueba la solicitud de cancelación.",
          CANCELACION_B2_CICLO_PENDIENTE:"El cliente tiene cobros B2 pendientes. Deben conciliarse antes de hacer efectiva la baja.",
          CANCELACION_PARCIAL_PENDIENTE:"El cliente tiene un abono parcial pendiente de conciliación.",
          CANCELACION_ESTADO_NO_CONCILIADO:"La solicitud figura efectiva, pero el contrato sigue activo. Requiere revisión administrativa.",
          SERVICIO_B2_CICLO_CON_MOVIMIENTOS:"Existen pagos, comprobantes, prórrogas o beneficios comprometidos. Concilia el ciclo antes de cancelar.",
          SERVICIO_B2_CICLO_NO_VIRGEN:"El ciclo ya tiene movimientos. No se alteraron pagos ni contratos.",
          SERVICIO_PAGO_EN_REVISION:"Hay un comprobante en revisión. Resuélvelo primero.",
          SERVICIO_B2_CICLOS_DIFERENTES_EN_REVISION:"Hay varios periodos pendientes. Revisa primero las obligaciones.",
          SERVICIO_CALENDARIO_RESTANTE_INCOMPLETO:"Verifica las fechas de los servicios que permanecen activos."
        };
        const match=Object.keys(reasons).find(k=>code.includes(k));
        if(match)return res({ok:false,codigo:match,error:reasons[match]},
          match==="CANCELACION_NO_EXISTE"?404:409);
        console.error("[cancelaciones-admin] cancelación atómica falló",result.error.code||"RPC");
        return res({ok:false,codigo:"CANCELACION_FINANCIERA_409",
          error:"No fue posible hacer efectiva la cancelación. Ningún contrato ni comprobante se modificó; revisa el estado financiero."},409);
      }
      if(result.data?.ok!==true||result.data?.estado!=="efectiva")
        return res({ok:false,codigo:"CANCELACION_NO_CONFIRMADA",
          error:"La cancelación no fue confirmada en Supabase."},409);
      // La UI vuelve a cargar la ficha desde admin-datos (modelo único).
      return res({ok:true,codigo:"CANCELACION_EFECTIVA",
        solicitud:{id,cliente_id:result.data.cliente_id,
          cliente_servicio_id:result.data.servicio_id,estado:"efectiva"},
        repetida:result.data.repetida===true});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible gestionar cancelaciones"},500)}
});