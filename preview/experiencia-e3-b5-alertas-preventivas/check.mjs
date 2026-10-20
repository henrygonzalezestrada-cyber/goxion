import assert from 'node:assert/strict';
import {previewAffectedClients,revalidateBeforeDelivery} from './policy.mjs';

const incident={id:'incident-001',revision:1,status:'confirmed',
  confirmedBy:'admin-verified',confirmedAt:'2026-10-19T19:00:00-06:00',
  serviceIds:['svc-vix','svc-max']};
const clients=[
  {id:'client-001',status:'active',contracts:[{serviceId:'svc-vix',active:true},{serviceId:'svc-max',active:true}]},
  {id:'client-002',status:'active',contracts:[{serviceId:'svc-max',active:true}]},
  {id:'client-003',status:'active',contracts:[{serviceId:'svc-netflix',active:true}]},
  {id:'client-004',status:'suspended',contracts:[{serviceId:'svc-vix',active:true}]},
  {id:'client-005',status:'active',test:true,contracts:[{serviceId:'svc-max',active:true}]},
  {id:'client-006',status:'active',contracts:[{serviceId:'svc-vix',active:false}]},
  {id:'client-007',status:'active',contracts:[]},
  {id:'client-008',status:'active',contracts:null},
  {id:'client-009',status:'active',suspended:true,contracts:[{serviceId:'svc-vix',active:true}]},
];
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS · '+name)}
const plan=previewAffectedClients({incident,clients});

test('Solo dos clientes afectados, uno por persona aun con dos servicios',()=>{
  assert.deepEqual(plan.recipients.map(r=>r.clientId),['client-001','client-002']);
  assert.equal(plan.recipients[0].serviceIds.length,2);
  assert.equal(plan.deliverable,false);
});
test('No filtra por nombre ni servicio parecido',()=>{
  const close=previewAffectedClients({incident,clients:[{id:'client-020',status:'active',
    contracts:[{serviceId:'svc-vix-premium-else',active:true}]}]});
  assert.equal(close.recipients.length,0);
});
test('Sin confirmación o resuelta, no avisar',()=>{
  for(const status of ['reported','suspected','resolved','closed',undefined]){
    assert.equal(previewAffectedClients({incident:{...incident,status},clients}).recipients.length,0);
  }
});
test('Evento sin IDs estables o sin auditoría confirmada, no avisar',()=>{
  const variants=[
    {...incident,id:' '},{...incident,revision:0},
    {...incident,confirmedBy:''},{...incident,confirmedAt:'invalid'},
    {...incident,serviceIds:[]},{...incident,serviceIds:['svc-vix','']},
  ];
  for(const item of variants)assert.equal(previewAffectedClients({incident:item,clients}).recipients.length,0);
});
test('No mandar a suspendidos, pruebas ni servicios dados de baja',()=>{
  assert.deepEqual(plan.recipients.map(r=>r.clientId),['client-001','client-002']);
  assert(plan.excluded.some(x=>x.id==='client-004'));
  assert(plan.excluded.some(x=>x.id==='client-005'));
  assert(plan.excluded.some(x=>x.id==='client-006'));
  assert(plan.excluded.some(x=>x.id==='client-009'));
});
test('No duplicar avisos por entregas anteriores',()=>{
  const repeat=previewAffectedClients({incident,clients,
    deliveredKeys:[plan.recipients[0].dedupeKey]});
  assert.deepEqual(repeat.recipients.map(r=>r.clientId),['client-002']);
});
test('Cambio de revisión altera dedupe; reconexión no',()=>{
  const next=previewAffectedClients({incident:{...incident,revision:2},clients});
  assert.notEqual(next.recipients[0].dedupeKey,plan.recipients[0].dedupeKey);
  assert.deepEqual(previewAffectedClients({incident,clients}).recipients,plan.recipients);
});
test('No confiar en audiencia precalculada tras cancelar el servicio',()=>{
  const updated=clients.map(c=>c.id==='client-001'?{...c,contracts:[]}:c);
  const result=revalidateBeforeDelivery({incident,clients:updated,plannedRecipients:plan.recipients});
  assert.deepEqual(result.recipients.map(r=>r.clientId),['client-002']);
});
test('Incidencia resuelta antes del envío deja sin destinatarios',()=>{
  const result=revalidateBeforeDelivery({incident:{...incident,status:'resolved'},
    clients,plannedRecipients:plan.recipients});
  assert.equal(result.recipients.length,0);
});
test('Audience plan no crea destinatarios que no estaban autorizados inicialmente',()=>{
  const result=revalidateBeforeDelivery({incident,clients,plannedRecipients:[{
    clientId:'client-999',dedupeKey:'incident:incident-001:1:client-999'}]});
  assert.equal(result.recipients.length,0);
});
test('No confiar en clientes o contratos no verificables',()=>{
  for(const bad of [null,undefined,'oops'])
    assert.equal(previewAffectedClients({incident,clients:bad}).recipients.length,0);
});
test('Clientes duplicados no reciben varias alertas',()=>{
  const planDup=previewAffectedClients({incident,clients:[clients[0],clients[0]]});
  assert.equal(planDup.recipients.length,1);
});
test('Privacidad: plan sólo IDs y referencia a campana actual',()=>{
  for(const r of plan.recipients){
    assert.equal(r.destination,'campana_existente');
    assert.equal(r.category,'service_incident');
    assert(!('name' in r)&&!('phone' in r)&&!('whatsapp' in r));
  }
});
test('No produce envío, campaña real ni descuento compensatorio',()=>{
  assert.equal(plan.mode,'dry_run_only');
  assert.equal(plan.deliverable,false);
  assert(!('send' in plan)&&!('discount' in plan));
});
console.log('E3/B5 · '+checks+' políticas de audiencia PASS · exclusivamente datos ficticios');
