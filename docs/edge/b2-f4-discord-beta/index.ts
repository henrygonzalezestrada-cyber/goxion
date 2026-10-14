// GOXION B2 F4 · Entrega de eventos financieros confirmados.
// El cliente jamás llama este endpoint. Usa exclusivamente la clave servidor.
// Reutiliza el webhook de pagos existente, sin un nuevo canal ni credenciales.
import {createClient} from "https://esm.sh/@supabase/supabase-js@2.116.0";
function reply(data:Record<string,unknown>,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json","Cache-Control":"no-store"
 }});
}
const safe=(v:unknown,max=130)=>String(v||"").trim().slice(0,max).replace(/@/g,"＠");
const date=(v:unknown)=>/^\d{4}-\d\d-\d\d$/.test(String(v))?
  String(v).slice(8,10)+"/"+String(v).slice(5,7)+"/"+String(v).slice(0,4):"—";
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return reply({ok:false,error:"Método no permitido"},405);
 const secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const origin=Deno.env.get("SUPABASE_URL")||"";
 if(!secret||!origin)return reply({ok:false,error:"Sin configuración"},503);
 const sentKey=req.headers.get("X-B2-Dispatch-Key")||"";
 if(!sentKey||sentKey.length!==secret.length)
   return reply({ok:false,error:"Autenticación del despachador requerida"},401);
 // La verificación ocurre antes de consultar cualquier fila del outbox.
 const encoded=new TextEncoder();
 const check=async()=>{
  const h=await crypto.subtle.digest("SHA-256",encoded.encode(secret));
  const v=await crypto.subtle.digest("SHA-256",encoded.encode(sentKey));
  return new Uint8Array(h).every((x,i)=>x===new Uint8Array(v)[i]);
 };
 if(!await check())return reply({ok:false,error:"Autenticación inválida"},401);
 const sb=createClient(origin,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const claimed=await sb.rpc("goxion_b2_f4_claim_discord",{p_limit:5});
 if(claimed.error)return reply({ok:false,error:"No se pudo reclamar aviso"},503);
 const items=Array.isArray(claimed.data)?claimed.data:[];
 const webhook=Deno.env.get("GOXION_PAGOS_WEBHOOK")||"";
 let successful=0,failed=0;
 for(const event of items){
  let delivered=false,error="";
  try{
   if(!webhook||!/^https:\/\/(discord\.com|discordapp\.com)\//.test(webhook))
    throw Error("Webhook de pagos no disponible");
   const title=event.tipo==="prorroga_activada"?
     "📅 Prórroga automática confirmada":"✅ Prórroga cumplida";
   const description=[
    "Cliente: "+safe(event.cliente_nombre,90),
    "Folio: "+safe(event.folio,35),
    "Vencimiento original: "+date(event.fecha_original),
    "Fecha pactada: "+date(event.fecha_pactada),
    "Obligación: "+safe(event.cargo_id,40),
    "Acuerdo: "+safe(event.acuerdo_id,40),
    "Evento: "+safe(event.evento_id,40)
   ].join("\n");
   const outgoing=await fetch(webhook,{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({embeds:[{
      title,description,color:event.tipo==="prorroga_activada"?6607359:3066993,
      footer:{text:"GOXION B2 · Evento confirmado por servidor"}
    }],allowed_mentions:{parse:[]}})
   });
   if(!outgoing.ok)throw Error("Discord HTTP "+outgoing.status);
   delivered=true;
  }catch(e){error=String(e).slice(0,170)}
  try{
   const settled=await sb.rpc("goxion_b2_f4_finish_discord",{
     p_evento_id:event.evento_id,p_ok:delivered,p_error:error||null
   });
   if(settled.error)throw settled.error;
   if(delivered)successful++;else failed++;
  }catch(e){
   failed++;console.error("B2 F4 fallo finalización",safe(e,120));
  }
 }
 return reply({ok:true,procesados:items.length,enviados:successful,
  pendientes_reintento:failed,contrato:"goxion-b2-eventos-v1"});
});