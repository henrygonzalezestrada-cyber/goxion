/* GOXION · Prueba PulsoIcon 6.2.0 (CityPulso, ISC).
 * Dibujos y parámetros originales: packages/core/src/icons. Adaptación WAAPI
 * de las recetas de packages/core/src/recipes.ts, sin framework ni CDN.
 * Licencias completas: ./pulsoicon-LICENSE.txt. Solo historial del espejo.
 * Dirección de diseño: PulsoIcon complementa Morficons; no sustituir morphs,
 * emojis, navegación, campana ni controles aprobados. Movimientos semánticos,
 * puntuales, sin bucles, con reduced-motion. Futuro (no activado aquí): icono
 * de tarjeta principal solo al tocar directamente el icono; reloj conserva su
 * animación propia. Mantener transición de estado de Morficons por separado. */
(function(){
'use strict';
const DATA={"circle-check":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.05,"o":[12,12]}],["path",{"d":"m16 9-5.5 5.5L8 12"},{"r":"draw","d":0.1,"o":[12,11.75]}]]},"clock":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.04,"o":[12,12]}],["path",{"d":"M12 6v6l4 2"},{"r":"spin","a":360,"o":[12,12]}]]},"circle-x":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"spin","a":90,"o":[12,12]}],["path",{"d":"m15 9-6 6"},{"r":"draw","d":0.15,"o":[12,12]}],["path",{"d":"m9 9 6 6"},{"r":"draw","d":0.25,"o":[12,12]}]]},"receipt-text":{"nodes":[["path",{"d":"M13 16H8"},{"r":"growX","d":0.17,"o":[8,12]}],["path",{"d":"M14 8H8"},{"r":"growX","d":0.05,"o":[8,12]}],["path",{"d":"M16 12H8"},{"r":"growX","d":0.11,"o":[8,12]}],["path",{"d":"M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"},{"r":"jelly","a":0.05,"o":[12,22]}]]},"circle-minus":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.06,"o":[12,12]}],["path",{"d":"M8 12h8"},{"r":"growX","d":0.1,"o":[12,12]}]]},"refresh-cw":{"nodes":[["path",{"d":"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M21 3v5h-5"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"},{"r":"spin","a":360,"o":[12,12]}],["path",{"d":"M8 16H3v5"},{"r":"spin","a":360,"o":[12,12]}]]},"circle-plus":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.05,"o":[12,12]}],["path",{"d":"M8 12h8"},{"r":"spin","d":0.1,"a":90,"o":[12,12]}],["path",{"d":"M12 8v8"},{"r":"spin","d":0.1,"a":90,"o":[12,12]}]]},"gift":{"nodes":[["path",{"d":"M12 7v14"},{"r":"press","d":0.1,"a":0.05,"o":[12,21]}],["path",{"d":"M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8"},{"r":"press","d":0.1,"a":0.05,"o":[12,21]}],["path",{"d":"M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5"},{"r":"lift","o":[12,4.5]}],["rect",{"x":"3","y":"7","width":"18","height":"4","rx":"1"},{"r":"lift","d":0.05,"o":[12,9]}]]}};
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
})();