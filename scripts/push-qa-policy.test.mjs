import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointValid,subscriptionValid,payloadFor,signed} from '../supabase/functions/push-cliente-qa/policy.mjs';
import {readFileSync} from 'node:fs';
const pk=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,2)]).toString('base64url');
const auth=Buffer.alloc(16,3).toString('base64url');
test('accepted public push providers only',()=>{
  for(const host of ['fcm.googleapis.com','web.push.apple.com','foo.push.apple.com','updates.push.services.mozilla.com','foo.notify.windows.com'])assert(endpointValid('https://'+host+'/send/abc'));
  for(const v of ['http://fcm.googleapis.com/send','https://fcm.googleapis.com.evil.com/send','https://localhost/send','https://169.254.169.254/','https://x:f@fcm.googleapis.com/send','https://fcm.googleapis.com:666/send','https://fcm.googleapis.com/send#x','https://push.apple.com.evil.test/x'])assert(!endpointValid(v),v);
  assert(subscriptionValid({endpoint:'https://fcm.googleapis.com/send/abc',keys:{p256dh:pk,auth}}));
  assert(!subscriptionValid({endpoint:'https://fcm.googleapis.com/send/abc',keys:{p256dh:pk,auth:'bad'}}));
});
test('lock screen payload never copies arbitrary source content',()=>{
  const p=payloadFor('pago_acreditado','fake-id');
  assert.deepEqual(Object.keys(p).sort(),['body','tag','title']);
  assert.equal(p.body,'Abre Mi Espacio para consultar la información.');
  assert.equal(payloadFor('password:secret','fake-id').title,'Novedad de GOXION');
});
test('session requires correct signature, role, expiry, and ID',async()=>{
  const secret='fixture-only-secret';
  const k=await crypto.subtle.importKey('raw',Buffer.from(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sign=async(j)=>{const p=Buffer.from(JSON.stringify(j)).toString('base64url');return p+'.'+Buffer.from(await crypto.subtle.sign('HMAC',k,Buffer.from(p))).toString('base64url')};
  const claims={role:'goxion_client',cliente_id:'12345678-abcd-4321-abcd-123456789012',exp:Date.now()/1000+30};
  assert(await signed(await sign(claims),secret));
  assert.equal(await signed(await sign({...claims,role:'goxion_admin'}),secret),null);
  assert.equal(await signed(await sign({...claims,exp:0}),secret),null);
  assert.equal(await signed(await sign(claims),'wrong'),null);
  assert.equal(await signed('aa.!!',secret),null);
});
test('manifest and worker scoped strictly to QA',()=>{
  const m=JSON.parse(readFileSync(new URL('../push-qa.webmanifest',import.meta.url)));
  assert.equal(m.scope,'./ayuda-aceptacion-v2.html');
  assert.equal(m.start_url,m.scope);assert.equal(m.display,'standalone');
  const w=readFileSync(new URL('../push-qa-sw.js',import.meta.url),'utf8');
  assert(!w.includes('addEventListener("fetch"'));assert(w.includes('ayuda-aceptacion-v2.html?push=1'));
});
