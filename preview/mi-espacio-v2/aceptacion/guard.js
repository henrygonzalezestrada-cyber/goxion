/* GOXION · aislamiento de aceptación. Solo rutas QA, sin llamadas al host de producción.
   Esta capa NO concede permisos ni crea sesiones. El servidor sigue autenticando. */
(function(){
 "use strict";
 const QA='https://nsvybyvvdpdgbgtvydfb.supabase.co';
 const routes=['ayuda-aceptacion-v2.html','index-aceptacion-v2.html','index-b2-aceptacion-v2.html'];
 if(!routes.includes(location.pathname.split('/').pop()))throw Error('Ruta QA inválida');
 const prefix='goxion-aceptacion-v2:';
 let isolated=false;
 const denied=()=>new Response(JSON.stringify({ok:false,error:'Operación no disponible en aceptación aislada.'}),{status:403,headers:{'Content-Type':'application/json'}});
 const native=window.fetch.bind(window);
 // Los almacenes se aíslan incluso para claves de módulos que no usan GOXION_CORE.
 try{
  const descriptors={};
  for(const name of ['localStorage','sessionStorage']){
   const storage=window[name],read=storage.getItem.bind(storage),write=storage.setItem.bind(storage),remove=storage.removeItem.bind(storage),key=storage.key.bind(storage);
   const keys=()=>{const list=[];for(let i=0;i<storage.length;i++){const k=key(i);if(k?.startsWith(prefix))list.push(k.slice(prefix.length))}return list};
   const target={
    getItem:k=>read(prefix+String(k)),setItem:(k,v)=>write(prefix+String(k),String(v)),removeItem:k=>remove(prefix+String(k)),
    clear:()=>keys().forEach(k=>remove(prefix+k)),key:i=>keys()[i]??null,get length(){return keys().length}
   };
   const proxy=new Proxy(target,{get:(t,k)=>k in t?Reflect.get(t,k):typeof k==='string'?t.getItem(k):undefined,
    set:(t,k,v)=>{if(typeof k!=='string'||k in t)return false;t.setItem(k,v);return true},
    deleteProperty:(t,k)=>{if(typeof k==='string')t.removeItem(k);return true},
    ownKeys:()=>keys(),getOwnPropertyDescriptor:(t,k)=>typeof k==='string'&&keys().includes(k)?{configurable:true,enumerable:true,value:t.getItem(k)}:Reflect.getOwnPropertyDescriptor(t,k)});
   Object.defineProperty(window,name,{configurable:false,get:()=>proxy});
   if(window[name]!==proxy)throw Error('Storage not isolated');
  }
  isolated=true;
 }catch(e){console.error('GOXION aceptación: aislamiento de sesión no disponible',e)}
 Object.defineProperty(window,'GOXION_QA_ISOLATED',{value:isolated,writable:false});
 const allowed=new Set(['login-goxion','mi-espacio','estado-cuenta-beta','estado-financiero','estado-financiero-b2-beta','cancelaciones-cliente','notificaciones-cliente','novedades-cliente','accesos-cliente-beta','inventario-publico','periodo-cobro','trato-justo','legal-consent-v2','comprobantes-b2-beta','historial-cliente','experiencia-servicio','opiniones-goxion','goxy-ai-qa','goxy-vision-qa','push-cliente-qa']);
 window.fetch=async function(input,init){
  if(!isolated)return denied();
  const raw=typeof input==='string'||input instanceof URL?String(input):input?.url||'';
  let u;try{u=new URL(raw,location.href)}catch{return denied()}
  const method=String(init?.method||input?.method||'GET').toUpperCase();
  if(u.origin===location.origin){
   if(method!=='GET'&&method!=='HEAD')return denied();
   if(/(?:clientes\.json|\/admin(?:[-.]|\/))/i.test(u.pathname))return denied();
   return native(input,init);
  }
  if(u.origin!==QA)return denied();
  if(u.pathname==='/rest/v1/goxion_precios_referencia'&&method==='GET')return native(input,init);
  const m=u.pathname.match(/^\/functions\/v1\/([a-z0-9-]+)$/);
  if(!m||method!=='POST'||!allowed.has(m[1]))return denied();
  let b={};try{if(typeof init?.body==='string')b=JSON.parse(init.body)}catch{return denied()}
  if(m[1]==='login-goxion'&&!/^qa-v2-(finanzas|b2|beneficios|beneficios-retest|vencido|suspendido|nuevo)$/i.test(String(b.nombre||'')))return denied();
  // Goxy QA: sólo los contratos explícitos de texto y visión; el servidor autentica,
  // limita cuota y autoriza los adjuntos. Nunca redirigir tráfico a producción.
  if(m[1]==='goxy-ai-qa'){
   if(!['status','chat','account','forecast','feedback'].includes(b.mode))return denied();
   // Only the certified categorical feedback mode is enabled; no free text.
   if(b.mode==='feedback'){
    if(location.pathname.split('/').pop()!=='ayuda-aceptacion-v2.html'||
     Object.keys(b).some(k=>!['mode','responseId','topic','source','vote','reason'].includes(k))||
     typeof b.responseId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(b.responseId)||
     !['identity','catalog','payment','missions','loyalty','promotions','cancel','support','policy','other'].includes(b.topic)||
     !['local','official','ai','vision'].includes(b.source)||![-1,0,1].includes(b.vote)||
     !(b.reason==null||(b.vote===-1&&['understanding','incorrect','unresolved','repetitive','other'].includes(b.reason))))return denied();
   }
  }
  if(m[1]==='push-cliente-qa'&&(location.pathname.split('/').pop()!=='ayuda-aceptacion-v2.html'||!['config','estado','activar','desactivar','probar'].includes(b.accion)))return denied();
  if(m[1]==='goxy-vision-qa'&&!['status','example','analyze'].includes(b.mode))return denied();
  // Las únicas escrituras de esta ruta son operaciones de la cuenta sintética
  // en APIs oficiales aisladas. No se admiten compras ni comunicaciones externas.
  return native(input,init);
 };
 if(navigator.sendBeacon)try{navigator.sendBeacon=()=>false}catch(_){}
 try{Object.defineProperty(navigator,'share',{value:()=>Promise.reject(new Error('Compartir deshabilitado en QA'))})}catch(_){}
 const open=window.open.bind(window);
 window.open=function(value,...args){
  try{const u=new URL(String(value||''),location.href);if(u.origin===location.origin&&routes.includes(u.pathname.split('/').pop()))return open(u.href,...args)}catch(_){}
  return null;
 };
 document.addEventListener('click',e=>{
  const a=e.target.closest?.('a[href]');if(!a)return;
  const raw=a.getAttribute('href');if(raw.startsWith('#'))return;
  try{const u=new URL(a.href,location.href);
   // El cierre heredado de Index apunta a la oficial. En QA sólo este control
   // se traduce a la ruta aislada; cualquier otro enlace a producción sigue bloqueado.
   const indexQA=['index-aceptacion-v2.html','index-b2-aceptacion-v2.html'].includes(location.pathname.split('/').pop());
   if(isolated&&indexQA&&a.matches('a.gx-index-close-btn[aria-label="Mi Espacio"]')&&u.href===new URL('./ayuda.html',location.href).href){
    e.preventDefault();e.stopImmediatePropagation();
    location.assign(new URL('./ayuda-aceptacion-v2.html',location.href).href);return;
   }
   if(u.origin===location.origin&&routes.includes(u.pathname.split('/').pop()))return;
   if(u.origin===location.origin&&/\.(pdf|png|jpg|jpeg|webp)$/i.test(u.pathname))return;
  }catch(_){}
  e.preventDefault();e.stopImmediatePropagation();
 },true);
 document.addEventListener('submit',e=>e.preventDefault(),true);
 if(location.pathname.endsWith('/index-b2-aceptacion-v2.html')){
  const p=new URLSearchParams(location.search),valid=p.get('f3')==='1'&&/^qa-v2-20261123-/.test(p.get('cliente')||'');
  if(!valid){location.replace('./ayuda-aceptacion-v2.html');return}
  window.GOXION_B2_MIRROR=Object.freeze({demo:false,integratedBeta:true,writeBlocked:false});
 }
 if(!isolated)document.addEventListener('DOMContentLoaded',()=>{document.body.replaceChildren(Object.assign(document.createElement('p'),{textContent:'No fue posible aislar la sesión de prueba. No se ha conectado a producción.'}))});
})();