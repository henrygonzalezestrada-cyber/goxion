import assert from 'node:assert/strict';
import {simularMoraIndependiente as simular} from '../docs/edge/estado-financiero/mora-multifecha.mjs';
const base=[
 {acceso_id:'servicio9',vence:'2026-11-09',saldo_inicial_centavos:4900,conciliado:true},
 {acceso_id:'servicio15',vence:'2026-11-15',saldo_inicial_centavos:4900,conciliado:true},
];
const pay=(id,date,amount,key)=>({acceso_id:id,fecha_aprobacion:date,monto_centavos:amount,
 aprobado:true,operation_id:key});
let n=0;
const ok=(x)=>{assert.equal(x.ok,true,JSON.stringify(x));assert.equal(x.cobrable,false);n++;return x};
const no=(x,code)=>{assert.equal(x.ok,false);assert.equal(x.codigo,code);assert.equal(x.cobrable,false);n++};
let x=ok(simular({obligaciones:base,hoy:'2026-11-09'}));
assert.deepEqual(x.obligaciones.map(o=>o.mora_generada_centavos),[0,0]);
x=ok(simular({obligaciones:base,hoy:'2026-11-10'}));
assert.deepEqual(x.obligaciones.map(o=>o.mora_generada_centavos),[245,0]);
assert.equal(x.totales.mora_pendiente_centavos,245);
x=ok(simular({obligaciones:base,hoy:'2026-11-16'}));
assert.deepEqual(x.obligaciones.map(o=>o.mora_generada_centavos),[1715,245]);
assert.equal(x.totales.mora_pendiente_centavos,1960);
x=ok(simular({obligaciones:base,hoy:'2026-12-01'}));
assert.deepEqual(x.obligaciones.map(o=>o.mora_generada_centavos),[2450,2450]);
assert.equal(x.totales.mora_pendiente_centavos,4900);
x=ok(simular({obligaciones:base,hoy:'2026-11-11',movimientos:[
 pay('servicio9','2026-11-10',2000,'abono1')
]}));
assert.equal(x.obligaciones[0].abonos_principal_centavos,2000);
assert.equal(x.obligaciones[0].principal_pendiente_centavos,2900);
assert.equal(x.obligaciones[0].mora_generada_centavos,390,'245 dia 10 mas 145 dia 11');
assert.equal(x.obligaciones[1].mora_generada_centavos,0);
x=ok(simular({obligaciones:base,hoy:'2026-11-11',movimientos:[
 pay('servicio9','2026-11-09',2000,'abono2')
]}));
assert.equal(x.obligaciones[0].mora_generada_centavos,290,'Mora desde 10 sobre 2900 por 2 dias');
x=ok(simular({obligaciones:base,hoy:'2026-11-11',movimientos:[
 pay('servicio9','2026-11-09',4900,'completo1')
]}));
assert.equal(x.obligaciones[0].liquidado,true);
assert.equal(x.obligaciones[0].mora_generada_centavos,0);
x=ok(simular({obligaciones:base,hoy:'2026-11-17',movimientos:[
 pay('servicio9','2026-11-10',2000,'uno'),pay('servicio15','2026-11-15',4900,'dos')
]}));
assert.equal(x.obligaciones[1].liquidado,true);
assert.equal(x.obligaciones[1].mora_generada_centavos,0);
assert.equal(x.obligaciones[0].principal_pendiente_centavos,2900);
x=ok(simular({obligaciones:base,hoy:'2026-11-12',movimientos:[
 pay('servicio9','2026-11-09',2000,'uno'),
 pay('servicio9','2026-11-11',1000,'dos')
]}));
assert.equal(x.obligaciones[0].principal_pendiente_centavos,1900);
assert.equal(x.obligaciones[0].mora_generada_centavos,385,'145 dia10 y11, 95 dia12');
x=ok(simular({obligaciones:base,hoy:'2026-11-11',movimientos:[
 pay('servicio9','2026-11-10',4900,'uno'),
 pay('servicio9','2026-11-10',245,'dos')
]}));
assert.equal(x.obligaciones[0].liquidado,true);
assert.equal(x.obligaciones[0].abonos_mora_centavos,245);
assert.equal(x.obligaciones[0].mora_generada_centavos,245);
no(simular({obligaciones:base,hoy:'2026-11-16',fechas_unificadas:true}),'usar_motor_global');
no(simular({obligaciones:[base[0],base[0]],hoy:'2026-11-10'}),'obligacion_no_conciliada');
no(simular({obligaciones:base,hoy:'2026-11-10',movimientos:[pay('ajeno','2026-11-09',1,'a')]}),'movimiento_no_aprobado_o_duplicado');
no(simular({obligaciones:base,hoy:'2026-11-10',movimientos:[pay('servicio9','2026-11-11',1,'a')]}),'movimiento_no_aprobado_o_duplicado');
no(simular({obligaciones:base,hoy:'2026-11-10',movimientos:[
 pay('servicio9','2026-11-09',1,'a'),pay('servicio15','2026-11-09',1,'a')]}),'movimiento_no_aprobado_o_duplicado');
no(simular({obligaciones:base,hoy:'2026-11-10',movimientos:[pay('servicio9','2026-11-09',9900,'c')]}),'abono_supera_saldo');
console.log('GOXION B2 · Mora independiente '+n+' casos PASS');
