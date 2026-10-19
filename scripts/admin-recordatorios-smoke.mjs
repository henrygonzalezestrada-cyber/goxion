import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

// Simula Admin autenticado sin conectarse con clientes ni servidor real.
const source=readFileSync(new URL("../assets/js/admin/34-admin-recordatorios-inteligentes.js",import.meta.url),"utf8");
const ID="123e4567-e89b-42d3-a456-426614174000";
const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Mexico_City",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const offset=n=>new Date(Date.parse(today+"T12:00:00Z")+n*86400000).toISOString().slice(0,10);
const period=today.slice(0,7);
const base={_id:ID,id:ID,nombre:"Cliente de prueba",folio:"GX-TEST",estado:"pendiente",
  periodo_pendiente:period+"-01",estado_cuenta:{estado:"vencido",periodo:period+"-01",total_actual:331,dias_atraso:4,subtotal:276,cargos:{mora:55,total:55}}};
const agreement=(date,extra={})=>({id:"test-agreement",cliente_id:ID,fecha_original:period+"-15",
  fecha_pactada:date,estado:"aprobada",cumplida:false,liquidado:false,solicitado_en:today+"T12:00:00",...extra});
const charge=(date,values={})=>({cargo_id:"test-"+date,vence:date,servicio:"ViX",
  pagado:false,total_centavos:4600,principal_centavos:4600,base_centavos:4600,
  mora_centavos:0,descuento_centavos:0,descuento_comercial_centavos:0,
  abono_pagado_centavos:0,prorroga_estado:"",fecha_pactada:"",...values});
function app({records=[],client=base,mode="global",quote=null,fail=false}={}){
  const clients={test:structuredClone(client)};
  const calls=[];
  const win={GOXION_CORE:{endpoint:name=>"/functions/"+name,STORAGE:{ADMIN_TOKEN:"token"}},
    addEventListener(){}};
  const doc={readyState:"loading",addEventListener(){},querySelectorAll(){return [];}};
  async function fetchMock(_url,options){
    const input=JSON.parse(options.body);
    calls.push(input.accion);
    if(fail)throw Error("Error de red");
    const payload=input.accion==="b2_listar_prorrogas"
      ?{ok:true,solicitudes:records}
      :input.accion==="b2_listar_comprobantes"
        ?{ok:true,modo:mode,comprobantes:[]}
        :input.accion==="b2_cotizar_ciclo"
          ?{ok:true,resultado:quote}
          :{ok:false,error:"Acción no prevista"};
    return {ok:true,json:async()=>payload};
  }
  const sandbox={window:win,document:doc,clientesDict:clients,fetch:fetchMock,
    localStorage:{getItem:()=> "test-admin-token"},Intl,Date,console,URL};
  runInNewContext(source,sandbox,{timeout:3000});
  return {api:win.GOXION_ADMIN_REMINDERS,client:clients.test,calls};
}
let h=app();
assert.equal(h.api.status(h.client),"unverified","sin prórrogas confirmadas, bloquear el envío");
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"overdue","vencido sin acuerdo");
h=app({records:[agreement(offset(2))]});
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"agreed","prórroga activa prevalece sobre estado global vencido");
h=app({records:[agreement(offset(-1))]});
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"missed","prórroga incumplida");
h=app({records:[agreement(offset(2),{cumplida:true})]});
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"overdue","prórroga cumplida no debe quedar activa");
h=app({client:{...base,estado_cuenta:{...base.estado_cuenta,estado:"pagado"}}});
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"normal","cliente pagado sin acción");
h=app({fail:true});
await h.api.refresh();
if(h.calls.includes("b2_listar_prorrogas")&&h.api.status(h.client)!=="unverified")throw Error("Régimen no validado antes de abrir recordatorio");
await h.api.verifyClient('test');
assert.equal(h.api.status(h.client),"unverified","fallo de red bloquea envío sin datos");
const overdue=charge(offset(-2),{total_centavos:5150,base_centavos:4600,mora_centavos:550});
const protectedRow=charge(offset(-2),{cargo_id:"protected",fecha_pactada:offset(2),prorroga_estado:"aprobada",total_centavos:4600});
h=app({mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[overdue,protectedRow]}});
await h.api.refresh();
await h.api.verifyClient("test");
assert.equal(h.api.status(h.client),"overdue","B2 detecta deuda individual sin ocultarla por otra prórroga");
assert.equal(h.api.quoteForReminder(h.client).estado_cuenta.total_actual,51.5,"B2 cobra solo obligación vencida");
h=app({mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[protectedRow]}});
await h.api.refresh();
await h.api.verifyClient("test");
assert.equal(h.api.status(h.client),"agreed","B2 acuerdo único no aparece vencido");
// Flujo simplificado: texto únicamente; nunca crear ni descargar imagen.
assert.ok(!source.includes("fileFromCanvas")&&!source.includes('toDataURL("image/png")'),
  "El recordatorio ya no debe generar capturas ni imágenes");
assert.match(h.api.messageFor(h.client),/Mi Espacio GOXION/,
  "El texto conserva el acceso al portal del cliente");
assert.match(h.api.messageFor(h.client),/ayuda.html/,
  "El enlace siempre apunta a Ayuda");
assert.equal(h.api.phoneFor({...h.client,telefono_normalizado:"961 123 4567"}),"529611234567",
  "Normaliza el teléfono mexicano existente");
assert.equal(h.api.phoneFor({...h.client,telefono_normalizado:""}),"",
  "Sin teléfono se activa la selección manual de destinatario");
console.log("Recordatorios Admin: 14 controles OK (estado, B2, texto y WhatsApp).");
