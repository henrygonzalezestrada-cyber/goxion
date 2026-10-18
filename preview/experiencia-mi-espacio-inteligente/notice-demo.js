/* E1/B1 · Laboratorio visual AISLADO. Los avisos solo se disparan por interacción
 * en esta beta; en producción requerirían eventos auténticos confirmados.
 * La tarjeta original nunca cambia de tamaño o de estado financiero.
 */
(()=>{
'use strict';
if(!document.documentElement.hasAttribute('data-gx-smart-beta'))return;
const $=id=>document.getElementById(id);
const trigger=$('gx-smart-toggle'),lab=$('gx-smart-lab');
const play=$('gx-smart-preview-alert'),bell=$('gx-smart-notif-button');
const overlay=$('gx-smart-notif-overlay'),sheet=$('gx-smart-notif-sheet');
const list=$('gx-smart-notif-list'),close=$('gx-smart-notif-close');
if(!trigger||!lab||!play||!bell||!overlay||!sheet||!list||!close)return;
const examples=Object.freeze({
 review:{tag:'COMPROBANTE RECIBIDO',title:'Tu comprobante está en revisión',
  detail:'Lo estamos verificando. No necesitas enviarlo otra vez.'},
 correction:{tag:'SE REQUIERE UNA CORRECCIÓN',title:'Tu comprobante tiene una observación',
  detail:'Consulta el detalle antes de volver a enviarlo.'},
 overdue:{tag:'AVISO IMPORTANTE',title:'Hay un servicio con fecha vencida',
  detail:'Revisa el estado de cuenta para conocer el importe confirmado.'},
 extension:{tag:'ACUERDO REGISTRADO',title:'Tu prórroga quedó pactada',
  detail:'Puedes consultar la fecha acordada en tu estado de cuenta.'}
});
let timers=[],effects=[],active=null,stored=null,lastFocus=null;
const delay=(fn,ms)=>{const id=window.setTimeout(fn,ms);timers.push(id);return id};
const clearTimers=()=>{for(const t of timers)clearTimeout(t);timers=[];for(const a of effects)try{a.cancel()}catch{}effects=[]};
function bellCount(on){
 bell.classList.toggle('gx-has-new',on);
 $('gx-smart-notif-count').textContent=on?'1':'';
 bell.setAttribute('aria-label',on?'Abrir una notificación de ejemplo':'Abrir notificaciones del ejemplo');
}
function reset(){
 clearTimers();
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-flight').forEach(n=>n.remove());
 bell.classList.remove('gx-ringing');bellCount(false);stored=null;
 hideSheet();
 const code=window.GOXION_SMART_BETA?.getScenario();
 active=examples[code]||null;
 const mission=code==='mission';
 play.disabled=!active&&!mission;
 play.textContent=mission?'Ver misión pendiente':'Reproducir aviso importante';
 play.title=mission?'Abre la sección de Misiones original de Ayuda':active?
  'Reproduce una actualización ficticia en la tarjeta existente':
  'No se fabrica un aviso cuando no hay un evento importante';
}
function showSheet(){
 if(sheet.classList.contains('show'))return;
 lastFocus=document.activeElement;
 overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
 sheet.inert=false;sheet.classList.add('show');sheet.setAttribute('aria-hidden','false');
 bell.setAttribute('aria-expanded','true');
 document.documentElement.classList.add('gx-notif-open');
 close.focus({preventScroll:true});
}
function hideSheet(){
 if(!sheet.classList.contains('show'))return;
 overlay.classList.remove('show');overlay.setAttribute('aria-hidden','true');
 sheet.classList.remove('show');sheet.setAttribute('aria-hidden','true');sheet.inert=true;
 bell.setAttribute('aria-expanded','false');document.documentElement.classList.remove('gx-notif-open');
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
function recordNotice(item){
 stored=item;
 const line=document.createElement('div');line.className='gx-client-notif-item unread';
 const top=document.createElement('div');top.className='gx-client-notif-item-top';
 const title=document.createElement('strong');title.textContent=item.title;
 const stamp=document.createElement('span');stamp.className='gx-client-notif-time';stamp.textContent='Ahora';
 top.append(title,stamp);
 const body=document.createElement('p');body.textContent=item.detail;
 line.append(top,body);list.replaceChildren(line);
 bellCount(true);
 bell.classList.remove('gx-ringing');void bell.offsetWidth;
 bell.classList.add('gx-ringing');
 delay(()=>bell.classList.remove('gx-ringing'),900);
}
function bellImpact(item){
 recordNotice(item);
 const ring=bell.querySelector('.gx-client-notif-bell');
 if(!ring||window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 const ripple=document.createElement('span');
 ripple.className='gx-smart-notice-impact';
 ripple.setAttribute('aria-hidden','true');
 bell.append(ripple);
 const animation=ripple.animate([
  {transform:'translate(-50%,-50%) scale(.3)',opacity:.78},
  {transform:'translate(-50%,-50%) scale(1.6)',opacity:0}
 ],{duration:480,easing:'cubic-bezier(.13,.8,.3,1)',fill:'forwards'});
 effects.push(animation);
 animation.finished.then(()=>ripple.remove(),()=>ripple.remove());
 delay(()=>ripple.remove(),520);
}
function capsuleFlight(card,item){
 const destination=bell.getBoundingClientRect(),origin=card.getBoundingClientRect();
 // Never cross a screen from a scrolled-off card: state still reaches the bell.
 const visible=origin.bottom>0&&origin.top<innerHeight&&destination.bottom>0&&destination.top<innerHeight;
 if(!visible||typeof document.body.animate==='undefined'&&typeof Element.prototype.animate!=='function'){
  bellImpact(item);return;
 }
 const x=origin.left+origin.width*.5,y=origin.top+Math.min(origin.height*.35,100);
 const targetX=destination.left+destination.width*.5,targetY=destination.top+destination.height*.5;
 const dx=targetX-x,dy=targetY-y;
 const flight=document.createElement('span');flight.className='gx-smart-notice-flight';
 flight.setAttribute('aria-hidden','true');
 flight.style.left=x+'px';flight.style.top=y+'px';
 const core=document.createElement('span');core.className='gx-smart-notice-flight-core';
 const mark=document.createElement('span');mark.className='gx-smart-notice-flight-mark';
 core.append(mark);flight.append(core);document.body.append(flight);
 // Ease along a bent path. Native transform/opacity only (no moving blur filters).
 const bend=dx>=0?Math.min(64,Math.max(18,Math.abs(dx)*.19)):
  -Math.min(64,Math.max(18,Math.abs(dx)*.19));
 const keyframes=[
  {transform:'translate(-50%,-50%) translate(0px,0px) scale(1)',opacity:.0,offset:0},
  {transform:'translate(-50%,-50%) translate('+dx*.08+'px,'+dy*.12+'px) scale(1.04)',opacity:1,offset:.12},
  {transform:'translate(-50%,-50%) translate('+(dx*.48+bend)+'px,'+(dy*.32-18)+'px) scale(.82)',opacity:1,offset:.48},
  {transform:'translate(-50%,-50%) translate('+(dx*.88)+'px,'+(dy*.79-9)+'px) scale(.52)',opacity:.95,offset:.84},
  {transform:'translate(-50%,-50%) translate('+dx+'px,'+dy+'px) scale(.16)',opacity:0,offset:1}
 ];
 const animation=flight.animate(keyframes,{duration:1120,easing:'cubic-bezier(.18,.65,.19,1)',fill:'forwards'});
 effects.push(animation);
 animation.finished.then(()=>flight.remove(),()=>flight.remove());
 delay(()=>flight.remove(),1200);
 delay(()=>bellImpact(item),1040);
}

function preview(){
 const card=$('dash-billing-card');
 if(window.GOXION_SMART_BETA?.getScenario()==='mission'){
  window.GOXION_SMART_MISSIONS?.open?.();
  return;
 }
 if(!active||!card||card.hidden)return;
 clearTimers();
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-flight').forEach(n=>n.remove());
 hideSheet();bellCount(false);stored=null;
 const surface=document.createElement('div');surface.className='gx-smart-notice-surface';
 surface.setAttribute('role','status');surface.setAttribute('aria-live','polite');
 const inner=document.createElement('div');inner.className='gx-smart-notice-inner';
 const mark=document.createElement('span');mark.className='gx-smart-notice-eyebrow';mark.textContent=active.tag;
 const title=document.createElement('strong');title.className='gx-smart-notice-title';title.textContent=active.title;
 const description=document.createElement('p');description.className='gx-smart-notice-desc';description.textContent=active.detail;
 const track=document.createElement('span');track.className='gx-smart-notice-track';track.setAttribute('aria-hidden','true');
 inner.append(mark,title,description);surface.append(inner,track);card.append(surface);
 // Snapshot the event so a later scenario switch cannot assign the old event to the new customer.
 const notice=active;
 requestAnimationFrame(()=>surface.classList.add('gx-smart-notice-visible'));
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 delay(()=>{
  surface.classList.add('gx-smart-notice-leaving');
  if(reduced)bellImpact(notice);
  else capsuleFlight(card,notice);
  delay(()=>surface.remove(),reduced?90:480);
 },reduced?2250:2800);
}
trigger.addEventListener('click',()=>{
 const open=lab.hidden;lab.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
 trigger.classList.toggle('gx-smart-trigger-open',open);
 if(open)$('gx-smart-scenario')?.focus({preventScroll:true});
});
play.addEventListener('click',preview);
bell.addEventListener('click',()=>{
 if(!stored)list.innerHTML='<div class="gx-client-notif-empty"><strong>Sin avisos nuevos</strong><small>Prueba un escenario con una actualización importante.</small></div>';
 showSheet();
 if(stored){list.querySelector('.gx-client-notif-item')?.classList.remove('unread');bellCount(false)}
});
close.addEventListener('click',hideSheet);
overlay.addEventListener('click',hideSheet);
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&sheet.classList.contains('show')){event.preventDefault();hideSheet();}
 if(event.key==='Tab'&&sheet.classList.contains('show')){
  event.preventDefault();close.focus({preventScroll:true});
 }
});
document.addEventListener('gx-smart-case-rendered',reset);
reset();
window.GOXION_SMART_NOTICE=Object.freeze({preview,reset,isolated:true,hasStoredNotice:()=>Boolean(stored)});
})();