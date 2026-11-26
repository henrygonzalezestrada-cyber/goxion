import assert from 'node:assert/strict';
const SITE='https://henrygonzalezestrada-cyber.github.io',DB='https://nsvybyvvdpdgbgtvydfb.supabase.co';
const KEY='fake-local-test-key-not-used-on-network', CLIENT='11111111-1111-4111-8111-111111111111';
const RESP='22222222-2222-4222-8222-222222222222';
let handler, currentUser='qa-v2-beneficios', ready=true, responseOverride=null, providerKey=null, calls=[], votes=new Map();
globalThis.Deno={env:{get:(name)=>name==='SUPABASE_SERVICE_ROLE_KEY'?KEY:name==='GROQ_API_KEY'?providerKey:null},serve:f=>handler=f};
globalThis.fetch=async (url,init={})=>{
  calls.push({url:String(url),method:init.method||'GET',body:init.body?JSON.parse(init.body):null});
  if(String(url).startsWith(DB+'/rest/v1/clientes?'))return Response.json([{estado:'activo',usuario_acceso:currentUser}]);
  if(String(url)===DB+'/rest/v1/rpc/goxy_feedback_write'){
    const p=JSON.parse(init.body);
    if(p.p_actor===null){assert.ok(Object.values(p).every(v=>v===null));return ready?Response.json({ok:false,code:'INVALID_FEEDBACK'}):Response.json({code:'PGRST202'},{status:404})}
    if(responseOverride!==null)return Response.json(responseOverride);
    assert.match(p.p_actor,/^[a-f0-9]{64}$/);assert.notEqual(p.p_actor,CLIENT);
    assert.deepEqual(Object.keys(p).sort(),['p_actor','p_reason','p_response','p_source','p_topic','p_vote'].sort());
    votes.set(p.p_actor+':'+p.p_response,p.p_vote);
    return Response.json({ok:true,vote:p.p_vote,unwanted:'not returned'});
  }
  if(String(url)==='https://api.groq.com/openai/v1/models')return Response.json({data:[{id:'openai/gpt-oss-20b'}]});
  throw Error('UNEXPECTED MOCK FETCH '+url);
};
await import('../supabase/functions/goxy-ai-qa/index.ts');
assert.equal(typeof handler,'function');
const enc=new TextEncoder(),b64=b=>Buffer.from(b).toString('base64url');
const encoded=b64(JSON.stringify({role:'goxion_client',cliente_id:CLIENT,exp:Math.floor(Date.now()/1000)+3600}));
const key=await crypto.subtle.importKey('raw',enc.encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const sig=await crypto.subtle.sign('HMAC',key,enc.encode(encoded));
const token=encoded+'.'+b64(sig);
const f={mode:'feedback',responseId:RESP,topic:'support',source:'local',vote:1,reason:null};
async function post(body,{t=token,origin=SITE}={}){const r=await handler(new Request('https://qa.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Client-Token':t},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()}}
let r=await post({mode:'status'});assert.equal(r.body.feedbackReady,true);assert.equal(r.body.semanticReady,false);assert.equal(r.body.verifiedReady,false);assert.equal(r.body.providerReady,false);assert.equal(votes.size,0);
ready=false;r=await post({mode:'status'});assert.equal(r.body.feedbackReady,false);ready=true;
providerKey='local-fake-provider';r=await post({mode:'status'});assert.equal(r.body.providerReady,true);assert.equal(r.body.feedbackReady,true);providerKey=null;
for(const [vote,reason] of [[1,null],[-1,'incorrect'],[0,null]]){r=await post({...f,vote,reason});assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true,vote,unchanged:false,warning:false})}
assert.equal(votes.size,1);assert.equal([...votes.values()][0],0);
const n=calls.filter(c=>c.url.endsWith('/rpc/goxy_feedback_write')).length;
for(const bad of [{...f,comment:'private'},{...f,responseId:'bad'},{...f,reason:'incorrect'},{...f,vote:2},{...f,topic:'secret'},{...f,source:'private'}]){r=await post(bad);assert.equal(r.status,422);assert.equal(r.body.code,'INVALID_FEEDBACK')}
assert.equal(calls.filter(c=>c.url.endsWith('/rpc/goxy_feedback_write')).length,n);
r=await post(f,{t:'bad'});assert.equal(r.status,401);r=await post(f,{origin:'https://bad.invalid'});assert.equal(r.status,403);
currentUser='non-qa';r=await post(f);assert.equal(r.status,403);assert.equal(r.body.code,'QA_ACCOUNT_REQUIRED');currentUser='qa-v2-beneficios';
for(const mode of ['interpret','verified_route']){r=await post({mode});assert.equal(r.body.code,'MODE_UNSUPPORTED')}
responseOverride={ok:true,vote:-1};r=await post(f);assert.equal(r.status,503);assert.equal(r.body.code,'FEEDBACK_UNAVAILABLE');
responseOverride={ok:false,code:'FEEDBACK_PAUSE',private:'not returned'};r=await post(f);assert.equal(r.status,422);assert.deepEqual(r.body,{ok:false,code:'FEEDBACK_PAUSE'});
assert.ok(calls.filter(c=>c.url.includes('api.groq.com')).every(c=>c.url.endsWith('/models')));
console.log('PASS: gateway handler status/probe, provider independence, vote/change/withdraw, categorical payload, pseudonym, auth/origin/QA isolation, error sanitation, disabled advanced modes; no new provider calls.');
