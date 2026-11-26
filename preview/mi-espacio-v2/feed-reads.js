/* GOXION · candidato: agrupar invalidaciones y compartir solamente lecturas simultáneas.
   No caché persistente, no escrituras ni respuestas compartidas entre tokens. */
(function(){
'use strict';
if(!document.documentElement.hasAttribute('data-gx-feed-performance'))return;
const core=window.GOXION_CORE;if(!core)return;
const token=()=>localStorage.getItem(core.STORAGE.CLIENT_TOKEN)||'';
const empty=JSON.stringify({});
const list=JSON.stringify({accion:'listar',datos:{}});
const account=JSON.stringify({accion:'mi_estado',datos:{}});
const allowed=new Map([
 ['mi-espacio',empty],['cancelaciones-cliente',list],['credenciales-cliente',list],
 ['novedades-cliente',list],['estado-cuenta-beta',account],['accesos-cliente-beta',list],
 ['estado-financiero-b2-beta',account],['historial-cliente',empty]
].map(([name,body])=>[core.endpoint(name),body]));
const inFlight=new Map();
function request(url,body,session){
 const json=JSON.stringify(body||{});
 const options={method:'POST',cache:'no-store',headers:Object.assign({'Content-Type':'application/json'},session?{'X-Client-Token':session}:{}),body:json};
 if(!session||allowed.get(url)!==json){if(session)inFlight.clear();return fetch(url,options)}
 if(session!==token())return Promise.reject(new Error('La sesión cambió.'));
 const key=JSON.stringify([session,url,json]);
 let pending=inFlight.get(key);
 if(!pending){
  pending=Promise.resolve().then(async()=>{
   try{
    const response=await fetch(url,options);
    // Consumir el cuerpo antes de liberar el vuelo; cada lector recibe su propia copia.
    const raw=await response.text();
    return {raw,status:response.status,statusText:response.statusText,headers:response.headers};
   }finally{if(inFlight.get(key)===pending)inFlight.delete(key)}
  });
  inFlight.set(key,pending);
 }
 return pending.then(r=>{if(session!==token())throw new Error('La sesión cambió.');return new Response([204,205,304].includes(r.status)?null:r.raw,{status:r.status,statusText:r.statusText,headers:r.headers})});
}
const accepted=new Set(['account_state','rewards','referrals','client_state','client_access','cancellations','resync']);
const listeners=new Set(),scopes=new Set();let timer=0,epoch=0;
function reset(){clearTimeout(timer);timer=0;scopes.clear();inFlight.clear();epoch++}
function schedule(scope){
 if(!accepted.has(scope)||!token()||document.hidden||navigator.onLine===false)return;
 scopes.add(scope);if(timer)return;
 const session=token(),revision=epoch;
 timer=setTimeout(()=>{
  timer=0;const batch=[...scopes];scopes.clear();
  if(revision!==epoch||session!==token()||document.hidden||navigator.onLine===false)return;
  for(const listener of listeners){try{listener(batch.includes('resync')?'resync':batch[0],batch)}catch(e){console.warn('GOXION: actualización no disponible',e)}}
 },160);
}
window.addEventListener('goxion:realtime',e=>schedule(e.detail?.scope));
window.addEventListener('goxion:client-logout',reset);
window.addEventListener('storage',e=>{if(e.key===core.STORAGE.CLIENT_TOKEN||e.key===null)reset()});
window.GOXION_FEED_READS=Object.freeze({request,schedule,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn)},hasServices(main){return !Array.isArray(main?.servicios)||main.servicios.some(s=>s?.activo!==false)}});
})();
