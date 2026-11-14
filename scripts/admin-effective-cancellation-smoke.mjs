import {readFileSync as read} from "node:fs";
import assert from "node:assert/strict";

const sql=read("supabase/migrations/202611140004_cancelacion_efectiva_atomica_admin_v1.sql","utf8");
const test=read("supabase/tests/20261114_cancelacion_efectiva_atomica_reversible.sql","utf8");
const edge=read("docs/edge/cancelaciones-admin/index.ts","utf8");
const ui=read("assets/js/admin/20-admin-security-controller.js","utf8");
const html=read("admin.html","utf8");
const model=read("assets/js/admin/02-admin-supabase-layer.js","utf8");
const writer=edge.slice(edge.indexOf('if(accion==="hacer_efectiva")'),
    edge.indexOf('return res({ok:false,error:`Acción no reconocida:',edge.indexOf('if(accion==="hacer_efectiva")')));

assert.match(sql,/create or replace function public\.goxion_hacer_efectiva_cancelacion_admin_v1/i);
assert.match(sql,/security definer/);
assert.match(sql,/revoke all on function public\.goxion_hacer_efectiva_cancelacion_admin_v1[\s\S]*from public,anon,authenticated/i);
assert.match(sql,/grant execute on function public\.goxion_hacer_efectiva_cancelacion_admin_v1[\s\S]*to service_role/i);
assert.match(sql,/public\.goxion_cancelar_servicio_admin_v1/);
assert.match(sql,/public\.goxion_b2_desactivar_cliente/);
assert.match(sql,/if v_solicitud\.estado<>'aprobada'/);
assert.match(sql,/for update/);
assert.match(sql,/update public\.cliente_servicios set activo=false/);
assert.match(sql,/update public\.solicitudes_cancelacion[\s\S]*estado='efectiva'/);
assert.ok(!/delete from public\.(pagos|cliente_servicios|solicitudes_cancelacion)/i.test(sql));
assert.match(test,/CANCELACION_EFECTIVA_ATOMICA_PASS/);
assert.match(test,/CANCELACION_REQUIERE_APROBACION/);
assert.match(test,/repetida/);

assert.match(writer,/sb\.rpc\("goxion_hacer_efectiva_cancelacion_admin_v1"/);
assert.ok(!/\.from\("cliente_servicios"\)\.update\(/.test(writer),
  "La Edge no puede modificar el contrato por fuera de la transacción");
assert.ok(!/\.from\("solicitudes_cancelacion"\)\.update\(/.test(writer),
  "No actualizar estados en dos operaciones distintas");
assert.match(writer,/CANCELACION_B2_CICLO_PENDIENTE/);
assert.match(ui,/window\.gxReloadAdminClient/);
assert.match(ui,/gx-client-focus/);
assert.match(ui,/actualizado\.servicios\|\|\[\]/);
assert.match(ui,/La cancelación quedó efectiva en Supabase/);
assert.match(html,/20-admin-security-controller\.js\?v=20261113-effective-cancel/);
assert.match(model,/servicios: servicios\.filter\(x => x\?\.activo !== false\)/);
assert.match(model,/servicios_historicos: servicios\.filter\(x => x\?\.activo === false\)/);
console.log("GOXION · cancelación efectiva atómica, sincronización Admin/Index PASS");
