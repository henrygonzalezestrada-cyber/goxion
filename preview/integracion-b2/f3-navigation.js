/* F3 beta · mantener el trayecto dentro de las pantallas espejo,
 * sin enviar accidentalmente al estado de cuenta oficial. */
(function(){
 "use strict";
 if(!window.GOXION_B2_MIRROR?.integratedBeta)return;
 const original=window.irAlTicket;
 window.irAlTicket=function(){
   const key=String(window.goxionCurrentClientKey||"").trim();
   if(!key||!/^[\w-]{2,80}$/.test(key)){
     // No redirigir a producción sin una identidad de sesión comprobada.
     console.warn("F3 B2: falta clave de cliente autenticado.");
     return;
   }
   location.href="./preview/integracion-b2/index.html?f3=1&cliente="+
     encodeURIComponent(key);
 };
 window.GOXION_B2_F3_NAV=Object.freeze({modo:"espejo_autenticado"});
})();