/* GOXION Mi Espacio — adaptive top navigation LAB ONLY.
   One navigation, one set of controls. No auth, Supabase, storage or payments.
   Scroll updates are scheduled with one passive listener + requestAnimationFrame.

   Morph (técnica del Index oficial, 05-index-header-morph.js):
   - La píldora conserva UN tamaño de layout fijo (medido una vez).
   - Por frame solo se escriben transform (translate + scale) y opacidades:
     nada de width/height/padding/gap/vars por frame (eso forzaba layout = jank).
   - La geometría se mide con los transforms neutralizados.
   - La franja superior (strip) es fija y estacionaria: su cristal no se
     mueve, solo cambia su opacidad; la píldora y las acciones se mueven
     con transform por encima. Una sola franja con nav + campana + foto. */
(()=>{
 'use strict';
 const $=id=>document.getElementById(id);
 const top=$('gxn-top'), nav=$('gxn-nav'), strip=$('gxn-strip'), profile=$('gxn-profile-menu'), notices=$('gxn-notice-menu');
 const profileTrigger=$('gxn-profile-trigger'), bell=$('gxn-bell'), avatar=$('gxn-avatar');
 const actions=top?top.querySelector('.gxn-actions'):null;
 const input=$('gxn-avatar-input'), photo=$('gxn-avatar-photo'), choose=$('gxn-profile-choose'), reset=$('gxn-profile-reset');
 const editor=$('gxn-profile-editor'), toast=$('gxn-toast'), support=$('gxn-support-dialog'), logout=$('gxn-logout-dialog');
 if(!top||!nav||!strip||!profile||!notices||!profileTrigger||!bell||!avatar||!actions||!input||!photo||!choose||!reset||!editor)return;

 const slot=$('gxn-nav-slot'),dockTarget=$('gxn-nav-target'),brand=top.querySelector('.gxn-brand');
 if(!slot||!dockTarget||!brand)return;
 const motionReduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 const tabButtons=Array.from(nav.querySelectorAll('[data-gxn-target]'));
 const validTabs=new Set(['space','catalog','support']);
 let currentTab='space', priorTab='space';
 // A single spring drives the original nav node. The logo fades on the same
 // timeline; no detached fixed header is mounted after the original vanishes.
 let lastY=Math.max(0,window.scrollY), dock=0, dockGoal=0;
 let lastTick=0, lastScroll=0, frame=0, idleTimer=0;
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

 /* Morph transform-only, como el Index oficial:
    1) mover el MISMO nodo con transform (translate + scale),
    2) interpolar un progreso compartido hacia su objetivo, incluso tras soltar,
    3) asentar un estado a medias sin saltar el scroll del usuario.
    El nav nunca mueve window.scrollY; solo su propio transform. */
 const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const mix=(a,b,t)=>a+(b-a)*t;
 const format=n=>Number(n.toFixed(3));
 const RANGE=158, SNAP_IDLE_MS=175, TAU=62,SETTLE_TAU=29;
 function measure(){
  // Geometría de LAYOUT, no visual: neutralizar transforms durante la medición.
  const r=slot.getBoundingClientRect();
  const E={x:r.left,y:r.top+Math.max(0,window.scrollY),w:r.width,h:r.height};
  // Rect de la franja en su posición acoplada (neutralizar el desplazamiento Y).
  const savedStripT=strip.style.transform;
  strip.style.transform='translate(-50%,0px)';
  void strip.offsetHeight;
  const sr=strip.getBoundingClientRect();
  strip.style.transform=savedStripT;
  // Desplazamiento Y de las acciones: en reposo deben solapar la fila del
  // encabezado; al acoplar, suben a la franja. Se mide con las acciones en
  // flujo (desfijar temporalmente si ya están fijas).
  const wasFixed=actions.style.position==='fixed';
  if(wasFixed){actions.style.position='';actions.style.top='';actions.style.right='';}
  void actions.offsetHeight;
  const ar=actions.getBoundingClientRect();
  const dy=(ar.top+Math.max(0,window.scrollY))-sr.top;
  if(wasFixed){
   actions.style.position='fixed';
   actions.style.top='calc(10px + env(safe-area-inset-top,0px))';
   actions.style.right='calc(14px + env(safe-area-inset-right,0px))';
  }
  const actionsW=actions.offsetWidth||95;
  const Dw=Math.max(110,sr.width-10-8-actionsW-8);
  const scale=E.w>0?Dw/E.w:1;
  const Dh=E.h*scale;
  const D={x:sr.left+10,y:sr.top+(sr.height-Dh)/2,w:Dw,h:Dh};
  geometry={E,D,dy};
  // Tamaño de layout fijo de la píldora: se escribe UNA vez por medición,
  // nunca por frame. El morph solo escala con transform desde esta base.
  nav.style.width=format(E.w)+'px';
  nav.style.height=format(E.h)+'px';
 }
 function paint(){
  if(!geometry)return;
  const p=smooth(dock);
  const evpY=geometry.E.y-Math.max(0,window.scrollY);
  const Ix=mix(geometry.E.x,geometry.D.x,p);
  const Iy=mix(evpY,geometry.D.y,p);
  const Iw=mix(geometry.E.w,geometry.D.w,p);
  const Ih=mix(geometry.E.h,geometry.D.h,p);
  // Solo transform: el layout de la píldora no cambia durante el morph.
  nav.style.transform='translate3d('+format(Ix)+'px,'+format(Iy)+'px,0) scale('+format(Iw/geometry.E.w)+','+format(Ih/geometry.E.h)+')';
  // Franja y acciones: solo opacidad/transform (compositor).
  const stripY=mix(geometry.dy,0,p);
  strip.style.opacity=String(format(p));
  strip.style.transform='translate(-50%,'+format(stripY)+'px)';
  actions.style.transform='translateY('+format(stripY)+'px)';
  const logoProgress=smooth(dock/.66);
  brand.style.opacity=String(format(1-logoProgress));
  brand.style.transform='translate3d(0,'+format(-6*logoProgress)+'px,0) scale('+format(1-.05*logoProgress)+')';
  brand.style.pointerEvents=logoProgress>.95?'none':'';
  // Etiquetas: histéresis de un solo disparo (opacidad vía CSS, sin layout).
  if(p>.6&&nav.dataset.navLabel!=='off')nav.dataset.navLabel='off';
  else if(p<.4&&nav.dataset.navLabel!=='on')nav.dataset.navLabel='on';
 }
 function tick(now){
  frame=0;
  const dt=lastTick?clamp(now-lastTick,0,100):16.7;
  lastTick=now;
  if(motionReduced()){
   dock=dockGoal;
  }else{
   const tau=now-lastScroll>SNAP_IDLE_MS?SETTLE_TAU:TAU;
   const k=1-Math.exp(-dt/tau);
   dock+=(dockGoal-dock)*k;
  }
  if(Math.abs(dockGoal-dock)<.002)dock=dockGoal;
  paint();
  if(dock!==dockGoal)frame=requestAnimationFrame(tick);
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
  lastScroll=performance.now()-SNAP_IDLE_MS-1;
  schedule();
 }
 function onScroll(){
  const y=Math.max(0,window.scrollY);
  lastY=y;
  dockGoal=clamp(y/RANGE);
  if(y<2)dockGoal=0;
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
 // Las acciones pasan a fijas DESPUÉS de medir su posición en flujo, en el
 // mismo turno síncrono: sin parpadeo y sin layout por frame posterior.
 actions.style.position='fixed';
 actions.style.top='calc(10px + env(safe-area-inset-top,0px))';
 actions.style.right='calc(14px + env(safe-area-inset-right,0px))';
 actions.style.zIndex='61';
 dockGoal=clamp(Math.max(0,window.scrollY)/RANGE);
 dock=dockGoal;
 nav.dataset.navLabel=dock>.5?'off':'on';
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
