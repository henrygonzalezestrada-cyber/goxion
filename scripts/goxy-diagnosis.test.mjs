import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={GOXION_DATA:{}};
for(const path of ['assets/js/ayuda/data/support-issues.js','preview/goxion-ai/goxy-support-knowledge.js','preview/goxion-ai/goxy-dialog-routing.js','preview/goxion-ai/goxy-diagnosis.js'])vm.runInNewContext(readFileSync(path,'utf8'),{window});
const d=()=>window.GOXY_DIAGNOSIS.create();
test('confirmation and natural synonyms advance the case instead of repeating the guide',()=>{
 for(const q of ['ya envié la solicitud','ya mandé eso','acabo de enviar la solicitud','ya quedó enviada']){
  const x=d();x.fromVision({platform:'Netflix',issueIndex:1,category:'known'});assert.equal(x.consume(q).state.stage,'await-human',q);
 }
 for(const q of ['ya le piqué','ya actualicé','ya lo hice','listo']){
  const x=d();x.begin('Netflix',1);assert.equal(x.consume(q).state.stage,'confirm-send',q);assert.equal(x.consume('sí, ya se envió').state.stage,'await-human');
 }
 for(const q of ['no me sale','no veo esa opción','no encuentro el botón']){
  const x=d();x.begin('Netflix',1);assert.equal(x.consume(q).state.stage,'locate',q);
 }
});
test('image only when useful; declining or having used one does not request it again',()=>{
 const x=d();x.consume('Max no abre',null,true);
 assert.ok(x.consume('me aparece un error',null,true).choices.some(y=>y.kind==='diagnosis-image'));
 assert.ok(!x.consume('No puedo mandar captura',null,true).choices.some(y=>y.kind==='diagnosis-image'));
 const y=d();y.fromVision({platform:'Max',category:'unreadable'});assert.ok(!y.consume('no puedo describirlo',null,true).choices.some(z=>z.kind==='diagnosis-image'));
});
test('visual restart and device follow-up are local; resolution resets',()=>{
 const x=d();x.fromVision({platform:'Max',category:'restart'});
 assert.equal(x.consume('ya la cerré y sigue igual').state.stage,'device');
 assert.equal(x.consume('en Roku').state.stage,'await-human');
 assert.equal(x.consume('ya jaló').state,null);
});
test('change platform, maintain unknown-image context, and handle negative responses',()=>{
 const x=d();x.begin('Netflix',1);assert.equal(x.consume('todavía no me funciona').state.stage,'await-human');
 assert.equal(x.consume('YouTube no me llegó la invitación').state.platform,'YouTube');
 const y=d();y.fromVision({platform:null,category:'other'});
 assert.equal(y.consume('Max').state.platform,'Max');assert.equal(y.get().visualUsed,true);
 y.reset();assert.equal(y.get(),null);
});
