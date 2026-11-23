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
 const iconPaths={
  check:'<path d="M4 12l5 5L20 6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5"/><path class="gx-mirror-clock-hand" d="M12 12l3 2"/>',
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
 function createHero(){
  const dashboard=$("view-dashboard"),original=$("dash-billing-card");
  if(!dashboard||!original||hero)return;
  hero=create("section","gx-mirror-priority");
  hero.id="gx-mirror-priority";
  hero.setAttribute("aria-label","Estado de tu cuenta");
  const copy=create("div","gx-mirror-priority-copy");
  const title=create("h2");
  title.id="gx-mirror-priority-title";
  title.textContent="Tu próxima fecha de corte";
  const meta=create("span","gx-mirror-sub");
  meta.id="gx-mirror-priority-meta";
  copy.append(title,meta);
  const icon=create("span","gx-mirror-icon");
  icon.id="gx-mirror-priority-icon";
  icon.setAttribute("aria-hidden","true");
  const action=create("div","gx-mirror-hero-action");
  const realCta=original.querySelector(".gx-account-capsule");
  if(realCta)action.append(realCta); // Un único CTA real: conserva irAlTicket().
  hero.append(copy,icon,action);
  const anchor=$("dash-payment-review-alert")||original;
  anchor.parentElement.insertBefore(hero,anchor);
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
  const authenticated=Boolean(client);
  const onboarding=$("dash-onboarding-card");
  const inDashboard=$("view-dashboard")?.classList.contains("active");
  hero.hidden=!authenticated||Boolean(onboarding&&!onboarding.hidden)||!inDashboard;
  if(hero.hidden)return;
  const state=classify(client);
  hero.dataset.tone=state.tone;
  const title=$("gx-mirror-priority-title");
  if(title&&title.textContent!==state.title)title.textContent=state.title;
  const date=String($("dash-date")?.textContent||"").trim();
  const meta=$("gx-mirror-priority-meta");
  if(meta)meta.textContent=date&&!/cargando/i.test(date)?"Próximo corte · "+date:"";
  const icon=$("gx-mirror-priority-icon");
  if(icon&&(stateKind!==state.kind)){
   stateKind=state.kind;
   icon.dataset.kind=state.kind;
   icon.classList.remove("is-changed");
   icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(iconPaths[state.kind]||iconPaths.calendar)+'</svg>';
   if(!reduce()){void icon.offsetWidth;icon.classList.add("is-changed");}
  }
 }
 function createLoyalty(){
  if(loyaltyTile)return;
  loyaltyTile=create("button","gx-mirror-loyalty");
  loyaltyTile.type="button";
  loyaltyTile.id="gx-mirror-loyalty";
  loyaltyTile.setAttribute("aria-expanded","false");
  loyaltyTile.setAttribute("aria-controls","gx-mirror-loyalty-expanded");
  const label=create("span","gx-mirror-loyalty-label","Lealtad");
  const number=create("strong","gx-mirror-loyalty-value");
  number.id="gx-mirror-loyalty-value";
  const emoji=create("span","gx-mirror-loyalty-emoji","⭐");
  emoji.id="gx-mirror-loyalty-emoji";
  const unit=create("small","gx-mirror-loyalty-unit","pagos seguidos");
  const meter=create("span","gx-mirror-meter");
  meter.setAttribute("aria-hidden","true");
  const fill=create("span");fill.id="gx-mirror-loyalty-fill";meter.append(fill);
  loyaltyTile.append(label,number,emoji,unit,meter);
  loyaltyExpanded=create("section","gx-mirror-loyalty-expanded");
  loyaltyExpanded.id="gx-mirror-loyalty-expanded";
  loyaltyExpanded.hidden=true;
  const close=create("button","gx-mirror-close","×");
  close.type="button";close.setAttribute("aria-label","Cerrar detalle de Lealtad");
  const title=create("h3","","Tu lealtad");
  title.id="gx-mirror-loyalty-heading";
  const detail=create("p");detail.id="gx-mirror-loyalty-description";
  loyaltyExpanded.append(close,title,detail);
  loyaltyTile.addEventListener("click",()=>{
   const open=loyaltyExpanded.hidden;
   loyaltyExpanded.hidden=!open;
   loyaltyTile.setAttribute("aria-expanded",String(open));
   if(open)loyaltyExpanded.scrollIntoView({behavior:reduce()?"auto":"smooth",block:"nearest"});
  });
  close.addEventListener("click",()=>{
   loyaltyExpanded.hidden=true;loyaltyTile.setAttribute("aria-expanded","false");loyaltyTile.focus();
  });
  const ref=$("referral-section-container");
  ref?.insertAdjacentElement("afterend",loyaltyExpanded);
 }
 function refreshLoyalty(){
  createLoyalty();
  const grid=$("gamif-grid");
  if(!grid||!loyaltyTile)return;
  if(!grid.contains(loyaltyTile))grid.insertBefore(loyaltyTile,grid.firstChild);
  const client=officialClient();
  if(!client)return;
  const info=String($("loyalty-count")?.textContent||"").trim();
  const match=info.match(/(\d+)\s*\/\s*(\d+)/);
  const value=match?Number(match[1]):null,target=match?Number(match[2]):null;
  const lost=client.estado_cuenta?.lealtad?.racha_reiniciada_virtual===true;
  const number=$("gx-mirror-loyalty-value");
  if(number)number.textContent=match?value+"/"+target:(info||"—");
  const emoji=$("gx-mirror-loyalty-emoji");if(emoji)emoji.textContent=lost?"💔":"⭐";
  const unit=loyaltyTile.querySelector(".gx-mirror-loyalty-unit");
  if(unit)unit.textContent=lost?"racha reiniciada":"pagos seguidos";
  const pct=value!==null&&target>0?Math.max(0,Math.min(100,(value/target)*100)):0;
  const fill=$("gx-mirror-loyalty-fill");if(fill)fill.style.width=pct+"%";
  const h=$("gx-mirror-loyalty-heading");
  if(h)h.textContent=lost?"Tu racha se reinició":"Tu constancia crece";
  const desc=$("gx-mirror-loyalty-description");
  if(desc)desc.textContent=String($("loyalty-msg")?.textContent||"").trim();
  loyaltyTile.setAttribute("aria-label",lost?"Lealtad, racha reiniciada, abrir detalle":("Lealtad, "+info+", abrir detalle"));
 }
 function refresh(){
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
  initNav();createHero();createLoyalty();syncRealSources();
  hideLiteralEscapedNewline();
  refresh();
  window.addEventListener("pageshow",queueRefresh);
  document.addEventListener("visibilitychange",()=>{
   const icon=$("gx-mirror-priority-icon");
   if(icon)icon.style.animationPlayState=document.hidden?"paused":"running";
  });
  // Los renderizadores oficiales pueden finalizar tras login/realtime.
  window.addEventListener("goxion:client-logout",queueRefresh);
  setTimeout(queueRefresh,350);
  setTimeout(queueRefresh,1500);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
 else boot();
})();