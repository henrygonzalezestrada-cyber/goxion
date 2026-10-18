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
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-spark').forEach(n=>n.remove());
 bell.classList.remove('gx-ringing');bellCount(false);stored=null;
 hideSheet();
 const code=window.GOXION_SMART_BETA?.getScenario();
 active=examples[code]||null;
 play.disabled=!active;
 play.title=active?'Reproduce una actualización ficticia en la tarjeta existente':'Este estado no tiene un aviso prioritario que reproducir';
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
function sparkTravel(card){
 const destination=bell.getBoundingClientRect(),origin=card.getBoundingClientRect();
 const x=origin.left+origin.width*.5,y=origin.top+Math.min(origin.height*.32,95);
 const dx=destination.left+destination.width*.5-x,dy=destination.top+destination.height*.5-y;
 const point=document.createElement('span');point.className='gx-smart-notice-spark';
 point.style.left=x+'px';point.style.top=y+'px';document.body.append(point);
 if(typeof point.animate==='function'){
  const animation=point.animate([
   {transform:'translate(-50%,-50%) scale(.65)',opacity:0},
   {transform:'translate(-50%,-50%) scale(1.1)',opacity:1,offset:.16},
   {transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) scale(.25)',opacity:.7}
  ],{duration:760,easing:'cubic-bezier(.22,.72,.22,1)',fill:'forwards'});
  effects.push(animation);animation.finished.then(()=>point.remove(),()=>point.remove());
 }else point.remove();
 delay(()=>point.remove(),900);
}
function preview(){
 const card=$('dash-billing-card');
 if(!active||!card||card.hidden)return;
 clearTimers();
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-spark').forEach(n=>n.remove());
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
  if(!reduced)sparkTravel(card);
  delay(()=>surface.remove(),reduced?90:540);
  delay(()=>recordNotice(notice),reduced?0:620);
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