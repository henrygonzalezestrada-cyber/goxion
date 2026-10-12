import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const edge=readFileSync("docs/edge/acciones-financieras/index.ts","utf8");
const start=edge.indexOf('if (action === "registrar_pago_parcial")');
const end=edge.indexOf('if (action === "pactar_fecha_pago")',start);
assert(start>=0&&end>start);
const body=edge.slice(start,end);
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
// TypeScript file, but the financial action is valid plain JS; parse it in
// isolation and test requests through a mock authenticated Supabase gateway.
const handle=new AsyncFunction("action","data","operationId","sb","financialState","json",body);
const uuid="b9c17ada-9e19-4c9d-b21a-ff735d972108";
const idem="ef1732b5-3fa7-451f-9815-0e6c51e9a54a";
let passes=0;
function test(name,got,expected){
 assert.deepEqual(got,expected,name);passes++;
}
async function scenario(input={},opts={}){
 const calls=[];
 const fake={
  rpc:async (name,args)=>{
   calls.push({name,args});
   return opts.dbError?{error:{message:opts.dbError}}:
    {data:{pago_parcial:{id:"pay-1"},monto_pagado:40,
           saldo_restante:60,repetida:opts.repeated===true}};
  }
 };
 const result=await handle(
  "registrar_pago_parcial",
  {cliente_id:uuid,periodo_esperado:"2026-11",saldo_restante:60,
   notas:"Aprobado",clave_idempotencia:idem,...input},
  "f0bb52be-0823-45c7-898d-180fa489432b",fake,
  async()=>opts.readError?{error:{message:"offline"}}:{data:{periodo:"2026-11",total_actual:100}},
  (obj,status=200)=>({...obj,httpStatus:status})
 );
 return {result,calls};
}
let x=await scenario();
test("Retorno exitoso",x.result.ok,true);
test("Versión financiera nueva",x.result.version,"1.3");
test("Sin monto doble en respuesta",x.result.resultado.saldo_restante,60);
test("Exactamente una transacción de DB",x.calls.length,1);
test("RPC nueva",x.calls[0].name,"goxion_registrar_pago_parcial_atomico");
test("Monto en centavos",x.calls[0].args.p_saldo_restante_centavos,6000);
test("Idempotencia de operación",x.calls[0].args.p_operation_id,idem);
x=await scenario({}, {repeated:true});
test("Repetición reconocida sin fallar",x.result.resultado.repetida,true);
x=await scenario({}, {dbError:"PERIODO_DESACTUALIZADO"});
test("Error 409",x.result.httpStatus,409);
test("Código de período antiguo",x.result.codigo,"PERIODO_DESACTUALIZADO");
x=await scenario({saldo_restante:0});
test("No acepta cero",x.result.httpStatus,400);
test("Cero no toca DB",x.calls.length,0);
x=await scenario({saldo_restante:60.001});
test("No redondea décimas de centavo",x.result.httpStatus,400);
x=await scenario({cliente_id:"otro"});
test("Rechaza identidad no UUID",x.result.httpStatus,400);
x=await scenario({clave_idempotencia:"not-a-uuid"});
test("Clave inválida rechazada",x.result.httpStatus,400);
x=await scenario({}, {readError:true});
test("Lectura financiera no disponible",x.result.httpStatus,409);
test("Fallo de lectura no toca pagos",x.calls.length,0);
x=await scenario({}, {dbError:"Obligación no verificada"});
test("RPC rechazada no declara pago completo",x.result.ok,false);
test("RPC rechazada retorna 409",x.result.httpStatus,409);
console.log("GOXION pago parcial gateway: "+passes+" escenarios PASS; compatibilidad Admin y única RPC");
