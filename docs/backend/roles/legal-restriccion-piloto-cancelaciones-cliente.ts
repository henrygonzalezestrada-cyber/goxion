import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store, private, max-age=0","Pragma":"no-cache"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
function b64t(t:string){return new TextDecoder().decode(b64b(t))}
async function verify(token:string,secret:string){const p=token.trim().split(".");if(p.length!==2)return null;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return null;try{const j=JSON.parse(b64t(p[0]));return j.role==="goxion_client"&&j.cliente_id&&j.exp>Math.floor(Date.now()/1000)?j:null}catch{return null}}
const money=(v:unknown)=>Math.round((Number(v)||0)*100)/100;
function currentMonth(){const d=new Date();return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-01`}
function firstOfMonth(v:unknown){const s=String(v||"").trim();const m=s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);return m?`${m[1]}-${m[2]}-01`:currentMonth()}
function ageDays(iso:unknown){const t=new Date(String(iso||"")).getTime();return Number.isFinite(t)?Math.floor((Date.now()-t)/86400000):0}

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
    const token=req.headers.get("X-Client-Token")||"";const p=await verify(token,k);
    if(!p)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({}));const accion=String(body?.accion||"listar");const d=body?.datos||{};const clienteId=String(p.cliente_id);const acceso=await exigirClienteActivo(sb,clienteId);if(!acceso.ok)return res({ok:false,error:acceso.error},acceso.status);
    if(clienteId==="091e79b7-c60b-4d50-bb98-a047bfc0dbb4"&&accion!=="listar"){
      const g=await sb.rpc("goxion_legal_piloto_estado",{p_cliente_id:clienteId});
      if(g.error)throw g.error;
      if(g.data?.bloquea_operaciones===true)return res({ok:false,codigo:"TERMINOS_RECHAZADOS",
        error:"No necesitas solicitar cancelaciones. Al concluir el último periodo pagado ("+
          (g.data.ultima_cobertura||"fecha pendiente de revisión")+
          "), tus servicios finalizarán sin renovación."},409);
    }


    async function ownedService(servicioId:string){
      const sq=await sb.from("cliente_servicios").select("id,cliente_id,nombre,monto,activo,created_at").eq("id",servicioId).single();
      if(sq.error)throw sq.error;
      if(String(sq.data.cliente_id)!==clienteId)throw Object.assign(new Error("El servicio no pertenece a tu cuenta"),{status:403});
      return sq.data as any;
    }
    async function openCancellation(servicioId:string){
      const q=await sb.from("solicitudes_cancelacion")
        .select("id,cliente_servicio_id,estado,motivo,nota_admin,solicitada_at,resuelta_at,fecha_efectiva,efectiva_at,created_at,updated_at")
        .eq("cliente_id",clienteId).eq("cliente_servicio_id",servicioId)
        .in("estado",["solicitada","aprobada"]).order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(q.error)throw q.error;return q.data;
    }

    if(accion==="listar"){
      const q=await sb.from("solicitudes_cancelacion")
        .select("id,cliente_servicio_id,estado,motivo,nota_admin,solicitada_at,resuelta_at,fecha_efectiva,efectiva_at,created_at,updated_at,cliente_servicios(nombre,monto,correo_login,activo)")
        .eq("cliente_id",clienteId).order("created_at",{ascending:false});
      if(q.error)throw q.error;
      const items=(q.data||[]).map((x:any)=>({id:x.id,cliente_servicio_id:x.cliente_servicio_id,estado:x.estado,motivo:x.motivo||"",nota_admin:x.nota_admin||"",solicitada_at:x.solicitada_at,resuelta_at:x.resuelta_at,fecha_efectiva:x.fecha_efectiva,efectiva_at:x.efectiva_at,created_at:x.created_at,updated_at:x.updated_at,servicio_nombre:x.cliente_servicios?.nombre||"Servicio",servicio_activo:x.cliente_servicios?.activo===true}));
      return res({ok:true,solicitudes:items});
    }

    if(accion==="evaluar_retencion"){
      const servicioId=String(d.cliente_servicio_id||"");
      if(!servicioId)return res({ok:false,error:"Falta identificar el servicio"},400);
      const service=await ownedService(servicioId);
      if(service.activo!==true)return res({ok:true,elegible:false,razon:"servicio_inactivo"});
      if(await openCancellation(servicioId))return res({ok:true,elegible:false,razon:"cancelacion_abierta"});

      const used=await sb.from("retencion_ofertas").select("id,estado").eq("cliente_id",clienteId).in("estado",["aceptada","consumida"]).limit(1).maybeSingle();
      if(used.error)throw used.error;
      if(used.data)return res({ok:true,elegible:false,razon:"beneficio_utilizado"});

      const recentReject=await sb.from("retencion_ofertas").select("id,rechazada_at").eq("cliente_id",clienteId).eq("estado","rechazada").gte("rechazada_at",new Date(Date.now()-90*86400000).toISOString()).order("rechazada_at",{ascending:false}).limit(1).maybeSingle();
      if(recentReject.error)throw recentReject.error;
      if(recentReject.data)return res({ok:true,elegible:false,razon:"periodo_espera"});

      const [cq,pq]=await Promise.all([
        sb.from("clientes").select("id,nombre,folio,origen_cliente,periodo_pendiente").eq("id",clienteId).single(),
        sb.from("pagos").select("id",{count:"exact",head:true}).eq("cliente_id",clienteId).eq("estado","pagado")
      ]);
      if(cq.error)throw cq.error;if(pq.error)throw pq.error;
      const legacy=String(cq.data?.origen_cliente||"")==="sd_streaming";
      const mature=legacy||Number(pq.count||0)>0||ageDays(service.created_at)>=30;
      if(!mature)return res({ok:true,elegible:false,razon:"cuenta_reciente"});

      const base=money(service.monto);
      if(base<=0)return res({ok:true,elegible:false,razon:"monto_no_elegible"});
      const porcentaje=30;
      const descuento=money(base*(porcentaje/100));
      const final=money(Math.max(0,base-descuento));
      const periodo=firstOfMonth(cq.data?.periodo_pendiente);

      const openOffer=await sb.from("retencion_ofertas").select("id,cliente_servicio_id,porcentaje,monto_base,monto_descuento,periodo_aplicacion,estado,ofrecida_at").eq("cliente_id",clienteId).eq("estado","ofrecida").order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(openOffer.error)throw openOffer.error;
      let offer:any=openOffer.data;
      if(offer&&String(offer.cliente_servicio_id)!==servicioId){
        const up=await sb.from("retencion_ofertas").update({estado:"expirada"}).eq("id",offer.id).eq("estado","ofrecida");if(up.error)throw up.error;
        offer=null;
      }
      if(!offer){
        const ins=await sb.from("retencion_ofertas").insert({cliente_id:clienteId,cliente_servicio_id:servicioId,porcentaje,monto_base:base,monto_descuento:descuento,periodo_aplicacion:periodo,estado:"ofrecida"}).select("id,cliente_servicio_id,porcentaje,monto_base,monto_descuento,periodo_aplicacion,estado,ofrecida_at").single();
        if(ins.error)throw ins.error;offer=ins.data;
      }
      return res({ok:true,elegible:true,oferta:{id:offer.id,servicio_nombre:service.nombre,porcentaje:Number(offer.porcentaje||porcentaje),monto_base:Number(offer.monto_base||base),monto_descuento:Number(offer.monto_descuento||descuento),monto_final:money(Number(offer.monto_base||base)-Number(offer.monto_descuento||descuento)),periodo_aplicacion:offer.periodo_aplicacion,uso_unico:true}});
    }

    if(accion==="aceptar_retencion"){
      const ofertaId=String(d.oferta_id||"");
      if(!ofertaId)return res({ok:false,error:"Falta identificar la oferta"},400);
      const oq=await sb.from("retencion_ofertas").select("id,cliente_id,cliente_servicio_id,porcentaje,monto_base,monto_descuento,periodo_aplicacion,estado,cliente_servicios(nombre,monto,activo)").eq("id",ofertaId).eq("cliente_id",clienteId).single();
      if(oq.error)throw oq.error;const offer:any=oq.data;
      if(offer.estado!=="ofrecida")return res({ok:false,error:"Esta oferta ya no está disponible"},409);
      if(offer.cliente_servicios?.activo!==true)return res({ok:false,error:"El servicio ya no está activo"},409);
      const used=await sb.from("retencion_ofertas").select("id").eq("cliente_id",clienteId).in("estado",["aceptada","consumida"]).limit(1).maybeSingle();if(used.error)throw used.error;if(used.data)return res({ok:false,error:"Este beneficio ya fue utilizado en tu cuenta"},409);

      const serviceName=offer.cliente_servicios?.nombre||"Servicio";
      const label=`Retención GOXION · -${Number(offer.porcentaje||30)}% · ${serviceName}`;
      const dq=await sb.from("descuentos_especiales").insert({cliente_id:clienteId,descripcion:label,monto:Number(offer.monto_descuento||0),activo:true}).select("id").single();
      if(dq.error)throw dq.error;
      const now=new Date().toISOString();
      const up=await sb.from("retencion_ofertas").update({estado:"aceptada",aceptada_at:now,descuento_id:dq.data.id}).eq("id",ofertaId).eq("estado","ofrecida").select("id");
      if(up.error||!(up.data||[]).length){await sb.from("descuentos_especiales").delete().eq("id",dq.data.id);if(up.error)throw up.error;return res({ok:false,error:"La oferta cambió antes de poder aplicarse"},409)}

      await Promise.all([
        sb.from("cliente_servicio_novedades").insert({cliente_id:clienteId,cliente_servicio_id:offer.cliente_servicio_id,tipo:"retencion",titulo:"30% aplicado",resumen:`Ahorro de $${Number(offer.monto_descuento||0).toFixed(2)} en tu próximo pago de ${serviceName}`,referencia:String(ofertaId),prioridad:6}),
        sb.from("clientes").select("nombre,folio").eq("id",clienteId).single().then(async({data,error}:any)=>{if(error)return;await sb.from("notificaciones_admin").insert({cliente_id:clienteId,cliente_nombre:data?.nombre||null,tipo:"retencion_aceptada",titulo:"Cliente conservado · -30%",mensaje:`${data?.nombre||"Cliente"} aceptó una oferta de retención del ${Number(offer.porcentaje||30)}% en ${serviceName}. Descuento: $${Number(offer.monto_descuento||0).toFixed(2)} para el próximo periodo.`,referencia:data?.folio||null,leida:false})})
      ]);
      return res({ok:true,aceptada:true,oferta:{id:ofertaId,servicio_nombre:serviceName,porcentaje:Number(offer.porcentaje||30),monto_base:Number(offer.monto_base||0),monto_descuento:Number(offer.monto_descuento||0),monto_final:money(Number(offer.monto_base||0)-Number(offer.monto_descuento||0)),periodo_aplicacion:offer.periodo_aplicacion}});
    }

    if(accion==="rechazar_retencion"){
      const ofertaId=String(d.oferta_id||"");if(!ofertaId)return res({ok:false,error:"Falta identificar la oferta"},400);
      const q=await sb.from("retencion_ofertas").update({estado:"rechazada",rechazada_at:new Date().toISOString()}).eq("id",ofertaId).eq("cliente_id",clienteId).eq("estado","ofrecida").select("id");
      if(q.error)throw q.error;return res({ok:true,rechazada:true});
    }

    if(accion==="crear"){
      const servicioId=String(d.cliente_servicio_id||"");
      if(!servicioId)return res({ok:false,error:"Falta identificar el servicio"},400);
      const sq=await ownedService(servicioId);
      if(sq.activo!==true)return res({ok:false,error:"Este servicio ya no está activo"},409);
      const open=await openCancellation(servicioId);
      if(open)return res({ok:true,already_open:true,solicitud:open});

      const cq=await sb.from("clientes").select("id,nombre,folio").eq("id",clienteId).single();if(cq.error)throw cq.error;
      const mensaje=[`Servicio: ${sq.nombre}`,`Servicio ID: ${servicioId}`,`Cliente: ${cq.data.nombre||""}`,cq.data.folio?`Folio: ${cq.data.folio}`:"","El cliente solicita iniciar el proceso de cancelación de este servicio.","Requiere confirmación administrativa."].filter(Boolean).join("\n");
      const nq=await sb.from("notificaciones_admin").insert({cliente_id:clienteId,cliente_nombre:cq.data.nombre||null,tipo:"cancelacion_solicitada",titulo:"Solicitud de cancelación",mensaje,referencia:cq.data.folio||null,leida:false}).select("id").single();if(nq.error)throw nq.error;
      const ins=await sb.from("solicitudes_cancelacion").insert({cliente_id:clienteId,cliente_servicio_id:servicioId,notificacion_id:nq.data.id,estado:"solicitada",motivo:String(d.motivo||"Solicitud desde Mi Espacio").trim()||"Solicitud desde Mi Espacio"}).select("id,cliente_servicio_id,estado,motivo,nota_admin,solicitada_at,resuelta_at,fecha_efectiva,efectiva_at,created_at,updated_at").single();
      if(ins.error){await sb.from("notificaciones_admin").delete().eq("id",nq.data.id);const again=await openCancellation(servicioId);if(again)return res({ok:true,already_open:true,solicitud:again});throw ins.error}
      return res({ok:true,already_open:false,solicitud:ins.data});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e:any){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible gestionar la cancelación"},Number(e?.status)||500)}
});