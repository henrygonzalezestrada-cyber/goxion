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
/* GOXION E1/B1 V6 · Optical handoff with a physically shaped, moving ribbon.
 * No UI tokens, no particle swarms and no 2D dashed lines.
 * Only the source-to-bell transition changes; no app/session interactions.
 */
function bellImpact(item){
 recordNotice(item);
 if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 // The bell receives the stream by briefly compressing, not exploding.
 const ripple=document.createElement('span');
 ripple.className='gx-smart-notice-impact';
 ripple.setAttribute('aria-hidden','true');
 bell.append(ripple);
 const ringAnim=ripple.animate([
  {transform:'translate(-50%,-50%) scale(1.08)',opacity:0,offset:0},
  {transform:'translate(-50%,-50%) scale(.82)',opacity:.55,offset:.3},
  {transform:'translate(-50%,-50%) scale(.24)',opacity:0,offset:1}
 ],{duration:490,easing:'cubic-bezier(.22,.85,.23,1)',fill:'forwards'});
 effects.push(ringAnim);
 ringAnim.finished.then(()=>ripple.remove(),()=>ripple.remove());
 const response=bell.animate([
  {transform:'scale(1)',offset:0},
  {transform:'scale(.975)',offset:.20},
  {transform:'scale(1.045)',offset:.56},
  {transform:'scale(1)',offset:1}
 ],{duration:530,easing:'cubic-bezier(.2,.73,.29,1)'});
 effects.push(response);
 delay(()=>ripple.remove(),550);
}
function lightStream(card,item){
 const bellIcon=bell.querySelector('.gx-client-notif-icon');
 const target=(bellIcon||bell).getBoundingClientRect();
 const origin=card.getBoundingClientRect();
 const source=card.querySelector('.gx-smart-notice-title')?.getBoundingClientRect()||origin;
 const vw=window.innerWidth,vh=window.innerHeight;
 // Avoid disconnected visuals if the notification surface was scrolled away.
 const onscreen=origin.bottom>0&&origin.top<vh&&target.bottom>0&&target.top<vh;
 if(!onscreen||typeof window.requestAnimationFrame!=='function'){
  bellImpact(item);return;
 }
 const x0=source.left+source.width*.5,y0=source.top+Math.min(source.height*.52,39);
 const x3=target.left+target.width*.5,y3=target.top+target.height*.5;
 const dx=x3-x0,span=Math.max(70,Math.abs(y3-y0));
 const points=[
  {x:x0,y:y0},
  {x:x0+dx*.04,y:y0-Math.min(94,span*.32)},
  {x:x3-dx*.29,y:y3+Math.min(100,span*.30)},
  {x:x3,y:y3}
 ];
 const bezier=t=>{
  const a=1-t,aa=a*a,tt=t*t;
  return{x:aa*a*points[0].x+3*aa*t*points[1].x+3*a*tt*points[2].x+tt*t*points[3].x,
   y:aa*a*points[0].y+3*aa*t*points[1].y+3*a*tt*points[2].y+tt*t*points[3].y};
 };
 const tangent=t=>{
  const a=1-t;
  const dx=3*a*a*(points[1].x-points[0].x)+6*a*t*(points[2].x-points[1].x)+3*t*t*(points[3].x-points[2].x);
  const dy=3*a*a*(points[1].y-points[0].y)+6*a*t*(points[2].y-points[1].y)+3*t*t*(points[3].y-points[2].y);
  const norm=Math.max(1,Math.hypot(dx,dy));
  return{x:-dy/norm,y:dx/norm};
 };
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.classList.add('gx-smart-notice-stream');
 svg.setAttribute('viewBox','0 0 '+vw+' '+vh);
 svg.setAttribute('width',String(vw));svg.setAttribute('height',String(vh));
 svg.setAttribute('aria-hidden','true');
 svg.style.width=vw+'px';svg.style.height=vh+'px';
 const defs=document.createElementNS(ns,'defs');
 const grad=document.createElementNS(ns,'linearGradient');
 const key='gx-ribbon-'+Date.now();
 grad.setAttribute('id',key);grad.setAttribute('gradientUnits','userSpaceOnUse');
 grad.setAttribute('x1',String(x0));grad.setAttribute('y1',String(y0));
 grad.setAttribute('x2',String(x3));grad.setAttribute('y2',String(y3));
 for(const [offset,color,opacity] of [
  ['0%','#9981fa','.56'],['31%','#b8a8ff','.78'],
  ['68%','#e3f8ff','.96'],['100%','#65e6ec','.90']
 ]){
  const st=document.createElementNS(ns,'stop');
  st.setAttribute('offset',offset);st.setAttribute('stop-color',color);
  st.setAttribute('stop-opacity',opacity);grad.append(st);
 }
 const filter=document.createElementNS(ns,'filter');filter.id=key+'-soft';
 filter.setAttribute('x','-65%');filter.setAttribute('y','-65%');
 filter.setAttribute('width','230%');filter.setAttribute('height','230%');
 const blur=document.createElementNS(ns,'feGaussianBlur');
 blur.setAttribute('stdDeviation','4.2');filter.append(blur);
 defs.append(grad,filter);svg.append(defs);
 const draw=(cls,fill)=>{
  const path=document.createElementNS(ns,'path');path.setAttribute('class',cls);
  path.setAttribute('fill',fill);svg.append(path);return path;
 };
 const halo=draw('gx-smart-notice-stream-halo','url(#'+key+')');
 halo.setAttribute('filter','url(#'+key+'-soft)');
 const skin=draw('gx-smart-notice-stream-line','url(#'+key+')');
 const sheen=draw('gx-smart-notice-stream-sheen','none');
 sheen.setAttribute('stroke','rgba(242,252,255,.68)');
 sheen.setAttribute('stroke-width','.75');sheen.setAttribute('stroke-linecap','round');
 const bloom=document.createElement('span');
 bloom.className='gx-smart-notice-origin-bloom';bloom.setAttribute('aria-hidden','true');
 bloom.style.left=x0+'px';bloom.style.top=y0+'px';
 document.body.append(svg,bloom);
 const duration=1170,begin=Date.now();
 const ease=t=>1-Math.pow(1-t,3)*(1+3*t); // natural launch and deceleration
 const clamp=v=>Math.max(0,Math.min(1,v));
 const f=n=>n.toFixed(2);
 let raf=0,ticker=0,lastPaint=0,delivered=false;
 // Prefer native display frames; Safari/WebKit can temporarily suspend rAF.
 // An independent ~30 fps timer advances the same silhouette from the wall
 // clock, so a background/layout transition cannot freeze the visible ribbon.
 const render=()=>{
  if(!svg.isConnected)return;
  const now=Date.now();
  if(now-lastPaint<14)return; // avoid duplicate work from rAF + safety timer
  lastPaint=now;
  const time=clamp((now-begin)/duration),head=ease(time);
  const tail=Math.max(0,head-.19);
  const widen=(1-clamp((time-.68)/.32));
  // The slight shifting in the body is what makes the light feel supple.
  const center=t=>{
   const p=bezier(t),n=tangent(t);
   const wobble=4.7*Math.sin(Math.PI*t)*Math.sin(t*7.2+time*5.3)*widen;
   return{x:p.x+n.x*wobble,y:p.y+n.y*wobble};
  };
  const left=[],right=[],spine=[];
  for(let i=0;i<=18;i++){
   const u=i/18,t=tail+(head-tail)*u,p=center(t),normal=tangent(t);
   const width=(2.8+1.6*(1-head))*Math.pow(Math.sin(Math.PI*u),.66);
   left.push(f(p.x+normal.x*width)+' '+f(p.y+normal.y*width));
   right.unshift(f(p.x-normal.x*width)+' '+f(p.y-normal.y*width));
   if(i>=3&&i<=16)spine.push(f(p.x-normal.x*width*.16)+' '+f(p.y-normal.y*width*.16));
  }
  const polygon='M '+left.join(' L ')+' L '+right.join(' L ')+' Z';
  skin.setAttribute('d',polygon);halo.setAttribute('d',polygon);
  sheen.setAttribute('d','M '+spine.join(' L '));
  const reveal=clamp((time-.035)/.13),vanish=clamp((1-time)/.15);
  svg.style.opacity=String(Math.min(reveal,vanish)*.94);
  const shape=1+.05*Math.sin(Math.PI*time);
  skin.setAttribute('opacity',String(shape));
  halo.setAttribute('opacity','.35');
  if(time>=.89&&!delivered){delivered=true;bellImpact(item)}
  if(time>=1){
   cancelAnimationFrame(raf);clearInterval(ticker);
   svg.remove();bloom.remove();
  }
 };
 const rafLoop=()=>{
  render();
  if(svg.isConnected)raf=requestAnimationFrame(rafLoop);
 };
 render();
 raf=requestAnimationFrame(rafLoop);
 ticker=window.setInterval(render,33);
 effects.push({cancel:()=>{cancelAnimationFrame(raf);clearInterval(ticker);svg.remove();bloom.remove()}});
 delay(()=>bloom.remove(),510);
 // Browser tab throttling fallback: always deliver the notice even if RAF stalls.
 delay(()=>{if(!delivered){delivered=true;bellImpact(item)}svg.remove();bloom.remove()},duration+150);
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