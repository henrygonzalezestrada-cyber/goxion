/* E1/B2 · Bridge only for the isolated Ayuda mirror.
 * Keeps every approved E1/B1 interaction and routes the existing
 * "Ver Estado de Cuenta" capsule to a synthetic, separate Index mirror.
 */
(()=>{
'use strict';
const fx=window.GOXION_E1B2_DEMO,smart=window.GOXION_SMART_BETA;
if(!fx||!smart||document.documentElement.dataset.gxB2Preview!=='true')return;
const $=id=>document.getElementById(id);
function sync(){
 const key=smart.getScenario(),quote=fx.cases[key];
 const card=$('dash-billing-card');
 if(!card||card.hidden||!quote)return;
 card.dataset.gxB2Source='server-simulated';
 const next=fx.next(quote),capsule=card.querySelector('.gx-account-capsule-label');
 // Same fictional cent-denominated value as the Index mirror; never
 // reuse monthly total for a single next due obligation.
 if(capsule&&!['review','correction'].includes(key)){
  capsule.textContent=next.date?'Próximo pago · '+fx.money(next.amount):
   'Ver Estado de Cuenta';
 }
}
function route(event){
 const button=event.target.closest('#dash-billing-card .gx-account-capsule');
 if(!button)return;
 event.preventDefault();event.stopImmediatePropagation();
 const key=smart.getScenario();
 const quote=fx.cases[key];
 if(!quote||!quote.trusted)return;
 window.location.href='./estado.html?escenario='+encodeURIComponent(key);
}
document.addEventListener('click',route,true);
document.addEventListener('gx-smart-case-rendered',()=>queueMicrotask(sync));
const param=new URL(location.href).searchParams.get('escenario');
if(param&&fx.mapping[param]&&$('gx-smart-scenario')){
 $('gx-smart-scenario').value=param;
 $('gx-smart-scenario').dispatchEvent(new Event('change',{bubbles:true}));
}
sync();
window.GOXION_E1B2_AYUDA=Object.freeze({isolated:true,noBackend:true,getScenario:()=>smart.getScenario()});
})();