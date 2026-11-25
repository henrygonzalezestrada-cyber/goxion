import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={};
vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-feedback.js','utf8'),{window});

const F=window.GOXY_FEEDBACK;
test('semantic output uses only fixed orientation and read-only navigation',()=>{
 const allowed=['account','catalog','payment','pay-open','missions','promotions','policy-loyalty','policy-doc','policy-support','platforms'];
 for(const intent of ['identity','catalog','payment','payment_review','missions','loyalty','promotions','cancel','support','human','policy','clarify','__proto__','unexpected']){
   const r=F.semanticReply(intent);
   assert.ok(r.answer&&r.choices.every(c=>allowed.includes(c.kind)),intent);
 }
 assert.match(F.semanticReply('cancel').answer,/No he cancelado nada/);
});
test('votes are mutually exclusive and can be withdrawn',()=>{
 for(const v of [-1,1]){assert.equal(F.nextVote(v,v),0);assert.equal(F.nextVote(0,v),v);assert.equal(F.nextVote(-v,v),v);}
});

test('new modes fail closed outside isolated acceptance and only send categorical payloads',async()=>{
 let calls=[];
 const window={GOXION_QA_ISOLATED:false,GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'session'},endpoint:()=> 'https://qa.example/functions/v1/goxy-ai-qa'}};
 const location={pathname:'/goxion/ayuda-espejo-feed-v2.html'};
 const localStorage={getItem:()=> 'synthetic'};
 const fetch=async(url,init)=>{calls.push(JSON.parse(init.body));return {ok:true,json:async()=>({ok:true,vote:1,intent:'support'})};};
 vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-ai-client.js','utf8'),{window,location,localStorage,fetch});
 const api=window.GOXY_AI;
 assert.equal((await api.interpret('No comprendo el aviso','other')).code,'ENVIRONMENT_MISMATCH');
 assert.equal((await api.feedback({responseId:'synthetic',topic:'support',source:'local',vote:1})).code,'ENVIRONMENT_MISMATCH');
 location.pathname='/goxion/ayuda-aceptacion-v2.html';window.GOXION_QA_ISOLATED=true;
 assert.equal((await api.interpret('Mi PIN es 1234','other')).code,'SENSITIVE_OR_INVALID_INPUT');
 assert.equal(calls.length,0);
 assert.equal((await api.interpret('No comprendo el aviso','other')).ok,true);
 assert.deepEqual(calls[0],{mode:'interpret',message:'No comprendo el aviso',topic:'other'});
 assert.equal((await api.feedback({responseId:'synthetic',topic:'support',source:'local',vote:1,reason:null,secret:'never sent'})).ok,true);
 assert.deepEqual(calls[1],{mode:'feedback',responseId:'synthetic',topic:'support',source:'local',vote:1,reason:null});
});

test('HTTP failure cannot report successful feedback',async()=>{
 const window={GOXION_QA_ISOLATED:true,GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'session'},endpoint:()=> 'https://qa.example/functions/v1/goxy-ai-qa'}};
 const location={pathname:'/goxion/ayuda-aceptacion-v2.html'};
 const localStorage={getItem:()=> 'synthetic'};
 const fetch=async()=>({ok:false,json:async()=>({ok:true,vote:1})});
 vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-ai-client.js','utf8'),{window,location,localStorage,fetch});
 assert.equal((await window.GOXY_AI.feedback({responseId:'synthetic',topic:'support',source:'local',vote:1})).ok,false);
});
