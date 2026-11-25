import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const window={GOXION_DATA:{}};
for(const path of ['assets/js/ayuda/data/support-issues.js','preview/goxion-ai/goxy-support-knowledge.js','preview/goxion-ai/goxy-dialog-routing.js']){
 vm.runInNewContext(readFileSync(path,'utf8'),{window});
}
const r=window.GOXY_DIALOG_ROUTING,k=window.GOXY_SUPPORT;
test('intenciones locales y continuidad',()=>{
 for(const [q,c,kind] of [['Gracias',{},'thanks'],['Ya funciona',{},'resolved'],['Ya lo intenté',{platform:'Netflix'},'follow'],['Netflix no abre',{},'symptom'],['Netflix y YouTube no funcionan',{},'multiple'],['Quiero hablar con un asesor de Netflix',{},'human'],['Sí',{accessStage:true},'normal'],['En mi TV',{awaitingSymptom:true},'device'],['Mi próximo pago',{},'normal'],['No',{},'ack'],['Netflix',{},'brand']]){
  assert.equal(r.classify(q,c,k.resolveAllPlatforms).kind,kind,q);
 }
 assert.equal(r.classify('Quiero hablar con un asesor de Netflix',{},k.resolveAllPlatforms).brand,'Netflix');
});
test('las guías adaptadas corresponden a situaciones oficiales y no piden secretos',()=>{
 for(const p of k.platforms())for(let i=0;i<k.issues(p).length;i++){
  const answer=r.chatGuide(k.guide(p,i),i);
  assert.doesNotMatch(answer,/necesita una revisión para el chat/);
  assert.doesNotMatch(r.normalize(answer),/escribelo aqui|indicanos el correo|envianos el codigo|al instante/);
 }
 assert.match(r.chatGuide({platform:'Netflix',issue:'Nueva situación'},0),/necesita una revisión/);
});
