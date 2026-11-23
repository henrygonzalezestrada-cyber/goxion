/* GOXION · Espejo preproducción: el feed aprobado ocupa SOLO el dashboard.
   La sesión, los módulos ajenos al feed, el fondo y las notificaciones son oficiales.
   No mostrar tarjetas antiguas tras autenticación, ni una segunda autenticación. */
(function(){
'use strict';
const dash=document.getElementById('view-dashboard');
const feed=document.getElementById('gx-v2-feed');
const bell=document.getElementById('gxn-bell');
if(!dash||!feed||!bell)return;
let authorized=false,rendered=false,accountKey='';
const veil=document.createElement('div');
veil.id='gx-v2-sync';
veil.className='gx-v2-sync';
veil.setAttribute('role','status');
veil.setAttribute('aria-live','polite');
veil.innerHTML='<span class="gx-v2-sync-spinner" aria-hidden="true"></span><span id="gx-v2-sync-copy">Sincronizando tu espacio…</span><button type="button" class="gx-v2-sync-retry" hidden>Reintentar</button>';
feed.insertBefore(veil,feed.firstChild);
const veilCopy=veil.querySelector('#gx-v2-sync-copy'),retry=veil.querySelector('.gx-v2-sync-retry');
retry.addEventListener('click',()=>{
 retry.hidden=true;
 veilCopy.textContent='Sincronizando tu espacio…';
 void window.GOXION_V2_RETRY_FEED?.();
});
const counter=document.createElement('span');counter.className='gx-client-notif-badge';counter.textContent='0';bell.append(counter);
function mirrorBell(){
 const original=document.getElementById('gx-client-notif-launch'),badge=document.getElementById('gx-client-notif-badge');
 const unread=!!original?.classList.contains('gx-has-new');
 bell.classList.toggle('gx-has-new',unread);
 bell.classList.toggle('gx-ringing',!!original?.classList.contains('gx-ringing'));
 counter.textContent=unread?(badge?.textContent||'1'):'0';
 bell.disabled=!original||original.disabled;
 bell.setAttribute('aria-label',unread?'Notificaciones sin leer '+counter.textContent:'Notificaciones');
}
bell.addEventListener('click',()=>document.getElementById('gx-client-notif-launch')?.click());
let watched=null;
const mutation=new MutationObserver(mirrorBell);
function watchBell(){
 const original=document.getElementById('gx-client-notif-launch');
 if(original&&original!==watched){
  watched=original;mutation.disconnect();
  mutation.observe(original,{subtree:true,childList:true,attributes:true,characterData:true});
 }
 mirrorBell();
}
const header=document.querySelector('.app-header');
if(header)new MutationObserver(watchBell).observe(header,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',watchBell);
function syncView(){
 const active=authorized&&dash.classList.contains('active');
 document.body.classList.toggle('gx-v2-private-visible',active);
 dash.classList.toggle('gx-v2-rendered',authorized);
 feed.hidden=!authorized;
 if(active)watchBell();
 veil.hidden=rendered;
}
function onOfficialReady(){
 const key=typeof getCurrentClientKey==='function'?String(getCurrentClientKey()||''):String(window.goxionCurrentClientKey||'');
 const token=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
 if(!key||!token||!localStorage.getItem(token))return;
 if(key!==accountKey){rendered=false;accountKey=key}
 authorized=true;
 veilCopy.textContent='Sincronizando tu espacio…';
 retry.hidden=true;
 syncView();
}
window.addEventListener('goxion:client-ready',onOfficialReady);
window.addEventListener('goxion:v2-feed:rendered',()=>{rendered=true;authorized=true;syncView()});
window.addEventListener('goxion:v2-feed:error',event=>{
 if(!authorized)return;
 rendered=false;
 veilCopy.textContent=String(event.detail?.message||'No pudimos sincronizar tu información.');
 retry.hidden=false;syncView();
});
window.addEventListener('goxion:client-logout',()=>{
 authorized=false;rendered=false;accountKey='';feed.hidden=true;
 document.body.classList.remove('gx-v2-private-visible');dash.classList.remove('gx-v2-rendered');
});
new MutationObserver(syncView).observe(dash,{attributes:true,attributeFilter:['class']});
onOfficialReady();
syncView();
})();