import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const first=readFileSync("supabase/migrations/202610120001_obligaciones_abonos_sombra.sql","utf8");
const hard=readFileSync("supabase/migrations/202610120002_obligaciones_abonos_hardening.sql","utf8");
const audit=readFileSync("supabase/migrations/202610120003_abonos_b2_auditoria.sql","utf8");
const ledger=readFileSync("docs/edge/estado-financiero/calendario-conciliacion.mjs","utf8");
const old=readFileSync("assets/js/core/financial-actions.js","utf8");
const docs=readFileSync("docs/FINANCIAL_ENGINE.md","utf8");
let count=0;
const ok=(x,name)=>{assert(x,name);count++};
for(const table of ["goxion_obligaciones_sombra","goxion_abonos_sombra","goxion_imputaciones_sombra"]){
 ok(first.includes("create table if not exists public."+table),"Tabla protegida "+table);
 ok(first.includes("alter table public."+table+" enable row level security"),"RLS para "+table);
 ok(first.includes("revoke all on public."+table+" from public,anon,authenticated"),"Sin acceso cliente "+table);
 ok(first.includes("to service_role"),"Solo rol de servicio");
}
ok(first.includes("unique (cliente_acceso_id,ciclo_inicio)"),"Una obligación por acceso y ciclo");
ok(first.includes("unique(cliente_id,clave_idempotencia)"),"Clave anti-duplicado solicitud abono");
ok(hard.includes("goxion_abonos_sombra_solicitud_activa_key"),"Una propuesta activa por obligación");
ok(hard.includes("v_imputado>v_total or v_pendientes>v_total"),"No reducir importe bajo imputación o solicitud");
ok(hard.includes("new.estado<>'conciliado'"),"No quitar conciliación con saldo asignado");
ok(first.includes("goxion_imputaciones_fuente_exacta"),"Origen único de movimiento");
ok(first.includes("unique(obligacion_id,pago_id)"),"No duplicar movimiento completo");
ok(first.includes("unique(obligacion_id,pago_parcial_id)"),"No duplicar movimiento parcial");
ok(audit.includes("create table if not exists public.goxion_b2_auditoria"),"Libro de auditoría");
ok(audit.includes("goxion_b2_obligacion_audit"),"Audita obligaciones");
ok(audit.includes("goxion_b2_abono_audit"),"Audita abonos");
ok(audit.includes("goxion_b2_imputacion_audit"),"Audita imputaciones");
ok(audit.includes("revoke all on public.goxion_b2_auditoria from public,anon,authenticated,service_role"),"No editar auditoría");
ok(audit.includes("grant select,insert on public.goxion_b2_auditoria to service_role"),"Auditoría de solo adición");

ok(hard.includes("from public.pagos_parciales p where id=new.pago_parcial_id for update"),"Lock origen parcial");
ok(hard.includes("from public.pagos p where id=new.pago_id for update"),"Lock origen pago normal");
ok(ledger.includes('cobrable:false'),"Conciliación nueva no aplica cobro");
ok(old.includes("registerPartialPayment"),"Conservar abono de Admin existente");
ok(old.includes("pactPaymentDate"),"Conservar acuerdo actual");
ok(docs.includes("saldo restante"),"Documentación respeta mora sobre saldo");
ok(!/^\s*(?:UPDATE|DELETE|TRUNCATE|INSERT INTO)\s+(?:public\.)?(?:clientes|pagos|pagos_parciales|acuerdos_cobro)\b/im.test(first+"\n"+hard),
 "Migraciones no alteran cobros oficiales");
console.log("GOXION B2 esquema sombra: "+count+" invariantes PASS, sin exposición al cliente ni cambios de pagos");
