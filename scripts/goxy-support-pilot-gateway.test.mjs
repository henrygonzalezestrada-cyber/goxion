import {test} from 'node:test';
import assert from 'node:assert/strict';
const tokenSecret='test-service-not-real';
const pilot='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const site='https://henrygonzalezestrada-cyber.github.io';
const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(tokenSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const sign=async(id,exp=Math.floor(Date.now()/1000)+120)=>{
 const p=Buffer.from(JSON.stringify({role:'goxion_client',cliente_id:id,exp})).toString('base64url');
 const sig=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(p))).toString('base64url');
 return p+'.'+sig;
};
let handler;
globalThis.Deno={serve(fn){handler=fn;},env:{get(n){return n==='SUPABASE_SERVICE_ROLE_KEY'?tokenSecret:n==='GROQ_API_KEY'?'mock-key':undefined;}}};
await import('../supabase/functions/goxy-support-pilot/index.ts');
const realFetch=globalThis.fetch;
const calls=[];
let alert=[{activa:true,plataforma:'Vix Premium',falla:'presentando intermitencias temporales'}],blocked=false,gateError=false,quotaAllowed=true;
globalThis.fetch=async (url,opts={})=>{
 const u=new URL(url),path=u.pathname;
 calls.push({path,body:opts.body?JSON.parse(opts.body):null});
 const json=(x,status=200)=>Response.json(x,{status});
 if(path.endsWith('/clientes'))return json([{estado:blocked?'suspendido':'activo'}]);
 if(path.endsWith('/goxy_feedback_pilot')){if(gateError)return json({},500);const body=JSON.parse(opts.body);assert.equal(body.p_actor,null);assert.equal(body.p_response,null);return json({ok:false,code:body.p_client_id===pilot?'INVALID_FEEDBACK':'PILOT_REQUIRED'});}
 if(path.endsWith('/alertas'))return json(alert);
 if(path.endsWith('/models'))return json({data:[{id:'qwen/qwen3.8-27b',active:true}]});
 if(path.endsWith('/goxy_ai_beta_take_quota'))return json([{allowed:quotaAllowed,remaining:7,retry_after:21}]);
 if(path.endsWith('/chat/completions')){const body=JSON.parse(opts.body);assert.equal(body.model,'qwen/qwen3.8-27b');assert.equal(body.messages.length,2);assert.ok(!opts.body.includes(pilot));assert.ok(!opts.body.includes(other));return json({choices:[{message:{content:JSON.stringify({platform:'ViX',issueIndex:null,category:'other',answer:'Parece una pantalla de acceso.'})}}]});}
 throw Error('unexpected '+path);
};
async function post(body,id=pilot,origin=site,overrideToken){
 const token=overrideToken??await sign(id);
 const r=await handler(new Request('https://fixture.functions/goxy-support-pilot',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Client-Token':token},body:JSON.stringify(body)}));
 return {status:r.status,data:await r.json().catch(()=>null)};
}
const jpeg='data:image/jpeg;base64,'+"/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAAgACADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD13UNQtdKsZL29l8q3ixvfaWxkgDgAnqRWJ/wsLwt/0FP/ACXl/wDiaPiF/wAiRqH/AGz/APRi14nXFiMROlOyPqMnyehjqDqVG007aW7Lyfc9s/4WF4W/6Cn/AJLy/wDxNben6ha6rYx3tlL5tvLnY+0rnBIPBAPUGvnivbPh7/yJGn/9tP8A0Y1GHxE6s7MM4yehgaCqU2227a27PyXYPiF/yJGof9s//Ri14nX0PqGn2uq2Mllexebby43puK5wQRyCD1ArE/4V74W/6Bf/AJMS/wDxVGIw86s7oMnzihgaDp1E2276W7LzXY8Tr2z4e/8AIkaf/wBtP/RjUf8ACvfC3/QL/wDJiX/4qtvT9PtdKsY7Kyi8q3izsTcWxkknkknqTRh8POlO7DOM4oY6gqdNNNO+tuz833P/2Q==";
test('pilot only, no provider or alert read before server authorization',async()=>{
 calls.length=0;let r=await post({mode:'incident'},other);assert.equal(r.status,403);assert.equal(r.data.code,'PILOT_REQUIRED');assert.ok(!calls.some(x=>x.path.endsWith('/alertas')||x.path.endsWith('/models')));
 calls.length=0;assert.equal((await post({mode:'status'},pilot,site,'invalid')).status,401);assert.equal(calls.length,0);
 assert.equal((await post({mode:'status'},pilot,site,await sign(pilot,1))).status,401);
 assert.equal((await post({mode:'status'},pilot,'https://evil.invalid')).status,403);
 blocked=true;assert.equal((await post({mode:'incident'})).data.code,'ACCOUNT_BLOCKED');blocked=false;
 gateError=true;assert.equal((await post({mode:'incident'})).data.code,'PILOT_REQUIRED');gateError=false;
});
test('incident is same real alert table read; no AI, no quota, no raw messages; inactive and ambiguous are distinct',async()=>{
 calls.length=0;const a=await post({mode:'incident'});assert.deepEqual(a,{status:200,data:{ok:true,active:true,platform:'Vix Premium',intermittent:true}});
 assert.ok(!calls.some(x=>x.path.endsWith('/models')||x.path.endsWith('/quota')||x.path.endsWith('/completions')||x.path.includes('take_quota')));
 assert.equal((await post({mode:'incident',message:'private'})).status,403);
 alert=[{activa:false,plataforma:'ViX'}];assert.deepEqual((await post({mode:'incident'})).data,{ok:true,active:false});
 alert=[{},{}];assert.equal((await post({mode:'incident'})).data.code,'INCIDENT_UNAVAILABLE');
 alert=[{activa:true,plataforma:'Vix Premium',falla:'intermitencias'}];
});
test('vision status and test-only consent, valid JPEG, shared quota, exactly one provider call',async()=>{
 calls.length=0;assert.deepEqual((await post({mode:'status'})).data,{ok:true,pilotReady:true,ready:true,testOnly:true,exampleReady:false});
 const data={mode:'analyze',image:jpeg,message:'¿Qué aviso aparece?',consent:true,testConsent:true};
 calls.length=0;assert.equal((await post({...data,testConsent:false})).status,403);
 assert.equal((await post({...data,consent:false})).status,403);
 assert.equal((await post({...data,image:'https://private.invalid/photo.jpg'})).status,422);
 assert.equal((await post({...data,message:'mi pin es 1234'})).status,422);
 assert.equal((await post({...data,extra:'x'})).status,403);
 assert.equal(calls.filter(x=>x.path.includes('take_quota')).length,0);
 quotaAllowed=false;assert.equal((await post(data)).status,429);assert.equal(calls.filter(x=>x.path.endsWith('/completions')).length,0);quotaAllowed=true;
 calls.length=0;const r=await post(data);assert.equal(r.status,200);assert.equal(r.data.diagnosis.platform,'ViX');
 assert.equal(calls.filter(x=>x.path.includes('take_quota')).length,1);assert.equal(calls.filter(x=>x.path.endsWith('/completions')).length,1);
});
test.after(()=>{globalThis.fetch=realFetch});
