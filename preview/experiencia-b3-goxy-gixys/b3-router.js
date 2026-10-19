/* E2/B3 V2 · contextual Gixy / Goxy coordinator.
 * E1/B1 owns the IMPORTANT CARD -> SILK RIBBON -> BELL sequence.
 * Only after its delivery may the already-approved Gixy V9 appear.
 * The Goxy CTA is appended beside the genuine V9 companion (not a fake
 * companion), while Goxy remains the existing support assistant.
 * This whole file is DEMO ONLY. No production event permissions here.
 */
(()=>{
'use strict';
if(document.documentElement.dataset.gxB3!=='true')return;
const $=id=>document.getElementById(id);
const allowed=['notification','loyalty','mission'];
const active=new Set(),counts={notification:0,loyalty:0,mission:0};
let helpContext=null,ignoredHelpEvent=null;
const guards={
 notification:()=>$('gx-client-notif-badge')?.textContent?.trim()==='1'
   &&Boolean(helpContext?.goxy),
 loyalty:()=>/^4\/4\b/.test($('loyalty-count')?.textContent?.trim()||''),
 mission:()=>Boolean($('gx-mirror-complete-btn')?.disabled&&
   $('gx-mirror-complete-btn')?.classList.contains('is-complete'))
};
function emit(kind,value){
 if(!allowed.includes(kind)||typeof value!=='boolean')return false;
 if(!value){
  active.delete(kind);
  document.dispatchEvent(new CustomEvent('gx-mirror:'+kind,{
   detail:{active:false,source:'synthetic-b3',validated:false}
  }));
  return true;
 }
 if(!guards[kind]()||active.has(kind))return false;
 active.add(kind);counts[kind]++;
 document.documentElement.dataset.gxB3LastEvent=kind;
 document.dispatchEvent(new CustomEvent('gx-mirror:'+kind,{
  detail:{active:true,source:'synthetic-b3',validated:true}
 }));
 return true;
}
function handoff(){
 // Existing F17 Goxy support wrapper loads same-origin Ayuda and selects
 // Soporte. No fake assistant, no account data, no context in query params.
 // Official integration may pass a server-authorized context ID via the
 // genuine session bridge, never from this synthetic preview.
 window.open('./goxy-handoff.html','_blank','noopener,noreferrer');
 return true;
}
function btn(){
 const el=document.createElement('button');el.type='button';
 el.className='gx-b3-goxy-cta';
 el.textContent='Preguntar a Goxy';
 el.setAttribute('aria-label','Abrir el Soporte de Goxy sobre este aviso');
 el.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();handoff()});
 return el;
}
function attachHelp(){
 if(!helpContext?.goxy||!active.has('notification')||
    ignoredHelpEvent===helpContext.id)return;
 const msg=document.querySelector('#gx-gixys-message-root .gx-gixy-message[data-kind="notification"].is-visible');
 if(!msg||msg.dataset.phase!=='shown'||msg.querySelector('.gx-b3-goxy-cta'))return;
 const action=btn();
 // Align to the actual V9 bubble offset (including its native internal
 // spacing), not an estimated 59px avatar + 3px gap. Works at 280px too.
 const bubble=msg.querySelector('.gx-gixy-message__bubble');
 if(bubble)action.style.setProperty('left',bubble.offsetLeft+'px','important');
 // Sit alongside the existing V9 bubble rather than replacing its React
 // tree, plastic renderer or click-to-play behavior.
 const y=msg.getBoundingClientRect().bottom;
 if(y+43>innerHeight)action.classList.add('gx-b3-goxy-cta--above');
 msg.append(action);
}
const observer=new MutationObserver(attachHelp);
observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-phase']});
// The customer engaged with or dismissed the Gixy: remove BOTH contextual
// buttons and never recreate them for the same event.
const disengage=event=>{
 if(event.detail?.kind!=='notification'||!helpContext)return;
 ignoredHelpEvent=helpContext.id;
 document.querySelectorAll('.gx-b3-goxy-cta').forEach(el=>el.remove());
 document.querySelectorAll('.gx-b3-notice-action').forEach(el=>el.remove());
};
document.addEventListener('gx-b3:gixy-engaged',disengage);
document.addEventListener('gx-b3:gixy-dismissed',disengage);
document.addEventListener('gx-b3:priority-reset',()=>{
 ignoredHelpEvent=null;helpContext=null;emit('notification',false);
 document.querySelectorAll('.gx-b3-goxy-cta').forEach(n=>n.remove());
});
document.addEventListener('gx-b3:priority-delivered',event=>{
 const detail=event.detail;
 if(!detail?.important)return;
 ignoredHelpEvent=null;
 helpContext=detail.goxy?{code:detail.code,id:detail.id,goxy:true}:null;
 // Routine receipt or extension: B1's ribbon may run once, but no Gixy.
 if(!detail.gixy)return;
 const list=$('gx-smart-notif-list');
 if(list&&!list.querySelector('.gx-b3-notice-action')){
  const wrap=document.createElement('div');wrap.className='gx-b3-notice-action';
  const label=document.createElement('span');
  label.textContent=detail.code==='correction'
   ?'Goxy puede orientarte sobre la observación.'
   :'Goxy puede orientarte sobre el pago pendiente.';
  wrap.append(label,btn());list.append(wrap);
 }
 emit('notification',true);
 attachHelp();
});
function resetHelp(){ignoredHelpEvent=null;helpContext=null;emit('notification',false)}
document.addEventListener('gx-b3:notice-read',resetHelp);
window.GOXION_B3_ROUTER=Object.freeze({
 isolated:true,production:false,version:'E2/B3 v2',
 preservesGixysV9:true,usesOfficialGoxy:true,
 emit,handoff,stats:()=>({...counts}),active:()=>[...active],
 helpContext:()=>helpContext?{code:helpContext.code,id:helpContext.id}:null
});
document.addEventListener('gx-mirror-ready',()=>{
 const toggle=$('gx-b3-toggle'),tray=$('gx-b3-controls');
 toggle?.addEventListener('click',()=>{
  tray.hidden=!tray.hidden;
  toggle.setAttribute('aria-expanded',String(!tray.hidden));
 });
 $('btn-tab-soporte')?.setAttribute('title','Consultar a Goxy en Soporte de Ayuda');
 document.querySelectorAll('[data-gx-b3-test]').forEach(el=>el.addEventListener('click',()=>{
  const kind=el.dataset.gxB3Test;
  tray.hidden=true;toggle.setAttribute('aria-expanded','false');
  if(kind==='reset'){location.reload();return}
  if(kind==='loyalty'){
   const heart=$('gx-mirror-heart')?.querySelector('.pulse-heart');
   if(heart&&!guards.loyalty())heart.click();
  }else if(kind==='mission'){
   $('gx-mirror-mission-card')?.click();
   setTimeout(()=>{
    // WebKit can retain the previous bill-card scroll position after
    // several priority previews. Bring the native V9 mission anchor into
    // view BEFORE firing completion, so its Gixy has a valid placement.
    const expanded=$('gamif-expanded-coupon');
    const anchor=expanded?.getBoundingClientRect().height>0
      ?expanded:$('gx-mirror-mission-card');
    anchor?.scrollIntoView({behavior:'instant',block:'center'});
    const b=$('gx-mirror-complete-btn');
    if(b&&!b.disabled)b.click();
   },1250);
  }
 }));
});
})();