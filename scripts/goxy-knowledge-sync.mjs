// Goxy F7: comprueba que el snapshot usado por la Edge Function corresponda
// al catálogo público fuente assets/js/ayuda/data/support-issues.js.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const source=resolve("assets/js/ayuda/data/support-issues.js");
const target=resolve("supabase/functions/goxy-ai-beta/knowledge.json");
const context={window:{GOXION_DATA:{}}};
vm.runInNewContext(readFileSync(source,"utf8"),context,{timeout:1000});
const catalog=context.window.GOXION_DATA.supportIssues;
assert.ok(catalog&&typeof catalog==="object");
const snapshot={schema_version:1,source:"assets/js/ayuda/data/support-issues.js",guides:{}};
for(const [platform,rows] of Object.entries(catalog)){
  if(platform==="Default")continue;
  snapshot.guides[platform]=rows.map((r,id)=>({
    id,issue:String(r.issue).trim(),
    instructions:String(r.instructions).replace(/<br\s*\/?>/gi,"\n")
      .replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").trim(),
    requires_human:Boolean(r.labelInput||r.templateWA)
  }));
}
const body=JSON.stringify(snapshot,null,2)+"\n";
if(process.argv.includes("--write"))writeFileSync(target,body,"utf8");
else assert.equal(readFileSync(target,"utf8"),body,
  "Base de guías modificada: ejecuta 'node scripts/goxy-knowledge-sync.mjs --write' y revisa diff.");
console.log("GOXION Goxy: snapshot de guías verificado; "+Object.values(snapshot.guides).flat().length+" artículos.");
