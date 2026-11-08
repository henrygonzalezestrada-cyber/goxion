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
let priorAmount=null,priorCents=null;
/* R8 · conteo animado del importe (count-up) y pulso R7.
 * El conteo solo corre al cargar y cuando cambia el valor exacto
 * (cambio de escenario o Próximo ↔ Todo junto): 700 ms con
 * ease-out cúbico, de centavos exactos a centavos exactos, y
 * termina SIEMPRE en el valor exacto del escenario. Nunca corre
 * durante el morph de scroll ni con la barra compacta: si el
 * usuario empieza a desplazar, se cancela y deja el valor exacto
 * (ver request() en setupHeaderMorph). Con reduced-motion no hay
 * conteo: el valor exacto se pone de inmediato. tabular-nums ya
 * está en CSS (R6), así que los dígitos no bailan al sumar.
 * Al terminar el conteo se conserva el pulso R7 (1.04→1, 300 ms)
 * como aterrizaje; es la única animación WAAPI sobre el número. */
const reducedMotion=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
function pulseInk(el){
 el.getAnimations().forEach(a=>a.cancel());
 el.animate([{opacity:.55,transform:'scale(1.04)'},
  {opacity:1,transform:'scale(1)'}],
  {duration:300,easing:'cubic-bezier(.2,.78,.24,1)'});
}
function makeCounter(){
 let raf=0,el=null,to=0,done=null;
 return {
  start(node,fromCents,toCents,onDone){
   if(raf)cancelAnimationFrame(raf);
   el=node;to=toCents;done=onDone||null;
   const t0=performance.now(),dur=700;
   const step=now=>{
    const t=Math.min(1,(now-t0)/dur);
    const eased=1-Math.pow(1-t,3);
    const cents=Math.round(fromCents+(toCents-fromCents)*eased);
    if(el.isConnected)el.textContent=fx.money(cents);
    if(t<1){raf=requestAnimationFrame(step)}
    else{raf=0;const d=done;done=null;if(d)d()}
   };
   raf=requestAnimationFrame(step);
  },
  cancel(settle){
   if(raf)cancelAnimationFrame(raf);
   raf=0;
   if(settle&&el?.isConnected){
    el.getAnimations().forEach(a=>a.cancel());
    el.textContent=fx.money(to);
   }
   el=null;done=null;
  }
 };
}
const heroCounter=makeCounter(),selectedCounter=makeCounter();
/* R8 · ambiente vivo: se pausa cuando la pestaña no está visible,
 * para no gastar batería ni animar lo que nadie mira. */
document.addEventListener('visibilitychange',()=>{
 document.documentElement.classList.toggle('gx-r8-paused',document.hidden);
});
function hero(){
 const Q=quote(),next=fx.next(Q),phase=Q.proof,blocked=!Q.trusted;
 const shortDate=iso=>new Intl.DateTimeFormat('es-MX',{day:'numeric',month:'short',timeZone:'UTC'})
  .format(new Date(iso+'T00:00:00Z'));
 let caption='Próximo pago',badge=next.date?fx.date(next.date):'Al corriente';
 let cls='badge-ok',tone='due';
 if(blocked){caption='Saldo por confirmar';badge='Sin cotización';cls='badge-overdue';tone='blocked'}
 else if(phase==='review'){caption='Importe pendiente';badge='En revisión';cls='badge-review';tone='review'}
 else if(phase==='correction'){caption='Importe pendiente';badge='Acción necesaria';cls='badge-overdue';tone='correction'}
 /* R13 · la píldora se deriva del cargo PRÓXIMO (next), no de
  * cualquier pendiente: antes bastaba que algún cargo del período
  * tuviera mora para que la píldora dijera "vencido" aunque el
  * próximo pago estuviera al corriente. */
 else if(next.rows.some(c=>c.mora>0)){caption='Importe vencido';badge='Venció · '+shortDate(next.date);cls='badge-overdue';tone='overdue'}
 else if(next.rows.some(c=>c.extension)){badge='Prórroga · '+shortDate(next.date);cls='badge-ok';tone='extension'}
 else if(!next.date){caption='Saldo pendiente';badge='Al corriente';cls='badge-paid';tone='clear'}
 const root=document.documentElement;
 root.dataset.gxB2Tone=tone;
 $('gx-b2-hero-label').textContent=caption;
 const amount=$('gx-b2-hero-amount'),value=blocked?'—':fx.money(next.amount);
 /* R8 · conteo: el primer pintado crea el span en $0.00 y suma hasta
  * el valor exacto; los cambios posteriores suman desde el valor
  * anterior. Si el morph está activo (barra en movimiento o
  * compacta) el valor exacto se pone directo, sin contar: contar
  * mientras el precio viaja fue el bug del espejo viejo, donde a
  * mitad de morph se veían $45.72 / $86.16 como si fueran reales. */
 let ink=amount.querySelector('.gx-b2-number-ink');
 if(!ink){
  amount.innerHTML='<span class="gx-b2-number-ink">'+(blocked?'—':fx.money(0))+'</span>';
  ink=amount.querySelector('.gx-b2-number-ink');
 }
 if(blocked){
  heroCounter.cancel(false);ink.textContent=value;priorAmount=value;priorCents=null;
 }else if(ink.textContent!==value){
  if(reducedMotion()||morphController.progress()>0.02){
   heroCounter.cancel(false);ink.textContent=value;
  }else{
   const from=priorCents===null?0:priorCents;
   heroCounter.start(ink,from,next.amount,()=>pulseInk(ink));
  }
  priorAmount=value;priorCents=next.amount;
 }else priorCents=next.amount;
 const badgeNode=$('gx-b2-hero-badge');
 badgeNode.textContent=badge;
 badgeNode.className='time-badge '+cls;
 badgeNode.title=badge;
 $('gx-b2-period').textContent=Q.period+' · Ejemplo';
 /* R15 · la flecha de retroceso se eliminó del preview (la oficial
  * no la tiene); ya no hay href que actualizar al cambiar de
  * escenario. */
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
  /* R13 · cada fila lleva su estado propio, derivado de la
   * cotización del cargo (mora / prórroga / abono), no solo de la
   * selección: la fila activa ya era por cotización, pero el estado
   * del cargo no tenía clase. Sin cambiar textos ni estructura. */
  const stateCls=c.paid?'':c.mora>0?'is-overdue ':c.extension?'is-extension ':c.abono>0?'is-partial ':'';
  const effective=fx.due(c),displayDate=fx.date(effective);
  return '<button class="gx-b2-calendar-row '+(isActive?'is-active ':'')+stateCls+(c.paid?'is-paid':'')+
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
/* R7 · pulso del importe seleccionado: solo cuando el valor exacto
 * cambia (Próximo ↔ Todo junto, o al elegir un cargo). Sin conteo. */
let priorSelectedTotal=null;
function breakdown(){
 const Q=quote(),target=$('gx-b2-breakdown');
 if(!Q.trusted||!fx.pending(Q).length){target.hidden=true;priorSelectedTotal=null;return}
 target.hidden=false;
 const {rows,total}=current();
 if(!rows.length){target.hidden=true;priorSelectedTotal=null;return}
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
 const strong=$('gx-b2-selected-total');
 /* R9 · causa raíz del bug de Todo junto: el conteo del total
  * seleccionado estaba supeditado a morphController.progress()<=0.02,
  * la misma guarda del importe del hero. En el iPhone el botón
  * "Todo junto" está bajo el pliegue, dentro del calendario, así
  * que al pulsarlo la página YA está desplazada (en la repro, con
  * scrollIntoView el progreso llega a 1) y el total saltaba directo
  * a $94.00 sin contar: en scroll 0 sí sumaba ($45→$55→…→$94) y
  * desplazado todos los muestreos eran $94.00. La guarda era para
  * el hero, que viaja con el morph (contarlo a mitad de morph fue
  * el bug $45.72 del espejo viejo); el total seleccionado vive en
  * el desglose, bajo el hero, y NO viaja con el morph, así que
  * contarlo con la página desplazada es seguro. Se quita la guarda
  * solo aquí; el hero la conserva. Si el usuario desplaza DURANTE
  * el conteo, el conteo sigue hasta el valor exacto: el total no
  * viaja con el morph, así que no aparecen valores falsos a mitad
  * de camino. Con reduced-motion, valor exacto directo, sin contar. */
 if(strong){
  if(reducedMotion()){selectedCounter.cancel(false);strong.textContent=fx.money(total)}
  else if(priorSelectedTotal===null)selectedCounter.start(strong,0,total,()=>pulseInk(strong));
  else if(priorSelectedTotal!==total)selectedCounter.start(strong,priorSelectedTotal,total,()=>pulseInk(strong));
 }
 priorSelectedTotal=total;
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
 /* R13 · si la hoja está abierta, su importe se re-sincroniza con
  * la selección viva en cada refresh (ver syncModalAmount). */
 if(!$('gx-b2-demo-modal').hidden)syncModalAmount();
 /* R10 · hero() pudo cambiar el texto de la píldora (o del importe)
  * sin que hubiera scroll: repintar el morph aquí para que los
  * desplazamientos del par compacto se midan con los anchos reales
  * del texto nuevo, no con los de la píldora anterior. */
 morphController.repaint();
 $('gx-b2-scenario').value=key;
}
/* R13 · importe vivo de la hoja de reporte: lo que muestra y lo
 * que se reporta se construye SIEMPRE desde la selección viva
 * (current(): Próximo / Todo junto / un cargo), nunca desde un
 * valor capturado al abrir. Se llama al abrir y en cada refresh()
 * con la hoja abierta, y el botón de envío lleva el importe y los
 * cargos en data-* para que el reporte use la cotización viva del
 * momento de enviar. La CLABE sigue siendo la ficticia de
 * demostración; al integrar a la oficial se liga a los datos
 * reales de Nu (ver doc R13). */
function syncModalAmount(){
 const sel=current(),btn=$('gx-b2-demo-submit'),amount=$('gx-b2-modal-amount');
 if(amount)amount.textContent=fx.money(sel.total);
 if(btn){btn.dataset.amountCents=String(sel.total);
  btn.dataset.cargoIds=JSON.stringify(sel.rows.map(r=>r.id));}
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
 syncModalAmount();
 $('gx-b2-demo-submit').hidden=review;
 dialog.hidden=false;dialog.classList.add('show');dialog.setAttribute('aria-hidden','false');
 document.documentElement.classList.add('gx-b2-modal-open');
 $('gx-b2-close').focus({preventScroll:true});
}
function closeDemo(){
 const el=$('gx-b2-demo-modal');el.classList.remove('show');el.hidden=true;
 el.setAttribute('aria-hidden','true');document.documentElement.classList.remove('gx-b2-modal-open');
 /* R7: al cerrar, el botón de copiar vuelve a su estado inicial. */
 const copyBtn=$('gx-b2-copy-clabe');
 if(copyBtn){clearTimeout(copyClabe._t);copyBtn.classList.remove('is-copied');
  copyBtn.setAttribute('aria-label','Copiar CLABE de ejemplo');
  const st=$('gx-b2-copy-state');if(st)st.textContent='Copiar';}
 if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});
}
/* R7 · Copiar CLABE de ejemplo: el icono se transforma a check, sin
 * toast genérico. CLABE ficticia de demostración (ceros), sin backend
 * y sin cuenta real; el portapapeles se escribe con fallback legacy.
 * El estado "Copiado" revierte solo a los 1,8 s. */
const GX_R7_CLABE_DEMO='012180000000000000';
function copyClabe(){
 const btn=$('gx-b2-copy-clabe');if(!btn)return;
 const done=()=>{
  btn.classList.add('is-copied');
  btn.setAttribute('aria-label','CLABE de ejemplo copiada');
  const st=$('gx-b2-copy-state');if(st)st.textContent='Copiado';
  clearTimeout(copyClabe._t);
  copyClabe._t=setTimeout(()=>{
   btn.classList.remove('is-copied');
   btn.setAttribute('aria-label','Copiar CLABE de ejemplo');
   if(st)st.textContent='Copiar';
  },1800);
 };
 const fallback=()=>{
  const ta=document.createElement('textarea');
  ta.value=GX_R7_CLABE_DEMO;ta.setAttribute('readonly','');
  ta.style.cssText='position:fixed;top:0;opacity:0';
  document.body.appendChild(ta);ta.select();
  let ok=false;try{ok=document.execCommand('copy')}catch{}
  ta.remove();if(ok)done();
 };
 if(navigator.clipboard?.writeText){
  navigator.clipboard.writeText(GX_R7_CLABE_DEMO).then(done).catch(fallback);
 }else fallback();
}
$('gx-b2-copy-clabe')?.addEventListener('click',copyClabe);
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
 /* R13 · el envío reporta la selección viva del momento de enviar,
  * no la de la apertura: se re-sincroniza antes de cerrar. */
 syncModalAmount();
 closeDemo();key='review';mode='next';selected=null;open=false;
 const url=new URL(location.href);url.searchParams.set('escenario',key);
 history.replaceState(null,'',url.pathname+url.search);
 refresh();
});
/* Index remaster R1–R3: true scroll-coupled morph of the *existing*
 * sticky-area/balance-hero. No cloned headers, duplicate status layer or
 * artificial sticky container. Derives size/position from visible scroll
 * and uses a damped response so the motion settles instead of snapping.
 *
 * R5.2 · fluidez (2026-11-06): MISMA geometría, MISMO diseño, solo el
 * movimiento es más regular. El amortiguamiento anterior era fijo por
 * frame (.23), así que a 120 Hz el morph corría el doble de rápido que
 * a 60 Hz y a 30 Hz (iOS en ahorro de energía) se arrastraba. Ahora la
 * constante de tiempo es de 64 ms — exactamente la sensación aprobada
 * a 60 Hz — y el paso se normaliza por el delta real entre frames, así
 * que se siente igual a 60, 120 o 30 Hz. La medida de anchos
 * (getBoundingClientRect) solo se repite cuando cambia el texto, el
 * tamaño o el viewport: antes se forzaba un layout síncrono en cada
 * frame durante el scroll. Y al soltar el scroll, tras 120 ms sin
 * eventos, el morph acelera su asentamiento al estado de reposo que
 * marca el scroll, en vez de quedarse flotando en la cola exponencial.
 * NO se asienta a 0/1 por su cuenta: el morph sigue acoplado al
 * scrollY, y forzarlo a un extremo sin mover el scroll provocaría un
 * salto al siguiente evento de scroll.
 *
 * R7 · acomodo (2026-11-07): mismos extremos, mismo tau, solo los
 * tiempos de cada pieza (ver paint): el precio viaja primero y
 * termina en p≈0.45, la separación horizontal termina en p≈0.35 y el
 * badge entra con retraso (0.30→0.75); el alto del hero se deriva
 * del contenido medido para no dejar banda vacía. Sin Block 3
 * (morph solo-transform): no hizo falta, el defecto era el mapeo.
 *
 * R8 · conteo + ambiente (2026-11-07): el conteo del importe vive
 * en hero()/breakdown() (700 ms hasta el valor exacto, solo en
 * reposo) y se cancela en request() al desplazar, para que nunca
 * se vean valores intermedios como si fueran reales a mitad de
 * morph. El ambiente vivo es solo CSS (estado.css, sección R8) y
 * se pausa con la pestaña oculta.
 *
 * R10 · píldora, asentamiento y glow (2026-11-07): 1) si la píldora
 * cambia de texto sin scroll (cambio de escenario/estado), refresh()
 * repinta el morph para medir los anchos nuevos (antes quedaban los
 * desplazamientos de la píldora anterior y la nueva se encimaba en
 * el precio); la medida usa además piso scrollWidth y el tope de
 * ancho se fija antes de medir. 2) Al soltar a mitad de scroll, el
 * scrollY se asienta suave al extremo más cercano (0 o máximo) y el
 * morph lo sigue; nunca se fuerza el valor del morph por su cuenta.
 * R11 (2026-11-07): el glow líquido de la píldora se quita por
 * completo por decisión de Henry (estado.css 2b); la píldora queda
 * plana como el original. Los puntos 1) y 2) se conservan intactos.
 *
 * R12 · morph solo-transform (Block 3, 2026-11-07): por fin se hace.
 * El alto del hero es FIJO (116 px en CSS) y nunca se escribe desde
 * JS: el documento no se mueve al compactar y el scrollY deja de
 * realimentarse, que era el tirón en Safari con impulso. El precio
 * viaja y se encoge solo con transform (scale .5 = 52→26 px, la
 * fuente se queda en 52 px; la píldora scale .833 = 12→10 px) y la
 * subida vertical es translateY. Como la caja ya no se encoge, lo
 * que se encoge es lo VISIBLE: el contenido sube con transform
 * (V−V0, ≈ −78 px en compacto) y el sticky se recorta con clip-path
 * (116−V), así que en compacto se ve exactamente lo mismo que en
 * R11 — mismo par, mismo contenido justo debajo, mismo fundido — sin
 * tocar el layout en ningún frame. La geometría visual es idéntica:
 * extremos 116/36 px, badge top 80→2 px, barra compacta en p≈0.35,
 * gap 10 px, blur 25 px. La corrección R10 (sin solape) y el
 * asentamiento al soltar se conservan; la píldora sigue SIN glow.
 *
 * R14 · encabezado compacto en 3 zonas (2026-11-07): con todo
 * centrado el encabezado compacto se sentía desperdiciado, así que
 * en p≈1 el par deja de ser un grupo centrado y se reparte: precio
 * a la IZQUIERDA, píldora al CENTRO y botón "Mi Espacio" a la
 * DERECHA (mismo alto que la píldora, cian con texto oscuro).
 * Segunda fase del morph: hasta p≈0.75 todo sigue igual que R12
 * (par centrado); de 0.75→1 el precio desliza a la izquierda, la
 * píldora vuelve al centro y el botón entra con opacidad. El estado
 * expandido (p=0) queda idéntico, centrado. La píldora se ajusta
 * con max-width calculado (nunca se encima del precio ni del botón,
 * con ellipsis si el texto es largo y la pantalla estrecha).
 * El botón solo tiene pointer-events en compacto y lleva a
 * ayuda.html, el mismo destino que usa el Index oficial ("Ir a Mi
 * Espacio", assets/js/index/01-index-supabase-layer.js:263).
 */
function setupHeaderMorph(){
 const root=document.documentElement;
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let value=0,goal=0,frame=0,watchdog=0,lastTick=0,lastScroll=0;
 let measureKey='',moneyWidth=0,statusWidth=0,amountH=0,badgeH=0,lastPainted=null,heroRestH=0;
 /* R14 · anchos de layout del hero y del botón compacto (para la
  * fila de 3 zonas en compacto). Se miden solo al remediar. */
 let heroW=0,btnW=0;
 /* R10 · asentamiento al soltar (ver maybeSnap): cuando el cliente
  * suelta a mitad de scroll, el morph termina de acomodarse al
  * extremo más cercano. NUNCA se fuerza el valor del morph por su
  * cuenta (R5.2 documentó que eso provoca un salto al siguiente
  * evento de scroll): se mueve el scrollY con scrollTo suave y el
  * morph, que sigue acoplado al scrollY, lo sigue sin saltar. */
 let snapTimer=0,snapping=false,snapRaf=0,snapDeadline=0,touching=false;
 /* R10 · el asentamiento mueve el scrollY con una animación propia
  * por frames (ver animateSnap), no con el scrollTo suave del
  * navegador: con el scrollTo suave el aterrizaje quedaba a medias
  * (medido: soltar en 30 px terminaba en 61 px, no en 0). Al re-leer
  * el scrollY real en cada frame, cualquier compensación se absorbe
  * en el paso siguiente y el aterrizaje cae exacto en el extremo.
  * R12 · con el hero de alto fijo, el anclaje de scroll ya no tiene
  * nada que compensar durante el morph (la altura del documento no
  * cambia), así que el asentamiento es aún más fiable; la animación
  * por frames se conserva porque también absorbe scrolls
  * programáticos que lleguen a mitad. */
 const clamp=n=>Math.max(0,Math.min(1,n));
 const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
 const px=n=>Math.round(n)+'px';
 // Time constant of the approved 60 Hz feel: one 16.7 ms frame with the
 // old fixed .23 step is 1-exp(-16.7/TAU) = .23  →  TAU ≈ 64 ms.
 const TAU=64,SETTLE_TAU=26,IDLE_MS=120;
 function paint(){
  const p=value;
  /* R7 · acomodo (2026-11-07): MISMA geometría en reposo y MISMO par
   * compacto al final (gap 10 px, mismo blur), solo cambia CUÁNDO viaja
   * cada pieza. Medido en Chromium 390 px antes del cambio, el badge
   * atravesaba el importe a mitad de scroll: a p≈0.2 ya se solapaban
   * 90 px en horizontal y el rectángulo del badge entraba en la banda
   * vertical del precio, y a p≈0.43 el solape era de ~50 px — ese es el
   * "precio flotante" del video. La causa era el mapeo lineal: el badge
   * subía (80-71p) mientras la separación horizontal (p*1.1) aún no
   * llegaba al ~0.93 que exige no cruzarse. Ahora cada pieza tiene su
   * propia curva suavizada sobre p, con los extremos idénticos:
   *  · precio primero: tamaño 52→26 y subida completos en p≈0.45;
   *  · separación horizontal completa en p≈0.35, ANTES de que el badge
   *    pueda entrar en la banda vertical del importe;
   *  · badge con retraso: empieza en p≈0.30 y llega en p≈0.75;
   *  · la etiqueta se desvanece 0→0.33, solapada con el viaje del
   *    precio, y su hueco de 7 px se reclama en 0.10→0.45;
   *  · R12: el alto del hero ya NO se deriva del contenido: la caja
   *    es fija (116 px) y lo que se encoge es lo visible. La altura
   *    visual del par (fondo de la pieza más baja + 8–14 px, extremos
   *    ~114/36 px) sigue calculándose igual, pero ahora solo sirve
   *    para dos cosas que NO tocan el layout: subir el contenido con
   *    transform y recortar el sticky con clip-path (estado.css R12).
   *    Así no queda banda vacía debajo del contenido a mitad de
   *    scroll ni en compacto.
   * Block 3 (morph solo-transform) HECHO en R12: el defecto original
   * era el mapeo de tiempos (R7), pero el tirón con impulso en Safari
   * venía de que el alto del hero movía el documento y realimentaba
   * el scrollY. Ahora solo transform/opacity/clip-path. Se conserva
   * tau 64 ms, scrollY/172, un solo precio exacto y el blur 25 px. */
  const pp=smooth(p/.45);
  const pb=smooth((p-.30)/.45);
  const paired=smooth((p-.05)/.30);
  /* R14 · segunda fase del morph (0.75→1): el par centrado se
   * reparte en 3 zonas. Hasta p≈0.75 nada cambia (spread 0). */
  const spread=smooth((p-.75)/.25);
  const freedLabelSpace=7*smooth((p-.10)/.35);
  const amountSize=52-26*pp;
  /* R15 · la píldora vuelve a su tamaño ORIGINAL: 12 px siempre,
   * sin encoger con scale (.833 → 10 px en R12/R14 se veía súper
   * pequeña y rara). badgeScale queda en 1; la píldora compacta
   * mide lo mismo que en reposo y el botón "Mi Espacio" sigue a
   * su mismo alto (badgeH×1). pb sigue usándose para la subida
   * (badgeTop) y la huella visual, no para el tamaño. */
  const badgeSize=12;
  const amount=$('gx-b2-hero-amount'),badge=$('gx-b2-hero-badge');
  // Re-measure only when something that changes the widths changed.
  // Reading border boxes every frame forced a synchronous layout per
  // frame while scrolling; the key covers text, size bucket and viewport.
  // R7: la altura del hero se deriva de las alturas MEDIDAS (no de una
  // fórmula), así que la clave también cubre el tamaño del badge.
  const key=amount.textContent+'|'+badge.textContent+'|'+Math.round(amountSize)+'|'+
   Math.round(badgeSize)+'|'+window.innerWidth;
  if(Math.abs(p-(lastPainted??-1))<.0004&&key===measureKey)return;
  lastPainted=p;
  /* R12 · solo-transform: el tamaño y la posición ya NO se animan con
   * font-size/top (propiedades de layout) sino con transform. La
   * fuente del importe se queda en 52 px y la de la píldora en 12 px;
   * el encogido del importe es scale (52→26 es scale .5) y el viaje
   * es translate. R15: la píldora YA NO encoge (scale 1, 12 px
   * siempre, su tamaño original). El alto del hero es fijo (116 px en CSS)
   * y nunca se escribe: el documento no se mueve al compactar y el
   * scrollY deja de realimentarse. El desplazamiento del par se
   * calcula con los anchos VISUALES (ancho de layout × scale), y la
   * subida vertical (dy) compensa que el scale se hace sobre el
   * centro: visualTop = layoutTop + dy + layoutH·(1−scale)/2.
   * --gx-rm-badge-max ya NO se encoge: a 12 px fijos, bajarlo al 47%
   * recortaría el texto con ellipsis (antes la fuente bajaba a 10 px
   * y cabía); con 96% fijo el par cabe igual en 280–390 px. */
  const amountScale=amountSize/52,badgeScale=badgeSize/12;
  const remeasured=key!==measureKey;
  if(remeasured){
   measureKey=key;
   // Read the true post-layout border boxes; scrollWidth can underreport
   // the absolutely-positioned amount when WebKit clamps max-content.
   // R10 · el piso scrollWidth protege la medida cuando un max-width
   // recorta la caja (importe con max-width 59% a 280 px, píldora con
   // su tope %): scrollWidth devuelve el ancho natural del contenido
   // aunque la caja esté recortada, así que el desplazamiento del par
   // se calcula con el ancho real y nunca con uno recortado.
   // R12 · getBoundingClientRect ya NO sirve para medir: con scale,
   // el rect es el tamaño visual (layout × scale). Los anchos se
   // miden con scrollWidth (layout, sin transform) y los altos con
   // offsetHeight (layout, sin transform); lo visual es layout × scale.
   moneyWidth=Math.max(amount.getBoundingClientRect().width,amount.scrollWidth);
   statusWidth=Math.max(badge.getBoundingClientRect().width,badge.scrollWidth);
   amountH=amount.offsetHeight;
   badgeH=badge.offsetHeight;
   /* R14 · anchos de layout para la fila compacta de 3 zonas: el
    * hero (la fila vive dentro de él) y el botón (opacity 0 pero
    * medible: offsetWidth no depende de la opacidad). */
   heroW=$('gx-b2-hero').offsetWidth;
   const btn=$('gx-b2-space-btn');
   btnW=btn?btn.offsetWidth:0;
  }
  // Both elements remain a compact CENTERED PAIR, with amount on the LEFT
  // and the status on the RIGHT. Measure actual content to avoid oversized
  // empty space on wide screens or overlap on a 280px iPhone viewport.
  // R12 · los desplazamientos usan anchos visuales (layout × scale).
  const gap=10;
  const amountTop=17-10*pp-freedLabelSpace;
  const badgeTop=80-71*pb-freedLabelSpace;
  const amountVH=amountH*amountScale,badgeVH=badgeH*badgeScale;
  // La altura VISUAL del hero (lo que ocupa el par): la pieza más baja
  // + 8 px en expandido y +7 px en compacto. En los extremos da ~114 px
  // y 36 px, como R5.2/R7. Ya no es la altura de la caja (fija en
  // 116 px): es lo que el contenido ocupa y lo que se usa para subir
  // el contenido y recortar el sticky (ver abajo).
  const heroVH=Math.round(Math.max(amountTop+amountVH,badgeTop+badgeVH)+8-pb);
  // V0: la altura visual en reposo. Se fija en el primer pintado y se
  // re-deriva si cambia el contenido con p≈0; a mitad de morph no se
  // toca (V(p) ≠ V0 ahí). El desplazamiento del contenido es V−V0:
  // en reposo 0, en compacto ≈ −78 px.
  if(heroRestH===0||(p<.02&&remeasured))heroRestH=heroVH;
  /* R14 · fila compacta de 3 zonas (solo con spread>0). El precio
   * desliza del par centrado a la izquierda del hero: su centro
   * queda a la mitad de su ancho visual desde el borde izquierdo.
   * La píldora vuelve del desplazamiento del par al centro exacto
   * del hero (shift 0). El botón entra con opacidad = spread y
   * comparte la parte superior y el alto visuales de la píldora
   * (la dy ya compensa el scale sobre el centro, así que la parte
   * superior visual ES badgeTop y el alto visual ES badgeH×scale).
   * La píldora se ajusta con max-width calculado: cabe entre el
   * precio y el botón con 8 px de aire por lado, con ellipsis si
   * el texto es largo y la pantalla estrecha; a 280 px se recorta,
   * a 390 px cabe entera. Con spread 0 el tope vuelve a 96%. */
  const amountVW=moneyWidth*amountScale;
  const amountShiftBase=-(statusWidth*badgeScale+gap)*.5*paired;
  const amountShiftLeft=-(heroW/2-amountVW/2);
  const amountShift=amountShiftBase+(amountShiftLeft-amountShiftBase)*spread;
  const badgeShiftBase=(moneyWidth*amountScale+gap)*.5*paired;
  const badgeShift=badgeShiftBase*(1-spread);
  if(spread>0){
   const avail=heroW-2*Math.max(amountVW,btnW)-16;
   root.style.setProperty('--gx-rm-badge-max',px(Math.max(40,avail)));
  }else{
   root.style.setProperty('--gx-rm-badge-max','96%');
  }
  root.style.setProperty('--gx-rm-space',spread.toFixed(3));
  root.style.setProperty('--gx-rm-space-top',px(badgeTop));
  root.style.setProperty('--gx-rm-space-h',px(badgeH*badgeScale));
  root.style.setProperty('--gx-rm-amount-scale',amountScale.toFixed(4));
  root.style.setProperty('--gx-rm-amount-dy',px(amountTop-17-amountH*(1-amountScale)/2));
  root.style.setProperty('--gx-rm-amount-shift',px(amountShift));
  root.style.setProperty('--gx-rm-badge-scale',badgeScale.toFixed(4));
  root.style.setProperty('--gx-rm-badge-dy',px(badgeTop-80-badgeH*(1-badgeScale)/2));
  root.style.setProperty('--gx-rm-badge-shift',px(badgeShift));
  root.style.setProperty('--gx-rm-content-shift',px(heroVH-heroRestH));
  root.style.setProperty('--gx-rm-clip',px(116-heroVH));
  root.style.setProperty('--gx-rm-title-scale',((14-3*p)/14).toFixed(4));
  root.style.setProperty('--gx-rm-label-opacity',String(clamp(1-p*3)));
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
 function tick(ts){
  frame=0;
  const now=typeof ts==='number'?ts:performance.now();
  const dt=lastTick?Math.min(100,Math.max(0,now-lastTick)):16.7;
  lastTick=now;
  // Once the finger leaves, settle decisively to the rest state the
  // scroll already dictates instead of hovering in the exponential tail.
  const tau=(now-lastScroll)>IDLE_MS?SETTLE_TAU:TAU;
  value+=(goal-value)*(1-Math.exp(-dt/tau));
  if(Math.abs(goal-value)<.003)value=goal;
  paint();
  if(value!==goal)schedule();
  else{clearTimeout(watchdog);watchdog=0;lastTick=0}
 }
 function request(){
  goal=clamp(window.scrollY/172);
  /* R8 · si el usuario empieza a desplazar, el conteo del hero se
   * cancela y deja el valor exacto: contar mientras el precio viaja
   * fue el bug del espejo viejo ($45.72 / $86.16 a mitad de morph).
   * R9 · el total seleccionado NO se cancela aquí: vive en el
   * desglose, no viaja con el morph, y cancelarlo mataba el conteo
   * que arranca al tocar Próximo/Todo junto justo después de
   * desplazar — el scrollend del desplazamiento llegaba ~50 ms
   * después del toque y lo asentaba en el valor final sin contar. */
  if(window.scrollY>0){heroCounter.cancel(true)}
  lastScroll=performance.now();
  /* R10 · los eventos de scroll que produce el propio asentamiento
   * (snapping) no vuelven a armar el temporizador: si no, el snap
   * se re-dispararía a sí mismo. */
  if(!snapping&&!touching)armSnap();
  if(reduced.matches){
   cancelAnimationFrame(frame);clearTimeout(watchdog);
   frame=0;watchdog=0;value=goal;lastTick=0;paint();return;
  }
  if(!frame&&!watchdog)schedule();
 }
 /* R10 · asentamiento al soltar. Si el cliente suelta a mitad, la
  * píldora (y todo el par compacto) termina de llegar al extremo
  * más cercano: expandido (scroll 0) o compacto (scroll 172 px, o
  * el máximo de la página si es menor). El morph no se toca: al
  * mover el scrollY, el morph lo sigue.
  * No se asienta si el modal de reporte está abierto, si el dedo
  * sigue en pantalla, ni si ya está a menos de 4 px del extremo
  * (eso también corta cualquier rebote: tras asentar, el progreso
  * ya no está a mitad). Con reduced-motion el salto es instantáneo.
  * Si el navegador no dispara scrollend (Safari viejo), el
  * temporizador de 250 ms sin eventos hace lo mismo. */
 const SNAP_IDLE_MS=250;
 function armSnap(){
  clearTimeout(snapTimer);
  snapTimer=setTimeout(maybeSnap,SNAP_IDLE_MS);
 }
 function maybeSnap(){
  clearTimeout(snapTimer);snapTimer=0;
  if(snapping||touching)return;
  if(document.documentElement.classList.contains('gx-b2-modal-open'))return;
  const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  if(maxScroll<8)return;
  /* El extremo compacto del morph es 172 px, no el máximo de la
   * página: si la página desplaza más (viewport bajo), asentar al
   * máximo alejaría del final del morph en vez de acercar. */
  const anchor=Math.min(172,maxScroll);
  const y=window.scrollY;
  /* R13 · el snap solo vive en la zona del morph (0–172 px). Antes,
   * soltar en cualquier punto bajo de la página (scrollY >> 172)
   * asentaba a 172 y la página regresaba al centro como un resorte,
   * tapando los botones de pago de abajo. Fuera de la zona del
   * morph, no tocar el scroll para nada. */
  if(y>anchor)return;
  const target=y<anchor/2?0:anchor;
  if(Math.abs(y-target)<4)return;
  animateSnap(target);
 }
 /* R10 · animación propia del asentamiento. Cada frame lee el
  * scrollY real y avanza un cuarto de la distancia que falta: si
  * el anclaje de scroll empuja el scrollY por el cambio de alto
  * del hero, el paso siguiente lo tiene en cuenta y el aterrizaje
  * converge al extremo en vez de quedarse a medias. El objetivo
  * efectivo se recalcula en cada frame (el máximo desplazamiento
  * cambia mientras el hero se compacta o se expande) y hay un
  * plazo de 1 s que fuerza el aterrizaje exacto. Con
  * reduced-motion el salto es instantáneo. Si el cliente vuelve a
  * tocar o a rodar la rueda, la animación se cancela y manda él.
  * Arranca tras 250 ms sin eventos de scroll (ver onScrollEnd):
  * ese silencio es lo que distingue "soltó a mitad" de "sigue
  * desplazando o acaba de mover la página por otro lado". */
 function cancelSnap(){
  if(snapRaf)cancelAnimationFrame(snapRaf);
  snapRaf=0;snapping=false;
 }
 function animateSnap(target){
  cancelSnap();
  snapping=true;
  if(reduced.matches){window.scrollTo(0,target);snapping=false;return}
  snapDeadline=performance.now()+1000;
  /* Si algo que no es la animación mueve el scrollY más de 24 px
   * (el cliente vuelve a desplazar, o un scrollTo programático),
   * la animación cede y manda ese desplazamiento. Con
   * overflow-anchor:none (R10, estado.css) el anclaje de scroll
   * ya no empuja el scrollY por su cuenta, así que un salto así
   * solo puede venir de fuera, no del propio asentamiento. */
  let prevY=window.scrollY;
  const step=()=>{
   snapRaf=0;
   const y=window.scrollY;
   if(Math.abs(y-prevY)>24){snapping=false;return}
   const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
   const eff=Math.min(target,maxScroll);
   const d=eff-y;
   if(Math.abs(d)<1||performance.now()>snapDeadline){
    window.scrollTo(0,eff);snapping=false;return;
   }
   window.scrollTo(0,y+d*.25);
   prevY=window.scrollY;
   snapRaf=requestAnimationFrame(step);
  };
  snapRaf=requestAnimationFrame(step);
 }
 function onScrollEnd(){
  /* El asentamiento arranca por el temporizador de inactividad
   * (250 ms sin eventos de scroll), no de inmediato en scrollend:
   * un scrollTo programático que llega justo después del anterior
   * (o el cliente que cambia de idea y vuelve a desplazar) debe
   * ganar antes de que el snap arranque, y no pelear con él. El
   * scrollend solo adelanta el asentamiento si el último evento de
   * scroll ya quedó atrás hace más de 200 ms. Mientras la
   * animación corre, ella es dueña de la bandera: el scrollend de
   * sus propios pasos no re-dispara otro asentamiento. */
  if(snapping)return;
  if(performance.now()-lastScroll>200)maybeSnap();
 }
 window.addEventListener('scroll',request,{passive:true});
 window.addEventListener('scrollend',request,{passive:true});
 window.addEventListener('scrollend',onScrollEnd,{passive:true});
 window.addEventListener('touchstart',()=>{touching=true;clearTimeout(snapTimer);cancelSnap()},{passive:true});
 window.addEventListener('touchend',()=>{touching=false;armSnap()},{passive:true});
 window.addEventListener('wheel',()=>{cancelSnap()},{passive:true});
 window.addEventListener('resize',()=>{paint();request()},{passive:true});
 if(reduced.addEventListener)reduced.addEventListener('change',request);
 request();paint();
 return {progress:()=>value, target:()=>goal,
  /* R10 · repintar cuando el contenido del hero cambia (cambio de
   * escenario o de estado del comprobante): paint() solo corría con
   * scroll/resize, así que si la píldora cambiaba de texto con la
   * página ya desplazada y asentada, los desplazamientos del par
   * quedaban calculados con el ancho de la píldora ANTERIOR y la
   * nueva píldora se encimaba en el precio (medido en la captura
   * de Henry: "Acción necesaria" con desplazamiento de "En
   * revisión", 15 px corto). Al invalidar la clave de medida, el
   * repintado mide los anchos reales del texto nuevo y corrige los
   * desplazamientos sin tocar el progreso ni mover el scroll. */
  repaint(){measureKey='';paint()}};
}
const morphController=setupHeaderMorph();
refresh();
window.GOXION_E1B2_INDEX=Object.freeze({isolated:true,noBackend:true,
 getScenario:()=>key,getMode:()=>mode,getSelection:()=>current(),
 next:()=>fx.next(quote()), getMorphProgress:()=>morphController.progress()});
})();