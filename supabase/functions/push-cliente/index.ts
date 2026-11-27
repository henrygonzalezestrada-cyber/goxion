import {createClient} from "https://esm.sh/@supabase/supabase-js@2.116.0";
import webpush from "npm:web-push@3.6.7";
import {projectAllowed,endpointValid,subscriptionValid,categoriesValid,DEFAULT_CATEGORIES,payloadFor,providerOutcome,signed} from "./policy.mjs";

const cors={"Access-Control-Allow-Origin":"https://henrygonzalezestrada-cyber.github.io","Access-Control-Allow-Headers":"content-type,x-client-token,x-gx-dispatch,apikey,authorization","Access-Control-Allow-Methods":"POST, OPTIONS","Cache-Control":"no-store"};
const reply=(data:object,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}});
const fail=(status:number,error:string)=>reply({ok:false,error},status);
const check=(r:any)=>{if(r.error)throw Error("database");return r.data};
const uuid=(s:unknown)=>typeof s==="string"&&/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s);
async function config(sb:any,generate=false){
  const get=async()=>{const rows=check(await sb.rpc("goxion_push_key_config"));if(rows?.length!==1)throw Error("config");return rows[0]};
  let c=await get();
  if(generate&&!c.public_key){
    const k=webpush.generateVAPIDKeys();
    if(!check(await sb.rpc("goxion_push_init_keys",{p_public:k.publicKey,p_private:k.privateKey})))throw Error("keys");
    c=await get();
  }
  return c;
}
async function send(d:any,c:any,test:boolean,id:string){
  if(!endpointValid(d.endpoint)||!c.public_key||!c.private_key)return "failed";
  try {
    const details=webpush.generateRequestDetails({endpoint:d.endpoint,keys:{p256dh:d.p256dh,auth:d.auth_key}},JSON.stringify(payloadFor(test,id)),{
      TTL:300,urgency:"normal",vapidDetails:{subject:"https://henrygonzalezestrada-cyber.github.io/goxion/",publicKey:c.public_key,privateKey:c.private_key}
    });
    const response=await fetch(details.endpoint,{method:"POST",headers:details.headers,body:details.body,redirect:"error",signal:AbortSignal.timeout(9000)});
    await response.body?.cancel();
    return providerOutcome(response.status);
  }catch{return "failed";} // Unknown outcome: never retry blindly.
}
Deno.serve(async(req)=>{
  const origin=req.headers.get("origin");
  if(origin&&origin!==cors["Access-Control-Allow-Origin"])return fail(403,"Origen no autorizado");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
  if(req.method!=="POST")return fail(405,"Método no permitido");
  try{
    const url=Deno.env.get("SUPABASE_URL")||"",key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
    if(!projectAllowed(url)||!key)return fail(503,"Canal no disponible");
    const sb=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
    const raw=await req.text();if(raw.length>12000)return fail(413,"Solicitud demasiado grande");
    let b:any;try{b=JSON.parse(raw)}catch{return fail(400,"Solicitud inválida")}
    if(!b||typeof b!=="object"||Array.isArray(b))return fail(400,"Solicitud inválida");
    const action=b.accion,d=b.datos||{};
    if(action==="dispatch"){
      const c=await config(sb);
      if(!req.headers.get("x-gx-dispatch")||req.headers.get("x-gx-dispatch")!==c.dispatch_secret)return fail(401,"No autorizado");
      const rows=check(await sb.rpc("goxion_push_claim"))||[];
      let accepted=0,retry=0,failed=0;
      for(let i=0;i<rows.length;i+=4)await Promise.all(rows.slice(i,i+4).map(async(n:any)=>{
        const current=check(await sb.rpc("goxion_push_send_current",{p_device:n.device_id,p_notice:n.notification_id,p_attempt:n.attempt}))||[];
        const outcome=current.length===1?await send(current[0],c,false,n.notification_id):"failed";
        check(await sb.rpc("goxion_push_finish",{p_device:n.device_id,p_notice:n.notification_id,p_attempt:n.attempt,p_result:outcome}));
        if(outcome==="accepted")accepted++;else if(outcome==="retryable"&&n.attempt<3)retry++;else failed++;
      }));
      return reply({ok:true,accepted,retry,failed});
    }
    const session=await signed(req.headers.get("x-client-token"),key);
    if(!session)return fail(401,"Inicia sesión nuevamente");
    const cid=session.cliente_id,devices=()=>sb.from("goxion_push_devices");
    const eligible=check(await sb.rpc("goxion_push_eligible",{p_cliente_id:cid}))===true;
    if(action==="elegibilidad")return reply({ok:true,eligible});
    // Owner can revoke even after the pilot or legal gate expires.
    if(action==="desactivar"&&uuid(d.deviceId)){
      check(await devices().delete().eq("id",d.deviceId).eq("cliente_id",cid));return reply({ok:true});
    }
    if(!eligible)return fail(403,"Avisos aún no disponibles en esta cuenta");
    if(action==="config"){
      const c=await config(sb,true);
      return reply({ok:true,publicKey:c.public_key,defaults:DEFAULT_CATEGORIES});
    }
    if(action==="activar"){
      if(!subscriptionValid(d.subscription)||!categoriesValid(d.categories))return fail(400,"Revisa tu selección de avisos");
      const s=d.subscription;
      const id=check(await sb.rpc("goxion_push_register",{p_cliente_id:cid,p_endpoint:s.endpoint,p_p256dh:s.keys.p256dh,p_auth:s.keys.auth,p_categories:d.categories}));
      if(!id)return fail(409,"Dispositivo no disponible o límite del piloto alcanzado");
      return reply({ok:true,deviceId:id});
    }
    if(!uuid(d.deviceId))return fail(400,"Dispositivo inválido");
    if(action==="estado"){
      const row=check(await devices().select("id,expires_at,categories").eq("id",d.deviceId).eq("cliente_id",cid).maybeSingle());
      return reply({ok:true,active:!!row&&Date.parse(row.expires_at)>Date.now(),categories:row?.categories||DEFAULT_CATEGORIES});
    }
    if(action==="preferencias"){
      if(!categoriesValid(d.categories))return fail(400,"Selecciona al menos un tipo de aviso");
      const row=check(await devices().update({categories:d.categories,preferences_at:new Date().toISOString()}).eq("id",d.deviceId).eq("cliente_id",cid).gt("expires_at",new Date().toISOString()).select("id").maybeSingle());
      return row?reply({ok:true}):fail(404,"Dispositivo no disponible");
    }
    if(action==="probar"){
      const row=check(await devices().update({last_test_at:new Date().toISOString()}).eq("id",d.deviceId).eq("cliente_id",cid)
        .gt("expires_at",new Date().toISOString()).or("last_test_at.is.null,last_test_at.lt."+new Date(Date.now()-60000).toISOString()).select("id,endpoint,p256dh,auth_key").maybeSingle());
      if(!row)return fail(429,"Dispositivo no disponible o prueba reciente");
      if(check(await sb.rpc("goxion_push_eligible",{p_cliente_id:cid}))!==true)return fail(403,"Piloto no disponible");
      const c=await config(sb);
      const result=await send(row,c,true,crypto.randomUUID());
      if(result==="gone")check(await devices().delete().eq("id",row.id).eq("cliente_id",cid));
      return result==="accepted"?reply({ok:true,accepted:true}):fail(502,"El proveedor no aceptó el aviso. Revisa permisos y vuelve a activar.");
    }
    return fail(400,"Acción no disponible");
  }catch{console.error("goxion-push: operación no completada");return fail(500,"No fue posible completar la operación");}
});
