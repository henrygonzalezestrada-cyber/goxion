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
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-stream').forEach(n=>n.remove());
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
/* A meaningful signal, not a flying token, capsule, icon or particle.
 * A short ribbon of light flows out of the notice and is absorbed by the
 * ORIGINAL Ayuda bell. WAAPI moves only painted SVG dashes in a fixed layer.
 */
function lightStream(card,item){
 const destination=bell.getBoundingClientRect(),origin=card.getBoundingClientRect();
 const source=card.querySelector('.gx-smart-notice-title')?.getBoundingClientRect()||origin;
 const vw=window.innerWidth,vh=window.innerHeight;
 const visible=origin.bottom>0&&origin.top<vh&&destination.bottom>0&&destination.top<vh;
 if(!visible||typeof document.createElementNS!=='function'){
  bellImpact(item);return;
 }
 const fromX=source.left+source.width/2,fromY=source.top+Math.min(source.height/2,36);
 const toX=destination.left+destination.width/2,toY=destination.top+destination.height/2;
 const deltaX=toX-fromX,gap=Math.max(32,Math.abs(fromY-toY));
 const up=Math.min(116,gap*.42),down=Math.min(98,gap*.28);
 const c1x=fromX+deltaX*.11,c1y=fromY-up;
 const c2x=toX-deltaX*.27,c2y=toY+down;
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('class','gx-smart-notice-stream');
 svg.setAttribute('viewBox','0 0 '+vw+' '+vh);
 svg.setAttribute('width',String(vw));
 svg.setAttribute('height',String(vh));
 svg.setAttribute('aria-hidden','true');
 svg.style.width=vw+'px';svg.style.height=vh+'px';
 const defs=document.createElementNS(ns,'defs');
 const gradient=document.createElementNS(ns,'linearGradient');
 const id='gx-notice-signal-'+Date.now();
 gradient.setAttribute('id',id);gradient.setAttribute('gradientUnits','userSpaceOnUse');
 gradient.setAttribute('x1',String(fromX));gradient.setAttribute('y1',String(fromY));
 gradient.setAttribute('x2',String(toX));gradient.setAttribute('y2',String(toY));
 for(const [offset,color,opacity] of [['0%','#a488ff','0.7'],['52%','#b6d5ff','1'],['100%','#65f1f5','1']]){
  const stop=document.createElementNS(ns,'stop');
  stop.setAttribute('offset',offset);
  stop.setAttribute('stop-color',color);
  stop.setAttribute('stop-opacity',opacity);
  gradient.append(stop);
 }
 defs.append(gradient);svg.append(defs);
 const d='M '+fromX.toFixed(2)+' '+fromY.toFixed(2)+
  ' C '+c1x.toFixed(2)+' '+c1y.toFixed(2)+
  ', '+c2x.toFixed(2)+' '+c2y.toFixed(2)+
  ', '+toX.toFixed(2)+' '+toY.toFixed(2);
 const makePath=(cls,width,opacity)=>{
  const path=document.createElementNS(ns,'path');
  path.setAttribute('class',cls);path.setAttribute('d',d);
  path.setAttribute('fill','none');path.setAttribute('stroke','url(#'+id+')');
  path.setAttribute('stroke-width',String(width));
  path.setAttribute('stroke-linecap','round');
  path.setAttribute('opacity',String(opacity));
  svg.append(path);return path;
 };
 const halo=makePath('gx-smart-notice-stream-halo',7,.24);
 const filament=makePath('gx-smart-notice-stream-line',2.1,.94);
 document.body.append(svg);
 if(typeof filament.animate!=='function'){
  svg.remove();bellImpact(item);return;
 }
 const length=filament.getTotalLength();
 const segment=Math.min(66,Math.max(28,length*.15));
 const duration=1040;
 for(const [part,opacity] of [[halo,.24],[filament,.94]]){
  part.style.strokeDasharray=segment+' '+(length+segment+3);
  part.style.strokeDashoffset=String(segment);
  // A short moving beam with a soft tail; no full-screen neon trail.
  const animation=part.animate([
   {strokeDashoffset:segment,opacity:0,offset:0},
   {strokeDashoffset:segment-length*.13,opacity:opacity,offset:.19},
   {strokeDashoffset:-length*.68,opacity:opacity,offset:.73},
   {strokeDashoffset:-length,opacity:0,offset:1}
  ],{duration,easing:'cubic-bezier(.24,.62,.28,1)',fill:'forwards'});
  effects.push(animation);
 }
 delay(()=>bellImpact(item),980);
 delay(()=>svg.remove(),duration+80);
}

function preview(){
 const card=$('dash-billing-card');
 if(window.GOXION_SMART_BETA?.getScenario()==='mission'){
  window.GOXION_SMART_MISSIONS?.open?.();
  return;
 }
 if(!active||!card||card.hidden)return;
 clearTimers();
 document.querySelectorAll('.gx-smart-notice-surface,.gx-smart-notice-stream').forEach(n=>n.remove());
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
  else lightStream(card,notice);
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