/* GOXION · un solo logo de arranque; sin segundo splash ni cambio de sesión.
   La oficial conserva autenticación y restauración. Este adaptador pertenece al espejo. */
(function(){
 'use strict';
 const feed=document.getElementById('gx-v2-feed'),dash=document.getElementById('view-dashboard');
 const header=document.getElementById('gx-v2-shared-header'),wordmark=header?.querySelector('.gxn-wordmark');
 const publicWordmark=document.querySelector('.app-header > .app-logo');
 const root=document.getElementById('gx-v2-handoff');
 if(!feed||!dash||!header||!wordmark||!root)return;
 const mark=root.querySelector('.gx-v2-handoff-mark'),wait=root.querySelector('.gx-v2-handoff-wait');
 const reduced=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 let completed=false,publicCompleted=false,active=false,mode='',sequence=0,delayTimer=0,guardTimer=0,flight=null,fade=null,claim=null,flightGuard=0;
 const inSpace=()=>document.body.classList.contains('gx-v2-private-visible')&&!feed.hidden&&dash.classList.contains('active');
 function clearTimers(){clearTimeout(delayTimer);clearTimeout(guardTimer)}
 function hide(){
  const wasVisible=!root.hidden;
  sequence++;active=false;mode='';clearTimers();clearTimeout(flightGuard);clearTimeout(window.GOXION_V2_BOOT_TIMER);
  const pending=claim;claim=null;pending?.cancel();
  try{flight?.cancel();fade?.cancel()}catch(_){}flight=null;fade=null;
  root.hidden=true;root.classList.remove('is-flying','is-launch-flight');
  document.body.classList.remove('gx-v2-handoff-active','no-scroll');
  mark.removeAttribute('style');wait.hidden=true;
  if(wasVisible)window.dispatchEvent(new Event('goxion:v2-handoff:finished'));
 }
 function begin(target='private'){
  if(target==='private'?(completed||!inSpace()):publicCompleted)return;
  if(active){if(mode===target)return;hide()}
  if(reduced()){if(target==='private')completed=true;else publicCompleted=true;hide();return}
  active=true;mode=target;clearTimeout(window.GOXION_V2_BOOT_TIMER);
  const id=++sequence;
  root.hidden=false;root.classList.remove('is-flying','is-launch-flight');wait.hidden=true;
  mark.removeAttribute('style');document.body.classList.add('gx-v2-handoff-active');
  clearTimers();
  if(target==='private')delayTimer=setTimeout(()=>{if(id===sequence&&!completed)wait.hidden=false},480);
  guardTimer=setTimeout(()=>{if(id===sequence){if(target==='private')completed=true;else publicCompleted=true;hide()}},6800);
 }
 async function finish(target='private'){
  const isPrivate=target==='private';
  if(isPrivate?completed:publicCompleted)return;
  if(isPrivate&&!inSpace()){completed=true;hide();return}
  const destination=isPrivate||!header.hidden?wordmark:publicWordmark;
  if(!active||mode!==target)begin(target);
  if(isPrivate)completed=true;else publicCompleted=true;
  if(root.hidden||reduced()||typeof mark.animate!=='function'){hide();return}
  const id=sequence;
  clearTimeout(delayTimer);wait.hidden=true;
  document.body.classList.remove('no-scroll');
  const release=window.GOXION_RELEASE_202610;
  if(isPrivate&&release?.handoffStatus?.()==='waiting'){
   await new Promise(resolve=>{
    let timer;const done=()=>{clearTimeout(timer);window.removeEventListener('goxion:legal-state',done);resolve()};
    window.addEventListener('goxion:legal-state',done,{once:true});timer=setTimeout(done,480);
   });
   if(id!==sequence||!inSpace())return;
  }
  if(isPrivate&&release?.handoffStatus?.()==='ready'){
   root.classList.add('is-launch-flight');
   claim=release.claimHandoff?.()||null;
   if(!claim)root.classList.remove('is-launch-flight');
   else claim.signal.addEventListener('abort',()=>{if(id===sequence)hide()},{once:true});
  }
  const source=mark.getBoundingClientRect(),dest=(claim?.target||destination)?.getBoundingClientRect();
  if(!source.width||!source.height||!dest?.width||!dest.height){hide();return}
  const size=34;let scale=size/Math.max(source.width,source.height);
  let dy=dest.top+(dest.height-source.height*scale)/2-source.top;
  let dx=dest.left+3-source.left;
  if(claim){
   if(!mark.naturalWidth||!mark.naturalHeight||mark.src!==claim.target.src){claim.complete();hide();return}
   const aspect=mark.naturalWidth/mark.naturalHeight;
   const fit=r=>{const w=Math.min(r.width,r.height*aspect),h=w/aspect;return {w,x:(r.width-w)/2,y:(r.height-h)/2}};
   const a=fit(source),b=fit(dest);scale=b.w/a.w;
   dx=dest.left+b.x-source.left-a.x*scale;dy=dest.top+b.y-source.top-a.y*scale;
  }
  Object.assign(mark.style,{position:'fixed',left:source.left+'px',top:source.top+'px',width:source.width+'px',height:source.height+'px',margin:'0',transformOrigin:'top left'});
  root.classList.add('is-flying');
  try{
   flight=mark.animate([{transform:'translate3d(0,0,0) scale(1)',opacity:1},
    {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+scale+')',opacity:1}],
    {duration:620,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'});
   if(claim){
    await Promise.race([flight.finished,new Promise(resolve=>{flightGuard=setTimeout(resolve,1000)})]);
    if(id!==sequence)return;
    claim.complete();hide();return;
   }
   await flight.finished;
   if(id!==sequence)return;
   document.body.classList.remove('gx-v2-handoff-active');
   fade=mark.animate([{opacity:1},{opacity:0}],{duration:175,easing:'ease-out',fill:'forwards'});
   await fade.finished;
  }catch(_){}
  if(id===sequence)hide();
 }
 // Solo en el espejo: la finalización oficial del arranque libera el mismo elemento.
 // En público se usa el mismo viaje hacia el logo visible; en privado se espera el render confirmado.
 window.hideSplash=function(){
  if(inSpace()&&!completed){
   begin();
   if(document.getElementById('gx-v2-sync')?.hidden)void finish();
   return;
  }
  if(!inSpace()&&!publicCompleted&&!root.hidden){void finish('public');return}
  if(!active)hide();
 };
 window.addEventListener('goxion:client-ready',()=>requestAnimationFrame(()=>{
  if(!inSpace())return;
  begin();
  if(document.getElementById('gx-v2-sync')?.hidden)void finish();
 }));
 window.addEventListener('goxion:v2-feed:rendered',()=>{void finish()});
 window.addEventListener('goxion:v2-feed:error',()=>{completed=true;hide()});
 window.addEventListener('goxion:client-logout',()=>{hide();completed=false;publicCompleted=true});
 window.addEventListener('pageshow',e=>{if(e.persisted){completed=true;publicCompleted=true;hide()}});
 root.addEventListener('click',()=>{if(mode==='private')completed=true;else publicCompleted=true;hide()});
 const viewObserver=new MutationObserver(()=>{if(active&&mode==='private'&&!inSpace()){completed=true;hide()}});
 for(const id of ['view-dashboard','view-catalogo','view-soporte']){
  const el=document.getElementById(id);if(el)viewObserver.observe(el,{attributes:true,attributeFilter:['class']});
 }
 requestAnimationFrame(()=>{if(inSpace()){begin();if(document.getElementById('gx-v2-sync')?.hidden)void finish()}});
 // Calcar el SVG real de beneficios. No conservar barras extra ni alterar el botón oficial.
 function fixNotificationX(){
  const close=document.querySelector('#gx-client-notif-sheet .gx-client-notif-close');
  const source=document.querySelector('#gxb-dismiss svg');
  if(!close||!source||close.dataset.gxV2Close==='shared')return;
  const copy=source.cloneNode(true);
  copy.setAttribute('aria-hidden','true');copy.setAttribute('focusable','false');
  close.replaceChildren(copy);close.dataset.gxV2Close='shared';
 }
 const notices=new MutationObserver(records=>{
  if(records.some(r=>Array.from(r.addedNodes).some(n=>n.nodeType===1&&(n.id==='gx-client-notif-sheet'||n.querySelector?.('#gx-client-notif-sheet')))))fixNotificationX();
 });
 notices.observe(document.body,{childList:true});
 document.getElementById('gxn-bell')?.addEventListener('click',()=>queueMicrotask(fixNotificationX));
 fixNotificationX();
})();
