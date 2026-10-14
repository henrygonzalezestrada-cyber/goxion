import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(p,"utf8");
let n=0;
function check(condition,label){assert.ok(condition,label);n++;}
const guard=read("preview/integracion-b2/sandbox-guard.js");
const quote=read("preview/index-b2/b2-bridge.js");
const adapter=read("preview/integracion-b2/index-adapter.js");
const ayuda=read("preview/integracion-b2/ayuda-prorroga.js");
const nav=read("preview/integracion-b2/f3-navigation.js");
const edge=read("docs/edge/estado-financiero/index.ts");
const index=read("preview/integracion-b2/index.html");
const ayudaHtml=read("preview/integracion-b2/ayuda.html");
for(const token of ['params.get("f3")==="1"','clientToken.length>20','X-Client-Token',
  'comprobantes-b2-beta','readAllowed||b2Upload','Promise.resolve(denied())'])
 check(guard.includes(token),"Guard F3: "+token);
check(guard.includes('given.get("X-Client-Token")===clientToken'),"No token de otra sesión");
check(guard.includes('integratedBeta&&method==="POST"'),"B2 opt-in solo POST explícito");
check(guard.includes('target.origin==="https://hmpevcwodcgbkviarfic.supabase.co"'),"Origen de red restringido");
check(!guard.includes('"/functions/v1/acciones-financieras-b2-beta"'),"Admin no se habilita desde cliente");
for(const token of ['store.blocked=true','response.modo==="b2_sin_estado_cobrable"',
  'response.modo==="oficial"',"quote.ciclo_id","x.servicio","x.ordinal"])
 check(quote.includes(token),"Ruteo: "+token);
check(quote.includes("store.quote=null;store.blocked=false"),"Fecha única conserva backend anterior");
check(adapter.includes('descuento_comercial_centavos'),"Sin ajustes comerciales inventados");
check(adapter.includes('beneficios_comerciales'),"Origen y nombre real de cada beneficio");
check(adapter.includes('store.blocked'),"No pago global sin conciliación");
check(adapter.includes('fd.set("cargo_ids",JSON.stringify(ids))'),"Comprobante con selección exacta");
check(adapter.includes('fd.set("ciclo_id",cycle)'),"Comprobante con ciclo cotejado");
check(adapter.includes('fd.set("clave_idempotencia",op.id)'),"Reintento estable");
check(adapter.includes('fd.set("archivo",file)'),"Imagen de evidencia real");
check(adapter.includes('fetch(core.endpoint("comprobantes-b2-beta")'),"Subida directa al receptor B2");
check(adapter.includes('json.acreditado===true'),"No confundir reporte con pago aprobado");
check(adapter.includes('store.quote.comprobante_en_revision=true'),"No se admite segundo reporte en revisión");
check(ayuda.includes('state.modo!=="b2_multifecha"'),"Prórroga F3 excluye fecha única");
check(nav.includes('window.irAlTicket=function()'),"Navegación dentro del espejo beta");
check(ayudaHtml.includes("f3-navigation.js"),"Ayuda monta adaptación F3");
check(index.includes("index-adapter.js"),"Index mantiene el diseño espejo");
for(const token of ['ciclo_id:cycle.data.id','cliente_servicio_id:contract.id',
  'beneficios_comerciales:benefits','comprobante_en_revision:',
  'permitir_pago_global:false','b2_sin_estado_cobrable'])
 check(edge.includes(token),"Origen servidor: "+token);
for(const file of ["index.html","ayuda.html","admin.html"]){
 const src=read(file);
 check(!src.includes("preview/integracion-b2/f3-navigation"),"Producción sin scripts F3: "+file);
}

const adminGuard=read("preview/integracion-b2/admin-sandbox.js");
const adminAdapter=read("preview/integracion-b2/admin-b2-f3.js");
const adminPage=read("preview/integracion-b2/admin.html");
const adminEdge=read("docs/edge/acciones-financieras-b2-beta/index.ts");
for(const token of ['admin-datos','X-Admin-Token','allowB2','read||b2',
  'return Promise.resolve(denied())','GOXION_B2_ADMIN_MIRROR']){
 check(adminGuard.includes(token),"Admin sandbox: "+token);
}
for(const token of ['gxOpenPaymentModal','gxPaymentApprove',
  'b2_listar_comprobantes','b2_ver_evidencia','b2_aprobar_comprobante',
  'confirmar_aprobacion:true','item.viewed=true','keys.get(report.id)',
  'gxPaymentReject','gxPaymentIncomplete']){
 check(adminAdapter.includes(token),"Admin revisión B2: "+token);
}
check(adminPage.includes("admin-sandbox.js")&&adminPage.includes("admin-b2-f3.js"),
  "Admin espejo monta seguridad y aprobación");
check(adminPage.includes('id="gx-payment-review-card"')&&
  adminPage.includes('id="gx-payment-modal"'),"Reutiliza revisión nativa, sin otro panel");
for(const token of ['action==="b2_listar_comprobantes"',
  'action==="b2_ver_evidencia"','createSignedUrl',".eq(\"cliente_id\",clienteId)",
  'b2_aprobar_comprobante']){
 check(adminEdge.includes(token),"Servidor Admin autenticado: "+token);
}

console.log("F3 Integración beta: "+n+" invariantes PASS");
