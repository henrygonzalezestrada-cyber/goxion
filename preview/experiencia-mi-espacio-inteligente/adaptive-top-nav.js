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

 const motionReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const tabButtons=Array.from(nav.querySelectorAll('[data-gxn-target]'));
 const validTabs=new Set(['space','catalog','support']);
 let currentTab='space', priorTab='space';
 let lastY=Math.max(0,window.scrollY), accumulation=0, docked=false, dockSize='expanded';
 let pendingFrame=0, preferredPhotoURL='', toastHandle=0, loadingGoxy=false;

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

 function setDocked(value){
  if(docked===value)return;
  docked=value;
  accumulation=0;
  if(value){
   dockSize='compact';
   top.dataset.size='compact';
   top.dataset.docked='true';
   // Two paint frames let the detached surfaces enter smoothly without
   // forcing synchronous layout (which caused a potential Safari hitch).
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(docked)top.classList.add('gxn-visible');
   }));
  }else{
   top.classList.remove('gxn-visible');
   top.dataset.docked='false';
   top.dataset.size='expanded';
   dockSize='expanded';
  }
 }
 function setDockSize(value){
  if(!docked||value===dockSize)return;
  dockSize=value;
  top.dataset.size=value;
 }
 function updateScroll(){
  pendingFrame=0;
  const y=Math.max(0,window.scrollY);
  const delta=y-lastY;
  lastY=y;
  if(y<85){setDocked(false);return;}
  if(!docked){
   if(y>=185)setDocked(true);
   return;
  }
  if(Math.abs(delta)<2||Math.abs(delta)>160){accumulation=0;return;}
  const direction=Math.sign(delta);
  if(Math.sign(accumulation)!==direction)accumulation=delta;
  else accumulation=Math.max(-80,Math.min(80,accumulation+delta));
  if(accumulation>=29){setDockSize('compact');accumulation=0}
  if(accumulation<=-29){setDockSize('expanded');accumulation=0}
 }
 function scheduleScroll(){
  if(!pendingFrame)pendingFrame=requestAnimationFrame(updateScroll);
 }
 window.addEventListener('scroll',scheduleScroll,{passive:true});
 window.addEventListener('resize',scheduleScroll,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleScroll()});
 scheduleScroll();

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
