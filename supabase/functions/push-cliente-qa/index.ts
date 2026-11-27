import {createClient} from "https://esm.sh/@supabase/supabase-js@2.116.0";
import webpush from "npm:web-push@3.6.7";
import {qaOrigin,endpointValid,subscriptionValid,payloadFor,signed} from "./policy.mjs";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type,x-client-token,x-gx-dispatch,apikey,authorization","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store"};
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const fail=(status:number,error:string)=>reply({ok:false,error},status);
const check=(r:any)=>{if(r.error)throw new Error("database");return r.data};
const uuid=(s:unknown)=>typeof s==="string"&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s);
async function cfg(sb:any,generate=false){
  const get=async()=>check(await sb.from("goxion_push_qa_config").select("*").eq("singleton",true).single());
  let c=await get();
  if(generate&&!c.public_key){
    const k=webpush.generateVAPIDKeys();
    check(await sb.from("goxion_push_qa_config").update({public_key:k.publicKey,private_key:k.privateKey}).eq("singleton",true).is("public_key",null));
    c=await get();
  }
  return c;
}
async function send(d:any,c:any,tipo:string,id:string){
  if(!endpointValid(d.endpoint))return {accepted:false,gone:false};
  try{
    // generateRequestDetails produces encrypted web-push body and VAPID authorization.
    // Native fetch with redirect:error prevents redirect-based SSRF.
    const details=webpush.generateRequestDetails({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth_key}},JSON.stringify(payloadFor(tipo,id)),{
      TTL:300,urgency:"normal",vapidDetails:{subject:"https://henrygonzalezestrada-cyber.github.io/goxion/",publicKey:c.public_key,privateKey:c.private_key}
    });
    const response=await fetch(details.endpoint,{method:"POST",headers:details.headers,body:details.body,redirect:"error",signal:AbortSignal.timeout(9000)});
    await response.body?.cancel();
    return {accepted:response.status>=200&&response.status<300,gone:[404,410].includes(response.status)};
  }catch{return {accepted:false,gone:false};}
}
Deno.serve(async(req)=>{
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return fail(405,"Método no permitido");
  try{
    const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(url!==qaOrigin||!key)return fail(503,"Sólo aceptación aislada");
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const raw=await req.text();if(raw.length>12000)return fail(413,"Solicitud demasiado grande");
    const b=JSON.parse(raw),action=b.accion,d=b.datos||{};
    if(action==="dispatch"){
      const c=await cfg(sb);
      if(!req.headers.get("x-gx-dispatch")||req.headers.get("x-gx-dispatch")!==c.dispatch_secret)return fail(401,"No autorizado");
      if(!c.public_key)return reply({ok:true,accepted:0,failed:0});
      const rows=check(await sb.rpc("goxion_push_qa_claim"))||[];
      let accepted=0,failed=0;
      for(let i=0;i<rows.length;i+=5)await Promise.all(rows.slice(i,i+5).map(async(n:any)=>{
        const current=check(await sb.from("goxion_push_qa_devices").select("id").eq("id",n.device_id).gt("expires_at",new Date().toISOString()).maybeSingle());
        if(!current)return;
        const r=await send(n,c,n.tipo,n.notification_id);
        if(r.accepted)accepted++;else failed++;
        if(r.gone)check(await sb.from("goxion_push_qa_devices").delete().eq("id",n.device_id));
        else check(await sb.from("goxion_push_qa_deliveries").update({state:r.accepted?"accepted":"failed"}).eq("device_id",n.device_id).eq("notification_id",n.notification_id));
      }));
      return reply({ok:true,accepted,failed});
    }
    const session=await signed(req.headers.get("x-client-token"),key);
    if(!session)return fail(401,"Inicia sesión nuevamente");
    const cliente=check(await sb.from("clientes").select("id,usuario_acceso,estado").eq("id",session.cliente_id).maybeSingle());
    if(!cliente||!["qa-v2-finanzas","qa-v2-b2","qa-v2-beneficios","qa-v2-beneficios-retest","qa-v2-vencido","qa-v2-nuevo"].includes(String(cliente.usuario_acceso).toLowerCase())||String(cliente.estado).toLowerCase()==="suspendido")return fail(403,"Piloto no disponible");
    const cid=cliente.id,devices=()=>sb.from("goxion_push_qa_devices");
    if(action==="config"){
      const c=await cfg(sb,true);
      return reply({ok:true,publicKey:c.public_key});
    }
    if(action==="activar"){
      if(!subscriptionValid(d.subscription))return fail(400,"Suscripción inválida");
      const s=d.subscription;
      const existing=check(await devices().select("id,cliente_id,p256dh,auth_key").eq("endpoint",s.endpoint).maybeSingle());
      if(existing){
        if(existing.cliente_id!==cid||existing.p256dh!==s.keys.p256dh||existing.auth_key!==s.keys.auth)return fail(409,"Desactiva este dispositivo antes de cambiar de cuenta");
        check(await devices().update({expires_at:new Date(Date.now()+30*86400000).toISOString()}).eq("id",existing.id).eq("cliente_id",cid));
        return reply({ok:true,deviceId:existing.id});
      }
      const count=await devices().select("id",{count:"exact",head:true}).eq("cliente_id",cid);
      if(count.error)throw Error("database");
      if((count.count||0)>=5)return fail(409,"Máximo de dispositivos de prueba");
      const row=check(await devices().insert({cliente_id:cid,endpoint:s.endpoint,p256dh:s.keys.p256dh,auth_key:s.keys.auth}).select("id").single());
      return reply({ok:true,deviceId:row.id});
    }
    if(!uuid(d.deviceId))return fail(400,"Dispositivo inválido");
    if(action==="desactivar"){
      check(await devices().delete().eq("id",d.deviceId).eq("cliente_id",cid));return reply({ok:true});
    }
    if(action==="estado"){
      const row=check(await devices().select("id,expires_at").eq("id",d.deviceId).eq("cliente_id",cid).maybeSingle());
      return reply({ok:true,active:!!row&&Date.parse(row.expires_at)>Date.now()});
    }
    if(action==="probar"){
      const row=check(await devices().update({last_test_at:new Date().toISOString()}).eq("id",d.deviceId).eq("cliente_id",cid)
        .gt("expires_at",new Date().toISOString()).or("last_test_at.is.null,last_test_at.lt."+new Date(Date.now()-60000).toISOString()).select("id,endpoint,p256dh,auth_key").maybeSingle());
      if(!row)return fail(429,"Dispositivo no disponible o prueba reciente");
      const c=await cfg(sb);if(!c.public_key)return fail(503,"Envío no disponible");
      const r=await send(row,c,"test",crypto.randomUUID());
      if(r.gone)check(await devices().delete().eq("id",row.id).eq("cliente_id",cid));
      return r.accepted?reply({ok:true,accepted:true}):fail(502,"El proveedor no aceptó el aviso; revisa permisos y vuelve a activar");
    }
    return fail(400,"Acción no disponible");
  }catch{console.error("push-qa: operación no completada");return fail(500,"No fue posible completar la operación");}
});
