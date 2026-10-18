/* GOXION E1/B2 · Index read-only scenario mirror.
 * Styled with the REAL index.css and original Index classnames.
 * Backend, client identity and payments are intentionally unavailable.
 */
(()=>{
'use strict';
const fx=window.GOXION_E1B2_DEMO;
if(!fx||document.documentElement.dataset.gxB2IndexDemo!=='true')return;
const $=id=>document.getElementById(id);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const q=new URLSearchParams(location.search);
let key=Object.hasOwn(fx.cases,q.get('escenario'))?q.get('escenario'):'multi';
let mode='next',selected=null,open=false,lastFocus=null;
const quote=()=>fx.cases[key],active=()=>fx.pending(quote());
function current(){
 const rows=fx.select(quote(),mode,selected);
 return {rows,total:fx.total(rows)};
}
function status(row){
 if(row.paid)return 'Pagado';
 if(row.extension)return 'Prórroga pactada · '+fx.date(row.extension);
 if(row.abono>0)return 'Abono aprobado · '+fx.money(row.abono);
 if(row.mora>0)return 'Mora confirmada · '+fx.money(row.mora);
 // Evidence review is represented once, in the compact hero + proof tracker.
 // Do not repeat it in every service row.
 return 'Pendiente';
}
/* One factual state in the badge. Calendar/proof do not repeat it. */
let priorAmount=null;
function hero(){
 const Q=quote(),next=fx.next(Q),phase=Q.proof,blocked=!Q.trusted;
 const shortDate=iso=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',timeZone:'UTC'})
  .format(new Date(iso+'T00:00:00Z'));
 let caption='Próximo pago',badge=next.date?fx.date(next.date):'Al corriente';
 let cls='badge-ok',tone='due';
 if(blocked){caption='Saldo por confirmar';badge='Sin cotización';cls='badge-overdue';tone='blocked'}
 else if(phase==='review'){caption='Importe pendiente';badge='En revisión';cls='badge-review';tone='review'}
 else if(phase==='correction'){caption='Importe pendiente';badge='Acción necesaria';cls='badge-overdue';tone='correction'}
 else if(active().some(c=>c.mora>0)){caption='Importe vencido';badge='Venció · '+shortDate(next.date);cls='badge-overdue';tone='overdue'}
 else if(active().some(c=>c.extension)){badge='Prórroga · '+shortDate(next.date);cls='badge-ok';tone='extension'}
 else if(!next.date){caption='Saldo pendiente';badge='Al corriente';cls='badge-paid';tone='clear'}
 const root=document.documentElement;
 root.dataset.gxB2Tone=tone;
 $('gx-b2-hero-label').textContent=caption;
 const amount=$('gx-b2-hero-amount'),value=blocked?'—':fx.money(next.amount);
 const ink=amount.querySelector('.gx-b2-number-ink');
 if(ink){
  if(ink.textContent!==value){
   ink.textContent=value;
   if(priorAmount!==null&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
    ink.getAnimations().forEach(a=>a.cancel());
    ink.animate([{opacity:.4,transform:'translateY(7px) scale(.97)'},
      {opacity:1,transform:'translateY(0) scale(1)'}],
      {duration:420,easing:'cubic-bezier(.2,.78,.24,1)'});
   }
  }
 }else amount.innerHTML='<span class="gx-b2-number-ink">'+value+'</span>';
 priorAmount=value;
 const badgeNode=$('gx-b2-hero-badge');
 badgeNode.textContent=badge;
 badgeNode.className='time-badge '+cls;
 badgeNode.title=badge;
 $('gx-b2-period').textContent=Q.period+' · Ejemplo';
 $('gx-b2-back').href='./index.html?escenario='+encodeURIComponent(
  Object.hasOwn(fx.mapping,key)?key:key==='first_paid'||key==='partial'||key==='same_day'?'multi':'upcoming');
}
function services(){
 const Q=quote(),el=$('gx-b2-services');
 if(!Q.trusted){el.innerHTML='<p class="gx-b2-services-note">Saldo por confirmar. No realices el pago todavía.</p>';return}
 if(!Q.cargos.length){el.innerHTML='<p class="gx-b2-services-note">Sin servicios contratados.</p>';return}
 const completed=Q.cargos.filter(c=>c.paid).length;
 el.innerHTML=Q.cargos.map(c=>'<div class="service-item">'+
  '<span class="service-name">'+safe(c.name)+'</span>'+
  '<span class="service-price">'+(c.paid?'Liquidado':fx.money(c.total))+'</span>'+
 '</div>').join('');
 // The bar is a count of fully paid services, not a probability, deadline
 // or partial-payment percentage. No new financial calculations.
 if(completed>0&&completed<Q.cargos.length){
  const portion=Math.round(completed/Q.cargos.length*100);
  el.insertAdjacentHTML('beforeend','<div class="gx-b2-service-progress" role="group" aria-label="Servicios liquidados">'+
   '<div class="gx-b2-service-progress-head"><span>Servicios liquidados</span><strong>'+
   completed+' de '+Q.cargos.length+'</strong></div>'+
   '<div class="gx-b2-service-progress-track" role="progressbar" aria-label="Servicios liquidados" '+
   'aria-valuemin="0" aria-valuemax="'+Q.cargos.length+'" aria-valuenow="'+completed+'">'+
   '<span style="--gx-b2-fill:'+portion+'%"></span></div></div>');
 }
}
function calendar(){
 const Q=quote(),N=fx.next(Q),list=$('gx-b2-calendar-list');
 const guard=$('gx-b2-calendar');
 guard.hidden=!Q.trusted||!Q.cargos.length;
 if(guard.hidden)return;
 const dates=new Set(fx.pending(Q).map(c=>fx.due(c)));
 $('gx-b2-next-date').textContent=dates.size?
  dates.size===1?(fx.pending(Q).length>1?'Un vencimiento · varios servicios':'Una fecha pendiente'):
   dates.size+' fechas pendientes':'Sin pagos pendientes';
 $('gx-b2-calendar-toggle').setAttribute('aria-expanded',String(open));
 $('gx-b2-calendar-body').hidden=!open;
 list.innerHTML=Q.cargos.slice().sort((a,b)=>fx.due(a).localeCompare(fx.due(b))).map(c=>{
  const isActive=(mode==='all'&&!c.paid)||(mode==='single'&&selected===c.id)||
    (mode==='next'&&fx.next(Q).rows.some(r=>r.id===c.id));
  const effective=fx.due(c),displayDate=fx.date(effective);
  return '<button class="gx-b2-calendar-row '+(isActive?'is-active ':'')+(c.paid?'is-paid':'')+
    '" type="button" data-charge="'+safe(c.id)+'" '+(c.paid?'disabled':'')+'>'+
    '<span class="gx-b2-calendar-row-main"><strong>'+safe(c.name)+'</strong>'+
    '<small>'+safe(displayDate)+' · '+safe(status(c))+'</small></span>'+
    '<span class="gx-b2-calendar-row-side"><strong>'+fx.money(c.total)+'</strong><small>'+
    (c.paid?'Pagado':isActive?'Seleccionado':'Pendiente')+'</small></span></button>';
 }).join('');
 document.querySelectorAll('.gx-b2-mode').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.mode===mode)));
 list.querySelectorAll('[data-charge]').forEach(btn=>btn.addEventListener('click',()=>{
  selected=btn.dataset.charge;mode='single';refresh();
 }));
}
function breakdown(){
 const Q=quote(),target=$('gx-b2-breakdown');
 if(!Q.trusted||!fx.pending(Q).length){target.hidden=true;return}
 target.hidden=false;
 const {rows,total}=current();
 if(!rows.length){target.hidden=true;return}
 const sum=k=>rows.reduce((n,r)=>n+r[k],0);
 const base=sum('base'),loyalty=sum('loyalty'),commercial=sum('commercial'),
       mora=sum('mora'),abono=sum('abono');
 if(base-loyalty-commercial+mora-abono!==total)throw Error('Importe no conciliado');
 const line=(label,value,cls='')=>'<div class="breakdown-line '+cls+'"><span>'+label+'</span><span>'+value+'</span></div>';
 target.innerHTML='<div class="gx-b2-breakdown-title">DESGLOSE DEL PAGO</div>'+
  '<p class="gx-b2-selection-desc">'+safe(mode==='all'?'Todos los pendientes':
   mode==='single'?rows[0].name:'Detalle del importe próximo')+'</p>'+
  line('Subtotal',fx.money(base))+
  (loyalty?line('Descuento de lealtad','−'+fx.money(loyalty),'discount-line'):'')+
  (commercial?line('Beneficios comerciales','−'+fx.money(commercial),'discount-line'):'')+
  (mora?line('Mora confirmada','+'+fx.money(mora),'surcharge-line'):'')+
  (abono?line('Abono ya aprobado','−'+fx.money(abono),'discount-line'):'')+
  '<div class="gx-b2-selected-final"><span>Importe seleccionado</span><strong id="gx-b2-selected-total">'+fx.money(total)+'</strong></div>'+
  (fx.total(fx.pending(Q))!==total?line('Total pendiente del período',fx.money(fx.total(fx.pending(Q)))):'');
}
/* Compact status with semantic stage progress. Never treat "received" as
 * approved, and never imply a percentage chance of approval.
 */
/* Review tracker is placed directly below the sticky balance.
 * The HERO owns the status; this area only shows the event timeline.
 * Stages are milestones, never a percentage of approval probability.
 */
/* A sculpted luminous route with real semantic stops — NOT elapsed-time
 * progress or a probability of approval. Current status belongs only in hero.
 * No duplicate large card, redundant notification or second CTA.
 */
/* R5: The visual state is rendered by real Animate UI/Motion React.
 * The existing financial engine remains the only owner of proof state.
 * No homemade SVG stations and no duplicate status information.
 */
function proof(){
 const phase=quote().proof||null, panel=$('gx-b2-proof');
 panel.hidden=!phase;
 if(phase)panel.dataset.phase=phase;
 else panel.removeAttribute('data-phase');
 const ui=window.GOXION_ANIMATEUI_NATIVE;
 if(!ui?.renderProof)throw new Error('Animate UI native preview bundle unavailable');
 ui.renderProof(phase);
}
/* Loyalty is rendered only from EXPLICIT, synthetic visual metadata.
 * Neither money owed nor number of services says how many punctual payments
 * a real client has made. Official UI must use trusted engine state.
 */
/* Only explicit fake loyalty milestones are used in this beta.
 * The Animate UI Star is the real upstream animated Lucide component.
 * HeartCrack is the genuine Lucide icon, not a home-drawn emoji/SVG.
 */
function loyalty(){
 const Q=quote(),panel=$('gx-b2-loyalty-panel');
 const mark=$('gx-b2-loyalty-mark'),title=$('gx-b2-loyalty-title');
 const caption=$('gx-b2-loyalty-caption'),description=$('gx-b2-loyalty');
 const state=Q.trusted&&Q.cargos.length?Q.loyaltyDemo:null;
 panel.hidden=!state;
 if(!state){
  mark.removeAttribute('role');mark.removeAttribute('aria-label');
  for(const k of ['aria-valuemin','aria-valuemax','aria-valuenow'])mark.removeAttribute(k);
 }else{
  const lost=state.state==='lost';
  panel.dataset.loyaltyState=lost?'lost':'active';
  title.textContent=lost?'RACHA REINICIADA':'TU LEALTAD';
  caption.textContent=lost?'Perdiste tu avance':state.count+' de '+state.target+' pagos puntuales';
  description.textContent=lost?state.reason:'Racha ilustrativa · siguiente beneficio';
  if(lost){
   mark.setAttribute('role','img');
   mark.setAttribute('aria-label','Racha reiniciada: corazón roto');
   for(const k of ['aria-valuemin','aria-valuemax','aria-valuenow'])mark.removeAttribute(k);
  }else{
   mark.setAttribute('role','progressbar');
   mark.setAttribute('aria-label','Racha ilustrativa: '+state.count+' de '+state.target+' pagos puntuales');
   mark.setAttribute('aria-valuemin','0');
   mark.setAttribute('aria-valuemax',String(state.target));
   mark.setAttribute('aria-valuenow',String(state.count));
  }
 }
 const ui=window.GOXION_ANIMATEUI_NATIVE;
 if(!ui?.renderLoyalty)throw new Error('Animate UI native preview bundle unavailable');
 ui.renderLoyalty(state);
}
function actions(){
 const Q=quote(),el=$('gx-b2-actions'),hasPending=fx.pending(Q).length>0;
 if(!Q.trusted){el.innerHTML='<p class="gx-b2-pay-explain">Saldo sin confirmar. Pago bloqueado.</p>';return}
 if(Q.proof==='review'){el.innerHTML='';return} // Message belongs only to proof timeline.
 if(!hasPending){el.innerHTML='<p class="gx-b2-pay-explain">Estás al corriente.</p>';return}
 if(Q.proof==='correction'){
  el.innerHTML='<button type="button" class="btn gx-b2-secondary" id="gx-b2-action">Consultar observación</button>';
 }else{
  el.innerHTML='<button type="button" class="btn gx-payment-primary" id="gx-b2-action">'+
  '<span class="gx-payment-primary-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 4v10m-4-4 4 4 4-4M5 18.5h14"/></svg></span>'+
  '<span class="gx-payment-primary-copy"><strong>Ya realicé mi pago</strong><small>Subir comprobante</small></span>'+
  '<span class="gx-payment-primary-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h13m-5-5 5 5-5 5"/></svg></span></button>';
 }
 $('gx-b2-action')?.addEventListener('click',()=>openDemo());
}
function refresh(){
 hero();services();calendar();breakdown();proof();loyalty();actions();
 $('gx-b2-scenario').value=key;
}
function openDemo(){
 const Q=quote(),review=Q.proof==='correction';
 if(!Q.trusted||!fx.pending(Q).length)return;
 const dialog=$('gx-b2-demo-modal');
 lastFocus=document.activeElement;
 $('gx-b2-modal-title').textContent=review?'Comprobante con observación':'Sube tu comprobante';
 $('gx-b2-modal-desc').textContent=review
  ?'Revisa la observación y corrige tu comprobante. Aún no está aprobado.'
  :'Adjunta tu comprobante para revisión. Se acredita al aprobarlo.';
 $('gx-b2-modal-amount').textContent=fx.money(current().total);
 $('gx-b2-demo-submit').hidden=review;
 dialog.hidden=false;dialog.classList.add('show');dialog.setAttribute('aria-hidden','false');
 document.documentElement.classList.add('gx-b2-modal-open');
 $('gx-b2-close').focus({preventScroll:true});
}
function closeDemo(){
 const el=$('gx-b2-demo-modal');el.classList.remove('show');el.hidden=true;
 el.setAttribute('aria-hidden','true');document.documentElement.classList.remove('gx-b2-modal-open');
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
$('gx-b2-calendar-toggle').addEventListener('click',()=>{
 open=!open;calendar();
});
document.querySelectorAll('.gx-b2-mode').forEach(btn=>btn.addEventListener('click',()=>{
 mode=btn.dataset.mode;selected=null;refresh();
}));
$('gx-b2-lab-toggle').addEventListener('click',()=>{
 const panel=$('gx-b2-lab'),isOpen=panel.hidden;panel.hidden=!isOpen;
 $('gx-b2-lab-toggle').setAttribute('aria-expanded',String(isOpen));
 if(isOpen)$('gx-b2-scenario').focus({preventScroll:true});
});
$('gx-b2-scenario').addEventListener('change',e=>{
 if(!Object.hasOwn(fx.cases,e.target.value))return;
 key=e.target.value;mode='next';selected=null;open=false;closeDemo();refresh();
 const url=new URL(location.href);url.searchParams.set('escenario',key);
 history.replaceState(null,'',url.pathname+url.search);
});
$('gx-b2-close').addEventListener('click',closeDemo);
$('gx-b2-demo-modal').addEventListener('click',e=>{
 if(e.target===$('gx-b2-demo-modal'))closeDemo();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('gx-b2-demo-modal').hidden)closeDemo()});
$('gx-b2-demo-submit').addEventListener('click',()=>{
 closeDemo();key='review';mode='next';selected=null;open=false;
 const url=new URL(location.href);url.searchParams.set('escenario',key);
 history.replaceState(null,'',url.pathname+url.search);
 refresh();
});
/* Index remaster R1–R3: true scroll-coupled morph of the *existing*
 * sticky-area/balance-hero. No cloned headers, duplicate status layer or
 * artificial sticky container. Derives size/position from visible scroll
 * and uses a damped response so the motion settles instead of snapping.
 */
function setupHeaderMorph(){
 const root=document.documentElement,hero=$('gx-b2-hero');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let value=0,goal=0,frame=0,watchdog=0;
 const clamp=n=>Math.max(0,Math.min(1,n));
 const px=n=>Math.round(n)+'px';
 function paint(){
  const p=value,w=Math.max(200,hero.clientWidth||240);
  // Once "Próximo pago / Importe pendiente" fades out, its former space
  // should NOT remain between "Estado de Cuenta" and the amount/status.
  // Smoothly reclaim 7px only AFTER the label starts disappearing. The
  // baseline expanded layout and the rest of the accepted R5 morph stay.
  const fadeProgress=clamp((p-.25)/.5);
  const freedLabelSpace=7*fadeProgress*fadeProgress*(3-2*fadeProgress);
  root.style.setProperty('--gx-rm-hero-h',px(116-73*p-freedLabelSpace));
  root.style.setProperty('--gx-rm-amount-size',px(52-26*p));
  // Both elements remain a compact CENTERED PAIR, with amount on the LEFT
  // and the status on the RIGHT. Measure actual content to avoid oversized
  // empty space on wide screens or overlap on a 280px iPhone viewport.
  const amount=$('gx-b2-hero-amount'),badge=$('gx-b2-hero-badge');
  // Read the true post-layout border boxes; scrollWidth can underreport
  // the absolutely-positioned amount when WebKit clamps max-content.
  const moneyWidth=amount.getBoundingClientRect().width;
  const statusWidth=badge.getBoundingClientRect().width;
  const gap=10;
  // Horizontal separation settles slightly BEFORE the vertical compression:
  // at ~92% scroll the two labels share one row already, so delaying the
  // separation until 100% creates a 1px collision on 280px devices.
  const paired=Math.min(1,p*1.1);
  root.style.setProperty('--gx-rm-amount-shift',px(-(statusWidth+gap)*.5*paired));
  root.style.setProperty('--gx-rm-badge-shift',px((moneyWidth+gap)*.5*paired));
  root.style.setProperty('--gx-rm-badge-top',px(80-71*p-freedLabelSpace));
  root.style.setProperty('--gx-rm-amount-top',px(17-10*p-freedLabelSpace));
  root.style.setProperty('--gx-rm-badge-max',(96-49*p).toFixed(2)+'%');
  root.style.setProperty('--gx-rm-badge-size',px(12-2*p));
  root.style.setProperty('--gx-rm-label-opacity',String(clamp(1-p*3)));
  root.style.setProperty('--gx-rm-header-gap',px(9-3*p));
  root.style.setProperty('--gx-rm-header-size',px(14-3*p));
  root.style.setProperty('--gx-rm-header-bottom',px(10-3*p));
  root.style.setProperty('--gx-rm-header-pad',px(11-3*p));
  root.style.setProperty('--gx-rm-progress',p.toFixed(3));
  root.dataset.gxRmCompact=String(p>.95);
 }
 // Safari can defer rAF during scroll-to-top. An independently scheduled
 // watchdog runs the SAME damped frame only when rAF has not fired. It does
 // not alter timing on normal 60/120Hz displays and is cancelled at rest.
 function schedule(){
  if(frame)cancelAnimationFrame(frame);
  clearTimeout(watchdog);
  frame=requestAnimationFrame(tick);
  watchdog=window.setTimeout(()=>{
   if(frame)cancelAnimationFrame(frame);
   frame=0;watchdog=0;tick();
  },62);
 }
 function tick(){
  frame=0;
  value+= (goal-value)*.23;
  if(Math.abs(goal-value)<.003)value=goal;
  paint();
  if(value!==goal)schedule();
  else{clearTimeout(watchdog);watchdog=0}
 }
 function request(){
  goal=clamp(window.scrollY/172);
  if(reduced.matches){
   cancelAnimationFrame(frame);clearTimeout(watchdog);
   frame=0;watchdog=0;value=goal;paint();return;
  }
  if(!frame&&!watchdog)schedule();
 }
 window.addEventListener('scroll',request,{passive:true});
 window.addEventListener('resize',()=>{paint();request()},{passive:true});
 if(reduced.addEventListener)reduced.addEventListener('change',request);
 request();paint();
 return {progress:()=>value, target:()=>goal};
}
const morphController=setupHeaderMorph();
refresh();
window.GOXION_E1B2_INDEX=Object.freeze({isolated:true,noBackend:true,
 getScenario:()=>key,getMode:()=>mode,getSelection:()=>current(),
 next:()=>fx.next(quote()), getMorphProgress:()=>morphController.progress()});
})();