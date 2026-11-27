import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import {createHmac} from 'node:crypto';

const secret='fixture-admin-secret-not-a-real-key';
const edge=readFileSync('supabase/functions/experiencia-servicio-admin/index.ts','utf8');
const source=readFileSync('assets/js/admin/37-admin-experiencia-servicio.js','utf8');
const signed=(role='goxion_admin',exp=Math.floor(Date.now()/1000)+3600,key=secret)=>{
 const p=Buffer.from(JSON.stringify({role,exp})).toString('base64url');
 return p+'.'+createHmac('sha256',key).update(p).digest('base64url');
};
test('Admin experience gateway: same signed contract, closed auth and categorical diagnostics',async()=>{
 let handler,dbCalls=0,config=true;
 const warnings=[];
 globalThis.Deno={env:{get:n=>n==='ADMIN_SESSION_SECRET'?(config?secret:''):n==='SUPABASE_URL'?'https://example.invalid':'fixture-only'},serve:fn=>{handler=fn}};
 globalThis.__experienceFixtureClient=()=>{dbCalls++;return {from:()=>{const chain={select:()=>chain,in:()=>chain,order:()=>chain,limit:async()=>({data:[],error:null})};return chain}}};
 const tmp=mkdtempSync(join(tmpdir(),'goxion-experience-'));const original=console.warn;console.warn=(...args)=>warnings.push(args.join(' '));
 try{
  const moduleSource=edge.replace(/^import[^\n]*\n/,'const createClient=globalThis.__experienceFixtureClient;\n');
  const target=join(tmp,'fixture.mts');writeFileSync(target,moduleSource);await import(pathToFileURL(target).href);
  const call=(token,action='reportes')=>handler(new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json','X-Admin-Token':token},body:JSON.stringify({accion:action})}));
  for(const [token,reason] of [['','missing_token'],['bad','invalid_format'],[signed('goxion_admin',Math.floor(Date.now()/1000)+3600,'other'),'invalid_signature'],[signed('goxion_client'),'invalid_role'],[signed('goxion_admin',1),'expired']]){
   const r=await call(token);assert.equal(r.status,401);assert.equal((await r.json()).code,'ADMIN_SESSION_INVALID');assert.equal(dbCalls,0);assert.equal(warnings.at(-1),'GX_ADMIN_EXPERIENCE_AUTH:'+reason);
  }
  for(const action of ['reportes','calificaciones']){const r=await call(signed(),action);assert.equal(r.status,200);assert.equal((await r.json()).ok,true)}
  assert.equal(dbCalls,2);
  config=false;const r=await call(signed());assert.equal(r.status,503);assert.equal(dbCalls,2);assert.equal(warnings.at(-1),'GX_ADMIN_EXPERIENCE_AUTH:configuration_missing');
  assert(!warnings.some(x=>x.includes(secret)||x.includes(signed())));
 }finally{console.warn=original;delete globalThis.Deno;delete globalThis.__experienceFixtureClient;rmSync(tmp,{recursive:true,force:true})}
});
test('Admin experience browser: coalesce read, fail closed, refresh and new-session recovery',async()=>{
 let token='fixture-session-a', calls=0, fail=false;
 const w={GOXION_CORE:{STORAGE:{ADMIN_TOKEN:'admin'},endpoint:()=>'/experience'}};
 const fetch=async(_url,req)=>{calls++;return {status:fail?401:200,ok:!fail,json:async()=>({ok:!fail})}};
 vm.runInNewContext(source,{window:w,document:{getElementById:()=>null},localStorage:{getItem:()=>token},fetch,Map,Error,Promise,JSON});
 const {request}=w.GOXION_ADMIN_EXPERIENCE;
 await Promise.all([request('reportes'),request('reportes'),request('reportes')]);assert.equal(calls,1);
 await request('calificaciones');assert.equal(calls,2);
 fail=true;await assert.rejects(request('reportes'),/sesión administrativa/);assert.equal(calls,3);
 await assert.rejects(request('reportes'),/sesión administrativa/);await assert.rejects(request('calificaciones'),/sesión administrativa/);assert.equal(calls,3);
 fail=false;await request('reportes',{}, {retry:true});assert.equal(calls,4);
 fail=true;await assert.rejects(request('reportes'));assert.equal(calls,5);
 token='fixture-session-b';fail=false;await request('reportes');assert.equal(calls,6);
 await Promise.all([request('revisar',{id:'a'}),request('revisar',{id:'b'})]);assert.equal(calls,8);
 token='';await assert.rejects(request('reportes'),/Inicia sesión/);assert.equal(calls,8);
});
