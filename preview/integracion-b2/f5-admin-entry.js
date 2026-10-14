/* F5 · conservar el modal nativo y abrir el cliente B2 remitido por Admin. */
(function(){
 "use strict";
 const params=new URLSearchParams(location.search);
 const key=String(params.get("cliente")||"");
 if(!params.has("f3")||!/^[\w-]{2,80}$/.test(key))return;
 let done=false;
 function open(){
  if(done||typeof clientesDict==="undefined"||!clientesDict?.[key]||
     typeof window.gxOpenPaymentModal!=="function")return;
  done=true;
  window.gxOpenClientFocus?.(key);
  window.gxOpenPaymentModal(key);
  params.delete("cliente");
  history.replaceState(null,"",location.pathname+"?"+params.toString());
 }
 document.addEventListener("DOMContentLoaded",open,{once:true});
 window.addEventListener("goxion:admin:updated",open);
 window.addEventListener("load",open,{once:true});
 // Sólo verificar mientras termina la primera carga de Admin.
 let tries=0;
 const probe=()=>{
  if(done||tries++>=8)return;
  open();if(!done)setTimeout(probe,500);
 };
 probe();
})();