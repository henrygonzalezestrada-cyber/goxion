/* GOXION · Prueba PulsoIcon 6.2.0 (CityPulso, ISC).
 * Dibujos y parámetros originales: packages/core/src/icons. Adaptación WAAPI
 * de las recetas de packages/core/src/recipes.ts, sin framework ni CDN.
 * Licencias completas: ./pulsoicon-LICENSE.txt. Solo el espejo. */
(function(){
'use strict';
const DATA={"bell":{"nodes":[["path",{"d":"M10.268 21a2 2 0 0 0 3.464 0"},{"r":"slide","d":0.08,"x":1,"a":1.5,"o":[12,21.5]}],["path",{"d":"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"},{"r":"ring","a":16,"o":[12,3]}]]},"calendar-days":{"nodes":[["path",{"d":"M8 2v3"},{"r":"lift","o":[12,3.5]}],["path",{"d":"M16 2v3"},{"r":"lift","d":0.06,"o":[12,3.5]}],["rect",{"x":"3","y":"3","width":"18","height":"18","rx":"2"},{"r":"press","a":0.04,"o":[12,12]}],["path",{"d":"M3 9h18"},{"r":"press","a":0.04,"o":[12,12]}],["path",{"d":"M8 13h.01"},{"r":"pop","d":0.1,"o":[8.005,13]}],["path",{"d":"M12 13h.01"},{"r":"pop","d":0.14,"o":[12.005,13]}],["path",{"d":"M16 13h.01"},{"r":"pop","d":0.18,"o":[16.005,13]}],["path",{"d":"M8 17h.01"},{"r":"pop","d":0.22,"o":[8.005,17]}],["path",{"d":"M12 17h.01"},{"r":"pop","d":0.26,"o":[12.005,17]}],["path",{"d":"M16 17h.01"},{"r":"pop","d":0.3,"o":[16.005,17]}]]},"shopping-cart":{"nodes":[["path",{"d":"m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"},{"r":"slide","x":1,"a":1.5,"o":[12.025,10.011]}],["path",{"d":"M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"},{"r":"slide","x":1,"a":1.5,"o":[12.025,10.011]}],["circle",{"cx":"18","cy":"20","r":"2"},{"r":"spin","a":360,"o":[18,20]}],["circle",{"cx":"8","cy":"20","r":"2"},{"r":"spin","a":360,"o":[8,20]}]]},"circle-check":{"nodes":[["circle",{"cx":"12","cy":"12","r":"10"},{"r":"press","a":0.05,"o":[12,12]}],["path",{"d":"m16 9-5.5 5.5L8 12"},{"r":"draw","d":0.1,"o":[12,11.75]}]]},"heart-crack":{"nodes":[["path",{"d":"M12.409 5.824c-.702.792-1.15 1.496-1.415 2.166l2.153 2.156a.5.5 0 0 1 0 .707l-2.293 2.293a.5.5 0 0 0 0 .707L12 15"},{"r":"shake","d":0.2,"a":0.8,"o":[12,10.412]}],["path",{"d":"M13.508 20.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5a5.5 5.5 0 0 1 9.591-3.677.6.6 0 0 0 .818.001A5.5 5.5 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5z"},{"r":"beat","o":[12,12.499]}]]}};
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
 shake:({a=1.5})=>[500,[0,-a,a,-a*.6,a*.6,0].map(v=>({transform:'translateX('+v+'px)'}))]
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
const bell=document.querySelector('#gxn-bell'),bellHost=bell?.querySelector('.gx-client-notif-icon');
const bellSvg=install(bellHost,'bell');
if(bellSvg){bellSvg.style.animation='none';bellSvg.querySelectorAll('path').forEach(p=>p.style.animation='none')}
const cart=document.querySelector('#gx-v2-shared-nav [data-gxn-target="catalog"]');
const cartSvg=install(cart?.querySelector('.gxn-emoji'),'shopping-cart');
if(cartSvg){cartSvg.style.width='23px';cartSvg.style.height='23px'}
function trigger(el,fn){if(!el)return;el.addEventListener('click',fn);el.addEventListener('focusin',e=>{if(el.matches(':focus-visible'))fn()});el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')fn()})}
trigger(bell,()=>play(bellSvg));trigger(cart,()=>play(cartSvg));
if(bell){let ringing=bell.classList.contains('gx-ringing'),badge=bell.querySelector('.gx-client-notif-badge')?.textContent;new MutationObserver(()=>{const next=bell.classList.contains('gx-ringing'),count=bell.querySelector('.gx-client-notif-badge')?.textContent;if((next&&!ringing)||(bell.classList.contains('gx-has-new')&&Number(count)>Number(badge)))play(bellSvg);ringing=next;badge=count}).observe(bell,{attributes:true,attributeFilter:['class'],childList:true,subtree:true,characterData:true})}
// No sustituir el SVG de Morficons: usar la receta de los aros del calendario en el detalle existente.
const focus=document.getElementById('focus-icon'),focusAction=document.getElementById('focus-action');
function calendar(){if(focus?.dataset.icon==='calendar')animate(focus.querySelector('.gx-focus-calendar-date'),DATA['calendar-days'].nodes[0][2])}
trigger(focusAction,calendar);
if(focus){let old=focus.dataset.icon;new MutationObserver(()=>{const next=focus.dataset.icon;if(next!==old&&next==='calendar')calendar();old=next}).observe(focus,{attributes:true,attributeFilter:['data-icon']})}
// Mantener el emoji de lealtad y su watermark: aplicar el latido PulsoIcon al cambio real de estado.
const loyalty=document.querySelector('.gxb-tile[data-gxb="loyalty"]');
if(loyalty){let phase=loyalty.dataset.phase;new MutationObserver(()=>{const next=loyalty.dataset.phase;if(next==='lost'&&phase!==next)animate(loyalty.querySelector('.gxb-emoji'),DATA['heart-crack'].nodes[1][2]);phase=next}).observe(loyalty,{attributes:true,attributeFilter:['data-phase']});trigger(loyalty,()=>{if(loyalty.dataset.phase==='lost')animate(loyalty.querySelector('.gxb-emoji'),DATA['heart-crack'].nodes[1][2])})}
// Confirmaciones: solo movimientos de pago ya verificados, nunca inferir estados.
const list=document.getElementById('gxm-list');
function history(){list?.querySelectorAll('.gxm-entry[data-kind="payment"] .gxm-icon').forEach(host=>install(host,'circle-check'))}
if(list){new MutationObserver(history).observe(list,{childList:true,subtree:true});history();list.addEventListener('click',e=>{const row=e.target.closest('.gxm-entry[data-kind="payment"]');if(row)play(row.querySelector('svg[data-gx-pulso]'))})}
})();