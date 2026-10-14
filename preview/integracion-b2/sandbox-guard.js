/* GOXION · Espejo aislado de interfaz. No concede acceso ni escribe datos.
 * Activado sólo en /preview/integracion-b2/. Bloquea red de escritura aun
 * cuando un usuario quite ?demo=1 de la URL. Nunca instalar en producción.
 */
(function(){
 "use strict";
 if(!/\/preview\/integracion-b2\/(?:index|ayuda)\.html$/.test(location.pathname))return;
 const params=new URLSearchParams(location.search);
 const integratedBeta=params.get("f3")==="1"&&
   params.get("demo")!=="1"&&params.get("cliente")!=="b2-demo";
 window.GOXION_B2_MIRROR=Object.freeze({demo:!integratedBeta,
   writeBlocked:!integratedBeta,integratedBeta});
 // Sólo un token de cliente existente y las dos funciones B2 aprobadas
 // pueden escribir desde la beta explícita. Todo el resto sigue sellado.
 const nativeFetch=window.fetch.bind(window);
 const denied=()=>new Response(JSON.stringify({ok:false,error:"Espejo visual: operación no disponible."}),{
  status:403,headers:{"Content-Type":"application/json"}
 });
 window.fetch=function(input,init){
  const url=typeof input==="string"?input:input?.url||"";
  const method=String(init?.method||input?.method||"GET").toUpperCase();
  let target;
  try{target=new URL(url,location.href)}catch{return Promise.resolve(denied());}
  if(method!=="GET"){
    const given=new Headers(init?.headers||input?.headers||{});
    const clientToken=localStorage.getItem("goxion_client_token")||"";
    // Las cuatro lecturas del Index original son POST pero NO cobran.
    // El token es el que expide GOXION; no se permite modo de escritura heredado.
    let body=null;
    try{body=typeof init?.body==="string"?JSON.parse(init.body):null}catch{}
    const readActions=Object.freeze({
      "/functions/v1/mi-espacio":[""],
      "/functions/v1/periodo-cobro":["obtener_periodo"],
      "/functions/v1/trato-justo":["listar_cliente"],
      "/functions/v1/estado-cuenta-beta":["mi_estado"],
      "/functions/v1/estado-financiero":["mi_estado"],
      "/functions/v1/estado-financiero-b2-beta":[
        "mi_estado","mi_prorroga","cotizar_prorroga_auto","activar_prorroga_auto"]
    });
    const action=String(body?.accion||"");
    const readAllowed=readActions[target.pathname]?.includes(action)===true &&
      (target.pathname!=="/functions/v1/mi-espacio"||
        (body===null||Object.keys(body).length===0));
    const b2Upload=target.pathname==="/functions/v1/comprobantes-b2-beta"&&
      init?.body instanceof FormData;
    const allowed=integratedBeta&&method==="POST"&&clientToken.length>20&&
      given.get("X-Client-Token")===clientToken&&
      target.origin==="https://hmpevcwodcgbkviarfic.supabase.co"&&
      (readAllowed||b2Upload);
    return allowed?nativeFetch(input,init):Promise.resolve(denied());
  }
  if(target.origin!==location.origin
    && !["fonts.googleapis.com","fonts.gstatic.com","cdn.jsdelivr.net"].includes(target.hostname))
    return Promise.resolve(denied());
  return nativeFetch(input,init);
 };
 if(navigator.sendBeacon) {
  try{navigator.sendBeacon=()=>false}catch(_){}
 }
 document.addEventListener("click",event=>{
   const link=event.target.closest?.("a[href]");
   if(!link)return;
   try{
     const target=new URL(link.href,location.href);
     if(!["http:","https:"].includes(target.protocol)||target.origin!==location.origin||
       !target.pathname.includes("/preview/integracion-b2/")){
       event.preventDefault();event.stopImmediatePropagation();
     }
   }catch{event.preventDefault()}
 },true);
 document.addEventListener("submit",event=>event.preventDefault(),true);
 const originalOpen=window.open.bind(window);
 window.open=function(url,...args){
  if(/^https?:/i.test(String(url||""))){
    const destination=new URL(url,location.href);
    if(destination.origin!==location.origin||
       !destination.pathname.includes("/preview/integracion-b2/"))
      return null;
  }
  return originalOpen(url,...args);
 };
})();