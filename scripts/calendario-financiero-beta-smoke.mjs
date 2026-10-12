import assert from "node:assert/strict";
import {
  fechaUTC,fechaMesAnclada,siguienteFecha,siguienteCiclo,diasEntre,prorratearExtension,
  simularCalendario
} from "../docs/edge/estado-financiero/calendario-beta.mjs";

const tests=[];function check(name,actual,want){assert.deepEqual(actual,want,name);tests.push(name)}
function rejects(name,fn){assert.throws(fn,undefined,name);tests.push(name)}
const cli={id:"cliente-test",dia_pago:15,estado:"pendiente"};
const netflix={id:"netflix",nombre:"Netflix",monto:120,activo:true};
const disney={id:"disney",nombre:"Disney+",monto:90,activo:true};
const fin={fecha_corte:"2026-11-15",periodo:"2026-11-01",total_actual:210,
  esta_pagado_periodo:false,promociones:{total_ahorro:0}};
const setup=()=>({cliente:cli,servicios:[netflix,disney],financiero:fin,hoy:"2026-10-11"});
const split={
 servicios:{
   netflix:{cobertura_hasta:"2026-11-05",dia_original:5,cobertura_confirmada:true},
   disney:{cobertura_hasta:"2026-11-20",dia_original:20,cobertura_confirmada:true}
 }
};
check("Febrero 2027 no bisiesto",fechaMesAnclada(2027,2,31),"2027-02-28");
check("Febrero 2028 bisiesto",fechaMesAnclada(2028,2,31),"2028-02-29");
check("Ancla día 31 tras febrero",siguienteCiclo("2028-02-29",31),"2028-03-31");
check("Mes siguiente y cambio de año",siguienteFecha("2026-12-21",5),"2027-01-05");
check("No mueve corte de hoy",siguienteFecha("2026-11-05",5),"2026-11-05");
check("Cruza meses a días reales",diasEntre("2026-02-27","2026-03-01"),2);
check("Prorrateo 15/30 exacto",prorratearExtension("2026-11-05","2026-11-20",5,12000).centavos,6000);
check("Prorrateo 0 días",prorratearExtension("2026-11-05","2026-11-05",5,12000).centavos,0);
check("Prorrateo ante mes bisiesto",prorratearExtension("2028-02-29","2028-03-15",31,12000).centavos,5806);
const same=simularCalendario(setup());
check("Hereda una fecha de cliente normal",same.grupos.map(x=>x.fecha),["2026-11-15"]);
check("Cliente normal no cambia su flujo",same.calendario,"unificado");
check("Advertencia para cobertura no verificada",same.advertencias.some(s=>s.includes("hipótesis")),true);
check("Siempre lectura",same.listo_para_acreditar,false);
const multi=simularCalendario({...setup(),propuesta:split});
check("Agrupación en dos fechas",multi.grupos.map(x=>x.fecha),["2026-11-05","2026-11-20"]);
check("Próximo: solo Netflix",multi.pago.importe_centavos,12000);
check("Próximo: solo Netflix asignada",multi.pago.asignaciones.map(x=>x.servicio_id),["netflix"]);
check("No asigna dinero a Disney",multi.pago.asignaciones.some(x=>x.servicio_id==="disney"),false);
const all=simularCalendario({...setup(),propuesta:{...split,pago:{modo:"todos"}}});
check("Ambas: transferencia única",all.pago.importe_centavos,21000);
check("Ambas: fechas conservadas",all.pago.asignaciones.map(x=>x.periodo_desde),["2026-11-05","2026-11-20"]);
const partial=simularCalendario({...setup(),propuesta:{...split,pago:{modo:"todos",importe:150}}});
check("Pago parcial se distribuye cronológicamente",partial.pago.asignaciones.map(x=>x.pago_asignado_centavos),[12000,3000]);
check("Pago parcial no liquida Disney",partial.pago.asignaciones[1].liquidado,false);
const specific=simularCalendario({...setup(),propuesta:{...split,pago:{modo:"elegidos",servicios:["disney"]}}});
check("Selecciona solamente Disney",specific.pago.asignaciones.map(x=>x.servicio_id),["disney"]);
const unify=simularCalendario({...setup(),propuesta:{...split,unificar_dia:20}});
check("Unificación mantiene fecha cubierta",unify.servicios[0].fecha_vencimiento,"2026-11-05");
check("Unificación propone fecha nueva",unify.servicios[0].nueva_fecha,"2026-11-20");
check("Prorrateo solo una vez en Netflix",unify.ajuste_total_centavos,6000);
check("Disney no tiene ajuste",unify.servicios[1].ajuste.centavos,0);
check("No ejecuta unificación",unify.listo_para_acreditar,false);
const other=simularCalendario({...setup(),propuesta:{...split,unificar_dia:5}});
check("Unifica al siguiente día 5 sin recortar cobertura",other.servicios[1].nueva_fecha,"2026-12-05");
check("Nunca produce ajuste negativo automático",other.servicios[1].ajuste.centavos>=0,true);
const promo=simularCalendario({...setup(),financiero:{...fin,promociones:{total_ahorro:30}}});
check("Promoción exige confirmación comercial",promo.advertencias.some(x=>x.includes("precio promocional")),true);
rejects("No paga de más",()=>simularCalendario({...setup(),propuesta:{...split,pago:{modo:"todos",importe:211}}}));
rejects("No selecciona servicios ajenos",()=>simularCalendario({...setup(),propuesta:{...split,pago:{modo:"elegidos",servicios:["otro"]}}}));
rejects("No cambia fecha inexistente",()=>simularCalendario({...setup(),propuesta:{servicios:{netflix:{cobertura_hasta:"2026-02-30"}}}}));
rejects("No permite días 32",()=>simularCalendario({...setup(),propuesta:{unificar_dia:32}}));
rejects("No acepta cantidad negativa",()=>simularCalendario({...setup(),servicios:[{...netflix,monto:-5}]}));
rejects("No acepta fracciones menores al centavo",()=>simularCalendario({...setup(),servicios:[{...netflix,monto:120.001}]}));
rejects("No modifica clientes ajenos",()=>simularCalendario({...setup(),propuesta:{servicios:{other:{nuevo_dia:18}}}}));
rejects("No acepta servicios repetidos",()=>simularCalendario({...setup(),servicios:[netflix,netflix]}));
rejects("No permite extensión excesiva",()=>prorratearExtension("2026-01-01","2026-03-01",1,10000));

const ytx2={id:"ytx2",nombre:"YouTube Premium (x2)",monto:178,activo:true};
const vixx2={id:"vixx2",nombre:"ViX Premium (x2)",monto:98,activo:true};
const x2=simularCalendario({...setup(),servicios:[ytx2,vixx2],financiero:{...fin,total_actual:276},
 propuesta:{servicios:{
 "ytx2#1":{cobertura_hasta:"2026-11-05",cobertura_confirmada:true,dia_original:5},
 "ytx2#2":{cobertura_hasta:"2026-11-20",cobertura_confirmada:true,dia_original:20},
 "vixx2#1":{cobertura_hasta:"2026-11-15",cobertura_confirmada:true,dia_original:15},
 "vixx2#2":{cobertura_hasta:"2026-11-25",cobertura_confirmada:true,dia_original:25}
 }}});
check("X2 genera unidades independientes",x2.servicios.length,4);
check("X2 conserva total mensual exacto",x2.total_base_centavos,27600);
check("X2 reparte YouTube en dos perfiles",x2.servicios.filter(s=>s.cliente_servicio_id==="ytx2").map(s=>s.monto_base_centavos),[8900,8900]);
check("X2 reparte ViX en dos perfiles",x2.servicios.filter(s=>s.cliente_servicio_id==="vixx2").map(s=>s.monto_base_centavos),[4900,4900]);
check("X2 usa vencimientos distintos",x2.grupos.map(g=>g.fecha),["2026-11-05","2026-11-15","2026-11-20","2026-11-25"]);
check("X2 próximo solo cubre una unidad",x2.pago.importe_centavos,8900);
check("X2 retiene identidad del contrato",x2.servicios[0].cliente_servicio_id,"ytx2");
check("X2 advierte reparto estimado",x2.advertencias.some(x=>x.includes("X2")),true);
const join=simularCalendario({...setup(),servicios:[ytx2],financiero:{...fin,total_actual:178},propuesta:{
 servicios:{"ytx2#1":{cobertura_hasta:"2026-11-05"},"ytx2#2":{cobertura_hasta:"2026-11-20"}},
 pago:{modo:"todos"}}});
check("Una transferencia cubre X2 completo",join.pago.importe_centavos,17800);
check("X2 distinto no equivale a servicio duplicado",join.pago.asignaciones.map(x=>x.servicio_id),["ytx2#1","ytx2#2"]);
const odd=simularCalendario({...setup(),servicios:[{id:"odd",nombre:"Ejemplo (x2)",monto:79.99,activo:true}],financiero:{...fin,total_actual:79.99}});
check("Resto de centavos no se pierde en X2",odd.servicios.reduce((sum,s)=>sum+s.monto_base_centavos,0),7999);
const combo=simularCalendario({...setup(),servicios:[{id:"combo",nombre:"HBO Max + Prime Video",monto:99,activo:true}],financiero:{...fin,total_actual:99}});
check("Combo de dos marcas no se separa arbitrariamente",combo.servicios.length,1);
rejects("No permite 2 fechas con ID original de X2",()=>simularCalendario({...setup(),servicios:[ytx2],propuesta:{servicios:{ytx2:{cobertura_hasta:"2026-11-05"}}}}));

const uneven=simularCalendario({...setup(),servicios:[ytx2],financiero:{...fin,total_actual:178},
 propuesta:{servicios:{"ytx2#1":{cobertura_hasta:"2026-11-05",cobertura_confirmada:true,precio_centavos:8000},
 "ytx2#2":{cobertura_hasta:"2026-11-20",cobertura_confirmada:true,precio_centavos:9800}}}});
check("Tarifas X2 asimétricas preservan importe pactado",uneven.total_base_centavos,17800);
check("Tarifas X2 reales por acceso",uneven.servicios.map(s=>s.monto_base_centavos),[8000,9800]);
check("Tarifa comprobada no se etiqueta como división estimada",uneven.servicios.every(s=>s.precio_dividido_estimado===false),true);
rejects("Precios X2 incompletos no permiten facturación divergente",()=>simularCalendario({...setup(),
 servicios:[ytx2],financiero:{...fin,total_actual:178},
 propuesta:{servicios:{"ytx2#1":{precio_centavos:8500},"ytx2#2":{precio_centavos:9500}}}}));

console.log("GOXION calendario financiero beta: "+tests.length+" pruebas correctas, cero escrituras.");
