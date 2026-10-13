/* GOXION · Vinculación de las DOS betas espejo con estado de prueba.
 * Sólo opera en el escenario ficticio, no modifica cotización SQL ni pagos.
 */
(function(){
 "use strict";
 if(!window.GOXION_B2_MIRROR?.writeBlocked)return;
 const store=window.GOXION_B2_PREVIEW;
 if(!store?.demo)return;
 let value=null;
 try{value=JSON.parse(sessionStorage.getItem("goxion-b2-espejo-pactado")||"null")}catch(_){}
 if(!value?.activo||!/^2026-11-(0[7-9]|1[01])$/.test(value.fecha_pactada))return;
 store.makeDemo("prorroga");
 const due=store.quote?.cargos?.find(c=>c.cargo_id==="b2-demo-1");
 if(due){
  due.fecha_pactada=value.fecha_pactada;
  due.prorroga_estado="aprobada";
 }
})();