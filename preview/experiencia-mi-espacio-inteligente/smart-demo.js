/* GOXION E1/B1 — Nine reproducible synthetic customer situations.
 * No network, no account identity, no local/session storage, no real actions.
 */
(()=>{
'use strict';
if(!document.documentElement.hasAttribute('data-gx-smart-beta'))return;
const $=id=>document.getElementById(id);
const now='2026-10-17';
const S=(id,name,due,cents,extra={})=>({id,name,due,cents,status:'pending',...extra});
const cases=Object.freeze({
 upcoming:{name:'Pago próximo',services:[S('a','Servicio A','2026-10-20',8900)],missions:{active:true,done:2,total:3}},
 multi:{name:'Varias fechas de pago',services:[
   S('a','Servicio A','2026-10-20',4500),S('b','Servicio B','2026-11-06',4900)],missions:{active:true,done:1,total:3}},
 review:{name:'Comprobante en revisión',services:[S('a','Servicio A','2026-10-20',7900)],
   review:{status:'pending',serviceIds:['a']},missions:{active:true,done:1,total:3}},
 correction:{name:'Comprobante con observación',services:[S('a','Servicio A','2026-10-20',7900)],
   review:{status:'correction',serviceIds:['a']},missions:{active:true,done:1,total:3}},
 overdue:{name:'Servicio vencido',services:[
   S('a','Servicio A','2026-10-16',4500),S('b','Servicio B','2026-11-06',4900)],missions:{active:true,done:2,total:3}},
 extension:{name:'Prórroga pactada',services:[S('a','Servicio A','2026-10-17',7900,
   {extension:{state:'active',agreedDate:'2026-10-21'}})],missions:{active:true,done:2,total:3}},
 mission:{name:'Misión pendiente',services:[S('a','Servicio A','2026-11-20',8900)],
   missions:{active:true,done:2,total:3}},
 clear:{name:'Todo al corriente',services:[S('a','Servicio A','2026-10-15',8900,{status:'paid'})],
   missions:{active:true,done:3,total:3}},
 new:{name:'Cliente sin servicios',services:[],missions:{active:false,done:0,total:0}}
});
let current='upcoming',toastTimer=0;
const notice=s=>{
 const el=$('gx-smart-toast');if(!el)return;
 el.textContent=s;el.hidden=false;
 clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);
};
const el=(tag,cls,text)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);
 return n;
};
const stamp=(id,text)=>{const n=$(id);if(n)n.textContent=text};
function render(key){
 if(!Object.hasOwn(cases,key))return;
 current=key;
 const state=cases[key],priority=window.GOXION_SMART_PRIORITY.evaluate(state,now);
 // One single contextual card: preserve the original billing hierarchy,
 // update the existing heading + hero + badge + account action in place.
 const billing=$('dash-billing-card');
 const onboard=$('dash-onboarding-card');
 if(onboard)onboard.hidden=priority.code!=='onboard';
 if(billing)billing.hidden=priority.code==='onboard';
 if(billing){
  billing.dataset.code=priority.code;
  billing.dataset.tone=priority.tone;
  billing.dataset.target=priority.target;
 }
 const top=priority.next;
 const headerByCode={
  correction:'COMPROBANTE CON OBSERVACIÓN',
  review:'ESTADO DE TU COMPROBANTE',
  overdue:'PAGO PENDIENTE',
  today:'VENCIMIENTO DE HOY',
  extension:'ACUERDO PACTADO',
  soon:'PRÓXIMO VENCIMIENTO',
  mission:'TU PRÓXIMA FECHA DE PAGO',
  clear:'ESTADO DE TUS SERVICIOS',
  onboard:'PRIMEROS PASOS'
 };
 stamp('gx-smart-card-heading',headerByCode[priority.code]||'ESTADO DE TU CUENTA');
 const plainHero={
  review:'En revisión',correction:'Requiere corrección',
  clear:'Al corriente',onboard:'Sin servicios'
 };
 // A financial date is never displayed as the hero of an unrelated state.
 const mainValue=Object.hasOwn(plainHero,priority.code)?plainHero[priority.code]:
  top?window.GOXION_SMART_PRIORITY.niceDate(top.date):'Sin pagos pendientes';
 stamp('dash-date',mainValue);
 const badge=$('dash-badge');
 const badgeByCode={
  correction:'Revisa tu comprobante',overdue:'Servicio con fecha vencida',
  review:'Comprobante recibido',today:'Vence hoy',
  extension:'Nueva fecha registrada',soon:'Pago próximo',
  mission:'Sin urgencia de pago',clear:'✓ Sin pagos pendientes',
  onboard:'Sin servicios'
 };
 if(badge){
  badge.textContent=badgeByCode[priority.code]||'Estado actualizado';
  badge.classList.toggle('gx-smart-badge-alert',['correction','overdue'].includes(priority.code));
 }
 const detail=$('gx-smart-card-description');
 if(detail){
  const explain=['correction','overdue','review','extension','today'].includes(priority.code);
  detail.hidden=!explain;
  detail.textContent=explain?priority.description:'';
 }
 const account=billing?.querySelector('.gx-account-capsule-label');
 if(account)account.textContent=
  ['review','correction'].includes(priority.code)?'Consultar comprobante':
  priority.code==='clear'?'Ver estado de cuenta':
  top?'Próximo pago · '+top.amount:'Ver Estado de Cuenta';
 if(billing){
  const capsule=billing.querySelector('.gx-account-capsule');
  if(capsule)capsule.setAttribute('aria-label',
    ['review','correction'].includes(priority.code)?'Consultar estado del comprobante':'Ver Estado de Cuenta');
 }
 stamp('loyalty-count','3/4 Pagos');
 const bar=$('loyalty-bar');if(bar)bar.style.width='75%';
 stamp('loyalty-msg','A un pago puntual del siguiente nivel. (Simulación)');
 const m=state.missions||{active:false,done:0,total:0};
 const ref=$('referral-section-container');
 if(ref){
   ref.replaceChildren();
   if(m.active){
    const mission=el('div','gx-smart-mission');
    mission.id='gx-smart-mission-card';
    const label=el('span','gx-smart-mission__eyebrow','MISIONES GOXION');
    const title=el('strong','',m.done>=m.total?'¡Completaste tus misiones!':'Tu progreso');
    const detail=el('span','gx-smart-mission__counter',m.done+' de '+m.total+' completadas');
    const progress=el('div','gx-smart-mission__progress');
    const fill=el('span');fill.style.width=(100*m.done/m.total)+'%';progress.append(fill);
    mission.append(label,title,detail,progress);
    ref.append(mission);
   }
 }
 const schedule=billing?.querySelector('.gx-smart-schedule')||el('div','gx-smart-schedule');
 schedule.replaceChildren();
 if(billing&&!schedule.isConnected)billing.append(schedule);
 const wantsRows=priority.schedule.length>1||priority.code==='extension';
 schedule.hidden=!wantsRows;
 if(wantsRows){
   schedule.append(el('div','gx-smart-schedule__title','CALENDARIO DE EJEMPLO'));
   priority.schedule.forEach(r=>{
     const row=el('div','gx-smart-schedule__row');
     const name=el('span','',r.name+(r.extended?' · Pactado':'')+(r.reviewing?' · En revisión':''));
     const value=el('strong','',window.GOXION_SMART_PRIORITY.niceDate(r.date)+' · '+r.amount);
     row.append(name,value);schedule.append(row);
   });
 }
 const services=$('dash-services');if(services){
  services.replaceChildren();
  const list=el('div','gx-smart-services');
  const entries=state.services;
  if(!entries.length)list.append(el('p','','No hay servicios contratados en este ejemplo.'));
  entries.forEach(s=>{
   const line=el('div','gx-smart-services__row');
   const name=el('strong','',s.name);
   const label=el('span','',s.status==='paid'?'Al corriente':'Ejemplo · '+window.GOXION_SMART_PRIORITY.niceDate(
      s.extension?.state==='active'?s.extension.agreedDate:s.due));
   line.append(name,label);list.append(line);
  });
  services.append(list);
 }
 const hist=$('dash-history');
 if(hist){hist.replaceChildren(el('p','gx-smart-history-note','El historial real no se consulta ni se modifica en esta beta.'));}
 const payAlert=$('dash-payment-review-alert');if(payAlert)payAlert.replaceChildren();
 document.documentElement.dataset.gxSmartCase=key;
 document.dispatchEvent(new CustomEvent('gx-smart-case-rendered',{detail:{scenario:key,code:priority.code}}));
}
$('gx-smart-scenario')?.addEventListener('change',event=>render(event.target.value));
document.querySelectorAll('#goxion-main-nav .tab-btn').forEach(btn=>{
 btn.classList.toggle('active',btn.id==='btn-tab-inicio');
 btn.addEventListener('click',()=>notice('Navegación de ejemplo: esta beta muestra solo Mi Espacio.'));
});
$('btn-tab-inicio')?.setAttribute('aria-current','page');
$('dash-billing-card')?.querySelector('.gx-account-capsule')?.addEventListener('click',()=>
 notice(['review','correction'].includes(window.GOXION_SMART_BETA.getPriority().code)?
 'El comprobante es ficticio. En producción consultarías su estado sin duplicar el pago.':
 'No existe ningún pago ni consulta financiera en esta beta.'));
$('dash-onboarding-card')?.querySelector('button')?.addEventListener('click',()=>
 notice('Catálogo deshabilitado en el laboratorio.'));
$('view-dashboard')?.classList.add('active');
window.GOXION_SMART_BETA=Object.freeze({source:'ayuda.html',isolated:true,noBackend:true,
 getScenario:()=>current,getPriority:()=>window.GOXION_SMART_PRIORITY.evaluate(cases[current],now)});
render(current);
})();
