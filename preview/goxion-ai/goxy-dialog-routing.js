/* GOXION · Clasificación local de conversación, sin llamadas ni datos de cuenta.
 * No sustituye al motor financiero, políticas V2 ni guías oficiales.
 */
(()=>{
 'use strict';
 const normalize=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9+]+/g,' ').trim();
 const symptom=/\b(no abre|no carga|no funciona(?:n)?|no reproduce|no inicia sesion|no puedo entrar|no puedo iniciar|no me deja entrar|no me deja acceder|no me deja iniciar|no me deja ver|pantalla negra|sin sonido|se congela|se cierra|error|falla|bloquead[oa]|caducad[oa]|contr[a-z]* incorrecta|no llego la invitacion|no me llego la invitacion)\b/;
 const follow=/^(ya (lo )?(hice|intente|probe|revise)|sigue (igual|fallando|sin funcionar)|todavia no funciona|aun no funciona|no funciono|no sirvio|no resolvio|mismo problema|ya lo intente y sigue igual)$/;
 function classify(query,context={},resolveAll=()=>[]){
   const n=normalize(query);
   const brands=resolveAll(query)||[];
   if(!n)return {kind:'empty'};
   if(/^(gracias(?: goxy)?|muchas gracias|mil gracias|perfecto gracias|excelente gracias|ok gracias|muchas gracias goxy)$/.test(n))return {kind:'thanks'};
   if(/^(ya funciona|ya funciono|ya quedo|ya se resolvio|se resolvio|lo resolvi|ya pude entrar|ya pude iniciar sesion|solucionado|resuelto)$/.test(n))return {kind:'resolved'};
   if(/^(adios|hasta luego|nos vemos|hasta pronto)$/.test(n))return {kind:'farewell'};
   if(/^(si|no|ok|vale|bien|de acuerdo|entendido|perfecto|claro)$/.test(n)&&!context.accessStage)return {kind:'ack'};
   if(/\b(hablar con|contactar|comunicarme con|quiero un|necesito un|pasame con|atencion humana)\b/.test(n)&&/\b(asesor|humano|persona|whatsapp)\b/.test(n)||/^(asesor|humano|whatsapp|asesor humano|atencion humana)$/.test(n))return {kind:'human',brand:brands.length===1?brands[0]:null};
   if(brands.length>1&&symptom.test(n))return {kind:'multiple',brands};
   const brand=brands.length===1?brands[0]:null;
   if(brand&&symptom.test(n))return {kind:'symptom',brand};
   if(brand&&n===normalize(brand))return {kind:'brand',brand};
   if(context.platform&&follow.test(n))return {kind:'follow',brand:context.platform};
   if(context.awaitingSymptom&&!brand&&/^(en (mi |la |el )?)?(smart tv|fire tv|roku|televisor|tv|celular|telefono|tablet|tableta|computadora|laptop|pc)$/.test(n))return {kind:'device',device:n};
   return {kind:'normal',brand};
 }
 // Adaptar las instrucciones del formulario de Soporte al canal conversacional.
 // Los pasos se basan en las 13 guías oficiales; nunca pedir secretos ni prometer tiempos.
 const safeSteps={
 'Netflix':['Selecciona «Iniciar Sesión con Código». El código se enviará al correo administrado por GOXION. Solicita asistencia al equipo por el canal oficial.','En tu TV selecciona «Actualizar Hogar». La pantalla enviará una solicitud al correo administrado por GOXION; el equipo debe autorizarla.','Cada perfil individual corresponde a una pantalla, salvo condiciones expresas de tu modalidad. Comprueba que no haya otra TV usando tu perfil. Si continúa, solicita una revisión.'],
 'Disney+':['Ingresa a la app y pulsa «Continuar» con el correo asignado. La plataforma enviará un código al correo administrado por GOXION. Solicita ayuda al equipo.','Selecciona «Actualizar Hogar». Se enviará una solicitud de autorización al correo maestro; el equipo debe gestionarla.'],
 'Max':['En tu TV selecciona «Iniciar Sesión con un Código». Aparecerá un código en pantalla. El equipo debe completar la vinculación por el canal oficial.','Comprueba que no hayas dejado espacios al copiar tus datos. Si no puedes entrar, revisa tus accesos en Mi Espacio o solicita ayuda al equipo.'],
 'Prime Video':['Abre Prime Video y pulsa «Identifícate». Aparecerá un código de registro; el equipo debe enlazar tu dispositivo.'],
 'YouTube':['Revisa la carpeta de spam de Gmail y comprueba que no estés en otro grupo familiar activo. Si no llegó la invitación, solicita que el equipo la revise.'],
 'ViX':['Selecciona «Iniciar Sesión». Si aparece un código alfanumérico en tu TV, el equipo debe gestionar la vinculación.'],
 'Crunchyroll':['Abre «Activar dispositivo» en tu consola o TV. Si aparece un código, el equipo debe autorizar el dispositivo.'],
 'Microsoft':['Solicita al equipo que revise la invitación familiar y, si corresponde, la reenvíe por el canal oficial.'],
 'Google One':['Comprueba que hayas aceptado la invitación de familia en Gmail. Si no aparecen los beneficios, solicita una revisión.']
 };
 const expected={
 'Netflix':['solicitar codigo de acceso','tu tv pide actualizar hogar','limite de pantallas'],
 'Disney+':['codigo de verificacion','mensaje de hogar principal'],
 'Max':['iniciar sesion con codigo','contrasena incorrecta'],
 'Prime Video':['registrar dispositivo'],'YouTube':['no me llego la invitacion'],
 'ViX':['vincular tv o iniciar sesion'],'Crunchyroll':['vincular consola o tv'],
 'Microsoft':['reenviar invitacion familiar'],'Google One':['espacio no reflejado']
 };
 function chatGuide(guide,index){
   const brand=guide?.platform;
   if(normalize(guide?.issue)===expected[brand]?.[index])return safeSteps[brand][index];
   return 'La guía de esta situación necesita una revisión para el chat. Puedes consultar las instrucciones en Soporte o pedir asistencia al equipo.';
 }
 window.GOXY_DIALOG_ROUTING=Object.freeze({classify,normalize,chatGuide});
})();