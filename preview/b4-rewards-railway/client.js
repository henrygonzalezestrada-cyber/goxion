/* GOXION B4 Railway · real interface, fictional state machine.
 * Reuses the V7 DOM/Gixys unchanged; financial actions run in isolated API.
 */
(()=>{
'use strict';
if(!document.documentElement.hasAttribute('data-gx-b3'))return;
const $=id=>document.getElementById(id);
const peso=n=>'$'+(n/100).toLocaleString('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let state=null,op=false,heartCelebrated=false,panelReady=false,lastReward=false;
const api=async(type,data={})=>{
 const response=await fetch('/api/b4/'+(type?'action':'state'),{
  method:type?'POST':'GET',credentials:'same-origin',
  headers:type?{'content-type':'application/json'}:{},
  body:type?JSON.stringify({type,...data}):undefined});
 const json=await response.json();
 if(!json.ok)throw Error(json.error||'La beta no respondió');
 return json.state;
};
const toast=message=>{
 const el=$('gx-mirror-toast');if(!el)return;
 el.textContent=message;el.hidden=false;
 clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,3500);
};
const up=(name,value)=>{const e=$(name);if(e)e.innerHTML=value};
const moneyLine=(label,value,color='')=>'<div class="gx-b4-price-line"><span>'+esc(label)+'</span><strong'+(color?' class="'+color+'"':'')+'>'+esc(value)+'</strong></div>';
function receipt(q){
 const specials=q.items.map(s=>'<div class="gx-b4-service"><div><strong>'+esc(s.name)+'</strong><small>'+
  (s.eligible?'Elegible para 5% secreto':s.type==='full'?'Cuenta completa · excluida':'Promoción vigente · excluida')+
  '</small></div><span>'+peso(s.price)+'</span></div>').join('');
 const has=q.secret>0;
 return '<div class="gx-b4-receipt-head"><span>Desglose del período</span><strong>'+esc(q.label)+'</strong></div>'+
 specials+'<div class="gx-b4-summary">'+
 moneyLine('Subtotal',peso(q.original))+
 (q.loyalty?moneyLine('Lealtad '+q.loyaltyLevel+'%', '-'+peso(q.loyalty),'gx-b4-green'):'')+
 (q.mission?moneyLine('Cupón de Misiones','-'+peso(q.mission),'gx-b4-green'):'')+
 (q.personal?moneyLine('Descuento especial','-'+peso(q.personal),'gx-b4-green'):'')+
 (has?moneyLine('Cupón secreto Gixys 5%','-'+peso(q.secret),'gx-b4-cyan'):'')+
 '<div class="gx-b4-price-line gx-b4-total"><span>Total del período</span><strong>'+peso(q.total)+'</strong></div></div>'+
 '<p class="gx-b4-foot">Importes ficticios calculados por la API de pruebas. No son saldos ni cotizaciones oficiales.</p>';
}
function render(){
 if(!state)return;
 const q=state.quote,nowPaid=q.paid,c=state.coupon;
 document.body.dataset.gxB4='true';
 const amount=peso(q.total);
 const date=$('dash-date');if(date)date.textContent=q.label[0].toUpperCase()+q.label.slice(1);
 up('dash-badge','<span class="time-badge '+(nowPaid?'badge-ok':'badge-danger')+'">'+
  (nowPaid?'Pagado en esta simulación':amount+' · Pendiente de prueba')+'</span>');
 up('gx-b4-services-title','Tus servicios · Simulación');
 const services=$('dash-services');
 if(services)services.innerHTML='<div class="gx-b4-services">'+q.items.map(s=>
 '<div class="gx-b4-service"><div><strong>'+esc(s.name)+'</strong><small>'+(
 s.eligible?'Perfil individual · Acepta el cupón 5%':
 s.type==='full'?'Cuenta completa · Sin cupón 5%':'Promoción vigente · Sin cupón 5%')+
 '</small></div><span>'+peso(s.price)+'</span></div>').join('')+'</div>';
 const count=$('loyalty-count'),bar=$('loyalty-bar'),msg=$('loyalty-msg');
 if(count)count.textContent=state.streak>=9?'9/9 Pagos':state.streak>=4?'4/4 Pagos':'3/4 Pagos';
 if(bar)bar.style.width=state.streak>=4?'100%':'75%';
 if(msg)msg.textContent=state.streak>=9?'Nivel 2 · 6% disponible':
   state.streak>=4?'Nivel 1 · 3% por pagos puntuales':'A un pago puntual del Nivel 1';
 up('dash-history',state.history.length?'<div class="gx-b4-history">'+state.history.slice().reverse().map(h=>
 '<div class="gx-b4-price-line"><span>'+esc(h.period)+' · Aprobado de prueba'+
 (h.secret?' · Premio Gixys':'')+'</span><strong>'+peso(h.total)+'</strong></div>').join('')+'</div>':
 '<p class="gx-mirror-muted">Aún no hay pagos registrados en esta simulación.</p>');
 const stats=c?(c.status==='reserved'
   ?'Cupón Gixys 5% reservado para '+esc(state.nextQuote.period===c.startPeriod?state.nextQuote.label:q.label)+'.'
   :'Cupón Gixys utilizado en '+esc(state.history.find(x=>x.secret)?.period||'un período')+'.'):
  'Descubre a los tres Gixys para encontrar el 5% secreto.';
 const welcome=$('gx-b4-account');
 if(welcome)welcome.innerHTML='<div class="gx-b4-kicker">Mi estado de cuenta · Espejo funcional</div>'+
  '<div class="gx-b4-price-line"><span>Saldo simulado de este período</span><strong>'+amount+'</strong></div>'+
  '<p>'+esc(stats)+' </p><p class="gx-b4-foot">No se accede a cuentas ni pagos reales.</p>'+
  '<button type="button" class="gx-b4-primary" data-b4-action="statement">Ver estado de cuenta simulado</button>';
 const pane=$('gx-b4-account-sheet');
 if(pane&&!pane.hidden)up('gx-b4-account-lines',receipt(q));
 const progress=$('gx-b4-progress');
 if(progress)progress.textContent='Secreto de Gixys: '+state.touched.length+'/3'+
  (c?' · '+(c.status==='used'?'Usado':'Guardado'):' · Sin emitir');
 for(const b of document.querySelectorAll('[data-b4-action]')){
  const action=b.dataset.b4Action;
  if(action==='milestone')b.disabled=state.events.loyalty;
  if(action==='mission')b.disabled=state.events.mission;
  if(action==='notification')b.disabled=state.events.notification;
  if(action==='pay')b.disabled=nowPaid;
  if(action==='next')b.disabled=!nowPaid||state.period>=5;
  if(action==='promo')b.textContent=state.netflixPromo?'Quitar promoción de Netflix':'Probar promoción en Netflix';
 }
 const paymentButton=$('gx-b4-payment-in-statement');if(paymentButton)paymentButton.disabled=nowPaid;
 const cap=$('gx-b4-coupon-summary');if(cap)cap.textContent=stats;
 const missionStat=$('gx-mirror-mission-status');
 if(missionStat&&state.events.mission)missionStat.textContent='Cupón de Misiones disponible · Prueba';
}
async function operation(type,data={}){
 if(op)return null;op=true;
 try{const before=state;state=await api(type,data);
  render();
  return {before,after:state};
 }catch(e){toast(e.message);return null}
 finally{op=false}
}
function celebrateLoyalty(){
 if(heartCelebrated)return;
 heartCelebrated=true;
 // The approved PulseHeart is activated only after a server-acknowledged
 // fictional payment milestone; user touches are disabled in this mirror.
 const target=$('gx-mirror-heart')?.querySelector('.pulse-heart');
 if(target){
   target.click(); // original V9 animation and original B3 event flow
   // B3's test label is restored immediately from server state.
   setTimeout(render,90);
 }else{
   document.dispatchEvent(new CustomEvent('gx-mirror:loyalty',{detail:{active:true,source:'b4-server-fixture'}}));
 }
}
function showAccount(){
 const e=$('gx-b4-account-sheet');if(!e)return;
 e.hidden=false;document.body.classList.add('gx-b4-sheet-open');
 render();
}
function closeAccount(){
 const e=$('gx-b4-account-sheet');if(e)e.hidden=true;
 document.body.classList.remove('gx-b4-sheet-open');
}
function catalogue(show){
 const dash=$('view-dashboard'),catalog=$('gx-b4-catalogue');
 if(!dash||!catalog)return;
 dash.style.display=show?'none':'block';catalog.hidden=!show;
 document.querySelectorAll('#goxion-main-nav .tab-btn').forEach(b=>{
  b.classList.toggle('active',b.id===(show?'btn-tab-catalogo':'btn-tab-inicio'));
 });
 window.scrollTo({top:0,behavior:'instant'});
}
function adjustRewardOverlay(){
 const award=document.querySelector('.gx-gixys-secret--v9');
 if(!award)return;
 const small=award.querySelector('.gx-gixys-secret__award small');
 const info=award.querySelector('p');
 const btn=award.querySelector('button');
 if(small)small.textContent='Solo en este espejo de pruebas';
 if(info&&state){
  const c=state.coupon;
  info.textContent=c?'¡Encontraste a los tres! Tu cupón de prueba está '+(c.status==='reserved'
   ?'guardado para un período elegible.':'utilizado en un período simulado.') :
   '¡Encontraste a los tres! GOXION está verificando tu cupón de prueba...';
 }
 if(btn)btn.setAttribute('aria-label','Cerrar premio del espejo');
}
async function doAction(action){
 if(action==='statement'){showAccount();return}
 if(action==='close-statement'){closeAccount();return}
 if(action==='home'){catalogue(false);return}
 if(action==='notification'){
  const result=await operation('notification');
  if(result){
   const ok=window.GOXION_B3_PRIORITY?.replay('overdue');
   if(!ok)toast('Notificación registrada. Para repetir la animación, reinicia la prueba.');
  }
 }else if(action==='milestone'){
  const result=await operation('milestone');
  if(result&&result.after.events.loyalty&&!result.before.events.loyalty){
   celebrateLoyalty();
   toast('Pago anterior confirmado de prueba: alcanzaste lealtad Nivel 1.');
  }
 }else if(action==='mission'){
  const result=await operation('mission');
  if(result){
   const card=$('gx-mirror-mission-card');
   if(card&&!$ ('gx-mirror-complete-btn')?.disabled)card.click();
   setTimeout(()=>{
    const target=$('gamif-expanded-coupon');
    if(target)target.scrollIntoView({behavior:'instant',block:'center'});
    const button=$('gx-mirror-complete-btn');
    if(button&&!button.disabled)button.click();
   },650);
  }
 }else if(action==='pay'){
  const previous=state?.streak||0;
  const result=await operation('pay');
  if(result){
   if(result.after.streak>=4&&previous<4&&!heartCelebrated)celebrateLoyalty();
   toast('Pago de ejemplo confirmado. No se movió dinero real.');
   closeAccount();
  }
 }else if(action==='next'){
  const result=await operation('next');
  if(result){
   catalogue(false);toast('Siguiente período de prueba disponible.');
  }
 }else if(action==='promo'){
  const result=await operation('promo',{active:!state.netflixPromo});
  if(result)toast('Actualizada la elegibilidad promocional en la simulación.');
 }else if(action==='reset'){
  if(!window.confirm('¿Reiniciar solo tu expediente ficticio de Railway?'))return;
  const result=await operation('reset');
  if(result)location.reload();
 }
}
function boot(){
 if(panelReady||!state)return;
 panelReady=true;
 $('gx-b3-lab')?.setAttribute('data-b4-mode','true');
 const lab=$('gx-b3-toggle');
 if(lab)lab.innerHTML='Simular mi cuenta <span aria-hidden="true">⌄</span>';
 const controls=$('gx-b3-controls');
 if(controls){
  const old=controls.querySelector('.gx-b3-buttons'),reset=controls.querySelector('.gx-b3-reset'),desc=controls.querySelector('p');
  if(old)old.hidden=true;if(reset)reset.hidden=true;
  if(desc)desc.textContent='Entorno funcional aislado. Recompensas, períodos y pagos ficticios.';
  const content=document.createElement('div');
  content.id='gx-b4-controls';
  content.innerHTML='<div class="gx-b4-group">Explora los tres Gixys</div>'+
   '<button data-b4-action="notification" type="button">1 · Recibir aviso prioritario</button>'+
   '<button data-b4-action="milestone" type="button">2 · Confirmar hito de lealtad</button>'+
   '<button data-b4-action="mission" type="button">3 · Completar una misión</button>'+
   '<div id="gx-b4-progress" class="gx-b4-progress">Secreto de Gixys: 0/3</div>'+
   '<div class="gx-b4-group">Prueba el cobro y las exclusiones</div>'+
   '<button data-b4-action="pay" type="button">Confirmar pago del período</button>'+
   '<button data-b4-action="next" type="button">Avanzar al siguiente período</button>'+
   '<button data-b4-action="promo" type="button">Probar promoción en Netflix</button>'+
   '<button data-b4-action="statement" type="button">Ver estado de cuenta</button>'+
   '<button data-b4-action="reset" type="button" class="gx-b4-muted">Reiniciar datos de demostración</button>';
  controls.append(content);
 }
 const account=document.createElement('section');account.id='gx-b4-account';
 account.className='glass-card gx-b4-account';
 const target=$('dash-billing-card');target?.insertAdjacentElement('afterend',account);
 const sheet=document.createElement('section');sheet.id='gx-b4-account-sheet';
 sheet.className='gx-b4-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');
 sheet.setAttribute('aria-label','Estado de cuenta de demostración');sheet.setAttribute('aria-modal','true');
 sheet.innerHTML='<div class="gx-b4-sheet-overlay" data-b4-action="close-statement"></div>'+
 '<div class="gx-b4-sheet-body"><header><strong>Estado de cuenta · Prueba</strong>'+
 '<button type="button" data-b4-action="close-statement" aria-label="Cerrar estado de cuenta">×</button></header>'+
 '<div id="gx-b4-account-lines"></div>'+
 '<p id="gx-b4-coupon-summary" class="gx-b4-note"></p>'+
 '<button id="gx-b4-payment-in-statement" class="gx-b4-primary" data-b4-action="pay" type="button">Confirmar pago simulado</button></div>';
 document.body.append(sheet);
 const catalog=document.createElement('section');
 catalog.id='gx-b4-catalogue';catalog.className='gx-b4-catalogue';catalog.hidden=true;
 const container=$('gx-mirror-container');
 container?.append(catalog);
 catalog.innerHTML='<div class="gx-b4-catalogue-head"><h2>Catálogo · Simulación</h2><p>Vista de servicios elegibles y promociones. No realiza contrataciones reales.</p></div>'+
 '<div class="gx-b4-services">'+state.quote.items.map(s=>'<div class="gx-b4-service"><div><strong>'+esc(s.name)+
 '</strong><small>'+(s.type==='profile'?'Perfil individual':'Oferta o cuenta completa')+
 '</small></div><span>'+peso(s.price)+'</span></div>').join('')+'</div>'+
 '<button data-b4-action="home" type="button" class="gx-b4-primary">Volver a Mi Espacio</button>';
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-b4-action]');
  if(!b)return;
  e.preventDefault();e.stopPropagation();void doAction(b.dataset.b4Action);
 },true);
 $('btn-tab-catalogo')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();catalogue(true)},true);
 $('btn-tab-inicio')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();catalogue(false)},true);
 document.querySelector('.gx-account-capsule')?.addEventListener('click',e=>{
  e.preventDefault();e.stopImmediatePropagation();showAccount();
 },true);
 // A client tap cannot fake a loyalty achievement: only a server action
 // may programmatically trigger the original heart celebration.
 $('gx-mirror-heart')?.addEventListener('click',e=>{
  if(!heartCelebrated){e.preventDefault();e.stopImmediatePropagation();}
 },true);
 // Original Gixy touch event fires after a contextual appearance.
 document.addEventListener('gx-b3:gixy-engaged',async e=>{
  const kind=e.detail?.kind;
  if(!['notification','loyalty','mission'].includes(kind))return;
  const old=state;
  const result=await operation('touch',{kind});
  if(result&&(!old.coupon&&result.after.coupon)){
   lastReward=true;
   toast('¡Premio 5% desbloqueado y guardado en tu cuenta de prueba!');
   adjustRewardOverlay();
  }
 });
 const rewardObserver=new MutationObserver(()=>{if(document.querySelector('.gx-gixys-secret--v9'))adjustRewardOverlay()});
 rewardObserver.observe(document.body,{subtree:true,childList:true});
 render();
}
async function main(){
 try{
  // Wait for the original approved mirror to mount — do not replace its
  // plastic Gixy renderer, Goxy handoff or notification animation.
  state=await api();
  if(window.GOXION_GIXYS_MIRROR)boot();
  else document.addEventListener('gx-mirror-ready',boot,{once:true});
  // Avoid re-showing reward or playing heart on reload: state only renders.
 }catch(e){console.error('B4 Railway mirror',e);toast('La API de demostración no respondió.')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',main);
else main();
window.GOXION_B4_MIRROR={getState:()=>state,refresh:async()=>{state=await api();render();return state},
 testOnly:true,serverOwned:true,production:false};
})();