import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const QA='https://nsvybyvvdpdgbgtvydfb.supabase.co',PROD='https://hmpevcwodcgbkviarfic.supabase.co';
const source='';
function storage(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}}}
test('actual acceptance guard permits only certified QA feedback, retains production and semantic blocks',async()=>{
 const calls=[],location=new URL('https://henrygonzalezestrada-cyber.github.io/goxion/ayuda-aceptacion-v2.html');
 const nativeLocal=storage();nativeLocal.setItem('goxion_client_token','production-fake-token');
 const context={URL,Response,location,navigator:{},document:{addEventListener(){}},localStorage:nativeLocal,sessionStorage:storage(),open(){},fetch:async(url,init)=>{
  const body=JSON.parse(init.body);calls.push({url:String(url),token:init.headers['X-Client-Token'],body});
  return new Response(JSON.stringify({ok:true,feedbackReady:true,semanticReady:false,verifiedReady:false,vote:body.vote}));
 }};
 context.window=context;vm.createContext(context);
 for(const path of ['preview/mi-espacio-v2/aceptacion/guard.js',source+'preview/mi-espacio-v2/aceptacion/core.js',source+'preview/goxion-ai/goxy-ai-client.js'])vm.runInContext(readFileSync(path,'utf8'),context,{filename:path});
 assert.equal(context.GOXION_QA_ISOLATED,true);
 assert.equal(context.GOXION_CORE.getClientToken(),'');
 context.localStorage.setItem('goxion_client_token','qa-fake-token');
 assert.equal(nativeLocal.getItem('goxion_client_token'),'production-fake-token');
 const status=await context.GOXY_AI.status();assert.equal(status.feedbackReady,true);assert.equal(status.semanticReady,false);
 const feedback={responseId:'11111111-1111-4111-8111-111111111111',topic:'support',source:'local',vote:-1,reason:'unresolved'};
 assert.equal((await context.GOXY_AI.feedback(feedback)).ok,true);
 assert.deepEqual(calls.map(c=>c.body.mode),['status','feedback']);
 assert.ok(calls.every(c=>c.url===QA+'/functions/v1/goxy-ai-qa'&&c.token==='qa-fake-token'));
 async function direct(url,body){return context.fetch(url,{method:'POST',headers:{'X-Client-Token':'qa-fake-token'},body:JSON.stringify(body)})}
 for(const body of [{mode:'interpret',message:'consulta'},{mode:'verified_route',platform:'Netflix',message:'consulta'}, {...feedback,mode:'feedback',text:'forbidden'},{...feedback,mode:'feedback',responseId:'bad'}, {...feedback,mode:'feedback',vote:1}])assert.equal((await direct(QA+'/functions/v1/goxy-ai-qa',body)).status,403);
 assert.equal((await direct(PROD+'/functions/v1/goxy-ai-beta',{mode:'feedback',...feedback})).status,403);
 assert.equal(calls.length,2);
});
