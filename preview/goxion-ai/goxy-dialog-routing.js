/* GOXION · Clasificación local de conversación, sin llamadas ni datos de cuenta.
 * No sustituye al motor financiero, políticas V2 ni guías oficiales.
 */
(()=>{
 'use strict';
 const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+]+/g,' ').trim();
 const symptom=/\b(no abre|no carga|no funciona|no reproduce|no inicia sesion|no puedo entrar|no puedo iniciar|no me deja entrar|no me deja acceder|no me deja iniciar|no me deja ver|pantalla negra|sin sonido|se congela|se cierra|error|falla|bloquead[oa]|caducad[oa]|contr[a-z]* incorrecta|no llego la invitacion|no me llego la invitacion)\b/;
 const follow=/^(ya (lo )?(hice|intente|probe|revise)|sigue (igual|fallando|sin funcionar)|todavia no funciona|aun no funciona|no funciono|no sirvio|no resolvio|mismo problema|ya lo intente y sigue igual)$/;
 function classify(query,context={},resolveAll=()=>[]){
   const n=normalize(query);
   const brands=resolveAll(query)||[];
   if(!n)return {kind:'empty'};
   if(/^(gracias(?: goxy)?|muchas gracias|mil gracias|perfecto gracias|excelente gracias|ok gracias|muchas gracias goxy)$/.test(n))return {kind:'thanks'};
   if(/^(ya funciona|ya funciono|ya quedo|ya se resolvio|se resolvio|lo resolvi|ya pude entrar|ya pude iniciar sesion|solucionado|resuelto)$/.test(n))return {kind:'resolved'};
   if(/^(adios|hasta luego|nos vemos|hasta pronto)$/.test(n))return {kind:'farewell'};
   if(/^(si|no|ok|vale|bien|de acuerdo|entendido|perfecto|claro)$/.test(n)&&!context.accessStage)return {kind:'ack'};
   if(/\b(hablar con|contactar|comunicarme con|quiero un|necesito un|pasame con|atencion humana)\b/.test(n)&&/\b(asesor|humano|persona|whatsapp)\b/.test(n)||/^(asesor|humano|whatsapp|asesor humano|atencion humana)$/.test(n))return {kind:'human'};
   if(brands.length>1&&symptom.test(n))return {kind:'multiple',brands};
   const brand=brands.length===1?brands[0]:null;
   if(brand&&symptom.test(n))return {kind:'symptom',brand};
   if(brand&&n===normalize(brand))return {kind:'brand',brand};
   if(context.platform&&follow.test(n))return {kind:'follow',brand:context.platform};
   if(context.awaitingSymptom&&!brand&&/^(en (mi |la |el )?)?(smart tv|fire tv|roku|televisor|tv|celular|telefono|tablet|tableta|computadora|laptop|pc)$/.test(n))return {kind:'device',device:n};
   return {kind:'normal',brand};
 }
 window.GOXY_DIALOG_ROUTING=Object.freeze({classify,normalize});
})();