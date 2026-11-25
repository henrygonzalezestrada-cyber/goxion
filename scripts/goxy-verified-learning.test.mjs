import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {normalizeAlias,resolveVerifiedGuide,KNOWLEDGE_REVISION} from '../supabase/functions/_shared/goxy-verified-learning.mjs';
const raw=readFileSync('supabase/functions/goxy-ai-qa/knowledge.json');
const knowledge=JSON.parse(raw);
test('canonical revision matches source blob',()=>{
 assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),KNOWLEDGE_REVISION);
});
test('normalization is bounded; private or unsupported strings fail closed',()=>{
 assert.equal(normalizeAlias('¿Me solicita actualizar HOGÁR?'),'me solicita actualizar hogar');
 for(const text of ['PIN 1234','mi contraseña es privada','user@ejemplo.invalid','https://example.invalid','mi teléfono es privado','123456','a','a'.repeat(81),null])assert.equal(normalizeAlias(text),null);
});
test('only exact verified routes retrieve a canonical guide; preserve human requirement',async()=>{
 let requests=0;
 const options={message:'mi tele solicita actualizar hogar',platform:'Netflix',canonicalMatch:null,knowledge,lookup:async p=>{requests++;assert.equal(p.p_alias,'mi tele solicita actualizar hogar');return {ok:true,platform:'Netflix',guide_id:1,source_revision:KNOWLEDGE_REVISION};}};
 const r=await resolveVerifiedGuide(options);
 assert.equal(r.guide.id,1);assert.equal(r.guide.requires_human,true);assert.deepEqual(r.guide,knowledge.guides.Netflix[1]);assert.equal(requests,1);
 assert.equal(await resolveVerifiedGuide({...options,canonicalMatch:0}),null);
 assert.equal(await resolveVerifiedGuide({...options,platform:'Unknown'}),null);
 assert.equal(await resolveVerifiedGuide({...options,revision:'old'}),null);
 assert.equal(await resolveVerifiedGuide({...options,message:'PIN 1234'}),null);
 assert.equal(requests,1);
 for(const response of [{ok:false},{ok:true,platform:'Disney+',guide_id:1,source_revision:KNOWLEDGE_REVISION},{ok:true,platform:'Netflix',guide_id:99,source_revision:KNOWLEDGE_REVISION},{ok:true,platform:'Netflix',guide_id:1,source_revision:'old'}]){
  assert.equal(await resolveVerifiedGuide({...options,lookup:async()=>response}),null);
 }
 assert.equal(await resolveVerifiedGuide({...options,lookup:async()=>{throw Error('unavailable');}}),null);
});
