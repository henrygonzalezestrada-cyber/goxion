import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHmac,webcrypto} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';

const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const secret='synthetic-fixture-key',tasks='Conoce tus avisos [PUSH_PILOTO_GUIA]\nActiva los avisos en tu teléfono [PUSH_PILOTO_ACTIVAR]\nComparte tu experiencia [PUSH_PILOTO_FEEDBACK]';
function sign(role){const payload=Buffer.from(JSON.stringify({role,cliente_id:id,exp:Math.floor(Date.now()/1000)+300})).toString('base64url');return payload+'.'+createHmac('sha256',secret).update(payload).digest('base64url')}
function fixture(file,overrides={}){
 const opts={eligible:true,legal:{},conflict:false,...overrides},writes=[],g={id:'round',cliente_id:id,misiones_activas:true,descuento:5,tareas:'Catálogo [CATALOGO]\nSoporte [SOPORTE]',misiones_version:8,cupon_ciclo:4,cupon_reclamado_ciclo:4,cupon_reclamado:true,cupon_reclamado_at:'2026-01-01'};
 const result=data=>({data,error:null});
 const sb={rpc:async(name)=>result(name==='goxion_push_eligible'?opts.eligible:opts.legal),from(table){let filters={},updates=null;
 const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},is:(k,v)=>{filters[k]=v;return q},update:v=>{updates=v;return q},upsert:async rows=>{writes.push({table,rows});return result(null)},order:async()=>result(opts.progress||[]),maybeSingle:async()=>{
  if(table==='clientes')return result(filters.id===id?{id,clave:'casone',estado:'activo'}:null);
  if(table==='gamificacion'){if(updates){if(opts.conflict||Object.entries(filters).some(([k,v])=>g[k]!==v))return result(null);writes.push({table,updates});Object.assign(g,updates)}return result({...g})}
  throw Error('Unexpected table '+table)
 }};return q}};
 let handler;
 const env={SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:secret,ADMIN_SESSION_SECRET:secret};
 vm.runInNewContext(stripTypeScriptTypes(readFileSync('docs/backend/legal-v2-official/'+file+'.ts','utf8').replace(/^import[^\n]*\n/gm,'')),{createClient:()=>sb,Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn}},crypto:webcrypto,TextEncoder,TextDecoder,Request,Response,atob,btoa,console});
 const admin=file==='admin-ajustes';
 const call=async(body,token=sign(admin?'goxion_admin':'goxion_client'))=>{const r=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{[admin?'X-Admin-Token':'X-Client-Token']:token,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,body:await r.json()}};
 return {call,opts,g,writes}
}
const activate=(cliente_id=id)=>({accion:'activar_mision_push_piloto',datos:{cliente_id}});
test('signed admin, Casone only, legal and eligibility gates, round protection',async()=>{
 const f=fixture('admin-ajustes');
 assert.equal((await f.call(activate(),'')).status,401);
 assert.equal((await f.call(activate(),sign('goxion_client'))).status,401);
 assert.equal((await f.call(activate('bad'))).status,400);
 assert.equal((await f.call(activate(other))).status,403);
 f.opts.eligible=false;assert.equal((await f.call(activate())).status,409);f.opts.eligible=true;
 f.opts.legal={restringido:true};assert.equal((await f.call(activate())).status,409);f.opts.legal={};
 f.g.cupon_reclamado_ciclo=3;assert.equal((await f.call(activate())).status,409);f.g.cupon_reclamado_ciclo=4;
 f.opts.conflict=true;assert.equal((await f.call(activate())).status,409);f.opts.conflict=false;
 assert.equal(f.writes.length,0);
 const r=await f.call(activate());assert.equal(r.status,200);assert.equal(f.g.cupon_ciclo,5);assert.equal(f.g.misiones_version,9);assert.equal(f.g.cupon_reclamado_ciclo,4);assert.equal(f.g.cupon_reclamado,false);assert.equal(f.g.cupon_reclamado_at,null);assert.equal(f.g.tareas,tasks);assert.equal(f.g.descuento,20);assert.equal(f.writes.length,1);assert.equal(f.writes[0].table,'gamificacion');
 assert.equal((await f.call(activate())).body.ya_activa,true);assert.equal(f.writes.length,1)
});
test('pilot progress is not forgeable and coupon is not redeemable; legacy completion remains valid',async()=>{
 const f=fixture('mi-espacio');Object.assign(f.g,{tareas:tasks,misiones_version:9,cupon_ciclo:5,cupon_reclamado:false,descuento:20});
 for(const body of [{modo:'completar_mision',mision_index:0},{modo:'completar_mision_tipo',tipo:'PUSH_PILOTO_ACTIVAR'},{modo:'importar_progreso_misiones',misiones_version:9,indices:[0,1,2]}]){
  const r=await f.call(body);assert.equal(r.status,200);assert.deepEqual(r.body.completadas,[])
 }
 assert.equal((await f.call({modo:'reclamar_cupon'})).status,409);assert.equal(f.writes.length,0);
 f.g.tareas='Catálogo [CATALOGO]';const r=await f.call({modo:'completar_mision',mision_index:0});assert.equal(r.status,200);assert.deepEqual(r.body.completadas,[0]);assert.equal(f.writes[0].table,'cliente_misiones_progreso')
});
test('native round renders without competing preview; no write-enabled client needed for pilot settings',()=>{
 const source=readFileSync('preview/mi-espacio-v2/official-feed-runtime-k3.js','utf8');
 const fn=source.slice(source.indexOf('function missionInfo('),source.indexOf('function benefitState('));
 const info=vm.runInNewContext(fn+';missionInfo')({gamificacion:{misiones_activas:true,tareas:tasks,descuento:20,misiones_version:9,cupon_ciclo:5,cupon_reclamado_ciclo:4},misiones_progreso:[]});
 assert.equal(info.pushPilot,true);assert.equal(info.done,0);assert.equal(info.total,3);assert.equal(info.claimed,false);
 assert.match(source,/if\(mi\.pushPilot&&kind\.startsWith\('push_piloto_'\)\).*openSettings\(\);return\}\s*if\(!ENABLE_WRITES\)return;/);
 assert.match(readFileSync('assets/js/ayuda/24-push-piloto.js','utf8'),/host\.hasAttribute\("data-gxb-push-pilot"\)/);
 assert.match(readFileSync('admin.html','utf8'),/onclick="gxActivatePushMissionPilot\(\)">Activar en Casone/);
});

test('legacy beta endpoint also blocks pilot coupon without changing earlier coupon behavior',async()=>{
 const f=fixture('mi-espacio-beta');Object.assign(f.g,{tareas:tasks,misiones_version:9,cupon_ciclo:5,cupon_reclamado:false,descuento:20});
 assert.equal((await f.call({modo:'reclamar_cupon'})).status,409);assert.equal(f.writes.length,0);
 f.g.tareas='Catálogo [CATALOGO]';f.g.cupon_ciclo=4;const r=await f.call({modo:'reclamar_cupon'});assert.equal(r.status,200);assert.equal(r.body.ya_reclamado,true);assert.equal(f.writes.length,0)
});
