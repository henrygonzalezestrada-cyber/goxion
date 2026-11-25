/* GOXION · motor de diagnóstico conversacional.
 * Estado efímero, sin almacenamiento, imágenes, credenciales ni llamadas a IA.
 * Las decisiones de cuenta y autorización permanecen en sus controladores reales.
 */
(()=>{
'use strict';
const k=window.GOXY_SUPPORT;
const norm=s=>k.normalize(s).replace(/(.)\1{2,}/g,'$1');
const rules={
 Netflix:[/\b(codigo|clave de acceso|iniciar sesion con codigo)\b/,/\b(hogar|casa|domicilio|fuera de la familia|no forma parte)\b/,/\b(pantallas? simultaneas|muchos dispositivos|demasiadas pantallas|limite de pantallas|alguien mas (esta )?viendo)\b/],
 'Disney+':[/\b(codigo|verificacion)\b/,/\b(hogar|casa|domicilio|fuera de la familia)\b/],
 Max:[/\b(codigo|vincul\w*|enlaz\w*|activ\w* dispositivo)\b/,/\b(contrasena|password|clave)\b.*\b(incorrect\w*|invalida|no acepta|rechaza|no entra)\b|\b(incorrect\w*|invalida|no acepta|rechaza)\b.*\b(contrasena|password|clave)\b/],
 'Prime Video':[/\b(codigo|registr\w*|vincul\w*|enlaz\w*|activ\w* dispositivo)\b/],
 YouTube:[/\b(invit\w*|grupo familiar|no (me )?llego|no recib\w*|no aparece premium)\b/],
 ViX:[/\b(codigo|vincul\w*|enlaz\w*|iniciar sesion)\b/],
 Crunchyroll:[/\b(codigo|vincul\w*|enlaz\w*|activ\w* dispositivo)\b/],
 Microsoft:[/\b(invit\w*|grupo familiar|no (me )?llego|no recib\w*)\b/],
 'Google One':[/\b(espacio|almacenamiento|beneficio\w*)\b/]
};
const resolved=/\b(ya (me )?(funciona|funciono|sirve|sirvio|quedo|jalo|entro|entre|carga|cargo|se arreglo|se soluciono|pude entrar)|se (arreglo|soluciono)|lo (arregle|resolvi)|solucionado|resuelto)\b/;
const failed=/\b(sigue|continua|todavia|aun|igual|no (me )?(funciona|funciono|sirve|sirvio|deja|carga|cargo|pude|puedo|se arreglo|se soluciono|quedo)|no cambio|mismo problema|sin cambio|volvio a fallar)\b/;
const missing=/\b(no (me )?(aparece|sale|muestra|encuentro|veo|tengo|esta) (esa |la |el |ninguna )?(opcion|boton|aviso|mensaje|actualizar|solicitud)|no (me )?(sale|aparece|encuentro|veo)(?: nada)?$|no hay (esa |la )?opcion)\b/;
const done=/\b(ya (le |lo |la |me )?(pique|di|pulse|toque|presione|hice|intente|probe|actualice|envie|mande|solicite|acepte|reinicie|cerre|abri|revise)|acabo de (enviar|mandar|hacer|intentar|reiniciar|actualizar)|solicitud (enviada|mandada)|ya (esta|quedo) (enviada|mandada)|listo|hecho)\b/;
const human=/\b(asesor|soporte humano|persona|whatsapp|atencion humana)\b/;
const retry=/\b(reinicia\w*|reinicio|restart|vuelve a abrir|cerrar y abrir)\b/;
const vague=/\b(no (me )?(funciona|sirve|deja|carga|abre|puedo entrar)|error|falla|problema|pantalla negra|se traba|se congela|se cierra)\b/;
const unknown=/\b(no se|no entiendo|no conozco|no recuerdo|no alcanzo a leer|sale algo raro|mensaje raro|error raro|no puedo describir)\b/;
const device=/\b(roku|fire tv|smart tv|televisor|tv|celular|telefono|tablet|computadora|laptop|pc)\b/;
const choice=(kind,label,extra={})=>({kind,label,...extra});
const step=(label)=>choice('diagnosis-reply',label);
const support=()=>choice('human','Continuar con asesor');
const image=()=>choice('diagnosis-image','Adjuntar captura');
const issue=(p,i)=>k.guide(p,i);
function match(p,text){
 const n=norm(text),indices=(rules[p]||[]).map((r,i)=>r.test(n)&&issue(p,i)?i:null).filter(i=>i!==null);
 return indices.length===1?indices[0]:null;
}
function create(){
 let state=null;
 const reset=()=>{state=null};
 const get=()=>state?{...state,checks:[...state.checks]}:null;
 function result(answer,choices=[],extra={}){
  return {answer,choices,state:get(),...extra};
 }
 function begin(platform,index,source='text'){
  const g=issue(platform,index);if(!g)return null;
  state={platform,index,issue:g.issue,stage:'step',checks:[],source,visualUsed:source==='image',device:null};
  const home=(platform==='Netflix'&&index===1)||(platform==='Disney+'&&index===1);
  if(home)return result(platform+' está solicitando actualizar el hogar de tu TV. Selecciona «Actualizar hogar» en la pantalla. Cuando envíes la solicitud, nuestro equipo podrá autorizarla.',[step('Ya envié la solicitud'),step('No aparece esa opción')]);
  const instructions=window.GOXY_DIALOG_ROUTING?.chatGuide(g,index);
  return result(instructions||'Revisemos esta situación con el equipo de soporte.',[step('Ya lo intenté'),step('No encuentro esa opción'),step('Ya funciona')]);
 }
 function startRetry(platform,source='text'){
  state={platform,index:null,issue:'La aplicación solicita reiniciarse',stage:'retry',checks:[],source,visualUsed:source==='image',device:null};
  return result((platform?platform+' necesita reiniciarse.':'La aplicación pide reiniciarse.')+' Ciérrala completamente y vuelve a abrirla. ¿Sigue apareciendo el aviso?',[step('Ya funciona'),step('Sigue igual')]);
 }
 function clarify(platform,source='text'){
  state={platform,index:null,issue:'Falla por identificar',stage:'clarify',checks:[],source,visualUsed:source==='image',device:null};
  return result((platform?'Revisemos '+platform+'. ':'')+'¿Aparece algún aviso en pantalla, o la aplicación no abre ni reproduce?',[step('Aparece un aviso'),step('No abre'),step('No reproduce')]);
 }
 function fromVision(d){
  if(!d||typeof d!=='object')return null;
  const p=k.platforms().includes(d.platform)?d.platform:null;
  if(p&&Number.isInteger(d.issueIndex)&&issue(p,d.issueIndex))return begin(p,d.issueIndex,'image');
  if(d.category==='restart')return startRetry(p,'image');
  if(d.category==='unreadable') {
   state={platform:p,index:null,issue:'Captura no legible',stage:'visual-clarify',checks:[],source:'image',visualUsed:true,device:null};
   return result('No alcanzo a identificar el aviso con seguridad. ¿Qué plataforma estás usando y qué parte del mensaje alcanzas a leer? No necesitas reenviar la misma imagen.',[choice('platforms','Elegir plataforma'),step('No puedo leerlo')]);
  }
  state={platform:p,index:null,issue:'Problema identificado en imagen',stage:'visual-clarify',checks:[],source:'image',visualUsed:true,device:null};return result(null,[step('Sigue igual'),step('Ya funciona'),support()]);
 }
 function consume(text,platformHint=null,canImage=false){
  const n=norm(text);if(!n)return null;
  const brands=k.resolveAllPlatforms(text);if(brands.length>1)return null;
  const explicit=brands[0]||null;
  const p=explicit||state?.platform||platformHint;
  if(state&&explicit&&explicit!==state.platform){if(state.platform===null){state.platform=explicit;if(n===norm(explicit))return result('Entendido, es '+explicit+'. ¿Qué sucede al intentar usarlo ahora?',[step('Sigue igual'),step('Ya funciona'),support()]);}else reset();}
  if(!state&&p){
   const i=match(p,text);
   if(i!==null)return begin(p,i);
   if(retry.test(n)&&/\b(pide|dice|aviso|mensaje|solicita|restart)\b/.test(n))return startRetry(p);
   if(unknown.test(n)||/^(aparece un aviso|me sale un aviso|me aparece un aviso)$/.test(n)){clarify(p);return consume(text,p,canImage);}
   if(vague.test(n))return clarify(p);
   return null;
  }
  if(!state)return null;
  if(human.test(n)&&/\b(quiero|necesito|hablar|contactar|pasame|continuar)\b/.test(n))return result(null,[support()],{handoff:true});
  const hasFailure=failed.test(n)||missing.test(n);
  if(!hasFailure&&resolved.test(n)&&!/\b(ya quedo|ya esta) (enviad\w*|mandad\w*|actualizad\w*|solicitad\w*)\b/.test(n)){reset();return result('¡Qué bueno que ya funciona! Si vuelve a ocurrir, aquí estoy.',[choice('platforms','Ayuda con otra plataforma')]);}
  const i=p?match(p,text):null;
  if(i!==null&&i!==state.index)return begin(p,i);
  if(device.test(n))state.device=n.match(device)[0];
  if(state.stage==='step'||state.stage==='await-human'){
   const g=issue(state.platform,state.index);
   const home=(state.platform==='Netflix'||state.platform==='Disney+')&&state.index===1;
   if(missing.test(n)){
    state.stage='locate';
    return result('Entiendo, no encuentras esa opción. ¿Qué botones aparecen en tu TV? Puedes describirlos sin compartir códigos.',[step('Sólo aparece un código'),step('No puedo describirlo'),support()]);
   }
   if(home&&state.stage==='step'&&done.test(n)&&!/\b(envi\w*|mand\w*|solicit\w*|confirm\w*)\b/.test(n)&&!hasFailure){state.stage='confirm-send';return result('Perfecto. ¿La TV confirmó que se envió la solicitud de actualización?',[step('Sí, ya se envió'),step('No, sigue igual')]);}
   if(done.test(n)||hasFailure||state.stage==='await-human'&&/^(si|claro|ok|de acuerdo)$/.test(n)){
    state.stage='await-human';
    const check=home?'Cliente indica que intentó la actualización de hogar':'Cliente indica que siguió el paso de soporte';
    if(!state.checks.includes(check))state.checks.push(check);
    if(g?.requiresHuman||home)return result('Entiendo. '+(home?'La actualización debe ser autorizada por nuestro equipo.':'Esta gestión necesita que el equipo revise o autorice tu acceso.')+' Puedo preparar la solicitud con lo que ya revisamos.',[support(),step('Ya funciona')]);
    return result('Gracias por intentarlo. Como sigue fallando, nuestro equipo puede revisar el caso sin repetir los pasos.',[support(),step('Ya funciona')]);
   }
   if(/^(si|ok|vale|entendido|de acuerdo|claro)$/.test(n))return result('Avísame cuando hayas realizado el paso o si no encuentras la opción.',[step(home?'Ya envié la solicitud':'Ya lo intenté'),step('No aparece esa opción')]);
  }
  if(state.stage==='confirm-send'){
   if(!hasFailure&&/\b(si|envi\w*|mand\w*|confirm\w*|listo)\b/.test(n)){state.stage='await-human';state.checks.push('Cliente confirma envío de solicitud de hogar');return result('Perfecto. Ahora nuestro equipo debe autorizar la actualización. Ya tengo el contexto para preparar tu solicitud.',[support(),step('Ya funciona')]);}
   if(hasFailure||/^(no|aun no|todavia no)$/.test(n)){state.stage='locate';return result('Entendido. ¿Qué aparece después de pulsar la opción? No escribas códigos ni correos.',[step('Sólo aparece un código'),step('No puedo describirlo'),support()]);}
  }
  if(state.stage==='retry'&&(done.test(n)||hasFailure)){
   if(!state.checks.includes('Cliente intentó reiniciar la aplicación'))state.checks.push('Cliente intentó reiniciar la aplicación');
   state.stage='device';
   return result('Gracias por intentarlo. ¿En qué dispositivo sucede? Así no repetimos el reinicio.',[step('Smart TV'),step('Celular'),step('Computadora')]);
  }
  if(state.stage==='device'&&state.device){
   state.checks.push('Dispositivo: '+state.device);state.stage='await-human';
   return result('Ya tengo el problema y el dispositivo. Si sigue fallando después de reiniciar, nuestro equipo puede revisar el caso.',[support(),step('Ya funciona')]);
  }
  if(['clarify','locate','visual-clarify','image-request'].includes(state.stage)){
   if(retry.test(n))return startRetry(p,state.source);
   if(missing.test(n)||unknown.test(n)||/\b(no puedo (mandar|enviar|compartir|describir)|no tengo captura|prefiero no)\b/.test(n)||/^(aparece un aviso|mensaje de error|me sale un error|me aparece un error|sale un aviso)$/.test(n)){
    if(canImage&&!state.visualUsed&&!state.imageRequested&&state.stage!=='image-request'&&!/\b(no puedo (mandar|enviar|compartir)|no tengo captura|prefiero no)\b/.test(n)){
     state.stage='image-request';state.imageRequested=true;
     return result('¿Puedes mostrarme el aviso? Una captura sin datos privados puede ayudarme a identificarlo. Si prefieres, descríbeme el mensaje.',[image(),step('No puedo mandar captura')]);
    }
    state.stage='visual-clarify';
    const message=state.visualUsed?'No hace falta otra foto.':state.imageRequested?'No pasa nada si no puedes enviar una captura.':!canImage?'Por ahora no puedo analizar imágenes desde esta sesión.':'Podemos seguir sin una foto.';
    return result(message+' Dime qué ocurre al intentar entrar o si aparece otro mensaje.',[support(),choice('issues','Ver situaciones conocidas',{platform:p})].filter(x=>x.kind!=='issues'||p));
   }
   if(/\b(no abre|no carga|no reproduce|no arranca|pantalla negra|se cierra|se congela)\b/.test(n)){
    state.issue='Problema de apertura o reproducción';state.stage='retry';
    return result('Prueba cerrar la aplicación completamente y volver a abrirla. ¿Sigue ocurriendo?',[step('Ya funciona'),step('Sigue igual')]);
   }
   if(hasFailure||done.test(n))return result('Entiendo que el problema continúa. ¿Qué mensaje ves ahora? Si no puedes describirlo, podemos pasar el caso al equipo.',[support(),step('No puedo describirlo')]);
  }
  return null;
 }
 return Object.freeze({reset,get,begin,consume,fromVision});
}
window.GOXY_DIAGNOSIS=Object.freeze({create});
})();