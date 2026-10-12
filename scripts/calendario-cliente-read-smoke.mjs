import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calendarioInformativo} from "../docs/edge/estado-financiero/calendario-cliente.mjs";

const contract={id:"vix",nombre:"ViX Premium (x2)",monto:98};
const a1={id:"a1",cliente_servicio_id:"vix",ordinal:1};
const a2={id:"a2",cliente_servicio_id:"vix",ordinal:2};
const date=(id,fecha,cents=4900,estado="verificado")=>({
 cliente_acceso_id:id,cliente_servicio_id:"vix",cobertura_hasta:fecha,
 dia_corte:Number(fecha.slice(-2)),precio_centavos:cents,estado
});
const base={contratos:[contract],accesos:[a1,a2],
 fechas:[date("a1","2026-11-06"),date("a2","2026-11-30")]};
let cases=0;
function yes(label,got,expected){
 assert.deepEqual(got,expected,label);cases++;
}
const proj=calendarioInformativo(base);
yes("X2 distintas fechas",proj.fechas.map(x=>x.fecha),["2026-11-06","2026-11-30"]);
yes("X2 completos disponibles",proj.disponible,true);
yes("Primera fecha",proj.fecha_proxima,"2026-11-06");
yes("Solo uno de los dos accesos por fecha",proj.fechas.map(x=>x.servicios.length),[1,1]);
yes("No hay importes exigibles",proj.fechas.some(x=>"monto" in x||"precio" in x||"total" in x),false);
yes("Nunca habilita cobros",proj.puede_pagar_individual,false);
yes("Un solo día usa vista antigua",calendarioInformativo({...base,
 fechas:[date("a1","2026-11-06"),date("a2","2026-11-06")]}).disponible,false);
yes("Acceso sin fecha bloqueado",calendarioInformativo({...base,
 fechas:[base.fechas[0]]}).razon,"faltan_fechas_verificadas");
yes("Cobertura sin verificar no autoriza detalles",calendarioInformativo({...base,
 fechas:[base.fechas[0],date("a2","2026-11-30",4900,"borrador")]}).disponible,false);
yes("Tarifa desactualizada",calendarioInformativo({...base,
 fechas:[date("a1","2026-11-06",5500),date("a2","2026-11-30",4900)]}).razon,"revisar_precios");
yes("Acceso duplicado no se muestra",calendarioInformativo({...base,accesos:[a1,a1]}).disponible,false);
yes("Fecha inválida se rechaza",calendarioInformativo({...base,
 fechas:[date("a1","2026-02-30"),base.fechas[1]]}).disponible,false);
yes("Sin accesos no se muestra",calendarioInformativo({...base,accesos:[]}).disponible,false);
yes("Contrato con un acceso faltante no muestra parcial",calendarioInformativo({
 contratos:[contract,{id:"extra",nombre:"Prime Video",monto:45}],
 accesos:[a1,a2],fechas:base.fechas}).disponible,false);
yes("Sin servicios no muestra calendario",calendarioInformativo({}).disponible,false);
yes("Dos contratos independientes",calendarioInformativo({
 contratos:[{id:"one",nombre:"Netflix",monto:109},{id:"two",nombre:"ViX",monto:49}],
 accesos:[{id:"1",cliente_servicio_id:"one",ordinal:1},{id:"2",cliente_servicio_id:"two",ordinal:1}],
 fechas:[
  {...date("1","2026-11-15",10900),cliente_servicio_id:"one"},
  {...date("2","2026-11-28",4900),cliente_servicio_id:"two"}
 ]
}).fechas.length,2);
const edge=readFileSync("docs/edge/estado-financiero/index.ts","utf8");
const start=edge.indexOf('if(accion==="mi_calendario")');
const admin=edge.indexOf('const admin=await verify(',start);
assert(start>0&&admin>start,"La consulta cliente se valida antes de administrar");
const block=edge.slice(start,admin);
assert(block.includes('verify(req.headers.get("X-Client-Token")') &&
 block.includes('"goxion_client"') &&
 block.includes("exigirClienteActivo(sb,clientId)"),"Solo sesión válida de cliente activo");
assert(block.includes('.eq("cliente_id",clientId)'),"Filtro de acceso propietario del cliente");
assert(!block.includes("datos?.cliente_id"),"No aceptar cliente arbitrario de URL");
assert(!block.includes("goxion_estado_financiero"),"No mezclar importes con fechas informativas");
assert(!/insert\(|update\(|delete\(|upsert\(/.test(block),"Solo lecturas");
assert(edge.includes('if(accion==="mi_estado")'),"Preservar flujo oficial");
cases+=8;
console.log("GOXION calendario cliente informativo: "+cases+" pruebas PASS, sin cobros ni exposición de otra cuenta");
