// GOXION F8 · contratos reales de getGuide, sin clientes ni llamadas HTTP.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync("supabase/functions/goxy-ai-beta/index.ts","utf8");
const kb=JSON.parse(readFileSync("supabase/functions/goxy-ai-beta/knowledge.json","utf8"));
const start=source.indexOf("function getGuide(");
const end=source.indexOf("\nDeno.serve(",start);
assert.ok(start>0 && end>start,"Se debe encontrar el selector real del backend");
const snippet=source.slice(start,end)
  .replace("platform:unknown,index:unknown","platform,index")
  .replace(/const catalog=KB\.guides as Record<.+?>;/,"const catalog=KB.guides;");
const getGuide=new Function("KB",snippet+";return getGuide;")(kb);
const all=getGuide("ViX",undefined);
assert.ok(all && all.platform==="ViX","Debe permitir conversación general por marca sin guía elegida");
assert.ok(all.guide.includes("SITUACIÓN:")&&all.guide.includes("INSTRUCCIONES:"),
  "La conversación se basa en el catálogo aprobado");
assert.ok(!all.guide.includes("templateWA"),"No enviar plantillas de cuentas");
assert.ok(all.guide.length<=4500,"Acotar el contexto del proveedor");
const exact=getGuide("Netflix",0);
assert.equal(exact.issue,kb.guides.Netflix[0].issue,"Conservar el flujo de guías ya existente");
assert.equal(getGuide("Netflix",999),null,"No aceptar una guía manipulada");
assert.equal(getGuide("Netflix","0"),null,"No admitir índices en texto");
assert.equal(getGuide("Netflix",{}),null,"Rechazar índices de objeto");
assert.equal(getGuide("Plataforma inventada",undefined),null,"No aceptar marcas inexistentes");
assert.ok(source.includes("authenticate(")&&source.includes("SENSITIVE_OR_INVALID_INPUT"),
  "Conservar autorización y bloqueo de secretos");
assert.ok(source.includes("goxy_ai_beta_take_quota"),"Conservar límite de llamadas");
assert.ok(!source.includes("body.cliente_id"),"No recibir identidades del navegador");
console.log("Goxy F8: guía general por plataforma, índice específico, guardas y privacidad PASS.");
