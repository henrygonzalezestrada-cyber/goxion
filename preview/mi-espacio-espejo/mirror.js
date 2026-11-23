/* GOXION · Espejo sobre ayuda.html.
   Solo adapta DOM visual. No añade fixtures, llamadas de red, storage,
   acciones financieras, cambios de credenciales, soporte o gamificación. */
(()=>{
 "use strict";
 if(document.documentElement.dataset.gxMirror!=="client")return;
 const $=id=>document.getElementById(id);
 const reduce=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||false;
 const schedule=fn=>window.requestAnimationFrame?requestAnimationFrame(fn):setTimeout(fn,0);
 let stateKind="",refreshQueued=false,loyaltyTile=null,loyaltyExpanded=null,hero=null;
 let greetingTimer=0,greetingSignature="",greetingIndex=0;
 const iconPaths={
  check:'<path d="M4 12l5 5L20 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><path class="gx-focus-clock-hand" d="M12 12l3 2"/>',
  alert:'<path d="M12 2 22 20H2L12 2z"/><path d="M12 8v5M12 16v1"/>',
  calendar:'<path d="M5 3v4M19 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2"/><path d="M9 13h6v5H9z"/>',
  spark:'<path d="M12 2v20M2 12h20M5 5l14 14M19 5 5 19"/>'
 };
 function officialClient(){
  try{
   if(typeof getCurrentClientKey!=="function"||typeof globalClientesData==="undefined")return null;
   const key=getCurrentClientKey();
   return key&&globalClientesData?globalClientesData[key]||null:null;
  }catch(_){return null;}
 }
 function create(tag,cls,text){
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
 }
 function initNav(){
  const nav=$("goxion-main-nav");
  if(!nav)return;
  nav.dataset.mode="expanded";
  const tabInicio=$("tab-inicio-icon");
  if(tabInicio&&!tabInicio.hasAttribute("data-gx-mirror-original")) {
   tabInicio.setAttribute("data-gx-mirror-original",tabInicio.textContent||"");
  }
  let last=window.scrollY,acc=0,direction=0,frame=0;
  function onScroll(){
   if(frame)return;
   frame=requestAnimationFrame(()=>{
    frame=0;
    const y=window.scrollY,delta=y-last;
    last=y;
    const d=Math.sign(delta);
    if(!d||Math.abs(delta)<1)return;
    if(direction!==d){direction=d;acc=0;}
    acc+=Math.abs(delta);
    if(y<30){nav.dataset.mode="expanded";acc=0;return;}
    if(acc<13)return;
    nav.dataset.mode=d>0?"compact":"expanded";
    acc=0;
   });
  }
  window.addEventListener("scroll",onScroll,{passive:true});
  onScroll();
  // Reuse original switchTab / data-goxion-tab, never attach a second click router.
  function syncNavigation(){
   for(const btn of nav.querySelectorAll("button[data-goxion-tab]")){
    if(btn.classList.contains("active"))btn.setAttribute("aria-current","page");
    else btn.removeAttribute("aria-current");
   }
  }
  new MutationObserver(syncNavigation).observe(nav,{attributes:true,attributeFilter:["class"],subtree:true});
  syncNavigation();
 }
 function createHeaderAvatar(){
  const header=document.querySelector(".app-header");
  if(!header||$("gx-mirror-goxy"))return;
  const root=header.querySelector(".gx-header-actions")||header;
  const profile=create("button","gx-mirror-goxy");
  profile.id="gx-mirror-goxy";
  profile.type="button";
  profile.setAttribute("aria-label","Abrir menú de GOXION y Goxy");
  profile.setAttribute("aria-expanded","false");
  profile.setAttribute("aria-controls","gx-mirror-profile-menu");
  profile.innerHTML='<span class="gxn-avatar" aria-hidden="true">'+
   '<span class="gxn-goxy-fallback"><svg viewBox="0 0 52 52" focusable="false" aria-hidden="true"><defs><linearGradient id="gx-mirror-goxy-case" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#5873cc"/><stop offset="1" stop-color="#233e85"/></linearGradient></defs><rect x="5.5" y="9" width="41" height="35" rx="12" fill="url(#gx-mirror-goxy-case)" stroke="#a9bce5" stroke-width="1.5"/><rect x="10.5" y="14.5" width="31" height="25" rx="8" fill="#eaf8ff"/><rect x="16.5" y="24" width="7.5" height="6.5" rx="3.1" fill="#2c438c"/><rect x="28" y="24" width="7.5" height="6.5" rx="3.1" fill="#2c438c"/><path d="M21 34q5 3 10 0" fill="none" stroke="#8ca9d9" stroke-width="1.8" stroke-linecap="round"/></svg></span>'+
   '<span class="gxn-goxy-real"><span class="gxai-avatar"><span class="gxai-canvas-slot" id="gx-mirror-goxy-canvas" data-mood="idle"></span></span></span></span>';
  root.append(profile);
  const menu=create("div","gx-mirror-profile-menu");
  menu.id="gx-mirror-profile-menu";
  menu.hidden=true;
  menu.setAttribute("role","group");
  menu.setAttribute("aria-label","Cuenta y asistencia GOXION");
  const label=create("strong","gx-mirror-profile-name","Mi Espacio");
  const help=create("button","","Hablar con Goxy");
  help.type="button";
  const session=create("button","gx-mirror-session-control","Iniciar sesión");
  session.type="button";
  menu.append(label,help,session);
  root.append(menu);
  const close=()=>{menu.hidden=true;profile.setAttribute("aria-expanded","false");};
  profile.addEventListener("click",()=>{
   const open=menu.hidden;menu.hidden=!open;profile.setAttribute("aria-expanded",String(open));
   if(open)session.focus();
  });
  help.addEventListener("click",()=>{
   close();
   if(window.GOXION_AI_BETA?.open)window.GOXION_AI_BETA.open();
   else if(typeof switchTab==="function"){switchTab("soporte");document.querySelector(".gxai-open")?.click();}
  });
  session.addEventListener("click",()=>{
   close();
   if(officialClient()){if(typeof cerrarSesion==="function")cerrarSesion();}
   else if(typeof openAuthSheet==="function")openAuthSheet();
  });
  document.addEventListener("click",event=>{
   if(!root.contains(event.target))close();
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape")close();});
  const slot=$("gx-mirror-goxy-canvas"),avatar=profile.querySelector(".gxn-avatar");
  if(slot&&window.GOXY_ROBOT?.mount&&!reduce()){
   try{
    const mo=new MutationObserver(()=>{
     if(slot.childElementCount){avatar.classList.add("gxn-robot-ready");mo.disconnect();}
    });
    mo.observe(slot,{childList:true,subtree:true});
    window.GOXY_ROBOT.mount(slot);
    if(slot.childElementCount){avatar.classList.add("gxn-robot-ready");mo.disconnect();}
    setTimeout(()=>mo.disconnect(),5000);
   }catch(_){}
  }
 }
 function refreshHeaderAvatar(client){
  const menu=$("gx-mirror-profile-menu");
  if(!menu)return;
  menu.querySelector(".gx-mirror-profile-name").textContent=client?String(client.nombre||"Mi Espacio"):"Mi Espacio";
  menu.querySelector(".gx-mirror-session-control").textContent=client?"Cerrar sesión":"Iniciar sesión";
 }

 function createGreeting(){
  const container=$("dash-greeting-container");
  const original=$("dynamic-greeting-text");
  if(!container||!original)return;
  container.classList.add("greeting");
  original.hidden=true;
  original.setAttribute("aria-hidden","true");
  if(!$("gx-mirror-greeting")){
   const text=create("h1");
   text.id="gx-mirror-greeting";
   container.append(text);
  }
 }
 function drawGreeting(text,first){
  const element=$("gx-mirror-greeting");
  if(!element)return;
  let line=element.querySelector(".greeting-line");
  if(!line){line=create("span","greeting-line");element.append(line);}
  line.replaceChildren();
  for(const part of text.split(/(\s+)/)){
   if(!part)continue;
   if(!part.trim()){line.append(document.createTextNode(part));continue;}
   const word=create("span","word",part);
   if(first&&part.includes(first))word.classList.add("name");
   line.append(word);
   if(!reduce()&&word.animate){
    const i=line.querySelectorAll(".word").length;
    word.animate([{transform:"translateY(70%)",filter:"blur(9px)",opacity:0},
     {transform:"translateY(0)",filter:"blur(0)",opacity:1}],
     {duration:640,delay:Math.min(i*50,310),easing:"cubic-bezier(.16,1,.3,1)",fill:"both"});
   }
  }
  element.setAttribute("aria-label",text);
 }
 function syncGreeting(client,kind){
  createGreeting();
  if(!client)return;
  const name=String(client.nombre||"Cliente").trim().split(/\s+/)[0]||"Cliente";
  const urgent=kind==="alert"||kind==="clock";
  const signature=name+"|"+(urgent?"urgent":"normal");
  if(signature===greetingSignature)return;
  greetingSignature=signature;
  clearInterval(greetingTimer);greetingTimer=0;greetingIndex=0;
  const phrases=["Hola, "+name,"Qué gusto, "+name,"Bienvenido, "+name];
  drawGreeting(phrases[0],name);
  if(urgent||reduce())return;
  greetingTimer=setInterval(()=>{
   if(document.hidden||!officialClient())return;
   greetingIndex=(greetingIndex+1)%phrases.length;
   drawGreeting(phrases[greetingIndex],name);
  },13000);
 }

 function createHero(){
  const original=$("dash-billing-card");
  const alert=$("dash-payment-review-alert");
  if(!original||!alert||hero)return;
  const stage=create("div","glass-stage");
  stage.id="gx-mirror-glass-stage";
  stage.dataset.layout="compact";
  const underlay=create("div","glass-underlay");
  underlay.setAttribute("aria-hidden","true");
  underlay.innerHTML='<span class="glass-beam"></span><span class="glass-orb"></span>';
  hero=create("section","focus");
  hero.id="gx-mirror-priority";
  hero.dataset.layout="compact";
  hero.dataset.material="neutral";
  hero.dataset.glass="on";
  hero.setAttribute("aria-label","Estado de tu cuenta");
  hero.style.setProperty("--neutral-alpha",".371");
  hero.style.setProperty("--neutral-blur","11.8px");
  const copy=create("div","focus-copy");
  const title=create("h2","focus-title","Tu próximo corte");
  title.id="gx-mirror-priority-title";
  const meta=create("span","focus-meta");
  meta.id="gx-mirror-priority-meta";
  copy.append(title,meta);
  const icon=create("span","focus-icon");
  icon.id="gx-mirror-priority-icon";
  icon.setAttribute("aria-hidden","true");
  const bottom=create("div","focus-bottom");
  const realCTA=original.querySelector(".gx-account-capsule");
  if(realCTA){
   realCTA.classList.add("focus-action");
   // La acción sigue siendo el mismo botón original irAlTicket().
   bottom.append(realCTA);
  }
  hero.append(copy,icon,bottom);
  stage.append(underlay,hero);
  alert.parentElement.insertBefore(stage,alert);
 }

 function classify(client){
  const state=String(client?.estado_cuenta?.estado||"").toLowerCase();
  const rev=String(client?.pago_revision_estado||"").toLowerCase();
  if(rev==="rechazado")return {kind:"alert",tone:"attention",title:"Tu comprobante necesita atención"};
  if(rev==="incompleto"||state==="incompleto")return {kind:"alert",tone:"attention",title:"Hay un pago incompleto"};
  if(rev==="revision"||client?.pago_en_revision===true||state==="revision")return {kind:"clock",tone:"review",title:"Estamos revisando tu comprobante"};
  if(state==="vencido")return {kind:"alert",tone:"attention",title:"Tienes un pago vencido"};
  if(state==="vence_hoy")return {kind:"calendar",tone:"due",title:"Tu pago vence hoy"};
  if(state==="pagado"||client?.estado==="pagado")return {kind:"check",tone:"calm",title:"Todo al corriente"};
  return {kind:"calendar",tone:"due",title:"Tu próximo corte"};
 }
 function refreshHero(){
  if(!hero)return;
  const client=officialClient();
  const onboarding=$("dash-onboarding-card");
  const inDashboard=$("view-dashboard")?.classList.contains("active");
  const hide=!client||Boolean(onboarding&&!onboarding.hidden)||!inDashboard;
  const stage=$("gx-mirror-glass-stage");
  if(stage)stage.hidden=hide;
  hero.hidden=hide;
  if(hide)return;
  const next=classify(client);
  syncGreeting(client,next.kind);
  hero.dataset.tone=next.tone;
  hero.dataset.state=next.kind==="check"?"clear":next.kind==="clock"?"review":next.kind==="calendar"?"soon":"correction";
  const title=$("gx-mirror-priority-title");
  if(title&&title.textContent!==next.title)title.textContent=next.title;
  const date=String($("dash-date")?.textContent||"").trim();
  const meta=$("gx-mirror-priority-meta");
  if(meta)meta.textContent=date&&!/cargando/i.test(date)?"Próximo corte · "+date:"";
  const icon=$("gx-mirror-priority-icon");
  if(icon&&stateKind!==next.kind){
   stateKind=next.kind;
   icon.dataset.icon=next.kind;
   icon.classList.remove("is-changed");
   icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+
    (iconPaths[next.kind]||iconPaths.calendar)+'</svg>';
   if(!reduce()){void icon.offsetWidth;icon.classList.add("is-changed");}
  }
 }

 function createLoyalty(){
  if(loyaltyTile)return;
  loyaltyTile=create("button","gxb-tile gxc-surface");
  loyaltyTile.type="button";
  loyaltyTile.id="gx-mirror-loyalty";
  loyaltyTile.dataset.gxb="loyalty";
  loyaltyTile.setAttribute("aria-expanded","false");
  loyaltyTile.setAttribute("aria-controls","gx-mirror-loyalty-expanded");
  const label=create("span","gxb-label","Lealtad");
  const metric=create("span","gxb-metric-row");
  const number=create("strong","gxb-number");
  number.id="gx-mirror-loyalty-value";
  const emoji=create("span","gxb-emoji","⭐");
  emoji.id="gx-mirror-loyalty-emoji";emoji.setAttribute("aria-hidden","true");
  metric.append(number,emoji);
  const unit=create("span","gxb-unit","pagos seguidos");
  const meter=create("span","gxb-mini-progress");
  meter.setAttribute("aria-hidden","true");
  const fill=create("span");fill.id="gx-mirror-loyalty-fill";fill.style.setProperty("--gxb-pct","0%");
  meter.append(fill);loyaltyTile.append(label,metric,unit,meter);

  loyaltyExpanded=create("section","gxb-panel gxc-surface");
  loyaltyExpanded.id="gx-mirror-loyalty-expanded";
  loyaltyExpanded.dataset.benefit="loyalty";
  loyaltyExpanded.hidden=true;
  const close=create("button","gxb-dismiss");
  close.type="button";close.setAttribute("aria-label","Cerrar detalle de lealtad");
  close.innerHTML='<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const inner=create("div","gxb-panel-inner");
  const head=create("div","gxb-head");
  const h=create("h3");
  h.id="gx-mirror-loyalty-heading";
  head.append(h);
  const copy=create("p","gxb-copy");copy.id="gx-mirror-loyalty-description";
  const mhead=create("div","gxb-metric-head");
  mhead.innerHTML='<span>Tu constancia</span><strong id="gx-mirror-loyalty-detail-value">—</strong>';
  const mbar=create("div","gxb-meter");
  const progress=create("span");
  progress.id="gx-mirror-loyalty-detail-fill";
  mbar.append(progress);
  inner.append(head,copy,mhead,mbar);
  const note=create("p","gxb-note");
  note.textContent="La constancia se actualiza cuando se acredita cada pago.";
  inner.append(note);
  const foot=create("div","gxb-foot");
  const action=create("button","gxb-action","Ver estado de cuenta");
  action.type="button";
  action.addEventListener("click",()=>{if(typeof irAlTicket==="function")irAlTicket();});
  foot.append(action);
  const watermark=create("span","gxb-panel-emoji","⭐");
  watermark.id="gx-mirror-loyalty-large-emoji";
  watermark.setAttribute("aria-hidden","true");
  loyaltyExpanded.append(close,inner,foot,watermark);

  loyaltyTile.addEventListener("click",()=>{
   const isOpening=loyaltyExpanded.hidden;
   loyaltyExpanded.hidden=!isOpening;
   loyaltyTile.setAttribute("aria-expanded",String(isOpening));
   if(isOpening)loyaltyExpanded.scrollIntoView({behavior:reduce()?"auto":"smooth",block:"nearest"});
  });
  close.addEventListener("click",()=>{
   loyaltyExpanded.hidden=true;loyaltyTile.setAttribute("aria-expanded","false");loyaltyTile.focus();
  });
 }
 function benefitVisual(card,kind,metric,emoji,unit,pct,showMeter,ready){
  if(!card)return;
  card.classList.add("gxb-tile","gxc-surface");
  card.dataset.gxb=kind;
  card.dataset.watermark=emoji;
  card.dataset.phase=showMeter?"active":"none";
  card.dataset.ready=ready?"true":"false";
  let visual=card.querySelector(".gxb-live-visual");
  if(!visual){
   visual=create("span","gxb-live-visual");
   visual.innerHTML='<span class="gxb-label"></span><span class="gxb-metric-row"><strong class="gxb-number"></strong><span class="gxb-emoji" aria-hidden="true"></span></span><span class="gxb-unit"></span><span class="gxb-mini-progress" aria-hidden="true"><span></span></span>';
   card.append(visual);
  }
  visual.querySelector(".gxb-label").textContent=kind==="referral"?"Referidos":"Misiones";
  visual.querySelector(".gxb-number").textContent=metric;
  visual.querySelector(".gxb-emoji").textContent=emoji;
  visual.querySelector(".gxb-unit").textContent=unit;
  const bar=visual.querySelector(".gxb-mini-progress");
  bar.hidden=!showMeter;
  bar.querySelector("span").style.setProperty("--gxb-pct",Math.max(0,Math.min(100,pct))+"%");
  card.setAttribute("role","button");
  card.setAttribute("tabindex","0");
  card.setAttribute("aria-label",(kind==="referral"?"Referidos":"Misiones")+", "+metric+" "+unit+", abrir detalle");
  if(!card.dataset.gxMirrorKeyboard){
   card.dataset.gxMirrorKeyboard="1";
   card.addEventListener("keydown",event=>{
    if(event.key!=="Enter"&&event.key!==" ")return;
    event.preventDefault();card.click();
   });
  }
 }
 function watchOfficialBenefitSource(card){
  if(!card)return;
  for(const node of card.querySelectorAll(".gx-gamif-card-status,.gx-gamif-progress")){
   if(node.dataset.gxMirrorObserved==="1")continue;
   node.dataset.gxMirrorObserved="1";
   new MutationObserver(queueRefresh).observe(node,{
    subtree:true,childList:true,characterData:true,attributes:true,
    attributeFilter:["style","data-progress"]
   });
  }
 }
 function refreshBenefits(client,grid){
  // Los nodos auténticos conservan su identidad, onclick y la fuente de recompensas.
  const referral=grid.querySelector(".gx-gamif-card-ref");
  const ref=client.referido_activo;
  if(referral){
   const months=ref?Math.max(0,Math.min(3,Number(ref.meses_efectivos??ref.meses_override??ref.meses??0)||0)):0;
   const services=ref?(Array.isArray(ref.servicios)?ref.servicios.length:Number(ref.plataformas)||0):0;
   const claimed=ref?.beneficio_reclamado===true;
   const ready=Boolean(ref&&services>=2&&months>=3&&!claimed);
   benefitVisual(referral,"referral",ref?months+"/3":"Invita",claimed?"💝":ready?"🎁":"🫂",ref?"meses válidos":"sin referidos",months/3*100,Boolean(ref&&months>0),ready);
   watchOfficialBenefitSource(referral);
  }
  const mission=grid.querySelector(".gx-gamif-card-mission");
  if(mission){
   const g=client.gamificacion||{};
   const tasks=String(g.tareas||"").split("\n").filter(x=>x.trim());
   const done=new Set((Array.isArray(g.progreso)?g.progreso:[]).map(x=>Number(x.mision_index)).filter(Number.isInteger));
   const count=tasks.reduce((sum,_,i)=>sum+(done.has(i)?1:0),0);
   const total=tasks.length;
   const claimed=(Number(g.cupon_reclamado_ciclo)||0)>=(Math.max(1,Number(g.cupon_ciclo)||1));
   const ready=total>0&&count===total&&!claimed;
   benefitVisual(mission,"mission",total?count+"/"+total:"Sin tareas",claimed?"✅":ready?"🏆":"🎯",total?"completadas":"sin misiones",total?count/total*100:0,total>0,ready);
   watchOfficialBenefitSource(mission);
  }
 }

 function refreshLoyalty(){
  const grid=$("gamif-grid"),client=officialClient(),ref=$("referral-section-container");
  if(!grid||!client||!ref)return;
  createLoyalty();
  ref.classList.add("gxb-wrap","is-visible");
  grid.classList.add("gxb-row");
  if(!grid.contains(loyaltyTile))grid.insertBefore(loyaltyTile,grid.firstChild);
  if(!ref.contains(loyaltyExpanded))grid.insertAdjacentElement("afterend",loyaltyExpanded);
  const info=String($("loyalty-count")?.textContent||"").trim();
  const match=info.match(/(\d+)\s*\/\s*(\d+)/);
  const n=match?Number(match[1]):null,max=match?Number(match[2]):null;
  const lost=client.estado_cuenta?.lealtad?.racha_reiniciada_virtual===true;
  const metric=match?n+"/"+max:(info||"—");
  $("gx-mirror-loyalty-value").textContent=metric;
  $("gx-mirror-loyalty-emoji").textContent=lost?"💔":"⭐";
  $("gx-mirror-loyalty-large-emoji").textContent=lost?"💔":"⭐";
  loyaltyTile.dataset.phase=lost?"lost":"active";
  loyaltyExpanded.dataset.phase=lost?"lost":"active";
  loyaltyTile.querySelector(".gxb-unit").textContent=lost?"racha reiniciada":"pagos seguidos";
  const pct=n!==null&&max>0?Math.max(0,Math.min(100,n/max*100)):0;
  $("gx-mirror-loyalty-fill").style.setProperty("--gxb-pct",pct+"%");
  $("gx-mirror-loyalty-detail-fill").style.width=pct+"%";
  $("gx-mirror-loyalty-detail-value").textContent=metric+" pagos";
  $("gx-mirror-loyalty-heading").textContent=lost?"Tu racha se reinició":"Tu constancia crece";
  $("gx-mirror-loyalty-description").textContent=String($("loyalty-msg")?.textContent||"").trim();
  loyaltyTile.setAttribute("aria-label","Lealtad, "+(lost?"racha reiniciada, ": "")+metric+", abrir detalle");
  refreshBenefits(client,grid);
 }

 function refresh(){
  createHeaderAvatar();
  refreshHeaderAvatar(officialClient());
  refreshHero();refreshLoyalty();
 }
 function queueRefresh(){
  if(refreshQueued)return;
  refreshQueued=true;
  schedule(()=>{refreshQueued=false;refresh();});
 }
 function syncRealSources(){
  for(const id of ["dash-date","dash-badge","loyalty-count","loyalty-msg","dash-payment-review-alert"]){
   const node=$(id);
   if(node)new MutationObserver(queueRefresh).observe(node,{subtree:true,childList:true,characterData:true});
  }
  const ref=$("referral-section-container");
  if(ref)new MutationObserver(queueRefresh).observe(ref,{childList:true});
  const onboarding=$("dash-onboarding-card");
  if(onboarding)new MutationObserver(queueRefresh).observe(onboarding,{attributes:true,attributeFilter:["hidden"]});
  const dash=$("view-dashboard");
  if(dash)new MutationObserver(queueRefresh).observe(dash,{attributes:true,attributeFilter:["class"]});
 }
 function hideLiteralEscapedNewline(){
  // Bug heredado: un texto literal "\\n" suelto tras scripts en la fuente.
  // Se corrige en la copia HTML; este guard sólo toca nodos de texto aislados.
  for(const node of document.body.childNodes){
   if(node.nodeType===Node.TEXT_NODE&&node.nodeValue?.trim()==="\\n")node.nodeValue="";
  }
 }
 function boot(){
  if(!$("view-dashboard")||!$("goxion-main-nav"))return;
  initNav();createHeaderAvatar();createGreeting();createHero();createLoyalty();syncRealSources();
  hideLiteralEscapedNewline();
  refresh();
  window.addEventListener("pageshow",queueRefresh);
  document.addEventListener("visibilitychange",()=>{
   const icon=$("gx-mirror-priority-icon");
   if(icon)icon.style.animationPlayState=document.hidden?"paused":"running";
  });
  // Los renderizadores oficiales pueden finalizar tras login/realtime.
  window.addEventListener("goxion:client-logout",()=>{
   clearInterval(greetingTimer);greetingTimer=0;greetingSignature="";
   $("gx-mirror-profile-menu")?.setAttribute("hidden","");
   $("gx-mirror-goxy")?.setAttribute("aria-expanded","false");
   queueRefresh();
  });
  setTimeout(queueRefresh,350);
  setTimeout(queueRefresh,1500);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();