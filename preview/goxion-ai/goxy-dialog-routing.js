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

 // Domain context: ephemeral labels only, no messages or private account values.
 function createConversation(){
   let topic=null,pending=null;
   const reset=()=>{topic=null;pending=null;};
   const noteAccount=t=>{topic=t;pending=null;};
   const noteSupport=()=>noteAccount('support');
   const action=(kind,label,extra={})=>({kind,label,...extra});
   const account=()=>action('account','Abrir Mi Espacio');
   const human=()=>action('policy-support','Hablar con un asesor');
   const catalog=()=>action('catalog','Explorar catálogo');
   const payment=()=>action('pay-open','Revisar mi cuenta y comprobantes');
   const reply=(answer,choices)=>({answer,choices});
   function consume(text,{platform=null,brands=[],activePlatforms=[]}={}){
     const n=normalize(text);if(!n)return null;
     const buy=/(?:\b(?:quiero|quisiera|deseo|necesito|me gustaria|puedo|como|donde|para)\b.{0,28}\b(?:contratar|adquirir|comprar|agregar|anadir|sumar)\b|^(?:contratar|adquirir|comprar|agregar|anadir|sumar)\b)/.test(n)&&!/\b(me pide|me sale|me aparece|para entrar|para iniciar sesion|error|no me deja|ya contrate|ya compre|no quiero|no puedo|no se|cancelar)\b/.test(n);
     const cancel=/\b(quiero|quisiera|necesito|deseo|puedo|voy a|me gustaria)\s+(cancelar|dar de baja|quitar)\b|^(cancelar|dar de baja)(?:\s|$)/.test(n)&&!/\b(como|cuando|reembolso|politica|terminos|que pasa|si cancelo|no quiero|no puedo|ya cancel)\b/.test(n);
     const disputed=/\b(no (?:lo |la |me )?(?:reclame|canjee|recibi|use|utilice|solicite|hice|pedi|aparece|llego|sale|tengo)|no es cierto|no reconozco|no fui yo|no es correcto|esta mal)\b/.test(n);
     const confused=/^(?:pero )?(eso que|que es eso|a que te refieres|que significa eso|no entiendo|no entendi|explicame|como asi|por que|porque|y entonces|y ahora que)$/.test(n);
     const payProblem=/\b(pago|comprobante|transferencia|deposito|abono)\b/.test(n)&&/\b(no (?:se |me )?(?:ha |a |esta )?(?:complet\w*|acredit\w*|registr\w*|reflej\w*|aparec\w*|aplic\w*|proces\w*|confirm\w*|lleg\w*|sale)|rechaz\w*|pendiente|en revision|sigue sin|no veo)\b/.test(n);
     const explicit=buy||cancel||payProblem||brands.length>0||/\b(misiones?|cupon\w*|lealtad|promocion\w*|prorroga|pago|saldo|acceso|contrasena|pin|referid\w*)\b/.test(n);
     if(/^(?:hola )?(quien eres(?: tu)?|que eres|como te llamas|cual es tu nombre|eres una ia|eres un robot|eres humano)$/.test(n)){
       reset();return reply('Soy Goxy, tu asistente de GOXION. Puedo ayudarte con tus servicios, pagos, beneficios y contrataciones. Si algo necesita revisión, te conecto con nuestro equipo.',[account(),catalog(),action('platforms','Ayuda con mis servicios')]);
     }
     if(topic==='cancel'&&!explicit&&/^(no|mejor no|olvidalo|ya no quiero|ya no)$/.test(n)){reset();return reply('De acuerdo, no he solicitado ninguna cancelación.',[account()]);}
     if(cancel||(pending==='cancel'&&brands.length===1&&n===normalize(brands[0]))){
       topic='cancel';pending=null;
       if(brands.length===1)return reply('Para solicitar la cancelación de '+brands[0]+', abre Mi Espacio y selecciona ese servicio. Allí podrás revisar las condiciones y confirmar la solicitud. No he cancelado nada.',[account(),action('policy-doc','Consultar condiciones',{view:'terminos'})]);
       pending='cancel';return reply('Entiendo. ¿Qué servicio te gustaría cancelar?',[...activePlatforms.slice(0,8).map(p=>action('conversation-reply','Cancelar '+p)),account()]);
     }
     if(buy&&!/\b(pago|saldo|factura|prorroga)\b/.test(n)){
       noteAccount('catalog');return reply(brands.length===1?'¡Claro! Puedes consultar los planes disponibles de '+brands[0]+' en Catálogo. Ahí verás el precio y las promociones vigentes.':'¡Claro! ¿Tienes alguna plataforma en mente o prefieres explorar los planes y promociones disponibles?',[catalog(),action('promotions','Ver promociones')]);
     }
     if(topic==='catalog'&&brands.length===1&&n===normalize(brands[0]))return reply('En Catálogo puedes revisar las opciones disponibles de '+brands[0]+' y su precio antes de contratar.',[catalog(),action('promotions','Ver promociones')]);
     if(payProblem||(topic==='payment'&&!explicit&&disputed)){
       topic='payment';pending='payment-review';return reply('Entiendo. Si ya pagaste y todavía no aparece acreditado, revisemos el comprobante en tu cuenta. No puedo determinar la causa sin comprobar su estado.',[payment(),human()]);
     }
     if((topic==='missions'||topic==='loyalty')&&((!explicit&&(disputed||confused))||(disputed&&/\b(cupon\w*|recompensa\w*|beneficio\w*|lealtad)\b/.test(n)&&!brands.length&&!/\b(pago|prorroga|contratar|cancelar)\b/.test(n)))){
       const mission=topic==='missions';pending='benefit-review';
       return reply(disputed?(mission?'Entiendo, me dices que no reconoces lo que figura sobre tu recompensa. Podemos revisar el estado en Mi Espacio y pedir al equipo que compruebe la discrepancia.':'Entiendo que el estado de tu beneficio no coincide con lo que esperabas. Podemos pedir una revisión.'):(mission?'Me refiero a las misiones y recompensas de tu cuenta. Si el estado del cupón no coincide con lo que hiciste, podemos revisarlo.':'Me refiero al estado de tu beneficio de lealtad.'),[account(),human()]);
     }
     if(topic==='payment'&&!explicit&&(confused||(pending==='payment-review'&&/^(si|ya pague|ya lo envie|ya mande|ya lo mande|ya lo hice)$/.test(n))))return reply('Me refería a la información de pago de tu cuenta. ¿Quieres revisar el saldo, la próxima fecha o un comprobante?',[action('payment','Consultar pago'),payment(),human()]);
     if(topic==='catalog'&&!explicit&&confused)return reply('Me refiero a los planes que puedes contratar en GOXION. Puedes revisar precios y disponibilidad antes de decidir.',[catalog()]);
     if(pending==='cancel'&&!explicit&&confused)return reply('Necesito saber qué servicio quieres dar de baja. No se ha realizado ninguna cancelación.',[account(),human()]);
     if(brands.length||platform)noteSupport();
     return null;
   }
   function fallback(){return reply('Quiero entender bien lo que necesitas. ¿Se trata de tu cuenta, contratar un servicio o resolver un problema con una plataforma?',[account(),catalog(),action('platforms','Ayuda con plataformas'),human()]);}
   return Object.freeze({consume,noteAccount,noteSupport,reset,fallback,get:()=>({topic,pending})});
 }
 window.GOXY_DIALOG_ROUTING=Object.freeze({classify,normalize,chatGuide,createConversation});
})();