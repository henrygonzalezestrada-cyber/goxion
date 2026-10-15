/* Goxy F12 · diagnóstico local de acceso y navegación no sensible. */
(() => {
 'use strict';
 const k=window.GOXY_SUPPORT,ctx=window.GOXY_CLIENT_CONTEXT;
 const norm=s=>k.normalize(String(s||''));
 const isPlatform=p=>k.platforms().includes(p);
 const support=[{kind:'human',label:'Hablar con asesor humano'},{kind:'account',label:'Abrir Mi Espacio'}];
 function routes(platform,what){
   const cards=ctx.destinations?.(platform)||[];
   if(!cards.length)return {reply:'No encuentro '+platform+' en los servicios activos de Mi Espacio. Confirma la contratación antes de volver a pagar.',options:support};
   const good=cards.filter(c=>what==='pin'?c.hasProfile:what==='update'?c.hasPendingPassword:c.hasLogin);
   if(!good.length)return {reply:what==='update'?'No hay una contraseña nueva pendiente de consultar para '+platform+'. Si no logras entrar, un asesor puede revisar el acceso.':'No encuentro ese dato disponible en la tarjeta de '+platform+'. Puedes revisar Mi Espacio o contactar a soporte.',options:support};
   const label=what==='update'?'Abrir aviso de contraseña nueva':what==='pin'?'Consultar perfil y PIN':'Consultar correo de acceso';
   return {reply:what==='update'
     ?'Hay una contraseña actualizada pendiente. Se consulta exclusivamente en Mi Espacio, con su confirmación y visualización única. No aparecerá aquí.'
     :what==='pin'?'El PIN de perfil está en tu tarjeta de Mi Espacio, oculto hasta que pulses Mostrar PIN.'
     :'Tus datos de inicio de sesión están en la tarjeta de Mi Espacio. Consúltalos allí sin escribirlos en este chat.',
     options:[...good.map(c=>({kind:'open-service',serviceIndex:c.index,view:what==='update'?'credential':'profile',label:label+' · '+c.label})),...support]};
 }
 function inspect(input,platform,stage){
   const n=norm(input),found=k.resolvePlatform(input)||platform;
   if(/\bbixby\b/.test(n) && !platform)return {reply:'¿Te refieres a ViX, la plataforma de streaming, o a Bixby del teléfono?',options:[{kind:'confirm-vix',label:'ViX'},{kind:'platforms',label:'Otra plataforma'}]};
   const pin=/\b(pin|perfil|nombre de usuario)\b/.test(n)&&/\b(olvide|olvido|consultar|mostrar|donde|cual|recuperar|no recuerdo)\b/.test(n);
   const pw=/\b(contrasena|password|clave de acceso)\b/.test(n)&&/\b(nueva|cambio|cambiaron|actualizada|olvide|consultar|recuperar|no recuerdo)\b/.test(n);
   if(pin||pw){
     if(!found)return {reply:'¿De qué plataforma necesitas consultar esos datos?',stage:{type:'pick',what:pin?'pin':'update'},options:[{kind:'platforms',label:'Elegir plataforma'}]};
     return {...routes(found,pin?'pin':'update'),platform:found,stage:null};
   }
   if(stage?.type==='premium'&&found){
     if(/\b(solo|solamente|unicamente)\b.*\b(qr|codigo)\b|\b(no aparece|sin opcion|no hay)\b.*\b(correo|contrasena)\b/.test(n))return {reply:'Si solamente aparece un QR o código, es necesario que GOXION vincule el dispositivo. No compartas el código aquí; prepararé los datos del caso para el asesor.',platform:found,stage:null,handoff:'Vinculación por QR'};
     if(/\b(correo|email|usuario|si puedo|si aparece)\b/.test(n))return {...routes(found,'login'),platform:found,stage:null};
   }
   if(stage?.type==='pick'&&found)return {...routes(found,stage.what),platform:found,stage:null};
   if(found && /\b(contratar|premium|suscribirme|suscripcion|pagar para entrar)\b/.test(n)){
     if(!(ctx.destinations?.(found)||[]).length)return {reply:'No encuentro '+found+' contratado en esta sesión. Comprueba tu servicio antes de volver a pagar.',stage:null,platform:found,options:support};
     return {reply:'Tu servicio '+found+' aparece contratado. A veces se cierra la sesión y la aplicación vuelve a mostrar Contratar Premium. ¿Te permite iniciar con correo y contraseña, o únicamente ves un QR?',stage:{type:'premium',platform:found},platform:found,options:[{kind:'premium-email',label:'Puedo usar correo y contraseña',platform:found},{kind:'premium-qr',label:'Solo aparece QR o código',platform:found}]};
   }
   return null;
 }
 function navigate(index,view,platform,doc){
   if(!Number.isInteger(index)||index<0||!isPlatform(platform))return false;
   const get=window.getCurrentClientKey;
   const client=typeof get==='function'?get():null;
   if(!client || !(ctx.destinations?.(platform)||[]).some(d=>d.index===index && (view!=='credential'||d.hasPendingPassword)))return false;
   window.switchTab?.('inicio');
   window.setTimeout(()=>{
     if(get?.()!==client)return;
     const card=doc.getElementById('gx-service-card-'+index);
     if(!card)return;
     if(!card.classList.contains('expanded'))card.querySelector('.gx-service-summary')?.click?.();
     card.scrollIntoView?.({behavior:'smooth',block:'center'});
     if(view==='credential')window.setTimeout(()=>{
       if(get?.()!==client)return;
       doc.getElementById('gx-credential-notice-'+index)?.click?.();
     },650);
   },250);
   return true;
 }
 window.GOXY_ACCESS=Object.freeze({inspect,routes,navigate});
})();