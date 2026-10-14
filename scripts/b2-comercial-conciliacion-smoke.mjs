import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(p)=>readFileSync(p,"utf8");
let checks=0;
function ok(cond,label){assert.ok(cond,label);checks++;}
const migrations=[
"202610130006_b2_atribuciones_comerciales_preparacion.sql",
"202610130007_b2_cargos_comerciales_conciliados.sql",
"202610130008_b2_validar_consumos_recibo.sql",
"202610130009_b2_atribuciones_inmutables.sql",
"202610130010_b2_stacking_base_por_acceso.sql"
].map(p=>read("supabase/migrations/"+p));
const [sources,charges,consumption,freeze,stacking]=migrations;
for(const token of ["goxion_b2_atribuciones_comerciales","goxion_b2_fuentes_comerciales","goxion_b2_validar_atribuciones","goxion_b2_guardar_atribuciones","referencia_id","cliente_acceso_id","monto_centavos","enable row level security"]){
 ok(sources.includes(token),"Attribution source "+token);
}
ok(sources.includes("ATRIBUCION_NO_CONCILIADA"),"Transaction rolls back on wrong attribution");
ok(charges.includes("descuento_comercial_centavos"),"Commercial savings separate from loyalty");
ok(charges.includes("principal_pendiente_centavos=b.base_centavos-s.total"),"Amounts only applied to selected charge");
ok(charges.includes("B2_CARGO_CUBIERTO_POR_BENEFICIO_REQUIERE_REVISION"),"Do not fabricate zero-value receipts");
ok(consumption.includes("B2_CONSUMO_BENEFICIO_NO_COINCIDE"),"Coupon consumed exactly as credited");
ok(consumption.includes("B2_CONSUMO_PROMOCION_NO_COINCIDE"),"Promotion consumed exactly as credited");
ok(consumption.includes("B2_CONSUMO_TRATO_JUSTO_NO_COINCIDE"),"Compensation marked closed");
ok(freeze.includes("before insert or update or delete"),"Immutable attribution after cycle");
ok(freeze.includes("ATRIBUCION_CICLO_INMUTABLE"),"Frozen campaign guard");
ok(stacking.includes("base_bloqueada_lealtad_centavos"),"Non-stackable campaign excludes loyalty on assigned access");
ok(stacking.includes("BLOQUEO_LEALTAD_SUPERA_BASE_POR_ACCESO"),"Per-access excluded base bounded");
for(const ddl of migrations){
 ok(!/\b(?:drop|truncate)\s+table\b/i.test(ddl),"No destructive table command");
 ok(!/grant\s+(?:all|select|insert|update|delete|execute)\b[^\n]*\bto\s+(?:anon|authenticated)\b/i.test(ddl),"No public financial access");
}
const expectedTests=[
"20261013_b2_atribuciones_comerciales_reversibles.sql",
"20261013_b2_promocion_cupon_consumo_reversible.sql",
"20261013_b2_trato_justo_promocion_cupon_reversible.sql",
"20261013_b2_promocion_no_acumulable_reversible.sql",
"20261013_b2_combo_dos_periodos_precio_fijo_reversible.sql"
];
for(const name of expectedTests){
 const source=read("supabase/tests/"+name);
 ok(/^\s*(?:--[^\n]*\n)*begin;/i.test(source),"Fixture begins transaction "+name);
 ok(/\brollback;\s*$/i.test(source),"Fixture always rolls back "+name);
}
const admin=read("docs/edge/acciones-financieras-b2-beta/index.ts");
ok(admin.includes('action==="b2_guardar_atribuciones"'),"Reuse B2 Admin gateway");
ok(admin.includes('confirmar_atribucion!==true'),"Explicit Admin confirmation");
ok(admin.includes('PRORROGA_AUTOMATICA_SIN_RESOLUCION_ADMIN'),"No manual grace approval");
ok(admin.includes('rpc("goxion_b2_validar_atribuciones"'),"Read-only commercial preflight");
const receiver=read("docs/edge/comprobantes-b2-beta/index.ts");
ok(receiver.indexOf("const existing=")<receiver.indexOf("const cycle=await"),"Replay before quote");
ok(receiver.indexOf("const cycle=await")<receiver.indexOf("storage.from(BUCKET).upload"),"Quote before upload");
console.log("GOXION B2 comercial: "+checks+" verificaciones estáticas PASS; los SQL reversibles se ejecutan en Supabase.");
