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
const state={view:null,prices:[],savings:null,notificationItems:[],tab:'space',lastState:'',activeFilter:'all',showAllHistory:false,openHistory:null,refreshing:false,openService:null,serviceDigest:''};
// Preview protegida: no ejecuta mutaciones comerciales hasta completar la paridad funcional.
const ENABLE_WRITES=false;
const spinner=$('gxi-auth'),shell=$('gxi-shell'),loading=$('gxi-loading');
let iconHandle=null;
function firstName(){return String(state.view?.cliente?.nombre||'Cliente').trim().split(/\s+/)[0]||'Cliente'}
function error(message){const el=$('gxi-login-error');el.textContent=message;el.hidden=false}
function showLogin(message){
 shell.hidden=true;loading.hidden=true;spinner.hidden=false;
 $('gxi-login-button').disabled=false;$('gxi-login-button').textContent='Entrar a Mi Espacio';
 if(message)error(message);
}
const TOKEN=data.takeToken;
async function load(){
 try{
  const view=await data.load();
  if(!view){showLogin();return}
  await showClient(view);
 }catch(e){showLogin('No fue posible verificar tu sesión. Comprueba tu conexión e inténtalo de nuevo.')}
}
$('gxi-login-form').addEventListener('submit',async event=>{
 event.preventDefault();const b=$('gxi-login-button');b.disabled=true;b.textContent='Validando acceso…';
 $('gxi-login-error').hidden=true;
 try{const view=await data.login($('gxi-user').value,$('gxi-pin').value);$('gxi-pin').value='';await showClient(view)}
 catch(e){b.disabled=false;b.textContent='Entrar a Mi Espacio';error(e?.message||'No se pudo iniciar sesión.')}
});
async function showClient(view){
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
 navigate('space',true);
 void loadPrices();
 void window.GOXION_V2_NOTIFICATIONS?.refresh();
}
function heroState(view){
 const c=view.cliente,review=clean(c.pago_revision_estado),st=clean(c.estado),account=view.estado_cuenta||{};
 const accountStatus=clean(account.estado||'');
 if(review.includes('rechaz'))return ['correction','Tu comprobante necesita atención','Revisa la observación','attention','alert'];
 if(review.includes('incomplet'))return ['incomplete','Hay un pago incompleto','Revisa el importe faltante','attention','alert'];
 if(st.includes('suspend'))return ['suspended','Tu servicio está suspendido','Consulta tu situación','attention','alert'];
 if(st.includes('vencid')||accountStatus.includes('vencid'))return ['overdue','Tienes un pago vencido','Consulta tu estado de cuenta','attention','clock'];
 if(c.pago_en_revision===true||review.includes('revision'))return ['review','Estamos revisando tu comprobante','Ya lo recibimos','review','clock'];
 if(account.prorroga_confirmada===true)return ['extension','Tu nueva fecha está registrada','Consulta el acuerdo','agreement','calendar'];
 if(st==='pagado')return ['clear','Todo al corriente','Fecha de pago principal · día '+(Number(c.dia_pago)||15),'calm','check'];
 if((view.servicios||[]).length===0)return ['new','Tu espacio está listo','Explora el catálogo','calm','spark'];
 return ['soon','Revisa tu próximo pago','Fecha principal · día '+(Number(c.dia_pago)||15),'due','calendar'];
}
const paths={alert:'M12 2 22 20H2L12 2z',clock:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18',check:'M4 12l5 5L20 6',calendar:'M5 3v4M19 3v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2',spark:'M12 2v20M2 12h20M5 5l14 14M19 5 5 19'};
function greeting(name,urgent){
 const h=$('greeting'),line=h.querySelector('.greeting-line');line.replaceChildren();
 const phrase='Hola, '+name;
 for(const part of phrase.split(/(\s+)/)){
  if(!part)continue;if(!part.trim()){line.append(document.createTextNode(part));continue}
  const span=document.createElement('span');span.className='word';span.textContent=part;
  if(part.includes(name))span.classList.add('name');line.append(span);
  if(!reduced()&&span.animate)span.animate([{transform:'translateY(70%)',filter:'blur(9px)',opacity:0},{transform:'translateY(0)',filter:'blur(0)',opacity:1}],{duration:640,delay:Math.min(line.childElementCount*50,310),easing:'cubic-bezier(.16,1,.3,1)',fill:'both'});
 }
 h.setAttribute('aria-label',phrase);
}
function renderHero(){
 const s=heroState(state.view),prev=state.lastState;state.lastState=s[0];
 const card=$('focus');card.dataset.state=s[0];card.dataset.tone=s[3];
 const title=$('focus-title');if(title.textContent!==s[1]){
  title.textContent=s[1];
  if(!reduced()&&title.animate)title.animate([{opacity:0,filter:'blur(10px)',transform:'translateY(20px)'},{opacity:1,filter:'blur(0)',transform:'translateY(0)'}],{duration:560,easing:'cubic-bezier(.18,.85,.2,1)'});
 }
 $('focus-meta').textContent=s[2];$('focus-action').textContent=s[0]==='new'?'Ver catálogo':'Ver mi cuenta';
 const icon=$('focus-icon');icon.dataset.icon=s[4];
 const path=$('state-path'),shape=paths[s[4]]||paths.check;
 if(iconHandle){try{iconHandle.morphTo(shape,'smooth')}catch(_){path.setAttribute('d',shape)}}
 else path.setAttribute('d',shape);
 if(prev&&prev!==s[0]&&!reduced()){icon.classList.remove('gx-focus-once');void icon.offsetWidth;icon.classList.add('gx-focus-once')}
 if(!prev||prev!==s[0])greeting(firstName(),['correction','incomplete','suspended','overdue','review'].includes(s[0]));
 const c=state.view.cliente,account=state.view.estado_cuenta;
 $('gxi-account-info').textContent=account?.publicable===true && Number.isFinite(Number(account.total_actual))
 ?'Importe confirmado por GOXION: '+data.money(account.total_actual)+'. Fecha principal de pago: día '+(Number(c.dia_pago)||15)+'.'
 :'Consulta tus movimientos registrados. Cuando el estado de cuenta esté conciliado, GOXION confirmará los importes y fechas de pago.';
 card.setAttribute('aria-label',s[1]+'. '+s[2]+'. '+$('focus-action').textContent);
}
$('focus').addEventListener('click',()=>{
 if(state.lastState==='new'){navigate('catalog');return}
 const box=$('gxi-account');box.hidden=!box.hidden;
 if(!box.hidden)box.scrollIntoView({block:'nearest',behavior:reduced()?'instant':'smooth'});
});
function missionInfo(view){
 const g=view.gamificacion||{};
 const tasks=String(g.tareas||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const version=Number(g.misiones_version||1);
 const doneSet=new Set((view.misiones_progreso||[]).filter(x=>Number(x.misiones_version||1)===version).map(x=>Number(x.mision_index)));
 const done=tasks.filter((x,i)=>doneSet.has(i)).length;
 const claimed=Number(g.cupon_reclamado_ciclo||0)>=Math.max(1,Number(g.cupon_ciclo||1))||g.cupon_reclamado===true;
 return {tasks,doneSet,done,total:tasks.length,ready:tasks.length>0&&done>=tasks.length,claimed,discount:Number(g.descuento||0)};
}
function benefitState(key){
 const v=state.view,c=v.cliente,mi=missionInfo(v),ref=v.referidos?.[0]||null;
 const streak=Math.max(0,Number(c.pagos_puntuales)||0);
 const lost=c.racha_reiniciada_virtual===true||v.gamificacion?.racha_reiniciada_virtual===true;
 if(key==='loyalty'){
  const target=streak<4?4:9,shown=Math.min(streak,target);
  return {label:'Lealtad',num:shown+'/'+target,unit:'pagos seguidos',pct:100*shown/target,meter:true,emoji:lost?'💔':'⭐',
   title:lost?'Tu racha se reinició':'Tu constancia crece',accent:lost?'reinició':'crece',
   copy:lost?'Puedes volver a acumular pagos puntuales para recuperar tu avance.':'Tu constancia se acredita con los pagos confirmados.',
   note:'La racha y sus niveles dependen del estado oficial de lealtad.',progress:shown+' de '+target+' pagos',action:'Mis niveles',phase:lost?'lost':'active'};
 }
 if(key==='referral'){
  const months=Math.max(0,Math.min(3,Number(ref?.meses_efectivos??ref?.meses_override??ref?.meses??0)||0));
  const count=Array.isArray(ref?.servicios)?ref.servicios.length:Number(ref?.plataformas||0);
  const claimed=ref?.beneficio_reclamado===true,ready=!!ref&&!claimed&&count>=2&&months>=3;
  return {label:'Referidos',num:ref?months+'/3':'Invita',unit:ref?'meses válidos':'sin referidos',pct:months/3*100,meter:!!ref&&months>0,
   emoji:claimed?'💝':ready?'🎁':ref?'🎁':'🫂',title:claimed?'Beneficio aplicado':ready?'¡Beneficio desbloqueado!':ref?'Tu invitado avanza':'Invita y gana',
   accent:claimed?'aplicado':ready?'desbloqueado!':ref?'avanza':'gana',
   copy:ref?String(count)+' servicios · '+months+' meses validados.':'Comparte GOXION para comenzar a obtener beneficios.',
   note:'Para acceder al mes gratis se requieren al menos 2 servicios durante 3 meses válidos.',
   progress:months+' de 3 meses',action:claimed?'Ver historial':ready?'Reclamar mes gratis':'Compartir GOXION',
   phase:claimed?'claimed':ready?'ready':ref?'active':'none'};
 }
 return {label:'Misiones',num:mi.total?mi.done+'/'+mi.total:'—',unit:mi.total?'completadas':'sin tareas',pct:mi.total?100*mi.done/mi.total:0,meter:mi.total>0,
   emoji:mi.claimed?'✅':mi.ready?'🏆':'🎯',title:mi.claimed?'Recompensa aplicada':mi.ready?'¡Recompensa disponible!':mi.total?'Tu progreso continúa':'Sin misiones activas',
   accent:mi.claimed?'aplicada':mi.ready?'disponible!':mi.total?'continúa':'activas',
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
function renderBenefits(){
 document.querySelectorAll('#gxb-row .gxb-tile').forEach(tile=>updateMini(tile,benefitState(tile.dataset.gxb)));
 if(!$('gxb-panel').hidden){const key=$('gxb-panel').dataset.benefit;if(key)window.GOXION_V2_UPDATE_PANEL?.(key)}
}
function setBenefitPanel(detail,key){
 const titleNode=$('gxb-title');const full=detail.title,accent=detail.accent;const at=full.lastIndexOf(accent);
 titleNode.replaceChildren(document.createTextNode(full.slice(0,at>=0?at:full.length)));
 if(at>=0){const span=document.createElement('span');span.className='gxb-title-accent';span.textContent=accent;titleNode.append(span,document.createTextNode(full.slice(at+accent.length)))}
 const panel=$('gxb-panel');panel.dataset.benefit=key;panel.dataset.phase=detail.phase;
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
    try{await data.post('mi-espacio',{modo:'reclamar_mes_referido'},TOKEN());await refreshClient();feedback.textContent='Solicitud registrada correctamente.'}
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
    try{await data.post('mi-espacio',{modo:'reclamar_cupon'},TOKEN());await refreshClient();feedback.textContent='Cupón registrado.'}
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
      if(ENABLE_WRITES){await data.post('mi-espacio',{modo:'completar_mision',mision_index:pending},TOKEN());await refreshClient()}
    }catch(e){feedback.textContent='No se pudo completar la actividad.'}
    return;
   }
   feedback.textContent='Esta actividad se valida mediante su acción oficial; aún no se puede marcar desde esta versión.';
  }
 });
}
function logo(name){
 const s=clean(name);
 if(s.includes('netflix'))return '../../logos/netflix.PNG';
 if(s.includes('disney'))return '../../logos/disney.PNG';
 if(s.includes('hbo')||s.includes('max'))return '../../logos/hbo-max.PNG';
 if(s.includes('youtube'))return '../../logos/youtube.PNG';
 if(s.includes('prime')||s.includes('amazon'))return '../../logos/prime-video.PNG';
 if(s.includes('vix'))return '../../logos/vix.PNG';
 if(s.includes('crunchy'))return '../../logos/crunchyroll.PNG';
 if(s.includes('microsoft')||s.includes('365'))return '../../logos/microsoft.PNG';
 if(s.includes('google'))return '../../logos/google-one.PNG';
 return '../../logo2.PNG';
}
function serviceDetail(s){
 const cancel=clean(s.cancelacion?.estado),notice=s.credencial_pendiente||s.novedades?.length;
 if(cancel.includes('solicit'))return ['Cancelación en revisión','pending'];
 if(cancel.includes('aprobad'))return ['Cancelación aprobada','caution'];
 if(cancel.includes('rechaz'))return ['Cancelación no autorizada','danger'];
 if(s.credencial_pendiente)return ['Nueva contraseña','notice'];
 if(notice)return ['Actualización disponible','notice'];
 if((s.accesos||[]).some(a=>clean(a.estado_invitacion).includes('pendiente')))return ['Invitación pendiente','pending'];
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
function renderServices(){
 const v=state.view,services=v.servicios||[];
 const digest=JSON.stringify(services);if(state.serviceDigest===digest)return;
 state.serviceDigest=digest;const host=$('gxs-list');host.replaceChildren();
 $('gxs-count').textContent=services.length+' '+(services.length===1?'plataforma':'plataformas');
 if(!services.length){host.innerHTML='<div class="gxm-empty">Todavía no tienes servicios activos.</div>';return}
 services.forEach((s,index)=>{
  const status=serviceDetail(s),a=Array.isArray(s.accesos)&&s.accesos.length?s.accesos[0]:s;
  const isInvite=clean(a.modo_acceso).includes('invit')||/youtube|microsoft/i.test(s.nombre);
  const email=String(a.correo||s.correo_login||''),profile=String(a.perfil_nombre||s.perfil_nombre||'');
  const pin=String(a.perfil_pin||s.perfil_pin||'');
  const id='gxi-service-'+index,article=document.createElement('article');
  article.className='gxs-card gxc-surface';article.dataset.service=String(s.id||index);article.dataset.tone=status[1];article.dataset.index=String(index);
  const access=(email?accessRow(isInvite?'Correo personal':'Correo',email,'copy',email):'')+
    (profile?accessRow('Perfil',profile):'')+
    (pin?accessRow('PIN de perfil','••••','pin',''):'')+
    (isInvite&&a.estado_invitacion?accessRow('Invitación',invitationLabel(a.estado_invitacion)):'');
  let note='';
  if(s.cancelacion&&['solicitada','aprobada','rechazada'].includes(clean(s.cancelacion.estado)))
   note='<p class="gxs-notice">'+esc(status[0])+' · Tu acceso continúa sujeto a la resolución oficial.</p>';
  else if(s.credencial_pendiente)note='<p class="gxs-notice">Se registró una nueva contraseña. Para consultarla es necesaria la validación oficial de acceso.</p>';
  else if((s.novedades||[]).length)note='<p class="gxs-notice">'+esc(String(s.novedades[0].titulo||'Tienes una novedad disponible'))+'</p>';
  article.innerHTML='<button class="gxs-trigger" type="button" aria-expanded="false" aria-controls="'+id+'" data-gxi-toggle="'+index+'" aria-label="'+esc(s.nombre+', '+status[0])+', abrir detalles">'+
   '<img class="gxs-logo" alt="" src="'+esc(logo(s.nombre))+'" decoding="async" loading="lazy">'+
   '<span class="gxs-summary"><strong class="gxs-name">'+esc(s.nombre)+'</strong><span class="gxs-status">'+esc(status[0])+'</span></span>'+
   '<span class="gxs-icon" aria-hidden="true"><svg class="gxs-chevron" viewBox="0 0 24 24"><path d="m5 9 7 7 7-7"/></svg><svg class="gxs-x" viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"/></svg></span></button>'+
   '<div class="gxs-reveal" id="'+id+'"><div class="gxs-reveal-inner" inert aria-hidden="true"><div class="gxs-body">'+note+
   '<div class="gxs-subtitle">'+(isInvite?'Tu invitación':'Tus accesos')+'</div><div class="gxs-accesslist">'+(access||'<p class="gxi-note">Sin datos de acceso disponibles.</p>')+'</div>'+
   '<div class="gxs-actions"><button class="gxs-pill" type="button" data-gxi-action="options" aria-expanded="false">Más opciones</button>'+
   '<button class="gxs-ghost" type="button" data-gxi-action="support">Soporte</button></div>'+
   '<div class="gxs-more" hidden><button type="button" data-gxi-action="cancel">Gestionar cancelación</button></div>'+
   '<span class="gxs-feedback" role="status" aria-live="polite"></span></div></div></div>';
  if(state.openService===article.dataset.service){article.classList.add('is-open');article.querySelector('.gxs-trigger').setAttribute('aria-expanded','true');const panel=article.querySelector('.gxs-reveal-inner');panel.inert=false;panel.setAttribute('aria-hidden','false')}
  host.append(article);
 });
}
$('gxs-list').addEventListener('click',event=>{
 const tile=event.target.closest('.gxs-card');if(!tile)return;
 const toggle=event.target.closest('[data-gxi-toggle]');
 if(toggle){
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
   const currentService=state.view?.servicios?.[Number(tile.dataset.index)];
   const currentAccess=currentService?.accesos?.[0]||currentService;
   const secret=String(currentAccess?.perfil_pin||currentService?.perfil_pin||'');
   if(!secret){feedback.textContent='El PIN no está disponible para este acceso.';return}
   const node=row.querySelector('.gxs-copy strong');
   const isHidden=node.textContent==='••••';node.textContent=isHidden?secret:'••••';
   action.textContent=isHidden?'Ocultar':'Mostrar';return
  }
 if(kind==='options'){const more=tile.querySelector('.gxs-more');more.hidden=!more.hidden;action.setAttribute('aria-expanded',String(!more.hidden));return}
 if(kind==='support'){navigate('support');return}
 if(kind==='cancel'){
  const s=state.view.servicios[Number(tile.dataset.index)];
  feedback.textContent='La gestión de cancelaciones sigue disponible en el sistema oficial. Este flujo requiere conexión y validación antes de habilitarse en V2.';
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
  const st=clean(p.estado),pending=st.includes('pend')||st.includes('revisi');
  items.push({id:'p-'+p.id,date:p.fecha||p.created_at||'',title:pending?'Pago en revisión':'Pago registrado',subject:p.periodo||'',amount:data.money(p.monto),detail:String(p.estado||'Registrado'),kind:'payment'});
 }
 for(const c of view.cancelaciones||[]){
  const st=clean(c.estado);if(!['efectiva','efectuada','completada','aprobada','rechazada'].includes(st))continue;
  items.push({id:'c-'+c.id,date:c.resuelta_at||c.updated_at||c.created_at||'',title:st==='aprobada'?'Cancelación aprobada':st==='rechazada'?'Cancelación no autorizada':'Baja de servicio registrada',subject:String(c.servicio_nombre||c.nombre||'Servicio'),amount:'',detail:'Estado confirmado: '+String(c.estado),kind:'service'});
 }
 return items.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
}
function drawHistory(){
 const list=$('gxm-list');list.replaceChildren();
 const records=historyRows().filter(x=>state.activeFilter==='all'||(state.activeFilter==='payment'?x.kind==='payment':x.kind==='service'));
 const shown=state.showAllHistory?records:records.slice(0,3);
 if(!shown.length){list.innerHTML='<div class="gxm-empty">No hay movimientos registrados para este filtro.</div>'}
 shown.forEach(item=>{
  const row=document.createElement('div');row.className='gxm-entry';row.dataset.kind=item.kind;
  const b=document.createElement('button');b.type='button';b.className='gxm-entry-button';b.setAttribute('aria-expanded','false');
  b.innerHTML='<span class="gxm-icon" aria-hidden="true">'+(item.kind==='payment'?'✓':'✦')+'</span>'+
   '<span class="gxm-entry-copy"><strong>'+esc(item.title)+'</strong><small>'+esc(dateLabel(item.date)+(item.subject?' · '+item.subject:''))+'</small></span>'+
   '<span class="gxm-entry-value">'+esc(item.amount)+'</span><span class="gxm-arrow gxs-icon" aria-hidden="true">›</span>';
  const detail=document.createElement('p');detail.className='gxm-detail';detail.textContent=item.detail;detail.hidden=true;
  b.addEventListener('click',()=>{
   const was=detail.hidden;list.querySelectorAll('.gxm-detail').forEach(d=>d.hidden=true);
   list.querySelectorAll('.gxm-entry-button').forEach(x=>x.setAttribute('aria-expanded','false'));
   detail.hidden=!was;b.setAttribute('aria-expanded',String(was));
  });
  row.append(b,detail);list.append(row);
 });
 const more=$('gxm-more');more.hidden=records.length<=3;more.textContent=state.showAllHistory?'Mostrar menos':'Ver todos los movimientos';
}
$('gxm-more').addEventListener('click',()=>{state.showAllHistory=!state.showAllHistory;drawHistory()});
$('gxm-filter-toggle').addEventListener('click',()=>{$('gxm-filters').hidden=!$('gxm-filters').hidden;$('gxm-filter-toggle').setAttribute('aria-expanded',String(!$('gxm-filters').hidden))});
$('gxm-filters').addEventListener('click',event=>{
 const b=event.target.closest('[data-gxm-filter]');if(!b)return;
 state.activeFilter=b.dataset.gxmFilter;state.showAllHistory=false;
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
 if(savingObserver||!('IntersectionObserver' in window)){card.classList.add('is-visible');animateSavings(savingTarget,!savingSeen);savingSeen=true;return}
 savingObserver=new IntersectionObserver(entries=>{
  const visible=entries.some(entry=>entry.isIntersecting);
  card.classList.toggle('is-visible',visible);
  if(visible){if(!savingSeen||Math.abs(savingTarget-savingCurrent)>.01){animateSavings(savingTarget,!savingSeen);savingSeen=true}}
 },{threshold:.15});
 savingObserver.observe(card);
}
function renderSavings(){
 const sum=data.savings(state.view,state.prices);state.savings=sum;
 const card=$('gxv-savings'),details=$('gxi-saving-note');
 if(!sum||sum.difference<=0){card.hidden=true;if(details)details.hidden=true;stopSavingsMotion();savingSeen=false;return}
 card.hidden=false;
 savingTarget=sum.difference;
 const signatures=sum.entries.map(e=>String(e.service.id||e.service.nombre)+':'+String(e.reference.clave)).join('|');
 if(signatures!==savingSignature){
  savingSignature=signatures;
  const logos=$('gxv-logos');logos.replaceChildren();logos.dataset.count=String(Math.min(4,sum.entries.length));
  sum.entries.slice(0,4).forEach(e=>{
   const slot=document.createElement('span');slot.className='gxv-slot';
   const img=document.createElement('img');img.src=logo(e.service.nombre);img.alt=e.service.nombre;img.loading='lazy';img.decoding='async';
   slot.append(img);logos.append(slot);
  });
  if(sum.entries.length>4){const more=document.createElement('span');more.className='gxv-more';more.textContent='+'+(sum.entries.length-4);more.setAttribute('aria-label','y '+(sum.entries.length-4)+' plataformas más');logos.append(more)}
 }
 $('gxv-context').textContent='Estimación · '+sum.covered+' de '+sum.total+' '+(sum.total===1?'servicio comparable':'servicios comparables');
 card.setAttribute('aria-label','Ahorro estimado de '+savingsMoney(savingTarget)+' al mes entre '+sum.covered+' servicios comparables.');
 if(details){
  details.hidden=false;
  const newest=sum.entries.map(e=>e.reference.revisado_el).filter(Boolean).sort().at(-1)||'';
  details.querySelector('p').textContent='Comparación orientativa con tarifas mensuales individuales públicas, sin ofertas ni anualidades. Algunos accesos GOXION son perfiles o invitaciones, no cuentas completas equivalentes. Tarifas revisadas: '+(newest||'fecha no disponible')+'.';
 }
 if(!savingObserver)observeSavings();
 else if(card.classList.contains('is-visible')&&savingSeen&&Math.abs(savingTarget-savingCurrent)>.01)animateSavings(savingTarget);
 else if(!savingSeen)showSavingAmount(savingTarget);
}
document.addEventListener('visibilitychange',()=>{
 const card=$('gxv-savings');if(!card)return;
 card.dataset.motionPaused=String(document.hidden);
 if(document.hidden){stopSavingsMotion();savingCurrent=savingTarget;showSavingAmount(savingTarget)}
});
function navigate(name,skipScroll){
 if(!['space','catalog','support'].includes(name))return;
 if(name!=='space'){window.location.assign(new URL('../../ayuda.html',window.location.href).href);return}
 state.tab='space';$('gxi-space').hidden=false;
 document.querySelectorAll('#gxn-nav .gxn-tab').forEach(b=>{
  if(b.dataset.gxnTarget==='space')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
 });
 $('gxn-profile-menu').hidden=true;window.GOXION_V2_NOTIFICATIONS?.close();
 if(!skipScroll)window.scrollTo({top:0,behavior:reduced()?'instant':'smooth'});
}
window.GOXION_V2_OPEN_OFFICIAL=(section)=>navigate(section==='catalog'?'catalog':'support');
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
 data.logout();window.GOXION_V2_CLIENT_ID='';
 window.dispatchEvent(new CustomEvent('goxion:client-space:updated',{detail:{scope:'logout'}}));
 state.view=null;state.prices=[];state.notificationItems=[];
 $('gxi-account').hidden=true;$('gxv-savings').hidden=true;$('gxn-profile-menu').hidden=true;
 $('gxi-user').value='';$('gxi-pin').value='';
 showLogin();
});
let lastY=Math.max(0,scrollY),travel=0,frame=0;
function updateScroll(){
 frame=0;const y=Math.max(0,scrollY),d=y-lastY;lastY=y;
 if(y<95){$('gxn-nav').dataset.mode='expanded';travel=0;return}
 if(Math.abs(d)>220){$('gxn-nav').dataset.mode=d<0?'expanded':'compact';return}
 if(Math.sign(travel)!==Math.sign(d))travel=d;else travel=Math.max(-100,Math.min(100,travel+d));
 if(d>0&&y>150&&travel>32){$('gxn-nav').dataset.mode='compact';travel=0}
 if(d<0&&travel< -26){$('gxn-nav').dataset.mode='expanded';travel=0}
}
window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(updateScroll)},{passive:true});
function mountGoxy(){
 const host=$('gxn-goxy-slot');if(!host||reduced())return;
 const mount=()=>{try{if(!window.GOXY_ROBOT?.mount)return;const observer=new MutationObserver(()=>{if(host.childElementCount){$('gxn-avatar').classList.add('gxn-robot-ready');observer.disconnect()}});observer.observe(host,{childList:true,subtree:true});window.GOXY_ROBOT.mount(host);if(host.childElementCount){$('gxn-avatar').classList.add('gxn-robot-ready');observer.disconnect()}}catch(_){/* El fallback original sigue visible. */}};
 if(window.GOXY_ROBOT?.mount){mount();return}
 const s=document.createElement('script');s.async=true;s.src='../goxion-ai/goxy-heads.bundle.js';s.onload=mount;document.head.append(s);
}
function renderClient(){renderHero();renderBenefits();renderServices();drawHistory();renderSavings()}
async function refreshClient(){
 if(state.refreshing||!state.view||document.hidden)return;
 state.refreshing=true;const current=TOKEN();const id=state.view.cliente.id;
 try{const next=await data.restore(current);if(TOKEN()!==current||next.cliente.id!==id)return;state.view=next;renderClient()}
 catch(_){/* Mantener el último estado verificado; no inventar pagos. */}
 finally{state.refreshing=false}
}
setupBenefits();mountGoxy();load();
// Se conserva Morphicons del laboratorio aprobado; icono SVG nativo si no hay red.
if(!reduced())import('https://esm.sh/morphicons@2.0.2/dom?bundle').then(mod=>{
 if(typeof mod.createMorph==='function')iconHandle=mod.createMorph($('state-path'),paths[$('focus-icon').dataset.icon]||paths.check,{reducedMotion:'user'});
}).catch(()=>{});
setInterval(()=>{if(!document.hidden&&state.view){void refreshClient();void window.GOXION_V2_NOTIFICATIONS?.refresh({realtime:true})}},45000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.view){void refreshClient();void window.GOXION_V2_NOTIFICATIONS?.refresh({realtime:true})}});
})();
