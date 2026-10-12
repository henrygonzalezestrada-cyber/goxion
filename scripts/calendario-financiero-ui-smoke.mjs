import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import {simularCalendario} from "../docs/edge/estado-financiero/calendario-beta.mjs";

const html=readFileSync("preview/calendario-financiero/index.html","utf8");
const edge=readFileSync("docs/edge/estado-financiero/index.ts","utf8");
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,"Falta controlador de beta");
new vm.Script(js);
assert(edge.includes('accion==="simular_calendario_beta"'));
assert(edge.includes('accion==="listar_calendarios_beta"'));
assert(edge.includes('accion==="guardar_calendario_beta"'));
assert(edge.includes('const admin=await verify('),"Las escrituras requieren autenticación Admin");
assert(!/\.(insert|update|upsert|delete)\(/.test(edge),"La beta debe seguir sin escrituras");
assert(!html.includes("<h2>1.")&&!html.includes("<h2>2.")&&!html.includes("<h2>3."),"Sin asistente por pasos");
assert(!html.includes("data-field=\"nuevo_dia\""),"No se muestran términos antiguos");
const ids=[...html.matchAll(/(?:^|[\s])id="([^"]+)"/gm)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"IDs repetidos");
const clients=[{id:"example",nombre:"Cliente ficticio",numero_servicios:2,dia_pago:15,estado:"pendiente"}];
const services=[{id:"netflix",nombre:"Netflix",monto:120,activo:true},
 {id:"disney",nombre:"Disney+",monto:90,activo:true}];
const financial={fecha_corte:"2026-11-15",periodo:"2026-11-01",total_actual:210,promociones:{total_ahorro:0}};
async function flush(){for(let i=0;i<12;i++)await new Promise(r=>setImmediate(r))}
function setup(token,clientServices=services,clientFinance=financial,accesses={}){
 const nodes={},calls=[],persisted={};
 const inverse=Object.fromEntries(Object.entries(accesses).map(([k,v])=>[v,k]));
 const events={};
 for(const id of ids){
   const flags=new Set(["hidden"]);
   nodes[id]={
     id,value:"",textContent:"",innerHTML:"",disabled:false,open:false,events:{},
     classList:{add(x){flags.add(x)},remove(x){flags.delete(x)},toggle(x,yes){if(yes??!flags.has(x))flags.add(x);else flags.delete(x)},contains(x){return flags.has(x)}},
     addEventListener(name,fn){this.events[name]=fn},
     querySelectorAll(){return[]}
   };
 }
 const modes=["proximo","todos","elegidos"].map(pay=>({dataset:{pay},events:{},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this.events[k]=fn}}));
 const fetch=async(_,options)=>{
   const data=JSON.parse(options.body);calls.push(data);
   let result;
   if(data.accion==="listar_calendarios_beta")result={ok:true,clientes:clients};
   else if(data.accion==="simular_calendario_beta"){
     const proposal=data.datos.propuesta||{};
     const combined={...persisted,...(proposal.servicios||{})};
     for(const [k,cfg] of Object.entries(proposal.servicios||{})){
       if(cfg?.usar_general===true)delete combined[k];
     }
     result={ok:true,cliente:clients[0],persistencia:{accesos:accesses},
       calendario:simularCalendario({cliente:clients[0],servicios:clientServices,financiero:clientFinance,
        propuesta:{...proposal,servicios:combined},hoy:"2026-10-11"})};
   }else if(data.accion==="guardar_calendario_beta"){
     for(const item of data.datos.unidades){
       const id=inverse[item.acceso_id];
       if(!id)throw Error("Acceso no encontrado en contrato");
       persisted[id]={cobertura_hasta:item.cobertura_hasta,dia_original:item.dia_corte,
         precio_centavos:item.precio_centavos,cobertura_confirmada:item.confirmado};
     }
     result={ok:true,guardado:{accesos_guardados:data.datos.unidades.length}};
   }else result={ok:false,error:"Acción inesperada"};
   return{ok:result.ok,status:result.ok?200:400,json:async()=>result};
 };
 const classNames=new Set();
 const document={getElementById(id){assert(nodes[id],"Falta elemento "+id);return nodes[id]},
   querySelectorAll(query){return query==="[data-pay]"?modes:[]},
   documentElement:{classList:{add(name){classNames.add(name)}}}
 };
 vm.runInNewContext(js,{document,localStorage:{getItem(k){return k==="GOXION_ADMIN_TOKEN"?token:null}},fetch},{timeout:1100});
 return {nodes,modes,calls};
}
const no=setup("");await flush();
assert.equal(no.calls.length,0,"Sin token no consultar datos");
assert.equal(no.nodes.auth.classList.contains("hidden"),false);
const x=setup("simulated-token");await flush();
assert.equal(x.calls[0].accion,"listar_calendarios_beta");
assert.equal(x.nodes.workspace.classList.contains("hidden"),false);
assert(html.includes('type="date" id="unify"'),"La unificación usa calendario nativo");
x.nodes.client.value="example";
x.nodes.client.events.change.call(x.nodes.client);await flush();
assert.equal(x.calls.at(-1).accion,"simular_calendario_beta");
assert(x.nodes.groups.innerHTML.includes("15 nov"),"Heredar el día 15 sin modificaciones");

assert(x.nodes.services.innerHTML.includes("Fechas ›"),"Un acceso compacto por contratación");
assert(!x.nodes.services.innerHTML.includes('class="access-row"'),"Los controles permanecen fuera de la lista");
assert.equal((x.nodes.services.innerHTML.match(/class="contract-row"/g)||[]).length,2);
x.nodes.services.events.click({target:{closest(selector){
 if(selector==="[data-manage]")return {getAttribute:()=> "netflix"};
 return null;
}}});
assert(x.nodes.services.innerHTML.includes('class="access-row"'),"Abrir detalle del contrato");
assert(x.nodes.services.innerHTML.includes('type="date"'),"Seleccionar vencimiento directamente con calendario");
assert(!x.nodes.services.innerHTML.includes("Renueva cada día"),"No mostrar selector de día manual");
assert.equal((x.nodes.services.innerHTML.match(/class="access-row"/g)||[]).length,1);
x.modes[1].events.click();await flush();
assert.equal(x.calls.at(-1).datos.propuesta.pago.modo,"todos");
assert.equal(x.nodes.total.textContent,"$210.00");
function change(id,field,value,type="date"){
 const target={dataset:{field},type,value,checked:value===true,
  closest(selector){return selector==="[data-id]"?{dataset:{id}}:null}};
 x.nodes.services.events.change({target});
}
change("netflix","cobertura_hasta","2026-11-05");await flush();
assert.equal(x.calls.at(-1).datos.propuesta.servicios.netflix.dia_original,5,"Deduce día 5 de la fecha elegida");
assert.equal(x.calls.at(-1).datos.propuesta.servicios.netflix.cobertura_hasta,"2026-11-05");
change("disney","cobertura_hasta","2026-11-20");await flush();
assert.equal(x.calls.at(-1).datos.propuesta.servicios.disney.dia_original,20);
assert(x.nodes.groups.innerHTML.includes("20 nov"),"Dos fechas distintas se reflejan");
x.nodes.services.events.click({target:{closest(selector){if(selector==="[data-back]")return {};return null;}}});
assert.equal((x.nodes.services.innerHTML.match(/class="contract-row"/g)||[]).length,2,"Volver a servicios compactos");
x.nodes.unify.value="2026-11-01";x.nodes.unify.events.change.call(x.nodes.unify);await flush();
assert.equal(x.nodes.unifyDateValue.textContent,"1 nov 2026","Unificación refleja fecha elegida");
assert.equal(x.calls.at(-1).datos.propuesta.unificar_dia,1,"El calendario permite día 1");
x.nodes.unify.value="2026-11-31";x.nodes.unify.events.change.call(x.nodes.unify);await flush();
assert.equal(x.calls.at(-1).datos.propuesta.unificar_dia,31,"El cálculo maneja ancla día 31");
assert(x.calls.every(c=>["listar_calendarios_beta","simular_calendario_beta"].includes(c.accion)),
 "Ninguna acción registra pagos");

const x2=setup("simulated-token",[
 {id:"x2",nombre:"ViX Premium (x2)",monto:98,activo:true},
 {id:"extra",nombre:"Crunchyroll",monto:100,activo:true}
],{...financial,total_actual:198},{"x2#1":"access-one","x2#2":"access-two","extra":"access-extra"});
await flush();
x2.nodes.client.value="example";
x2.nodes.client.events.change.call(x2.nodes.client);await flush();
assert.equal((x2.nodes.services.innerHTML.match(/class="contract-row"/g)||[]).length,2,
 "Un X2 y un servicio suelto ocupan dos filas, no tres");
assert(x2.nodes.services.innerHTML.includes("ViX Premium (x2)"));
assert(x2.nodes.services.innerHTML.includes("$98.00"));
x2.nodes.services.events.click({target:{closest(selector){
 if(selector==="[data-manage]")return {getAttribute:()=>"x2"};
 return null;
}}});
assert.equal((x2.nodes.services.innerHTML.match(/class="access-row"/g)||[]).length,2,
 "El X2 despliega solo dos líneas de fechas en el detalle");
assert(x2.nodes.services.innerHTML.includes("Acceso 1"));
assert(x2.nodes.services.innerHTML.includes("Acceso 2"));
assert(x2.nodes.services.innerHTML.includes("type=\"date\""));
const changeX2=(id,date)=>{
 x2.nodes.services.events.change({target:{
   dataset:{field:"cobertura_hasta"},type:"date",value:date,
   closest(selector){return selector==="[data-id]"?{dataset:{id}}:null}
 }});
};
changeX2("x2#1","2026-11-06");await flush();
changeX2("x2#2","2026-11-30");await flush();
const cfg=x2.calls.at(-1).datos.propuesta.servicios;
assert.equal(cfg["x2#1"].cobertura_hasta,"2026-11-06");
assert.equal(cfg["x2#2"].cobertura_hasta,"2026-11-30");
assert.equal(x2.nodes.total.textContent,"$49.00","Solo el primer acceso X2 vence primero");
x2.nodes.services.events.click({target:{closest(selector){
 return selector==="[data-back]"?{}:null;
}}});
assert.equal((x2.nodes.services.innerHTML.match(/class="contract-row"/g)||[]).length,2);
assert(x2.nodes.services.innerHTML.includes("6 nov")&&x2.nodes.services.innerHTML.includes("30 nov"),
 "Resumen compacto conserva ambas fechas sin duplicar contratación");
x2.modes[1].events.click();await flush();
assert.equal(x2.nodes.total.textContent,"$198.00","Pagar todo suma X2 completo y otro servicio");
assert(x2.calls.every(c=>["listar_calendarios_beta","simular_calendario_beta"].includes(c.accion)));
x2.nodes.services.events.click({target:{closest(sel){
 return sel==="[data-manage]"?{getAttribute:()=>"x2"}:null;
}}});
assert(x2.nodes.services.innerHTML.includes("Guardar fechas"),"Acceso real ofrece guardado");
x2.nodes.services.events.click({target:{closest(sel){
 return sel==="[data-save]"?{getAttribute:()=>"x2"}:null;
}}});
await flush();
const saved=x2.calls.find(c=>c.accion==="guardar_calendario_beta");
assert(saved,"Se envía un solo guardado explícito de contrato");
assert.equal(saved.datos.contrato_id,"x2");
assert.equal(saved.datos.unidades.length,2);
assert.equal(saved.datos.unidades.reduce((n,i)=>n+i.precio_centavos,0),9800);
assert.deepEqual(saved.datos.unidades.map(x=>x.cobertura_hasta),["2026-11-06","2026-11-30"],
 "Fechas guardadas individualmente por acceso real");
assert(x2.nodes.services.innerHTML.includes("Fechas guardadas en Admin"),"Confirmar guardado sin cobrar");
x2.nodes.reset.events.click();await flush();
assert(x2.nodes.services.innerHTML.includes("6 nov")&&x2.nodes.services.innerHTML.includes("30 nov"),
 "El servidor conserva fechas tras resetear el simulador");
x2.nodes.services.events.click({target:{closest(sel){
 return sel==="[data-manage]"?{getAttribute:()=>"x2"}:null;
}}});
x2.nodes.services.events.click({target:{closest(sel){
 return sel==="[data-use-default]"?{getAttribute:()=>"x2#1"}:null;
}}});
await flush();
assert.equal(x2.calls.at(-1).datos.propuesta.servicios["x2#1"].usar_general,true,
 "Usar fecha general omite calendario persistido en el cálculo");
assert(x2.nodes.services.innerHTML.includes("15 nov"),"Se recupera la fecha general sin perder el otro acceso");
assert(!x2.calls.some(c=>c.accion==="aprobar_pago"||c.accion==="registrar_pago"),
 "El guardado no ejecuta acciones de cobro");


console.log("GOXION calendario: X2 compacto, fechas persistidas con token Admin y sin cargos PASS.");
