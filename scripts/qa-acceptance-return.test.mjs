import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../preview/mi-espacio-v2/aceptacion/guard.js',import.meta.url),'utf8');
const root='https://example.test/goxion/';
const qa='https://nsvybyvvdpdgbgtvydfb.supabase.co';
function storage(){
  const data=new Map([['goxion_client_token','NOT-A-QA-SESSION']]);
  return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]??null,get length(){return data.size}};
}
function setup(route){
  const u=new URL(route,root),nav=[],calls=[],listeners={};
  const persisted=storage();
  const location={...Object.fromEntries(['href','origin','pathname','search'].map(k=>[k,u[k]])),assign:v=>nav.push(v),replace:v=>nav.push(new URL(v,u).href)};
  const window={localStorage:persisted,sessionStorage:storage(),fetch:async (...args)=>{calls.push(args);return new Response('{}')},open:v=>{nav.push(v);return true}};
  const document={addEventListener:(type,fn)=>{listeners[type]=fn}};
  vm.runInNewContext(src,{window,document,location,navigator:{},URL,URLSearchParams,Response,console});
  const click=(href,{close=true}={})=>{
    let prevented=false,stopped=false;
    const anchor={href:new URL(href,u).href,getAttribute:k=>k==='href'?href:null,matches:sel=>close&&sel==='a.gx-index-close-btn[aria-label="Mi Espacio"]'};
    listeners.click({target:{closest:()=>anchor},preventDefault:()=>{prevented=true},stopImmediatePropagation:()=>{stopped=true}});
    return {prevented,stopped};
  };
  return {window,persisted,calls,nav,click};
}
for(const route of ['index-aceptacion-v2.html','index-b2-aceptacion-v2.html?f3=1&cliente=qa-v2-20261123-b2']){
  const x=setup(route);
  assert.equal(x.window.GOXION_QA_ISOLATED,true);
  assert.equal(x.window.localStorage.getItem('goxion_client_token'),null);
  x.window.localStorage.setItem('goxion_client_token','synthetic');
  assert.equal(x.persisted.getItem('goxion_client_token'),'NOT-A-QA-SESSION');
  assert.equal(x.persisted.getItem('goxion-aceptacion-v2:goxion_client_token'),'synthetic');
  assert.deepEqual(x.click('ayuda.html'),{prevented:true,stopped:true});
  assert.deepEqual(x.nav,[root+'ayuda-aceptacion-v2.html']);
  for(const [link,options] of [['ayuda.html',{close:false}],['ayuda.html?next=admin.html',{}],['https://wa.me/?text=qa',{}],['admin.html',{}],['https://other.test/ayuda.html',{}]]){
    assert.deepEqual(x.click(link,options),{prevented:true,stopped:true});
  }
  assert.equal(x.nav.length,1);
  assert.deepEqual(x.click('ayuda-aceptacion-v2.html'),{prevented:false,stopped:false});
  assert.equal(x.window.open(root+'ayuda.html'),null);
  assert.equal((await x.window.fetch('https://hmpevcwodcgbkviarfic.supabase.co/functions/v1/mi-espacio',{method:'POST'})).status,403);
  assert.equal((await x.window.fetch(qa+'/functions/v1/admin-acciones',{method:'POST'})).status,403);
  assert.equal((await x.window.fetch(qa+'/functions/v1/mi-espacio',{method:'POST'})).status,200);
  assert.equal(x.calls.length,1);
}
const ayuda=setup('ayuda-aceptacion-v2.html');
assert.deepEqual(ayuda.click('ayuda.html'),{prevented:true,stopped:true});
assert.deepEqual(ayuda.nav,[]);
assert.throws(()=>setup('ayuda.html'),/Ruta QA inválida/);
console.log('PASS QA: retorno X exclusivo, sesión separada, bloqueo producción/Admin/externos y ruta QA permitida.');
