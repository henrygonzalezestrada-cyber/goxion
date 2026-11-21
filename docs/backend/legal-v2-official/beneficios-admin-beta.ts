import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-admin-token, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
};
function res(body:Record<string,unknown>,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json","Cache-Control":"no-store"}})}
function b64b(t:string){const b=t.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(t.length/4)*4,"=");const x=atob(b);return Uint8Array.from(x,c=>c.charCodeAt(0))}
function b64t(t:string){return new TextDecoder().decode(b64b(t))}
async function auth(req:Request){
  const token=(req.headers.get("X-Admin-Token")||"").trim(),p=token.split(".");
  if(p.length!==2)return false;
  const secret=Deno.env.get("ADMIN_SESSION_SECRET");if(!secret)throw new Error("ADMIN_SESSION_SECRET no configurado");
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["verify"]);
  if(!(await crypto.subtle.verify("HMAC",key,b64b(p[1]),new TextEncoder().encode(p[0]))))return false;
  try{const j=JSON.parse(b64t(p[0]));return j.role==="goxion_admin"&&j.exp>Math.floor(Date.now()/1000)}catch{return false}
}
const n=(v:unknown,d=0)=>Number.isFinite(Number(v))?Number(v):d;
function monthStart(v:unknown){const s=String(v||"").trim();const m=s.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);if(!m)return null;const mo=Number(m[2]);if(mo<1||mo>12)return null;return `${m[1]}-${m[2]}-01`;}
function addMonths(iso:string,months:number){const [y,m]=iso.slice(0,7).split("-").map(Number);const d=new Date(Date.UTC(y,m-1+months,1));return d.toISOString().slice(0,10);}
function visual(b:any,currentPeriod:string){
  if(b.estado==="cancelado"||b.activo===false&&b.estado==="cancelado")return "cancelado";
  if(b.estado==="consumido")return "consumido";
  if(b.estado==="finalizado")return "finalizado";
  if(b.modo==="periodos_fijos"){
    const end=addMonths(String(b.periodo_inicio),Number(b.periodos_total||1));
    if(currentPeriod<String(b.periodo_inicio))return "programado";
    if(currentPeriod>=end)return "finalizado";
    return "activo";
  }
  if(currentPeriod<String(b.periodo_inicio))return "programado";
  return "reservado";
}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return res({ok:false,error:"Método no permitido"},405);
  try{
    if(!(await auth(req)))return res({ok:false,error:"Sesión administrativa inválida o expirada"},401);
    const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)throw new Error("Configuración incompleta");
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})),accion=String(body?.accion||"listar"),d=body?.datos||{};
    if(accion==="crear_manual"&&String(d?.cliente_id||"").length>0){
      const g=await sb.rpc("goxion_legal_estado_acceso",{p_cliente_id:String(d.cliente_id)});
      if(g.error)throw g.error;
      if(g.data?.bloquea_operaciones===true)
        return res({ok:false,codigo:"TERMINOS_RECHAZADOS",
          error:"No se pueden programar beneficios nuevos a una cuenta que rechazó los términos."},409);
    }


    async function listar(clienteId=""){
      let q=sb.from("beneficios_programados").select("id,cliente_id,origen,origen_ref,concepto,tipo,valor,modo,periodo_inicio,periodos_total,periodos_consumidos,prioridad,estado,activo,consumido_at,created_at,updated_at").order("created_at",{ascending:false});
      if(clienteId)q=q.eq("cliente_id",clienteId);
      const br=await q;if(br.error)throw br.error;
      const ids=[...new Set((br.data||[]).map((x:any)=>String(x.cliente_id)))];
      const cr=ids.length?await sb.from("clientes").select("id,nombre,folio,periodo_pendiente").in("id",ids):{data:[],error:null} as any;if(cr.error)throw cr.error;
      const cmap=new Map((cr.data||[]).map((c:any)=>[String(c.id),c]));
      const apps=br.data?.length?await sb.from("beneficio_aplicaciones").select("id,beneficio_id,cliente_id,periodo,monto_aplicado,estado,created_at").in("beneficio_id",(br.data||[]).map((x:any)=>x.id)).order("periodo",{ascending:false}):{data:[],error:null} as any;if(apps.error)throw apps.error;
      const amap=new Map<string,any[]>();for(const a of apps.data||[]){const k=String(a.beneficio_id);amap.set(k,[...(amap.get(k)||[]),a]);}
      const beneficios=(br.data||[]).map((b:any)=>{
        const c=cmap.get(String(b.cliente_id));const current=String(c?.periodo_pendiente||new Date().toISOString().slice(0,7)+"-01").slice(0,10);
        return {...b,estado_visual:visual(b,current),cliente:c||null,aplicaciones:amap.get(String(b.id))||[]};
      });
      return beneficios;
    }

    if(accion==="listar"){
      const clienteId=String(d.cliente_id||"").trim();
      return res({ok:true,beneficios:await listar(clienteId)});
    }

    if(accion==="crear_manual"){
      const cliente_id=String(d.cliente_id||"").trim();const concepto=String(d.concepto||"Descuento programado").trim().slice(0,140);
      const tipo=String(d.tipo||"monto")==="porcentaje"?"porcentaje":"monto";const valor=Math.round(n(d.valor)*100)/100;
      const periodos_total=Math.trunc(n(d.periodos_total,1));let periodo_inicio=monthStart(d.periodo_inicio);
      if(!cliente_id)return res({ok:false,error:"Falta cliente"},400);
      if(!concepto)return res({ok:false,error:"Escribe un concepto"},400);
      if(!(valor>0))return res({ok:false,error:"El descuento debe ser mayor a cero"},400);
      if(tipo==="porcentaje"&&valor>100)return res({ok:false,error:"El porcentaje no puede superar 100%"},400);
      if(periodos_total<1||periodos_total>36)return res({ok:false,error:"La duración debe estar entre 1 y 36 periodos"},400);
      const c=await sb.from("clientes").select("id,nombre,folio,periodo_pendiente").eq("id",cliente_id).maybeSingle();if(c.error)throw c.error;if(!c.data)return res({ok:false,error:"Cliente inexistente"},404);
      periodo_inicio=periodo_inicio||String(c.data.periodo_pendiente).slice(0,10);
      const payload={cliente_id,origen:"manual",origen_ref:null,concepto,tipo,valor,modo:"periodos_fijos",periodo_inicio,periodos_total,periodos_consumidos:0,prioridad:100,estado:periodo_inicio>String(c.data.periodo_pendiente)?"programado":"activo",activo:true,updated_at:new Date().toISOString()};
      const q=await sb.from("beneficios_programados").insert(payload).select().single();if(q.error)throw q.error;
      return res({ok:true,beneficio:{...q.data,estado_visual:visual(q.data,String(c.data.periodo_pendiente))}});
    }

    if(accion==="cancelar"){
      const id=String(d.id||"").trim();if(!id)return res({ok:false,error:"Falta beneficio"},400);
      const q=await sb.from("beneficios_programados").update({activo:false,estado:"cancelado",updated_at:new Date().toISOString()}).eq("id",id).select().maybeSingle();if(q.error)throw q.error;if(!q.data)return res({ok:false,error:"Beneficio inexistente"},404);
      return res({ok:true,beneficio:q.data});
    }

    if(accion==="eliminar"){
      const id=String(d.id||"").trim();if(!id)return res({ok:false,error:"Falta beneficio"},400);
      const b=await sb.from("beneficios_programados").select("id,origen").eq("id",id).maybeSingle();if(b.error)throw b.error;if(!b.data)return res({ok:false,error:"Beneficio inexistente"},404);
      if(b.data.origen!=="manual")return res({ok:false,error:"Los beneficios automáticos se conservan como historial; cancélalo si corresponde."},409);
      const a=await sb.from("beneficio_aplicaciones").select("id",{count:"exact",head:true}).eq("beneficio_id",id);if(a.error)throw a.error;
      if((a.count||0)>0)return res({ok:false,error:"Este descuento ya fue aplicado en al menos un periodo. Debe conservarse como historial."},409);
      const q=await sb.from("beneficios_programados").delete().eq("id",id);if(q.error)throw q.error;
      return res({ok:true,eliminado:true});
    }

    return res({ok:false,error:`Acción no reconocida: ${accion}`},400);
  }catch(e){console.error(e);return res({ok:false,error:e instanceof Error?e.message:"No fue posible procesar beneficios"},500)}
});