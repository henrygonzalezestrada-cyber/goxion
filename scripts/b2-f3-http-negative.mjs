import assert from "node:assert/strict";

const origin="https://hmpevcwodcgbkviarfic.supabase.co/functions/v1";
let count=0;
async function expectDenied(slug,body,headers={}){
 const response=await fetch(origin+"/"+slug,{
  method:"POST",headers,body
 });
 const content=await response.json().catch(()=>({}));
 assert.equal(response.status,401,
  slug+": se esperaba HTTP 401, llegó "+response.status+" / "+JSON.stringify(content).slice(0,170));
 assert.equal(content.ok,false,slug+": no debe indicar éxito");
 assert.equal(response.headers.get("cache-control"),"no-store",slug+": no guardar respuestas");
 count++;
}

await expectDenied("estado-financiero-b2-beta",
 JSON.stringify({accion:"mi_estado",datos:{}}),{"Content-Type":"application/json"});
await expectDenied("estado-financiero-b2-beta",
 JSON.stringify({accion:"mi_prorroga",datos:{}}),{"Content-Type":"application/json"});
await expectDenied("comprobantes-b2-beta",new FormData());
await expectDenied("acciones-financieras-b2-beta",
 JSON.stringify({accion:"b2_listar_comprobantes",datos:{cliente_id:"00000000-0000-4000-8000-000000000000"}}),
 {"Content-Type":"application/json"});
await expectDenied("acciones-financieras-b2-beta",
 JSON.stringify({accion:"b2_aprobar_comprobante",datos:{}}),
 {"Content-Type":"application/json"});
console.log("B2 F3 HTTP autenticación negativa: "+count+" rutas PASS; 0 escrituras solicitadas.");
