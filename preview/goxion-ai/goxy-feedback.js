/* GOXION · Feedback UI; PulsoIcon thumbs-up/down shapes and turn recipe.
 * Source: CityPulso/PulsoIcon-Package packages/core/src/icons/thumbs-{up,down}.ts.
 * ISC and upstream shape credits: ../mi-espacio-v2/pulsoicon-LICENSE.txt.
 * Solid paths: Tabler Icons, MIT, Copyright (c) 2020-2026 Paweł Kuna.
 * No messages, images, account values or identifiers in request payload.
 */
(()=>{
'use strict';
const DATA={"1":{"outline":["M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z","M7 10v12"],"solid":["M13 3a3 3 0 0 1 2.995 2.824l.005 .176v4h2a3 3 0 0 1 2.98 2.65l.015 .174l.005 .176l-.02 .196l-1.006 5.032c-.381 1.626 -1.502 2.796 -2.81 2.78l-.164 -.008h-8a1 1 0 0 1 -.993 -.883l-.007 -.117l.001 -9.536a1 1 0 0 1 .5 -.865a2.998 2.998 0 0 0 1.492 -2.397l.007 -.202v-1a3 3 0 0 1 3 -3z","M5 10a1 1 0 0 1 .993 .883l.007 .117v9a1 1 0 0 1 -.883 .993l-.117 .007h-1a2 2 0 0 1 -1.995 -1.85l-.005 -.15v-7a2 2 0 0 1 1.85 -1.995l.15 -.005h1z"],"angle":12},"-1":{"outline":["M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z","M17 14V2"],"solid":["M13 21.008a3 3 0 0 0 2.995 -2.823l.005 -.177v-4h2a3 3 0 0 0 2.98 -2.65l.015 -.173l.005 -.177l-.02 -.196l-1.006 -5.032c-.381 -1.625 -1.502 -2.796 -2.81 -2.78l-.164 .008h-8a1 1 0 0 0 -.993 .884l-.007 .116l.001 9.536a1 1 0 0 0 .5 .866a2.998 2.998 0 0 1 1.492 2.396l.007 .202v1a3 3 0 0 0 3 3z","M5 14.008a1 1 0 0 0 .993 -.883l.007 -.117v-9a1 1 0 0 0 -.883 -.993l-.117 -.007h-1a2 2 0 0 0 -1.995 1.852l-.005 .15v7a2 2 0 0 0 1.85 1.994l.15 .005h1z"],"angle":-12}};
const REASONS=[['understanding','No entendió'],['incorrect','Información incorrecta'],['unresolved','No resolvió'],['repetitive','Respuesta repetitiva'],['other','Otro motivo']];
const TOPICS=['identity','catalog','payment','missions','loyalty','promotions','cancel','support','policy','other'];
const SOURCES=['local','official','ai','vision'];
const ns='http://www.w3.org/2000/svg';
function semanticReply(intent){
 const action=(kind,label,extra={})=>({kind,label,...extra});
 const account=action('account','Abrir Mi Espacio');
 const human=action('policy-support','Hablar con un asesor');
 const catalog=action('catalog','Explorar catálogo');
 const map={
 identity:['Soy Goxy, tu asistente de GOXION. Puedo orientarte sobre servicios, cuenta, beneficios y contrataciones.',[account,catalog]],
 catalog:['Parece que quieres conocer o contratar un servicio. En Catálogo puedes consultar las opciones y precios vigentes.',[catalog,action('promotions','Ver promociones')]],
 payment:['¿Quieres consultar cuánto tienes pendiente o tu próxima fecha de pago?',[action('payment','Consultar mi pago'),account]],
 payment_review:['Si ya pagaste y no aparece acreditado, revisa el comprobante en tu cuenta. No puedo confirmar su estado sin consultarlo.',[action('pay-open','Revisar mi comprobante'),human]],
 missions:['¿Quieres consultar tus misiones o recompensas?',[action('missions','Mis misiones'),account]],
 loyalty:['Puedo ayudarte a consultar tu beneficio de lealtad.',[action('policy-loyalty','Consultar mi nivel'),account]],
 promotions:['Puedes revisar las ofertas vigentes antes de contratar.',[action('promotions','Ver promociones'),catalog]],
 cancel:['¿Quieres solicitar la baja de un servicio? Puedes elegirlo desde Mi Espacio y revisar las condiciones antes de confirmar. No he cancelado nada.',[account,action('policy-doc','Consultar condiciones',{view:'terminos'})]],
 support:['Cuéntame qué plataforma presenta el problema y qué aparece en pantalla. No incluyas datos privados.',[action('platforms','Elegir plataforma'),human]],
 human:['Claro, podemos continuar con nuestro equipo de atención.',[human]],
 policy:['¿Qué condición quieres consultar? Puedes revisar los documentos oficiales o hablar con nuestro equipo.',[action('policy-doc','Consultar condiciones',{view:'terminos'}),human]],
 clarify:['Quiero entender bien lo que necesitas. ¿Es sobre tu cuenta, contratar un servicio o resolver un problema con una plataforma?',[account,catalog,action('platforms','Ayuda con plataformas'),human]]
 };
 const v=Object.hasOwn(map,intent)?map[intent]:map.clarify;
 return {answer:v[0],choices:v[1],topic:TOPICS.includes(intent)?intent:intent==='payment_review'?'payment':'other'};
}
function nextVote(current,requested){return current===requested?0:requested;}
function icon(doc,value,selected){
 const svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 svg.setAttribute('fill',selected?'currentColor':'none');svg.setAttribute('stroke',selected?'none':'currentColor');
 svg.setAttribute('stroke-width','1.65');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 for(const d of DATA[value][selected?'solid':'outline']){const p=doc.createElementNS(ns,'path');p.setAttribute('d',d);svg.appendChild(p);}
 return svg;
}
function attach({doc,node,topic,source,send,isCurrent,reducedMotion}){
 if(!node?.parentNode||!globalThis.crypto?.randomUUID)return null;
 const id=crypto.randomUUID();let vote=0,reason=null,busy=false,lastSave=0;
 topic=TOPICS.includes(topic)?topic:'other';source=SOURCES.includes(source)?source:'local';
 const row=doc.createElement('div');row.className='gxai-feedback';row.setAttribute('role','group');row.setAttribute('aria-label','Valorar respuesta');
 const buttons=[1,-1].map(v=>{
   const b=doc.createElement('button');b.type='button';b.className='gxai-vote';b.dataset.vote=String(v);
   b.setAttribute('aria-label',v===1?'Respuesta útil':'Respuesta no útil');b.setAttribute('aria-pressed','false');b.appendChild(icon(doc,v,false));row.appendChild(b);
   b.addEventListener('click',()=>{void save(nextVote(vote,v),null,b);});return b;
 });
 const status=doc.createElement('span');status.className='gxai-feedback-status';status.setAttribute('role','status');row.appendChild(status);
 const panel=doc.createElement('div');panel.className='gxai-feedback-reasons';panel.hidden=true;
 const reasonButtons=REASONS.map(([value,label])=>{const b=doc.createElement('button');b.type='button';b.textContent=label;b.className='gxai-feedback-reason';b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{void save(-1,reason===value?null:value);});panel.appendChild(b);return [value,b];});
 row.appendChild(panel);node.appendChild(row);
 function render(){
  buttons.forEach((b,i)=>{const v=i===0?1:-1;const selected=vote===v;b.setAttribute('aria-pressed',String(selected));b.replaceChildren(icon(doc,v,selected));b.disabled=busy;});
  panel.hidden=vote!==-1;reasonButtons.forEach(([v,b])=>{b.setAttribute('aria-pressed',String(reason===v));b.disabled=busy;});
 }
 async function save(next,why,button){
  if(busy||!isCurrent()||!row.isConnected)return;
  busy=true;buttons.forEach(b=>b.disabled=true);reasonButtons.forEach(([,b])=>b.disabled=true);
  status.textContent='Guardando…';
  const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  let motion=Promise.resolve();
  if(button&&!reducedMotion()){
    const s=button.querySelector('svg');const a=DATA[Number(button.dataset.vote)].angle;
    const animation=s?.animate?.([{transform:'rotate(0deg)'},{transform:'rotate('+a+'deg)'},{transform:'rotate(0deg)'}],{duration:700,easing:'ease-in-out'});
    if(animation?.finished)motion=Promise.race([animation.finished.catch(()=>{}),delay(750)]);
  }
  // Wait locally for the server's one-second update guard; never retry a write.
  const pause=Math.max(0,1100-(Date.now()-lastSave));
  if(pause)await delay(pause);
  if(!isCurrent()||!row.isConnected)return;
  let res;try{res=await send({responseId:id,topic,source,vote:next,reason:why});}catch{res={ok:false};}
  if(res?.ok===true&&res.vote===next)lastSave=Date.now();
  await motion;
  busy=false;if(!isCurrent()||!row.isConnected)return;
  if(res?.ok===true&&res.vote===next){vote=next;reason=why;status.textContent=vote===0?'Valoración retirada':vote===1?'Gracias':'Gracias por ayudarnos';}
  else status.textContent=res?.code==='FEEDBACK_LIMIT'?'Límite de valoraciones por hoy':res?.code==='LEARNING_CAPACITY'?'Valoraciones en pausa':'No se guardó. Intenta nuevamente.';
  render();
 }
 return row;
}
window.GOXY_FEEDBACK=Object.freeze({attach,semanticReply,nextVote});
})();