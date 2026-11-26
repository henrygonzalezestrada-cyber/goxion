/* GOXION · Espejo candidato: feed privado y cápsula persistente pública/privada.
   La sesión, los módulos ajenos al feed, el fondo y las notificaciones son oficiales.
   No mostrar tarjetas antiguas tras autenticación, ni una segunda autenticación. */
(function(){
'use strict';
const dash=document.getElementById('view-dashboard'),home=document.getElementById('view-inicio');
const catalog=document.getElementById('view-catalogo'),support=document.getElementById('view-soporte');
const feed=document.getElementById('gx-v2-feed');
const headerHost=document.getElementById('gx-v2-shared-header'),navHost=document.getElementById('gx-v2-shared-nav');
const nav=document.getElementById('gxn-nav'),bell=document.getElementById('gxn-bell');
if(!dash||!home||!catalog||!support||!feed||!headerHost||!navHost||!nav||!bell)return;
let authorized=false,rendered=false,accountKey='',sessionToken='';
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
 bell.setAttribute('aria-expanded',String(!!document.getElementById('gx-client-notif-sheet')?.classList.contains('show')));
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
 const atSpace=dash.classList.contains('active'),atHome=home.classList.contains('active'),atCatalog=catalog.classList.contains('active'),atSupport=support.classList.contains('active');
 const sessionActive=authorized&&(atSpace||atCatalog||atSupport);
 const feedActive=authorized&&atSpace;
 document.body.classList.toggle('gx-v2-client-session',sessionActive);
 document.body.classList.toggle('gx-v2-private-visible',feedActive);
 dash.classList.toggle('gx-v2-rendered',authorized);
 feed.hidden=!authorized;headerHost.hidden=!sessionActive;navHost.hidden=false;
 const first=nav.querySelector('[data-gxn-target="space"]'),label=authorized?'Mi Espacio':'Inicio',emoji=authorized?'👤':'🏠';
 if(first){const t=first.querySelector('.gxn-tab-label'),e=first.querySelector('.gxn-emoji');if(t.textContent!==label)t.textContent=label;if(e.textContent!==emoji)e.textContent=emoji;first.setAttribute('aria-label',label)}
 const current=atSpace||atHome?'space':atCatalog?'catalog':atSupport?'support':'space';
 window.GOXION_V2_SYNC_TAB?.(current);
 for(const button of nav.querySelectorAll('.gxn-tab')){
  if(button.dataset.gxnTarget===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')
 }
 if(sessionActive)watchBell();
 veil.hidden=rendered;
}
function onOfficialReady(){
 const key=typeof getCurrentClientKey==='function'?String(getCurrentClientKey()||''):String(window.goxionCurrentClientKey||'');
 const token=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
 const current=token?localStorage.getItem(token):null;
 if(!key||!current)return;
 if(key!==accountKey||current!==sessionToken){rendered=false;accountKey=key;sessionToken=current;const shell=document.getElementById('gxi-shell');if(shell)shell.hidden=true}
 authorized=true;
 veilCopy.textContent='Sincronizando tu espacio…';
 retry.hidden=true;
 syncView();
}
window.addEventListener('goxion:client-ready',onOfficialReady);
let syncTimeout=null;
window.addEventListener('goxion:client-ready',()=>{
 clearTimeout(syncTimeout);
 syncTimeout=setTimeout(()=>{
  if(!authorized||rendered)return;
  veilCopy.textContent='La conexión tarda más de lo habitual. Puedes reintentar.';
  retry.hidden=false;
 },12000);
});
window.addEventListener('goxion:v2-feed:rendered',()=>{clearTimeout(syncTimeout);rendered=true;authorized=true;syncView()});
window.addEventListener('goxion:v2-feed:error',event=>{
 clearTimeout(syncTimeout);
 if(!authorized)return;
 rendered=false;
 veilCopy.textContent=String(event.detail?.message||'No pudimos sincronizar tu información.');
 retry.hidden=false;syncView();
});
window.addEventListener('goxion:client-logout',()=>{
 clearTimeout(syncTimeout);
 authorized=false;rendered=false;accountKey='';sessionToken='';feed.hidden=true;
 document.body.classList.remove('gx-v2-private-visible','gx-v2-client-session');
 headerHost.hidden=true;nav.dataset.mode='expanded';dash.classList.remove('gx-v2-rendered');syncView();
});
const viewObserver=new MutationObserver(syncView);
[dash,home,catalog,support].forEach(view=>viewObserver.observe(view,{attributes:true,attributeFilter:['class']}));
onOfficialReady();
syncView();
})();
