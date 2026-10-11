import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const page=readFileSync("comunicaciones.html","utf8");
const admin=readFileSync("admin.html","utf8");
const edge=readFileSync("docs/edge/comunicaciones-admin-preview.ts","utf8");
const js=page.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,"Falta el controlador oficial");
new vm.Script(js);
assert(admin.includes("window.location.href='./comunicaciones.html'"),"No hay acceso desde Gestión");
assert(edge.includes('body.accion==="programar"')&&edge.includes('body.accion==="enviar"'),"Faltan acciones de backend");
assert(edge.includes('body.accion==="cancelar_programada"'),"Falta cancelación de programaciones");
const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,"IDs repetidos");
const makeClient=(id)=>({id,nombre:"Ana",misiones_total:4,misiones_hechas:1,misiones_pendientes:3,
 cobro_oficial:true,cobro_pagado:false,dias_para_cobro:3,notificaciones_previas:[]});
const UUID="11111111-1111-4111-8111-111111111111";
const fixture={ok:true,clientes:[makeClient(UUID)],promociones:[],automatismos:[]};
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
function create({token="simulated-token",confirm=true}={}){
 const nodes={};let confirms=0;const fetchActions=[];
 for(const id of ids){
  const classes=new Set(["hidden"]);
  nodes[id]={id,value:"",innerHTML:"",textContent:"",disabled:false,open:false,events:{},dataset:{},
   classList:{add(k){classes.add(k)},remove(k){classes.delete(k)},contains(k){return classes.has(k)},toggle(k,v){const on=v??!classes.has(k);if(on)classes.add(k);else classes.delete(k)}},
   addEventListener(ev,fn){this.events[ev]=fn},setAttribute(k,v){this[k]=v}
  };
 }
 const choices=["missions","pay","promo","general"].map(kind=>({dataset:{kind},setAttribute(){},addEventListener(ev,fn){this[ev]=fn}}));
 const api=async(url,options)=>{
  const request=JSON.parse(options.body);fetchActions.push(request);
  const action=request.accion;
  const reply=action==="resumen"?fixture:action==="validar_plan"
    ?{ok:true,id_campana:request.plan.id_campana,tipo:request.plan.tipo,elegibles:1,omitidos:[],seleccionados:[{id:UUID,nombre:"Ana"}]}
    :action==="enviar"?{ok:true,resultado:{creados:1,omitidos:0,repetido:false}}
    :action==="programar"?{ok:true,programada:{id:request.plan.id_campana,estado:"programada"}}
    :action==="historial"?{ok:true,campanas:[]}
    :action==="cancelar_programada"?{ok:true,cancelada:request.id}:{ok:false,error:"Acción desconocida"};
  return{ok:reply.ok,status:reply.ok?200:400,json:async()=>reply};
 };
 const context={
  document:{getElementById(id){assert(nodes[id], "Elemento faltante "+id);return nodes[id]},
  querySelectorAll(selector){return selector==="[data-kind]"?choices:[]}},
  localStorage:{getItem(k){return k==="GOXION_ADMIN_TOKEN"?token:null}},
  fetch:api,crypto:{randomUUID:()=> "99999999-9999-4999-8999-999999999999"},
  window:{confirm:()=>{confirms++;return confirm;}}
 };
 vm.runInNewContext(js,context,{timeout:2000});
 return {nodes,fetchActions,get confirms(){return confirms},choose(kind){choices.find(x=>x.dataset.kind===kind).click()}};
}
{
 const h=create({token:""});await flush();
 assert.equal(h.fetchActions.length,0,"No acceder sin sesión");
 assert.equal(h.nodes.auth.classList.contains("hidden"),false);
}
{
 const h=create({confirm:false});await flush();
 await h.nodes.send.events.click();await flush();
 assert.deepEqual(h.fetchActions.map(x=>x.accion),["resumen","validar_plan"],"Cancelar no puede enviar");
 assert.equal(h.confirms,1);
}
{
 const h=create();await flush();
 await h.nodes.send.events.click();await flush();
 assert.deepEqual(h.fetchActions.map(x=>x.accion),["resumen","validar_plan","enviar","historial"],"La confirmación prepara y envía una sola vez");
 assert.equal(h.fetchActions[2].confirmacion_cantidad,1);
 assert.equal(h.fetchActions[2].plan.id_campana,h.fetchActions[1].plan.id_campana);
 assert(h.nodes.deliveryStatus.textContent.includes("1 avisos nuevos"),"Mostrar éxito");
 await h.nodes.send.events.click();await flush();
 assert.equal(h.fetchActions.filter(x=>x.accion==="enviar").length,1,"No hay doble clic");
}
{
 const h=create();await flush();
 const future=new Date(Date.now()+3*86400000-6*3600000).toISOString().slice(0,16);
 h.nodes.scheduleAt.value=future;
 h.nodes.scheduleAt.events.change();
 await h.nodes.send.events.click();await flush();
 const actions=h.fetchActions.map(x=>x.accion);
 assert.deepEqual(actions,["resumen","validar_plan","programar","historial"],"Programar jamás envía inmediatamente");
 assert(h.fetchActions[2].programada_at.endsWith("Z"),"Fecha normalizada UTC");
 assert(h.nodes.deliveryStatus.textContent.includes("Programación registrada"));
}
console.log("GOXION Comunicaciones oficial · pruebas de autenticación, confirmación, envío único y programación OK");
