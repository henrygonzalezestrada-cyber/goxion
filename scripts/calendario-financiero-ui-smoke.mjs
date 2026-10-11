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
assert(!/\.insert\(|\.update\(|\.delete\(|\.upsert\(/.test(edge),"Esta beta debe ser de solo lectura");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"No repetir IDs");
const clients=[{id:"example",nombre:"Cliente ficticio",numero_servicios:2,dia_pago:15,estado:"pendiente"}];
const services=[{id:"netflix",nombre:"Netflix",monto:120,activo:true},
 {id:"disney",nombre:"Disney",monto:90,activo:true}];
const financial={fecha_corte:"2026-11-15",periodo:"2026-11-01",total_actual:210,promociones:{total_ahorro:0}};
async function flush(){for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));}
function setup(token){
 const nodes={},calls=[];
 for(const id of ids){
  const flags=new Set(["hidden"]);
  nodes[id]={id,value:"",textContent:"",innerHTML:"",disabled:false,events:{},
   classList:{add(x){flags.add(x)},remove(x){flags.delete(x)},toggle(x,enable){if(enable??!flags.has(x))flags.add(x);else flags.delete(x)},contains(x){return flags.has(x)}},
   addEventListener(x,fn){this.events[x]=fn},querySelectorAll(){return[]}
  };
 }
 const opts=["proximo","todos","elegidos"].map(mode=>({dataset:{pay:mode},setAttribute(k,v){this[k]=v},addEventListener(k,fn){this[k]=fn}}));
 const fetch=async(url,opts)=>{
   const req=JSON.parse(opts.body);calls.push(req);
   const obj=req.accion==="listar_calendarios_beta"?{ok:true,clientes:clients}:
     req.accion==="simular_calendario_beta"?{
       ok:true,cliente:clients[0],
       calendario:simularCalendario({cliente:clients[0],servicios,financiero:financial,
         propuesta:req.datos.propuesta,hoy:"2026-10-11"})
     }:{ok:false,error:"Acción inesperada"};
   return {ok:obj.ok,status:obj.ok?200:400,json:async()=>obj};
 };
 vm.runInNewContext(js,{
  document:{getElementById(id){assert(nodes[id],"Falta elemento "+id);return nodes[id]},
    querySelectorAll(s){return s==="[data-pay]"?opts:[]}},
  localStorage:{getItem(k){return k==="GOXION_ADMIN_TOKEN"?token:null}},fetch
 },{timeout:1000});
 return {nodes,calls,opts};
}
const no=setup("");
await flush();assert.equal(no.calls.length,0,"El token debe proteger acceso a clientes");
assert.equal(no.nodes.auth.classList.contains("hidden"),false);
const x=setup("fake-admin-token");await flush();
assert.equal(x.calls.length,1,"Solo catálogo autorizado en arranque");
assert.equal(x.calls[0].accion,"listar_calendarios_beta");
assert.equal(x.nodes.workspace.classList.contains("hidden"),false);
x.nodes.client.value="example";
x.nodes.client.events.change.call(x.nodes.client);await flush();
assert.equal(x.calls.at(-1).accion,"simular_calendario_beta");
assert(x.nodes.groups.innerHTML.includes("2026-11-15"),"El cliente heredado conserva su día 15");
x.opts[1].click();await flush();
assert.equal(x.calls.at(-1).datos.propuesta.pago.modo,"todos");
assert.equal(x.nodes.total.textContent,"$210.00");
const opts=x.nodes.services.events.change;
opts({target:{dataset:{field:"cobertura_hasta"},type:"date",value:"2026-11-05",
  closest(){return{dataset:{id:"netflix"}}}}});
await flush();
assert(x.nodes.groups.innerHTML.includes("2026-11-05"));
assert(x.calls.every(c=>["listar_calendarios_beta","simular_calendario_beta"].includes(c.accion)),
 "No hay envíos ni aprobación de pagos");
console.log("GOXION beta de calendario UI: acceso, cliente, calendario, pago conjunto y cobertura sin escrituras OK");
