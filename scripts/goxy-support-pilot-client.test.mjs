import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
function setup(path='/goxion/ayuda-espejo-feed-v2.html',qa=false){
 const calls=[],window={GOXION_QA_ISOLATED:qa,GOXION_CORE:{endpoint:s=>'https://fixture.supabase.co/functions/v1/'+s,STORAGE:{CLIENT_TOKEN:'token'}},GOXION_DATA:{supportIssues:{ViX:[],Netflix:[],Max:[]}}};
 const scope=vm.createContext({window,location:{pathname:path},localStorage:{getItem:()=> 'fixture-client-token'},fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return {ok:true,json:async()=>({ok:true,active:true,platform:'Vix Premium',intermittent:true})}}});
 for(const p of ['goxy-support-knowledge.js','goxy-incidents.js','goxy-vision-client.js'])vm.runInContext(read('preview/goxion-ai/'+p),scope);
 return {inc:window.GOXY_INCIDENTS,vision:window.GOXY_VISION,calls};
}
test('the exact ViX case, aliases, global incident, and login distinction',()=>{
 const {inc}=setup(),req=inc.request('ViX no funciona',null,'symptom');
 assert.equal(req.platform,'ViX');
 const live={ok:true,active:true,platform:'Vix Premium',intermittent:true};
 const a=inc.reply(live,req,'ViX no funciona');assert.match(a.answer,/aviso activo de intermitencias en ViX/);assert.match(a.answer,/te pide iniciar sesión/);
 const b=inc.reply(live,req,'ViX me pide iniciar sesión');assert.match(b.answer,/podría ser distinto/);assert.doesNotMatch(b.answer,/debes esperar/);
 assert.match(inc.reply({...live,platform:'Todos los servicios'},req,'ViX no funciona').answer,/los servicios/);
 assert.match(inc.reply(live,inc.request('¿Hay alguna incidencia general?',null), '¿Hay alguna incidencia general?').answer,/ViX/);
});
test('no false outage or global resolution; unrelated, multiple, and no match pass through',()=>{
 const {inc}=setup(),req=inc.request('Netflix no funciona');
 assert.equal(inc.reply({ok:true,active:true,platform:'Vix Premium'},req,'Netflix no funciona'),null);
 assert.equal(inc.reply({ok:true,active:false},req,'Netflix no funciona'),null);
 assert.equal(inc.reply({ok:false},req,'Netflix no funciona'),null);
 const ask=inc.request('¿Hay alerta de Netflix?');
 assert.match(inc.reply({ok:false},ask,'¿Hay alerta de Netflix?').answer,/no puedo verificar/);
 assert.match(inc.reply({ok:true,active:false},ask,'¿Hay alerta de Netflix?').answer,/no hay una incidencia general activa registrada/i);
 assert.equal(inc.request('Mi pago de ViX no aparece'),null);
 assert.equal(inc.request('Quiero cancelar ViX'),null);
 assert.equal(inc.request('¿Cuanto cuesta ViX?'),null);
 assert.equal(inc.request('Netflix y ViX no funcionan'),null);
});
test('only explicit offer of a photo in support, accepts refusal, not automatic',()=>{
 const {inc}=setup();assert.equal(inc.photoOffer('¿Te mando una foto?','ViX'),true);
 assert.equal(inc.photoOffer('¿Si te envío una fotografía?','ViX'),true);
 assert.equal(inc.photoOffer('No puedo mandar una foto','ViX'),false);
 assert.equal(inc.photoOffer('Me pide iniciar sesión','ViX'),false);
 assert.equal(inc.photoOffer('¿Te mando una foto?',null),false);
});
test('mirror uses only its own endpoint and no free user text for incident; QA stays isolated',async()=>{
 const {vision,calls}=setup();await vision.incident();await vision.status();await vision.analyze('fixture','',undefined,true);
 assert.deepEqual(calls.map(x=>x.body.mode),['incident','status','analyze']);assert.deepEqual(calls[0].body,{mode:'incident'});
 assert.ok(calls.every(x=>x.url.endsWith('/goxy-support-pilot')));assert.equal(calls[2].body.testConsent,true);
 assert.equal((await vision.example()).ok,false);
 const official=setup('/goxion/ayuda.html');assert.equal((await official.vision.status()).ok,false);assert.equal(official.calls.length,0);
 const qa=setup('/goxion/ayuda-aceptacion-v2.html',true);await qa.vision.status();await qa.vision.example();assert.ok(qa.calls.every(x=>x.url.endsWith('/goxy-vision-qa')));assert.equal((await qa.vision.incident()).ok,false);
});
