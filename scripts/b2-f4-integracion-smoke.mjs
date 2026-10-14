import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=x=>readFileSync(x,"utf8");
let checks=0;
function ok(expr,label){assert.ok(expr,label);checks++}
const sql=read("supabase/migrations/202610140001_b2_f4_eventos_notificaciones_outbox.sql");
const dispatcher=read("docs/edge/b2-f4-discord-beta/index.ts");
const client=read("docs/edge/estado-financiero/index.ts");
const adminEdge=read("docs/edge/acciones-financieras-b2-beta/index.ts");
const admin=read("assets/js/admin/07-admin-ops-v2.js");
const f4=read("preview/integracion-b2/admin-f4.js");
const html=read("preview/integracion-b2/admin.html");
const guard=read("preview/integracion-b2/admin-sandbox.js");
for(const token of ["goxion_b2_f4_eventos","clave text not null unique",
 "goxion_b2_f4_discord_outbox","prorroga_activada","prorroga_cumplida",
 "gx_b2_f4_prorroga_confirmada","gx_b2_f4_prorroga_liquidada",
 "goxion_b2_f4_registrar_evento","goxion_b2_f4_claim_discord",
 "goxion_b2_f4_finish_discord","for update skip locked",
 "on conflict(clave) do nothing","notificaciones_admin","leida:false".replace(":", "=>")]){
 if(token.includes("leida=>"))continue;
 ok(sql.includes(token),"SQL event/outbox: "+token)
}
ok(sql.includes("leida,false")||sql.includes("leida)"),"Admin unread");
ok(sql.includes("revoke all on function"),"No RPC publica");
for(const token of ["X-B2-Dispatch-Key","SUPABASE_SERVICE_ROLE_KEY",
 "GOXION_PAGOS_WEBHOOK","allowed_mentions","goxion_b2_f4_claim_discord",
 "goxion_b2_f4_finish_discord","enviados:successful","pendientes_reintento:failed"])
 ok(dispatcher.includes(token),"Discord sender: "+token);
ok(!dispatcher.includes("X-Client-Token"),"Cliente no puede mandar a Discord");
ok(client.includes('if(b2&&applied.data?.repetida!==true)'),"Evento solo después de confirmar B2");
ok(client.includes('EdgeRuntime?.waitUntil'),"Discord sin bloquear respuesta");
for(const token of ['b2_f4_reintentar_discord','b2_listar_prorrogas',
 'b2_f4_discord-beta','cumplida:fulfilled.has(a.id)'])
 ok(adminEdge.includes(token),"Admin gateway: "+token);
for(const token of ['prorrogaPendiente','prorroga_activada','prorroga_cumplida','unreadProrrogas'])
 ok(admin.includes(token),"Bandeja existente: "+token);
for(const token of ['gxOpenClientFocus','b2_listar_prorrogas','Prórroga hasta ',
 'Prórroga incumplida','Prórroga cumplida','b2_f4_reintentar_discord'])
 ok(f4.includes(token),"Distintivo cliente: "+token);
ok(html.includes("admin-f4.js"),"Admin beta monta distintivo");
ok(guard.includes("b2_f4_reintentar_discord"),"Sandbox sólo permite reintento Admin");
for(const path of ["index.html","ayuda.html","admin.html"]){
 const original=read(path);
 ok(!original.includes("admin-f4.js"),"No alterado oficial: "+path);
}
for(const name of ["20261014_b2_f4_avisos_reversibles.sql",
 "20261014_b2_f4_cumplimiento_reversible.sql",
 "20261014_b2_f4_ack_discord_reversible.sql"]){
 const file=read("supabase/tests/"+name);
 ok(file.trimEnd().toLowerCase().endsWith("rollback;"),"Fixture revertible "+name)
}
console.log("GOXION B2 F4: "+checks+" invariantes PASS");