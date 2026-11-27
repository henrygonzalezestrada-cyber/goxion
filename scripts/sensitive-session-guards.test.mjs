import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHmac} from 'node:crypto';
const key='fixture-only-not-a-session-key';
const sign=(role,cliente_id='fixture-customer',exp=Math.floor(Date.now()/1000)+600,secret=key)=>{
 const p=Buffer.from(JSON.stringify({role,cliente_id,exp})).toString('base64url');
 return p+'.'+createHmac('sha256',secret).update(p).digest('base64url');
};
async function fixture(path,factory,fn){
 const tmp=mkdtempSync(join(tmpdir(),'goxion-sensitive-fixture-'));
 let handler,dbCalls=0;
 globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://example.invalid':key},serve:f=>{handler=f}};
 globalThis.__fixtureSb=()=>{dbCalls++;return factory()};
 globalThis.__fixtureBcrypt={compareSync:pin=>pin==='8642'};
 try{
  const s=readFileSync(path,'utf8').replace(/^import[^\n]*\n/gm,'');
  const absolute=join(tmp,'fixture.mts');writeFileSync(absolute,'const createClient=globalThis.__fixtureSb;const bcrypt=globalThis.__fixtureBcrypt;\n'+s);await import(pathToFileURL(absolute).href);
  const call=(header,token,body)=>handler(new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',[header]:token},body:JSON.stringify(body)}));
  await fn(call,()=>dbCalls)
 }finally{delete globalThis.Deno;delete globalThis.__fixtureSb;delete globalThis.__fixtureBcrypt;rmSync(tmp,{recursive:true,force:true})}
}
test('operations: malformed, empty, expired and forged sessions rejected before DB; legitimate rejection preserves loyalty',async()=>{
 const writes=[];
 const sb={from:table=>({select:()=>({eq:()=>({single:async()=>({data:{id:'fixture-customer',nombre:'QA fixture',folio:'QA',pagos_puntuales:4,estado:'pendiente',pago_en_revision:true},error:null})})}),update:values=>({eq:async()=>{writes.push({table,values});return {error:null}}}),insert:async values=>{writes.push({table,values});return {error:null}}})};
 await fixture('docs/backend/legal-v2-official/admin-operaciones.ts',()=>sb,async(call,dbCalls)=>{
  for(const tok of ['','malformed.?','one.two.three',sign('goxion_client'),sign('goxion_admin','fixture-customer',1),sign('goxion_admin','fixture-customer',Math.floor(Date.now()/1000)+600,'invalid')]){
   const r=await call('X-Admin-Token',tok,{accion:'rechazar_pago',datos:{cliente_id:'fixture-customer'}});assert.equal(r.status,401);assert.equal(dbCalls(),0)
  }
  const r=await call('X-Admin-Token',sign('goxion_admin'),{accion:'rechazar_pago',datos:{cliente_id:'fixture-customer',mensaje:'QA synthetic test'}});
  assert.equal(r.status,200);assert.equal((await r.json()).estado,'rechazado');
  assert.equal(writes.length,2);assert.equal(writes[0].table,'clientes');assert.equal(writes[0].values.pago_revision_estado,'rechazado');assert.equal(writes[0].values.pago_en_revision,false);assert(!('pagos_puntuales' in writes[0].values));assert(!writes.some(x=>x.table==='pagos'));assert.equal(writes[1].table,'notificaciones_admin');
 });
});
test('one-time credential: invalid session, legal guard, ownership, PIN, expiration, revocation and concurrent consumption',async()=>{
 let state='pendiente',restricted=false,suspended=false,expired=false,revoked=false,vaultCalls=0;
 const owner='fixture-customer';
 const makeRow=()=>({id:'fixture-delivery',cliente_id:owner,cliente_servicio_id:'fixture-service',estado:state,expira_at:expired?'2000-01-01T00:00:00Z':'2099-01-01T00:00:00Z',credenciales_plataforma:{vault_secret_id:'fixture-vault',plataforma:'QA',cuenta_login:'qa.invalid',version:1,activa:!revoked},cliente_servicios:{nombre:'QA',activo:true}});
 const sb={from(table){
  let projection='',filter={},updates=null;
  const q={select:p=>{projection=p;if(updates){if(filter.estado===state&&filter.id==='fixture-delivery'){state=updates.estado;return Promise.resolve({data:[{id:'fixture-delivery'}],error:null})}return Promise.resolve({data:[],error:null})}return q},eq:(k,v)=>{filter[k]=v;return q},update:v=>{updates=v;return q},maybeSingle:async()=>{
   if(table==='clientes')return {data:{estado:suspended?'suspendido':'pendiente'},error:null};
   return {data:filter.cliente_id===owner&&filter.id==='fixture-delivery'?makeRow():null,error:null}
  },single:async()=>({data:{id:owner,codigo_hash:'fixture-not-hash'},error:null}),then:(resolve)=>{if(updates&&filter.estado===state&&filter.id==='fixture-delivery')state=updates.estado;resolve({error:null})}};return q
 },rpc:async(name)=>{if(name==='goxion_legal_estado_acceso')return {data:{restringido:restricted},error:null};assert.equal(name,'goxion_vault_read_secret');vaultCalls++;return {data:'fake-fixture-password',error:null}}};
 await fixture('docs/backend/legal-v2-official/credenciales-cliente.ts',()=>sb,async(call,dbCalls)=>{
  const req=(tok=sign('goxion_client',owner),pin='8642',id='fixture-delivery')=>call('X-Client-Token',tok,{accion:'revelar',datos:{entrega_id:id,pin}});
  for(const tok of ['','bad.?',sign('goxion_admin'),sign('goxion_client',owner,1),sign('goxion_client',owner,Math.floor(Date.now()/1000)+600,'other')]){assert.equal((await req(tok)).status,401);assert.equal(dbCalls(),0)}
  suspended=true;assert.equal((await req()).status,403);suspended=false;restricted=true;assert.equal((await req()).status,403);restricted=false;
  assert.equal((await req(undefined,'9999')).status,401);
  assert.equal((await req(sign('goxion_client','other'))).status,404);
  assert.equal((await req(undefined,undefined,'other')).status,404);
  expired=true;assert.equal((await req()).status,410);expired=false;state='pendiente';
  revoked=true;assert.equal((await req()).status,410);revoked=false;assert.equal(vaultCalls,0);
  const pair=await Promise.all([req(),req()]);assert.deepEqual(pair.map(r=>r.status).sort(),[200,409]);assert.equal(state,'vista');
  const ok=pair.find(r=>r.status===200);assert.match(ok.headers.get('Cache-Control'),/no-store/);assert.equal((await ok.json()).one_time,true);
  assert(!Object.hasOwn(await pair.find(r=>r.status===409).json(),'password'));
  assert.equal((await req()).status,409);
 });
});