import {readFileSync as read} from "node:fs";
import assert from "node:assert/strict";

const historical=read("supabase/migrations/202611130001_b2_renovacion_proyectada_v2.sql","utf8");
const migration=read("supabase/migrations/202611140002_b2_vencimiento_recurrente_v2.sql","utf8");
assert.match(historical,/goxion_b2_proxima_renovacion/);
const writerBoundary=migration.indexOf("CREATE OR REPLACE FUNCTION public.goxion_b2_iniciar_ciclo");
assert.ok(writerBoundary>0,"Falta el único escritor oficial");
const projection=migration.slice(0,writerBoundary);
const writer=migration.slice(writerBoundary);
const edge=read("docs/edge/acciones-financieras-b2-beta/index.ts","utf8");
const registry=read("docs/GOXION_LIMPIEZA_NOMBRES_2026-11-12.md","utf8");
const design=read("docs/GOXION_HIBRIDO_RENOVACIONES_V2.md","utf8");

assert.match(projection,/create or replace function public\.goxion_b2_vencimiento_periodo\(/i);
assert.match(projection,/create or replace function public\.goxion_b2_previsualizar_renovaciones\(/i);
assert.match(projection,/language sql immutable strict security invoker/i);
assert.match(projection,/language plpgsql stable security invoker/i);
assert.match(projection,/revoke all on function public\.goxion_b2_previsualizar_renovaciones/i);
assert.match(projection,/grant execute on function public\.goxion_b2_previsualizar_renovaciones\(uuid,date\)\s+to service_role/i);
assert.ok(!/\b(insert|update|delete|truncate)\s+(into\s+|from\s+)?public\./i.test(projection),
  "El corte A es solo lectura y no modifica contratos o pagos");

const preflight=edge.slice(edge.indexOf('if(action==="b2_estado_activacion")'),
  edge.indexOf('// B2: preflight de preparación'));
assert.match(preflight,/sb\.rpc\("goxion_b2_previsualizar_renovaciones"/);
assert.ok(!preflight.includes("new Date("),"La fecha de renovación no se inventa en Edge");
assert.ok(!preflight.includes("row.cobertura_hasta<periodo"),
  "No bloquear cobertura histórica por pertenecer al mes anterior");
assert.match(preflight,/p\.atrasados/);
assert.match(preflight,/p\.cubiertos_periodos_futuros/);
assert.match(preflight,/n!==exigibles/);
assert.match(preflight,/if\(client\.data\.pago_en_revision===true\)/);
assert.match(preflight,/operacion_solo_lectura:true/);

assert.match(writer,/create or replace function public\.goxion_b2_iniciar_ciclo/i);
assert.ok((writer.match(/goxion_b2_vencimiento_periodo/g)||[]).length>=4,
  "El mismo cálculo se usa en elegibilidad y materialización");
assert.match(writer,/goxion_b2_validar_atribuciones/);
assert.match(writer,/goxion_estado_financiero/);
assert.match(writer,/Hay comprobante global pagado; no duplicar/);
assert.match(writer,/goxion_b2_cargos/);
assert.ok(!/p_periodo,cal\.cobertura_hasta,cal\.revision/i.test(writer),
  "Ningún nuevo cargo usa cobertura pagada como vencimiento");

assert.match(registry,/ACTIVO, nombre heredado/);
assert.match(registry,/HISTÓRICAS/);
assert.match(design,/Cancelar no es borrar el pasado/);
assert.match(design,/Un solo propietario de reglas/);
console.log("GOXION híbrido: migraciones históricas, recurrencia, contrato y guardas PASS");
