import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluarPropuestaAbono} from "../docs/edge/estado-financiero/abonos-politica.mjs";
const base={
 saldo_confirmado_centavos:9200,monto_propuesto_centavos:3000,
 obligacion_estado:"conciliado",fecha_vencimiento:"2026-11-06",
 fecha_hoy:"2026-11-05",mora_acumulada_centavos:0
};
let count=0;
const test=(name,fn)=>{try{fn();count++}catch(e){throw Error(name+": "+e.message)}};
test("Propuesta antes del corte no acredita pago",()=>{
 const x=evaluarPropuestaAbono(base);
 assert.equal(x.permitido,true);assert.equal(x.cobrable,false);
 assert.equal(x.saldo_proyectado_centavos,6200);
 assert.equal(x.evita_mora_automaticamente,false);
 assert.equal(x.mora_condonada_centavos,0);
 assert.equal(x.accion,"solicitar_abono");
});
test("Propuesta tardía conserva mora devengada",()=>{
 const x=evaluarPropuestaAbono({...base,fecha_hoy:"2026-11-13",mora_acumulada_centavos:920});
 assert.equal(x.mora_acumulada_centavos,920);assert.equal(x.mora_condonada_centavos,0);
 assert.equal(x.mora_puede_seguir_generandose,true);
});
test("Fecha pactada autorizada cambia corte operativo, no fecha original",()=>{
 const x=evaluarPropuestaAbono({...base,fecha_hoy:"2026-11-13",acuerdo_fecha:"2026-11-20"});
 assert.equal(x.fecha_operativa,"2026-11-20");
 assert.equal(x.mora_puede_seguir_generandose,false);
 assert.equal(x.evita_mora_automaticamente,false);
});
test("Fecha pactada anterior al corte se rechaza",()=>{
 const x=evaluarPropuestaAbono({...base,acuerdo_fecha:"2026-11-03"});
 assert.equal(x.permitido,false);assert.equal(x.razon,"acuerdo_invalido");
});
test("Monto cero rechazado",()=>{
 const x=evaluarPropuestaAbono({...base,monto_propuesto_centavos:0});
 assert.equal(x.razon,"monto_cero");
});
test("Abono superior al saldo rechazado",()=>{
 const x=evaluarPropuestaAbono({...base,monto_propuesto_centavos:9300});
 assert.equal(x.razon,"excede_saldo");
});
test("Pago total se deriva al flujo existente",()=>{
 const x=evaluarPropuestaAbono({...base,monto_propuesto_centavos:9200});
 assert.equal(x.accion,"pago_completo_existente");assert.equal(x.permitido,false);
});
test("Abono menor a un centavo imposible",()=>{
 assert.equal(evaluarPropuestaAbono({...base,monto_propuesto_centavos:0.5}).permitido,false);
});
test("Una obligación sombra sin conciliar no autoriza abono",()=>{
 const x=evaluarPropuestaAbono({...base,obligacion_estado:"simulado"});
 assert.equal(x.razon,"obligacion_no_conciliada");
});
test("Pago en revisión bloquea segunda solicitud",()=>{
 const x=evaluarPropuestaAbono({...base,pago_en_revision:true});
 assert.equal(x.razon,"comprobante_en_revision");
});
test("Suspensión bloquea solicitud",()=>{
 const x=evaluarPropuestaAbono({...base,cliente_suspendido:true});
 assert.equal(x.razon,"cliente_suspendido");
});
test("Beneficios por conciliar impiden montos incompletos",()=>{
 const x=evaluarPropuestaAbono({...base,beneficio_pendiente:true});
 assert.equal(x.razon,"beneficios_por_conciliar");
});
test("Sin saldo no hay abono",()=>{
 const x=evaluarPropuestaAbono({...base,saldo_confirmado_centavos:0});
 assert.equal(x.razon,"sin_saldo");
});
test("Fecha inválida rechazada",()=>{
 const x=evaluarPropuestaAbono({...base,fecha_hoy:"2026-02-30"});
 assert.equal(x.razon,"datos_invalidos");
});
test("Política pura sin pagos ni side-effects",()=>{
 const code=readFileSync("docs/edge/estado-financiero/abonos-politica.mjs","utf8");
 assert(!/\.from\(|\.rpc\(|fetch\(|\binsert\(|\bupdate\(/.test(code));
 assert(code.includes("mora_condonada_centavos:0")&&code.includes("cobrable:false"));
});
console.log("GOXION política abonos: "+count+" pruebas PASS (sin pagar ni condonar mora)");
