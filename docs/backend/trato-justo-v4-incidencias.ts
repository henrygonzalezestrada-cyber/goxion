import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
function b64t(t:string){return new TextDecoder().decode(b64b(t))}
async function verify(token:string,secret:string,role:string){const p=token.trim().split(".");if(p.length!==2)return null;const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return null;try{const j=JSON.parse(b64t(p[0]));return j.role===role&&j.exp>Math.floor(Date.now()/1000)?j:null}catch{return null}}
function firstMonth(v:unknown){const m=String(v??"").match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);if(!m)return null;const mo=Number(m[2]);if(mo<1||mo>12)return null;return `${m[1]}-${m[2]}-01`}
const n=(v:unknown,d=0)=>Number.isFinite(Number(v))?Number(v):d;

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);
  try{
    const u=Deno.env.get("SUPABASE_URL"),k=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),a=Deno.env.get("ADMIN_SESSION_SECRET");
    if(!u||!k||!a)throw new Error("Configuración interna incompleta");
    const sb=createClient(u,k,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})),accion=String(body?.accion||""),d=body?.datos||{};

    async function currentPeriod(clienteId:string){const q=await sb.from("clientes").select("periodo_pendiente").eq("id",clienteId).single();if(q.error)throw q.error;return firstMonth(q.data?.periodo_pendiente)}
    async function recalc(clienteId:string){const periodo=await currentPeriod(clienteId);if(!periodo)return 0;const q=await sb.from("trato_justo_compensaciones").select("monto").eq("cliente_id",clienteId).eq("periodo",periodo).eq("activo",true);if(q.error)throw q.error;const total=(q.data||[]).reduce((s:any,x:any)=>s+n(x.monto),0);const up=await sb.from("clientes").update({descuento_fallas:total}).eq("id",clienteId);if(up.error)throw up.error;return total}


    // Un reporte autenticado NO concede una compensación.
    if(accion==="reportar_incidencia"){
      const tok=req.headers.get("X-Client-Token")||"";
      const session=await verify(tok,k,"goxion_client");
      if(!session?.cliente_id)return res({ok:false,error:"Sesión del cliente no válida"},401);
      const clienteId=String(session.cliente_id),serviceId=String(d.cliente_servicio_id||"").trim();
      const descripcion=String(d.descripcion||"").trim();
      const inicio=String(d.fecha_inicio_declarada||"").trim();
      if(!/^[0-9a-f-]{36}$/i.test(serviceId)||descripcion.length<12||descripcion.length>1500)
        return res({ok:false,error:"Selecciona un servicio y describe la incidencia (12 a 1500 caracteres)"},400);
      const q=await sb.from("cliente_servicios").select("id,cliente_id,nombre,activo")
        .eq("id",serviceId).eq("cliente_id",clienteId).eq("activo",true).maybeSingle();
      if(q.error)throw q.error;
      if(!q.data)return res({ok:false,error:"El servicio no pertenece a esta cuenta o no está activo"},403);
      const periodo=await currentPeriod(clienteId);
      if(!periodo)return res({ok:false,error:"No fue posible determinar el periodo de servicio"},409);
      const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",
        year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      if(inicio&&(!/^\d{4}-\d{2}-\d{2}$/.test(inicio)||inicio>today||
        inicio<periodo))return res({ok:false,error:"La fecha declarada no pertenece al periodo actual"},400);
      const open=await sb.from("goxion_garantia_incidencias").select("id,reportado_en")
        .eq("cliente_id",clienteId).eq("cliente_servicio_id",serviceId)
        .eq("periodo",periodo).eq("estado","reportada").limit(1).maybeSingle();
      if(open.error)throw open.error;
      if(open.data)return res({ok:true,incidencia_id:open.data.id,estado:"reportada",
        reportado_en:open.data.reportado_en,repetida:true});
      const insert=await sb.from("goxion_garantia_incidencias")
        .insert({cliente_id:clienteId,cliente_servicio_id:serviceId,periodo,
          descripcion,fecha_inicio_declarada:inicio||null})
        .select("id,reportado_en,estado").single();
      if(insert.error)throw insert.error;
      const name=await sb.from("clientes").select("nombre").eq("id",clienteId).maybeSingle();
      const notification=await sb.from("notificaciones_admin").insert({
        cliente_id:clienteId,cliente_nombre:name.data?.nombre||null,
        tipo:"garantia_incidencia",titulo:"Falla reportada · Garantía de Continuidad",
        mensaje:"Servicio: "+String(q.data.nombre||"Servicio").slice(0,120)+
          "\nReporte registrado en Mi Espacio. Requiere verificar causa y días antes de compensar.",
        referencia:"garantia:"+insert.data.id,leida:false
      });
      if(notification.error)console.warn("Aviso de incidencia pendiente",notification.error.message);
      return res({ok:true,incidencia_id:insert.data.id,estado:"reportada",
        reportado_en:insert.data.reportado_en,compensacion_automatica:false});
    }

    if(accion==="mis_incidencias"){
      const session=await verify(req.headers.get("X-Client-Token")||"",k,"goxion_client");
      if(!session?.cliente_id)return res({ok:false,error:"Sesión del cliente no válida"},401);
      const q=await sb.from("goxion_garantia_incidencias")
        .select("id,cliente_servicio_id,periodo,estado,reportado_en,fecha_inicio_declarada")
        .eq("cliente_id",String(session.cliente_id))
        .order("reportado_en",{ascending:false}).limit(50);
      if(q.error)throw q.error;
      return res({ok:true,incidencias:q.data||[]});
    }

    if(accion==="listar_cliente"){
      const tok=req.headers.get("X-Client-Token")||"";const p=await verify(tok,k,"goxion_client");if(!p?.cliente_id)return res({ok:false,error:"Sesión de cliente inválida o expirada"},401);
      const periodo=await currentPeriod(String(p.cliente_id));
      const q=await sb.from("trato_justo_compensaciones").select("id,cliente_servicio_id,periodo,dias_falla,porcentaje,monto,motivo,activo,created_at,updated_at,cliente_servicios(nombre,monto)").eq("cliente_id",p.cliente_id).eq("periodo",periodo).eq("activo",true).order("created_at");if(q.error)throw q.error;
      return res({ok:true,periodo,compensaciones:q.data||[]});
    }

    const tok=req.headers.get("X-Admin-Token")||"";const p=await verify(tok,a,"goxion_admin");if(!p)return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);


    if(accion==="listar_incidencias"){
      const q=await sb.from("goxion_garantia_incidencias")
        .select("id,cliente_id,cliente_servicio_id,periodo,descripcion,fecha_inicio_declarada,reportado_en,estado,origen,dias_completos_verificados,verificado_desde,verificado_hasta,evidencia_verificacion,verificado_en,cliente_servicios(nombre),clientes(nombre)")
        .order("reportado_en",{ascending:false}).limit(250);
      if(q.error)throw q.error;
      return res({ok:true,incidencias:q.data||[]});
    }

    if(accion==="resolver_incidencia"){
      const id=String(d.id||"").trim();
      const origen=String(d.origen||"");
      const decision=String(d.estado||"");
      const evidencia=String(d.evidencia_verificacion||"").trim();
      const desde=String(d.verificado_desde||"");
      const hasta=String(d.verificado_hasta||"");
      const dias=Number(d.dias_completos_verificados);
      if(!/^[0-9a-f-]{36}$/i.test(id)||
        !["validada","descartada"].includes(decision)||
        !["goxion","plataforma_externa","cliente","otro"].includes(origen))
        return res({ok:false,error:"Resolución u origen no válido"},400);
      if(decision==="validada"&&(origen!=="goxion"||
        !Number.isInteger(dias)||dias<1||dias>10||
        !/^\d{4}-\d{2}-\d{2}$/.test(desde)||
        !/^\d{4}-\d{2}-\d{2}$/.test(hasta)||
        hasta<desde||evidencia.length<12))
        return res({ok:false,error:"La cobertura comercial exige origen GOXION, evidencia y días completos verificados"},400);
      const q=await sb.from("goxion_garantia_incidencias").select("id,estado,periodo,reportado_en")
        .eq("id",id).maybeSingle();
      if(q.error)throw q.error;
      if(!q.data)return res({ok:false,error:"Incidencia inexistente"},404);
      if(q.data.estado!=="reportada")return res({ok:false,error:"Incidencia ya resuelta"},409);
      const update={estado:decision,origen,
        dias_completos_verificados:decision==="validada"?dias:0,
        verificado_desde:decision==="validada"?desde:null,
        verificado_hasta:decision==="validada"?hasta:null,
        evidencia_verificacion:evidencia||null,
        verificado_por:"admin:trato-justo",verificado_en:new Date().toISOString(),
        updated_at:new Date().toISOString()};
      const saved=await sb.from("goxion_garantia_incidencias")
        .update(update).eq("id",id).eq("estado","reportada").select("id,estado,origen,dias_completos_verificados").maybeSingle();
      if(saved.error)throw saved.error;
      if(!saved.data)return res({ok:false,error:"Incidencia actualizada por otro operador"},409);
      return res({ok:true,incidencia:saved.data,compensacion_automatica:false});
    }

    if(accion==="listar_todas"){
      const q=await sb.from("trato_justo_compensaciones").select("id,cliente_id,cliente_servicio_id,periodo,dias_falla,porcentaje,monto,motivo,activo,created_at,updated_at").order("created_at");if(q.error)throw q.error;return res({ok:true,compensaciones:q.data||[]});
    }

    if(accion==="guardar_compensaciones_masivas"){
      const clienteIds=Array.isArray(d.cliente_ids)?[...new Set(d.cliente_ids.map((x:unknown)=>String(x||"").trim()).filter(Boolean))]:[];
      const servicioId=String(d.servicio_id||"").trim(),servicioNombre=String(d.servicio_nombre||"").trim();
      const periodo=firstMonth(d.periodo),dias=Math.max(1,Math.min(10,Math.trunc(n(d.dias_falla,1)))),motivo=String(d.motivo||"Falla técnica").trim()||"Falla técnica";
      if(!clienteIds.length)return res({ok:false,error:"Selecciona al menos un cliente"},400);
      if(!servicioId&&!servicioNombre)return res({ok:false,error:"Selecciona un servicio"},400);
      if(!periodo)return res({ok:false,error:"Periodo inválido"},400);
      if(clienteIds.length>200)return res({ok:false,error:"Demasiados clientes en una sola operación"},400);

      let sq=sb.from("cliente_servicios").select("id,cliente_id,servicio_id,nombre,monto,activo").in("cliente_id",clienteIds).eq("activo",true);
      sq=servicioId?sq.eq("servicio_id",servicioId):sq.eq("nombre",servicioNombre);
      const sr=await sq;if(sr.error)throw sr.error;
      const servicios=sr.data||[];
      const servicioRowIds=servicios.map((x:any)=>String(x.id));
      const matchedIds=new Set(servicios.map((x:any)=>String(x.cliente_id)));
      const noElegibles=clienteIds.filter(id=>!matchedIds.has(id));

      let existentes:any[]=[];
      if(servicioRowIds.length){
        const ex=await sb.from("trato_justo_compensaciones").select("id,cliente_id,cliente_servicio_id,periodo,activo").in("cliente_servicio_id",servicioRowIds).eq("periodo",periodo);
        if(ex.error)throw ex.error;existentes=ex.data||[];
      }
      const exMap=new Map(existentes.map((x:any)=>[String(x.cliente_servicio_id),x]));
      // Incidencias verificadas: vínculo opcional para trazabilidad, nunca condición para operar Admin.
      const proofIds=await sb.from("goxion_garantia_incidencias")
        .select("id,cliente_servicio_id,dias_completos_verificados").eq("periodo",periodo)
        .eq("estado","validada").eq("origen","goxion")
        .in("cliente_servicio_id",servicioRowIds);
      if(proofIds.error)throw proofIds.error;
      const proofMap=new Map<string,any>();
      for(const entry of proofIds.data||[]){
        if(Number(entry.dias_completos_verificados)>=dias)
          proofMap.set(String(entry.cliente_servicio_id),entry);
      }

      const porcentaje=dias*5;
      let creadas=0,actualizadas=0,totalCompensacion=0;
      const resultados:any[]=[];

      for(const s of servicios){
        const base=n(s.monto),monto=Math.round(base*(porcentaje/100)*100)/100;
        const payload={cliente_id:String(s.cliente_id),cliente_servicio_id:String(s.id),periodo,dias_falla:dias,porcentaje,monto,motivo,...(proofMap.has(String(s.id))?{incidencia_id:proofMap.get(String(s.id)).id}:{}),activo:true,updated_at:new Date().toISOString()};
        const ex=exMap.get(String(s.id));
        const r=ex?.id
          ?await sb.from("trato_justo_compensaciones").update(payload).eq("id",ex.id).select().single()
          :await sb.from("trato_justo_compensaciones").insert(payload).select().single();
        if(r.error)throw r.error;
        if(ex?.id)actualizadas++;else creadas++;
        totalCompensacion+=monto;
        resultados.push({cliente_id:String(s.cliente_id),cliente_servicio_id:String(s.id),nombre:s.nombre,monto_base:base,monto_compensacion:monto,actualizada:Boolean(ex?.id)});
      }

      for(const clienteId of matchedIds)await recalc(String(clienteId));

      const titulo="Trato Justo masivo aplicado";
      const mensaje=`${servicioNombre||"Servicio"} · ${periodo.slice(0,7)} · ${dias} día${dias===1?"":"s"} · ${porcentaje}% · ${matchedIds.size} cliente${matchedIds.size===1?"":"s"}`;
      const nr=await sb.from("notificaciones_admin").insert({cliente_id:null,cliente_nombre:null,tipo:"trato_justo_masivo",titulo,mensaje,referencia:periodo.slice(0,7),leida:true});
      if(nr.error)console.error("No se pudo registrar resumen Trato Justo masivo",nr.error);

      return res({ok:true,accion,periodo,dias_falla:dias,porcentaje,clientes_solicitados:clienteIds.length,clientes_aplicados:matchedIds.size,servicios_aplicados:servicios.length,creadas,actualizadas,no_elegibles:noElegibles,total_compensacion:Math.round(totalCompensacion*100)/100,resultados});
    }

    if(accion==="guardar_compensacion"){
      const clienteId=String(d.cliente_id||""),servicioId=String(d.cliente_servicio_id||"");
      const incidenciaId=String(d.incidencia_id||"");
      const periodo=firstMonth(d.periodo),dias=Math.max(1,Math.min(10,Math.trunc(n(d.dias_falla,1)))),motivo=String(d.motivo||"Garantía de Continuidad").trim()||"Garantía de Continuidad";
      if(!clienteId||!servicioId||!periodo)
        return res({ok:false,error:"Cliente, servicio o periodo inválido"},400);
      // El reporte del cliente es OPCIONAL: se puede atender por WhatsApp,
      // presencialmente o desde Admin. Solo se comprueba cuando el operador
      // decide asociar voluntariamente un expediente existente.
      let incidenciaVerificada:string|null=null;
      if(incidenciaId){
        if(!/^[0-9a-f-]{36}$/i.test(incidenciaId))
          return res({ok:false,error:"Referencia de incidencia inválida"},400);
        const proof=await sb.from("goxion_garantia_incidencias")
          .select("id,cliente_id,cliente_servicio_id,periodo,estado,origen,dias_completos_verificados")
          .eq("id",incidenciaId).maybeSingle();
        if(proof.error)throw proof.error;
        if(!proof.data||String(proof.data.cliente_id)!==clienteId||
          String(proof.data.cliente_servicio_id)!==servicioId||
          String(proof.data.periodo)!==periodo||proof.data.estado!=="validada"||
          proof.data.origen!=="goxion"||
          dias>Number(proof.data.dias_completos_verificados))
          return res({ok:false,error:"El expediente proporcionado no corresponde a esta compensación"},409);
        incidenciaVerificada=incidenciaId;
      }
      const sq=await sb.from("cliente_servicios").select("id,cliente_id,nombre,monto,activo").eq("id",servicioId).single();if(sq.error)throw sq.error;if(String(sq.data.cliente_id)!==clienteId)return res({ok:false,error:"El servicio no pertenece al cliente"},400);
      const base=n(sq.data.monto),porcentaje=dias*5,monto=Math.round(base*(porcentaje/100)*100)/100;
      const ex=await sb.from("trato_justo_compensaciones").select("id").eq("cliente_servicio_id",servicioId).eq("periodo",periodo).maybeSingle();if(ex.error)throw ex.error;
      const payload={cliente_id:clienteId,cliente_servicio_id:servicioId,periodo,dias_falla:dias,porcentaje,monto,motivo,...(incidenciaVerificada?{incidencia_id:incidenciaVerificada}:{}),activo:true,updated_at:new Date().toISOString()};
      const r=ex.data?.id?await sb.from("trato_justo_compensaciones").update(payload).eq("id",ex.data.id).select().single():await sb.from("trato_justo_compensaciones").insert(payload).select().single();if(r.error)throw r.error;
      const total=await recalc(clienteId);
      return res({ok:true,compensacion:r.data,total_periodo:total,servicio:{nombre:sq.data.nombre,monto:base}});
    }

    if(accion==="eliminar_compensacion"){
      const id=String(d.id||"");if(!id)return res({ok:false,error:"Falta id"},400);
      const q=await sb.from("trato_justo_compensaciones").select("id,cliente_id").eq("id",id).single();if(q.error)throw q.error;
      const up=await sb.from("trato_justo_compensaciones").update({activo:false,updated_at:new Date().toISOString()}).eq("id",id);if(up.error)throw up.error;
      const total=await recalc(String(q.data.cliente_id));return res({ok:true,total_periodo:total});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible procesar Trato Justo"},500)}
});