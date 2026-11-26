import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const sources=['21-legal-v2-documents.js','22-legal-access.js'].map(p=>readFileSync('assets/js/ayuda/'+p,'utf8'));
const KEY='fixture:core:client-token',OLD='goxion_client_token';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const event=(type,detail={})=>({type,...detail});
class Node {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.attrs=new Map();this.handlers=new Map();this.hidden=false;this.inert=false;this.id='';this.textContent='';const c=new Set();this.classList={add:v=>c.add(v),remove:v=>c.delete(v),contains:v=>c.has(v),toggle:(v,on)=>on?c.add(v):c.delete(v)}}
 set innerHTML(html){for(const name of ['accept','exit','history','details']){assert.ok(html.includes('data-gx-lock-'+name));const child=new Node(name==='details'?'div':'button');child.setAttribute('data-gx-lock-'+name,'');child.hidden=name==='details';this.append(child)}}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=[...nodes]}
 setAttribute(k,v){this.attrs.set(k,v)}
 hasAttribute(k){return this.attrs.has(k)||k==='inert'&&this.inert}
 addEventListener(type,fn){this.handlers.set(type,fn)}
 click(){return this.handlers.get('click')?.()}
 focus(){}
 querySelector(sel){const hit=x=>sel.startsWith('#')?x.id===sel.slice(1):sel.startsWith('[')?x.hasAttribute(sel.slice(1,-1)):false;
  for(const child of this.children){if(hit(child))return child;const nested=child.querySelector(sel);if(nested)return nested}return null}
}
function create({withCore=true,blockedStorage=false}={}){
 const storage=new Map([[OLD,'unused-legacy-fixture']]),reads=[],removed=[],requests=[],events=[],opened=[],handlers=new Map();
 const body=new Node('body'),main=new Node('main');main.id='app';body.append(main);
 const doc={body,readyState:'loading',hidden:false,createElement:tag=>new Node(tag),createTextNode:t=>Object.assign(new Node('text'),{textContent:t}),getElementById:id=>body.querySelector('#'+id),querySelector:sel=>body.querySelector(sel),addEventListener(){}};
 let reloads=0,respond=({name,token})=>name==='legal-consent-v2'
  ? {ok:true,habilitado:true,estado:token==='A'?'rechazado':'aceptado',cliente_id:'fixture-'+token,acceso:token==='A'?{fase:'rechazado_final',restringido:true,bloquea_operaciones:true}:{fase:'aceptado',restringido:false,bloquea_operaciones:false}}
  : {ok:true,acceso_restringido:true,cliente:{id:'fixture-'+token},pagos:[{fecha:'fixture-period',monto:20,estado:'pagado'}]};
 const win={addEventListener(type,fn){if(!handlers.has(type))handlers.set(type,[]);handlers.get(type).push(fn)},dispatchEvent(e){events.push(e);for(const fn of handlers.get(e.type)||[])fn(e)},openModal:id=>opened.push(id),switchTab:name=>opened.push(name)};
 if(withCore)win.GOXION_CORE={STORAGE:{CLIENT_TOKEN:KEY},endpoint:name=>'https://fixture.invalid/'+name};
 const localStorage={getItem(k){reads.push(k);if(blockedStorage)throw Error('denied');return storage.get(k)||null},removeItem(k){removed.push(k);storage.delete(k)},setItem(k,v){storage.set(k,v)}};
 const context={window:win,document:doc,localStorage,location:{reload(){reloads++}},Event:class {constructor(type){this.type=type}},CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},console:{warn(){}},setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,fetch:async(url,opts)=>{
  const name=new URL(url).pathname.slice(1),token=opts.headers['X-Client-Token'];assert.ok(['legal-consent-v2','mi-espacio'].includes(name));assert.ok(token,'never call authenticated endpoints without session');
  const req={name,token,body:JSON.parse(opts.body)};requests.push(req);const result=await respond(req);return {ok:true,json:async()=>result};
 }};
 for(const source of sources)vm.runInNewContext(source,context);
 return {win,doc,main,storage,reads,removed,requests,events,opened,legal:win.GOXION_LEGAL_V2,access:win.GOXION_LEGAL_ACCESS,shell:doc.getElementById('gx-legal-access-shell'),setResponder:f=>respond=f,get reloads(){return reloads}};
}
// Without runtime, a token in the old key is never accepted or even read;
// public documents still use their existing reader route.
{
 const f=create({withCore:false});await f.legal.refresh();
 f.win.dispatchEvent(event('storage',{key:null}));f.win.dispatchEvent(event('focus'));f.win.dispatchEvent(event('goxion:client-ready'));await tick();
 assert.deepEqual(f.reads,[]);assert.deepEqual(f.requests,[]);
 f.legal.openDocument('terminos');assert.deepEqual(f.opened,['modal-terminos']);
 assert.equal(f.shell.hidden,true);
}
// Neither legacy storage nor a storage access failure is authentication.
for(const opts of [{},{blockedStorage:true}]){
 const f=create(opts);if(opts.blockedStorage)f.storage.set(KEY,'A');
 await f.legal.refresh();assert.equal(f.requests.length,0);
 assert.ok(f.reads.every(k=>k===KEY));assert.equal(f.shell.hidden,true);
}
// Exact runtime key, server-confirmed restriction, protected history, logout.
{
 const f=create();f.storage.set(KEY,'A');await f.legal.refresh();
 assert.equal(f.requests.at(-1).token,'A');assert.equal(f.legal.getState(),'rechazado');
 assert.equal(f.shell.hidden,false);assert.equal(f.main.inert,true);
 f.win.switchTab('catalogo');assert.equal(f.opened.includes('catalogo'),false);
 const n=f.requests.length;f.win.dispatchEvent(event('storage',{key:OLD}));await tick();assert.equal(f.requests.length,n);
 f.shell.querySelector('[data-gx-lock-history]').click();await tick();
 assert.equal(f.requests.at(-1).name,'mi-espacio');assert.equal(f.requests.at(-1).token,'A');
 const panel=f.shell.querySelector('[data-gx-lock-details]');assert.ok(panel.children.some(row=>row.children?.some(x=>x.textContent==='fixture-period')));
 f.shell.querySelector('[data-gx-lock-exit]').click();
 assert.equal(f.reloads,1);assert.deepEqual(f.removed,[KEY]);assert.equal(f.storage.has(OLD),true);assert.equal(f.shell.hidden,true);assert.equal(f.main.inert,false);
 assert.ok(f.reads.every(k=>k===KEY));
}
// Only a change to the canonical key refreshes state in another tab.
{
 const f=create();f.storage.set(KEY,'A');await f.legal.refresh();
 f.storage.set(KEY,'B');f.win.dispatchEvent(event('storage',{key:KEY}));await tick();
 assert.equal(f.legal.getState(),'aceptado');assert.equal(f.shell.hidden,true);
 assert.ok(f.requests.slice(1).length>0&&f.requests.slice(1).every(x=>x.token==='B'));
}
// A non-restricted response cannot populate the restricted history.
{
 const f=create();f.storage.set(KEY,'A');await f.legal.refresh();
 f.setResponder(()=>({ok:true,acceso_restringido:false,cliente:{id:'fixture-A'},pagos:[{fecha:'must-not-render'}]}));
 f.shell.querySelector('[data-gx-lock-history]').click();await tick();
 const panel=f.shell.querySelector('[data-gx-lock-details]');
 assert.ok(panel.children.some(x=>x.textContent.includes('No fue posible cargar')));
}
// History cannot query after the runtime token disappears.
{
 const f=create();f.storage.set(KEY,'A');await f.legal.refresh();f.storage.delete(KEY);
 const n=f.requests.length;f.shell.querySelector('[data-gx-lock-history]').click();await tick();
 assert.equal(f.requests.length,n);assert.ok(f.shell.querySelector('[data-gx-lock-details]').children.some(x=>x.textContent.includes('No fue posible cargar')));
}
// A late response from a prior session must not set restriction on the new account.
{
 const f=create();f.storage.set(KEY,'A');let release;
 f.setResponder(req=>req.token==='A'?new Promise(resolve=>release=resolve):{ok:true,habilitado:true,estado:'aceptado',acceso:{fase:'aceptado',restringido:false,bloquea_operaciones:false}});
 const late=f.legal.refresh();await tick();
 f.storage.set(KEY,'B');f.win.dispatchEvent(event('goxion:client-logout'));await f.legal.refresh();
 release({ok:true,habilitado:true,estado:'rechazado',acceso:{fase:'rechazado_final',restringido:true,bloquea_operaciones:true}});await late;
 assert.equal(f.legal.getState(),'aceptado');assert.equal(f.shell.hidden,true);assert.equal(f.main.inert,false);
 assert.deepEqual(f.requests.map(x=>x.token),['A','B']);
}
console.log('Legal: runtime único, no fallback, documento público, restricción autenticada, historial y logout aislados, respuestas tardías descartadas OK');
