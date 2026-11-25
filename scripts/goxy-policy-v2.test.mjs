import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const window={};
vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-policy-v2.js','utf8'),{window});
vm.runInNewContext(readFileSync('preview/goxion-ai/goxy-payment-read.js','utf8'),{window,Intl,Date});
const policy=window.GOXY_POLICY_V2;
test('revisar respuestas si cambian los tres documentos legales canónicos',()=>{
 const expected={'terminos':'ad66008387e41175537a19f43bc8f9d058e1964f','referidos':'4de23c06bdcf1b32a8e6fe8e757a1bf4ce3a7bfa','cupones':'77fba5b29873229effe4bcb36724d1eed002f262'};
 for(const [name,hash] of Object.entries(expected)){
  const bytes=readFileSync('assets/legal/'+name+'-v2.txt');
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,hash,'Revisar resumen de '+name+' antes de actualizar huella.');
 }
});
test('intenciones generales vs estado y montos personales',()=>{
 const cases=[['Cómo funciona la prórroga','extension'],['Pierdo la lealtad si pago tarde','loyalty'],['Qué pasa si rechazo los términos','consent'],['Cómo funciona referidos','referrals'],['Todavía cobran el 20% de reactivación','late'],['Qué cubre la garantía','guarantee'],['Puedo acumular cupones','coupons'],['Cuánto debo de mora',null],['Puedo solicitar una prórroga',null],['Mi nivel de lealtad',null],['Promociones activas',null],['Mi próximo pago',null],['Cuántos dispositivos están permitidos','access'],['Cómo cancelar un servicio','cancel'],['Promoción de bienvenida','welcome'],['Cómo funcionan las fechas independientes','dates'],['Términos y condiciones','documents']];
 for(const [query,id] of cases)assert.equal(policy.reply(query)?.id||null,id,query);
});
test('reglas de prórroga vigentes y proyección rechaza cargo incompatible',()=>{
 const p=window.GOXY_PAYMENT;
 const x=p.extensionDescribe({ok:true,eligible:true,max:'2026-12-03'});
 assert.match(x.answer,/pierdes la racha/);
 assert.match(x.answer,/tres días naturales/);
 const fixture={ok:true,date:'2026-12-03',amountCents:10000,moraCents:0,reactivationConfirmed:true};
 assert.match(p.forecastDescribe({...fixture,reactivationCents:2000}).answer,/No puedo confirmar/);
 assert.match(p.forecastDescribe({...fixture,reactivationCents:0}).answer,/No existe cargo administrativo/);
 assert.match(p.forecastDescribe({...fixture,reactivationConfirmed:false}).answer,/No puedo confirmar/);
 assert.match(p.forecastDescribe({...fixture,mode:'b2',reactivationConfirmed:false,reactivationCents:undefined}).answer,/cotizador B2 no desglosa/);
 assert.match(p.forecastDescribe({...fixture,mode:'b2',reactivationConfirmed:false,reactivationCents:2000}).answer,/No puedo confirmar/);
});
