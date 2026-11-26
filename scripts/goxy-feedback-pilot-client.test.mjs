import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const src=readFileSync('preview/goxion-ai/goxy-ai-client.js','utf8');
const mascot=readFileSync('preview/goxion-ai/mascota.js','utf8');
const payload={responseId:'33333333-3333-4333-8333-333333333333',topic:'support',source:'local',vote:1,reason:null};
function setup(path,qa,endpoint){
 const calls=[];const window={GOXION_QA_ISOLATED:qa,GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'token'},endpoint:()=>endpoint}};
 const location={pathname:'/goxion/'+path},localStorage={getItem:()=> 'synthetic'};
 const fetch=async(url,init)=>{calls.push({url,body:JSON.parse(init.body)});return {ok:true,json:async()=>({ok:true,feedbackReady:true,vote:1})}};
 vm.runInNewContext(src,{window,location,localStorage,fetch});return {ai:window.GOXY_AI,calls};
}
test('mirror pilot requests server readiness and categorical feedback only',async()=>{
 const {ai,calls}=setup('ayuda-espejo-feed-v2.html',false,'https://prod.test/functions/v1/goxy-ai-beta');
 assert.equal((await ai.status()).feedbackReady,true);assert.equal((await ai.feedback(payload)).ok,true);
 assert.deepEqual(calls.map(x=>x.body),[{mode:'status',feedbackPilot:true},{mode:'feedback',...payload}]);
 for(const action of [()=>ai.interpret('consulta','support'),()=>ai.verifiedRoute('consulta','Netflix')])assert.equal((await action()).code,'ENVIRONMENT_MISMATCH');
 assert.equal(calls.length,2);
});
test('production official remains ordinary, non-pilot path cannot send feedback',async()=>{
 for(const path of ['ayuda.html','index.html','otro.html']){
  const {ai,calls}=setup(path,false,'https://prod.test/functions/v1/goxy-ai-beta');
  await ai.status();assert.deepEqual(calls.map(x=>x.body),[{mode:'status'}]);
  assert.equal((await ai.feedback(payload)).code,'ENVIRONMENT_MISMATCH');assert.equal(calls.length,1);
 }
 const x=setup('ayuda-espejo-feed-v2.html',false,'https://qa.test/functions/v1/goxy-ai-qa');
 assert.equal((await x.ai.feedback(payload)).code,'ENVIRONMENT_MISMATCH');assert.equal(x.calls.length,0);
});
test('existing QA contract is unchanged and feedback UI is server gated',async()=>{
 const {ai,calls}=setup('ayuda-aceptacion-v2.html',true,'https://qa.test/functions/v1/goxy-ai-qa');
 await ai.status();await ai.feedback(payload);
 assert.deepEqual(calls.map(x=>x.body),[{mode:'status'},{mode:'feedback',...payload}]);
 assert.match(mascot,/feedbackReady=Boolean\(learning&&\(window\.GOXION_QA_ISOLATED\|\|location\.pathname\.endsWith\('\/ayuda-espejo-feed-v2\.html'\)\)&&state\.ok===true&&state\.feedbackReady===true\)/);
 assert.match(mascot,/semanticReady=Boolean\(learning&&window\.GOXION_QA_ISOLATED/);
 assert.match(mascot,/if\(!feedbackReady\|\|!learning\|\|!active\|\|!authenticated\(\)\|\|!node\)return/);
});
