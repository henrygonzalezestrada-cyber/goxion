/* GOXION · Prueba PulsoIcon 6.2.0 (CityPulso, ISC).
 * Dibujos y parámetros originales: packages/core/src/icons. Adaptación WAAPI
 * de las recetas de packages/core/src/recipes.ts, sin framework ni CDN.
 * Licencias completas: ./pulsoicon-LICENSE.txt. Solo historial y centro de notificaciones del espejo.
 * Dirección de diseño: PulsoIcon complementa Morficons; no sustituir morphs,
 * emojis, navegación, campana del encabezado ni funciones aprobadas. Movimientos semánticos,
 * puntuales, sin bucles, con reduced-motion. Futuro (no activado aquí): icono
 * de tarjeta principal solo al tocar directamente el icono; reloj conserva su
 * animación propia. Mantener transición de estado de Morficons por separado. */
(function(){
'use strict';
const DATA={"circle-check":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.05,"o":[12,12]}],["path",{"d":"m16 9-5.5 5.5L8 12"},{"r":"draw","d":0.1,"o":[12,11.75]}]]},"clock":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.04,"o":[12,12]}],["path",{"d":"M12 6v6l4 2"},{"r":"spin","a":360,"o":[12,12]}]]},"circle-x":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"spin","a":90,"o":[12,12]}],["path",{"d":"m15 9-6 6"},{"r":"draw","d":0.15,"o":[12,12]}],["path",{"d":"m9 9 6 6"},{"r":"draw","d":0.25,"o":[12,12]}]]},"receipt-text":{"nodes":[["path",{"d":"M13 16H8"},{"r":"growX","d":0.17,"o":[8,12]}],["path",{"d":"M14 8H8"},{"r":"growX","d":0.05,"o":[8,12]}],["path",{"d":"M16 12H8"},{"r":"growX","d":0.11,"o":[8,12]}],["path",{"d":"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"},{"r":"jelly","a":0.05,"o":[12,22]}]]},"circle-minus":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.06,"o":[12,12]}],["path",{"d":"M8 12h8"},{"r":"growX","d":0.1,"o":[12,12]}]]},"refresh-cw":{"nodes":[["path",{"d":"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M21 3v5h-5"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M8 16H3v5"},{"r":"spin","a":360,"o":[12,12]}]]},"circle-plus":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.05,"o":[12,12]}],["path",{"d":"M8 12h8"},{"r":"spin","d":0.1,"a":90,"o":[12,12]}],["path",{"d":"M12 8v8"},{"r":"spin","d":0.1,"a":90,"o":[12,12]}]]},"gift":{"nodes":[["path",{"d":"M12 7v14"},{"r":"press","d":0.1,"a":0.05,"o":[12,21]}],["path",{"d":"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"},{"r":"press","d":0.1,"a":0.05,"o":[12,21]}],["path",{"d":"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"},{"r":"lift","o":[12,4.5]}],["rect",{"x":"3","y":"7","width":"18","height":"4","rx":"1"},{"r":"lift","d":0.05,"o":[12,9]}]]},"check-check":{"nodes":[["path",{"d":"M18 6 7 17l-5-5"},{"r":"draw","o":[10,11.5]}],["path",{"d":"m22 10-7.5 7.5L13 16"},{"r":"draw","d":0.2,"o":[17.5,13.75]}]]},"trash":{"nodes":[["path",{"d":"M10 11v6"},{"r":"press","d":0.05,"a":0.05,"o":[12,22]}],["path",{"d":"M14 11v6"},{"r":"press","d":0.05,"a":0.05,"o":[12,22]}],["path",{"d":"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"},{"r":"press","d":0.05,"a":0.05,"o":[12,22]}],["path",{"d":"M3 6h18"},{"r":"lift","a":-12,"o":[3,6]}],["path",{"d":"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"},{"r":"lift","a":-12,"o":[3,6]}]]},"file-text":{"nodes":[["path",{"d":"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"},{"r":"press","a":0.04,"o":[12,22]}],["path",{"d":"M14 2v5a1 1 0 0 0 1 1h5"},{"r":"fold","o":[17,5]}],["path",{"d":"M10 9H8"},{"r":"growX","d":0.1,"o":[8,13]}],["path",{"d":"M16 13H8"},{"r":"growX","d":0.16,"o":[8,13]}],["path",{"d":"M16 17H8"},{"r":"growX","d":0.22,"o":[8,13]}]]},"bell":{"nodes":[["path",{"d":"M10.268 21a2 2 0 0 0 3.464 0"},{"r":"slide","d":0.08,"x":1,"a":1.5,"o":[12,21.5]}],["path",{"d":"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"},{"r":"ring","a":16,"o":[12,3]}]]}};
// Reutiliza el nodo check original, sin el círculo (el botón y el marcador ya lo tienen).
DATA.check={nodes:[['path',DATA['circle-check'].nodes[1][1],{...DATA['circle-check'].nodes[1][2],d:0}]]};
const ns='http://www.w3.org/2000/svg', motion=matchMedia('(prefers-reduced-motion: reduce)');
const active=new WeakMap();
const recipes={
 ring:({a=14})=>[700,[0,-a,a*.85,-a*.55,a*.3,0].map(v=>({transform:'rotate('+v+'deg)'}))],
 slide:({x=0,y=0,a=2.5})=>[500,[0,1,0].map(v=>({transform:'translate('+x*a*v+'px,'+y*a*v+'px)'}))],
 lift:({x=0,y=-1,a=0})=>[550,[0,1,0].map(v=>({transform:'translate('+x*2.5*v+'px,'+y*2.5*v+'px) rotate('+a*v+'deg)'}))],
 press:({a=.15})=>[400,[1,1-a,1.05,1].map(v=>({transform:'scale('+v+')'}))],
 pop:({a=.25})=>[450,[0,1+a,1].map((v,i)=>({transform:'scale('+v+')',opacity:i?1:0}))],
 spin:({a=360})=>[800,[0,a].map(v=>({transform:'rotate('+v+'deg)'}))],
 draw:()=>[550,[{strokeDashoffset:1,opacity:0},{strokeDashoffset:0,opacity:1}]],
 beat:({a=.16})=>[650,[1,1+a,1-a*.3,1+a*.6,1].map(v=>({scale:String(v)}))],
 shake:({a=1.5})=>[500,[0,-a,a,-a*.6,a*.6,0].map(v=>({transform:'translateX('+v+'px)'}))],
 fold:()=>[600,[1,-1,1].map(v=>({transform:'scaleY('+v+')'}))],
 growX:()=>[450,[{transform:'scaleX(0)'},{transform:'scaleX(1)'}]],
 jelly:({a=.18})=>[700,[1,1+a,1-a*.6,1+a*.3,1].map((x,i)=>({transform:'scale('+x+','+[1,1-a,1+a*.6,1-a*.3,1][i]+')'}))]
};
function animate(el,m){
 if(motion.matches||document.hidden||!el?.animate||!m||!recipes[m.r])return;
 active.get(el)?.cancel();
 const [duration,frames]=recipes[m.r](m);
 if(m.r==='draw'){el.setAttribute('pathLength','1');el.style.strokeDasharray='1 1';el.style.strokeDashoffset='0'}
 if(el.namespaceURI===ns){el.style.transformBox='view-box';el.style.transformOrigin=(m.o||[12,12]).map(v=>v+'px').join(' ')}
 const a=el.animate(frames,{duration,delay:(m.d||0)*1000,easing:'ease-in-out',fill:'none'});
 active.set(el,a);
}
function install(host,name){
 if(!host)return null;
 const prior=host.querySelector('svg[data-gx-pulso]');
 if(prior?.dataset.gxPulso===name)return prior;
 const original=host.querySelector('svg');
 const svg=document.createElementNS(ns,'svg');
 for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'24',height:'24',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false'}))svg.setAttribute(k,v);
 svg.dataset.gxPulso=name;svg.style.overflow='visible';svg.style.pointerEvents='none';svg.style.display='block';
 if(original){svg.setAttribute('class',original.getAttribute('class')||'');}
 for(const [tag,attrs] of DATA[name].nodes){const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);svg.append(el)}
 if(original)original.replaceWith(svg);else host.replaceChildren(svg);
 return svg;
}
function play(svg){if(!svg)return;const name=svg.dataset.gxPulso;DATA[name]?.nodes.forEach((n,i)=>animate(svg.children[i],n[2]))}
// API local acotada a la confirmación de cancelación/retención del candidato.
window.GOXION_PULSO_CANCEL=Object.freeze({play(svg){if(svg?.dataset.gxPulso==='check')play(svg)}});
// Tarjeta inteligente: reutiliza los mismos iconos canónicos de Historial.
window.GOXION_PULSO_HERO=Object.freeze({
 prepare(host,kind){if(host?.matches('#gx-v2-feed .gx-state-art'))install(host,kind==='resolved'?'circle-check':'circle-minus')},
 play(host,kind){if(host?.matches('#gx-v2-feed .gx-state-art'))play(install(host,kind==='resolved'?'circle-check':'circle-minus'))}
});
// Confirmación de carrito: sólo la superficie de éxito, tras respuesta positiva.
window.GOXION_PULSO_CART=Object.freeze({
 confirm(host){if(host?.matches('#gx-cart-success .gx-cart-check'))play(install(host,'circle-check'));},
 prepareTrash(host){if(host?.matches('#gx-cart-dialog .gx-cart-remove'))install(host,'trash');},
 playTrash(host){if(host?.matches('#gx-cart-dialog .gx-cart-remove'))play(install(host,'trash'));}
});
// Historial: no reemplazar ni escuchar iconos fuera de este contenedor.
const list=document.getElementById('gxm-list');
const byKind={payment:'receipt-text',cancellation:'circle-minus',renewal:'refresh-cw',acquisition:'circle-plus',benefit:'gift'};
const byPayment={approved:'circle-check',pending:'clock',rejected:'circle-x',registered:'receipt-text'};
function history(){
 list?.querySelectorAll('.gxm-entry').forEach(row=>{
  const host=row.querySelector('.gxm-icon');if(!host)return;
  const kind=row.dataset.kind,status=row.dataset.movementStatus;
  const name=kind==='payment'?(byPayment[status]||byKind.payment):byKind[kind];
  if(!name)return;
  install(host,name);
  if(kind==='payment')host.style.color=status==='approved'?'':status==='pending'?'#e7bd7f':status==='rejected'?'#e8a6ad':'#a8d4dd';
 });
}
if(list){
 new MutationObserver(history).observe(list,{childList:true,subtree:true});
 history();
 list.addEventListener('click',e=>{
  const button=e.target.closest('.gxm-entry-button');
  if(button?.getAttribute('aria-expanded')==='true')play(button.querySelector('svg[data-gx-pulso]'));
 });
}

// Centro de notificaciones: presentación y gestos; sin acceso a datos ni mutación de acciones oficiales.
const wired=new WeakSet();
function wireSheet(){
 const sheet=document.getElementById('gx-client-notif-sheet');
 if(!sheet||wired.has(sheet))return;
 wired.add(sheet);sheet.classList.add('gx-v2-resizable');
 const handle=sheet.querySelector('.gx-client-notif-handle'),items=sheet.querySelector('#gx-client-notif-list');
 const toolbar=sheet.querySelector('.gx-client-notif-toolbar');
 if(!handle||!items||!toolbar)return;
 let level=1,inboxLevel=1,drag=null,lastPointerEnd=-Infinity;
 // Existing controller accounts for browser chrome in bottom position. Height uses visible viewport only.
 const heights=()=>{const v=window.visualViewport?.height||window.innerHeight;const max=Math.max(100,Math.min(800,v-28));return [Math.min(max,Math.max(150,v*.43)),Math.min(max,Math.max(190,v*.71)),max]};
 function setHeight(px){sheet.style.setProperty('--gx-v2-sheet-height',Math.round(px)+'px')}
 function snap(n){level=Math.max(0,Math.min(2,n));setHeight(heights()[level]);handle.setAttribute('aria-valuenow',String(level));handle.setAttribute('aria-valuetext',['Compacta','Intermedia','Ampliada'][level])}
 handle.setAttribute('role','slider');handle.tabIndex=0;handle.setAttribute('aria-label','Altura del centro de notificaciones');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-valuemin','0');handle.setAttribute('aria-valuemax','2');
 snap(level);
 handle.addEventListener('pointerdown',e=>{
  if(!sheet.classList.contains('show')||e.button!==0||drag)return;
  drag={id:e.pointerId,y:e.clientY,height:sheet.getBoundingClientRect().height,moved:false};
  try{handle.setPointerCapture?.(e.pointerId)}catch(_){}sheet.classList.add('gx-v2-sheet-dragging');
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dy=drag.y-e.clientY;if(Math.abs(dy)>5)drag.moved=true;
  if(drag.moved){const s=heights();setHeight(Math.max(s[0],Math.min(s[2],drag.height+dy)))}
 });
 function end(e,cancel=false){
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag;drag=null;if(handle.hasPointerCapture?.(e.pointerId))try{handle.releasePointerCapture(e.pointerId)}catch(_){}if(sheet.classList.contains('gx-v2-sheet-dragging'))sheet.classList.remove('gx-v2-sheet-dragging');
  lastPointerEnd=performance.now();
  if(cancel){snap(level);return}
  if(d.moved){const delta=d.y-e.clientY,now=d.height+delta,s=heights();let n=s.reduce((best,x,i)=>Math.abs(x-now)<Math.abs(s[best]-now)?i:best,0);if(Math.abs(delta)>25&&n===level)n=level+(delta>0?1:-1);snap(n)}
  else snap(level===2?1:2);
 }
 handle.addEventListener('pointerup',e=>end(e));handle.addEventListener('pointercancel',e=>end(e,true));handle.addEventListener('lostpointercapture',e=>end(e,true));
 // Pointerup handles both a tap and a drag. Do not rely on Safari/Chrome's delayed synthetic click.
 handle.addEventListener('click',e=>{if(e.detail===0&&performance.now()-lastPointerEnd>450)snap(level===2?1:2)});
 handle.addEventListener('keydown',e=>{const n={ArrowUp:level+1,ArrowDown:level-1,Home:0,End:2,Enter:level===2?1:2,' ':level===2?1:2}[e.key];if(n!==undefined){e.preventDefault();snap(n)}});
 // K3: the ORIGINAL height owner also fits settings/tutorial content, preserving its own slider.
 // Observe intrinsic content, not the height of the drawer: manual resizing must never trigger a new auto-snap.
 let wasOpen=sheet.classList.contains('show'),wasSettings=false,fitFrame=0,observedPanel=null;
 function fitSettings(){
  fitFrame=0;
  if(drag||!sheet.classList.contains('show')||!sheet.classList.contains('gx-k3-settings-open'))return;
  const panel=sheet.querySelector('.gx-push-pilot:not([hidden])');
  const content=panel?.querySelector('[data-settings]:not([hidden]),[data-guide]:not([hidden])');
  if(!content)return;
  const style=getComputedStyle(panel),header=sheet.querySelector('.gx-client-notif-head');
  const needed=Math.ceil(content.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+header.getBoundingClientRect().height+handle.getBoundingClientRect().height+10);
  const sizes=heights(),fitting=sizes.findIndex(h=>h>=needed);
  snap(fitting<0?2:Math.max(1,fitting));
 }
 function queueFit(){if(!fitFrame)fitFrame=requestAnimationFrame(fitSettings)}
 const contentObserver=new ResizeObserver(queueFit);
 function bindSettingsContent(){
  const panel=sheet.querySelector('.gx-push-pilot');
  if(!panel||panel===observedPanel)return;
  observedPanel=panel;contentObserver.disconnect();
  panel.querySelectorAll('[data-settings],[data-guide]').forEach(el=>contentObserver.observe(el));
 }
 const resize=()=>{if(!drag){snap(level);if(wasSettings)queueFit()}};
 window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});
 new MutationObserver(()=>{
  bindSettingsContent();
  const open=sheet.classList.contains('show'),settings=open&&sheet.classList.contains('gx-k3-settings-open');
  if(!open&&wasOpen){const id=drag?.id;drag=null;if(id!==undefined&&handle.hasPointerCapture?.(id))try{handle.releasePointerCapture(id)}catch(_){}sheet.classList.remove('gx-v2-sheet-dragging');inboxLevel=1;snap(1)}
  if(open&&!wasOpen)hideNudge();
  if(open&&settings!==wasSettings){if(settings){inboxLevel=level;queueFit()}else snap(inboxLevel)}
  wasOpen=open;wasSettings=settings;
 }).observe(sheet,{attributes:true,attributeFilter:['class'],childList:true});
 bindSettingsContent();if(wasOpen&&sheet.classList.contains('gx-k3-settings-open')){wasSettings=true;queueFit()}
 const read=install(toolbar.querySelector('#gx-client-notif-mark-all'),'check-check'),clear=install(toolbar.querySelector('#gx-client-notif-clear-all'),'trash');
 let armed='';
 new MutationObserver(()=>{const next=toolbar.classList.contains('gx-confirm-read')?'read':toolbar.classList.contains('gx-confirm-clear')?'clear':'';if(next&&next!==armed)play(next==='read'?read:clear);armed=next}).observe(toolbar,{attributes:true,attributeFilter:['class']});
 function decorate(){
  items.querySelectorAll('.gx-client-notif-item').forEach(item=>{
   if(item.querySelector('.gx-v2-notif-glyph'))return;
   const title=item.querySelector('strong')?.textContent?.toLowerCase()||'',action=item.querySelector('[data-gx-notif-action]')?.dataset.gxNotifAction;
   let name='bell',tone='neutral';
   if(action==='legal'||/términos|políticas/.test(title)){name='file-text';tone='purple'}
   else if(/pago acreditado|pago aprobado/.test(title)){name='circle-check';tone='green'}
   else if(/rechazad/.test(title)){name='circle-x';tone='red'}
   else if(/cancelaci|baja de servicio/.test(title)){name='circle-minus';tone='amber'}
   else if(/renovaci/.test(title)){name='refresh-cw';tone='purple'}
   else if(/comprobante|reporte de pago|en revisión/.test(title)){name='receipt-text';tone='cyan'}
   else if(/recompensa|beneficio|cupón/.test(title)){name='gift';tone='purple'}
   const host=document.createElement('span');host.className='gx-v2-notif-glyph';host.dataset.tone=tone;host.setAttribute('aria-hidden','true');item.prepend(host);install(host,name);
  });
 }
 new MutationObserver(()=>{decorate();queueNudge()}).observe(items,{childList:true});decorate();queueNudge();
 items.addEventListener('click',e=>{const item=e.target.closest('.gx-client-notif-item');if(item&&!e.target.closest('button'))play(item.querySelector('.gx-v2-notif-glyph svg'))},true);
}
// Smart contextual bell: real unread notifications, at most one cue per account visit.
// No automatic opening, no changes to read status, no external analytics.
let nudgeTimer=0,nudgeHideTimer=0,nudgeRingTimer=0,nudgeAccount='',shownVisit=false,nudgeNode=null;
const seenFallback=new Map();
function currentAccount(){try{return String(typeof getCurrentClientKey==='function'?getCurrentClientKey()||'':'')}catch(_){return ''}}
function hideNudge(){clearTimeout(nudgeHideTimer);if(nudgeNode){nudgeNode.remove();nudgeNode=null}const bell=document.getElementById('gxn-bell');bell?.classList.remove('gx-v2-nudge-ring')}
function accountChanged(){const key=currentAccount();if(key!==nudgeAccount){hideNudge();nudgeAccount=key;shownVisit=false}return key}
function keyFor(account){let n=2166136261;for(const x of account){n^=x.charCodeAt(0);n=Math.imul(n,16777619)}return 'gx-v2-notif-cues-'+(n>>>0).toString(36)}
function seenFor(account){try{const a=JSON.parse(localStorage.getItem(keyFor(account))||'[]');if(Array.isArray(a))return a.filter(x=>Array.isArray(x)&&Date.now()-x[1]<14*864e5)}catch(_){}return seenFallback.get(account)||[]}
function remember(account,id){const a=[...seenFor(account).filter(x=>x[0]!==id),[id,Date.now()]].slice(-40);seenFallback.set(account,a);try{localStorage.setItem(keyFor(account),JSON.stringify(a))}catch(_){}}
function queueNudge(){clearTimeout(nudgeTimer);nudgeTimer=setTimeout(showNudge,1200)}
function showNudge(){
 const account=accountChanged(),bell=document.getElementById('gxn-bell'),sheet=document.getElementById('gx-client-notif-sheet');
 if(!account||shownVisit||document.hidden||!document.body.classList.contains('gx-v2-private-visible')||document.body.classList.contains('gx-v2-handoff-active')||sheet?.classList.contains('show')||!bell||bell.disabled)return;
 if(document.querySelector('.modal.show,dialog[open],.gx-legal-consent[open],#gx-legal-access-shell:not([hidden])'))return;
 const parent=bell.parentElement;if(!parent)return;
 const seen=new Set(seenFor(account).map(x=>x[0]));
 const candidates=[...document.querySelectorAll('#gx-client-notif-list .gx-client-notif-item.unread')].map(item=>{
  const t=item.querySelector('strong')?.textContent||'',title=t.toLowerCase(),date=item.querySelector('.gx-client-notif-time')?.textContent||'',action=item.querySelector('[data-gx-notif-action]');
  const critical=!!action&&(/rechazad|requiere atención|aclaración|pendiente de decisión|acción requerida|vencid/.test(title)||action.dataset.gxNotifAction==='legal');
  const relevant= /pago acreditado|pago aprobado|cancelación (completada|aprobada|efectiva)|prórroga (aprobada|rechazada)|solicitud (resuelta|aprobada|rechazada)|renovación confirmada/.test(title);
  const fresh=date==='ahora'||/^hace \d+ (min|h)$/.test(date)||/^hace [12] d$/.test(date);
  const id=item.dataset.gxNotifSource+':'+item.dataset.gxNotifId;
  return {item,action,critical,relevant,fresh,id};
 }).filter(x=>x.fresh&&(x.critical||x.relevant)&&!seen.has(x.id)&&x.item.dataset.gxNotifId).sort((a,b)=>Number(b.critical)-Number(a.critical));
 const hit=candidates[0];if(!hit)return;
 shownVisit=true;remember(account,hit.id);
 const node=document.createElement('div');node.className='gx-v2-notif-nudge';node.dataset.tone=hit.critical?'attention':'relevant';node.setAttribute('role','group');node.setAttribute('aria-label','Aviso de notificaciones');
 const title=document.createElement('strong');title.textContent=hit.critical?'Requiere tu atención':'Tienes novedades';
 const copy=document.createElement('span');copy.textContent=hit.critical?'Hay una actualización de tu cuenta que requiere revisión.':'Hay información nueva sobre tu cuenta.';
 const action=document.createElement('button');action.type='button';action.className='gx-v2-nudge-action';action.textContent='Revisar ahora ›';
 const close=document.createElement('button');close.type='button';close.className='gx-v2-nudge-close';close.setAttribute('aria-label','Ocultar aviso');close.textContent='×';
 action.addEventListener('click',()=>{hideNudge();if(hit.critical){const row=[...document.querySelectorAll('#gx-client-notif-list .gx-client-notif-item')].find(x=>x.dataset.gxNotifSource+':'+x.dataset.gxNotifId===hit.id);const target=row?.querySelector('[data-gx-notif-action]');if(target){target.click();return}}bell.click()});
 close.addEventListener('click',hideNudge);node.append(title,copy,action,close);parent.append(node);nudgeNode=node;
 if(!motion.matches){bell.classList.add('gx-v2-nudge-ring');clearTimeout(nudgeRingTimer);nudgeRingTimer=setTimeout(()=>bell.classList.remove('gx-v2-nudge-ring'),900)}
 nudgeHideTimer=setTimeout(hideNudge,9500);
}
wireSheet();
new MutationObserver(wireSheet).observe(document.body,{childList:true});
window.addEventListener('goxion:v2-feed:rendered',queueNudge);
window.addEventListener('goxion:client-ready',()=>{accountChanged();queueNudge()});
window.addEventListener('goxion:client-logout',()=>{clearTimeout(nudgeTimer);hideNudge();nudgeAccount='';shownVisit=false});
document.getElementById('gxn-bell')?.addEventListener('click',hideNudge);
document.addEventListener('visibilitychange',()=>{if(document.hidden)hideNudge();else queueNudge()});
new MutationObserver(()=>{if(!document.body.classList.contains('gx-v2-private-visible'))hideNudge();else if(!document.body.classList.contains('gx-v2-handoff-active')&&!shownVisit)queueNudge()}).observe(document.body,{attributes:true,attributeFilter:['class']});
// Estado legal: solo presentación de la etiqueta existente, sin alterar su acción.
const legal=document.getElementById('view-dashboard');
function footerStatus(){const status=document.querySelector('#gx-legal-status .gx-legal-review');if(status){const t=status.textContent.toLowerCase();status.dataset.tone=t.includes('pendiente')?'pending':t.includes('rechazado')?'rejected':t.includes('aceptado')?'accepted':'neutral'}}
if(legal){new MutationObserver(footerStatus).observe(legal,{childList:true,subtree:true,characterData:true});footerStatus()}
})();