/* GOXION · Avisos oficiales 2.0: términos reales primero, novedades independientes después.
 * Novedades informativas una sola vez por cuenta/version/navegador.
 * No escribe consentimiento, fechas ni operaciones comerciales. */
(()=>{
 "use strict";
 if(window.GOXION_RELEASE_202610)return;
 // La edición nueva es opt-in por configuración del HTML, no por URL ni storage.
 // La rama candidata la conserva apagada hasta autorización de lanzamiento.
 const mode=document.documentElement.getAttribute("data-gx-release-launch");
 const PILOT="casone",PILOT_VERSION="nov2026-mi-espacio-lanzamiento-pilot-k3";
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
 const baseChapters=[
   {id:"cover",title:"Tu Espacio.",accent:"Más inteligente que nunca.",copy:"Todo lo que necesitas, en una experiencia más clara y cercana.",art:"cover"},
   {id:"space",title:"Tu cuenta,",accent:"de un vistazo.",copy:"Consulta lo importante de tu cuenta, sigue tus servicios y revisa tus movimientos desde Mi Espacio.",art:"space"},
   {id:"benefits",title:"Cada avance",accent:"cuenta.",copy:"Descubre tus ahorros y sigue tu lealtad, referidos y misiones en un solo lugar.",art:"benefits"},
   {id:"services",title:"Todo",accent:"en su fecha.",copy:"Consulta tus vencimientos, estado de cuenta y opciones de prórroga cuando tu cuenta sea elegible.",art:"services"},
   {id:"catalog",title:"Encuentra tu",accent:"próximo favorito.",copy:"Explora plataformas, combos y promociones; elige tus servicios y revisa tu selección en el carrito.",art:"catalog"},
   {id:"support",title:"Estamos",accent:"más cerca.",copy:"Personaliza a Goxy, encuentra ayuda desde Soporte y comparte tu opinión para seguir mejorando.",art:"support"}
 ];
 const pushChapter={id:"push",title:"Siempre",accent:"conectado.",copy:"Recibe avisos de tus servicios, pagos y recompensas directamente en tu teléfono. Tú eliges cuáles recibir.",art:"push"};
 let chapters=baseChapters;
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
 // La presentación nueva sólo se consume al completar su último capítulo.
 const eligible=k=>Boolean(k&&!seen(k));
 let chapterIndex=0,backgroundInert=[];
 const queue=()=>window.GOXION_LEGAL_V2?.getQueueStatus?.()||{
   estado:"sin_activar",deferido:false,modalAbierto:false
 };
 let overlay=null,scroll=null,activeKey="",activeSession="",timer=0,attempts=0,open=false,focusSource=null,keyboard=false;
 let frame=0,lastTick=0,autoDelay=0,autoPosition=0,loopHeight=0,manual=false,scrollY=0;
 let handoff=null,goxyPortrait=null,goxySlot=null,goxyAvatar=null,goxyAvatarPaused=null,goxyFlight=null,goxyImpact=null;
 let colorTimer=0,colorOptions=[],colorStep=0,colorComplete=true,colorFrame=0,colorTween=null;
 let entryTimer=0,entryAnimation=null;
 let legalContinuation=null,legalReservation=null;
 const session=()=>{try{return tokenKey?localStorage.getItem(tokenKey)||"":"";}catch(_){return "";}};
 const legalDue=()=>{const state=queue(),access=window.GOXION_LEGAL_V2?.getAccessState?.();
   return state.estado==="pendiente"&&!state.deferido&&!state.modalAbierto&&!access?.restringido&&!access?.bloquea_operaciones;
 };
 const continuationValid=()=>legalContinuation&&key()===legalContinuation.account&&session()===legalContinuation.session&&legalDue();
 // Sólo aplaza la aparición automática; no cambia el acceso, el recordatorio,
 // la sesión, el consentimiento ni el orden de una lectura ya iniciada.
 function holdsLegalOffer(){
   const k=key();selectEdition(k);
   if(!launch||!legalDue()||!k)return false;
   if(continuationValid())return true;
   if(open&&activeKey===k&&activeSession===session())return true;
   if(!eligible(k))return false;
   const current=session();
   if(legalReservation?.session!==current||legalReservation?.account!==k)
      legalReservation={account:k,session:current,until:Date.now()+9000};
   // Fail-safe: sin una presentación que llegue a abrirse, el legal se libera.
   return Date.now()<legalReservation.until;
 }
 function clearLegalContinuation(resume=false){
   const c=legalContinuation;legalContinuation=null;
   if(c)clearTimeout(c.timer);
   if(!open)releaseInert();
   if(resume&&c&&key()===c.account&&session()===c.session&&legalDue())
     window.dispatchEvent(new Event("goxion:release:legal-ready"));
 }
 function startLegalCooldown(){
   if(!legalContinuation||legalContinuation.phase==="cooldown")return;
   if(!continuationValid()){clearLegalContinuation();return;}
   legalContinuation.phase="cooldown";
   legalContinuation.timer=setTimeout(()=>clearLegalContinuation(true),1800);
 }
 // Una sola decisión para el vuelo inicial, la apertura normal y la salida.
 function launchGate(state,access){
   if(state.modalAbierto||access?.restringido||access?.bloquea_operaciones)return "skip";
   if(state.estado==="sin_activar")return "waiting";
   return state.estado==="aceptado"||state.estado==="pendiente"?"ready":"skip";
 }
 function selectEdition(k){
   if(goxyFlight&&goxyFlight.account!==k)stopGoxyFlight(false);
   if(legalContinuation&&(legalContinuation.account!==k||legalContinuation.session!==session()))clearLegalContinuation();
   if(open&&(activeKey!==k||activeSession!==session()))dismiss(false);
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
 function dismiss(markSeen=true, userAction=false, keepGoxyFlight=false){
   if(!markSeen&&legalContinuation)clearLegalContinuation();
   if(!keepGoxyFlight){stopGoxyFlight(false);releaseGoxy();}
   if(!overlay||!open)return;
   const closingKey=activeKey,closingSession=activeSession;
   const interrupted=handoff;handoff=null;
   if(launch)finishEntry();
   stopAuto(true);open=false;overlay.hidden=true;
   overlay.setAttribute("aria-hidden","true");
   document.body.classList.remove("gx-release-v2-body-lock");
   activeKey="";activeSession="";
   if(launch&&!legalContinuation)releaseInert();
   if(markSeen&&closingKey&&(!launch||key()===closingKey&&session()===closingSession))mark(closingKey);

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
   // PulsoIcon · list-checks, calendar-clock, shopping-bag; paths & motion recipes
   // adapted to vanilla CSS, ISC + upstream notices in PULSOICON-LICENSE.txt.
   space:'<div class="gx-launch-pulso gx-launch-visual-space"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round"><path class="gx-pulso-row gx-pulso-row-a" d="M13 5h8"/><path class="gx-pulso-row gx-pulso-row-b" d="M13 12h8"/><path class="gx-pulso-row gx-pulso-row-c" d="M13 19h8"/><path class="gx-pulso-check gx-pulso-check-b" pathLength="1" d="m3 17 2 2 4-4"/><path class="gx-pulso-check gx-pulso-check-a" pathLength="1" d="m3 7 2 2 4-4"/></svg></div>',
   benefits:'<div class="gx-launch-benefit-icons"><span>⭐</span><span>🎁</span><span>🎯</span></div>',
   services:'<div class="gx-launch-pulso gx-launch-calendar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><g class="gx-pulso-calendar-case"><path d="M21 7.338V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h2.338"/><path d="M3 9h5.859"/></g><path class="gx-pulso-calendar-ring gx-pulso-ring-a" d="M16 2v3"/><path class="gx-pulso-calendar-ring gx-pulso-ring-b" d="M8 2v3"/><circle class="gx-pulso-clock-dial" cx="16" cy="16" r="6"/><path class="gx-pulso-clock-hand" d="M16 14v2.2l1.6 1"/></svg></div>',
   catalog:'<div class="gx-launch-pulso gx-launch-catalog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"><g class="gx-pulso-bag"><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/><path class="gx-pulso-bag-handle" pathLength="1" d="M16 10a4 4 0 0 1-8 0"/></g></svg></div>',
   push:'<div class="gx-k3-launch-bell"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M3 7l1-3m16 0 1 3"/></svg></div>',
   support:'<div class="gx-launch-goxy-mount"></div>'  
 };
 // The original robot-heads renderer is mounted once, at its native large size.
 // It is paused and detached outside this chapter; no second visible animated mascot.
 const avatarEl=()=>$("#gxn-avatar");
 const noMotion=()=>reducedMotion()||document.hidden;
  // Read the actual account palette; never change the saved selection or tint the face.
  const avatarColor=()=>goxyAvatar?.getAttribute("data-goxy-color")||null;
  function paintGoxyColor(color){
    if(!goxySlot)return;
    if(color)goxySlot.setAttribute("data-goxy-color",color);
    else goxySlot.removeAttribute("data-goxy-color");
  }
  const defaultShell="#3552b1";
  const shellHex=color=>/^#[0-9a-f]{6}$/i.test(color||"")?color.toLowerCase():defaultShell;
  const mixShell=(a,b,t)=>{
    const mix=(offset)=>Math.round(parseInt(a.slice(offset,offset+2),16)*(1-t)+parseInt(b.slice(offset,offset+2),16)*t).toString(16).padStart(2,"0");
    return "#"+mix(1)+mix(3)+mix(5);
  };
  function suspendColorPreview(){
    clearTimeout(colorTimer);colorTimer=0;
    cancelAnimationFrame(colorFrame);colorFrame=0;
    if(colorTween)colorTween.last=0;
  }
  function stopColorPreview(restore=false){
    suspendColorPreview();colorTween=null;
    if(restore){colorComplete=true;paintGoxyColor(avatarColor());}
  }
  function advanceColor(time){
    colorFrame=0;
    const t=colorTween;
    if(!t||noMotion()||!goxyPortrait?.isConnected)return;
    if(t.last)t.elapsed+=Math.max(0,time-t.last);
    t.last=time;
    const progress=Math.min(t.elapsed/t.duration,1);
    // Ease in/out, 30fps maximum; update only the actual shell material,
    // never filter the face, create a second renderer, or write a preference.
    if(progress===1||time-t.painted>=32){
      t.painted=time;
      const value=progress===1?t.target:mixShell(t.from,shellHex(t.target),progress*progress*(3-2*progress));
      if(goxySlot?.getAttribute("data-goxy-color")!==value)paintGoxyColor(value);
    }
    if(progress<1){colorFrame=requestAnimationFrame(advanceColor);return;}
    colorTween=null;
    if(!t.flight)scheduleColorPreview();
  }
  function tweenColor(target,duration,flight=false){
    colorTween={from:shellHex(goxySlot?.getAttribute("data-goxy-color")),target,duration,elapsed:0,last:0,painted:0,flight};
    colorFrame=requestAnimationFrame(advanceColor);
  }
  function scheduleColorPreview(){
    suspendColorPreview();
    if(reducedMotion()){stopColorPreview(true);return;}
    if(noMotion()||goxyFlight||!goxyPortrait?.isConnected)return;
    if(colorTween){colorFrame=requestAnimationFrame(advanceColor);return;}
    if(colorComplete)return;
    colorTimer=setTimeout(()=>{
      colorTimer=0;
      if(noMotion()||goxyFlight||!goxyPortrait?.isConnected)return;
      if(colorStep>=colorOptions.length){
        // Return at the same calm pace; no abrupt reset after the preview.
        colorComplete=true;tweenColor(avatarColor(),760);return;
      }
      tweenColor(colorOptions[colorStep++],760);
    },colorStep===0?1450:1350);
  }
 function syncGoxyMotion(){
   if(goxySlot)goxySlot.setAttribute("data-goxy-paused",String(noMotion()||!goxyPortrait?.isConnected));
    scheduleColorPreview();
 }
 function releaseGoxy(){
    stopColorPreview(true);
    colorOptions=[];colorStep=0;
   if(!goxyPortrait&&!goxyAvatar)return;
   if(goxyPortrait){goxySlot?.setAttribute("data-goxy-paused","true");goxyPortrait.remove();}
   document.body.classList.remove("gx-launch-goxy-active");
   if(goxyAvatar){
     const paused=document.hidden||$("#view-soporte")?.classList.contains("active")||goxyAvatarPaused==="true";
     if(goxyAvatarPaused===null&&!paused)goxyAvatar.removeAttribute("data-goxy-paused");
     else goxyAvatar.setAttribute("data-goxy-paused",String(Boolean(paused)));
   }
   goxyAvatar=null;goxyAvatarPaused=null;
 }
 function mountGoxyChapter(host){
   if(!host)return;
   const avatar=avatarEl(),source=$("#gxn-goxy-slot");
   if(!goxyPortrait){
     goxyPortrait=create("div","gx-launch-goxy-portrait");
     const fallback=avatar?.querySelector(".gxn-goxy-fallback")?.cloneNode(true);
     if(fallback){
       fallback.className="gx-launch-goxy-fallback";
       for(const e of fallback.querySelectorAll("[id]")){
         const id=e.id,next="gx-launch-"+id;e.id=next;
         for(const el of fallback.querySelectorAll("[fill],[stroke]"))for(const a of ["fill","stroke"])if(el.getAttribute(a)==="url(#"+id+")")el.setAttribute(a,"url(#"+next+")");
       }
       goxyPortrait.append(fallback);
     }
     goxySlot=create("span","gx-launch-goxy-render gxai-canvas-slot");
     goxySlot.setAttribute("data-mood","happy");
     goxyPortrait.append(goxySlot);
   }
   host.append(goxyPortrait);
   if(source){goxyAvatar=source;goxyAvatarPaused=source.getAttribute("data-goxy-paused");source.setAttribute("data-goxy-paused","true");}
    const color=avatarColor();paintGoxyColor(color);
    colorOptions=[...new Set([...document.querySelectorAll("#gxn-goxy-colors [data-goxy-color-choice]")]
      .map(button=>button.style.getPropertyValue("--swatch").trim().toLowerCase())
      .filter(value=>/^#[0-9a-f]{6}$/.test(value)&&value!==shellHex(color)))];
    colorStep=0;colorComplete=colorOptions.length===0;
   document.body.classList.add("gx-launch-goxy-active");
   syncGoxyMotion();
   try{window.GOXY_ROBOT?.mount?.(goxySlot);}catch(_){}
 }
 function clearImpact(){
   if(!goxyImpact)return;
   clearTimeout(goxyImpact.timer);goxyImpact.anim?.cancel();goxyImpact.node.remove();goxyImpact=null;
 }
 function impactAt(avatar){
   if(!avatar?.isConnected||noMotion())return;
   const r=avatar.getBoundingClientRect();if(!r.width||!r.height)return;
   const node=create("span","gx-launch-goxy-impact");
   node.setAttribute("aria-hidden","true");
   Object.assign(node.style,{left:r.left+"px",top:r.top+"px",width:r.width+"px",height:r.height+"px"});
   document.body.append(node);
   let anim=null;
   try{anim=avatar.animate([{transform:"scale(.90)"},{transform:"scale(1.07)",offset:.47},{transform:"scale(1)"}],{duration:350,easing:"cubic-bezier(.2,.75,.25,1)"});}catch(_){}
   goxyImpact={node,anim,timer:setTimeout(clearImpact,520)};
 }
 function stopGoxyFlight(arrived=false){
   const f=goxyFlight;if(!f){if(!arrived)clearImpact();return;}
   goxyFlight=null;clearTimeout(f.timer);try{f.anim?.cancel();}catch(_){}
   f.shell.remove();releaseGoxy();
   if(arrived&&key()===f.account&&!modalBusy()&&!noMotion())impactAt(f.avatar);
   else clearImpact();
   if(legalContinuation?.phase==="flight")startLegalCooldown();
 }
 function beginGoxyFlight(){
   if(!goxyPortrait?.isConnected||!goxySlot?.querySelector("canvas")||noMotion()||goxyFlight||!$("#view-dashboard")?.classList.contains("active"))return false;
   const avatar=avatarEl();
   if(!avatar||avatar.querySelector(".gxn-avatar-photo:not([hidden])")||!avatar.getClientRects().length||typeof goxyPortrait.animate!=="function")return false;
   const a=goxyPortrait.getBoundingClientRect(),b=avatar.getBoundingClientRect();
   if(!a.width||!a.height||!b.width||!b.height||b.top<0||b.bottom>innerHeight||b.left<0||b.right>innerWidth)return false;
    // Smoothly recover the selected shell during the first part of the flight.
    stopColorPreview();
   clearImpact();
   const shell=create("div","gx-launch-goxy-flight");
   shell.setAttribute("aria-hidden","true");
   Object.assign(shell.style,{left:a.left+"px",top:a.top+"px",width:a.width+"px",height:a.height+"px"});
   // Capture current floating position. The real live portrait moves, not a screenshot or duplicate.
   document.body.append(shell);shell.append(goxyPortrait);
   const dx=b.left+b.width/2-a.left-a.width/2,dy=b.top+b.height/2-a.top-a.height/2,
     scale=Math.min(b.width/a.width,b.height/a.height);
   const t=(x,y,z)=>"translate3d("+x+"px,"+y+"px,0) scale("+z+")";
   const f={shell,avatar,account:activeKey,anim:null,timer:0};goxyFlight=f;
   colorComplete=true;tweenColor(avatarColor(),320,true);
   try{
     f.anim=shell.animate([
       {transform:t(0,0,1),offset:0,easing:"cubic-bezier(.4,0,.8,.5)"},
       {transform:t(-dx*.026,-dy*.026,1.025),offset:.14,easing:"cubic-bezier(.55,.02,.75,.45)"},
       {transform:t(dx,dy,scale*1.08),offset:.79,easing:"ease-out"},
       {transform:t(dx,dy,scale*.89),offset:.89,easing:"ease-out"},
       {transform:t(dx,dy,scale),offset:1}
     ],{duration:620,fill:"forwards"});
     f.timer=setTimeout(()=>{if(goxyFlight===f)stopGoxyFlight(true)},850);
     f.anim.finished.then(()=>{if(goxyFlight===f)stopGoxyFlight(true)},()=>{if(goxyFlight===f)stopGoxyFlight(false)});
     return true;
   }catch(_){stopGoxyFlight(false);return false;}
 }
 function exitLaunch(){
   const flying=chapterIndex===chapters.length-1&&beginGoxyFlight();
   if(legalDue())legalContinuation={account:activeKey,session:session(),phase:"flight",timer:0};
   dismiss(true,true,flying);
   if(!flying)startLegalCooldown();
 }
 function updateMotion(){
   if(!overlay||!launch)return;
   overlay.dataset.motion=document.hidden?"paused":"playing";
   syncGoxyMotion();
 }
  function showChapter(index,direction=0){
   chapterIndex=Math.max(0,Math.min(index,chapters.length-1));
   const c=chapters[chapterIndex],body=$(".gx-launch-content",overlay);
   releaseGoxy();
   overlay.dataset.chapter=c.id;
   overlay.dataset.accent=chapterIndex%2===0?"violet":"cyan";
   body.dataset.chapter=c.id;
   body.dataset.direction=String(direction);
   const caption=c.id==="cover"?'<p class="gx-launch-kicker">UNA NUEVA EXPERIENCIA</p>':"";
   body.innerHTML='<div class="gx-launch-art" aria-hidden="true">'+art[c.art]+'</div>'+
     '<div class="gx-launch-copy">'+caption+
     '<h2 id="gx-release-v2-title">'+c.title+(c.accent?' <span>'+c.accent+'</span>':'')+'</h2>'+
     '<p class="gx-launch-description">'+c.copy+'</p></div>';
   if(c.id==="push"){
     const controls=create("div","gx-k3-launch-controls");
     const cta=create("button","gx-k3-launch-cta",window.GOXION_PUSH_K3?.active()?"Configurar avisos":"Activar notificaciones");
     const tip=create("p","gx-k3-launch-note","Puedes hacerlo al terminar Novedades o más tarde en la campana.");
     cta.type="button";cta.disabled=!window.GOXION_PUSH_K3?.canInvite();
     cta.onclick=()=>{if(window.GOXION_PUSH_K3?.deferSettings()){cta.textContent="Listo · al terminar";cta.disabled=true;tip.textContent="Abriremos los ajustes cuando termine la presentación.";}};
     controls.append(cta,tip);$(".gx-launch-copy",body).append(controls);
   }
   if(c.id==="support")mountGoxyChapter($(".gx-launch-goxy-mount",body));
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
   if(!current||current!==activeKey||session()!==activeSession){dismiss(false);return;}
   const state=queue(),access=window.GOXION_LEGAL_V2?.getAccessState?.();
   if(launchGate(state,access)!=="ready"){dismiss(false);return;}
   exitLaunch();
   window.GOXION_PUSH_K3?.releaseFinished();
   if(!$("#view-dashboard")?.classList.contains("active"))window.switchTab?.("inicio");
 }
 function mountLaunch(){
   chapters=pilot&&window.GOXION_PUSH_K3?.canInvite()?[...baseChapters.slice(0,-1),pushChapter,baseChapters.at(-1)]:baseChapters;
   overlay.dataset.edition="launch";
   overlay.innerHTML=[
     '<section class="gx-release-v2-card gx-launch-card" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="gx-release-v2-title">',
     '<header class="gx-launch-header"><div class="gx-launch-progress" role="progressbar" aria-label="Paso 1 de '+chapters.length+'" aria-valuemin="1" aria-valuemax="'+chapters.length+'" aria-valuenow="1">'+chapters.map(()=>'<span></span>').join("")+'</div>',
     '</header>',
     '<div class="gx-launch-content" aria-live="polite" aria-atomic="true"></div>',
     '<span class="gx-launch-status" role="status"></span>',
     '<footer class="gx-launch-footer"><button type="button" class="gx-launch-back">Atrás</button><button type="button" class="gx-launch-next">Comenzar</button></footer></section>'
   ].join("");
   const render=(i,direction)=>{if(i!==0&&overlay.dataset.entry){const pending=handoff;handoff=null;finishEntry();pending?.abort();}showChapter(i,direction);$(".gx-launch-progress",overlay).setAttribute("aria-valuenow",String(chapterIndex+1));};
   const next=()=>{if(chapterIndex===chapters.length-1)finishLaunch();else render(chapterIndex+1,1);};
   const back=()=>{if(chapterIndex>0)render(chapterIndex-1,-1);};
   overlay.addEventListener("click",e=>{
     if(e.target.closest?.(".gx-launch-next"))next();
     else if(e.target.closest?.(".gx-launch-back"))back();
   });
   overlay.addEventListener("keydown",e=>{
     if(e.key==="Escape"){e.preventDefault();return;}
     if(e.key==="ArrowRight"){e.preventDefault();if(chapterIndex<chapters.length-1)next();return;}
     if(e.key==="ArrowLeft"){e.preventDefault();back();return;}
     if(e.key!=="Tab")return;
     const buttons=[...overlay.querySelectorAll("button:not([disabled]):not([hidden])")];
     if(e.shiftKey&&(document.activeElement===buttons[0]||document.activeElement===$(".gx-launch-card",overlay))){e.preventDefault();buttons.at(-1).focus();}
     else if(!e.shiftKey&&document.activeElement===buttons.at(-1)){e.preventDefault();buttons[0].focus();}
   });
   render(0,0);updateMotion();
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
     const buttons=[...overlay.querySelectorAll("button:not([disabled]):not([hidden])")];
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
 // No transformar la caja del diálogo: WebKit debe mantener su geometría y
 // objetivos táctiles. Sólo se revela la superficie; el logo real se acopla.
 function finishEntry(){
   clearTimeout(entryTimer);entryTimer=0;
   try{entryAnimation?.cancel();}catch(_){}entryAnimation=null;
   if(overlay){delete overlay.dataset.entry;delete overlay.dataset.handoff;overlay.dataset.docked="true";}
 }
 function localEntry(){
   if(reducedMotion()||document.hidden){finishEntry();return;}
   const logo=$(".gx-launch-orbit img",overlay);
   if(!logo||typeof logo.animate!=="function"){finishEntry();return;}
   const rect=logo.getBoundingClientRect();
   if(!rect.width||!rect.height){finishEntry();return;}
   const x=innerWidth/2-rect.left-rect.width/2,y=innerHeight/2-rect.top-rect.height/2;
   const scale=Math.min(110/rect.width,1);
   overlay.dataset.entry="local";
   try{
     entryAnimation=logo.animate([
       {transform:"translate3d("+x+"px,"+y+"px,0) scale("+scale+")",opacity:.85},
       {transform:"translate3d(0,0,0) scale(1)",opacity:1}
     ],{duration:840,easing:"cubic-bezier(.24,.75,.24,1)",fill:"both"});
     entryTimer=setTimeout(finishEntry,1050);
     entryAnimation.finished.then(finishEntry,()=>{});
   }catch(_){finishEntry();}
 }
 function present(claim=false){
   const k=key(),state=queue();
   selectEdition(k);
   const access=launch?window.GOXION_LEGAL_V2?.getAccessState?.():null;
   if(!eligible(k)||open||legalContinuation||modalBusy(claim))return false;
   if(launch?launchGate(state,access)!=="ready":
      state.estado==="sin_activar"||state.estado==="rechazado"||state.modalAbierto||
      (state.estado==="pendiente"&&!state.deferido))return false;
   mount();
   if(open)return false;
   if(claim){overlay.dataset.handoff="flying";overlay.dataset.entry="handoff";}
   else if(launch&&!reducedMotion())overlay.dataset.entry="preparing";
   activeKey=k;activeSession=session();focusSource=document.activeElement;
   scrollY=Number(window.scrollY)||0;
   if(!launch){manual=false;stopAuto(true);scroll.scrollTop=0;}
   open=true;overlay.hidden=false;overlay.setAttribute("aria-hidden","false");
   document.body.classList.add("gx-release-v2-body-lock");
   if(launch)holdBackground();
   (launch?$(".gx-launch-card",overlay):overlay).focus({preventScroll:true});
   if(!launch)scheduleAuto();
   else if(!claim)localEntry();
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
   if(!launch||!eligible(k)||open||document.hidden)return "skip";
   const state=queue(),access=window.GOXION_LEGAL_V2?.getAccessState?.(),gate=launchGate(state,access);
   if(gate!=="ready")return gate;
   // Legal conserva prioridad. Una capa transitoria de login/notificación
   // no debe decidir definitivamente el destino antes de que se cierre.
   return modalBusy(true)?"waiting":"ready";
 }
 function claimHandoff(){
   const root=$("#gx-v2-handoff");
   if(!root||root.hidden||!document.body.classList.contains("gx-v2-handoff-active")||handoffStatus()!=="ready"||!present(true))return null;
   const target=$(".gx-launch-orbit img",overlay);
   const controller=new AbortController();handoff=controller;
   const complete=()=>{
     if(handoff!==controller)return;
     handoff=null;
     finishEntry();
   };
   if(!target){complete();return null;}
   const fallback=()=>{
     if(handoff!==controller)return;
     handoff=null;delete overlay.dataset.handoff;overlay.dataset.entry="preparing";localEntry();
   };
   return {target,signal:controller.signal,complete,cancel:complete,fallback};
 }
 function logout(resetPilot=false){
   clearTimeout(timer);timer=0;attempts=0;
   dismiss(false);removePeek();legalReservation=null;clearLegalContinuation();
   if(resetPilot===true&&mode==="pilot"){
     const seenId=PREFIX+PILOT_VERSION+":"+PILOT;
     completed.delete(seenId);
     try{sessionStorage.removeItem(seenId);}catch(_){}
   }
 }
 window.addEventListener("goxion:legal-opened",()=>{
   if(legalContinuation)clearLegalContinuation();
   stopGoxyFlight(false);
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
      (launch&&(e.detail?.acceso?.bloquea_operaciones||e.detail?.estado==="sin_activar"))){
     dismiss(false);removePeek();clearTimeout(timer);return;
   }
   if(legalContinuation&&!continuationValid())clearLegalContinuation();
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
   if(document.hidden){if(overlay?.dataset.entry){const pending=handoff;handoff=null;finishEntry();pending?.abort();}stopGoxyFlight(false);updateMotion();cancelAnimationFrame(frame);frame=0;lastTick=0;return;}
   updateMotion();
   if(open&&!manual&&!launch)scheduleAuto();
   else schedule(700);
 });
 window.addEventListener("resize",()=>stopGoxyFlight(false));
 const motionPreference=window.matchMedia?.("(prefers-reduced-motion: reduce)");
 motionPreference?.addEventListener?.("change",()=>{if(reducedMotion()&&overlay?.dataset.entry){const pending=handoff;handoff=null;finishEntry();pending?.abort();}stopGoxyFlight(false);updateMotion();});
 window.GOXION_RELEASE_202610=Object.freeze({
   get version(){return VERSION;},handoffStatus,claimHandoff,holdsLegalOffer,close:()=>dismiss(!launch),refresh:()=>schedule(250)
 });
 if(document.readyState!=="loading")schedule(1200);
 else document.addEventListener("DOMContentLoaded",()=>schedule(1200),{once:true});
})();

