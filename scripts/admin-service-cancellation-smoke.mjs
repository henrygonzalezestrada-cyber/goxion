import { readFileSync as read } from "node:fs";
import assert from "node:assert/strict";

const sql=read("supabase/migrations/202611130002_cancelar_servicio_b2_sin_borrar_historial.sql","utf8");
const tests=read("supabase/tests/20261113_b2_cancelacion_segura_reversible.sql","utf8");
const edge=read("docs/edge/admin-acciones/index.ts","utf8");
const ui=read("assets/js/admin/03-supabase-v3-writes.js","utf8");
const html=read("admin.html","utf8");
const layer=read("assets/js/admin/02-admin-supabase-layer.js","utf8");

assert.match(sql,/create or replace function public\.goxion_cancelar_servicio_admin_v1/);
assert.match(sql,/revoke all on function public\.goxion_cancelar_servicio_admin_v1[\s\S]*from public,anon,authenticated/i);
assert.match(sql,/grant execute on function public\.goxion_cancelar_servicio_admin_v1[\s\S]*to service_role/i);
assert.match(sql,/public\.goxion_b2_desactivar_cliente/);
assert.match(sql,/public\.goxion_b2_iniciar_ciclo/);
assert.match(sql,/SERVICIO_B2_CICLO_CON_MOVIMIENTOS/);
assert.match(sql,/from public\.goxion_b2_abonos_aprobados/);
assert.match(sql,/from public\.goxion_b2_comprobantes/);
assert.match(sql,/from public\.goxion_b2_f4_eventos/);
assert.match(sql,/from public\.goxion_b2_atribuciones_comerciales/);
assert.match(sql,/insert into public\.goxion_b2_auditoria/);
assert.match(sql,/update public\.cliente_servicios set activo=false/);
assert.ok(!/delete from public\.(pagos|pagos_parciales|cliente_servicios)/i.test(sql),
  "El motor no puede borrar pagos ni contratos históricos");
assert.ok(!/update public\.goxion_b2_cargos set[\s\S]{0,180}liquidado=true/i.test(sql),
  "No marcar obligaciones retiradas como pagadas");
assert.match(tests,/BEGIN\/ROLLBACK total/i);
assert.match(tests,/CANCELACION_B2_Y_MENSUAL_REVERSIBLE_PASS/);
assert.match(tests,/SERVICIO_B2_CICLO_CON_MOVIMIENTOS/);

const start=edge.indexOf('"quitar_servicio_cliente"');
const end=edge.indexOf('// PAGOS',start);
const block=edge.slice(start,end);
assert.match(block,/supabase\.rpc\("goxion_cancelar_servicio_admin_v1"/);
assert.match(block,/datos\.confirmado===true/);
assert.ok(!/\.delete\(\)/.test(block),"El botón no debe borrar físicamente contratos");
assert.match(block,/FIN-SERVICIO-COMPROMETIDO-409/);
assert.match(ui,/accion\("quitar_servicio_cliente", \{ id: serviceId, confirmado: true \}\)/);
assert.match(html,/03-supabase-v3-writes\.js\?v=20261113-b2-safe-cancel/);
assert.match(layer,/servicios: servicios\.filter\(x => x\?\.activo !== false\)/);
assert.match(layer,/servicios_historicos: servicios\.filter\(x => x\?\.activo === false\)/);
console.log("GOXION · cancelar servicio B2 seguro, historial, acceso y UI PASS");
