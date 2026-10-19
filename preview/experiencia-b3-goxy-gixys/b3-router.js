/* E2/B3: demo-only contextual event gate for ORIGINAL Gixys V9.
 * Never use these DOM checks to authorize production events. Production must
 * use recipient-bound, idempotent, backend-verified event envelopes.
 */
(()=>{
'use strict';
if(document.documentElement.dataset.gxB3!=='true')return;
const $=id=>document.getElementById(id);
const allowed=['notification','loyalty','mission'];
const active=new Set();
const counts={notification:0,loyalty:0,mission:0};
const guards={
 notification:()=>$('gx-client-notif-launch')?.getAttribute('aria-expanded')==='true' &&
  $('gx-client-notif-badge')?.textContent?.trim()==='1',
 loyalty:()=>/^4\/4\b/.test($('loyalty-count')?.textContent?.trim()||''),
 mission:()=>Boolean($('gx-mirror-complete-btn')?.disabled &&
  $('gx-mirror-mission-action')?.classList.contains('is-complete'))
};
function emit(kind,value){
 if(!allowed.includes(kind)||typeof value!=='boolean')return false;
 if(!value){
  active.delete(kind);
  document.dispatchEvent(new CustomEvent('gx-mirror:'+kind,{detail:{
   active:false,source:'synthetic-b3',validated:false
  }}));
  return true;
 }
 if(!guards[kind]()||active.has(kind))return false;
 active.add(kind);counts[kind]++;
 document.documentElement.dataset.gxB3LastEvent=kind;
 document.dispatchEvent(new CustomEvent('gx-mirror:'+kind,{detail:{
  active:true,source:'synthetic-b3',validated:true
 }}));
 return true;
}
function handoff(){
 // Only explicit clicks: Goxy already lives in official Ayuda > Soporte.
 // No user data or context moves through a URL. No duplicate chatbot.
 window.open('../../ayuda.html','_blank','noopener,noreferrer');
 return true;
}
window.GOXION_B3_ROUTER=Object.freeze({
 isolated:true,production:false,version:'E2/B3 v1',
 preservesGixysV9:true,usesOfficialGoxy:true,
 emit,handoff,stats:()=>({...counts}),active:()=>[...active]
});
document.addEventListener('gx-mirror-ready',()=>{
 const toggle=$('gx-b3-toggle'),tray=$('gx-b3-controls');
 toggle?.addEventListener('click',()=>{
  tray.hidden=!tray.hidden;
  toggle.setAttribute('aria-expanded',String(!tray.hidden));
 });
 $('btn-tab-soporte')?.setAttribute('title','Goxy está en Soporte oficial. Abrir en una nueva pestaña');
 document.querySelectorAll('[data-gx-b3-test]').forEach(btn=>btn.addEventListener('click',()=>{
  const kind=btn.dataset.gxB3Test;
  tray.hidden=true;toggle.setAttribute('aria-expanded','false');
  if(kind==='reset'){location.reload();return}
  if(kind==='notification'){
   const bell=$('gx-client-notif-launch');
   if(bell.getAttribute('aria-expanded')==='true')bell.click();
   bell.click();
  }else if(kind==='loyalty'){
   const heart=$('gx-mirror-heart')?.querySelector('.pulse-heart');
   if(heart&&!guards.loyalty())heart.click();
  }else if(kind==='mission'){
   const b=$('gx-mirror-complete-btn');
   if(b&&!b.disabled)b.click();
   $('gx-mirror-mission-card')?.scrollIntoView({behavior:'smooth',block:'center'});
  }
 }));
});
})();