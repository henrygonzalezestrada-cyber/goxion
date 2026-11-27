import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {endpointValid,subscriptionValid,categoriesValid,DEFAULT_CATEGORIES,payloadFor,providerOutcome,signed,projectAllowed} from '../supabase/functions/push-cliente/policy.mjs';

test('project lock, providers, explicit categories',()=>{
  assert(projectAllowed('https://hmpevcwodcgbkviarfic.supabase.co'));
  assert(projectAllowed('https://nsvybyvvdpdgbgtvydfb.supabase.co'));
  assert(!projectAllowed('https://other.supabase.co'));
  for(const host of ['fcm.googleapis.com','web.push.apple.com','foo.push.apple.com','updates.push.services.mozilla.com'])assert(endpointValid('https://'+host+'/send/abc'));
  for(const v of ['http://fcm.googleapis.com/send','https://fcm.googleapis.com.evil.com/send','https://localhost/send','https://169.254.169.254/','https://x:f@fcm.googleapis.com/send','https://fcm.googleapis.com:666/send'])assert(!endpointValid(v),v);
  const pk=Buffer.concat([Buffer.from([4]),Buffer.alloc(64,2)]).toString('base64url'),auth=Buffer.alloc(16,3).toString('base64url');
  assert(subscriptionValid({endpoint:'https://fcm.googleapis.com/send/abc',keys:{p256dh:pk,auth}}));
  assert(!DEFAULT_CATEGORIES.includes('beneficios'));
  assert(categoriesValid(['beneficios']));assert(!categoriesValid([]));assert(!categoriesValid(['cuenta','cuenta']));assert(!categoriesValid(['credentials']));
});
test('lock screen data is always generic; bounded transport classification',()=>{
  assert.equal(payloadFor(false,'uuid').title,'GOXION · Tienes un aviso');
  assert.equal(payloadFor('pago_acreditado','uuid').title,'GOXION · Tienes un aviso');
  assert.equal(payloadFor(true,'uuid').title,'GOXION · Aviso de prueba');
  for(const n of [200,201,202,204])assert.equal(providerOutcome(n),'accepted');
  for(const n of [429,500,502,503,599])assert.equal(providerOutcome(n),'retryable');
  for(const n of [404,410])assert.equal(providerOutcome(n),'gone');
  for(const n of [400,401,403,0])assert.equal(providerOutcome(n),'failed');
});
test('session requires correct signature and client role',async()=>{
  const secret='test-only';const key=await crypto.subtle.importKey('raw',Buffer.from(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sign=async j=>{const p=Buffer.from(JSON.stringify(j)).toString('base64url');return p+'.'+Buffer.from(await crypto.subtle.sign('HMAC',key,Buffer.from(p))).toString('base64url')};
  const c={role:'goxion_client',cliente_id:'12345678-abcd-4321-abcd-123456789012',exp:Date.now()/1000+30};
  assert(await signed(await sign(c),secret));assert.equal(await signed(await sign({...c,role:'admin'}),secret),null);
  assert.equal(await signed(await sign({...c,exp:0}),secret),null);assert.equal(await signed(await sign(c),'wrong'),null);
});
test('worker and manifest are restricted to the existing mirror; no cache interception',()=>{
  const m=JSON.parse(readFileSync(new URL('../goxion-push-pilot.webmanifest',import.meta.url)));
  assert.equal(m.scope,'./ayuda-espejo-feed-v2.html');assert.equal(m.start_url,m.scope);assert.equal(m.display,'standalone');
  const w=readFileSync(new URL('../goxion-push-pilot-sw.js',import.meta.url),'utf8');
  assert(!w.includes('addEventListener("fetch"'));assert(w.includes('ayuda-espejo-feed-v2.html?push=1'));
  assert(!w.includes('p.body.slice'));assert(!w.includes('p.title.slice'));
});
test('cron transports only a short-lived ticket, never a reusable Vault secret',()=>{
  const schedule=readFileSync(new URL('../docs/sql/push_k2_schedule.sql',import.meta.url),'utf8');
  const ddl=readFileSync(new URL('../docs/sql/push_k2_dispatch_ticket.sql',import.meta.url),'utf8');
  const edge=readFileSync(new URL('../supabase/functions/push-cliente/index.ts',import.meta.url),'utf8');
  assert(schedule.includes('goxion_push_issue_ticket()'));assert(!schedule.includes('decrypted_secret'));
  assert(ddl.includes("interval '90 seconds'"));assert(ddl.includes('delete from public.goxion_push_tickets where digest='));
  assert(edge.includes('goxion_push_consume_ticket'));assert(!edge.includes('!==c.dispatch_secret'));
});
