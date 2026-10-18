/* E1/B1 · Real Ayuda gamification mirror, synthetic data and no redemption.
 * Uses Ayuda's gamification-grid, gx-gamif-card and expanded-container.
 * Mission navigation is local and never changes financial or mission state.
 */
(()=>{
 'use strict';
 if(!document.documentElement.hasAttribute('data-gx-smart-beta'))return;
 const $=id=>document.getElementById(id);
 const demo={
  names:['Explorar Mi Espacio','Consultar tus servicios','Revisar la misión pendiente'],
  known:[true,true,false]
 };
 let expanded='',currentKey='';
 const node=(tag,cls,text)=>{
  const n=document.createElement(tag); if(cls)n.className=cls;
  if(text!==undefined)n.textContent=text;
  return n;
 };
 function action(message){
  const tip=$('gx-smart-toast');if(!tip)return;
  tip.textContent=message;tip.hidden=false;
  window.setTimeout(()=>{if(tip.textContent===message)tip.hidden=true},2900);
 }
 function open(which,scroll){
  const grid=$('gamif-grid'),mission=$('gamif-expanded-coupon'),ref=$('gamif-expanded-referral');
  if(!grid||!mission||!ref)return;
  expanded=which;
  grid.hidden=true;mission.hidden=which!=='coupon';ref.hidden=which!=='referral';
  if(scroll){(which==='coupon'?mission:ref).scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'})}
 }
 function close(){
  const grid=$('gamif-grid'),mission=$('gamif-expanded-coupon'),ref=$('gamif-expanded-referral');
  if(!grid)return;
  expanded='';grid.hidden=false;mission.hidden=true;ref.hidden=true;
 }
 function createCard(type,progress,done,total){
  const mission=type==='coupon';
  const card=node('button','gamif-btn gx-gamif-card '+(mission?'gx-gamif-card-mission':'gx-gamif-card-ref'));
  card.type='button';
  card.id=mission?'gx-smart-mission-card':'gx-smart-referral-card';
  card.setAttribute('aria-label',mission?'Abrir misiones de ejemplo':'Abrir programa de referidos de ejemplo');
  card.dataset.watermark=mission?'🎯':'🎁';
  const head=node('div','gx-gamif-card-top');
  head.append(node('span','gx-gamif-card-kicker',mission?'MISIONES GOXION':'REFERIDOS'));
  card.append(head,node('div','gamif-title',mission?'Tu progreso':'Invita y gana'));
  card.append(node('div','gx-gamif-card-status',mission?(done>=total?'Misiones completadas':done+' de '+total+' completadas'):'Empieza a referir'));
  card.append(node('div','gx-gamif-card-meta',mission?'Abre para revisar tus tareas':'Comparte GOXION y conoce sus beneficios'));
  const bar=node('div','gx-gamif-progress');
  bar.setAttribute('aria-label',mission?'Progreso de misiones: '+progress+'%':'Progreso de referidos: 0%');
  const fill=node('span');fill.style.width=progress+'%';bar.append(fill);
  card.append(bar);
  card.addEventListener('click',()=>open(type,true));
  return card;
 }
 function createExpanded(which,done,total){
  const coupon=which==='coupon';
  const pane=node('section','gamif-expanded-container'+(coupon?'':' slide-left'));
  pane.id=coupon?'gamif-expanded-coupon':'gamif-expanded-referral';pane.hidden=true;
  const head=node('div','gx-gamif-expanded-head');
  const back=node('button','btn-gamif-close','← Volver');
  back.type='button';back.addEventListener('click',close);
  head.append(back,node('span','gx-gamif-expanded-kicker','GOXION REWARDS'));
  pane.append(head);
  const summary=node('div','gx-smart-gamif-summary');
  summary.append(node('div','gx-gamif-shared-emoji',''+(coupon?'🎯':'🎁')));
  summary.append(node('strong','gx-smart-gamif-summary-title',coupon?'Tus misiones':'Invita y gana'));
  summary.append(node('p','gx-smart-gamif-summary-copy',coupon?
   done>=total?'Tus tres tareas de esta simulación están completas. No se ha generado un cupón.':
   'Tienes una tarea pendiente. Revisa cuál es y cómo continuar.':
   'Esta sección comparte el aspecto de Referidos de Ayuda. No hay un referido real conectado.'));
  pane.append(summary);
  if(coupon){
   for(let i=0;i<total;i++){
    const complete=i<done;
    const row=node('div','mission-item gx-smart-mission-row'+(complete?' done':''));
    const marker=node('span','mission-checkbox',complete?'✓':'');
    row.append(marker,node('span','gx-mission-text',demo.names[i]||'Actividad de ejemplo'));
    if(!complete)row.append(node('span','gx-smart-mission-pending','Pendiente'));
    pane.append(row);
   }
   if(done<total){
    const how=node('button','gx-smart-mission-guide','Ver cómo completar');
    how.type='button';how.addEventListener('click',()=>action('En Ayuda abrirías la tarea real. Esta beta no completa misiones ni entrega cupones.'));
    pane.append(how);
   }else pane.append(node('p','gx-smart-gamif-summary-copy','Ejemplo de avance; no representa un beneficio emitido.'));
  }else pane.append(node('p','gx-smart-gamif-summary-copy','Esta demostración no lee tus referidos ni genera promociones.'));
  return pane;
 }
 function render(){
  const source=window.GOXION_SMART_BETA;
  if(!source)return;
  const key=source.getScenario();
  const ref=$('referral-section-container');if(!ref)return;
  currentKey=key;expanded='';ref.replaceChildren();
  const fake={
    upcoming:{done:2,total:3},multi:{done:1,total:3},review:{done:1,total:3},
    correction:{done:1,total:3},overdue:{done:2,total:3},
    extension:{done:2,total:3},mission:{done:2,total:3},clear:{done:3,total:3}
  }[key];
  if(!fake)return;
  const {done,total}=fake,percent=Math.round(done/total*100);
  const grid=node('div','gamification-grid');grid.id='gamif-grid';
  grid.append(createCard('referral',0,done,total),createCard('coupon',percent,done,total));
  ref.append(grid,createExpanded('referral',done,total),createExpanded('coupon',done,total));
  if(key==='mission'){
   const card=$('gx-smart-mission-card');
   card.classList.add('gx-smart-mission-cue');
   card.setAttribute('aria-description','Toca para abrir el detalle de las misiones pendientes');
  }
 }
 function openMission(){
  if(!$('gx-smart-mission-card'))return false;
  open('coupon',true);
  return true;
 }
 document.addEventListener('gx-smart-case-rendered',render);
 render();
 window.GOXION_SMART_MISSIONS=Object.freeze({isolated:true,open:openMission,getScenario:()=>currentKey});
})();