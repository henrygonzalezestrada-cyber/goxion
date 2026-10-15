// GOXION F8.1 · prueba del verificador real de Groq SIN usar API keys ni red.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("supabase/functions/goxy-ai-beta/index.ts","utf8");
const start=source.indexOf("async function providerStatus(");
const end=source.indexOf("Deno.serve(",start);
assert.ok(start>0&&end>start,"Backend debe exponer el verificador.");
const snippet=source.slice(start,end)
  .replace("key:string","key")
  .replace(":Promise<{ready:boolean;code:string}>","")
  .replace("(row:{id:string;active?:boolean})","(row)");
const create=new Function("fetch","MODEL","AbortController","setTimeout","clearTimeout",
  snippet+";return providerStatus;");
class FakeAbortController {
  signal={aborted:false};
  abort(){this.signal.aborted=true;}
}
function mk(response){
  return create(async()=>response,"openai/gpt-oss-20b",FakeAbortController,
    ()=>1,()=>{});
}
test("Clave válida y modelo activo",async()=>{
  const fn=mk({status:200,ok:true,json:async()=>({data:[{id:"openai/gpt-oss-20b",active:true}]})});
  assert.deepEqual(await fn("fake"),{ready:true,code:"AI_READY"});
});
test("Clave incorrecta o no autorizada",async()=>{
  const fn=mk({status:401,ok:false});
  assert.deepEqual(await fn("fake"),{ready:false,code:"AI_KEY_REJECTED"});
});
test("Modelo ausente",async()=>{
  const fn=mk({status:200,ok:true,json:async()=>({data:[{id:"other",active:true}]})});
  assert.deepEqual(await fn("fake"),{ready:false,code:"MODEL_NOT_AVAILABLE"});
});
test("Proveedor temporalmente no disponible",async()=>{
  const fn=mk({status:503,ok:false});
  assert.deepEqual(await fn("fake"),{ready:false,code:"AI_PROVIDER_UNAVAILABLE"});
});
test("Petición de estado jamás genera chat ni descuenta cuota",()=>{
  const start=source.indexOf('if(body.mode==="status")');
  const end=source.indexOf('if(body.mode!=="chat")',start);
  assert.ok(start>0&&end>start);
  const segment=source.slice(start,end);
  assert.ok(segment.includes("providerStatus(key)"));
  assert.ok(!segment.includes("goxy_ai_beta_take_quota")&&!segment.includes("chat/completions"));
  assert.ok(source.includes('reasoning_effort:"low"'),"Configurar razonamiento económico");
});
