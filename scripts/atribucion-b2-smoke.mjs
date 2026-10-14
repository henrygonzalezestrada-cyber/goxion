import assert from "node:assert/strict";
import {verificarAtribucionB2} from "../docs/edge/estado-financiero/atribucion-b2.mjs";
import {readFileSync} from "node:fs";
let n=0;const run=(name,fn)=>{try{fn();n++}catch(e){throw Error(name+": "+e.message)}};
const access=[
{id:"c1",cliente_servicio_id:"vix",cliente_acceso_id:"a1",ciclo_inicio:"2026-10-01",fecha_vencimiento:"2026-10-05",cobertura_hasta:"2026-10-05",base_centavos:4900,calendario_estado:"verificado",calendario_revision:1},
{id:"c2",cliente_servicio_id:"vix",cliente_acceso_id:"a2",ciclo_inicio:"2026-10-01",fecha_vencimiento:"2026-10-15",cobertura_hasta:"2026-10-15",base_centavos:4900,calendario_estado:"verificado",calendario_revision:1}
];
const official=(over={})=>({
 fuente_financiera:"supabase:goxion_estado_financiero",contrato_financiero:{modo:"oficial"},
 subtotal:98,total_actual:92,
 descuentos:{promociones:0,lealtad:6,especiales:0,trato_justo:0,programados:0,total:6},
 cargos:{mora:0,reactivacion:0,total:0},...over
});
const assign=(obligacion_id,categoria,monto_centavos,rest={})=>({
 obligacion_id,categoria,monto_centavos,origen_id:"evidence-1",
 elegibilidad_confirmada:true,revision_origen:1,...rest
});
const base={obligaciones:access,asignaciones:[assign("c1","lealtad",600,{lealtad_elegible:true})],financiero:official()};
const check=(x,expected)=>assert.equal(x,expected);
run("ViX X2 $98 - $6 = $92 sin activar deuda",()=>{
 const r=verificarAtribucionB2(base);
 check(r.coherente,true);check(r.cobrable,false);check(r.acreditada,false);
 check(r.total_proyectado_centavos,9200);
 check(r.obligaciones.reduce((s,x)=>s+x.neto_proyectado_centavos,0),9200);
});
run("Sin metadata de lealtad falla cerrado",()=>{
 const r=verificarAtribucionB2({...base,asignaciones:[assign("c1","lealtad",600)]});
 check(r.errores[0],"lealtad_en_acceso_promocionado_o_no_elegible");
});
run("Monto de lealtad oficial no repartido falla",()=>{
 const r=verificarAtribucionB2({...base,asignaciones:[]});
 check(r.errores[0],"categoria_no_atribuida");
});
run("Fechas sin verificar no crean importes",()=>{
 const r=verificarAtribucionB2({...base,obligaciones:[access[0],{...access[1],calendario_estado:"borrador"}]});
 check(r.coherente,false);
});
run("No duplicar acceso por ID",()=>{
 const r=verificarAtribucionB2({...base,obligaciones:[access[0],access[0]]});
 check(r.coherente,false);
});
run("Cobertura distinta del vencimiento no es deuda autorizada",()=>{
 const r=verificarAtribucionB2({...base,obligaciones:[{...access[0],cobertura_hasta:"2026-10-06"},access[1]]});
 check(r.errores[0],"obligacion_sin_identidad_cobertura_o_revision");
});
run("Un acceso y ciclo no pueden duplicarse con ID nuevo",()=>{
 const r=verificarAtribucionB2({...base,obligaciones:[access[0],{...access[1],cliente_acceso_id:access[0].cliente_acceso_id}]});
 check(r.errores[0],"acceso_ciclo_duplicado");
});
run("No duplicar fuente y obligación",()=>{
 const r=verificarAtribucionB2({...base,asignaciones:[...base.asignaciones,...base.asignaciones]});
 check(r.errores[0],"atribucion_duplicada");
});
run("Cupón de misión se consume una sola vez",()=>{
 const a=[assign("c1","programados",300,{origen_tipo:"misiones",origen_id:"cupon-a"}),
 assign("c2","programados",300,{origen_tipo:"misiones",origen_id:"cupon-a"})];
 const f=official({descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:6,total:6}});
 const r=verificarAtribucionB2({obligaciones:access,asignaciones:a,financiero:f});
 check(r.errores[0],"cupon_repetido");
});
run("Combo/promoción exige ciclo contractual",()=>{
 const a=[assign("c1","promociones",600,{origen_id:"promo-1"})];
 const f=official({descuentos:{promociones:6,lealtad:0,especiales:0,trato_justo:0,programados:0,total:6}});
 const r=verificarAtribucionB2({obligaciones:access,asignaciones:a,financiero:f});
 check(r.errores[0],"promocion_sin_periodo_o_contrato");
});
run("No apilar promoción y lealtad en un mismo acceso",()=>{
 const a=[assign("c1","promociones",300,{origen_id:"promo-1",periodo_indice:1,contrato_reconciliado:true}),
 assign("c1","lealtad",300,{origen_id:"leal",lealtad_elegible:true})];
 const f=official({descuentos:{promociones:3,lealtad:3,especiales:0,trato_justo:0,programados:0,total:6}});
 const r=verificarAtribucionB2({obligaciones:access,asignaciones:a,financiero:f});
 check(r.errores[0],"lealtad_en_acceso_promocionado_o_no_elegible");
});
run("No apilar lealtad aunque llegue ANTES que promoción",()=>{
 const a=[assign("c1","lealtad",300,{origen_id:"leal",lealtad_elegible:true}),
 assign("c1","promociones",300,{origen_id:"promo-1",periodo_indice:1,contrato_reconciliado:true})];
 const f=official({descuentos:{promociones:3,lealtad:3,especiales:0,trato_justo:0,programados:0,total:6}});
 check(verificarAtribucionB2({obligaciones:access,asignaciones:a,financiero:f}).errores[0],
 "lealtad_en_acceso_promocionado_o_no_elegible");
});
run("Trato Justo no va a servicio ajeno",()=>{
 const a=[assign("c1","trato_justo",600,{cliente_servicio_id:"netflix"})];
 const f=official({descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:6,programados:0,total:6}});
 const r=verificarAtribucionB2({obligaciones:access,asignaciones:a,financiero:f});
 check(r.errores[0],"trato_justo_de_otro_servicio");
});
run("Mora 5% diario tope 50% sobre saldo verificado",()=>{
 const ob=[{...access[0],base_centavos:10000}];
 const f=official({subtotal:100,total_actual:110,
 descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:0,total:0},
 cargos:{mora:10,reactivacion:0,total:10}});
 const a=[assign("c1","mora",1000,{saldo_principal_centavos:10000,
 fecha_operativa:"2026-10-05",fecha_calculo:"2026-10-07",saldo_aprobado:true})];
 const r=verificarAtribucionB2({obligaciones:ob,asignaciones:a,financiero:f});
 check(r.coherente,true);check(r.cobrable,false);
});
run("Mora con importe incorrecto se rechaza",()=>{
 const ob=[{...access[0],base_centavos:10000}];
 const f=official({subtotal:100,total_actual:109.99,
 descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:0,total:0},
 cargos:{mora:9.99,reactivacion:0,total:9.99}});
 const a=[assign("c1","mora",999,{saldo_principal_centavos:10000,fecha_operativa:"2026-10-05",fecha_calculo:"2026-10-07",saldo_aprobado:true})];
 check(verificarAtribucionB2({obligaciones:ob,asignaciones:a,financiero:f}).errores[0],"mora_no_corresponde_a_dias_y_saldo");
});
run("Saldo sin aprobación no puede generar mora",()=>{
 const ob=[{...access[0],base_centavos:10000}];
 const f=official({subtotal:100,total_actual:110,
 descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:0,total:0},
 cargos:{mora:10,reactivacion:0,total:10}});
 const a=[assign("c1","mora",1000,{saldo_principal_centavos:10000,fecha_operativa:"2026-10-05",fecha_calculo:"2026-10-07",saldo_aprobado:false})];
 check(verificarAtribucionB2({obligaciones:ob,asignaciones:a,financiero:f}).coherente,false);
});
run("Pago parcial o en revisión bloquea obligación independiente",()=>{
 const r=verificarAtribucionB2({...base,financiero:official({pago_incompleto:true})});
 check(r.errores[0],"estado_sin_cobro_individual");
});
run("Reactivación sin autorización bloquea",()=>{
 const ob=[{...access[0],base_centavos:10000}];
 const f=official({subtotal:100,total_actual:120,
 descuentos:{promociones:0,lealtad:0,especiales:0,trato_justo:0,programados:0,total:0},
 cargos:{mora:0,reactivacion:20,total:20}});
 const a=[assign("c1","reactivacion",2000)];
 check(verificarAtribucionB2({obligaciones:ob,asignaciones:a,financiero:f}).errores[0],"reactivacion_no_autorizada");
});
run("El verificador no consulta BD ni acredita fondos",()=>{
 const code=readFileSync("docs/edge/estado-financiero/atribucion-b2.mjs","utf8");
 assert(!/\.rpc\(|\.from\(|fetch\(/.test(code));
 assert(code.includes('cobrable:false')&&code.includes('acreditada:false'));
});
console.log("GOXION B2 atribución explicita: "+n+" escenarios PASS sin cobro");
