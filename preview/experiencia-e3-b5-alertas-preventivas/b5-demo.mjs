/* E3/B5 · focused integration demo. Uses genuine approved B3/V7 companion
 * assets and existing Ayuda banner, bell, sheet CSS. Everything is fictitious,
 * in-memory and isolated. The real Admin/communications DB is never accessed.
 */
import {previewAffectedClients,revalidateBeforeDelivery} from './policy.mjs';

const $=id=>document.getElementById(id);
const services=Object.freeze([
 {id:'svc-vix',name:'ViX Premium'},
 {id:'svc-netflix',name:'Netflix Premium'},
 {id:'svc-max',name:'Max Platino'},
 {id:'svc-prime',name:'Prime Video'}
]);
const clients=[
 {id:'client-guest',name:'Visitante',status:'guest',contracts:[]},
 {id:'client-a',name:'Cliente A · ViX',status:'active',
  contracts:[{serviceId:'svc-vix',active:true}]},
 {id:'client-b',name:'Cliente B · Netflix',status:'active',
  contracts:[{serviceId:'svc-netflix',active:true}]},
 {id:'client-c',name:'Cliente C · ViX y Max',status:'active',
  contracts:[{serviceId:'svc-vix',active:true},{serviceId:'svc-max',active:true}]},
 {id:'client-d',name:'Cliente D · Suspendido',status:'suspended',
  contracts:[{serviceId:'svc-vix',active:true}]},
 {id:'client-e',name:'Cliente E · ViX cancelado',status:'active',
  contracts:[{serviceId:'svc-vix',active:false}]}
];
let chosen='client-a',incident=null,incidentNumber=0,revisionNumber=0,elapsed=0;
const deliveredKeys=new Set(),mailboxes=new Map(),gixyOnce=new Set();
const txt=(id,value)=>{const node=$(id);if(node)node.textContent=value};
const serviceName=id=>services.find(s=>s.id===id)?.name||'Servicio';
const client=()=>clients.find(x=>x.id===chosen);
const eligible=(inc,person)=>{
 if(!inc||inc.status!=='confirmed'||!person)return false;
 return previewAffectedClients({incident:inc,clients:[person]}).recipients.length>0;
};
function showBalloon(message){
 const el=$('gx-mirror-toast');if(!el)return;
 el.textContent=message;el.hidden=false;
 clearTimeout(showBalloon.timer);showBalloon.timer=setTimeout(()=>el.hidden=true,2800);
}
function noticeItem(n){
 const node=document.createElement('article');
 node.className='gx-client-notif-item'+(n.read?'':' unread');
 const top=document.createElement('div');top.className='gx-client-notif-item-top';
 const title=document.createElement('strong');
 title.textContent=n.resolved?'Incidencia resuelta · '+n.service:n.title;
 const time=document.createElement('span');time.className='gx-client-notif-time';
 time.textContent=n.read?'Leída':'Nueva';
 top.append(title,time);
 const desc=document.createElement('p');
 desc.textContent=n.resolved?'El servicio volvió al estado activo en esta simulación.':n.message;
 node.append(top,desc);
 return node;
}
function mailbox(person){return mailboxes.get(person?.id)||[]}
function renderBell(){
 const notices=mailbox(client()),unread=notices.filter(n=>!n.read);
 const count=$('gx-client-notif-badge'),bell=$('gx-client-notif-launch');
 // The B3 context guard intentionally expects '1' for a single
 // important incident. The badge is a dot, not a claim about total count.
 if(count)count.textContent=unread.length?'1':'';
 bell?.classList.toggle('gx-has-new',unread.length>0);
 bell?.setAttribute('aria-label',unread.length?'Abrir aviso técnico pendiente':'Abrir notificaciones');
 const list=$('gx-smart-notif-list');if(!list)return;
 list.replaceChildren();
 if(!notices.length){
  const empty=document.createElement('div');empty.className='gx-client-notif-empty';
  const strong=document.createElement('strong');strong.textContent='Sin notificaciones';
  const small=document.createElement('small');
  small.textContent='Esta cuenta no tiene novedades de incidencias.';
  empty.append(strong,small);list.append(empty);
 }else{
  for(const n of [...notices].reverse())list.append(noticeItem(n));
 }
}
function showBanner(){
 const banner=$('gx-b5-banner'),copy=$('gx-b5-banner-copy');
 const affected=eligible(incident,client());
 banner.hidden=!affected;
 if(affected){
  const name=incident.serviceIds.map(serviceName).join(' y ');
  copy.replaceChildren();
  const strong=document.createElement('strong');
  strong.textContent='Aviso técnico · '+name;
  const desc=document.createElement('small');
  desc.textContent=incident.description+(incident.message?' · '+incident.message:'');
  copy.append(strong,desc);
 }
}
function renderServices(){
 const root=$('dash-services');if(!root)return;
 root.replaceChildren();
 const c=client();
 if(!c||c.status!=='active'){
  const empty=document.createElement('p');empty.className='gx-mirror-muted';
  empty.textContent=c?.status==='suspended'
   ?'Cuenta suspendida ficticia · Sin avisos dirigidos.'
   :'Sin servicios activos para esta cuenta de prueba.';
  root.append(empty);return;
 }
 for(const contract of c.contracts){
  const el=document.createElement('div');el.className='gx-b5-service-state';
  const label=document.createElement('strong');label.textContent=serviceName(contract.serviceId);
  const status=document.createElement('small');
  const impacted=Boolean(contract.active&&eligible(incident,c)&&
    incident.serviceIds.includes(contract.serviceId));
  status.textContent=!contract.active?'Cancelado':impacted?'Temporalmente inactivo':'Activo';
  status.classList.toggle('is-interrupted',impacted);el.append(label,status);root.append(el);
 }
}
function render(){
 showBanner();renderBell();renderServices();
 const plan=incident?.status==='confirmed'
  ?previewAffectedClients({incident,clients,deliveredKeys:[]})
  :{recipients:[]};
 txt('gx-b5-status',incident?.status==='confirmed'
  ?'Incidencia confirmada de prueba · '+serviceName(incident.serviceIds[0])+
    ' · '+plan.recipients.length+' clientes elegibles'
  :incident?.status==='resolved'?'Incidencia resuelta · Banner oculto':'Sin incidencia activa');
 txt('gx-b5-recap', 'Avisos simulados: '+deliveredKeys.size+
   ' · Cliente seleccionado: '+(client()?.name||'')+
   ' · La versión oficial no ha sido modificada.');
 $('gx-b5-resolve').disabled=incident?.status!=='confirmed';
 const note=$('gx-b5-help');
 note.textContent='Cliente de prueba: '+(client()?.name||'');
}
function resetCompanion(){
 document.dispatchEvent(new CustomEvent('gx-b3:priority-reset',{detail:{reason:'b5-synthetic-context-change'}}));
 document.querySelectorAll('.gx-b3-goxy-cta').forEach(n=>n.remove());
}
function deliver(){
 const proposed=previewAffectedClients({incident,clients,deliveredKeys:[...deliveredKeys]});
 const valid=revalidateBeforeDelivery({
  incident,clients,plannedRecipients:proposed.recipients,deliveredKeys:[...deliveredKeys]
 });
 // The B5 policy is explicitly dry-run only: this updates only the
 // fictitious in-browser mailboxes, never official GOXION notifications.
 for(const recipient of valid.recipients){
  const key=recipient.dedupeKey;
  if(deliveredKeys.has(key))continue;
  deliveredKeys.add(key);
  const box=mailboxes.get(recipient.clientId)||[];
  const summary=recipient.serviceIds.map(serviceName).join(' y ');
  box.push({key,read:false,resolved:false,service:summary,
   title:'Aviso técnico · '+summary,
   message:incident.description+(incident.message?' · '+incident.message:'')});
  mailboxes.set(recipient.clientId,box);
 }
 const current=mailbox(client());
 const newest=current[current.length-1];
 if(newest && newest.key.startsWith('incident:'+incident.id+':'+incident.revision+':') &&
    !gixyOnce.has(newest.key) && !newest.read){
  gixyOnce.add(newest.key);
  resetCompanion();
  renderBell();
  // Genuine V7 Gixy renderer handles the visual; B5 only supplies a
  // validated fictitious contextual event, without payment labels.
  document.dispatchEvent(new CustomEvent('gx-b3:priority-delivered',{
   detail:{important:true,gixy:true,goxy:true,code:'service_incident',id:newest.key}
  }));
 }
}
function confirm(){
 const serviceId=$('gx-b5-platform').value;
 const description=$('gx-b5-type').value;
 const message=$('gx-b5-extra').value.trim().slice(0,240);
 if(!services.some(s=>s.id===serviceId))return showBalloon('Servicio de prueba inválido.');
 if(incident?.status==='confirmed'&&incident.serviceIds[0]===serviceId&&
  incident.description===description&&incident.message===message){
  showBalloon('Sin cambios: no se crea otra notificación.');return;
 }
 if(!incident||incident.status==='resolved'||incident.serviceIds[0]!==serviceId){
  incidentNumber++;revisionNumber=1;
 }else revisionNumber++;
 incident={
  id:'incident-demo-'+String(incidentNumber).padStart(3,'0'),
  revision:revisionNumber,status:'confirmed',
  confirmedBy:'admin-demo',
  confirmedAt:new Date().toISOString(),
  serviceIds:[serviceId],description,message
 };
 deliver();render();
 $('gx-b3-controls').hidden=true;
 $('gx-b3-toggle').setAttribute('aria-expanded','false');
 showBalloon('Falla confirmada SOLO en la simulación · destinatarios verificados.');
}
function resolve(){
 if(incident?.status!=='confirmed')return;
 incident={...incident,status:'resolved'};
 for(const notices of mailboxes.values()){
  for(const n of notices){
   if(n.key.startsWith('incident:'+incident.id+':'))n.resolved=true;
  }
 }
 resetCompanion();render();
 showBalloon('Incidencia resuelta en la prueba. Banner retirado.');
}
function openSheet(){
 const overlay=$('gx-smart-notif-overlay'),sheet=$('gx-smart-notif-sheet');
 if(!overlay||!sheet)return;
 // Never let the demo Admin controls sit above the native bell sheet.
 $('gx-b3-controls').hidden=true;
 $('gx-b3-toggle')?.setAttribute('aria-expanded','false');
 document.body.classList.add('gx-b5-notif-open');
 overlay.classList.add('show');overlay.setAttribute('aria-hidden','false');
 sheet.inert=false;sheet.classList.add('show');sheet.setAttribute('aria-hidden','false');
 $('gx-client-notif-launch')?.setAttribute('aria-expanded','true');
 document.documentElement.classList.add('gx-notif-open');
 for(const item of mailbox(client()))item.read=true;
 renderBell();
 $('gx-smart-notif-close')?.focus({preventScroll:true});
}
function interceptBell(e){
 e.preventDefault();e.stopImmediatePropagation();
 openSheet();
}
function init(){
 const nav=$('goxion-main-nav');
 if(!nav||!$('gx-b3-controls'))throw Error('V7 mirror missing its native controls');
 document.querySelector('#gx-b3-controls .gx-b3-buttons')?.setAttribute('hidden','');
 document.querySelector('#gx-b3-controls .gx-b3-reset')?.setAttribute('hidden','');
 const button=$('gx-b3-toggle');button.firstChild.textContent='Probar Incidencias en Admin ';
 const panel=document.createElement('div');panel.id='gx-b5-controls';
 const platformOptions=services.map(s=>'<option value="'+s.id+'">'+s.name+'</option>').join('');
 panel.innerHTML='<div class="gx-b3-heading">Admin · Incidencias 2.0 (simulación)</div>'+
  '<label>Plataforma <select id="gx-b5-platform">'+platformOptions+'</select></label>'+
  '<label>Tipo de incidencia <select id="gx-b5-type">'+
    '<option value="presenta intermitencias temporales">Intermitencias temporales</option>'+
    '<option value="está en mantenimiento programado">Mantenimiento programado</option>'+
    '<option value="experimenta una caída global">Caída global</option>'+
  '</select></label>'+
  '<label>Mensaje adicional <textarea id="gx-b5-extra" rows="2" maxlength="240" placeholder="Opcional · Solo demo"></textarea></label>'+
  '<div class="gx-b5-buttons"><button id="gx-b5-confirm" type="button">Confirmar falla</button>'+
  '<button class="gx-b5-resolve" id="gx-b5-resolve" type="button" disabled>Resolver falla</button></div>'+
  '<div class="gx-b5-status" id="gx-b5-status" role="status"></div>'+
  '<div class="gx-b5-status">No se genera ningún aviso real. Solo escenarios sintéticos.</div>';
 $('gx-b3-controls').append(panel);
 // Same existing DOM/classes as official Ayuda's #dynamic-alert.
 const banner=document.createElement('div');banner.className='glass-card alert-banner';
 banner.id='gx-b5-banner';banner.hidden=true;
 banner.innerHTML='<span class="gx-b5-banner-mark" aria-hidden="true">⚠️</span><div id="gx-b5-banner-copy"></div>';
 nav.before(banner);
 const identity=document.createElement('div');identity.className='gx-b5-account-preview';
 identity.innerHTML='<label for="gx-b5-client">Cliente en Mi Espacio · Prueba</label>'+
 '<select id="gx-b5-client" aria-label="Cambiar cliente ficticio">'+
 clients.map(c=>'<option value="'+c.id+'">'+c.name+'</option>').join('')+'</select>';
 nav.after(identity);
 const subtitle=document.querySelector('.gx-dashboard-section-subtitle');
 if(subtitle)subtitle.textContent='Estados de servicio y avisos en esta simulación.';
 const recap=document.createElement('div');recap.className='gx-b5-notif-recap';
 recap.id='gx-b5-recap';$('dash-services')?.after(recap);
 const help=document.createElement('p');help.id='gx-b5-help';
 help.className='gx-b5-example-tag';identity.before(help);
 $('gx-b5-client').value=chosen;
 $('gx-b5-client').addEventListener('change',e=>{
  resetCompanion();chosen=e.target.value;render();
 });
 $('gx-b5-confirm').addEventListener('click',confirm);
 $('gx-b5-resolve').addEventListener('click',resolve);
 // The official B3 notice module owns the bell button. For incident demo
 // we intercept its click BEFORE its fixture-only handler, and show the
 // existing sheet rather than creating a second notification surface.
 $('gx-client-notif-launch').addEventListener('click',interceptBell,true);
 const nativeSheet=$('gx-smart-notif-sheet');
 if(nativeSheet){
  new MutationObserver(()=>{
   if(!nativeSheet.classList.contains('show'))document.body.classList.remove('gx-b5-notif-open');
  }).observe(nativeSheet,{attributes:true,attributeFilter:['class']});
 }
 render();
 window.GOXION_B5_DEMO=Object.freeze({
  isolated:true,production:false,view:()=>({incident,clientId:chosen,
  notices:mailbox(client()).map(x=>({...x})),deliveries:deliveredKeys.size})
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
