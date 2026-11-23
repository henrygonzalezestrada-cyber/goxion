/* Solo un documento; reutiliza sesión y notificaciones oficiales. */
(function(){
'use strict';
const dash=document.getElementById('view-dashboard'),feed=document.getElementById('gx-v2-feed'),bell=document.getElementById('gxn-bell');
if(!dash||!feed||!bell)return;
let valid=false;
const counter=document.createElement('span');counter.className='gx-client-notif-badge';counter.textContent='0';bell.append(counter);
const mirrorBadge=()=>{
 const source=document.getElementById('gx-client-notif-launch'),badge=document.getElementById('gx-client-notif-badge');
 const unread=!!source?.classList.contains('gx-has-new');
 bell.classList.toggle('gx-ringing',!!source?.classList.contains('gx-ringing'));
 bell.classList.toggle('gx-has-new',unread);
 counter.textContent=unread?(badge?.textContent||'1'):'0';
 bell.disabled=!source||source.disabled;
 bell.setAttribute('aria-label',unread?'Notificaciones sin leer '+counter.textContent:'Notificaciones');
};
bell.addEventListener('click',()=>document.getElementById('gx-client-notif-launch')?.click());
const mo=new MutationObserver(mirrorBadge);let watched=null;
function observeBell(){
 const source=document.getElementById('gx-client-notif-launch');
 if(source&&watched!==source){watched=source;mo.disconnect();mo.observe(source,{subtree:true,childList:true,attributes:true,characterData:true})}
 mirrorBadge();
}
const header=document.querySelector('.app-header');
if(header)new MutationObserver(observeBell).observe(header,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',observeBell);
function show(){
 const active=valid&&dash.classList.contains('active');
 document.body.classList.toggle('gx-v2-private-visible',active);
 if(active){feed.hidden=false;dash.classList.add('gx-v2-rendered');observeBell()}
}
new MutationObserver(show).observe(dash,{attributes:true,attributeFilter:['class']});
window.addEventListener('goxion:v2-feed:rendered',()=>{valid=true;show()});
window.addEventListener('goxion:client-logout',()=>{valid=false;feed.hidden=true;dash.classList.remove('gx-v2-rendered');document.body.classList.remove('gx-v2-private-visible')});
show();
})();
