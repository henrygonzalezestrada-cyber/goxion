import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const main=readFileSync("preview/integracion-b2/index-adapter.js","utf8");
const ayuda=readFileSync("assets/js/ayuda/19-b2-proximo-pago.js","utf8");
const html=readFileSync("ayuda.html","utf8");
const start=main.indexOf(" function rows(){");
const end=main.indexOf(" // Desglose financiero B2:",start);
assert(start>=0&&end>start);
const api=new Function("store", "let mode='proximo',selected=null;"+
 main.slice(start,end)+"return {nextPayment,choice, setMode:x=>{mode=x}};");
const charge=(id,vence,total,extra={})=>({
 cargo_id:id,acceso_id:id,servicio:"ViX Premium",ordinal:id,vence,
 total_centavos:total,principal_centavos:total,descuento_centavos:300,
 mora_centavos:0,pagado:false,...extra});
let checks=0;
const verify=(rows,expected,desc)=>{
 const o=api({quote:{cargos:rows}});const upcoming=o.nextPayment();
 assert.equal(upcoming.centavos,expected,desc+" valor destacado");
 assert.equal(o.choice().centavos,expected,desc+" valor del botón");
 checks++;
 return o;
};
const a=charge(1,"2026-11-06",4600),b=charge(2,"2026-11-30",4600);
let o=verify([a,b],4600,"Dos perfiles en distintas fechas");
o.setMode("todo");assert.equal(o.choice().centavos,9200,"El total permanece disponible");
checks++;
verify([a,{...b,vence:"2026-11-06"}],9200,"Dos perfiles mismo vencimiento");
verify([{...a,pagado:true,total_centavos:0},b],4600,"Primera cuota ya acreditada");
verify([{...a,total_centavos:5145,mora_centavos:245},b],5145,"Mora individual");
verify([{...a,fecha_pactada:"2026-12-03",prorroga_estado:"aprobada"},b],4600,"Prórroga desplaza siguiente vencimiento");
assert(html.includes("19-b2-proximo-pago.js"),"Mi Espacio monta el importe próximo");
assert(ayuda.includes('accion:"mi_estado"')&&ayuda.includes('data.modo==="b2_multifecha"'),"Solo cuota B2 autenticada");
assert(ayuda.includes('x.pagado!==true')&&ayuda.includes('x.total_centavos'),"Saldos de servidor, no porcentajes del navegador");
assert(main.includes('label.textContent=due?"Próximo pago"'),"Encabezado B2 protagonista");
console.log("GOXION B2 próximo importe: "+checks+" escenarios + contratos de UI PASS");