import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {stripTypeScriptTypes} from 'node:module';

// Tests run the exact pure validation logic deployed in comunicaciones-admin-preview.
// No real sessions, database writes, notifications, or requests are made.
const source=readFileSync('docs/edge/comunicaciones-admin-preview.ts','utf8');
const begin=source.indexOf('const uuidRx='),end=source.indexOf('Deno.serve(async req=>{');
assert(begin>=0&&end>begin,'Falta el bloque de validación del backend.');
assert(source.includes('["validar_plan","enviar","programar"].includes(body.accion)'),'El enrutador usa el mismo validador para preview, envío y programación');
assert(source.includes('if(requested!==stamp)'),'La validación requiere fecha real');
assert(source.includes('length>=1000'),'La validación bloquea datos truncados');
assert(!/sb\.from\("cliente_notificaciones"\)\.(insert|update|delete|upsert)\(/.test(source),'No permitir escrituras desde el validador de solo lectura');
const js=stripTypeScriptTypes(source.slice(begin,end),{mode:'strip'});
const valid=new Function('respond',js+'; return validarPlan;')(
  (obj,status=200)=>({status,body:obj})
);
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const P='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',P2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const CAM='99999999-9999-4999-8999-999999999999';
const clients=[
  {id:A,nombre:'Ana',misiones_total:4,misiones_pendientes:2,cobro_oficial:true,cobro_pagado:false,dias_para_cobro:2},
  {id:B,nombre:'Beto',misiones_total:4,misiones_pendientes:0,cobro_oficial:true,cobro_pagado:true,dias_para_cobro:null},
  {id:C,nombre:'Caro',misiones_total:4,misiones_pendientes:1,cobro_oficial:true,cobro_pagado:false,dias_para_cobro:20}
];
const promotions=[{id:P,activa:true,publicada:true,adquisicion_habilitada:true},
{id:P2,activa:true,publicada:true,adquisicion_habilitada:false}];
function mock({duplicates=[],ineligible=[],stockout=[],rpcError=[]}={}){
 let writes=0;const calls=[];
 const db={
  from(name){assert.equal(name,'cliente_notificaciones');return{
    select(){return{eq(field,key){assert.equal(field,'dedupe_key');assert(key.includes(CAM));return{
      in(field,ids){assert.equal(field,'cliente_id');calls.push({type:'lookup',ids});return Promise.resolve({data:ids.filter(id=>duplicates.includes(id)).map(cliente_id=>({cliente_id})),error:null})}
    }}}},
    insert(){writes++;throw Error('No writes allowed')}
  }},
  async rpc(name,params){
    calls.push({type:'rpc',name,id:params.p_cliente_id});
    const id=params.p_cliente_id;
    if(rpcError.includes(id))return {error:{message:'simulated'}};
    if(name==='goxion_promocion_elegibilidad')return {data:{elegible:!ineligible.includes(id)},error:null};
    if(name==='goxion_promocion_disponibilidad')return {data:{disponible:!stockout.includes(id)},error:null};
    throw Error('Unexpected RPC '+name);
  }
 };
 return {db,calls,get writes(){return writes}}
}
const plan=(tipo,rest={})=>({plan:{tipo,id_campana:CAM,agregar_ids:[],excluir_ids:[],...rest}});
async function run(type,extra={},options={},audience=clients){
 const m=mock(options); const res=await valid(m.db,plan(type,extra),audience,promotions);
 assert.equal(m.writes,0,'Ninguna ejecución puede insertar notificaciones');
 if(res.body.ok)assert.equal(res.body.envios_realizados,0);
 return {...res,db:m};
}

{const x=await run('missions');assert.deepEqual(x.body.seleccionados.map(c=>c.id),[A,C]);}
{const x=await run('missions',{agregar_ids:[B]});assert.equal(x.body.elegibles,2);assert(x.body.omitidos.some(c=>c.id===B&&c.motivo==='sin_misiones_pendientes'));}
{const x=await run('missions',{excluir_ids:[A]});assert.deepEqual(x.body.seleccionados.map(c=>c.id),[C]);}
{const x=await run('missions',{agregar_ids:[A],excluir_ids:[A]});assert.equal(x.status,400);}
{const x=await run('missions',{agregar_ids:['abcdef']});assert.equal(x.status,400);}
{const x=await run('missions',{agregar_ids:['44444444-4444-4444-8444-444444444444']});assert(x.body.omitidos.some(c=>c.motivo==='cliente_no_autorizado_o_sin_servicio'));}
{const x=await run('pay');assert.deepEqual(x.body.seleccionados.map(c=>c.id),[A]);}
{const x=await run('pay',{agregar_ids:[C]});assert.deepEqual(x.body.seleccionados.map(c=>c.id),[A,C]);}
{const x=await run('pay',{agregar_ids:[B]});assert.equal(x.body.elegibles,1);assert(x.body.omitidos.some(c=>c.id===B));}
{const x=await run('missions',{}, {duplicates:[A]});assert.deepEqual(x.body.seleccionados.map(c=>c.id),[C]);assert(x.body.omitidos.some(c=>c.motivo==='aviso_ya_registrado'));}
{const x=await run('promo',{promocion_id:P},{ineligible:[A],stockout:[B]});assert.deepEqual(x.body.seleccionados.map(c=>c.id),[C]);assert.equal(x.db.calls.filter(c=>c.type==='rpc').length,6);}
{const x=await run('promo',{promocion_id:P2});assert.equal(x.status,400);}
{const x=await run('promo',{promocion_id:P},{rpcError:[A]});assert.equal(x.body.elegibles,2);assert(x.body.omitidos.some(c=>c.id===A));}
{const x=await run('promo');assert.equal(x.status,400);}
{const x=await run('general');assert.equal(x.body.elegibles,3);}
{const x=await run('general',{promocion_id:P});assert.equal(x.status,400);}
{const x=await run('general',{excluir_ids:[B],agregar_ids:[B]});assert.equal(x.status,400);}
{const x=await run('general',{excluir_ids:Array.from({length:201},(_,i)=>String(i))});assert.equal(x.status,400);}
{const x=await run('missions',{}, {},[]);assert.equal(x.body.elegibles,0);}
{const extras=Array.from({length:501},(_,i)=>({id:'00000000-0000-4000-8000-'+String(i).padStart(12,'0'),nombre:'x',misiones_total:4,misiones_pendientes:1}));const x=await run('missions',{}, {},extras);assert.equal(x.status,400);}
console.log('GOXION · 20 escenarios de validación de plan aprobados (backend sin envíos).');
