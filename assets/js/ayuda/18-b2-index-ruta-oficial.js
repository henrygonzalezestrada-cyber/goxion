/* F5 · Entrada opt-in al Index multifecha sin alterar cobros legados. */
(function(){
 "use strict";
 const old=window.irAlTicket;
 if(typeof old!=="function")return;
 let busy=false;
 window.irAlTicket=async function(...args){
  if(busy)return;
  const token=localStorage.getItem(window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||"")||"";
  const key=String(window.goxionCurrentClientKey||"").trim();
  if(!token||!key)return old.apply(this,args);
  busy=true;
  try{
   const r=await fetch(window.GOXION_CORE.endpoint("estado-financiero-b2-beta"),{
    method:"POST",cache:"no-store",
    headers:{"Content-Type":"application/json","X-Client-Token":token},
    body:JSON.stringify({accion:"mi_estado",datos:{}})
   });
   const json=await r.json().catch(()=>({}));
   if(json.modo==="b2_sin_estado_cobrable"){
    alert("El calendario de pagos de tu cuenta necesita revisión. Contacta a soporte; no realices el pago global.");
    return;
   }
   if(r.ok&&json.ok===true&&json.modo==="b2_multifecha"){
    if(!/^[\w-]{2,80}$/.test(key))throw Error("Identidad de cuenta inválida");
    location.href="./preview/integracion-b2/index.html?f3=1&cliente="+encodeURIComponent(key);
    return;
   }
   // El esquema de fecha única conserva exactamente su Index oficial.
   return old.apply(this,args);
  }catch(error){
   console.warn("GOXION F5: estado financiero no confirmado",String(error).slice(0,120));
   // Fallo cerrado: jamás presentar un cobro global cuando B2 no responde.
   alert("No pudimos verificar tu calendario financiero. Inténtalo nuevamente o contacta a soporte.");
  }finally{busy=false}
 };
})();