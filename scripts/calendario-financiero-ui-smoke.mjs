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
function setup(token){
 const nodes={},calls=[];
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
   const result=data.accion==="listar_calendarios_beta"?{ok:true,clientes:clients}:
    data.accion==="simular_calendario_beta"?{ok:true,cliente:clients[0],
      calendario:simularCalendario({cliente:clients[0],servicios:services,financiero:financial,
        propuesta:data.datos.propuesta,hoy:"2026-10-11"})}:
    {ok:false,error:"Acción inesperada"};
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
assert(x.nodes.unify.innerHTML.includes('value="1"')&&x.nodes.unify.innerHTML.includes('value="31"'),
 "La unificación ofrece todos los días 1 a 31");
x.nodes.client.value="example";
x.nodes.client.events.change.call(x.nodes.client);await flush();
assert.equal(x.calls.at(-1).accion,"simular_calendario_beta");
assert(x.nodes.groups.innerHTML.includes("15 nov"),"Heredar el día 15 sin modificaciones");
assert(x.nodes.services.innerHTML.includes("Cambiar fecha"),"Mostrar edición simple por perfil");
assert(x.nodes.services.innerHTML.includes('Día 1')===false,"El editor avanzado permanece oculto hasta abrir");
x.modes[1].events.click();await flush();
assert.equal(x.calls.at(-1).datos.propuesta.pago.modo,"todos");
assert.equal(x.nodes.total.textContent,"$210.00");
function change(id,field,value,type="select-one"){
 const target={dataset:{field},type,value,checked:value===true,
  closest(selector){return selector==="[data-id]"?{dataset:{id}}:null}};
 x.nodes.services.events.change({target});
}
change("netflix","dia_de_renovacion","5");
await flush();
assert(x.nodes.services.innerHTML.includes("5 nov"),"Día 5 calcula próxima renovación automáticamente");
assert.equal(x.calls.at(-1).datos.propuesta.servicios.netflix.cobertura_hasta,"2026-11-05");
change("disney","cobertura_hasta","2026-11-20","date");await flush();
assert.equal(x.calls.at(-1).datos.propuesta.servicios.disney.dia_original,20);
assert(x.nodes.groups.innerHTML.includes("20 nov"),"Dos fechas distintas se reflejan");
x.nodes.unify.value="1";x.nodes.unify.events.change();await flush();
assert.equal(x.calls.at(-1).datos.propuesta.unificar_dia,1,"El día 1 está disponible");
assert(x.calls.every(c=>["listar_calendarios_beta","simular_calendario_beta"].includes(c.accion)),
 "Ninguna acción registra pagos");
console.log("GOXION calendario intuitivo: auth, día 1–31, edición por perfil, pago único/conjunto y cero escrituras PASS.");
