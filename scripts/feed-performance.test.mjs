import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const root='preview/mi-espacio-v2/';
const source=name=>readFileSync(root+name,'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const key='client-token',storage=new Map([[key,'A']]);
const window=new EventTarget();
window.GOXION_CORE={STORAGE:{CLIENT_TOKEN:key},endpoint:name=>'https://fixture.invalid/'+name};
let calls=[],services=[{id:'s1',nombre:'Netflix',activo:true}],status=200,delay=12;
const doc={hidden:false,documentElement:{hasAttribute:()=>true}},nav={onLine:true};
const context=vm.createContext({window,document:doc,navigator:nav,localStorage:{
 getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
},Response,Date,Map,Set,Promise,setTimeout,clearTimeout,console,fetch:async(url,opts)=>{
 calls.push({url,opts});const code=status,session=opts.headers['X-Client-Token'];
 await sleep(delay);
 const data={ok:code===200,cliente:{id:session},servicios:services,solicitudes:[],entregas:[],novedades:[],accesos:[],estado_cuenta:{estado:'pagado'},historial:[]};
 return new Response(JSON.stringify(data),{status:code});
}});
vm.runInContext(source('feed-reads.js'),context);vm.runInContext(source('v2-data.js'),context);
const reads=window.GOXION_FEED_READS,data=window.GOXION_V2_DATA,endpoint=window.GOXION_CORE.endpoint;
const a=reads.request(endpoint('mi-espacio'),{},'A'),b=reads.request(endpoint('mi-espacio'),{},'A');
const [r1,r2]=await Promise.all([a,b]);assert.equal((await r1.json()).cliente.id,'A');assert.equal((await r2.json()).cliente.id,'A');assert.equal(calls.length,1);
await reads.request(endpoint('mi-espacio'),{},'A');assert.equal(calls.length,2,'no response cache');
await Promise.all([reads.request(endpoint('mi-espacio'),{modo:'completar_mision'},'A'),reads.request(endpoint('mi-espacio'),{modo:'completar_mision'},'A')]);assert.equal(calls.length,4,'writes never deduped');
calls=[];await data.restore('A');assert.equal(calls.length,8,'full read with active services');
services=[];calls=[];const empty=await data.restore('A');assert.equal(calls.length,5,'no card-specific reads for zero active services');assert.equal(empty.servicios.length,0);assert(calls.some(c=>c.url.endsWith('/historial-cliente')));assert(calls.some(c=>c.url.endsWith('/estado-financiero-b2-beta')));
services=[{id:'s1',nombre:'Netflix',activo:true}];calls=[];
const legacy=async()=>{await (await reads.request(endpoint('mi-espacio'),{},'A')).json();return Promise.all(['cancelaciones-cliente','credenciales-cliente','novedades-cliente','estado-cuenta-beta','accesos-cliente-beta'].map(name=>reads.request(endpoint(name),{accion:name==='estado-cuenta-beta'?'mi_estado':'listar',datos:{}},'A')))};
await Promise.all([legacy(),data.restore('A')]);assert.equal(calls.length,8,'six shared reads collapse into one flight each');
let batches=[];reads.subscribe((scope,batch)=>batches.push([...batch]));reads.subscribe(()=>{});
reads.schedule('client_notifications');reads.schedule('catalog');reads.schedule('account_state');reads.schedule('rewards');reads.schedule('resync');await sleep(210);
assert.deepEqual(batches,[['account_state','rewards','resync']]);
doc.hidden=true;reads.schedule('resync');await sleep(210);assert.equal(batches.length,1);doc.hidden=false;
nav.onLine=false;reads.schedule('resync');await sleep(210);assert.equal(batches.length,1);nav.onLine=true;
reads.schedule('resync');window.dispatchEvent(new Event('goxion:client-logout'));await sleep(210);assert.equal(batches.length,1,'logout cancels queued invalidation');
status=401;delay=35;const stale=data.load();storage.set(key,'B');await assert.rejects(stale,/sesión cambió/);assert.equal(storage.get(key),'B','old response cannot sign out later session');
status=200;calls=[];await data.restore('B');assert(calls.every(c=>c.opts.headers['X-Client-Token']==='B'));
console.log('Feed performance: 8 lecturas completas, 5 sin servicios, 6 lecturas compartidas sin caché, agrupación y sesiones aisladas OK');

// Exercise the real background controller with an instrumented scheduler and GL.
{
 let draws=0,seq=0,frames=new Map(),win=new EventTarget(),doc=new EventTarget(),motion=new EventTarget();
 const gl=new Proxy({createShader:()=>({}),createProgram:()=>({}),createBuffer:()=>({}),getShaderParameter:()=>true,getProgramParameter:()=>true,drawArrays:()=>draws++},{get:(o,k)=>o[k]||(()=>0)});
 const canvas={getContext:()=>gl,style:{}};
 doc.hidden=false;doc.documentElement={hasAttribute:()=>true};doc.getElementById=()=>canvas;
 motion.matches=true;win.matchMedia=()=>motion;win.innerWidth=390;win.innerHeight=844;win.devicePixelRatio=2;
 const tick=()=>{for(const [id,fn] of [...frames]){frames.delete(id);fn(100)}};
 vm.runInNewContext(readFileSync('assets/js/ayuda/06-wave-background.js','utf8'),{window:win,document:doc,performance:{now:()=>0},requestAnimationFrame:fn=>{frames.set(++seq,fn);return seq},cancelAnimationFrame:id=>frames.delete(id),console,Float32Array});
 assert.equal(frames.size,1);tick();assert.equal(draws,1);assert.equal(frames.size,0);
 win.dispatchEvent(new Event('resize'));tick();assert.equal(draws,2);assert.equal(frames.size,0);
 motion.matches=false;motion.dispatchEvent(new Event('change'));tick();assert.equal(draws,3);assert.equal(frames.size,1);
 doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));assert.equal(frames.size,0);
 doc.hidden=false;doc.dispatchEvent(new Event('visibilitychange'));tick();assert.equal(draws,4);assert.equal(frames.size,1);
 motion.matches=true;motion.dispatchEvent(new Event('change'));tick();assert.equal(draws,5);assert.equal(frames.size,0);
 console.log('Fondo: cuadro único con movimiento reducido, pausa oculta y reanudación normal OK');
}
