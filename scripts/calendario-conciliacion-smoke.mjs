import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {reconciliarCalendarioOficial,distribuirCentavos} from "../docs/edge/estado-financiero/calendario-conciliacion.mjs";

const units=[
 {id:"vix#1",cliente_servicio_id:"vix",fecha_vencimiento:"2026-11-06",monto_base_centavos:4900,cobertura_confirmada:true},
 {id:"vix#2",cliente_servicio_id:"vix",fecha_vencimiento:"2026-11-30",monto_base_centavos:4900,cobertura_confirmada:true}
];
function official(overrides={}){
 const base={
  fuente_financiera:"supabase:goxion_estado_financiero",
  contrato_financiero:{modo:"oficial",version:"1.1"},
  periodo:"2026-11-01",estado:"por_vencer",estado_db:"pagado",
  servicios:[{id:"vix",nombre:"ViX Premium (x2)",monto:98}],
  subtotal:98,subtotal_efectivo:98,total_actual:92,total_calculado:92,
  promociones:{total_ahorro:0,detalles:[],stacking:{}},
  descuentos:{promociones:0,lealtad:6,especiales:0,trato_justo:0,programados:0,total:6},
  lealtad:{monto:6,nivel:2,porcentaje:6,base_bloqueada_promocion:0},
  cargos:{mora:0,reactivacion:0,total:0},
  beneficios_programados:[],esta_pagado_periodo:false,pago_en_revision:false,pago_incompleto:false
 };
 return {...base,...overrides};
}
const data={calendario:{servicios:units},financiero:official()};
let count=0;
const test=(description,fn)=>{try{fn();count++}catch(e){throw Error(description+": "+e.message)}};
test("Precios ViX x2 -> saldo oficial $92 no $98",()=>{
 const r=reconciliarCalendarioOficial(data);
 assert.equal(r.cuadrado,true);assert.equal(r.cobrable,false);
 assert.equal(r.importe_base_centavos,9800);assert.equal(r.importe_oficial_centavos,9200);
 assert.equal(r.total_estimado_centavos,9200);
 assert.deepEqual(r.vencimientos.map(g=>g.estimado_centavos),[4600,4600]);
 assert.equal(r.categorias.lealtad.porcentaje,6);
 assert(r.alertas.includes("lealtad_requiere_elegibilidad_por_fecha"));
});
test("No generar nuevos descuentos de lealtad desde porcentajes",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,
  financiero:official({lealtad:{monto:6,nivel:2,porcentaje:6},descuentos:{
   promociones:0,lealtad:3,especiales:0,trato_justo:0,programados:0,total:3
  },total_actual:95,total_calculado:95})});
 assert.equal(r.cuadrado,false);
 assert.equal(r.motivo,"descuentos_no_conciliados");
});
test("El cupón de misiones viene de beneficios programados una sola vez",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  descuentos:{promociones:10,lealtad:0,especiales:4,trato_justo:0,programados:15,total:29},
  promociones:{total_ahorro:10,detalles:[],stacking:{base_bloqueada_lealtad:88}},
  lealtad:{monto:0,nivel:2,porcentaje:6},
  beneficios_programados:[{id:"coupon-1",origen:"misiones",monto:15,periodo_indice:1}],
  cargos:{mora:10,reactivacion:2,total:12},
  subtotal_efectivo:88,total_calculado:81,total_actual:81
 })});
 assert.equal(r.cuadrado,true);assert.equal(r.total_estimado_centavos,8100);
 assert.equal(r.categorias.cupones_misiones.length,1);
 assert.equal(r.categorias.cupones_misiones[0].monto_centavos,1500);
 assert(r.alertas.includes("cupon_misiones_una_vez_por_periodo"));
 assert(r.alertas.includes("mora_exige_dias_y_saldo_por_vencimiento"));
 assert.equal(r.vencimientos.reduce((s,v)=>s+v.estimado_centavos,0),8100);
});
test("Descuentos parciales y cargos redondean a centavos, no en dólares",()=>{
 assert.deepEqual(distribuirCentavos(1,[4900,4900]),[1,0]);
 assert.deepEqual(distribuirCentavos(3,[1,2]),[1,2]);
 assert.deepEqual(distribuirCentavos(100,[80,20],[100,100]),[80,20]);
 assert.deepEqual(distribuirCentavos(5,[1,1,1],[5,5,5]),[2,2,1]);
});
test("Rechazar doble cupón con el mismo beneficio_id",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:10,total:10},
  lealtad:{monto:0,nivel:0,porcentaje:0},
  beneficios_programados:[{id:"duplicado",origen:"misiones",monto:5},{id:"duplicado",origen:"misiones",monto:5}],
  total_actual:88,total_calculado:88
 })});
 assert.equal(r.cuadrado,false);assert.equal(r.motivo,"beneficio_duplicado");
});
test("Mora sin saldo parcial puede conciliarse sin generar obligación",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:0,total:0},
  lealtad:{monto:0,nivel:0,porcentaje:0},
  cargos:{mora:10,reactivacion:0,total:10},
  total_actual:108,total_calculado:108
 })});
 assert.equal(r.total_estimado_centavos,10800);
 assert.equal(r.cobrable,false);
});
test("Pago parcial: preservar total oficial sin asignarlo a perfiles",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  pago_incompleto:true,total_actual:28,pago_parcial:{saldo_restante:28}
 })});
 assert.equal(r.importe_oficial_centavos,2800);
 assert.equal(r.total_estimado_centavos,9200);
 assert(r.alertas.includes("pago_parcial_o_revision"));
 assert.equal(r.cobrable,false);
});
test("Pagado: no generar deuda fantasma",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  esta_pagado_periodo:true,total_actual:0,estado:"pagado"
 })});
 assert.equal(r.importe_oficial_centavos,0);
 assert.equal(r.cobrable,false);
 assert(r.alertas.includes("periodo_ya_pagado"));
});
test("Pago en revisión: no acreditar ni recalcular",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  pago_en_revision:true,total_actual:92,estado:"revision"
 })});
 assert(r.alertas.includes("pago_parcial_o_revision"));
 assert.equal(r.cobrable,false);
});
test("Fechas sin confirmar: NO repartir beneficios",()=>{
 const r=reconciliarCalendarioOficial({calendario:{
  servicios:[units[0],{...units[1],cobertura_confirmada:false}]
 },financiero:official()});
 assert.equal(r.motivo,"fechas_o_precios_sin_verificar");assert.equal(r.cobrable,false);
});
test("Descuentos declarados inconsistentes bloquean el reparto",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  descuentos:{promociones:0,lealtad:6,especiales:5,trato_justo:0,programados:0,total:6}
 })});
 assert.equal(r.motivo,"totales_ajustes_inconsistentes");
});
test("Prohibir saldo oficial divergente aunque sumen unidades",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({total_actual:91})});
 assert.equal(r.motivo,"saldo_oficial_difiere_del_calculo");
});
test("No mezclar datos de contrato diferente",()=>{
 const r=reconciliarCalendarioOficial({calendario:{
  servicios:[units[0],{...units[1],cliente_servicio_id:"otro"}]
 },financiero:official()});
 assert.equal(r.motivo,"desglose_contratos_no_conciliado");
});
test("No exponer importes individuales en estado no oficial",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,
  financiero:official({fuente_financiera:"legacy"})});
 assert.equal(r.motivo,"estado_no_oficial");assert.equal(r.vencimientos.length,0);
});
test("No duplicar descuentos de promoción dentro de lealtad",()=>{
 const r=reconciliarCalendarioOficial({calendario:data.calendario,financiero:official({
  descuentos:{promociones:10,lealtad:0,especiales:0,trato_justo:0,programados:0,total:10},
  lealtad:{monto:0,nivel:2,porcentaje:6,base_bloqueada_promocion:88},
  promociones:{total_ahorro:10,detalles:[],stacking:{base_bloqueada_lealtad:88}},
  subtotal_efectivo:88,total_actual:88,total_calculado:88
 })});
 assert.equal(r.total_estimado_centavos,8800);
 assert(r.alertas.includes("promociones_con_reglas_de_acumulacion"));
});
test("Código fuente no expone ni aplica pagos",()=>{
 const script=readFileSync("docs/edge/estado-financiero/calendario-conciliacion.mjs","utf8");
 assert(!/\.from\(|\.rpc\(|fetch\(|aprobar_pago|insert\(|upsert\(/.test(script));
 assert(script.includes('cobrable:false'));assert(script.includes('desglose_de_obligaciones_autorizado:false'));
});
console.log("GOXION conciliación multidate oficial: "+count+" casos PASS; lealtad, promos, descuentos, cupones, mora y revisión sin nuevos cobros");
