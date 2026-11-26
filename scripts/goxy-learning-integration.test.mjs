import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
test('verified lookup is isolated to QA, never sends additional client data',async()=>{
 const window={GOXION_QA_ISOLATED:false,GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'session'},endpoint:()=> 'https://qa.example/functions/v1/goxy-ai-qa'}};
 const location={pathname:'/goxion/ayuda-espejo-feed-v2.html'};
 const calls=[];const localStorage={getItem:()=> 'synthetic'};
 const fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:true,json:async()=>({ok:true,platform:'Netflix',guideId:1})};};
 vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-ai-client.js','utf8'),{window,location,localStorage,fetch});
 const ai=window.GOXY_AI;
 assert.equal((await ai.verifiedRoute('mi tele solicita actualizar hogar','Netflix')).code,'ENVIRONMENT_MISMATCH');
 location.pathname='/goxion/ayuda-aceptacion-v2.html';window.GOXION_QA_ISOLATED=true;
 assert.equal((await ai.verifiedRoute('PIN 1234','Netflix')).code,'SENSITIVE_OR_INVALID_INPUT');
 assert.equal(calls.length,0);
 assert.equal((await ai.verifiedRoute('mi tele solicita actualizar hogar','Netflix')).guideId,1);
 assert.deepEqual(calls,[{mode:'verified_route',message:'mi tele solicita actualizar hogar',platform:'Netflix'}]);
});
test('deployed QA stage contains feedback only and fails closed for future advanced modes',()=>{
 const s=readFileSync('supabase/functions/goxy-ai-qa/index.ts','utf8'),start=s.indexOf('Deno.serve');
 const a=s.indexOf('QA_ACCOUNT_REQUIRED',start),b=s.indexOf("if(body.mode==='feedback')",start),c=s.indexOf('if(body.mode==="status")',start),q=s.indexOf('const quota=',start);
 assert.ok(start<a&&a<b&&b<c&&c<q);
 assert.match(s,/feedbackReady/);assert.match(s,/semanticReady:false/);assert.match(s,/verifiedReady:false/);
 assert.doesNotMatch(s,/body\.mode==='verified_route'|body\.mode==='interpret'|rpc\/goxy_verified_route/);
 assert.match(s,/rpc\/goxy_feedback_write/);
});
test('client returns learned route to existing canonical guide, never loops',()=>{
 const s=readFileSync('preview/goxion-ai/mascota.js','utf8');
 assert.match(s,/verifiedReady&&!skipVerified&&!Number\.isInteger\(issueIndex\)&&!lastGuide&&!aiMode/);
 assert.match(s,/showGuide\(platform,reply\.guideId,query\)/);
 assert.match(s,/escalateAutomatically\(query,platform,undefined,true\)/);
 const official=readFileSync('ayuda.html','utf8');assert.doesNotMatch(official,/data-gx-support-v3|goxy-feedback\.js/);
});