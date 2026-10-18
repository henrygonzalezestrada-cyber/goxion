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
 if(quote().proof==='review')return 'Comprobante en revisión';
 if(quote().proof==='correction')return 'Comprobante con observación';
 return 'Pendiente';
}
function hero(){
 const Q=quote(),next=fx.next(Q),proof=Q.proof,blocked=!Q.trusted;
 let caption='Próximo pago',badge=next.date?'Próximo vencimiento · '+fx.date(next.date):'Sin pagos pendientes';
 let cls='badge-ok';
 if(blocked){caption='Saldo no confirmado';badge='Verificación pendiente';cls='badge-overdue'}
 else if(proof==='review'){caption='Importe en revisión';badge='Comprobante recibido · Sin acreditar';cls='badge-review'}
 else if(proof==='correction'){caption='Importe pendiente';badge='Comprobante con observación';cls='badge-overdue'}
 else if(active().some(c=>c.mora>0)){badge='Servicio vencido · '+fx.date(next.date);cls='badge-overdue'}
 else if(active().some(c=>c.extension)){badge='Acuerdo pactado · '+fx.date(next.date);cls='badge-ok'}
 else if(!next.date){caption='Saldo pendiente';badge='Servicios al corriente';cls='badge-paid'}
 $('gx-b2-hero-label').textContent=caption;
 $('gx-b2-hero-amount').textContent=blocked?'—':fx.money(next.amount);
 $('gx-b2-hero-badge').textContent=badge;
 $('gx-b2-hero-badge').className='time-badge '+cls;
 $('gx-b2-period').textContent=Q.period+' · Ejemplo';
 $('gx-b2-loyalty').textContent=active().some(c=>c.loyalty>0)?
  'Descuento de lealtad incluido en los importes mostrados (simulación).':
  'Los beneficios dependen de las reglas y de la cotización oficial.';
 $('gx-b2-back').href='./index.html?escenario='+encodeURIComponent(
  Object.hasOwn(fx.mapping,key)?key: key==='first_paid'||key==='partial'||key==='same_day'?'multi':'upcoming');
}
function services(){
 const Q=quote(),el=$('gx-b2-services');
 if(!Q.trusted){el.innerHTML='<p class="gx-b2-services-note">No podemos confirmar el importe. Evita realizar un pago hasta consultar un saldo verificado.</p>';return}
 if(!Q.cargos.length){el.innerHTML='<p class="gx-b2-services-note">Todavía no tienes servicios contratados en este ejemplo.</p>';return}
 el.innerHTML=Q.cargos.map(c=>'<div class="service-item">'+
  '<span class="service-name">'+safe(c.name)+'</span>'+
  '<span class="service-price">'+(c.paid?'Liquidado':fx.money(c.total))+'</span>'+
 '</div>').join('');
}
function calendar(){
 const Q=quote(),N=fx.next(Q),list=$('gx-b2-calendar-list');
 const guard=$('gx-b2-calendar');
 guard.hidden=!Q.trusted||!Q.cargos.length;
 if(guard.hidden)return;
 $('gx-b2-next-date').textContent=N.date?'Próximo: '+fx.date(N.date):
   'Todos los servicios liquidados';
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
   mode==='single'?rows[0].name+' · '+fx.date(fx.due(rows[0])):
   'Próximo vencimiento · '+fx.date(fx.due(rows[0])))+'</p>'+
  line('Subtotal',fx.money(base))+
  (loyalty?line('Descuento de lealtad','−'+fx.money(loyalty),'discount-line'):'')+
  (commercial?line('Beneficios comerciales','−'+fx.money(commercial),'discount-line'):'')+
  (mora?line('Mora confirmada','+'+fx.money(mora),'surcharge-line'):'')+
  (abono?line('Abono ya aprobado','−'+fx.money(abono),'discount-line'):'')+
  '<div class="gx-b2-selected-final"><span>Importe seleccionado</span><strong id="gx-b2-selected-total">'+fx.money(total)+'</strong></div>'+
  (fx.total(fx.pending(Q))!==total?line('Total pendiente del período',fx.money(fx.total(fx.pending(Q)))):'');
}
function proof(){
 const Q=quote(),panel=$('gx-b2-proof'),phase=Q.proof;
 panel.hidden=!phase;
 if(!phase)return;
 const states={
  review:{eyebrow:'COMPROBANTE RECIBIDO',title:'En revisión',detail:'Ya lo recibimos. No necesitas enviarlo otra vez.',pct:56,tone:'review'},
  correction:{eyebrow:'ATENCIÓN NECESARIA',title:'Requiere corrección',detail:'Revisa la observación para continuar.',pct:56,tone:'correction'},
  approved:{eyebrow:'PAGO CONFIRMADO',title:'Pago validado',detail:'El siguiente servicio conserva su fecha.',pct:100,tone:'approved'}
 };
 const c=states[phase];
 panel.className='glass-card gx-b2-proof gx-b2-proof--'+c.tone;
 panel.innerHTML='<div class="gx-b2-proof-heading"><span class="gx-b2-proof-symbol" aria-hidden="true">'+
  (phase==='approved'?'✓':phase==='correction'?'!':'↗')+'</span>'+
  '<span class="gx-b2-proof-heading-copy"><small class="gx-b2-proof-eyebrow">'+c.eyebrow+'</small>'+
  '<strong class="gx-b2-proof-title">'+c.title+'</strong></span></div>'+
  '<div class="gx-b2-proof-progress" role="progressbar" aria-label="Progreso del comprobante" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+c.pct+'">'+
  '<span class="gx-b2-proof-progress-fill" style="--gx-b2-progress:'+c.pct+'%"></span></div>'+
  '<div class="gx-b2-proof-steps" aria-hidden="true"><span class="is-complete">Recibido</span>'+
  '<span class="'+(phase==='approved'?'is-complete':'is-active')+'">Revisión</span>'+
  '<span class="'+(phase==='approved'?'is-complete':phase==='correction'?'is-alert':'')+'">'+
  (phase==='correction'?'Corregir':'Validado')+'</span></div>'+
  '<p class="gx-b2-proof-hint">'+c.detail+'</p>';
}
function actions(){
 const Q=quote(),el=$('gx-b2-actions'),hasPending=fx.pending(Q).length>0;
 if(!Q.trusted){el.innerHTML='<p class="gx-b2-pay-explain">No hay saldo confirmado. El reporte de pago está bloqueado en este ejemplo.</p>';return}
 if(Q.proof==='review'){el.innerHTML='<p class="gx-b2-pay-explain">Comprobante en revisión. No se solicita otro depósito ni un segundo comprobante.</p>';return}
 if(!hasPending){el.innerHTML='<p class="gx-b2-pay-explain">No hay importes pendientes en este ejemplo.</p>';return}
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
 hero();services();calendar();breakdown();proof();actions();
 $('gx-b2-scenario').value=key;
}
function openDemo(){
 const Q=quote(),review=Q.proof==='correction';
 if(!Q.trusted||!fx.pending(Q).length)return;
 const dialog=$('gx-b2-demo-modal');
 lastFocus=document.activeElement;
 $('gx-b2-modal-title').textContent=review?'Comprobante con observación':'Sube tu comprobante';
 $('gx-b2-modal-desc').textContent=review
  ?'En este escenario debes corregir la evidencia antes de volver a reportarla. No se acreditó un pago.'
  :'En producción elegirías una captura y el sistema la enviaría para validación, no para acreditación automática.';
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
refresh();
window.GOXION_E1B2_INDEX=Object.freeze({isolated:true,noBackend:true,
 getScenario:()=>key,getMode:()=>mode,getSelection:()=>current(),
 next:()=>fx.next(quote())});
})();