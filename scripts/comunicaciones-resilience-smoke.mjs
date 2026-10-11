import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

// No auth keys, sessions or real customer records are needed.
const html=readFileSync('preview/comunicaciones/index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,'Inline app missing');
new vm.Script(js);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);

const person=(id,options={})=>({
 id,nombre:options.nombre||'Cliente '+id,misiones_total:2,misiones_hechas:1,misiones_pendientes:1,
 cobro_oficial:true,cobro_pagado:false,dias_para_cobro:4,notificaciones_previas:[],...options
});
const packageData=(clients,more={})=>({
 ok:true,clientes:clients,promociones:[{id:'promo1',nombre:'Promo',titulo_publico:'Promo 99'}],
 automatismos:[{nombre:'Pago acreditado',owner:'Finanzas',estado:'activo'}],...more
});
const sleep=()=>new Promise(r=>setImmediate(r));
async function settle(){for(let i=0;i<12;i++)await sleep();}
function create({token='mock-token',fetcher=async()=>({ok:true,status:200,json:async()=>packageData([person('a')])})}={}){
 let currentToken=token;
 const el={};for(const id of ids){
   const flags=new Set(['hidden']);
   el[id]={id,value:'',textContent:'',innerHTML:'',disabled:false,open:false,handlers:{},
    classList:{add(k){flags.add(k)},remove(k){flags.delete(k)},contains(k){return flags.has(k)},toggle(k,on){if(on??!flags.has(k))flags.add(k);else flags.delete(k)}},
    addEventListener(ev,fn){this.handlers[ev]=fn},setAttribute(k,v){this[k]=v}
   };
 }
 const choices=['missions','pay','promo','general'].map(kind=>({dataset:{kind},setAttribute(k,v){this[k]=v},addEventListener(ev,fn){this[ev]=fn}}));
 let calls=0;
 vm.runInNewContext(js,{
  document:{getElementById(id){assert(el[id],'Element missing: '+id);return el[id]},querySelectorAll(q){return q==='[data-kind]'?choices:[]}},
  localStorage:{getItem(k){return k==='GOXION_ADMIN_TOKEN'?currentToken:null}},
  fetch:async(...args)=>{calls++;return fetcher(...args)}
 },{timeout:2500});
 const click=(id)=>el[id].handlers.click();
 const select=(k)=>choices.find(x=>x.dataset.kind===k).click();
 const change=(id,value)=>{el[id].value=value;el[id].handlers.change?.()};
 const input=(id,value)=>{el[id].value=value;el[id].handlers.input?.()};
 const recipient=(type,id)=>{
  const node=el[type==='add'?'available':'people'];
  node.handlers.click({target:{closest(selector){return selector==='[data-recipient-'+type+']'?{disabled:false,getAttribute(){return id}}:null}}});
 };
 return {el,click,select,change,input,recipient,setToken(x){currentToken=x},get calls(){return calls}};
}

// Caso 1: sin clientes / cero promociones, todo debe tener cero destinatarios.
{
 const h=create({fetcher:async()=>({ok:true,status:200,json:async()=>packageData([],{promociones:[]})})});
 await settle();
 for(const kind of ['missions','pay','promo','general']){h.select(kind);assert.equal(h.el.audienceCount.textContent,'0','Audiencia vacía en '+kind);}
 assert(!h.el.people.innerHTML.includes('<script>'),'No injection in zero results');
}

// Caso 2: nombres duplicados identificados por UUID + XSS escapado en listas.
{
 const people=[person('a',{nombre:'Jorge <img src=x onerror=alert(1)>'}),person('b',{nombre:'Jorge <img src=x onerror=alert(1)>'})];
 const h=create({fetcher:async()=>({ok:true,status:200,json:async()=>packageData(people)})});await settle();
 assert.equal(h.el.audienceCount.textContent,'2');
 assert(!h.el.people.innerHTML.includes('<img'),'Names must be HTML escaped');
 assert(h.el.people.innerHTML.includes('&lt;img'),'HTML characters displayed safely');
 h.recipient('remove','a');
 assert.equal(h.el.audienceCount.textContent,'1','UUID removal only affects selected id');
 h.input('recipientSearch','JORGE');
 assert(h.el.available.innerHTML.includes('data-recipient-add="a"'));
}

// Caso 3: sin pagos previos, fechas desconocidas y pagados no deben aparecer en cobros.
{
 const people=[person('a',{dias_para_cobro:3}),person('b',{cobro_oficial:false,dias_para_cobro:null}),
  person('c',{cobro_pagado:true,dias_para_cobro:0}),person('d',{dias_para_cobro:-1}),person('e',{dias_para_cobro:12})];
 const h=create({fetcher:async()=>({ok:true,status:200,json:async()=>packageData(people)})});await settle();h.select('pay');
 assert.equal(h.el.audienceCount.textContent,'1');
 h.recipient('add','b');h.recipient('add','c');h.recipient('add','d');
 assert.equal(h.el.audienceCount.textContent,'1','No se pueden forzar clientes no elegibles');
 h.recipient('add','e');
 assert.equal(h.el.audienceCount.textContent,'2','Se permite fecha futura verificada >7 días');
}

// Caso 4: escalabilidad visual de 1,200 clientes sin daño de selección.
{
 const people=Array.from({length:1200},(_,i)=>person('id'+i,{nombre:'Cliente '+i}));
 const h=create({fetcher:async()=>({ok:true,status:200,json:async()=>packageData(people)})});await settle();
 assert.equal(h.el.audienceCount.textContent,'1200');
 h.recipient('remove','id0');
 assert.equal(h.el.audienceCount.textContent,'1199');
}

// Caso 5: caduca token después de haber mostrado información.
// Por seguridad no debe seguir exponiendo lista o una vista operable.
{
 const h=create();await settle();assert.equal(h.el.workspace.classList.contains('hidden'),false);
 h.setToken('');
 h.click('refresh');await settle();
 assert.equal(h.el.auth.classList.contains('hidden'),false,'Pantalla de inicio de sesión visible');
 assert.equal(h.el.workspace.classList.contains('hidden'),true,'No debe quedar visible el roster sin sesión');
}

// Caso 6: API responde 401 después de la primera carga.
{
 let step=0;const h=create({fetcher:async()=>{step++;return step===1
   ?{ok:true,status:200,json:async()=>packageData([person('a')])}
   :{ok:false,status:401,json:async()=>({ok:false,error:'Sesión caducada'})}}});
 await settle();h.click('refresh');await settle();
 assert.equal(h.el.workspace.classList.contains('hidden'),true,'No mostrar datos después del 401');
 assert.equal(h.el.auth.classList.contains('hidden'),false,'Debe pedir nuevo login al perder autorización');
}

// Caso 7: falla red y carga antigua no debe presentarse como fresca.
{
 let step=0;
 const h=create({fetcher:async()=>{if(++step===1)return{ok:true,status:200,json:async()=>packageData([person('a')])};throw Error('Desconectado')}});
 await settle();h.click('refresh');await settle();
 assert.equal(h.el.workspace.classList.contains('hidden'),true,'No permitir preview desactualizada tras error');
 assert(h.el.error.textContent.includes('Desconectado'),'Se debe comunicar error de red');
}

// Caso 8: dos refresh en distinto orden, última petición iniciada es la que vale.
{
 const deferred=[];let step=0;
 const h=create({fetcher:async()=>{step++;if(step===1)return{ok:true,status:200,json:async()=>packageData([person('a')])};
  return await new Promise(resolve=>deferred.push(resolve));}});
 await settle();h.click('refresh');h.click('refresh');
 assert.equal(deferred.length,2);
 deferred[1]({ok:true,status:200,json:async()=>packageData([person('a'),person('b')])});
 await settle();
 assert.equal(h.el.audienceCount.textContent,'2');
 deferred[0]({ok:true,status:200,json:async()=>packageData([person('a')])});
 await settle();
 assert.equal(h.el.audienceCount.textContent,'2','Una respuesta anterior no debe pisar la más reciente');
}

// Caso 9: si expira la promoción después de seleccionarla, nunca debe aceptar ID inexistente.
{
 let state=packageData([person('a')]);
 const h=create({fetcher:async()=>({ok:true,status:200,json:async()=>state})});await settle();
 h.select('promo');h.change('promotion','promo1');
 assert.equal(h.el.audienceCount.textContent,'1');
 state=packageData([person('a')],{promociones:[]});
 h.click('refresh');await settle();
 assert.equal(h.el.audienceCount.textContent,'0','Promoción expirada no genera audiencia');
}

// Caso 10: formato y valores hostiles no escriben en backend, única acción resumen.
{
 const calls=[];
 const h=create({fetcher:async(u,o)=>{calls.push(JSON.parse(o.body));return{ok:true,status:200,json:async()=>packageData([person('a')])}}});await settle();
 h.select('general');h.input('titleInput','<script>alert("test")</script>');
 assert.equal(h.el.previewTitle.textContent,'<script>alert("test")</script>','Se escribe solo en textContent');
 assert.equal(calls.length,1);assert.equal(calls[0].accion,'resumen');
}
console.log('Comunicaciones stress · 10 escenarios críticos comprobados.');
