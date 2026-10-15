// GOXION Goxy F7 - contratos estáticos de seguridad. No toca producción.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const fn=readFileSync("supabase/functions/goxy-ai-beta/index.ts","utf8");
const client=readFileSync("preview/goxion-ai/goxy-ai-client.js","utf8");
const ui=readFileSync("preview/goxion-ai/mascota.js","utf8");
const kb=JSON.parse(readFileSync("supabase/functions/goxy-ai-beta/knowledge.json","utf8"));
const sql=readFileSync("supabase/migrations/202610150001_goxy_ia_beta_cuota.sql","utf8");

test("backend validates HMAC session, expiry, and suspended clients",()=>{
  for(const token of ['crypto.subtle.verify','goxion_client','claims.exp','SESSION_INVALID','ACCOUNT_BLOCKED','select=estado'])
    assert.ok(fn.includes(token),token);
  assert.ok(!fn.includes("getCurrentClientKey"));
});
test("no secrets, credentials or financial data cross to LLM",()=>{
  for(const token of ["cliente_servicios","perfil_pin","correo_login","SUPABASE_ANON_KEY"]) assert.ok(!fn.includes(token),token);
  assert.ok(!client.includes("GROQ_API_KEY"));
  assert.ok(!client.includes("api.groq.com"));
  assert.ok(fn.includes("allowedMessage")===false || fn.includes("privatePattern"));
  assert.ok(fn.includes("getGuide("));
  assert.ok(fn.includes("AI_NOT_CONFIGURED"));
});
test("quota database is locked down and atomic",()=>{
  assert.match(sql,/advisory_xact_lock/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on function/);
  assert.match(sql,/grant execute on function.*service_role/);
  assert.match(sql,/20 seconds/);
  assert.match(sql,/v_total >= 8/);
  assert.ok(!sql.includes("message text")&&!sql.includes("prompt text"));
});
test("model currently supported and server-only",()=>{
  assert.ok(fn.includes("openai/gpt-oss-20b"));
  assert.ok(fn.includes("api.groq.com/openai/v1/chat/completions"));
  assert.ok(!client.includes("openai/gpt-oss-20b"));
  assert.ok(fn.includes("Origin")&&fn.includes("SITE"));
});
test("guide snapshot is public content with no credentials",()=>{
  assert.equal(Object.keys(kb.guides).length,9);
  assert.equal(Object.values(kb.guides).flat().length,13);
  assert.ok(!JSON.stringify(kb).includes("templateWA"));
  assert.ok(!JSON.stringify(kb).includes("perfil_pin"));
});
test("F6 kept and IA needs a selected guide",()=>{
  assert.ok(ui.includes("chosenGuide")&&ui.includes("ai.ask("));
  assert.ok(ui.includes("aiController?.abort()"));
  assert.ok(ui.includes("pet.scrolling")&&ui.includes("chosenPlatform"));
  assert.ok(ui.includes("humanHandoff()"));
});
