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

/* Historial de solo lectura, exclusivamente del cliente autenticado.
   No interpreta un cobro como renovación de una plataforma. */
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return answer({ok:false,error:"Método no permitido."},405);
 try{
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"",url=Deno.env.get("SUPABASE_URL")||"";
  const session=await signed(req.headers.get("X-Client-Token")||"",key,"goxion_client");
  if(!session)return answer({ok:false,error:"Inicia sesión nuevamente."},401);
  const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const id=String(session.cliente_id);
  const {data:client,error:ce}=await sb.from("clientes").select("id,estado").eq("id",id).maybeSingle();
  if(ce)throw ce;
  if(!client||String(client.estado||"").toLowerCase()==="suspendido")return answer({ok:false,error:"Cuenta no disponible."},403);
  const {data:legal,error:le}=await sb.rpc("goxion_legal_estado_acceso",{p_cliente_id:id});
  if(le)throw le;
  if(legal?.restringido===true)return answer({ok:true,restringido:true,altas:[],beneficios:[],aplicaciones:[]});
  const [services,benefits,applications,proofs,credits,proofLinks]=await Promise.all([
   sb.from("cliente_servicios").select("id,nombre,created_at").eq("cliente_id",id).order("created_at",{ascending:false}).limit(500),
   sb.from("beneficios_programados").select("id,origen,origen_ref,tipo,valor,estado,created_at").eq("cliente_id",id).in("origen",["misiones","referidos"]).order("created_at",{ascending:false}).limit(500),
   sb.from("beneficio_aplicaciones").select("id,beneficio_id,periodo,monto_aplicado,estado,created_at").eq("cliente_id",id).eq("estado","consumido").order("created_at",{ascending:false}).limit(500),
   sb.from("goxion_b2_comprobantes").select("id,periodo,monto_reportado_centavos,estado,aprobado_en,creado_en").eq("cliente_id",id).order("creado_en",{ascending:false}).limit(500),
   sb.from("goxion_b2_abonos_aprobados").select("operation_id,cargo_id,monto_centavos,fecha_aprobacion,creado_en").eq("cliente_id",id).order("creado_en",{ascending:false}).limit(500),
   sb.from("goxion_b2_comprobante_aplicaciones").select("reporte_id,cargo_id,operation_id,monto_centavos,goxion_b2_comprobantes!inner(cliente_id)").eq("goxion_b2_comprobantes.cliente_id",id).order("creado_en",{ascending:false}).limit(1000)
  ]);
  const err=services.error||benefits.error||applications.error||proofs.error||credits.error||proofLinks.error;if(err)throw err;
  const links=(proofLinks.data||[]).map(({reporte_id,cargo_id,operation_id,monto_centavos})=>({reporte_id,cargo_id,operation_id,monto_centavos}));
  return answer({ok:true,altas:services.data||[],beneficios:benefits.data||[],aplicaciones:applications.data||[],comprobantes_b2:proofs.data||[],abonos_b2:credits.data||[],vinculos_b2:links,limitado:[services,benefits,applications,proofs,credits].some(x=>(x.data||[]).length===500)||links.length===1000});
 }catch(e){console.error("historial-cliente",e);return answer({ok:false,error:"No pudimos consultar el historial adicional."},500)}
});