/* GOXION · Avisos oficiales 2.0: términos reales primero, novedades independientes después.
 * Novedades informativas una sola vez por cuenta/version/navegador.
 * No escribe consentimiento, fechas ni operaciones comerciales. */
(()=>{
 "use strict";
 if(window.GOXION_RELEASE_202610)return;
 const VERSION="nov2026-novedades-apiladas-v2-todos";
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
 const $=(selector,root=document)=>root.querySelector(selector);
 const create=(tag,cls,text)=>{
   const e=document.createElement(tag);if(cls)e.className=cls;
   if(text!==undefined)e.textContent=text;return e;
 };
 const closeSvg='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg>';
 const key=()=>{
   let k="";
   try{k=String(window.getCurrentClientKey?.()||"");}catch(_){}
   if(!k||!tokenKey||!localStorage.getItem(tokenKey))return "";
   // La sesión es válida y el perfil fue cargado. En Mi Espacio, el
   // estado compartido es una variable lexical global (let), NO window.*.
   // Consultar ambas formas sin bloquear a clientes reales como Casone.
   const clientes=typeof globalClientesData!=="undefined"&&globalClientesData
     ?globalClientesData:window.globalClientesData;
   if(!clientes?.[k])return "";
   return k;
 };
 const seenKey=k=>PREFIX+VERSION+":"+k;
 const seen=k=>{try{return localStorage.getItem(seenKey(k))==="1";}catch(_){return false;}};
 const mark=k=>{try{localStorage.setItem(seenKey(k),"1");}catch(_){}};
 const reducedMotion=()=>Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
 const queue=()=>window.GOXION_LEGAL_V2?.getQueueStatus?.()||{
   estado:"sin_activar",deferido:false,modalAbierto:false
 };
 let overlay=null,scroll=null,activeKey="",timer=0,attempts=0,open=false,focusSource=null,keyboard=false;
 let frame=0,lastTick=0,autoDelay=0,autoPosition=0,loopHeight=0,manual=false,scrollY=0;
 function modalBusy(){
   if(document.hidden||document.body.classList.contains("no-scroll"))return true;
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
   if(!d?.open||!k||seen(k)||state.estado!=="pendiente"){
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
 function dismiss(markSeen=true){
   if(!overlay||!open)return;
   const closingKey=activeKey;
   stopAuto(true);open=false;overlay.hidden=true;
   overlay.setAttribute("aria-hidden","true");
   document.body.classList.remove("gx-release-v2-body-lock");
   activeKey="";
   if(markSeen&&closingKey)mark(closingKey);
   if(keyboard&&focusSource?.isConnected&&!focusSource.closest("#gx-release-overlay"))
     focusSource.focus({preventScroll:true});
   focusSource=null;
   window.scrollTo?.(0,scrollY);
 }
 function mount(){
   if(overlay)return overlay;
   overlay=create("div","gx-release-v2");overlay.id="gx-release-overlay";
   overlay.hidden=true;overlay.tabIndex=-1;
   overlay.setAttribute("aria-hidden","true");
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
 function present(){
   const k=key(),state=queue();
   if(!k||seen(k)||open||modalBusy()||state.estado==="sin_activar"||
      state.estado==="rechazado"||state.modalAbierto||
      (state.estado==="pendiente"&&!state.deferido))return false;
   mount();
   if(open)return false;
   activeKey=k;focusSource=document.activeElement;
   scrollY=Number(window.scrollY)||0;
   manual=false;stopAuto(true);scroll.scrollTop=0;
   open=true;overlay.hidden=false;overlay.setAttribute("aria-hidden","false");
   document.body.classList.add("gx-release-v2-body-lock");
   overlay.focus({preventScroll:true});
   scheduleAuto();
   return true;
 }
 function schedule(delay=450){
   clearTimeout(timer);timer=0;
   const k=key();
   if(!k||seen(k))return;
   attempts=0;
   const attempt=()=>{
     if(!key()||key()!==k||seen(k)||open)return;
     if(present())return;
     // No competir con otros modales; reintentar sin bloquear la navegación.
     if(++attempts<85)timer=setTimeout(attempt,800);
   };
   timer=setTimeout(attempt,delay);
 }
 function logout(){
   clearTimeout(timer);timer=0;attempts=0;
   dismiss(false);removePeek();
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
   if(e.detail?.acceso?.restringido||e.detail?.estado==="rechazado"){
     dismiss(false);removePeek();clearTimeout(timer);return;
   }
   syncPeek();
   if(!$("#gx-legal-consent")?.open)schedule(800);
 });
 window.addEventListener("goxion:client-ready",()=>schedule(1300));
 window.addEventListener("goxion:client-logout",logout);
 window.addEventListener("storage",e=>{
   if(e.key===tokenKey){logout();if(e.newValue)schedule(1000);}
 });
 window.addEventListener("focus",()=>{
   if(!document.hidden&&!open)schedule(700);
 });
 document.addEventListener("visibilitychange",()=>{
   if(document.hidden){cancelAnimationFrame(frame);frame=0;lastTick=0;return;}
   if(open&&!manual)scheduleAuto();
   else schedule(700);
 });
 window.GOXION_RELEASE_202610=Object.freeze({
   version:VERSION,close:()=>dismiss(true),refresh:()=>schedule(250)
 });
 if(document.readyState!=="loading")schedule(1200);
 else document.addEventListener("DOMContentLoaded",()=>schedule(1200),{once:true});
})();