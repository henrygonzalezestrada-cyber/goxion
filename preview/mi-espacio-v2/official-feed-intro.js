/* GOXION Mi Espacio · handoff visual en espejo. No toca auth ni lógica de notificaciones. */
(function(){
 'use strict';
 const feed=document.getElementById('gx-v2-feed');
 const dashboard=document.getElementById('view-dashboard');
 const header=document.getElementById('gx-v2-shared-header');
 const wordmark=header?.querySelector('.gxn-wordmark');
 if(!feed||!dashboard||!header||!wordmark)return;
 const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const root=document.createElement('div');
 root.id='gx-v2-handoff';root.hidden=true;
 root.setAttribute('aria-label','Preparando Mi Espacio');
 root.innerHTML='<div class="gx-v2-handoff-center"><img class="gx-v2-handoff-mark" src="./Logo individual.png" alt="" aria-hidden="true"><div class="gx-v2-handoff-wait" hidden><span class="gx-v2-handoff-track" aria-hidden="true"><span></span></span><span class="gx-v2-handoff-copy">Preparando tu espacio</span></div></div>';
 document.body.append(root);
 const mark=root.querySelector('.gx-v2-handoff-mark');
 const wait=root.querySelector('.gx-v2-handoff-wait');
 mark.onerror=()=>{mark.onerror=null;mark.src='./logo2.PNG'};
 let completed=false,sequence=0,started=0,delayTimer=0,guardTimer=0,flight=null;
 const inSpace=()=>document.body.classList.contains('gx-v2-private-visible')&&!feed.hidden&&dashboard.classList.contains('active');
 function clearTimers(){clearTimeout(delayTimer);clearTimeout(guardTimer)}
 function hide(){
  sequence++;clearTimers();
  try{flight?.cancel()}catch(_){}flight=null;
  root.hidden=true;root.classList.remove('is-flying');
  document.body.classList.remove('gx-v2-handoff-active');
  mark.removeAttribute('style');wait.hidden=true;
 }
 function begin(){
  if(completed||!root.hidden||!inSpace()||reduced())return;
  if(document.getElementById('gx-v2-sync')?.hidden){completed=true;return}
  const id=++sequence;started=performance.now();
  root.hidden=false;root.classList.remove('is-flying');
  wait.hidden=true;mark.removeAttribute('style');
  document.body.classList.add('gx-v2-handoff-active');
  clearTimers();
  // La barra de 2px aparece únicamente si realmente hay sincronización pendiente.
  delayTimer=setTimeout(()=>{if(id===sequence&&!completed)wait.hidden=false},480);
  // Nunca bloquear la vista autenticada por una animación.
  guardTimer=setTimeout(()=>{if(id===sequence)hide()},6800);
 }
 async function finish(){
  if(completed)return;
  completed=true;
  if(root.hidden||!inSpace()){hide();return}
  const id=sequence;
  clearTimeout(delayTimer);wait.hidden=true;
  // Evitar un salto abrupto en cargas extremadamente rápidas.
  const remain=Math.max(0,245-(performance.now()-started));
  if(remain)await new Promise(resolve=>setTimeout(resolve,remain));
  if(id!==sequence||!inSpace())return;
  if(reduced()||typeof mark.animate!=='function'){hide();return}
  const source=mark.getBoundingClientRect();
  const dest=wordmark.getBoundingClientRect();
  if(!source.width||!source.height||!dest.width){hide();return}
  const size=34;
  const scale=size/Math.max(source.width,source.height);
  const dw=source.width*scale,dh=source.height*scale;
  const dx=(dest.left+3)-source.left;
  const dy=(dest.top+(dest.height-dh)/2)-source.top;
  mark.style.position='fixed';mark.style.left=source.left+'px';mark.style.top=source.top+'px';
  mark.style.width=source.width+'px';mark.style.height=source.height+'px';
  mark.style.margin='0';mark.style.transformOrigin='top left';
  root.classList.add('is-flying');
  try{
   flight=mark.animate([
    {transform:'translate3d(0,0,0) scale(1)',opacity:1},
    {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')',opacity:1}
   ],{duration:620,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
   await flight.finished;
   if(id!==sequence)return;
   document.body.classList.remove('gx-v2-handoff-active'); // Reveal logo2.PNG exacto, no texto recreado.
   mark.animate([{opacity:1},{opacity:0}],{duration:175,easing:'ease-out',fill:'forwards'});
   await new Promise(resolve=>setTimeout(resolve,185));
  }catch(_){/* Cancelación/transición interrumpida: mostrar el feed inmediatamente. */}
  if(id===sequence)hide();
 }
 window.addEventListener('goxion:client-ready',()=>requestAnimationFrame(begin));
 window.addEventListener('goxion:v2-feed:rendered',()=>{void finish()});
 window.addEventListener('goxion:v2-feed:error',hide);
 window.addEventListener('goxion:client-logout',()=>{hide();completed=false});
 window.addEventListener('pageshow',e=>{if(e.persisted)hide()});
 const viewObserver=new MutationObserver(()=>{if(!inSpace()&&!root.hidden)hide()});
 for(const id of ['view-dashboard','view-catalogo','view-soporte']){
  const el=document.getElementById(id);
  if(el)viewObserver.observe(el,{attributes:true,attributeFilter:['class']});
 }
 // Si el evento oficial ocurrió antes de registrar los listeners, recuperar sin otro login.
 requestAnimationFrame(begin);
 /* Cierre de notificaciones: dos trazos geométricamente iguales, sin reescribir su controlador. */
 function fixNotificationX(){
  const close=document.querySelector('#gx-client-notif-sheet .gx-client-notif-close');
  if(!close||close.querySelector('.gx-v2-notif-cross'))return;
  const cross=document.createElement('span');
  cross.className='gx-v2-notif-cross';cross.setAttribute('aria-hidden','true');
  close.replaceChildren(cross);
 }
 const notices=new MutationObserver(records=>{
  if(records.some(record=>Array.from(record.addedNodes).some(n=>n.nodeType===1&&n.id==='gx-client-notif-sheet')))fixNotificationX();
 });
 notices.observe(document.body,{childList:true});
 document.getElementById('gxn-bell')?.addEventListener('click',()=>queueMicrotask(fixNotificationX));
 fixNotificationX();
})();