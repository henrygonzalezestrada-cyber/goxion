/* Candidate only. One active visual presence; no changes to Goxy's dialogue engine. */
(()=>{
"use strict";
const d=document,$=id=>d.getElementById(id),avatar=$('gxn-avatar'),slot=$('gxn-goxy-slot'),menu=$('gxn-profile-menu'),support=$('view-soporte');
if(!d.documentElement.hasAttribute('data-gx-support-v3')||!avatar||!slot||!menu||!support)return;
const trigger=$('gxn-profile-trigger'),palette=$('gxn-goxy-colors'),status=$('gxn-goxy-color-status');
if(!palette||!status||!trigger)return;
const colors=Object.freeze({original:'#3552b1',violeta:'#7753a8',menta:'#25887e',rosa:'#b35e84',grafito:'#515c70'});
const defaultName='original',motion=matchMedia('(prefers-reduced-motion: reduce)');
let client='',selected=defaultName,prior=null,transition=null,entryAnimation=null;
const own=(key)=>Object.prototype.hasOwnProperty.call(colors,key);
function storageKey(){return client?'goxion:goxy-color:v1:'+client:null}
function applyColor(name){
 selected=own(name)?name:defaultName;
 const color=colors[selected];
 for(const el of d.querySelectorAll('#gxn-goxy-slot,#view-soporte .gxai-canvas-slot'))el.setAttribute('data-goxy-color',color);
 avatar.style.setProperty('--gx-goxy-case',color);
 for(const b of palette.querySelectorAll('[data-goxy-color-choice]'))b.setAttribute('aria-pressed',String(b.dataset.goxyColorChoice===selected));
}
function readAccount(){
 const id=String(window.GOXION_V2_CLIENT_ID||'');
 if(id===client)return;
 client=id;let saved=defaultName;
 if(client){try{saved=localStorage.getItem(storageKey())||defaultName}catch(_){}}
 applyColor(saved);palette.hidden=!client;
 status.textContent='';
}
palette.addEventListener('click',e=>{
 const b=e.target.closest('[data-goxy-color-choice]');
 if(!b||!client||!own(b.dataset.goxyColorChoice))return;
 applyColor(b.dataset.goxyColorChoice);
 try{localStorage.setItem(storageKey(),selected);status.textContent='Color guardado en este dispositivo.'}
 catch(_){status.textContent='Color aplicado durante esta sesión.'}
});
function syncPresence(){
 const inSupport=support.classList.contains('active'),chat=d.documentElement.classList.contains('gxai-immersive-open');
 const next=inSupport?'support':'avatar',hero=support.querySelector('.gxai-hero .gxai-canvas-slot'),chatSlot=support.querySelector('.gxai-chat .gxai-canvas-slot');
 const active=!d.hidden;
 slot.setAttribute('data-goxy-paused',String(!active||inSupport||d.body.classList.contains("gx-launch-goxy-active")));
 if(hero)hero.setAttribute('data-goxy-paused',String(!active||!inSupport||chat));
 if(chatSlot)chatSlot.setAttribute('data-goxy-paused',String(!active||!inSupport||!chat));
 if(prior===next)return;
 const was=prior;prior=next;
 transition?.cancel();entryAnimation?.cancel();
 avatar.classList.toggle('gx-goxy-away',inSupport);
 if(was===null||motion.matches||!avatar.animate||!d.body.classList.contains('gx-v2-client-session'))return;
 const target=inSupport?hero:avatar.querySelector('.gxn-goxy-real');
 if(target?.animate)entryAnimation=target.animate([{opacity:0,transform:'translateX('+(inSupport?'16':'-9')+'px)'},{opacity:1,transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.2,.75,.25,1)'});
}
const observer=new MutationObserver(syncPresence);
observer.observe(support,{attributes:true,attributeFilter:['class']});
observer.observe(d.documentElement,{attributes:true,attributeFilter:['class']});
d.addEventListener('visibilitychange',syncPresence);
window.addEventListener('goxion:v2-feed:rendered',()=>{readAccount();syncPresence()});
window.addEventListener('goxion:client-logout',()=>{client='';applyColor(defaultName);palette.hidden=true;status.textContent='';syncPresence()});
window.addEventListener('storage',e=>{if(client&&e.key===storageKey())applyColor(e.newValue||defaultName)});
readAccount();applyColor(selected);syncPresence();
})();
