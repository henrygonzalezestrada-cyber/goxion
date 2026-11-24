/* GOXION Mi Espacio V2 · única interfaz: componentes del laboratorio, estados reales.
   Prototipo conectado en rama de integración; no reemplaza ayuda.html. */
(function(){
'use strict';
const data=window.GOXION_V2_DATA;
if(!data)return;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const reduced=()=>data.motionReduced();
let benefitRevision=0;
const state={view:null,prices:[],savings:null,notificationItems:[],tab:'space',lastState:'',activeFilter:'all',showAllHistory:false,openHistory:null,refreshing:false,openService:null,serviceDigest:''};
// El espejo candidato usa los controladores autenticados reales; QA conserva su aislamiento.
// El backend valida identidad, permisos, importes y estados. No hay mutaciones al montar.
const ENABLE_WRITES=(window.GOXION_QA_ISOLATED===true&&location.pathname.endsWith('/ayuda-aceptacion-v2.html')&&window.GOXION_CORE?.SUPABASE_ORIGIN==='https://nsvybyvvdpdgbgtvydfb.supabase.co')||(!window.GOXION_QA_ISOLATED&&/\/(ayuda-espejo-feed-v2|ayuda)\.html$/.test(location.pathname)&&window.GOXION_CORE?.SUPABASE_ORIGIN==='https://hmpevcwodcgbkviarfic.supabase.co');
const spinner={hidden:true},shell=$('gxi-shell'),loading={hidden:true};
let iconHandle=null;
function firstName(){return String(state.view?.cliente?.nombre||'Cliente').trim().split(/\s+/)[0]||'Cliente'}
const TOKEN=data.takeToken;
let loadingOfficial=false;
async function load(){
 if(loadingOfficial||!TOKEN())return;
 const identity=typeof getCurrentClientKey==='function'?getCurrentClientKey():window.goxionCurrentClientKey;
 if(!identity)return;
 loadingOfficial=true;
 const tokenAtStart=TOKEN();
 try{
  const view=await data.load();
  if(!view||!TOKEN()||TOKEN()!==tokenAtStart)return;
  await showClient(view);
 }catch(e){
  if(TOKEN()===tokenAtStart){
   window.dispatchEvent(new CustomEvent('goxion:v2-feed:error',{detail:{message:'No se pudo sincronizar tu información. Puedes reintentar sin cerrar sesión.'}}));
   console.warn('GOXION: el nuevo feed no pudo sincronizarse',e);
  }
 }finally{loadingOfficial=false}
}
async function showClient(view){
 benefitRevision++;
 state.view=view;
 state.lastState='';
 state.activeFilter='all';
 state.showAllHistory=false;
 state.openHistory=null;
 state.openService=null;state.serviceDigest='';
  savingSeen=false;savingSignature='';savingCurrent=0;savingTarget=0;stopSavingsMotion();
 window.GOXION_V2_RESET_BENEFITS?.();
 state.notificationItems=[];
 window.GOXION_V2_CLIENT_ID=String(view.cliente.id||'');
 window.dispatchEvent(new CustomEvent('goxion:client-space:updated',{detail:{scope:'client_state'}}));
 spinner.hidden=true;loading.hidden=true;shell.hidden=false;
 $('gxi-account-name').textContent=String(view.cliente.nombre||'Mi Espacio')+' · Mi Espacio';
 renderClient();
 state.tab='space';
 window.dispatchEvent(new CustomEvent('goxion:v2-feed:rendered',{detail:{clientId:String(view.cliente.id||'')}}));
 void loadPrices();
 void window.GOXION_V2_NOTIFICATIONS?.refresh();
}
function heroState(view){
 const c=view.cliente,review=clean(c.pago_revision_estado),st=clean(c.estado),account=view.estado_cuenta||{};
 const accountStatus=clean(account.estado||''),b2=view.finanzas_b2?.modo==='b2_multifecha'?view.finanzas_b2.calendario_financiero:null;
 const dateText=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||''))?String(x).slice(8,10)+'/'+String(x).slice(5,7):'';
 const effective=x=>x.prorroga_estado==='aprobada'&&x.fecha_pactada&&Number(x.mora_centavos||0)<=0?x.fecha_pactada:x.vence;
 const pending=b2?.cobrable===true&&Array.isArray(b2.cargos)?b2.cargos.filter(x=>x.pagado!==true&&Number(x.total_centavos)>0&&dateText(effective(x))).sort((a,b)=>effective(a).localeCompare(effective(b))):null;
 const next=pending?.[0],serverDay=String(account.fecha_calculo||''),date=next?effective(next):account.fecha_pactada||account.fecha_corte;
 const when=dateText(date)?'Fecha de pago · '+dateText(date):'Consulta tu estado de cuenta';
 const fresh=clean(c.origen_cliente)==='goxion'&&c.promo_nuevo_elegible===true&&Boolean(String(c.usuario_acceso||'').trim())&&!(view.servicios||[]).length&&!(view.pagos||[]).length;
 if(fresh)return ['new','Tu espacio está listo','Explora tu primer servicio','calm','spark'];
 if(review.includes('rechaz'))return ['correction','Tu comprobante necesita atención','Revisa la observación','attention','alert'];
 if(review.includes('incomplet'))return ['incomplete','Hay un pago incompleto','Revisa el importe faltante','attention','alert'];
 if(st.includes('suspend'))return ['suspended','Tu servicio está suspendido','Consulta tu situación','attention','alert'];
 if(c.pago_en_revision===true||review.includes('revision')||account.pago_en_revision===true||b2?.comprobante_en_revision===true)return ['review','Estamos revisando tu comprobante','Ya lo recibimos','review','clock'];
 if(view.finanzas_b2?.modo==='b2_sin_estado_cobrable')return ['incomplete','Tu calendario necesita revisión','Consulta tu estado de cuenta','attention','alert'];
 if(next){
  if(Number(next.mora_centavos||0)>0||(serverDay&&effective(next)<serverDay))return ['overdue','Tienes un pago vencido',when,'attention','clock'];
  if(next.prorroga_estado==='aprobada'&&next.fecha_pactada)return ['extension','Tu nueva fecha está registrada',when,'agreement','calendar'];
 }else if(!b2){
  const agreement=account.acuerdo_cobro;
  const activeAgreement=account.prorroga_confirmada===true||agreement?.activo===true||(['activo','aprobado','aprobada','vigente'].includes(clean(agreement?.estado))&&!!account.fecha_pactada);
  if(activeAgreement&&!accountStatus.includes('vencid')&&!accountStatus.includes('incumpl')&&(!serverDay||!account.fecha_pactada||account.fecha_pactada>=serverDay))return ['extension','Tu nueva fecha está registrada',when,'agreement','calendar'];
  if(st.includes('vencid')||accountStatus.includes('vencid')||accountStatus.includes('incumpl'))return ['overdue','Tienes un pago vencido',when,'attention','clock'];
 }
 
 if((view.servicios||[]).some(x=>['solicitada','aprobada'].includes(clean(x.cancelacion?.estado))))return ['cancellation','Tu cancelación está en proceso','Consulta el seguimiento','review','layers'];
 if((pending&&pending.length===0)||(!b2&&(account.esta_pagado_periodo===true||st==='pagado')))return ['clear','Todo al corriente',dateText(account.fecha_corte)?when:'Fecha de pago principal · día '+(Number(c.dia_pago)||15),'calm','check'];
 return ['soon','Revisa tu próximo pago',dateText(date)?when:'Fecha principal · día '+(Number(c.dia_pago)||15),'due','calendar'];
}
const paths={alert:'M12 2 22 20H2L12 2z',clock:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',check:'M4 12l5 5L20 6',calendar:'M5 3v4M19 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2',layers:'M12 3 21 8 12 13 3 8 12 3z',spark:'M12 2v20M2 12h20M5 5l14 14M19 5 5 19'};
let greetingTimer=0;
function greeting(name,phrase){
 const h=$('greeting'),line=h.querySelector('.greeting-line');line.replaceChildren();
 // Texto real del cliente: misma animación por palabras que el laboratorio.
 for(const part of phrase.split(/(\s+)/)){
  if(!part)continue;if(!part.trim()){line.append(document.createTextNode(part));continue}
  const span=document.createElement('span');span.className='word';span.textContent=part;
  if(part===name)span.classList.add('name');line.append(span);
  if(!reduced()&&span.animate)span.animate([{transform:'translateY(70%)',filter:'blur(9px)',opacity:0},{transform:'translateY(0)',filter:'blur(0)',opacity:1}],{duration:640,delay:Math.min(line.childElementCount*50,310),easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 }
 h.setAttribute('aria-label',phrase);
}
function updateGreeting(name,code){
 clearInterval(greetingTimer);greetingTimer=0;
 const urgent=['correction','incomplete','suspended','overdue','review'].includes(code);
 const phrases=['Hola, '+name,'Qué gusto, '+name,'Bienvenido, '+name];
 let i=0;greeting(name,phrases[0]);
 if(urgent||reduced())return;
 greetingTimer=setInterval(()=>{
  if(document.hidden||state.lastState!==code||!state.view||!document.body.classList.contains('gx-v2-private-visible'))return;
  i=(i+1)%phrases.length;greeting(name,phrases[i]);
 },13000);
}
function renderHero(){
 const s=heroState(state.view),prev=state.lastState;state.lastState=s[0];
 const card=$('focus');card.dataset.state=s[0];card.dataset.tone=s[3];
 const title=$('focus-title');if(title.textContent!==s[1]){
  title.textContent=s[1];
  if(!reduced()&&title.animate)title.animate([{opacity:0,filter:'blur(10px)',transform:'translateY(20px)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)'}],{duration:560,easing:'cubic-bezier(.18,.85,.2,1)'});
 }
 $('focus-meta').textContent=s[2];$('focus-action').textContent=s[0]==='new'?'Ver catálogo':s[0]==='cancellation'?'Ver seguimiento':'Ver mi cuenta';$('focus-action').setAttribute('aria-label',s[0]==='new'?'Abrir catálogo oficial':s[0]==='cancellation'?'Consultar la solicitud de cancelación':'Abrir mi estado de cuenta oficial');
 const icon=$('focus-icon');icon.dataset.icon=s[4];
 const path=$('state-path'),shape=paths[s[4]]||paths.check;
 if(prev!==s[0]||path.getAttribute('d')!==shape){if(iconHandle){try{iconHandle.morphTo(shape,'smooth')}catch(_){path.setAttribute('d',shape)}}else path.setAttribute('d',shape);}
 if(prev!==s[0]&&!reduced()){icon.classList.remove('gx-focus-once');void icon.offsetWidth;icon.classList.add('gx-focus-once')}
 if(!prev||prev!==s[0])updateGreeting(firstName(),s[0]);
 const c=state.view.cliente,account=state.view.estado_cuenta;
 $('gxi-account-info').textContent=account?.publicable===true && Number.isFinite(Number(account.total_actual))
 ?'Importe confirmado por GOXION: '+data.money(account.total_actual)+'. Fecha principal de pago: día '+(Number(c.dia_pago)||15)+'.'
 :'Consulta tus movimientos registrados. Cuando el estado de cuenta esté conciliado, GOXION confirmará los importes y fechas de pago.';
 card.setAttribute('aria-label',s[1]+'. '+s[2]+'. Estado informativo; utiliza el botón para consultar.');
}
$('focus-action').addEventListener('click',event=>{
 event.stopPropagation();
 if(state.lastState==='new'){navigate('catalog');return}
 if(state.lastState==='cancellation'){
  const s=state.view?.servicios?.find(x=>['solicitada','aprobada'].includes(clean(x.cancelacion?.estado)));
  const tile=[...$('gxs-list').querySelectorAll('.gxs-card')].find(el=>el.dataset.service===String(s?.id));
  if(tile){if(!tile.classList.contains('is-open'))tile.querySelector('.gxs-trigger').click();const options=tile.querySelector('.gxs-more');if(options.hidden)tile.querySelector('[data-gxi-action="options"]').click();const panel=tile.querySelector('.gxs-cancel-panel');if(panel.hidden)tile.querySelector('[data-gxi-action="cancel"]').click();tile.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});return}
 }
 // Reutiliza la ruta original hacia index.html o B2 multifecha.
 if(typeof window.irAlTicket==='function'){window.irAlTicket();return}
 const toast=$('gxn-toast');
 toast.textContent='No pudimos abrir el estado de cuenta. Inténtalo nuevamente.';
 toast.hidden=false;
 window.setTimeout(()=>{toast.hidden=true},3700);
});
function missionInfo(view){
 const g=view.gamificacion||{};
 const tasks=String(g.tareas||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const version=Number(g.misiones_version||1);
 const doneSet=new Set((view.misiones_progreso||[]).filter(x=>x.misiones_version==null||Number(x.misiones_version)===version).map(x=>Number(x.mision_index)));
 const done=tasks.filter((x,i)=>doneSet.has(i)).length;
 const claimed=Number(g.cupon_reclamado_ciclo||0)>=Math.max(1,Number(g.cupon_ciclo||1))||g.cupon_reclamado===true;
 return {tasks,doneSet,done,total:tasks.length,ready:tasks.length>0&&done>=tasks.length,claimed,discount:Number(g.descuento||0)};
}
function benefitState(key){
 const v=state.view,c=v.cliente,mi=missionInfo(v),ref=v.referidos?.[0]||null;
 const effective=v.estado_cuenta?.lealtad?.pagos_efectivos;
 const verified=effective!=null&&Number.isFinite(Number(effective));
 const streak=verified?Math.max(0,Number(effective)):0;
 const lost=v.finanzas_b2?.calendario_financiero?.lealtad_global_perdida===true||v.estado_cuenta?.lealtad?.racha_reiniciada_virtual===true||c.racha_reiniciada_virtual===true||v.gamificacion?.racha_reiniciada_virtual===true||(streak===0&&v.pagos?.some((p,i)=>i===0&&clean(p.lealtad_efecto)==='reinicio'));
 if(key==='loyalty'){
  if(!verified&&!lost)return {label:'Lealtad',num:'—',unit:'por verificar',pct:0,meter:false,emoji:'⭐',title:'Verificando tu racha',accent:'racha',copy:'No pudimos consultar tu avance efectivo. Se sincronizará al recuperar la conexión.',note:'Solo mostramos pagos efectivos confirmados por el motor financiero.',progress:'Pendiente de sincronización',action:'Mis niveles',phase:'unknown'};
  const effectiveStreak=lost?0:streak;
  const target=effectiveStreak<4?4:9,shown=Math.min(effectiveStreak,target);
  return {label:'Lealtad',num:shown+'/'+target,unit:'pagos seguidos',pct:100*shown/target,meter:true,emoji:lost?'💔':'⭐',
   title:lost?'Tu racha se reinició':'Tu constancia crece',accent:lost?'reinició':'crece',
   copy:lost?'Puedes volver a acumular pagos puntuales para recuperar tu avance.':'Tu constancia se acredita con los pagos confirmados.',
   note:'La racha y sus niveles dependen del estado oficial de lealtad.',progress:shown+' de '+target+' pagos',action:'Mis niveles',phase:lost?'lost':'active'};
 }
 if(key==='referral'){
  const months=Math.max(0,Math.min(3,Number(ref?.meses_efectivos??ref?.meses_override??ref?.meses??0)||0));
  const count=Number(ref?.plataformas??(Array.isArray(ref?.servicios)?ref.servicios.length:0))||0;
  const claimed=ref?.beneficio_reclamado===true,ready=!!ref&&!claimed&&count>=2&&months>=3;
  return {label:'Referidos',num:ref?months+'/3':'Invita',unit:ref?'meses válidos':'sin referidos',pct:months/3*100,meter:!!ref&&months>0,
   emoji:claimed?'💝':ready?'🎁':ref?'🎁':'🫂',title:claimed?'Beneficio reclamado':ready?'¡Beneficio desbloqueado!':ref?'Tu invitado avanza':'Invita y gana',
   accent:claimed?'reclamado':ready?'desbloqueado!':ref?'avanza':'gana',
   copy:ref?String(count)+' servicios · '+months+' meses validados.':'Comparte GOXION para comenzar a obtener beneficios.',
   note:'Para acceder al mes gratis se requieren al menos 2 servicios durante 3 meses válidos.',
   progress:months+' de 3 meses',action:claimed?'Ver historial':ready?'Reclamar mes gratis':'Compartir GOXION',
   phase:claimed?'claimed':ready?'ready':ref?'active':'none'};
 }
 return {label:'Misiones',num:mi.total?mi.done+'/'+mi.total:'—',unit:mi.total?'completadas':'sin tareas',pct:mi.total?100*mi.done/mi.total:0,meter:mi.total>0,
   emoji:mi.claimed?'✅':mi.ready?'🏆':'🎯',title:mi.claimed?'Cupón reclamado':mi.ready?'¡Recompensa disponible!':mi.total?'Tu progreso continúa':'Sin misiones activas',
   accent:mi.claimed?'reclamado':mi.ready?'disponible!':mi.total?'continúa':'activas',
   copy:mi.total?'Has completado '+mi.done+' de '+mi.total+' actividades.':'Vuelve pronto para descubrir nuevas actividades.',
   note:'Las misiones solo se acreditan al validarse. El descuento aprobado es '+mi.discount+'%.',
   progress:mi.done+' de '+mi.total+' misiones',action:mi.claimed?'Ver historial':mi.ready?'Aplicar cupón':'Ver actividades',
   tasks:mi,phase:mi.claimed?'claimed':mi.ready?'ready':'active'};
}
function updateMini(tile,detail){
 tile.dataset.phase=detail.phase;tile.dataset.ready=String(detail.phase==='ready');
 tile.querySelector('.gxb-number').textContent=detail.num;
 tile.querySelector('.gxb-emoji').textContent=detail.emoji;
 tile.querySelector('.gxb-unit').textContent=detail.unit;
 const progress=tile.querySelector('.gxb-mini-progress');
 progress.hidden=!detail.meter;progress.firstElementChild.style.setProperty('--gxb-pct',Math.max(0,Math.min(100,detail.pct))+'%');
 tile.setAttribute('aria-label',detail.label+', '+detail.num+' '+detail.unit+', abrir detalle');
}
// La respuesta confirmada por la API de misiones es la fuente inmediata.
function celebrateBenefit(mission=false){
 if(reduced()||document.hidden)return;
 if(mission&&typeof window.mostrarMisionCompletada==='function')window.mostrarMisionCompletada();
 // Exactamente la celebración oficial. Una sola ráfaga por operación,
 // nunca tres ráfagas simultáneas desde el panel antiguo oculto.
 if(typeof window.lanzarConfeti==='function')window.lanzarConfeti();
}
function applyMissionReceipt(result,token){
 if(!state.view||TOKEN()!==token||result?.ok!==true||!Array.isArray(result.progreso))return;
 const version=Number(state.view.gamificacion?.misiones_version||1);
 if(Number(result.misiones_version??version)!==version){void refreshClient();return}
 const before=missionInfo(state.view).doneSet;
 const progress=result.progreso;
 state.view.misiones_progreso=progress;benefitRevision++;
 const after=missionInfo(state.view).doneSet;
 renderBenefits();
 if([...after].some(i=>!before.has(i))){
  const panel=$('gxb-panel');
  if(!panel.hidden&&panel.dataset.benefit==='mission')requestAnimationFrame(()=>panel.classList.add('gxb-task-checks-active'));
  celebrateBenefit(true);
 }
}
function bindOfficialMissionReceipts(){
 const api=window.goxionMissionAPI;if(!api)return;
 // El controlador oficial sigue completando las tareas en servidor.
 // Se conserva su actualización legacy, pero no se reproduce el confeti dos veces.
 const originalVisual=window.marcarMisionVisual;
 if(typeof originalVisual==='function')window.marcarMisionVisual=function(index,btn,celebrate=true){
  return originalVisual.call(this,index,btn,state.view?false:celebrate);
 };
 for(const name of ['completeIndex','completeType','importLegacy']){
  const original=api[name];if(typeof original!=='function')continue;
  api[name]=async function(...args){
   const token=TOKEN(),result=await original.apply(this,args);
   if(name==='importLegacy'){
    if(state.view&&TOKEN()===token&&result?.ok===true&&Array.isArray(result.progreso)){state.view.misiones_progreso=result.progreso;benefitRevision++;renderBenefits()}
   }else applyMissionReceipt(result,token);
   return result;
  };
 }
}
function renderBenefits(){
 document.querySelectorAll('#gxb-row .gxb-tile').forEach(tile=>updateMini(tile,benefitState(tile.dataset.gxb)));
 if(!$('gxb-panel').hidden){const key=$('gxb-panel').dataset.benefit;if(key){const digest=JSON.stringify(benefitState(key),(_k,v)=>v instanceof Set?[...v]:v);if($('gxb-panel').dataset.detailDigest!==digest)window.GOXION_V2_UPDATE_PANEL?.(key)}}
}
function setBenefitPanel(detail,key){
 const titleNode=$('gxb-title');const full=detail.title,accent=detail.accent;const at=full.lastIndexOf(accent);
 titleNode.replaceChildren(document.createTextNode(full.slice(0,at>=0?at:full.length)));
 if(at>=0){const span=document.createElement('span');span.className='gxb-title-accent';span.textContent=accent;titleNode.append(span,document.createTextNode(full.slice(at+accent.length)))}
 const panel=$('gxb-panel');panel.dataset.benefit=key;panel.dataset.phase=detail.phase;panel.dataset.detailDigest=JSON.stringify(detail,(_k,v)=>v instanceof Set?[...v]:v);
 $('gxb-copy').textContent=detail.copy;
 const content=$('gxb-content');
 const total=key==='loyalty'?(detail.num.split('/')[1]||'4'):key==='referral'?'3':String(detail.tasks.total);
 const now=key==='loyalty'?Number(detail.num.split('/')[0]):key==='referral'?Number(detail.progress.split(' ')[0]):detail.tasks.done;
 let html=detail.meter?'<div class="gxb-metric-head"><span>'+esc(detail.label)+'</span><strong>'+esc(detail.progress)+'</strong></div><div class="gxb-meter" role="progressbar" aria-valuemin="0" aria-valuemax="'+esc(total)+'" aria-valuenow="'+esc(now)+'"><span style="width:'+Math.max(0,Math.min(100,detail.pct))+'%"></span></div>':'';
 if(key==='mission'&&detail.tasks.total){
  html+='<ul class="gxb-tasks">'+detail.tasks.tasks.map((raw,index)=>{
   const done=detail.tasks.doneSet.has(index);
   const label=String(raw).replace(/\[[^\]]+\]/g,'').trim();
   const icon=done?'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
   return '<li data-status="'+(done?'done':'pending')+'"><span class="gxb-task-main"><span class="gxb-task-check" aria-hidden="true">'+icon+'</span><span>'+esc(label)+'</span></span><small>'+(done?'Completada':'Pendiente')+'</small></li>';
  }).join('')+'</ul>';
 }
 html+='<p class="gxb-note">'+esc(detail.note)+'</p>';
 content.innerHTML=html;
 $('gxb-panel-emoji').textContent=detail.emoji;
 $('gxb-action').textContent=detail.action;
 $('gxb-rule-note').textContent=detail.note;
 $('gxb-rule-note').hidden=true;
 $('gxb-rules').setAttribute('aria-expanded','false');
 $('gxb-feedback').textContent='';
 panel.classList.remove('gxb-task-checks-active');
 panel.setAttribute('aria-label',detail.label+' · '+detail.title);
}
function setupBenefits(){
 const root=document.querySelector('.gxb-wrap'),row=$('gxb-row'),panel=$('gxb-panel');
 const tiles=[...row.querySelectorAll('.gxb-tile')],close=$('gxb-dismiss'),action=$('gxb-action'),rules=$('gxb-rules');
 const ruleNote=$('gxb-rule-note'),feedback=$('gxb-feedback'),expandedEmoji=$('gxb-panel-emoji');
 const text=id=>$(id),prefersReduced=reduced;
 let current=null,busy=false;
 const sourceFor=key=>tiles.find(tile=>tile.dataset.gxb===key);
 function updatePanel(key){setBenefitPanel(benefitState(key),key)}
 window.GOXION_V2_UPDATE_PANEL=updatePanel;
 window.GOXION_V2_RESET_BENEFITS=()=>{
  current=null;busy=false;
  panel.hidden=true;row.hidden=false;
  panel.style.opacity='';panel.style.visibility='';row.style.visibility='';row.style.opacity='';
  tiles.forEach(tile=>tile.setAttribute('aria-expanded','false'));
 };
 function reducedOrUnsupported(){return prefersReduced()||!Element.prototype.animate}
 function coordinates(rect){return {left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'}}
 function snapshotEmoji(element){
  const rect=element.getBoundingClientRect();
  return {rect,text:element.textContent};
 }
 function animationFinished(animation){return animation?animation.finished.catch(()=>{}):Promise.resolve()}
 async function transition(sourceRect,targetRect,startEmoji,endEmoji,opening){
  if(reducedOrUnsupported())return;
  let surface=null,floating=null;
  const animations=[];
  try{
   surface=document.createElement('div');
   surface.className='gxb-morph-surface';
   Object.assign(surface.style,coordinates(sourceRect),{borderRadius:opening?'20px':'26px'});
   document.body.appendChild(surface);
   // Geometry captured before either original surface is hidden.
   const from=startEmoji.rect,to=endEmoji.rect;
   const emojiSize=Math.max(from.width,to.width,35);
   floating=document.createElement('span');
   floating.className='gxb-morph-emoji';
   floating.textContent=startEmoji.text;
   floating.style.fontSize=emojiSize+'px';
   floating.style.left=(from.left+from.width/2)+'px';
   floating.style.top=(from.top+from.height/2)+'px';
   document.body.appendChild(floating);
   const surfaceAnim=surface.animate([
     Object.assign({},coordinates(sourceRect),{borderRadius:opening?'20px':'26px',opacity:1}),
     Object.assign({},coordinates(targetRect),{borderRadius:opening?'26px':'20px',opacity:1})
   ],{duration:455,easing:'cubic-bezier(.18,.86,.22,1)',fill:'forwards'});
   animations.push(surfaceAnim);
   const eAnim=floating.animate([
     {left:(from.left+from.width/2)+'px',top:(from.top+from.height/2)+'px',opacity:opening?1:.34,transform:'translate(-50%,-50%) rotate('+(opening?-8:-12)+'deg) scale('+(from.width/emojiSize)+')'},
     {left:(to.left+to.width/2)+'px',top:(to.top+to.height/2)+'px',opacity:opening?.34:1,transform:'translate(-50%,-50%) rotate('+(opening?-12:-8)+'deg) scale('+(to.width/emojiSize)+')'}
   ],{duration:455,easing:'cubic-bezier(.22,.72,.18,1)',fill:'forwards'});
   animations.push(eAnim);
   // The real surface fades in underneath the moving surface, never popping in at the end.
   const realSurface=opening?panel:row;
   const reveal=realSurface.animate([{opacity:0},{opacity:1}],{
    duration:190,delay:255,easing:'ease-out',fill:'forwards'
   });
   animations.push(reveal);
   await Promise.all(animations.map(animationFinished));
   realSurface.style.opacity='1';
  }finally{
   animations.forEach(a=>{try{a.cancel()}catch(_){}});
   if(surface)surface.remove();
   if(floating)floating.remove();
  }
 }
 function animateContent(){
  const nodes=[panel.querySelector('.gxb-head'),text('gxb-copy'),text('gxb-content'),panel.querySelector('.gxb-foot')];
  if(reducedOrUnsupported())return;
  if(panel.querySelector('.gxb-tasks')){
   panel.classList.remove('gxb-task-checks-active');
   void panel.offsetWidth;
   panel.classList.add('gxb-task-checks-active');
  }
  nodes.forEach((node,index)=>{if(node)node.animate(
   [{opacity:0,transform:'translateY(9px)'},{opacity:1,transform:'translateY(0)'}],
   {duration:300,delay:45+index*27,easing:'cubic-bezier(.16,1,.3,1)'}
  )});
  const meter=panel.querySelector('.gxb-meter>span');
  if(meter)meter.animate([{transform:'scaleX(0)'},{transform:'scaleX(1)'}],
     {duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
 }
 async function open(key){
  if(busy||current)return;
  const tile=sourceFor(key);if(!tile)return;
  busy=true;current=key;
  const sourceRect=tile.getBoundingClientRect();
  const sourceEmoji=snapshotEmoji(tile.querySelector('.gxb-emoji'));
  try{
   updatePanel(key);
   tiles.forEach(button=>button.setAttribute('aria-expanded',String(button===tile)));
   row.hidden=true;
   panel.hidden=false;
   panel.style.visibility='hidden';
   panel.style.opacity='0';
   const targetRect=panel.getBoundingClientRect();
   const targetEmoji=snapshotEmoji(expandedEmoji);
   if(!reducedOrUnsupported()){
    panel.style.visibility='visible'; // La superficie no aparece hasta completar el movimiento.
    expandedEmoji.style.visibility='hidden';
    await transition(sourceRect,targetRect,sourceEmoji,targetEmoji,true);
   }
   panel.style.visibility='';
   panel.style.opacity='';
   expandedEmoji.style.visibility='';
   animateContent();
   close.focus({preventScroll:true});
  }catch(e){
   panel.hidden=true;row.hidden=false;current=null;
   tiles.forEach(button=>button.setAttribute('aria-expanded','false'));
  }finally{
   panel.style.opacity='';panel.style.visibility='';expandedEmoji.style.visibility='';
   busy=false;
  }
 }
 async function collapse(){
  if(busy||!current)return;
  busy=true;
  const key=current;
  const tile=sourceFor(key);
  const sourceRect=panel.getBoundingClientRect();
  const sourceEmoji=snapshotEmoji(expandedEmoji);
  try{
   // Se mide la fila de destino en su flujo real sin mostrar una segunda tarjeta.
   panel.hidden=true;
   row.hidden=false;
   row.style.visibility='hidden';
   const targetRect=tile.getBoundingClientRect();
   const targetEmoji=snapshotEmoji(tile.querySelector('.gxb-emoji'));
   row.style.visibility='';
   row.style.opacity='0';
   if(!reducedOrUnsupported())await transition(sourceRect,targetRect,sourceEmoji,targetEmoji,false);
   row.style.opacity='';
   row.style.visibility='';
   tiles.forEach(button=>button.setAttribute('aria-expanded','false'));
   current=null;
   tile.focus({preventScroll:true});
  }catch(e){
   row.style.visibility='';
   row.hidden=false;panel.hidden=true;current=null;
  }finally{
   row.style.visibility='';row.style.opacity='';expandedEmoji.style.removeProperty('--gxb-info-lock');busy=false;
  }
 }
 // Keep the large decorative emoji visually stationary while conditions change
 // the panel's natural height. This runs in one event turn, before paint,
 // so no intermediate emoji movement is visible in Safari.
 function setInfoOpen(open,feedbackMessage){
  const heightBefore=panel.getBoundingClientRect().height;
  const offsetBefore=parseFloat(expandedEmoji.style.getPropertyValue('--gxb-info-lock'))||0;
  ruleNote.hidden=!open;
  rules.setAttribute('aria-expanded',String(open));
  rules.setAttribute('aria-label',open?'Ocultar condiciones':'Ver condiciones');
  if(feedbackMessage!==undefined)feedback.textContent=feedbackMessage;
  const heightAfter=panel.getBoundingClientRect().height;
  const keepOffset=offsetBefore+heightBefore-heightAfter;
  expandedEmoji.style.setProperty('--gxb-info-lock',(Math.abs(keepOffset)<.01?0:keepOffset).toFixed(2)+'px');
 }
 tiles.forEach(tile=>tile.addEventListener('click',()=>open(tile.dataset.gxb)));
 close.addEventListener('click',collapse);
 panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();collapse()}});
 rules.addEventListener('click',()=>setInfoOpen(ruleNote.hidden));

 action.addEventListener('click',async()=>{
  if(!current||!state.view)return;
  const d=benefitState(current);
  if(current==='loyalty'){setInfoOpen(true);return}
  if(current==='referral'){
   if(d.phase==='claimed'){navigate('space');$('gxm-history').scrollIntoView({behavior:reduced()?'auto':'smooth'});return}
   if(d.phase==='ready'){
    if(!ENABLE_WRITES){feedback.textContent='La solicitud estará disponible después de validar la migración.';return}
    if(!confirm('¿Deseas reclamar el mes gratis disponible?'))return;
    action.disabled=true;
    try{const token=TOKEN(),r=await data.post('mi-espacio',{modo:'reclamar_mes_referido'},token);if(TOKEN()!==token)return;
     if(r.beneficio_reclamado===true&&state.view?.referidos?.[0]){state.view.referidos[0].beneficio_reclamado=true;state.view.referidos[0].beneficio_reclamado_at=r.reclamado_at;benefitRevision++;renderBenefits();if(!r.ya_reclamado)celebrateBenefit()}
     void refreshClient();feedback.textContent='Beneficio reclamado correctamente.'}
    catch(e){feedback.textContent=e.message||'No se pudo registrar el beneficio.'}
    finally{action.disabled=false}return;
   }
   const c=state.view.cliente;
   const message='Conoce GOXION. Vengo invitado por '+String(c.nombre||'')+' (folio '+String(c.folio||'')+').';
   try{if(navigator.share)await navigator.share({text:message});else{await navigator.clipboard.writeText(message);feedback.textContent='Invitación copiada.'}}
   catch(e){if(e?.name!=='AbortError')feedback.textContent='No fue posible compartir.'}
   return;
  }
  if(current==='mission'){
   const mi=missionInfo(state.view);
   if(mi.claimed){$('gxm-history').scrollIntoView({behavior:reduced()?'auto':'smooth'});return}
   if(mi.ready){
    if(!ENABLE_WRITES){feedback.textContent='La recompensa se habilitará cuando termine la validación de la V2.';return}
    if(!confirm('¿Deseas aplicar el cupón de '+mi.discount+'%?'))return;
    action.disabled=true;
    try{const token=TOKEN(),r=await data.post('mi-espacio',{modo:'reclamar_cupon'},token);if(TOKEN()!==token)return;
     if(r.cupon_reclamado===true&&state.view?.gamificacion){const g=state.view.gamificacion;g.cupon_reclamado=true;g.cupon_reclamado_ciclo=Number(r.ciclo??g.cupon_ciclo??1);g.cupon_reclamado_at=r.reclamado_at;benefitRevision++;renderBenefits();if(!r.ya_reclamado)celebrateBenefit()}
     void refreshClient();feedback.textContent='Cupón registrado.'}
    catch(e){feedback.textContent=e.message||'No fue posible aplicar el cupón.'}
    finally{action.disabled=false}return;
   }
   const pending=mi.tasks.findIndex((x,i)=>!mi.doneSet.has(i));
   if(pending<0){feedback.textContent='No hay tareas pendientes.';return}
   const t=String(mi.tasks[pending]);const tag=(t.match(/\[([^\]]+)\]/)||[])[1]||'';
   const key=clean(tag);
   if(key.startsWith('catalogo')){await collapse();navigate('catalog');return}
   if(key.startsWith('soporte')){await collapse();navigate('support');return}
   if(key.startsWith('referidos')){await collapse();open('referral');return}
   if(key.startsWith('link:')){
    const url=tag.slice(5).trim();
    if(/^https:\/\//i.test(url))window.open(url,'_blank','noopener,noreferrer');
    else feedback.textContent='Enlace no válido.';
    return;
   }
   if(key.startsWith('compartir')){
    const message='Conoce GOXION. Invitado por '+state.view.cliente.nombre+' (folio '+state.view.cliente.folio+').';
    try{if(navigator.share)await navigator.share({text:message});else await navigator.clipboard.writeText(message);
      if(ENABLE_WRITES){await window.goxionMissionAPI.completeIndex(pending);void refreshClient()}
    }catch(e){feedback.textContent='No se pudo completar la actividad.'}
    return;
   }
   feedback.textContent='Esta actividad se valida mediante su acción oficial; aún no se puede marcar desde esta versión.';
  }
 });
}
function logo(name){
 const s=clean(name);
 if(s.includes('netflix'))return './logos/netflix.PNG';
 if(s.includes('disney'))return './logos/disney.PNG';
 if(s.includes('hbo')||s.includes('max'))return './logos/hbo-max.PNG';
 if(s.includes('youtube'))return './logos/youtube.PNG';
 if(s.includes('prime')||s.includes('amazon'))return './logos/prime-video.PNG';
 if(s.includes('vix'))return './logos/vix.PNG';
 if(s.includes('crunchy'))return './logos/crunchyroll.PNG';
 if(s.includes('microsoft')||s.includes('365'))return './logos/microsoft.PNG';
 if(s.includes('google'))return './logos/google-one.PNG';
 return './logo2.PNG';
}
function serviceDetail(s){
 const cancel=clean(s.cancelacion?.estado),notice=s.credencial_pendiente||s.novedades?.length;
 if(cancel.includes('solicit'))return ['Cancelación en revisión','pending'];
 if(cancel.includes('aprobad'))return ['Cancelación aprobada','caution'];
 if(cancel.includes('rechaz'))return ['Cancelación no autorizada','danger'];
 if(s.credencial_pendiente)return ['Nueva contraseña','notice'];
 if(notice)return ['Actualización disponible','notice'];
 if((s.accesos||[]).some(a=>clean(a.estado_invitacion).includes('pendiente')))return ['Invitación pendiente','pending'];
 if(typeof gxServiceHasAlert==='function'&&gxServiceHasAlert(s.nombre))return ['Temporalmente inactivo','caution'];
 return ['Activo','active'];
}
function accessRow(label,value,action,dataValue){
 const dataAttribute=dataValue?(' data-gxs-value="'+esc(dataValue)+'"'):'';
 const buttons=action?'<button type="button" class="gxs-rowbutton" data-gxi-action="'+esc(action)+'">'+(action==='pin'?'Mostrar':'Copiar')+'</button>':'';
 return '<div class="gxs-accessrow"><span class="gxs-copy"><small>'+esc(label)+'</small><strong'+dataAttribute+'>'+esc(value)+'</strong></span>'+buttons+'</div>';
}
function invitationLabel(value){
 const raw=String(value||'').trim(),key=clean(raw).replace(/[\s-]+/g,'_');
 const labels={sin_verificar:'Pendiente de verificación',pendiente:'Pendiente',pendiente_aceptacion:'Pendiente de aceptación',pendiente_verificacion:'Pendiente de verificación',verificado:'Verificada',aceptada:'Aceptada',activo:'Activa',activa:'Activa',rechazada:'Rechazada',expirada:'Caducada'};
 return labels[key]||(raw?raw.replace(/[_-]+/g,' ').replace(/^./,m=>m.toUpperCase()):'Pendiente de verificación');
}
let serviceOperation=null;
const heldSecrets=new Map();
function wipeServiceSecrets(){
 const hadSecret=heldSecrets.size>0;
 for(const panel of document.querySelectorAll('#gxs-list .gxs-credential-result')){panel.querySelector('.gxs-secret')?.replaceChildren();panel.hidden=true}
 for(const input of document.querySelectorAll('#gxs-list .gxs-pin-input'))input.value='';
 for(const row of document.querySelectorAll('#gxs-list [data-gxi-action="pin"]')){const node=row.closest('.gxs-accessrow')?.querySelector('.gxs-copy strong');if(node)node.textContent='••••';row.textContent='Mostrar'}
 heldSecrets.clear();
 if(hadSecret){state.serviceDigest='';for(const panel of document.querySelectorAll('#gxs-list .gxs-credential-panel')){panel.hidden=true;const notice=panel.previousElementSibling;if(notice?.matches('[data-gxi-action="credential-open"]')&&panel.querySelector('.gxs-pin-input')?.disabled)notice.hidden=true}}
}
const serviceById=id=>state.view?.servicios?.find(s=>String(s.id)===String(id));
function cancellationPanel(s){
 const c=s.cancelacion,st=clean(c?.estado);
 const title=st==='solicitada'?'Cancelación en revisión':st==='aprobada'?'Cancelación aprobada':st==='rechazada'?'Cancelación no autorizada':'Solicitar cancelación';
 const note=st==='solicitada'?'Tu solicitud fue recibida. El servicio sigue activo mientras se revisa.':st==='aprobada'?'Tu servicio continúa activo hasta que la baja sea efectiva.':st==='rechazada'?'Puedes solicitar nuevamente la cancelación.':'Los cargos ya generados no cambian. Revisaremos tu solicitud antes de efectuar cualquier baja.';
 const pending=st==='solicitada'||st==='aprobada';
 const progress=st==='solicitada'?'<div class="gx-cancel-progress" aria-label="Solicitud recibida, revisión pendiente"><span class="done"></span><i class="done"></i><span class="done"></span><i></i><span></span></div>':st==='aprobada'?'<div class="gx-cancel-progress" aria-label="Solicitud y revisión completadas; baja pendiente"><span class="success"></span><i class="success"></i><span class="success"></span><i class="success"></i><span></span></div>':'';
 const admin=c?.nota_admin?'<p class="gxs-notice"><strong>Nota de GOXION</strong> · '+esc(c.nota_admin)+'</p>':'';
 const date=c?.fecha_efectiva?'<p class="gxs-notice">Fecha prevista: '+esc(dateLabel(c.fecha_efectiva))+'</p>':'';
 return '<h3 class="gxs-subtitle">'+title+'</h3><p class="gxi-note">'+note+'</p>'+progress+date+admin+(pending?'':'<div class="gx-cancel-submit-zone"><button type="button" class="gx-service-cancel-submit gx-action-morph" data-gxi-action="cancel-submit"><span class="gx-action-label">'+(st==='rechazada'?'Enviar nueva solicitud':'Enviar solicitud')+'</span></button></div>')+'<p class="gxs-feedback" role="status" aria-live="polite"></p>';
}
function credentialPanel(s){
 if(!s.credencial_pendiente?.id)return '';
 return '<section class="gxs-credential-panel" hidden><p class="gxi-note">Consulta única. Ingresa tu PIN de GOXION; no el PIN del perfil.</p><label class="gxi-note">PIN de GOXION<input class="gxs-pin-input" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="PIN de GOXION"></label><button type="button" class="gxs-pill" data-gxi-action="credential-reveal">Ver contraseña</button><div class="gxs-credential-result" hidden><strong class="gxs-secret"></strong><button type="button" class="gxs-pill" data-gxi-action="credential-copy">Copiar contraseña</button><button type="button" class="gxs-ghost" data-gxi-action="credential-close">Terminar</button></div><p class="gxs-feedback" role="status" aria-live="polite"></p></section>';
}
function renderServices(){
 const v=state.view,services=v.servicios||[];
 const digest=JSON.stringify(services);if(state.serviceDigest===digest)return;
 if(serviceOperation)return;
 if(heldSecrets.size){if([...heldSecrets.keys()].every(id=>services.some(s=>String(s.id)===id)))return;wipeServiceSecrets()}

 state.serviceDigest=digest;const host=$('gxs-list');
 const previous=[...host.querySelectorAll('.gxs-card')].find(el=>el.dataset.service===state.openService);
 const keepOptions=previous?.querySelector('.gxs-more')?.hidden===false;
 const keepCancel=previous?.querySelector('.gxs-cancel-panel')?.hidden===false;
 const priorOffer=previous?._gxOffer,priorPanel=priorOffer?previous.querySelector('.gxs-cancel-panel'):null;
 host.replaceChildren();
 $('gxs-count').textContent=services.length+' '+(services.length===1?'plataforma':'plataformas');
 if(!services.length){host.innerHTML='<div class="gxm-empty">Todavía no tienes servicios activos.</div>';return}
 services.forEach((s,index)=>{
  const status=serviceDetail(s),accesses=Array.isArray(s.accesos)&&s.accesos.length?s.accesos:[s];
  const isInvite=accesses.every(a=>clean(a.modo_acceso).includes('invit')||/youtube|microsoft/i.test(a.servicio||s.nombre));
  const id='gxi-service-'+index,article=document.createElement('article');
  article.className='gxs-card gxc-surface';article.dataset.service=String(s.id||index);article.dataset.tone=status[1];article.dataset.index=String(index);
  const access=accesses.map((a,i)=>{
   const invite=clean(a.modo_acceso).includes('invit')||/youtube|microsoft/i.test(a.servicio||s.nombre);
   const email=String(a.correo||(a===s?s.correo_login:'')||''),profile=String(a.perfil_nombre||''),pin=String(a.perfil_pin||'');
   return '<div class="gxs-access-group" data-access-index="'+i+'">'+(accesses.length>1?'<p class="gxs-subtitle">'+esc(a.servicio||s.nombre)+' · '+(invite?'Invitación':'Perfil')+' '+esc(a.ordinal||i+1)+'</p>':'')+(email?accessRow(invite?'Correo personal':'Correo',email,'copy',email):'')+(profile?accessRow('Perfil',profile):'')+(pin?accessRow('PIN de perfil','••••','pin',''):'')+(invite&&a.estado_invitacion?accessRow('Invitación',invitationLabel(a.estado_invitacion)):'')+(!email&&!profile&&!pin&&!a.estado_invitacion?'<p class="gxi-note">Sin datos de acceso disponibles.</p>':'')+'</div>';
  }).join('');
  const notes=(s.novedades||[]).slice().sort((a,b)=>Number(b.prioridad||0)-Number(a.prioridad||0));
  let note=notes.map(n=>'<p class="gxs-notice"><strong>'+esc(n.titulo||'Actualización disponible')+'</strong>'+(n.resumen?' · '+esc(n.resumen):'')+'</p>').join('');
  if(s.cancelacion&&['solicitada','aprobada','rechazada'].includes(clean(s.cancelacion.estado)))note='<p class="gxs-notice">'+esc(status[0])+'</p>'+note;
  if(s.credencial_pendiente)note+='<button type="button" class="gxs-pill gxs-credential-notice" data-gxi-action="credential-open">Nueva contraseña · Consultar con PIN</button>'+credentialPanel(s);
  if(s.lecturas?.cliente_accesos===false||s.lecturas?.credenciales_entregas===false||s.lecturas?.novedades_servicio===false)note+='<p class="gxi-note">Algunas novedades o accesos no pudieron sincronizarse.</p>';
  article.innerHTML='<button class="gxs-trigger" type="button" aria-expanded="false" aria-controls="'+id+'" data-gxi-toggle="'+index+'" aria-label="'+esc(s.nombre+', '+status[0])+', abrir detalles">'+
   '<img class="gxs-logo" alt="" src="'+esc(logo(s.nombre))+'" decoding="async" loading="lazy">'+
   '<span class="gxs-summary"><strong class="gxs-name">'+esc(s.nombre)+'</strong><span class="gxs-status">'+esc(status[0])+'</span></span>'+
   '<span class="gxs-icon" aria-hidden="true"><svg class="gxs-chevron" viewBox="0 0 24 24"><path d="m5 9 7 7 7-7"/></svg><svg class="gxs-x" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg></span></button>'+
   '<div class="gxs-reveal" id="'+id+'"><div class="gxs-reveal-inner" inert aria-hidden="true"><div class="gxs-body">'+note+
   '<div class="gxs-subtitle">'+(isInvite?'Tu invitación':'Tus accesos')+'</div><div class="gxs-accesslist">'+(access||'<p class="gxi-note">Sin datos de acceso disponibles.</p>')+'</div>'+
   '<div class="gxs-actions"><button class="gxs-pill" type="button" data-gxi-action="options" aria-expanded="false">Más opciones</button>'+
   '<button class="gxs-ghost" type="button" data-gxi-action="support">Soporte</button></div>'+
   '<div class="gxs-more" hidden><button type="button" data-gxi-action="cancel">'+(s.cancelacion&&['solicitada','aprobada'].includes(clean(s.cancelacion.estado))?'Ver cancelación':'Solicitar cancelación')+'</button><section class="gxs-cancel-panel gx-service-view" hidden>'+cancellationPanel(s)+'</section></div>'+
   '<span class="gxs-feedback" role="status" aria-live="polite"></span></div></div></div>';
  if(state.openService===article.dataset.service){
   article.classList.add('is-open');article.querySelector('.gxs-trigger').setAttribute('aria-expanded','true');const panel=article.querySelector('.gxs-reveal-inner');panel.inert=false;panel.setAttribute('aria-hidden','false');
   if(keepOptions){article.querySelector('.gxs-more').hidden=false;article.querySelector('[data-gxi-action="options"]').setAttribute('aria-expanded','true')}
   if(keepCancel){article.querySelector('.gxs-cancel-panel').hidden=false;
    if(priorOffer&&priorPanel&&!['solicitada','aprobada'].includes(clean(s.cancelacion?.estado))){article._gxOffer=priorOffer;article.querySelector('.gxs-cancel-panel').replaceWith(priorPanel)}
   }
  }
  host.append(article);
 });
}
async function cancellationAction(tile,kind,button,s){
 if(!ENABLE_WRITES||!s?.id||!TOKEN()||serviceOperation)return;
 const token=TOKEN(),id=String(s.id),panel=tile.querySelector('.gxs-cancel-panel');
 const valid=()=>TOKEN()===token&&serviceById(id)&&tile.isConnected;
 const status=()=>panel.querySelector('.gxs-feedback');
 const morph=(b,phase,label)=>{if(typeof gxCancellationActionState==='function')gxCancellationActionState(b,phase,label);else{b.disabled=phase==='loading'||phase==='success';b.classList.remove('gx-action-loading','gx-action-success','gx-action-error');b.classList.add('gx-action-'+phase);b.querySelector('.gx-action-label').textContent=phase==='error'?'Reintentar':'';}};
 const wait=ms=>new Promise(r=>setTimeout(r,reduced()?0:ms));
 const api=(accion,datos)=>data.post('cancelaciones-cliente',{accion,datos},token);
 serviceOperation=id;
 try{
  if(kind==='cancel-submit'){
   if(s.lecturas?.cancelaciones===false)throw Error('No se pudo comprobar el estado de la solicitud. Reintenta al sincronizar.');
   if(['solicitada','aprobada'].includes(clean(s.cancelacion?.estado)))return;
   morph(button,'loading');status().textContent='Revisando beneficios disponibles…';
   const [evaluation]=await Promise.all([api('evaluar_retencion',{cliente_servicio_id:s.id}),wait(650)]);
   if(!valid())return;
   if(evaluation.elegible===true&&evaluation.oferta?.id){
    const offer=evaluation.oferta;tile._gxOffer=offer;
    panel.innerHTML='<div class="gx-retention-stage"><h3>Nos gustaría que te quedaras</h3><p class="gxi-note">Beneficio único para tu próximo pago de '+esc(offer.servicio_nombre||s.nombre)+'.</p><div class="gx-retention-value"><div class="gx-retention-percent">-'+esc(offer.porcentaje)+'%</div><div class="gx-retention-price"><span>Próximo pago</span><strong>'+esc(data.money(offer.monto_final))+'</strong><small>Ahorras '+esc(data.money(offer.monto_descuento))+'</small></div></div><p class="gxi-note">Solo puede aceptarse una vez en toda tu cuenta y se aplica únicamente a este servicio durante un periodo.</p><div class="gx-retention-actions"><button type="button" class="gx-retention-accept gx-action-morph" data-gxi-action="retention-accept"><span class="gx-action-label">Aceptar beneficio</span></button><button type="button" class="gx-retention-decline" data-gxi-action="retention-decline">Continuar con la cancelación</button></div><p class="gxs-feedback" role="status" aria-live="polite"></p></div>';
    return;
   }
  }else{
   const offer=tile._gxOffer;if(!offer?.id)throw Error('La oferta ya no está disponible.');
   panel.querySelectorAll('button').forEach(b=>b.disabled=true);
   if(kind==='retention-accept'){
    morph(button,'loading');const [result]=await Promise.all([api('aceptar_retencion',{oferta_id:offer.id}),wait(850)]);
    if(!valid())return;
    morph(button,'success');status().textContent='Beneficio confirmado. La cancelación no fue enviada.';delete tile._gxOffer;benefitRevision++;
    await wait(1100);return;
   }
   await api('rechazar_retencion',{oferta_id:offer.id});if(!valid())return;delete tile._gxOffer;
   panel.innerHTML=cancellationPanel(s);button=panel.querySelector('[data-gxi-action="cancel-submit"]');
   if(!button)throw Error('La solicitud ya está abierta.');
   morph(button,'loading');
  }
  status().textContent='Registrando solicitud…';
  const [receipt]=await Promise.all([api('crear',{cliente_servicio_id:s.id,motivo:'Solicitud desde Mi Espacio'}),wait(900)]);
  if(!valid())return;
  const confirmed=receipt.solicitud;
  if(!confirmed?.id||!['solicitada','aprobada'].includes(clean(confirmed.estado)))throw Error('No se recibió confirmación de la solicitud. Consulta su estado.');
  const current=serviceById(id);current.cancelacion={...confirmed,cliente_servicio_id:id};
  state.view.cancelaciones=[...(state.view.cancelaciones||[]).filter(c=>c.id!==confirmed.id),current.cancelacion];
  benefitRevision++;morph(button,'success');status().textContent='Solicitud registrada. Tu servicio sigue activo durante la revisión.';
  renderHero();drawHistory();
  await wait(900);
  if(valid()){panel.innerHTML=cancellationPanel(current);tile.dataset.tone=serviceDetail(current)[1];tile.querySelector('.gxs-status').textContent=serviceDetail(current)[0];tile.querySelector('[data-gxi-action="cancel"]').textContent='Ver cancelación'}
 }catch(e){if(valid()){panel.querySelectorAll('button').forEach(b=>b.disabled=false);if(button?.isConnected&&button.classList.contains('gx-action-morph'))morph(button,'error','Reintentar');const out=status();if(out)out.textContent=e.message||'No pudimos completar la operación.'}}
 finally{serviceOperation=null;void refreshClient()}
}
$('gxs-list').addEventListener('click',async event=>{
 const tile=event.target.closest('.gxs-card');if(!tile)return;
 const toggle=event.target.closest('[data-gxi-toggle]');
 if(toggle){
  if(serviceOperation)return;
  wipeServiceSecrets();
  const isOpen=tile.classList.contains('is-open');state.openService=isOpen?null:tile.dataset.service;
  $('gxs-list').querySelectorAll('.gxs-card').forEach(el=>{
   const active=el===tile&&!isOpen;
   el.classList.toggle('is-open',active);
   el.querySelector('.gxs-trigger').setAttribute('aria-expanded',String(active));
   const body=el.querySelector('.gxs-reveal-inner');
   body.inert=!active;body.setAttribute('aria-hidden',String(!active));
  });
  return;
 }
 const action=event.target.closest('[data-gxi-action]');if(!action)return;
 const kind=action.dataset.gxiAction;
 const feedback=tile.querySelector('.gxs-feedback'),row=action.closest('.gxs-accessrow');
 if(kind==='copy'&&row){const v=row.querySelector('[data-gxs-value]')?.dataset.gxsValue||'';
  navigator.clipboard?.writeText(v).then(()=>feedback.textContent='Correo copiado.',()=>feedback.textContent='No se pudo copiar.');return}
 if(kind==='pin'&&row){
   const currentService=serviceById(tile.dataset.service);
   const ai=Number(row.closest('[data-access-index]')?.dataset.accessIndex||0);
   const currentAccess=currentService?.accesos?.length?currentService.accesos[ai]:currentService;
   const secret=String(currentAccess?.perfil_pin||'');
   if(!secret){feedback.textContent='El PIN no está disponible para este acceso.';return}
   const node=row.querySelector('.gxs-copy strong');
   const isHidden=node.textContent==='••••';node.textContent=isHidden?secret:'••••';
   action.textContent=isHidden?'Ocultar':'Mostrar';return
  }
 if(kind==='options'){const more=tile.querySelector('.gxs-more');more.hidden=!more.hidden;action.setAttribute('aria-expanded',String(!more.hidden));return}
 const service=serviceById(tile.dataset.service);
 if(kind==='support'){wipeServiceSecrets();navigate('support');setTimeout(()=>{if(!service||typeof gxSupportButtonForService!=='function')return;const b=gxSupportButtonForService(service.nombre);if(b&&typeof selectPlatform==='function')selectPlatform(service.nombre,b,null)},420);return}
 if(kind==='cancel'){const panel=tile.querySelector('.gxs-cancel-panel');panel.hidden=!panel.hidden;return}
 if(['cancel-submit','retention-accept','retention-decline'].includes(kind)){await cancellationAction(tile,kind,action,service);return}
 const credential=tile.querySelector('.gxs-credential-panel');
 if(kind==='credential-open'&&credential){if(serviceOperation)return;credential.hidden=!credential.hidden;if(credential.hidden){wipeServiceSecrets();void refreshClient()}return}
 if(kind==='credential-close'&&credential){wipeServiceSecrets();credential.hidden=true;state.serviceDigest='';void refreshClient();return}
 if(kind==='credential-copy'&&credential){const secret=credential.querySelector('.gxs-secret')?.textContent;try{if(secret&&heldSecrets.has(tile.dataset.service)){await navigator.clipboard.writeText(secret);credential.querySelector('.gxs-feedback').textContent='✓ Copiada.'}}catch{credential.querySelector('.gxs-feedback').textContent='Mantén presionada la contraseña para copiarla.'}return}
 if(kind==='credential-reveal'&&credential&&service?.credencial_pendiente?.id){
  if(!ENABLE_WRITES||serviceOperation)return;
  const input=credential.querySelector('.gxs-pin-input'),pin=input.value.trim(),out=credential.querySelector('.gxs-feedback');
  if(!/^\d{4}$/.test(pin)){out.textContent='Ingresa tu PIN de GOXION de 4 dígitos.';return}
  const token=TOKEN(),id=tile.dataset.service;serviceOperation=id;action.disabled=true;out.textContent='Validando…';input.value='';
  try{const reply=await data.post('credenciales-cliente',{accion:'revelar',datos:{entrega_id:service.credencial_pendiente.id,pin}},token);
   if(!reply.password)throw Error('No se recibió una contraseña autorizada.');
   if(TOKEN()!==token||!tile.isConnected)return;
   const current=serviceById(id);if(current)current.credencial_pendiente=null;benefitRevision++;
   if(document.hidden||state.tab!=='space'||!tile.classList.contains('is-open')||credential.hidden){credential.hidden=true;credential.previousElementSibling.hidden=true;state.serviceDigest='';return}
   heldSecrets.set(id,true);credential.querySelector('.gxs-secret').textContent=String(reply.password);credential.querySelector('.gxs-credential-result').hidden=false;input.disabled=true;action.hidden=true;
   out.textContent='Consulta única. Al salir de esta tarjeta se ocultará definitivamente.';
  }catch(e){out.textContent=e.message||'No fue posible consultar la contraseña.';action.disabled=false}
  finally{serviceOperation=null;if(!heldSecrets.size)void refreshClient()}
 }
});
function dateLabel(raw){
 const s=String(raw||'').slice(0,10),ms=Date.parse(s+'T12:00:00Z');
 return Number.isFinite(ms)?new Date(ms).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Fecha no disponible';
}
function historyRows(){
 const view=state.view,items=[];
 for(const p of view.pagos||[]){
  if(!p.id)continue;
  const st=clean(p.estado),pending=st.includes('pend')||st.includes('revisi'),rejected=st.includes('rechaz'),approved=['pagado','acreditado','aprobado'].includes(st);
  const effect=clean(p.lealtad_efecto),loyalty=approved?(effect==='sumo'?'Sumó lealtad':effect==='reinicio'?'Racha reiniciada':effect==='sin_cambio'?'Sin cambio de lealtad':p.puntual===true?'Pago en tiempo':p.puntual===false?'No sumó lealtad':''):'';
  items.push({id:'p-'+p.id,date:p.fecha||p.created_at||'',title:rejected?'Comprobante rechazado':pending?'Pago en revisión':approved?'Pago acreditado':'Pago registrado',subject:p.periodo||'',amount:data.money(p.monto),detail:[String(p.estado||'Registrado'),loyalty].filter(Boolean).join(' · '),kind:'payment'});
 }
 for(const c of view.cancelaciones||[]){
  const st=clean(c.estado);if(!['solicitada','efectiva','efectuada','completada','aprobada','rechazada'].includes(st)||!c.id)continue;
  items.push({id:'c-'+c.id,date:c.resuelta_at||c.updated_at||c.created_at||'',title:st==='solicitada'?'Cancelación solicitada':st==='aprobada'?'Cancelación aprobada':st==='rechazada'?'Cancelación no autorizada':'Baja de servicio registrada',subject:String(c.servicio_nombre||c.nombre||'Servicio'),amount:'',detail:'Estado confirmado: '+String(c.estado),kind:'cancellation'});
 }
 // Solo altas respaldadas por una fecha explícita de contratación/activación del servidor.
 // No copiar los datos ilustrativos del laboratorio ni inferir fechas desde el catálogo.
 for(const service of view.servicios||[]){
  const date=service.fecha_alta||service.fecha_contratacion||service.fecha_activacion||service.activated_at||'';
  if(!/^\d{4}-\d{2}-\d{2}/.test(String(date))||!service.id)continue;
  items.push({id:'a-'+service.id,date,title:String(service.nombre||service.servicio_nombre||'Servicio')+' agregado',
   subject:'',amount:'',detail:'Servicio incorporado a tu cuenta.',kind:'acquisition'});
 }
 const g=view.gamificacion;
 if(g?.cupon_reclamado_at&&missionInfo(view).claimed)items.push({id:'coupon-'+String(g.cupon_reclamado_ciclo||g.cupon_ciclo||1),date:g.cupon_reclamado_at,title:'Cupón reclamado',subject:'Misiones',amount:'',detail:'Recompensa registrada; su aplicación depende del cobro oficial.',kind:'benefit'});
 for(const r of view.referidos||[])if(r.id&&r.beneficio_reclamado===true&&r.beneficio_reclamado_at)items.push({id:'ref-'+r.id,date:r.beneficio_reclamado_at,title:'Recompensa reclamada',subject:'Referidos',amount:'',detail:'Mes gratis reclamado. Su aplicación depende del cobro oficial.',kind:'benefit'});
 return [...new Map(items.filter(x=>x.id).map(x=>[x.id,x])).values()].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function drawHistory(){
 const list=$('gxm-list');list.replaceChildren();
 const records=historyRows().filter(x=>state.activeFilter==='all'||(state.activeFilter==='payment'?x.kind==='payment':x.kind!=='payment'));
 const shown=state.showAllHistory?records:records.slice(0,3);
 if(!shown.length){list.innerHTML='<div class="gxm-empty">No hay movimientos registrados para este filtro.</div>'}
 const glyph={
  payment:'<path d="M5 12.5 10 17l9-10"/>',
  acquisition:'<path d="M12 5v14M5 12h14"/>',
  renewal:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
  cancellation:'<path d="M5 12h14"/>',benefit:'<path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'
 };
 shown.forEach((item,i)=>{
  const row=document.createElement('div');row.className='gxm-entry';row.dataset.kind=item.kind;row.dataset.movement=item.id;
  const expanded=state.openHistory===item.id;row.classList.toggle('is-open',expanded);
  const b=document.createElement('button');b.type='button';b.className='gxm-entry-button';
  b.setAttribute('aria-expanded',String(expanded));b.setAttribute('aria-controls','gxm-detail-'+i);
  b.innerHTML='<span class="gxm-icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+(glyph[item.kind]||glyph.acquisition)+'</svg></span>'+
   '<span class="gxm-entry-copy"><strong>'+esc(item.title)+'</strong><small>'+esc(dateLabel(item.date)+(item.subject?' · '+item.subject:''))+'</small></span>'+
   '<span class="gxm-entry-value">'+esc(item.amount)+'</span>'+
   '<span class="gxm-arrow gxs-icon" aria-hidden="true"><svg class="gxs-chevron" viewBox="0 0 24 24"><path d="m5 9 7 7 7-7"/></svg><svg class="gxs-x" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg></span>';
  const detail=document.createElement('p');detail.id='gxm-detail-'+i;detail.className='gxm-detail';detail.textContent=item.detail;detail.hidden=!expanded;
  b.addEventListener('click',()=>{
   const opening=detail.hidden;state.openHistory=opening?item.id:null;
   list.querySelectorAll('.gxm-entry').forEach(other=>{
    const opened=opening&&other===row;
    other.classList.toggle('is-open',opened);
    other.querySelector('.gxm-entry-button')?.setAttribute('aria-expanded',String(opened));
    const d=other.querySelector('.gxm-detail');if(d)d.hidden=!opened;
   });
  });
  row.append(b,detail);list.append(row);
 });
 const more=$('gxm-more');more.hidden=records.length<=3;more.textContent=state.showAllHistory?'Mostrar menos':'Ver '+Math.max(0,records.length-3)+' '+(records.length===4?'movimiento':'movimientos')+' más';
}
$('gxm-more').addEventListener('click',()=>{state.showAllHistory=!state.showAllHistory;drawHistory()});
$('gxm-filter-toggle').addEventListener('click',()=>{$('gxm-filters').hidden=!$('gxm-filters').hidden;$('gxm-filter-toggle').setAttribute('aria-expanded',String(!$('gxm-filters').hidden))});
$('gxm-filters').addEventListener('click',event=>{
 const b=event.target.closest('[data-gxm-filter]');if(!b)return;
 state.activeFilter=b.dataset.gxmFilter;state.showAllHistory=false;state.openHistory=null;
 $('gxm-filter-toggle').dataset.selected=String(state.activeFilter!=='all');
 $('gxm-filter-label').textContent=state.activeFilter==='all'?'Filtrar':state.activeFilter==='payment'?'Pagos':'Servicios';
 $('gxm-filters').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 $('gxm-filters').hidden=true;$('gxm-filter-toggle').setAttribute('aria-expanded','false');drawHistory();
});
async function loadPrices(){
 if(!state.view)return;
 try{state.prices=await data.getPriceReferences();renderSavings()}
 catch(_){$('gxv-savings').hidden=true}
}
/* Ahorro · misma animación y distribución adaptativa del laboratorio aprobado. */
const savingsMoney=value=>new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:Number.isInteger(value)?0:2,maximumFractionDigits:Number.isInteger(value)?0:2}).format(value);
let savingCurrent=0,savingTarget=0,savingFrame=0,savingSeen=false,savingObserver=null,savingSignature='';
function stopSavingsMotion(){if(savingFrame){cancelAnimationFrame(savingFrame);savingFrame=0}}
function showSavingAmount(value){
 const node=$('gxv-amount');node.textContent=savingsMoney(value);
 node.dataset.long=String(node.textContent.length>7);
}
function animateSavings(next,initial=false){
 stopSavingsMotion();
 const start=initial?0:savingCurrent,change=next-start;
 if(reduced()||document.hidden||Math.abs(change)<.01){savingCurrent=next;showSavingAmount(next);return}
 const startTime=performance.now(),duration=initial?1050:760;
 function frame(now){
  const p=Math.min(1,Math.max(0,(now-startTime)/duration));
  const ease=p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2;
  savingCurrent=Math.round((start+change*ease)*100)/100;
  showSavingAmount(savingCurrent);
  if(p<1)savingFrame=requestAnimationFrame(frame);else{savingFrame=0;savingCurrent=next;showSavingAmount(next)}
 }
 savingCurrent=start;showSavingAmount(start);
 savingFrame=requestAnimationFrame(frame);
}
function observeSavings(){
 const card=$('gxv-savings');
 if(savingObserver)return;
 if(!('IntersectionObserver' in window)){card.classList.add('is-visible');animateSavings(savingTarget,!savingSeen);savingSeen=true;return}
 savingObserver=new IntersectionObserver(entries=>{
  const visible=entries.some(entry=>entry.isIntersecting);
  card.classList.toggle('is-visible',visible);
  if(visible){if(!savingSeen||Math.abs(savingTarget-savingCurrent)>.01){animateSavings(savingTarget,!savingSeen);savingSeen=true}}
  else {stopSavingsMotion();savingCurrent=savingTarget;showSavingAmount(savingTarget)}
 },{threshold:.15});
 savingObserver.observe(card);
}
function renderSavings(){
 const sum=data.savings(state.view,state.prices);state.savings=sum;
 const card=$('gxv-savings');let details=$('gxi-saving-note');
 if(!sum||sum.difference<=0){card.hidden=true;if(details)details.hidden=true;stopSavingsMotion();savingSeen=false;return}
 card.hidden=false;
 savingTarget=sum.difference;
 // Las plataformas visuales NO dependen de si conocemos su precio público.
 // Una plataforma por marca, conservando orden original de servicios reales.
 const platforms=[];const seen=new Set();
 for(const service of state.view.servicios||[]){
  const name=String(service.nombre||service.servicio_nombre||'').trim();if(!name)continue;
  const src=logo(name);const key=src==='./logo2.PNG'?clean(name):src;
  if(seen.has(key))continue;seen.add(key);platforms.push({name,src});
 }
 const signatures=platforms.map(p=>p.name+':'+p.src).join('|');
 if(signatures!==savingSignature){
  savingSignature=signatures;
  const logos=$('gxv-logos');logos.replaceChildren();logos.dataset.count=String(Math.min(4,platforms.length));
  platforms.slice(0,4).forEach(e=>{
   const slot=document.createElement('span');slot.className='gxv-slot';
   const img=document.createElement('img');img.src=e.src;img.alt=e.name;img.loading='lazy';img.decoding='async';
   slot.append(img);logos.append(slot);
  });
  if(platforms.length>4){const more=document.createElement('span');more.className='gxv-more';more.textContent='+'+(platforms.length-4);more.setAttribute('aria-label','y '+(platforms.length-4)+' plataformas más');logos.append(more)}
 }
 if(!details){
  details=document.createElement('details');details.id='gxi-saving-note';details.className='gxi-saving-note';
  const summary=document.createElement('summary');summary.textContent='Cómo calculamos el ahorro';
  const p=document.createElement('p');details.append(summary,p);
  card.insertAdjacentElement('afterend',details);
 }
 $('gxv-context').textContent='Frente a suscripciones directas'+(sum.covered<sum.total?' · '+sum.covered+' de '+sum.total+' servicios incluidos':'');
 card.setAttribute('aria-label','Ahorro estimado de '+savingsMoney(savingTarget)+' al mes entre '+sum.covered+' servicios comparables. Las imágenes representan las plataformas contratadas.');
 if(details){
  details.hidden=false;
  const newest=sum.entries.map(e=>e.reference.revisado_el).filter(Boolean).sort().at(-1)||'';
  details.querySelector('p').textContent='Comparamos el precio mensual de contratación directa con lo que pagas en GOXION por los servicios con referencia disponible. Los perfiles, invitaciones y almacenamiento compartido pueden diferir de una suscripción completa; Google One usa como referencia la oferta pública de 2 TB con AI Plus, sin implicar que tu acceso incluya IA. No se incluyen promociones ni anualidades. Tarifas revisadas: '+(newest||'fecha no disponible')+'.';
 }
 if(!savingObserver){showSavingAmount(savingTarget);observeSavings();}
 else if(card.classList.contains('is-visible')&&savingSeen&&Math.abs(savingTarget-savingCurrent)>.01)animateSavings(savingTarget);
 else if(card.classList.contains('is-visible')&&!savingSeen){animateSavings(savingTarget,true);savingSeen=true}
 else if(!card.classList.contains('is-visible')){stopSavingsMotion();savingCurrent=savingTarget;showSavingAmount(savingTarget)}
}
document.addEventListener('visibilitychange',()=>{
 const card=$('gxv-savings');if(!card)return;
 card.dataset.motionPaused=String(document.hidden);
 $('focus-icon').dataset.motionPaused=String(document.hidden);
 document.querySelector('.gxb-wrap').dataset.motionPaused=String(document.hidden);
 if(document.hidden){stopSavingsMotion();savingCurrent=savingTarget;showSavingAmount(savingTarget)}
});
function navigate(name,skipScroll){
 if(name!=='space')wipeServiceSecrets();
 if(!['space','catalog','support'].includes(name))return;
 state.tab=name;
 if(typeof window.switchTab==='function')window.switchTab(name==='space'?'inicio':name==='catalog'?'catalogo':'soporte');
 document.querySelectorAll('#gxn-nav .gxn-tab').forEach(b=>{
  if(b.dataset.gxnTarget===name)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')
 });
 $('gxn-profile-menu').hidden=true;
 if(!skipScroll)window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});
}
window.GOXION_V2_OPEN_OFFICIAL=name=>navigate(name==='catalog'?'catalog':name==='support'?'support':'space');
window.GOXION_V2_GO_SPACE=()=>navigate('space');
window.GOXION_V2_SYNC_TAB=name=>{if(name!=='space')wipeServiceSecrets();state.tab=name};
document.querySelectorAll('#gxn-nav [data-gxn-target]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.gxnTarget)));
$('gxn-profile-trigger').addEventListener('click',()=>{
 const menu=$('gxn-profile-menu'),next=menu.hidden;
 window.GOXION_V2_NOTIFICATIONS?.close();menu.hidden=!next;
 $('gxn-profile-trigger').setAttribute('aria-expanded',String(next));
});
document.addEventListener('pointerdown',e=>{
 if(!e.target.closest('#gxn-profile-trigger,#gxn-profile-menu')){
  $('gxn-profile-menu').hidden=true;$('gxn-profile-trigger').setAttribute('aria-expanded','false');
 }
});
$('gxn-logout').addEventListener('click',()=>{
 $('gxn-profile-menu').hidden=true;state.view=null;
 if(typeof window.cerrarSesion==='function')window.cerrarSesion();
 window.dispatchEvent(new Event('goxion:client-logout'));
});
function currentScroll(){return Math.max(0,window.scrollY||0,document.scrollingElement?.scrollTop||0,document.documentElement.scrollTop||0,document.body.scrollTop||0)}
let lastY=currentScroll(),travel=0,frame=0;
function updateScroll(){
 frame=0;const y=currentScroll(),d=y-lastY;lastY=y;
 if(y<95){$('gxn-nav').dataset.mode='expanded';travel=0;return}
 if(Math.abs(d)>220){$('gxn-nav').dataset.mode=d<0?'expanded':'compact';return}
 if(Math.sign(travel)!==Math.sign(d))travel=d;else travel=Math.max(-100,Math.min(100,travel+d));
 if(d>0&&y>150&&travel>32){$('gxn-nav').dataset.mode='compact';travel=0}
 if(d<0&&travel< -26){$('gxn-nav').dataset.mode='expanded';travel=0}
}
const scheduleScroll=()=>{if(!frame)frame=requestAnimationFrame(updateScroll)};
window.addEventListener('scroll',scheduleScroll,{passive:true});
document.addEventListener('scroll',scheduleScroll,{passive:true,capture:true});
window.visualViewport?.addEventListener('scroll',scheduleScroll,{passive:true});
function mountGoxy(){
 const host=$('gxn-goxy-slot');if(!host||reduced())return;
 const mount=()=>{try{if(!window.GOXY_ROBOT?.mount)return;const observer=new MutationObserver(()=>{if(host.childElementCount){$('gxn-avatar').classList.add('gxn-robot-ready');observer.disconnect()}});observer.observe(host,{childList:true,subtree:true});window.GOXY_ROBOT.mount(host);if(host.childElementCount){$('gxn-avatar').classList.add('gxn-robot-ready');observer.disconnect()}}catch(_){/* El fallback original sigue visible. */}};
 if(window.GOXY_ROBOT?.mount){mount();return}
 const s=document.createElement('script');s.async=true;s.src='./preview/goxion-ai/goxy-heads.bundle.js';s.onload=mount;document.head.append(s);
}
function renderClient(){renderHero();renderBenefits();renderServices();drawHistory();renderSavings()}
async function refreshClient(){
 if(!state.view||document.hidden)return;
 if(state.refreshing){state.refreshAgain=true;return}
 state.refreshing=true;const current=TOKEN(),id=state.view.cliente.id,revision=benefitRevision;
 try{const next=await data.restore(current);if(TOKEN()!==current||!next||next.cliente.id!==id)return;
  if(revision!==benefitRevision){state.refreshAgain=true;return}
  state.view=next;renderClient()}
 catch(_){/* Mantener el último estado verificado; no inventar pagos. */}
 finally{state.refreshing=false;if(state.refreshAgain){state.refreshAgain=false;queueMicrotask(()=>void refreshClient())}}
}
$('focus-icon').dataset.motionPaused=String(document.hidden);
 document.querySelector('.gxb-wrap').dataset.motionPaused=String(document.hidden);
 $('gxv-savings').dataset.motionPaused=String(document.hidden);
 setupBenefits();bindOfficialMissionReceipts();mountGoxy();
document.addEventListener('goxion:prorroga-activada',()=>void refreshClient());
let realtimeTimer=0;
window.addEventListener('goxion:realtime',event=>{if(!['account_state','rewards','referrals','client_state','client_access','cancellations','resync'].includes(event.detail?.scope||''))return;clearTimeout(realtimeTimer);realtimeTimer=setTimeout(()=>void refreshClient(),220)});
window.GOXION_V2_RETRY_FEED=()=>load();
window.addEventListener('goxion:client-ready',()=>{void load()});
window.addEventListener('goxion:client-logout',()=>{wipeServiceSecrets();serviceOperation=null;clearInterval(greetingTimer);greetingTimer=0;stopSavingsMotion();state.view=null;shell.hidden=true;window.GOXION_V2_CLIENT_ID=''});
if(typeof getCurrentClientKey==='function'&&getCurrentClientKey())void load();
// Se conserva Morphicons del laboratorio aprobado; icono SVG nativo si no hay red.
if(!reduced())import('https://esm.sh/morphicons@2.0.2/dom?bundle').then(mod=>{
 if(typeof mod.createMorph==='function')iconHandle=mod.createMorph($('state-path'),paths[$('focus-icon').dataset.icon]||paths.check,{reducedMotion:'user'});
}).catch(()=>{});
setInterval(()=>{if(!document.hidden&&state.view){void refreshClient();void window.GOXION_V2_NOTIFICATIONS?.refresh({realtime:true})}},45000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)wipeServiceSecrets();if(!document.hidden&&state.view){void refreshClient();void window.GOXION_V2_NOTIFICATIONS?.refresh({realtime:true})}});
})();
