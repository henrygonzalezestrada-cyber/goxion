/* GOXION Mi Espacio — adaptive top navigation LAB ONLY.
   One navigation, one set of controls. No auth, Supabase, storage or payments.
   Scroll updates are scheduled with one passive listener + requestAnimationFrame. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const top=$('gxn-top'), nav=$('gxn-nav'), profile=$('gxn-profile-menu'), notices=$('gxn-notice-menu');
 const profileTrigger=$('gxn-profile-trigger'), bell=$('gxn-bell'), avatar=$('gxn-avatar');
 const input=$('gxn-avatar-input'), photo=$('gxn-avatar-photo'), choose=$('gxn-profile-choose'), reset=$('gxn-profile-reset');
 const editor=$('gxn-profile-editor'), toast=$('gxn-toast'), support=$('gxn-support-dialog'), logout=$('gxn-logout-dialog');
 if(!top||!nav||!profile||!notices||!profileTrigger||!bell||!avatar||!input||!photo||!choose||!reset||!editor)return;

 const slot=$('gxn-nav-slot'),dockTarget=$('gxn-nav-target'),brand=top.querySelector('.gxn-brand');
 if(!slot||!dockTarget||!brand)return;
 const motionReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const tabButtons=Array.from(nav.querySelectorAll('[data-gxn-target]'));
 const validTabs=new Set(['space','catalog','support']);
 let currentTab='space', priorTab='space';
 // A single spring drives the original nav node. The logo fades on the same
 // timeline; no detached fixed header is mounted after the original vanishes.
 let lastY=Math.max(0,window.scrollY), dock=0, dockGoal=0, spread=0, spreadGoal=0;
 let lastTick=0, lastScroll=0, frame=0, idleTimer=0, directionTravel=0;
 let geometry=null, preferredPhotoURL='', toastHandle=0, loadingGoxy=false;

 function announce(text){
  if(!toast)return;
  toast.textContent=text;toast.hidden=false;
  clearTimeout(toastHandle);
  toastHandle=setTimeout(()=>{toast.hidden=true},3400);
 }
 function switchDemoTab(name,skipScroll){
  if(!validTabs.has(name))return;
  currentTab=name;
  tabButtons.forEach(button=>{
   const active=button.dataset.gxnTarget===name;
   if(active)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');
  });
  if(skipScroll)return;
  const behavior=motionReduced()?'auto':'smooth';
  if(name==='space'){window.scrollTo({top:0,behavior});return;}
  if(name==='catalog'){
   const target=document.querySelector('.gxc-section');
   if(target)target.scrollIntoView({block:'start',behavior});
   return;
  }
  if(name==='support'&&support){
   try{support.showModal()}catch(_){announce('Soporte oficial disponible en la página conectada.')}
  }
 }
 tabButtons.forEach(button=>button.addEventListener('click',()=>{
  const next=button.dataset.gxnTarget;
  if(next==='support')priorTab=currentTab;
  closeMenus();
  switchDemoTab(next,false);
 }));
 if(support){
  support.addEventListener('close',()=>switchDemoTab(priorTab,true));
 }
 document.querySelectorAll('[data-gxn-close-dialog]').forEach(button=>button.addEventListener('click',()=>{
  button.closest('dialog')?.close();
 }));

 /* The original GOXION Index morph (assets/js/index/05-index-header-morph.js)
    taught us three safeguards:
    1) move the SAME visual node using transforms,
    2) interpolate a shared progress toward its target, even after fingers stop,
    3) settle an interrupted half-state without jumping the user's scroll.
    Unlike Index's financial hero, the nav never snaps window.scrollY itself. */
 const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const mix=(a,b,t)=>a+(b-a)*t;
 const format=n=>Number(n.toFixed(3));
 const RANGE=158, SNAP_IDLE_MS=175, TAU=62,SETTLE_TAU=29;
 function measure(){
  // Slot is never transformed: read geometry in document coordinates only
  // outside the animation loop, after the original header's grid has settled.
  const r=slot.getBoundingClientRect();
  const t=dockTarget.getBoundingClientRect();
  const vw=window.innerWidth;
  const circleFlow=vw<=355?54:56;
  const circleDock=vw<=320?44:46;
  const miniWidth=vw<=320?158:vw<=375?164:174;
  const fullDockWidth=Math.min(246,vw-Math.max(r.left,t.left)-14);
  geometry={
   x:r.left,y:r.top+Math.max(0,window.scrollY),w:r.width,h:r.height,
   targetX:Math.max(r.left,t.left),targetY:t.top,
   circleFlow,circleDock,miniWidth,
   fullDockWidth:Math.max(miniWidth,fullDockWidth)
  };
 }
 function paint(){
  if(!geometry)return;
  const p=smooth(dock);
  const e=smooth(spread)*p;
  const wDock=mix(geometry.miniWidth,geometry.fullDockWidth,e);
  const width=mix(geometry.w,wDock,p);
  const height=mix(geometry.h,56,p);
  const x=mix(geometry.x,geometry.targetX,p);
  const naturalY=geometry.y-Math.max(0,window.scrollY);
  const y=mix(naturalY,geometry.targetY,p);
  const circle=mix(geometry.circleFlow,geometry.circleDock,p);
  nav.style.transform='translate3d('+format(x)+'px,'+format(y)+'px,0)';
  nav.style.width=format(width)+'px';
  nav.style.height=format(height)+'px';
  nav.style.padding=format(mix(9,5,p))+'px';
  nav.style.gap=format(mix(7,4,p))+'px';
  nav.style.setProperty('--gxn-circle',format(circle)+'px');
  nav.style.setProperty('--gxn-emoji-size',format(mix(23,20,p))+'px');
  nav.style.setProperty('--gxn-label-size',format(mix(12,11,p))+'px');
  // The selected destination keeps the original official morph identity
  // when it fits; in the mini state all three destinations are true circles.
  nav.dataset.navLabel= (p>.69 && e<.45)?'off':'on';
  const logoProgress=smooth(dock/.66);
  brand.style.opacity=String(format(1-logoProgress));
  brand.style.transform='translate3d(0,'+format(-6*logoProgress)+'px,0) scale('+format(1-.05*logoProgress)+')';
  brand.style.pointerEvents=logoProgress>.95?'none':'';
 }
 function tick(now){
  frame=0;
  const dt=lastTick?clamp(now-lastTick,0,100):16.7;
  lastTick=now;
  if(motionReduced()){
   dock=dockGoal;spread=spreadGoal;
  }else{
   const tau=now-lastScroll>SNAP_IDLE_MS?SETTLE_TAU:TAU;
   const k=1-Math.exp(-dt/tau);
   dock+= (dockGoal-dock)*k;
   spread+=(spreadGoal-spread)*k;
  }
  if(Math.abs(dockGoal-dock)<.002)dock=dockGoal;
  if(Math.abs(spreadGoal-spread)<.002)spread=spreadGoal;
  paint();
  if(dock!==dockGoal||spread!==spreadGoal)frame=requestAnimationFrame(tick);
  else lastTick=0;
 }
 function schedule(){
  if(!frame)frame=requestAnimationFrame(tick);
 }
 function settle(){
  idleTimer=0;
  // Complete the near/away cycle when touch scroll pauses mid-transition.
  // Never move document scroll; only finish the capsule's own geometry.
  dockGoal=lastY>=RANGE/2?1:0;
  if(dockGoal===0)spreadGoal=0;
  lastScroll=performance.now()-SNAP_IDLE_MS-1;
  schedule();
 }
 function onScroll(){
  const y=Math.max(0,window.scrollY);
  const delta=y-lastY;
  lastY=y;
  dockGoal=clamp(y/RANGE);
  if(y<2){dockGoal=0;spreadGoal=0;}
  // Release labels on reverse swipes; make mini on forward swipes.
  if((dockGoal>.66||dock>.66)&&Math.abs(delta)>1.5&&Math.abs(delta)<180){
   if(Math.sign(directionTravel)!==Math.sign(delta))directionTravel=delta;
   else directionTravel=clamp(directionTravel+delta,-80,80);
   if(directionTravel>=26){spreadGoal=0;directionTravel=0}
   else if(directionTravel<=-26){spreadGoal=1;directionTravel=0}
  }
  lastScroll=performance.now();
  clearTimeout(idleTimer);
  idleTimer=window.setTimeout(settle,SNAP_IDLE_MS);
  schedule();
 }
 function onResize(){
  // Safari's address-bar resize must NOT trigger the settle timer or reset
  // the scroll state. Re-measure the untransformed slot and current safe area.
  measure();
  schedule();
 }
 // Establish the final fixed coordinate system before making the node visible:
 // no position:absolute → fixed jump and no duplicate nav waiting to appear.
 measure();
 dockGoal=clamp(Math.max(0,window.scrollY)/RANGE);
 dock=dockGoal;
 nav.dataset.navLabel=dock>.7?'off':'on';
 paint();
 nav.classList.add('gxn-ready');
 window.addEventListener('scroll',onScroll,{passive:true});
 window.addEventListener('resize',onResize,{passive:true});
 window.visualViewport?.addEventListener('resize',onResize,{passive:true});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){clearTimeout(idleTimer);idleTimer=0;return;}
  measure();schedule();
 });
 function closeMenus(){
  profile.hidden=true;
  notices.hidden=true;
  profileTrigger.setAttribute('aria-expanded','false');
  bell.setAttribute('aria-expanded','false');
 }
 function toggleMenu(which){
  const target=which==='profile'?profile:notices;
  const wasHidden=target.hidden;
  closeMenus();
  if(wasHidden){
   target.hidden=false;
   (which==='profile'?profileTrigger:bell).setAttribute('aria-expanded','true');
  }
 }
 profileTrigger.addEventListener('click',()=>toggleMenu('profile'));
 bell.addEventListener('click',()=>toggleMenu('notifications'));
 $('gxn-notice-close')?.addEventListener('click',()=>{closeMenus();bell.focus({preventScroll:true})});
 $('gxn-profile-open')?.addEventListener('click',()=>{
  editor.hidden=!editor.hidden;
  if(!editor.hidden)choose.focus({preventScroll:true});
 });
 document.addEventListener('pointerdown',event=>{
  if(!event.target.closest('#gxn-profile-menu, #gxn-profile-trigger, #gxn-notice-menu, #gxn-bell'))closeMenus();
 });
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&(!profile.hidden||!notices.hidden)){
   const target=profile.hidden?bell:profileTrigger;
   closeMenus();target.focus({preventScroll:true});
  }
 });
 $('gxn-logout')?.addEventListener('click',()=>{
  closeMenus();
  try{logout?.showModal()}catch(_){announce('La salida real se probará en GOXION oficial.')}
 });

 choose.addEventListener('click',()=>input.click());
 reset.addEventListener('click',()=>{
  photo.hidden=true;
  photo.removeAttribute('src');
  if(preferredPhotoURL)URL.revokeObjectURL(preferredPhotoURL);
  preferredPhotoURL='';
  reset.hidden=true;
  profileTrigger.setAttribute('aria-label','Abrir menú de perfil, avatar Goxy');
  announce('Restaurado el avatar de Goxy');
 });
 input.addEventListener('change',()=>{
  const file=input.files?.[0];
  if(!file)return;
  input.value='';
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
   announce('Elige una fotografía JPG, PNG o WebP.');return;
  }
  if(file.size>2*1024*1024){
   announce('Para esta prueba, la imagen debe pesar menos de 2 MB.');return;
  }
  const next=URL.createObjectURL(file);
  photo.onload=()=>{
   if(preferredPhotoURL)URL.revokeObjectURL(preferredPhotoURL);
   preferredPhotoURL=next;
   photo.hidden=false;
   reset.hidden=false;
   profileTrigger.setAttribute('aria-label','Abrir menú de perfil, foto de prueba');
   announce('Foto aplicada solo en este laboratorio');
  };
  photo.onerror=()=>{
   URL.revokeObjectURL(next);
   photo.hidden=true;
   announce('No se pudo abrir esta imagen.');
  };
  photo.src=next;
 });
 window.addEventListener('pagehide',()=>{
  if(preferredPhotoURL){URL.revokeObjectURL(preferredPhotoURL);preferredPhotoURL=''}
 });

 // Reuse the ORIGINAL Goxy robot-heads renderer, not a stock user portrait.
 // Load after first paint; the tiny fallback face remains visible if it fails.
 function loadGoxy(){
  if(loadingGoxy||!$('gxn-goxy-slot'))return;
  loadingGoxy=true;
  const mount=()=>{
   const host=$('gxn-goxy-slot');
   if(!host||!window.GOXY_ROBOT?.mount)return;
   let observer;
   try{
    // React may paint asynchronously; only reveal the real face after its DOM exists.
    observer=new MutationObserver(()=>{
     if(!host.childElementCount)return;
     avatar.classList.add('gxn-robot-ready');
     observer.disconnect();
    });
    observer.observe(host,{childList:true,subtree:true});
    window.GOXY_ROBOT.mount(host);
    if(host.childElementCount){avatar.classList.add('gxn-robot-ready');observer.disconnect()}
    setTimeout(()=>observer?.disconnect(),5000);
   }catch(_){observer?.disconnect();/* keep lightweight fallback */}
  };
  if(window.GOXY_ROBOT?.mount){mount();return;}
  const script=document.createElement('script');
  script.async=true;
  script.src='../goxion-ai/goxy-heads.bundle.js';
  script.onload=mount;
  script.onerror=()=>{loadingGoxy=false};
  document.head.appendChild(script);
 }
 // Motion-sensitive users keep the static Goxy face; no animated robot is loaded.
 if(!motionReduced()){
  if('requestIdleCallback' in window)window.requestIdleCallback(loadGoxy,{timeout:1700});
  else setTimeout(loadGoxy,900);
 }
})();
