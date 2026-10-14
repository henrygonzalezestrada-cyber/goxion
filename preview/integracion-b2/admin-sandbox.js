/* F3: Admin espejo de revisión, no un segundo Admin operativo.
 * Bloquea TODA mutación legacy, permitiendo únicamente 3 acciones del
 * gateway B2 tras sesión HMAC administrativa. Sin cliente opt-in no acredita. */
(function(){
 "use strict";
 if(!/\/preview\/integracion-b2\/admin\.html$/.test(location.pathname))return;
 const previous=window.fetch.bind(window);
 const endpoint="https://hmpevcwodcgbkviarfic.supabase.co";
 const allowRead={
  "admin-datos":[""],
  "periodo-cobro":["listar_periodos"],
  "trato-justo":["listar_todas"],
  "estado-cuenta-beta":["listar_admin"],
  "beneficios-admin-beta":["listar"],
  "estado-financiero":["comparar_admin","obtener_admin"]
 };
 const allowB2=["b2_listar_comprobantes","b2_ver_evidencia",
   "b2_aprobar_comprobante"];
 const denied=()=>new Response(JSON.stringify({ok:false,
   error:"Admin F3 beta: esta operación no está habilitada."}),
   {status:403,headers:{"Content-Type":"application/json"}});
 window.GOXION_B2_ADMIN_MIRROR=Object.freeze({writeLegacyBlocked:true});
 window.fetch=function(input,init={}){
  const url=typeof input==="string"?input:input?.url||"";
  let dest;try{dest=new URL(url,location.href)}catch{return Promise.resolve(denied())}
  const method=String(init?.method||input?.method||"GET").toUpperCase();
  if(method==="GET"){
   if(dest.origin===location.origin||
     ["fonts.googleapis.com","fonts.gstatic.com","cdn.jsdelivr.net","esm.sh"].includes(dest.hostname))
    return previous(input,init);
   return Promise.resolve(denied());
  }
  if(method!=="POST"||dest.origin!==endpoint)return Promise.resolve(denied());
  const resource=dest.pathname.replace("/functions/v1/","");
  let data={};try{data=JSON.parse(typeof init.body==="string"?init.body:"{}")}catch{}
  // El login emite sesión Admin; no modifica ni cobra a clientes.
  if(resource==="login-admin"&&String(data.usuario||"").length>0 &&
    String(data.password||"").length>0)return previous(input,init);
  const headers=new Headers(init.headers||input?.headers||{});
  const adminToken=localStorage.getItem("GOXION_ADMIN_TOKEN")||"";
  if(adminToken.length<20||headers.get("X-Admin-Token")!==adminToken)
    return Promise.resolve(denied());
  const action=String(data.accion||"");
  const read=allowRead[resource]?.includes(action)===true&&
    (resource!=="admin-datos"||Object.keys(data).length===0);
  const b2=resource==="acciones-financieras-b2-beta"&&allowB2.includes(action);
  return read||b2?previous(input,init):Promise.resolve(denied());
 };
 if(navigator.sendBeacon)try{navigator.sendBeacon=()=>false}catch{}
 document.addEventListener("submit",e=>e.preventDefault(),true);
})();