/* GOXION · Espejo aislado de interfaz. No concede acceso ni escribe datos.
 * Activado sólo en /preview/integracion-b2/. Bloquea red de escritura aun
 * cuando un usuario quite ?demo=1 de la URL. Nunca instalar en producción.
 */
(function(){
 "use strict";
 if(!/\/preview\/integracion-b2\/(?:index|ayuda)\.html$/.test(location.pathname))return;
 window.GOXION_B2_MIRROR=Object.freeze({demo:true,writeBlocked:true});
 const nativeFetch=window.fetch.bind(window);
 const denied=()=>new Response(JSON.stringify({ok:false,error:"Espejo visual: operación no disponible."}),{
  status:403,headers:{"Content-Type":"application/json"}
 });
 window.fetch=function(input,init){
  const url=typeof input==="string"?input:input?.url||"";
  const method=String(init?.method||input?.method||"GET").toUpperCase();
  if(method!=="GET")return Promise.resolve(denied());
  let target;
  try{target=new URL(url,location.href)}catch{return Promise.resolve(denied());}
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
     if(!["http:","https:"].includes(target.protocol)||target.origin!==location.origin){
       event.preventDefault();event.stopImmediatePropagation();
     }
   }catch{event.preventDefault()}
 },true);
 document.addEventListener("submit",event=>event.preventDefault(),true);
 const originalOpen=window.open.bind(window);
 window.open=function(url,...args){
  if(/^https?:/i.test(String(url||""))&&new URL(url,location.href).origin!==location.origin)
   return null;
  return originalOpen(url,...args);
 };
})();