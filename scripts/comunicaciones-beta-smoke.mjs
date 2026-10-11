import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const html = readFileSync('preview/comunicaciones/index.html', 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert(script, 'Falta el script del simulador');
assert(!/data-preset="(?:outage|offer)"/.test(html), 'Regresó un editor duplicado de fallas/descuentos');
assert(html.includes('Activar campaña →') && /primary" disabled title="La beta no puede enviar/.test(html), 'La beta no debe habilitar envíos reales');
assert(html.includes('id="automationList"'), 'Falta el mapa de detonaciones');
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'Hay IDs HTML duplicados');

const fixture = {
  ok:true, fecha_local:'2026-10-10',
  clientes:[
    {id:'a',nombre:'Ana',estado:'pagado',estado_cuenta:'pendiente',servicios:[{id:'s',nombre:'Netflix'}],misiones_total:3,misiones_hechas:1,misiones_pendientes:2,dias_para_cobro:2,cobro_oficial:true,cobro_pagado:false,antiguedad_dias:30,notificaciones_previas:[{tipo:'mision_recordatorio',dedupe_key:'misiones:2026-10-20:aviso-inicial'}]},
    {id:'b',nombre:'Beto',estado:'pendiente',estado_cuenta:'pendiente',servicios:[{id:'s',nombre:'Netflix'}],misiones_total:3,misiones_hechas:2,misiones_pendientes:1,dias_para_cobro:5,cobro_oficial:true,cobro_pagado:false,antiguedad_dias:12,notificaciones_previas:[]},
    {id:'c',nombre:'Caro',estado:'pagado',estado_cuenta:'pagado',servicios:[{id:'s',nombre:'Netflix'}],misiones_total:3,misiones_hechas:3,misiones_pendientes:0,dias_para_cobro:null,cobro_oficial:true,cobro_pagado:true,antiguedad_dias:200,notificaciones_previas:[]},
    {id:'d',nombre:'Dora',estado:'pendiente',estado_cuenta:null,servicios:[{id:'s',nombre:'Netflix'}],misiones_total:0,misiones_hechas:0,misiones_pendientes:0,dias_para_cobro:null,cobro_oficial:false,cobro_pagado:false,antiguedad_dias:20,notificaciones_previas:[]}
  ],
  servicios:[{id:'s',nombre:'Netflix',activo:true}],
  promociones:[{id:'p',nombre:'Combo Premium',titulo_publico:'Combo Premium',notificar_cliente:true}],
  alertas:[],historial:[],exclusiones:{suspendidos:1,prueba:1,sin_servicios:0},
  fiabilidad:{consultas_correctas:3,consultas_fallidas:1},
  automatismos:[{id:'pago',nombre:'Pago acreditado',owner:'Finanzas',trigger:'goxion_notify_pago_cliente',estado:'activo'},{id:'vence',nombre:'Recordar misiones',owner:'Misiones',trigger:'pendiente',estado:'simulacion'}]
};

function harness(token) {
  const nodes = {};
  for (const id of ids) {
    const flags = new Set(['hidden']);
    nodes[id] = {
      id, value:'', textContent:'', innerHTML:'', checked:false, disabled:false, style:{}, handlers:{},
      classList:{add(k){flags.add(k)},remove(k){flags.delete(k)},toggle(k,on){if(on === undefined ? !flags.has(k) : on) flags.add(k);else flags.delete(k)},contains(k){return flags.has(k)}},
      addEventListener(name, fn){this.handlers[name]=fn},
      querySelectorAll(){return []},appendChild(){},
      focus(){},setSelectionRange(){}
    };
  }
  Object.assign(nodes.category,{value:'missions'});
  const initial = {
    deadline:'2026-10-20',title:'Misiones {fecha}',message:'Hola {nombre}: {pendientes} pendientes',
    missionFilter:'pending',stateFilter:'any',serviceMode:'any',service:'',dueFilter:'any',ageFilter:'any',
    promotion:'',phase:'new',previewDate:'2026-10-16',sample:''
  };
  for (const [id,val] of Object.entries(initial)) nodes[id].value=val;
  const presets=['missions','last','promo','pay','general'].map(name=>({
    dataset:{preset:name},classList:{toggle() {},remove() {}},handlers:{},
    addEventListener(event,fn){this.handlers[event]=fn}
  }));
  const doc={
    getElementById(id){assert(nodes[id], 'Falta elemento '+id);return nodes[id]},
    createElement(){return {className:'',textContent:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn}}},
    querySelectorAll(selector){return selector==='[data-preset]'?presets:[]}
  };
  const calls=[],store={getItem(k){return k==='GOXION_ADMIN_TOKEN'?token:null},setItem() {}};
  const fakeFetch=async(url,init)=>{
    calls.push({url,init});
    return {ok:true,status:200,json:async()=>fixture};
  };
  vm.runInNewContext(script,{document:doc,localStorage:store,fetch:fakeFetch,console},{timeout:5000});
  return {nodes,presets,calls};
}
async function settle(){for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));}
function change(h,id,value){h.nodes[id].value=value;h.nodes[id].handlers.change?.();}

const unauth=harness('');
await settle();
assert.equal(unauth.calls.length,0,'No debe consultar sin token');
assert(!unauth.nodes.auth.classList.contains('hidden'),'Sin token se debe solicitar sesión');

const h=harness('TOKEN_SIMULADO');
await settle();
assert.equal(h.calls.length,1);
assert.equal(JSON.parse(h.calls[0].init.body).accion,'resumen','El único endpoint llamado debe ser read-only');
assert.equal(h.nodes['metric-clients'].textContent,'4');
assert.equal(h.nodes['metric-services'].textContent,'1');
assert.equal(h.nodes.recipientCount.textContent,'2','Misiones pendientes: Ana y Beto');
assert(h.nodes.automationList.innerHTML.includes('Pago acreditado'),'Evento automático de Supabase visible');
assert(h.nodes.automationList.innerHTML.includes('solo simulación'),'Regla futura distinguible');

change(h,'phase','initial');
assert.equal(h.nodes.recipientCount.textContent,'1','El segundo aviso inicial debe excluir a Ana por deduplicación');
assert(h.nodes.duplicateNotice.textContent.includes('1 clientes'),'Auditoría de aviso previo visible');

change(h,'category','pay');
change(h,'missionFilter','any');
change(h,'dueFilter','3');
assert.equal(h.nodes.recipientCount.textContent,'1','Cobro 3 días: solo Ana; sin estados inventados');

change(h,'category','promo');
change(h,'dueFilter','any');
change(h,'promotion','p');
assert(h.nodes.sourceNotice.textContent.includes('Promotions Studio'),'Promoción real, sin editor paralelo');
assert(h.nodes.duplicateNotice.textContent.includes('Falta comprobar elegibilidad'),'No se confunde candidatos con elegibles');

assert(!h.calls.some(c=>JSON.parse(c.init.body).accion!=='resumen'), 'La beta no puede enviar campañas');
console.log('GOXION Comunicaciones beta · 12 comprobaciones OK (simulación sin envíos)');
