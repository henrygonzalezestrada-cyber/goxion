/* GOXION Mi Espacio · BETA ESPEJO 100% offline: sin sesión, cuentas ni endpoints.
 * IDs/clases del dashboard vienen del ayuda.html oficial, nunca se reescribe el motor de negocio.
 */
(async()=>{
"use strict";
if(!document.documentElement.hasAttribute("data-gx-mirror"))return;
const $=id=>document.getElementById(id);
const emit=(key,active)=>document.dispatchEvent(new CustomEvent("gx-mirror:"+key,{detail:{active}}));
let noticeTimer;
function notes(text){
  const el=$("gx-mirror-toast");el.textContent=text;el.hidden=false;
  clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{el.hidden=true},2600);
}
document.querySelectorAll("#goxion-main-nav .tab-btn").forEach(btn=>{
  btn.classList.toggle("active",btn.id==="btn-tab-inicio");
  btn.addEventListener("click",()=>notes("Esta beta muestra únicamente Mi Espacio. Catálogo y Soporte siguen sin cambios."));
});
$("btn-tab-inicio")?.setAttribute("aria-current","page");
const greeting=$("dynamic-greeting-text");
if(greeting)greeting.innerHTML='¡Hola, <span id="dash-name">Cliente</span>! 👋';
const billing=$("dash-billing-card");
$("dash-date").textContent="20 de octubre";
$("dash-badge").innerHTML='<span class="time-badge badge-ok">Próximo a vencer · Ejemplo</span>';
const count=$("loyalty-count"),bar=$("loyalty-bar"),copy=$("loyalty-msg");
const row=count?.parentElement;
if(row){
  const label=row.firstElementChild;
  if(label){
    label.classList.add("gx-mirror-loyalty-label");
    label.innerHTML='<span id="gx-mirror-heart" aria-label="Corazón animado de lealtad"></span><span class="gx-mirror-loyalty-name">Nivel de Lealtad</span>';
  }
  count.textContent="3/4 Pagos";
}
bar.style.width="75%";
copy.textContent="A un pago puntual del siguiente nivel. (Demostración)";
if(billing){
  const anchor=document.createElement("span");
  anchor.className="gx-mirror-loyalty-companion";
  anchor.id="gx-mirror-circle";
  anchor.setAttribute("aria-hidden","true");
  billing.append(anchor);
}
document.addEventListener("gx-mirror:loyalty-toggle",event=>{
  const done=Boolean(event.detail?.value);
  count.textContent=done?"4/4 Pagos":"3/4 Pagos";
  bar.style.width=done?"100%":"75%";
  copy.textContent=done?"Nivel 1 alcanzado · Simulación":"A un pago puntual del siguiente nivel. (Demostración)";
  document.body.classList.toggle("gx-mirror-loyalty-active",done);
  emit("loyalty",done);
});
const ref=$("referral-section-container");
if(!ref)throw Error("No existe el contenedor oficial de Misiones");
const reply=await fetch("./missions-demo.html",{cache:"no-store"});
if(!reply.ok)throw Error("Fallo al cargar muestra estática de Misiones");
ref.innerHTML=await reply.text();
const missionBtn=$("gx-mirror-complete-btn"),missionRow=$("gx-mirror-mission-line"),missionStatus=$("gx-mirror-mission-status");
let missionDone=false;
function updateMission(done){
  missionDone=done;
  $("gx-mirror-mission-bar").style.width=done?"100%":"66.667%";
  missionStatus.textContent=done?"Recompensa lista · Simulación":"2 de 3 completadas";
  missionRow.classList.toggle("done",done);
  missionRow.classList.remove("gx-mission-just-completed");
  if(done){void missionRow.offsetWidth;missionRow.classList.add("gx-mission-just-completed")}
  missionBtn.classList.toggle("is-complete",done);
  missionBtn.disabled=done;
  $("gx-mirror-action-label").textContent=done?"Misión de prueba completada":"Completar misión de prueba";
  $("gx-mirror-retry").hidden=!done;
  emit("mission",done);
}
missionBtn.addEventListener("click",()=>{if(!missionDone)updateMission(true)});
missionRow.addEventListener("click",()=>{if(!missionDone)updateMission(true)});
$("gx-mirror-retry").addEventListener("click",()=>updateMission(false));
$("gx-mirror-mission-card").addEventListener("click",()=>{
  if(typeof window.openGamif==="function")window.openGamif("coupon");
});
$("gx-mirror-close-missions").addEventListener("click",()=>{
  if(typeof window.closeGamif==="function")window.closeGamif();
});
$("view-dashboard")?.classList.add("active");
const bell=$("gx-client-notif-launch"),badgeCount=$("gx-client-notif-badge");
let notice=0;
function displayNotice(){
  bell.classList.toggle("gx-has-new",notice===1);
  bell.setAttribute("aria-expanded",String(notice===1));
  badgeCount.textContent=notice===1?"1":"0";
  bell.setAttribute("aria-label",notice===0?"Simular una notificación":notice===1?"Marcar aviso como leído":"Simular nuevo aviso");
}
function triggerNotice(){
  notice=notice===1?2:1;
  displayNotice();
  bell.classList.remove("gx-ringing");
  if(notice===1){
    void bell.offsetWidth;bell.classList.add("gx-ringing");
    clearTimeout(triggerNotice.timer);
    triggerNotice.timer=setTimeout(()=>bell.classList.remove("gx-ringing"),900);
    notes("Nuevo aviso de ejemplo · toca la campana para marcarlo leído");
  }else notes("Aviso de ejemplo leído");
  document.body.classList.toggle("gx-mirror-notif-active",notice===1);
  emit("notification",notice===1);
}
bell.addEventListener("click",triggerNotice);displayNotice();
const services=$("dash-services"),history=$("dash-history");
if(services)services.innerHTML='<p class="gx-mirror-muted">Los servicios reales no se cargan en esta beta.</p>';
if(history)history.innerHTML='<p class="gx-mirror-muted">El historial real permanece protegido y no se consulta.</p>';
$("dash-onboarding-card")?.setAttribute("hidden","");
billing?.querySelector(".gx-account-capsule")?.addEventListener("click",()=>notes("La consulta real de tu estado de cuenta está desactivada en esta beta."));
window.GOXION_GIXYS_MIRROR=Object.freeze({isolated:true,source:"ayuda.html",noBackend:true,version:"Fase 2 beta"});
document.dispatchEvent(new Event("gx-mirror-ready"));
})().catch(error=>{
  const el=document.getElementById("gx-mirror-toast");
  if(el){el.textContent="No se pudo iniciar la beta: "+error.message;el.hidden=false;}
  console.error("GOXION espejo aislado",error);
});
