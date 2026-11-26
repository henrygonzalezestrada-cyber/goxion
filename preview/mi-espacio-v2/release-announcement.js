/* GOXION · Avisos oficiales 2.0: términos reales primero, novedades independientes después.
 * Novedades informativas una sola vez por cuenta/version/navegador.
 * No escribe consentimiento, fechas ni operaciones comerciales. */
(()=>{
 "use strict";
 if(window.GOXION_RELEASE_202610)return;
 // La edición nueva es opt-in por configuración del HTML, no por URL ni storage.
 // La rama candidata la conserva apagada hasta autorización de lanzamiento.
 const mode=document.documentElement.getAttribute("data-gx-release-launch");
 const PILOT="casone",PILOT_VERSION="nov2026-mi-espacio-lanzamiento-pilot-v1";
 const GENERAL_VERSION="nov2026-mi-espacio-lanzamiento-v1",LEGACY_VERSION="nov2026-novedades-apiladas-v2-todos";
 let launch=mode==="enabled",pilot=false,VERSION=launch?GENERAL_VERSION:LEGACY_VERSION;
 const PREFIX="gx-release-seen:";
 const core=window.GOXION_CORE,tokenKey=core?.STORAGE?.CLIENT_TOKEN;
 const news=[
  {symbol:"✦",title:"Conoce a Goxy, tu asistente",copy:"Ahora puedes conversar con Goxy desde Soporte para resolver dudas, consultar fechas de pago y recibir ayuda con tus servicios. Si necesitas atención humana, prepara tu solicitud contigo."},
  {symbol:"◉",title:"Notificaciones en Mi Espacio",copy:"Un centro más claro para revisar avisos importantes, recordatorios, novedades y comunicaciones de tu cuenta, sin depender únicamente de mensajes externos."},
  {symbol:"%",title:"Promociones y catálogo renovados",copy:"Explora ofertas, combos y descuentos destacados; revisa disponibilidad y condiciones antes de solicitar tus servicios."},
  {symbol:"◷",title:"Pagos más claros, incluso con distintas fechas",copy:"Si tus plataformas vencen en días diferentes, ahora puedes consultar cada cobro por separado o revisar el importe conjunto en tu estado de cuenta."},
  {symbol:"◇",title:"Prórrogas y beneficios más transparentes",copy:"Cuando tu cuenta sea elegible, puedes solicitar una prórroga desde Mi Espacio y conocer sus condiciones. También ves tu avance de lealtad y el efecto de los pagos puntuales."},
  {symbol:"★",title:"Misiones, cupones y opiniones",copy:"Seguimiento más intuitivo de tus misiones y recompensas, además de una mejor experiencia para dejar comentarios y ayudarnos a mejorar."}
 ];
 // Capítulos editoriales: descripción de interfaz disponible, sin datos de cuenta ni promesas de IA.
 const chapters=[
   {id:"cover",title:"Tu Espacio.",accent:"Más inteligente que nunca.",copy:"Todo lo que necesitas, en una experiencia más clara y cercana.",art:"cover"},
   {id:"space",title:"Tu cuenta, de un vistazo.",accent:"",copy:"Consulta lo importante de tu cuenta, sigue tus servicios y revisa tus movimientos desde Mi Espacio.",art:"space"},
   {id:"benefits",title:"Cada avance cuenta.",accent:"",copy:"Descubre tus ahorros y sigue tu lealtad, referidos y misiones en un solo lugar.",art:"benefits"},
   {id:"services",title:"Todo en su fecha.",accent:"",copy:"Consulta tus vencimientos, estado de cuenta y opciones de prórroga cuando tu cuenta sea elegible.",art:"services"},
   {id:"catalog",title:"Encuentra tu próximo favorito.",accent:"",copy:"Explora plataformas, combos y promociones; elige tus servicios y revisa tu selección en el carrito.",art:"catalog"},
   {id:"support",title:"Estamos más cerca.",accent:"",copy:"Personaliza a Goxy, encuentra ayuda desde Soporte y comparte tu opinión para seguir mejorando.",art:"support"}
 ];
 const $=(selector,root=document)=>root.querySelector(selector);
 const create=(tag,cls,text)=>{
   const e=document.createElement(tag);if(cls)e.className=cls;
   if(text!==undefined)e.textContent=text;return e;
 };
 const closeSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg>';
 const key=()=>{
   let k="";
   try{k=String(window.getCurrentClientKey?.()||"");}catch(_){}
   if(!k||!tokenKey)return "";
   try{if(!localStorage.getItem(tokenKey))return "";}catch(_){return "";}
   // La sesión es válida y el perfil fue cargado. En Mi Espacio, el
   // estado compartido es una variable lexical global (let), NO window.*.
   // Consultar ambas formas sin bloquear a clientes reales como Casone.
   const clientes=typeof globalClientesData!=="undefined"&&globalClientesData
     ?globalClientesData:window.globalClientesData;
   if(!clientes?.[k])return "";
   return k;
 };
 const seenKey=k=>PREFIX+VERSION+":"+k;
 const completed=new Set();
 const seen=k=>{if(launch&&completed.has(seenKey(k)))return true;try{return (pilot?sessionStorage:localStorage).getItem(seenKey(k))==="1";}catch(_){return false;}};
 const mark=k=>{if(launch)completed.add(seenKey(k));try{(pilot?sessionStorage:localStorage).setItem(seenKey(k),"1");}catch(_){}};
 const reducedMotion=()=>Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
 // Cerrar pospone sólo la nueva presentación en esta pestaña. Completar la marca por cuenta/versión.
 const snoozed=new Set();
 const snoozeKey=k=>"gx-release-deferred:"+VERSION+":"+k;
 const deferred=k=>{
   if(!launch)return false;
   try{return snoozed.has(snoozeKey(k))||sessionStorage.getItem(snoozeKey(k))==="1";}catch(_){return snoozed.has(snoozeKey(k));}
 };
 const postpone=k=>{if(launch&&k){snoozed.add(snoozeKey(k));try{sessionStorage.setItem(snoozeKey(k),"1");}catch(_){}}};
 const eligible=k=>Boolean(k&&!seen(k)&&!deferred(k));
 let chapterIndex=0,backgroundInert=[];
 const queue=()=>window.GOXION_LEGAL_V2?.getQueueStatus?.()||{
   estado:"sin_activar",deferido:false,modalAbierto:false
 };
 let overlay=null,scroll=null,activeKey="",timer=0,attempts=0,open=false,focusSource=null,keyboard=false;
 let frame=0,lastTick=0,autoDelay=0,autoPosition=0,loopHeight=0,manual=false,scrollY=0;
 let handoff=null;
 function selectEdition(k){
   if(open&&activeKey!==k)dismiss(false);
   const nextPilot=mode==="pilot"&&k===PILOT;
   const nextLaunch=mode==="enabled"||nextPilot;
   const next=nextPilot?PILOT_VERSION:nextLaunch?GENERAL_VERSION:LEGACY_VERSION;
   if(next!==VERSION){
     if(open)dismiss(false);
     if(overlay){stopAuto(true);overlay.remove();overlay=null;scroll=null;}
     removePeek();
     pilot=nextPilot;launch=nextLaunch;VERSION=next;
   }
 }
 function modalBusy(ignoreHandoff=false){
   if(launch&&!ignoreHandoff&&document.body.classList.contains("gx-v2-handoff-active"))return true;
   if(document.hidden||document.body.classList.contains("no-scroll"))return true;
   if(launch&&document.querySelector('dialog[open]'))return true;
   const splash=$("#splash-screen");
   if(splash&&splash.style.visibility!=="hidden")return true;
   return Boolean(document.querySelector(
     "#gx-legal-consent[open],.modal.show,.gxai-chat-layer.gxai-visible,"+
     ".gx-welcome-modal.show,.gx-client-notif-overlay.show,"+
     ".gx-auth-sheet.show,.auth-overlay.show,.gx-legal-locked"
   ));
 }
 function removePeek(){
   const d=$("#gx-legal-consent");
   d?.classList.remove("gx-release-peek-active");
   d?.querySelector(".gx-release-stack-peek")?.remove();
 }
 function syncPeek(){
   const d=$("#gx-legal-consent"),k=key(),state=queue();
   selectEdition(k);
   if(launch||!d?.open||!k||seen(k)||state.estado!=="pendiente"){
     removePeek();return;
   }
   if(!d.querySelector(".gx-release-stack-peek")){
     const p=create("div","gx-release-stack-peek","Tu Espacio, más inteligente.");
     p.setAttribute("aria-hidden","true");
     d.append(p);
   }
   d.classList.add("gx-release-peek-active");
 }
 function stopAuto(removeClones=true){
   cancelAnimationFrame(frame);frame=0;lastTick=0;
   clearTimeout(autoDelay);autoDelay=0;
   if(removeClones&&scroll){
     const pos=loopHeight>0?autoPosition%loopHeight:scroll.scrollTop;
     scroll.querySelectorAll("[data-gx-release-clone]").forEach(node=>node.remove());
     scroll.scrollTop=Math.min(Math.floor(pos),Math.max(0,scroll.scrollHeight-scroll.clientHeight));
     autoPosition=scroll.scrollTop;loopHeight=0;
   }
 }
 function takeControl(){
   if(manual||!open)return;
   manual=true;stopAuto(true);
 }
 function tick(time){
   if(!open||manual||document.hidden||reducedMotion()){frame=0;lastTick=0;return;}
   if(!scroll||loopHeight<=0){frame=0;return;}
   if(lastTick){
     // Safari iPhone redondea subpíxeles: acumulación en enteros evita congelación.
     const elapsed=Math.max(0,Math.min(time-lastTick,80));
     autoPosition=(autoPosition+elapsed*0.030)%loopHeight;
     scroll.scrollTop=Math.floor(autoPosition);
   }
   lastTick=time;frame=requestAnimationFrame(tick);
 }
 function startAuto(){
   if(!open||manual||document.hidden||reducedMotion()||!scroll)return;
   if(!loopHeight){
     const originals=[...scroll.querySelectorAll(".gx-release-v2-item:not([data-gx-release-clone])")];
     if(originals.length!==news.length||scroll.scrollHeight<=scroll.clientHeight)return;
     loopHeight=originals.reduce((sum,item)=>sum+item.offsetHeight,0);
     if(!loopHeight)return;
     autoPosition=scroll.scrollTop;
     for(let round=0;round<2;round++){
       for(const item of originals){
         const copy=item.cloneNode(true);
         copy.setAttribute("aria-hidden","true");
         copy.dataset.gxReleaseClone="true";
         scroll.append(copy);
       }
     }
   }
   if(!frame){lastTick=0;autoPosition=scroll.scrollTop;frame=requestAnimationFrame(tick);}
 }
 function scheduleAuto(){
   if(!open||manual||reducedMotion())return;
   clearTimeout(autoDelay);
   autoDelay=setTimeout(()=>{autoDelay=0;startAuto();},850);
 }
 function releaseInert(){
   for(const node of backgroundInert)node.inert=false;
   backgroundInert=[];
 }
 function holdBackground(){
   backgroundInert=[];
   for(const node of document.body.children){
     if(node===overlay||node.inert||["SCRIPT","STYLE","LINK"].includes(node.tagName))continue;
     node.inert=true;backgroundInert.push(node);
   }
 }
 function dismiss(markSeen=true, userAction=false){
   if(!overlay||!open)return;
   const closingKey=activeKey;
   const interrupted=handoff;handoff=null;
   stopAuto(true);open=false;overlay.hidden=true;
   overlay.setAttribute("aria-hidden","true");
   document.body.classList.remove("gx-release-v2-body-lock");
   activeKey="";
   if(launch)releaseInert();
   if(markSeen&&closingKey&&(!launch||key()===closingKey))mark(closingKey);
   else if(launch&&userAction)postpone(closingKey);
   if((keyboard||launch&&userAction)&&focusSource?.isConnected&&!focusSource.closest("#gx-release-overlay")&&!focusSource.closest("[inert]"))
     focusSource.focus({preventScroll:true});
   focusSource=null;
   window.scrollTo?.(0,scrollY);
   // En WebKit una capa fixed/backdrop oculta y reutilizada puede no repintar
   // al volver de términos. La edición nueva vuelve a montar una única capa.
   if(launch){overlay.remove();overlay=null;}
   if(interrupted)interrupted.abort();
 }
 // Presentación nueva dentro del mismo overlay, con un solo motor de elegibilidad.
 // Los gráficos son recursos semánticos del propio GOXION, no estados/importe simulados.
 const art={
   cover:'<div class="gx-launch-orbit"><img src="./Logo individual.png" alt="" width="100" height="100" decoding="async"></div>',
   space:'<div class="gx-launch-visual-space"><svg viewBox="0 0 104 104" fill="none"><rect x="12" y="19" width="80" height="66" rx="21" fill="currentColor" opacity=".07"/><path d="M28 44h31M28 55h47M28 66h22" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".75"/><circle cx="77" cy="36" r="9" fill="#79e6fc"/><path d="m73 36 3 3 5-6" stroke="#071c29" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>',
   benefits:'<div class="gx-launch-benefit-icons"><span>⭐</span><span>🎁</span><span>🎯</span></div>',
   services:'<div class="gx-launch-calendar"><svg viewBox="0 0 104 104" fill="none"><rect x="18" y="24" width="68" height="62" rx="12" stroke="currentColor" stroke-width="3"/><path d="M18 43h68M36 17v16m32-16v16" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M35 57h8m9 0h8m9 0h3M35 69h8m9 0h8" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".75"/><circle cx="73" cy="75" r="14" fill="#1f2731" stroke="#79e6fc" stroke-width="2"/><path d="M73 67v8l5 3" stroke="#79e6fc" stroke-width="2.5" stroke-linecap="round"/></svg></div>',
   catalog:'<div class="gx-launch-catalog"><svg viewBox="0 0 104 104" fill="none"><path d="M24 38h56l8 45H16l8-45Z" fill="currentColor" opacity=".09"/><path d="M24 38h56l8 45H16l8-45Zm13 1V29a15 15 0 0 1 30 0v10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="m79 21 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#79e6fc"/></svg></div>',
   support:'<div class="gx-launch-support"><svg viewBox="0 0 104 104" fill="none"><rect x="17" y="20" width="70" height="56" rx="20" fill="currentColor" opacity=".09"/><rect x="17" y="20" width="70" height="56" rx="20" stroke="currentColor" stroke-width="3"/><path d="M35 46h8m18 0h8M44 61h16" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="m78 71 5 10 11 2-8 8 2 11-10-5-10 5 2-11-8-8 11-2 5-10Z" fill="#f2c97e"/></svg></div>'
 };
 function showChapter(index,direction=0){
   chapterIndex=Math.max(0,Math.min(index,chapters.length-1));
   const c=chapters[chapterIndex],body=$(".gx-launch-content",overlay);
   body.dataset.chapter=c.id;
   body.dataset.direction=String(direction);
   const caption=c.id==="cover"?'<p class="gx-launch-kicker">UNA NUEVA EXPERIENCIA</p>':"";
   body.innerHTML='<div class="gx-launch-art" aria-hidden="true">'+art[c.art]+'</div>'+
     '<div class="gx-launch-copy">'+caption+
     '<h2 id="gx-release-v2-title">'+c.title+(c.accent?' <span>'+c.accent+'</span>':'')+'</h2>'+
     '<p class="gx-launch-description">'+c.copy+'</p></div>';
   body.scrollTop=0;
   const segments=[...overlay.querySelectorAll(".gx-launch-progress span")];
   segments.forEach((segment,i)=>{segment.dataset.state=i===chapterIndex?"current":i<chapterIndex?"done":"next";});
   $(".gx-launch-progress",overlay).setAttribute("aria-label","Paso "+(chapterIndex+1)+" de "+chapters.length);
   $(".gx-launch-status",overlay).textContent="Paso "+(chapterIndex+1)+" de "+chapters.length;
   const backButton=$(".gx-launch-back",overlay),wasOnBack=document.activeElement===backButton;
   backButton.disabled=chapterIndex===0;
   if(wasOnBack&&backButton.disabled)$(".gx-launch-next",overlay).focus({preventScroll:true});
   $(".gx-launch-next",overlay).textContent=chapterIndex===chapters.length-1?"Explorar Mi Espacio":chapterIndex===0?"Comenzar":"Siguiente";
 }
 function finishLaunch(){
   const current=key();
   if(!current||current!==activeKey){dismiss(false);return;}
   const state=queue(),access=window.GOXION_LEGAL_V2?.getAccessState?.();
   if(!["aceptado","pendiente"].includes(state.estado)||state.modalAbierto||(state.estado==="pendiente"&&!state.deferido)||access?.restringido||access?.bloquea_operaciones){dismiss(false);return;}
   dismiss(true,true);
   if(!$("#view-dashboard")?.classList.contains("active"))window.switchTab?.("inicio");
 }
 function mountLaunch(){
   overlay.dataset.edition="launch";
   overlay.innerHTML=[
     '<section class="gx-release-v2-card gx-launch-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="gx-release-v2-title">',
     '<header class="gx-launch-header"><div class="gx-launch-progress" role="progressbar" aria-label="Paso 1 de 6" aria-valuemin="1" aria-valuemax="6" aria-valuenow="1">'+chapters.map(()=>'<span></span>').join("")+'</div>',
     '<button type="button" class="gx-launch-close" aria-label="Posponer novedades"><span>'+closeSvg+'</span></button></header>',
     '<div class="gx-launch-content" aria-live="polite" aria-atomic="true"></div>',
     '<span class="gx-launch-status" role="status"></span>',
     '<footer class="gx-launch-footer"><button type="button" class="gx-launch-back">Atrás</button><button type="button" class="gx-launch-next">Comenzar</button></footer></section>'
   ].join("");
   const render=(i,direction)=>{showChapter(i,direction);$(".gx-launch-progress",overlay).setAttribute("aria-valuenow",String(chapterIndex+1));};
   const next=()=>{if(chapterIndex===chapters.length-1)finishLaunch();else render(chapterIndex+1,1);};
   const back=()=>{if(chapterIndex>0)render(chapterIndex-1,-1);};
   overlay.addEventListener("click",e=>{
     if(e.target.closest?.(".gx-launch-close"))dismiss(false,true);
     else if(e.target.closest?.(".gx-launch-next"))next();
     else if(e.target.closest?.(".gx-launch-back"))back();
   });
   overlay.addEventListener("keydown",e=>{
     if(e.key==="Escape"){e.preventDefault();dismiss(false,true);return;}
     if(e.key==="ArrowRight"){e.preventDefault();if(chapterIndex<chapters.length-1)next();return;}
     if(e.key==="ArrowLeft"){e.preventDefault();back();return;}
     if(e.key!=="Tab")return;
     const buttons=[...overlay.querySelectorAll("button:not([disabled])")];
     if(e.shiftKey&&(document.activeElement===buttons[0]||document.activeElement===$(".gx-launch-card",overlay))){e.preventDefault();buttons.at(-1).focus();}
     else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
   });
   render(0,0);
 }
 function mount(){
   if(overlay)return overlay;
   overlay=create("div","gx-release-v2");overlay.id="gx-release-overlay";
   overlay.hidden=true;overlay.tabIndex=-1;
   overlay.setAttribute("aria-hidden","true");
   if(launch){mountLaunch();document.body.append(overlay);return overlay;}
   overlay.innerHTML=[
     '<section class="gx-release-v2-card" role="dialog" aria-modal="true" aria-labelledby="gx-release-v2-title">',
       '<header class="gx-release-v2-header">',
         '<button type="button" class="gx-release-v2-close" data-gx-release-dismiss aria-label="Cerrar novedades">'+closeSvg+'</button>',
         '<h2 id="gx-release-v2-title">Tu Espacio, <span>más inteligente.</span></h2>',
       '</header>',
       '<div class="gx-release-v2-scroll" tabindex="0" role="region" aria-label="Todas las novedades de GOXION">',
         news.map((item,i)=>
           '<article class="gx-release-v2-item" data-gx-release-item="'+i+'">'+
             '<span class="gx-release-v2-mark" aria-hidden="true">'+item.symbol+'</span>'+
             '<div><h3>'+item.title+'</h3><p>'+item.copy+'</p></div>'+
           '</article>'
         ).join(""),
       '</div>',
       '<footer class="gx-release-v2-footer">',
         '<button type="button" class="gx-release-v2-primary" data-gx-release-dismiss>¡Entendido! Explorar Mi Espacio</button>',
       '</footer>',
     '</section>'
   ].join("");
   document.body.append(overlay);
   scroll=$(".gx-release-v2-scroll",overlay);
   overlay.dataset.input="pointer";
   overlay.addEventListener("pointerdown",()=>{keyboard=false;overlay.dataset.input="pointer";},{passive:true});
   overlay.addEventListener("touchstart",()=>{keyboard=false;overlay.dataset.input="pointer";},{passive:true});
   overlay.addEventListener("click",e=>{
     if(e.target.closest?.("[data-gx-release-dismiss]")||e.target===overlay)dismiss(true);
   });
   overlay.addEventListener("keydown",e=>{
     keyboard=true;overlay.dataset.input="keyboard";
     if(e.key==="Escape"){e.preventDefault();dismiss(true);return;}
     if(e.key!=="Tab")return;
     const buttons=[...overlay.querySelectorAll("button:not([disabled])")];
     if(!buttons.length)return;
     if(e.shiftKey&&document.activeElement===buttons[0]){
       e.preventDefault();buttons[buttons.length-1].focus();
     }else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){
       e.preventDefault();buttons[0].focus();
     }
   });
   const claim=()=>takeControl();
   scroll.addEventListener("touchstart",claim,{passive:true});
   scroll.addEventListener("pointerdown",claim,{passive:true});
   scroll.addEventListener("wheel",claim,{passive:true});
   scroll.addEventListener("keydown",e=>{
     if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(e.key))
       takeControl();
   });
   return overlay;
 }
 function present(claim=false){
   const k=key(),state=queue();
   selectEdition(k);
   const access=launch?window.GOXION_LEGAL_V2?.getAccessState?.():null;
   if(!eligible(k)||open||modalBusy(claim)||state.estado==="sin_activar"||
      (launch&&(!["aceptado","pendiente"].includes(state.estado)||access?.restringido||access?.bloquea_operaciones))||
      state.estado==="rechazado"||state.modalAbierto||
      (state.estado==="pendiente"&&!state.deferido))return false;
   mount();
   if(open)return false;
   if(claim)overlay.dataset.handoff="flying";
   activeKey=k;focusSource=document.activeElement;
   scrollY=Number(window.scrollY)||0;
   if(!launch){manual=false;stopAuto(true);scroll.scrollTop=0;}
   open=true;overlay.hidden=false;overlay.setAttribute("aria-hidden","false");
   document.body.classList.add("gx-release-v2-body-lock");
   if(launch)holdBackground();
   (launch?$(".gx-launch-card",overlay):overlay).focus({preventScroll:true});
   if(!launch)scheduleAuto();
   return true;
 }
 function schedule(delay=450){
   clearTimeout(timer);timer=0;
   const k=key();
   selectEdition(k);
   if(!eligible(k))return;
   attempts=0;
   const attempt=()=>{
     if(key()!==k||!eligible(k)||open)return;
     if(present())return;
     // No competir con otros modales; reintentar sin bloquear la navegación.
     if(++attempts<85)timer=setTimeout(attempt,800);
   };
   timer=setTimeout(attempt,delay);
 }
 function handoffStatus(){
   const k=key();selectEdition(k);
   if(!launch||!eligible(k)||open||modalBusy(true))return "skip";
   const state=queue(),access=window.GOXION_LEGAL_V2?.getAccessState?.();
   if(state.modalAbierto||access?.restringido||access?.bloquea_operaciones)return "skip";
   return state.estado==="aceptado"?"ready":state.estado==="sin_activar"?"waiting":"skip";
 }
 function claimHandoff(){
   const root=$("#gx-v2-handoff");
   if(!root||root.hidden||!document.body.classList.contains("gx-v2-handoff-active")||handoffStatus()!=="ready"||!present(true))return null;
   const target=$(".gx-launch-orbit img",overlay);
   const controller=new AbortController();handoff=controller;
   const complete=()=>{
     if(handoff!==controller)return;
     handoff=null;
     if(overlay)delete overlay.dataset.handoff;
   };
   if(!target){complete();return null;}
   return {target,signal:controller.signal,complete,cancel:complete};
 }
 function logout(resetPilot=false){
   clearTimeout(timer);timer=0;attempts=0;
   dismiss(false);removePeek();
   if(resetPilot===true&&mode==="pilot"){
     const seenId=PREFIX+PILOT_VERSION+":"+PILOT,delayId="gx-release-deferred:"+PILOT_VERSION+":"+PILOT;
     completed.delete(seenId);snoozed.delete(delayId);
     try{sessionStorage.removeItem(seenId);sessionStorage.removeItem(delayId);}catch(_){}
   }
 }
 window.addEventListener("goxion:legal-opened",()=>{
   clearTimeout(timer);timer=0;
   if(open)dismiss(false);
   syncPeek();
 });
 window.addEventListener("goxion:legal-dismissed",()=>{
   removePeek();
   // X y "Ahora no" afectan solo los términos. Novedades van después.
   schedule(210);
 });
 window.addEventListener("goxion:legal-state",e=>{
   if(e.detail?.acceso?.restringido||e.detail?.estado==="rechazado"||
      (launch&&(e.detail?.acceso?.bloquea_operaciones||e.detail?.estado==="sin_activar"||
                (e.detail?.estado==="pendiente"&&!queue().deferido)))){
     dismiss(false);removePeek();clearTimeout(timer);return;
   }
   syncPeek();
   if(!$("#gx-legal-consent")?.open)schedule(800);
 });
 window.addEventListener("goxion:client-ready",()=>schedule(1300));
 window.addEventListener("goxion:client-logout",()=>logout(true));
 window.addEventListener("goxion:v2-handoff:finished",()=>{selectEdition(key());if(launch&&!open)schedule(200);});
 window.addEventListener("storage",e=>{
   if(e.key===tokenKey){logout();if(e.newValue)schedule(1000);}
 });
 window.addEventListener("focus",()=>{
   if(!document.hidden&&!open)schedule(700);
 });
 document.addEventListener("visibilitychange",()=>{
   if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTick=0;return;}
   if(open&&!manual&&!launch)scheduleAuto();
   else schedule(700);
 });
 window.GOXION_RELEASE_202610=Object.freeze({
   get version(){return VERSION;},handoffStatus,claimHandoff,close:()=>dismiss(!launch,launch),refresh:()=>schedule(250)
 });
 if(document.readyState!=="loading")schedule(1200);
 else document.addEventListener("DOMContentLoaded",()=>schedule(1200),{once:true});
})();
