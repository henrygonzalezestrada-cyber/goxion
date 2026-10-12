import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const src=readFileSync("assets/js/core/financial-actions.js","utf8");
const from=src.indexOf("let partialRetryFingerprint = '';");
const until=src.indexOf("async function pactPaymentDate(",from);
assert(from>0&&until>from,"Debe existir memoización por operación de pago");
const scoped=src.slice(from,until);
const requests=[],random=[];
let retries=0;
const factory=new Function("invoke","normalizeActionPayload","crypto",
  scoped+"\nreturn registerPartialPayment;");
const partial=factory(
 async(name,data)=>{
   requests.push({name,data});
   if(retries++===0)throw Error("Corte de conexión");
   return {ok:true,resultado:{saldo_restante:data.saldo_restante}};
 },
 p=>p,
 {randomUUID(){
  const k="f8bd8e08-f000-4a00-9000-"+String(random.length+1).padStart(12,"0");
  random.push(k);return k;
 }}
);
let n=0;
const check=(v,m)=>{assert(v,m);n++};
const base={clienteId:"123",saldoRestante:60,periodoEsperado:"2026-11"};
await assert.rejects(partial(base),/Corte de conexión/);n++;
await partial(base);
check(requests.length===2,"Segundo intento alcanzó el gateway");
check(requests[0].data.clave_idempotencia===requests[1].data.clave_idempotencia,
 "Misma operación conserva clave tras respuesta perdida");
await partial(base);
check(requests[1].data.clave_idempotencia===requests[2].data.clave_idempotencia,
 "Doble clic de solicitud no duplica clave");
await partial({...base,saldoRestante:59});
check(requests[3].data.clave_idempotencia!==requests[2].data.clave_idempotencia,
 "Cambio de saldo inicia nueva operación");
await partial({...base,clienteId:"otro"});
check(requests[4].data.clave_idempotencia!==requests[3].data.clave_idempotencia,
 "Otro cliente utiliza otra clave");
await partial({...base,periodoEsperado:"2026-12"});
check(requests[5].data.clave_idempotencia!==requests[4].data.clave_idempotencia,
 "Otro período utiliza otra clave");
check(random.length===4,"Solo cuatro operaciones lógicas generan UUID");
check(src.includes("GOXION_FINANCIAL_ACTIONS = Object.freeze"),"Misma API de Admin");
console.log("GOXION Admin retry parcial: "+n+" comprobaciones PASS");
