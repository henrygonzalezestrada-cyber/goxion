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
// Únicamente historial: no reemplazar ni escuchar ningún icono fuera de este contenedor.
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
 let level=1,drag=null,skipClick=false;
 // Existing controller accounts for browser chrome in bottom position. Height uses visible viewport only.
 const heights=()=>{const v=window.visualViewport?.height||window.innerHeight;const max=Math.max(100,Math.min(800,v-28));return [Math.min(max,Math.max(150,v*.43)),Math.min(max,Math.max(190,v*.71)),max]};
 function setHeight(px){sheet.style.setProperty('--gx-v2-sheet-height',Math.round(px)+'px')}
 function snap(n){level=Math.max(0,Math.min(2,n));setHeight(heights()[level]);handle.setAttribute('aria-valuenow',String(level));handle.setAttribute('aria-valuetext',['Compacta','Intermedia','Ampliada'][level])}
 handle.setAttribute('role','slider');handle.tabIndex=0;handle.setAttribute('aria-label','Altura del centro de notificaciones');handle.setAttribute('aria-orientation','vertical');handle.setAttribute('aria-valuemin','0');handle.setAttribute('aria-valuemax','2');
 snap(level);
 handle.addEventListener('pointerdown',e=>{
  if(!sheet.classList.contains('show')||e.button!==0||drag)return;
  drag={id:e.pointerId,y:e.clientY,height:sheet.getBoundingClientRect().height,moved:false};
  handle.setPointerCapture?.(e.pointerId);sheet.classList.add('gx-v2-sheet-dragging');
 });
 handle.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  const dy=drag.y-e.clientY;if(Math.abs(dy)>5)drag.moved=true;
  if(drag.moved){const s=heights();setHeight(Math.max(s[0],Math.min(s[2],drag.height+dy)))}
 });
 function end(e,cancel=false){
  if(!drag||drag.id!==e.pointerId)return;
  const d=drag;drag=null;sheet.classList.remove('gx-v2-sheet-dragging');
  if(d.moved&&!cancel){const delta=d.y-e.clientY,now=d.height+delta,s=heights();let n=s.reduce((best,x,i)=>Math.abs(x-now)<Math.abs(s[best]-now)?i:best,0);if(Math.abs(delta)>25&&n===level)n=level+(delta>0?1:-1);snap(n);skipClick=true;setTimeout(()=>{skipClick=false},350)}else snap(level);
 }
 handle.addEventListener('pointerup',e=>end(e));handle.addEventListener('pointercancel',e=>end(e,true));handle.addEventListener('lostpointercapture',e=>end(e,true));
 handle.addEventListener('click',()=>{if(!skipClick)snap(level===2?1:2)});
 handle.addEventListener('keydown',e=>{const n={ArrowUp:level+1,ArrowDown:level-1,Home:0,End:2,Enter:level===2?1:2,' ':level===2?1:2}[e.key];if(n!==undefined){e.preventDefault();snap(n)}});
 const resize=()=>{if(!drag)snap(level)};window.addEventListener('resize',resize,{passive:true});window.visualViewport?.addEventListener('resize',resize,{passive:true});
 new MutationObserver(()=>{if(!sheet.classList.contains('show')){drag=null;sheet.classList.remove('gx-v2-sheet-dragging');snap(1)}}).observe(sheet,{attributes:true,attributeFilter:['class']});
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
 new MutationObserver(decorate).observe(items,{childList:true});decorate();
 items.addEventListener('click',e=>{const item=e.target.closest('.gx-client-notif-item');if(item&&!e.target.closest('button'))play(item.querySelector('.gx-v2-notif-glyph svg'))},true);
}
wireSheet();
new MutationObserver(wireSheet).observe(document.body,{childList:true});
// Estado legal: solo presentación de la etiqueta existente, sin alterar su acción.
const legal=document.getElementById('view-dashboard');
function footerStatus(){const status=document.querySelector('#gx-legal-status .gx-legal-review');if(status){const t=status.textContent.toLowerCase();status.dataset.tone=t.includes('pendiente')?'pending':t.includes('rechazado')?'rejected':t.includes('aceptado')?'accepted':'neutral'}}
if(legal){new MutationObserver(footerStatus).observe(legal,{childList:true,subtree:true,characterData:true});footerStatus()}
})();