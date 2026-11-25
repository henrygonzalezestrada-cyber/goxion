import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={GOXION_DATA:{}};
for(const path of ["assets/js/ayuda/data/support-issues.js","preview/goxion-ai/goxy-support-knowledge.js","preview/goxion-ai/goxy-dialog-routing.js","preview/goxion-ai/goxy-diagnosis.js"])vm.runInNewContext(readFileSync(path,'utf8'),{window});

const router=()=>window.GOXY_DIALOG_ROUTING.createConversation();
const opts=q=>({brands:window.GOXY_SUPPORT.resolveAllPlatforms(q),activePlatforms:['Disney+','Google One']});
test('identity, commerce, cancellation, and clarification',()=>{
 const r=router();
 for(const q of ['Quién eres?','Cómo te llamas','Qué eres'])assert.match(r.consume(q,opts(q)).answer,/Soy Goxy/,q);
 for(const q of ['Quiero contratar un nuevo servicio','Me gustaría adquirir Netflix','Quiero agregar una plataforma'])assert.ok(r.consume(q,opts(q)).choices.some(x=>x.kind==='catalog'),q);
 assert.match(r.consume('Disney+',opts('Disney+')).answer,/Catálogo/);
 const a=r.consume('Quiero cancelar',opts('Quiero cancelar'));assert.equal(a.choices[0].label,'Cancelar Disney+');
 assert.match(r.consume('Disney+',opts('Disney+')).answer,/No he cancelado nada/);
 assert.equal(r.consume('Cómo cancelar Disney+',opts('Cómo cancelar Disney+')),null);
});
test('account continuity, payment ambiguity and reset',()=>{
 const r=router();r.noteAccount('missions');
 assert.match(r.consume('Pero no lo reclamé').answer,/recompensa/);
 assert.match(r.consume('Eso que?').answer,/misiones/);
 assert.equal(r.consume('Quiero contratar un nuevo servicio').choices[0].kind,'catalog');
 assert.match(r.consume('Porque mi pago no se completado').answer,/comprobante/);
 assert.match(r.consume('No me aparece').answer,/comprobante/);
 r.reset();assert.equal(r.consume('Pero no lo reclamé'),null);
 assert.ok(r.fallback().choices.some(x=>x.kind==='catalog'));
 assert.equal(r.consume('Mi próximo pago'),null);
 assert.equal(r.consume('Netflix me pide contratar Premium',opts('Netflix me pide contratar Premium')),null);
});
test('unknown alert after selecting a platform requests image at most once',()=>{
 const d=window.GOXY_DIAGNOSIS.create();
 const r=d.consume('No sé qué es lo que me aparece','Disney+',true);
 assert.ok(r.choices.some(x=>x.kind==='diagnosis-image'));
 assert.ok(!d.consume('No puedo mandar captura','Disney+',true).choices.some(x=>x.kind==='diagnosis-image'));
 assert.ok(!d.consume('No sé qué aparece','Disney+',true).choices.some(x=>x.kind==='diagnosis-image'));
 const e=window.GOXY_DIAGNOSIS.create();assert.ok(!e.consume('No sé qué me aparece','Disney+',false).choices.some(x=>x.kind==='diagnosis-image'));
});

test('explicit benefit disagreement, existing subscriptions and blocked vision',()=>{
 const r=router();r.noteAccount('missions');
 assert.match(r.consume('No reclamé mi cupón').answer,/recompensa/);
 assert.equal(r.consume('Qué servicios tengo contratados'),null);
 assert.equal(r.consume('No quiero contratar Netflix',opts('No quiero contratar Netflix')),null);
 const d=window.GOXY_DIAGNOSIS.create();
 assert.match(d.consume('No sé qué me aparece','Disney+',false).answer,/no puedo analizar imágenes/);
});
