import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const paths=['preview/mi-espacio-v2/aceptacion/guard.js','preview/mi-espacio-v2/aceptacion/core.js','preview/goxion-ai/goxy-ai-client.js','preview/goxion-ai/goxy-vision-client.js'];
const QA='https://nsvybyvvdpdgbgtvydfb.supabase.co';
const PROD='https://hmpevcwodcgbkviarfic.supabase.co';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}}}
test('Goxy uses the real QA guard and session isolation, not a direct server shortcut',async()=>{
 const calls=[],location=new URL('https://henrygonzalezestrada-cyber.github.io/goxion/ayuda-aceptacion-v2.html');
 const nativeLocal=storage();nativeLocal.setItem('goxion_client_token','production-fake-token');
 const context={URL,Response,location,navigator:{},document:{addEventListener(){}},localStorage:nativeLocal,sessionStorage:storage(),open(){},fetch:async(url,init)=>{
  calls.push({url:String(url),token:init.headers['X-Client-Token'],mode:JSON.parse(init.body).mode});
  return new Response(JSON.stringify({ok:true,configured:true,providerReady:true,exampleReady:true,ready:false}));
 }};
 context.window=context;vm.createContext(context);
 for(const path of paths)vm.runInContext(readFileSync(path,'utf8'),context,{filename:path});
 assert.equal(context.GOXION_QA_ISOLATED,true);
 assert.equal(context.GOXION_CORE.getClientToken(),'');
 context.localStorage.setItem('goxion_client_token','qa-fake-token');
 assert.equal(nativeLocal.getItem('goxion_client_token'),'production-fake-token');
 assert.equal((await context.GOXY_AI.status()).providerReady,true);
 assert.equal((await context.GOXY_VISION.status()).exampleReady,true);
 assert.equal((await context.GOXY_VISION.example()).ok,true);
 assert.equal((await context.GOXY_AI.ask({message:'No reproduce',platform:'Netflix',issueIndex:2})).ok,true);
 assert.equal((await context.GOXY_AI.account('missions')).ok,true);
 assert.equal((await context.GOXY_AI.forecast('2026-11-30')).ok,true);
 assert.equal((await context.fetch(PROD+'/functions/v1/goxy-ai-beta',{method:'POST',body:'{"mode":"status"}'})).status,403);
 assert.equal((await context.fetch(QA+'/functions/v1/goxy-vision-qa',{method:'POST',body:'{"mode":"unknown"}'})).status,403);
 assert.equal(calls.length,6);
 assert.ok(calls.every(c=>c.url.startsWith(QA+'/functions/v1/')&&c.token==='qa-fake-token'));
 assert.deepEqual(calls.map(c=>[c.url.split('/').pop(),c.mode]),[['goxy-ai-qa','status'],['goxy-vision-qa','status'],['goxy-vision-qa','example'],['goxy-ai-qa','chat'],['goxy-ai-qa','account'],['goxy-ai-qa','forecast']]);
});
test('acceptance HTML loads the current contract in order',()=>{
 const html=readFileSync('ayuda-aceptacion-v2.html','utf8');
 const scripts=paths.map(p=>html.indexOf(p+'?v='));
 assert.ok(scripts.every(i=>i>=0));
 assert.ok(scripts.every((i,k)=>k===0||i>scripts[k-1]));
 assert.ok(html.includes("connect-src 'self' "+QA));
});
