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
function app({records=[],client=base,mode="global",quote=null,fail=false,hour=null}={}){
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
  const clockDate=hour===null?Date:class extends Date{
    constructor(...args){super(...(args.length?args:[today+"T"+String(hour).padStart(2,"0")+":00:00-06:00"]));}
    static now(){return Date.parse(today+"T"+String(hour).padStart(2,"0")+":00:00-06:00");}
  };
  const sandbox={window:win,document:doc,clientesDict:clients,fetch:fetchMock,
    localStorage:{getItem:()=> "test-admin-token"},Intl,Date:clockDate,console,URL};
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

// Tres recordatorios adaptados a la fecha y hora local de Chiapas.
const todayClient={...base,nombre:"José Antonio",dia_pago:Number(today.slice(8)),
  estado_cuenta:{...base.estado_cuenta,estado:"vence_hoy",dias_atraso:0,
    dia_pago:Number(today.slice(8)),cargos:{mora:0,total:0},total_actual:276}};
async function checked(options){
  const candidate=app(options);
  await candidate.api.refresh();
  await candidate.api.verifyClient("test");
  return candidate;
}
h=await checked({client:todayClient,hour:12});
assert.equal(h.api.status(h.client),"due","Primer aviso durante el día de pago");
const dueMessage=h.api.messageFor(h.client,"due");
assert.match(dueMessage,/Hola, José/,"Saludo personalizado");
assert.match(dueMessage,/\$276\.00/,"Importe personalizado");
assert.match(dueMessage,/capturas de pantalla enviadas por WhatsApp/,"No aceptamos captura como reporte");
assert.match(dueMessage,/Soporte antes de pagar/,"Soporte para diferencias en saldo");
assert.match(dueMessage,/credenciales de acceso/,"Credenciales por soporte");
assert.match(dueMessage,/ayuda\.html/,"Enlace a Mi Espacio");
h=await checked({client:todayClient,hour:20});
assert.equal(h.api.status(h.client),"last_call","Últimas horas a partir de las 18:00");
const closingMessage=h.api.messageFor(h.client,"last_call");
assert.match(closingMessage,/Aún estás a tiempo/);
assert.match(closingMessage,/\$276\.00/);
assert.doesNotMatch(closingMessage,/tu fecha de pago ya pasó/i);
h=await checked({client:todayClient,records:[agreement(offset(2))],hour:20});
assert.equal(h.api.status(h.client),"agreed","Prórroga activa bloquea avisos del día");
h=await checked({client:{...todayClient,pago_en_revision:true},hour:12});
assert.equal(h.api.status(h.client),"normal","Comprobante en revisión no debe recibir aviso");
h=await checked({client:{...todayClient,estado_cuenta:{...todayClient.estado_cuenta,estado:"pagado"}},hour:12});
assert.equal(h.api.status(h.client),"normal","Pago confirmado elimina aviso");
h=await checked({client:{...todayClient,estado_cuenta:{...todayClient.estado_cuenta,estado:"por_vencer",dia_pago:Number(today.slice(8))+1},dia_pago:Number(today.slice(8))+1},hour:12});
assert.equal(h.api.status(h.client),"normal","Próximo vencimiento no se trata como hoy");
const dueCharge=charge(today,{cargo_id:"due",total_centavos:4600});
const futureProrrogated=charge(today,{cargo_id:"prorroga",prorroga_estado:"aprobada",fecha_pactada:offset(2),total_centavos:4600});
h=await checked({client:todayClient,mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[dueCharge,futureProrrogated]},hour:12});
assert.equal(h.api.status(h.client),"due","B2 con un cargo hoy y otro prorrogado");
assert.equal(h.api.quoteForReminder(h.client,"due").estado_cuenta.total_actual,46,"B2 cotiza solo lo que vence hoy");
h=await checked({client:todayClient,mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[futureProrrogated]},hour:12});
assert.equal(h.api.status(h.client),"agreed","Solo prórroga activa no genera recordatorio");
const todayAgreed=charge(today,{cargo_id:"pactado",prorroga_estado:"aprobada",fecha_pactada:today});
h=await checked({client:todayClient,mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[todayAgreed]},hour:20});
assert.equal(h.api.status(h.client),"agreed","El día pactado no activa avisos ordinarios sin acuerdo especial");
h=await checked({client:todayClient,mode:"b2_multifecha",quote:{ok:true,periodo:period+"-01",cargos:[overdue,dueCharge]},hour:12});
assert.equal(h.api.status(h.client),"overdue","Un saldo ya vencido mantiene prioridad de cobro");
assert.equal(h.api.quoteForReminder(h.client,"overdue").estado_cuenta.total_actual,51.5,"No mezcla otros cargos en recordatorio vencido");

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
console.log("Recordatorios Admin: 30 controles OK (vencido, día, tarde, B2, prórroga, WhatsApp).");
