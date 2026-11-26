import assert from 'node:assert/strict';
const SITE='https://henrygonzalezestrada-cyber.github.io',DB='https://hmpevcwodcgbkviarfic.supabase.co';
const KEY='local-synthetic-signature-only',PILOT='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const RID='33333333-3333-4333-8333-333333333333';
let handler,enabled=true,ready=true,providerKey=null,calls=[],votes=new Map(),blocked=false;
globalThis.Deno={env:{get:n=>n==='SUPABASE_SERVICE_ROLE_KEY'?KEY:n==='GROQ_API_KEY'?providerKey:null},serve:f=>handler=f};
globalThis.fetch=async(url,init={})=>{
 const u=String(url),body=init.body?JSON.parse(init.body):null;calls.push({u,body});
 if(u.startsWith(DB+'/rest/v1/clientes?'))return Response.json([{estado:blocked?'suspendido':'activo'}]);
 if(u===DB+'/rest/v1/rpc/goxy_feedback_pilot'){
  assert.deepEqual(Object.keys(body).sort(),['p_actor','p_client_id','p_reason','p_response','p_source','p_topic','p_vote'].sort());
  if(!enabled||body.p_client_id!==PILOT)return Response.json({ok:false,code:'PILOT_REQUIRED'});
  if(!ready)return Response.json({code:'PGRST202'},{status:404});
  if(body.p_actor===null){assert.ok(Object.entries(body).filter(([k])=>k!=='p_client_id').every(([,v])=>v===null));return Response.json({ok:false,code:'INVALID_FEEDBACK'});}
  assert.match(body.p_actor,/^[a-f0-9]{64}$/);assert.notEqual(body.p_actor,PILOT);
  const k=body.p_actor+':'+body.p_response,prior=votes.get(k),unchanged=prior?.vote===body.p_vote&&prior?.reason===body.p_reason;
  votes.set(k,{vote:body.p_vote,reason:body.p_reason});return Response.json({ok:true,vote:body.p_vote,unchanged,unwanted:'not returned'});
 }
 if(u==='https://api.groq.com/openai/v1/models')return Response.json({data:[{id:'openai/gpt-oss-20b'}]});
 throw Error('UNEXPECTED FETCH '+u);
};
await import('../supabase/functions/goxy-ai-beta/index.ts');
const enc=new TextEncoder(),key=await crypto.subtle.importKey('raw',enc.encode(KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
async function token(id){const body=Buffer.from(JSON.stringify({role:'goxion_client',cliente_id:id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return body+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,enc.encode(body))).toString('base64url');}
const t=await token(PILOT),other=await token(OTHER);
async function post(body,{session=t,origin=SITE}={}){const r=await handler(new Request('https://test.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Client-Token':session},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()}}
const f={mode:'feedback',responseId:RID,topic:'support',source:'local',vote:1,reason:null};
let r=await post({mode:'status'});assert.deepEqual(r.body,{ok:true,configured:false,providerReady:false,code:'AI_NOT_CONFIGURED'});assert.equal(calls.filter(c=>c.u.includes('goxy_feedback_pilot')).length,0);
r=await post({mode:'status',feedbackPilot:true});assert.equal(r.body.feedbackReady,true);assert.equal(r.body.semanticReady,false);assert.equal(r.body.verifiedReady,false);
r=await post({mode:'status',feedbackPilot:true},{session:other});assert.equal(r.body.feedbackReady,false);
r=await post(f,{session:other});assert.equal(r.status,403);assert.equal(r.body.code,'PILOT_REQUIRED');assert.equal(votes.size,0);
r=await post(f,{session:'bad'});assert.equal(r.status,401);
r=await post(f,{origin:'https://bad.invalid'});assert.equal(r.status,403);
blocked=true;r=await post(f);assert.equal(r.status,403);blocked=false;
r=await post({...f,p_client_id:PILOT});assert.equal(r.status,422);assert.equal(votes.size,0);
r=await post({...f,comment:'no text'});assert.equal(r.status,422);
enabled=false;r=await post(f);assert.equal(r.status,403);r=await post({mode:'status',feedbackPilot:true});assert.equal(r.body.feedbackReady,false);enabled=true;
ready=false;r=await post({mode:'status',feedbackPilot:true});assert.equal(r.body.feedbackReady,false);r=await post(f);assert.equal(r.status,503);ready=true;
for(const [vote,reason,unchanged] of [[1,null,false],[1,null,true],[-1,'incorrect',false],[0,null,false]]){
 r=await post({...f,vote,reason});assert.equal(r.status,200);assert.deepEqual(r.body,{ok:true,vote,unchanged,warning:false});
}
assert.equal(votes.size,1);assert.deepEqual([...votes.values()][0],{vote:0,reason:null});
for(const mode of ['interpret','verified_route']){r=await post({mode});assert.equal(r.body.code,'MODE_UNSUPPORTED');}
providerKey='synthetic-provider-key';r=await post({mode:'status',feedbackPilot:true});assert.equal(r.body.providerReady,true);assert.equal(r.body.feedbackReady,true);providerKey=null;
assert.equal(calls.filter(c=>c.u.includes('api.groq.com')).length,1);assert.ok(calls.filter(c=>c.u.includes('api.groq.com')).every(c=>c.u.endsWith('/models')));
console.log('PASS: same production handler, normal status unchanged, signed pilot only, deny others/disabled/blocked/guest, fail closed, positive/replay/change/withdraw, no provider traffic for feedback.');
