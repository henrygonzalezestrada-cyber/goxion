import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const html=readFileSync('preview/comunicaciones/index.html','utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(js,'La beta necesita script');
new vm.Script(js);
assert(/id="send"[^>]*disabled|disabled[^>]*id="send"/.test(html),'El envío real debe estar deshabilitado');
assert(!html.includes('data-preset="outage"'),'Las incidencias se gestionan en su módulo');
assert(!html.includes('data-preset="offer"'),'Los descuentos se gestionan en Studio');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
assert.equal(new Set(ids).size,ids.length,'Sin IDs duplicados');
for(const kind of ['missions','pay','promo','general']) assert(html.includes('data-kind="'+kind+'"'),'Motivo faltante: '+kind);

const fixture={
 ok:true,fecha_local:'2026-10-10',clientes:[
 {id:'a',nombre:'Ana',misiones_total:3,misiones_hechas:1,misiones_pendientes:2,cobro_oficial:true,cobro_pagado:false,dias_para_cobro:2,notificaciones_previas:[{tipo:'mision_recordatorio'}]},
 {id:'b',nombre:'Beto',misiones_total:3,misiones_hechas:3,misiones_pendientes:0,cobro_oficial:true,cobro_pagado:true,dias_para_cobro:null,notificaciones_previas:[]},
 {id:'c',nombre:'Caro',misiones_total:2,misiones_hechas:1,misiones_pendientes:1,cobro_oficial:false,cobro_pagado:false,dias_para_cobro:null,notificaciones_previas:[]},
 {id:'d',nombre:'Dórá',misiones_total:0,misiones_hechas:0,misiones_pendientes:0,cobro_oficial:true,cobro_pagado:false,dias_para_cobro:18,notificaciones_previas:[]}
 ],promociones:[{id:'p',nombre:'Oferta',titulo_publico:'Tres meses por $99'}],
 automatismos:[{nombre:'Pago acreditado',owner:'Finanzas',estado:'activo'},{nombre:'Recordatorio futuro',owner:'Misiones',estado:'simulacion'}]
};
function harness(token){
 const nodes={};
 for(const id of ids){
  const classes=new Set(['hidden']);
  nodes[id]={id,value:'',textContent:'',innerHTML:'',checked:false,disabled:false,open:false,events:{},dataset:{},
   classList:{add(k){classes.add(k)},remove(k){classes.delete(k)},toggle(k,x){const v=x??!classes.has(k);if(v)classes.add(k);else classes.delete(k)},contains(k){return classes.has(k)}},
   addEventListener(k,fn){this.events[k]=fn},setAttribute(k,v){this[k]=v}
  };
 }
 const choices=['missions','pay','promo','general'].map(kind=>({dataset:{kind},setAttribute(key,v){this[key]=v},events:{},addEventListener(k,fn){this.events[k]=fn}}));
 const calls=[];
 const context={document:{
  getElementById(id){assert(nodes[id],'Falta '+id);return nodes[id]},
  querySelectorAll(sel){return sel==='[data-kind]'?choices:[]}
 },localStorage:{getItem(key){return key==='GOXION_ADMIN_TOKEN'?token:null}},
 fetch:async(url,opts)=>{calls.push({url,opts});return{ok:true,status:200,json:async()=>fixture}}};
 vm.runInNewContext(js,context,{timeout:1000});
 return{nodes,choices,calls,choice(k){choices.find(x=>x.dataset.kind===k).events.click()},change(id,v){nodes[id].value=v;nodes[id].events.change()},input(id,v){nodes[id].value=v;nodes[id].events.input()},click(id){nodes[id].events.click()},recipient(action,id){
 const target={closest(selector){return selector==='[data-recipient-'+action+']'?{disabled:false,getAttribute(){return id}}:null}};
 nodes[action==='add'?'available':'people'].events.click({target});
 }};
}
async function flush(){for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));}
const unauthorized=harness('');
await flush();
assert.equal(unauthorized.calls.length,0,'Sin sesión no debe consultar la API');
assert.equal(unauthorized.nodes.auth.classList.contains('hidden'),false,'Pide iniciar sesión');

const test=harness('SESION_FICTICIA');
await flush();
assert.equal(test.calls.length,1);
assert.deepEqual(JSON.parse(test.calls[0].opts.body),{accion:'resumen'});
assert.equal(test.nodes.audienceCount.textContent,'2','Misiones: 2 candidatos reales');
assert(test.nodes.previewMessage.textContent.includes('llevas 1 de 3'),'Variables personalizadas');
assert(test.nodes.contextText.textContent.includes('1 de los seleccionados ya recibieron'),'Muestra aviso anterior');
assert.equal(test.nodes.selectedCount.textContent,'2','La lista manual coincide con la audiencia');
test.recipient('remove','a');
assert.equal(test.nodes.audienceCount.textContent,'1','Quitar un cliente sugerido actualiza la audiencia');
assert(test.nodes.recipientStatus.textContent.includes('1 quitados'),'El contador muestra la exclusión');
test.input('recipientSearch','aNa');
assert(test.nodes.available.innerHTML.includes('Ana'),'El buscador encuentra a la persona excluida');
test.recipient('add','a');
assert.equal(test.nodes.audienceCount.textContent,'2','Es posible reincorporar a un cliente');
test.recipient('remove','a');
assert.equal(test.nodes.audienceCount.textContent,'1','La exclusión persiste dentro del motivo');
test.input('recipientSearch','Beto');
assert(test.nodes.available.innerHTML.includes('disabled'),'No se puede agregar un cliente sin misiones pendientes');
test.recipient('add','b');
assert.equal(test.nodes.audienceCount.textContent,'1','La validación impide forzar destinatarios no elegibles');
assert(test.nodes.existing.textContent.includes('Pago acreditado'),'Reutiliza detonaciones existentes');
assert(!test.nodes.existing.textContent.includes('Recordatorio futuro'),'No presenta automatizaciones pendientes como activas');

test.choice('pay');
assert.equal(test.nodes.audienceCount.textContent,'1','Cobros solo con fecha oficial y no pagados');
assert(test.nodes.contextText.textContent.includes('motor financiero oficial'));
test.input('recipientSearch','dora');
assert(test.nodes.available.innerHTML.includes('Dórá'),'La búsqueda ignora acentos');
test.recipient('add','d');
assert.equal(test.nodes.audienceCount.textContent,'2','Puede añadir manualmente un cobro futuro fuera de los 7 días');
assert(test.nodes.recipientStatus.textContent.includes('1 añadidos'),'La inclusión manual queda diferenciada');
test.recipient('add','b');
assert.equal(test.nodes.audienceCount.textContent,'2','No puede incluir un periodo cubierto');
test.choice('missions');
assert.equal(test.nodes.audienceCount.textContent,'1','Las exclusiones de misiones no afectan a cobros');
test.click('resetRecipients');
assert.equal(test.nodes.audienceCount.textContent,'2','Restablecer recupera las recomendaciones originales');
test.choice('pay');
assert.equal(test.nodes.audienceCount.textContent,'2','La inclusión manual persiste en su motivo');

test.choice('promo');
assert.equal(test.nodes.audienceCount.textContent,'0','Sin selección, no se estima audiencia de promoción');
test.change('promotion','p');
assert.equal(test.nodes.audienceCount.textContent,'4','Promoción sin elegibilidad: candidatos preliminares');
assert(test.nodes.contextText.textContent.includes('preliminares'),'No prometer elegibilidad');

test.choice('general');
assert.equal(test.nodes.audienceCount.textContent,'4','Comunicado a activos recibidos desde servidor');
test.input('titleInput','Hola {nombre}');
assert.equal(test.nodes.previewTitle.textContent,'Hola Ana','Edición opcional y segura');

assert.equal(test.calls.length,1,'Cambiar motivo jamás ejecuta llamadas de escritura');
assert(test.calls.every(x=>JSON.parse(x.opts.body).accion==='resumen'),'Solo lectura');
console.log('Comunicaciones beta · pruebas OK: quitar/reagregar, búsqueda, acentos, bloqueos, cobros futuros, aislamiento, restaurar y solo lectura');
