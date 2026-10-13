import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Script,createContext} from "node:vm";
const file=p=>readFileSync(p,"utf8");
const html=file("preview/index-b2/index.html");
const css=file("preview/index-b2/b2.css");
const bridge=file("preview/index-b2/b2-bridge.js");
const ui=file("preview/index-b2/b2-ui.js");
let n=0;
function check(value,message){assert(value,message);n++;}
for(const [p,s] of [["b2-bridge",bridge],["b2-ui",ui]]){
 new Script(s,{filename:p+".js"});check(true,p+" JavaScript válido");
}
check(html.includes('<base href="../../">'),"Assets oficiales reutilizados");
check(html.includes('src="./assets/js/index/02-02-inline.js"'),"Renderizador oficial no clonado");
check(html.indexOf("b2-bridge.js")<html.indexOf("02-02-inline.js"),"Bridge antes del render");
check(html.indexOf("b2-ui.js")>html.indexOf("04-realtime.js"),"Capa visual al final");
check(html.includes('BETA')&&html.includes("SIN COBROS REALES"),"Aviso persistente");
check(css.includes("prefers-reduced-motion"),"Reducción de movimiento accesible");
check(css.includes(".gx-b2-card"),"Estilos separados");
check(ui.includes("card-info")&&ui.includes('insertAdjacentElement("afterend"'),"Acordeón bajo titular");
check(ui.includes("gx-b2-reveal")&&ui.includes("aria-expanded"),"Animación y ARIA");
check(ui.includes('["proximo","Próximo"]')&&ui.includes('["todo","Todo junto"]')&&ui.includes('["abono","Abonar"]'),"Tres opciones");
check(ui.includes("precio")===false||ui.includes("solo_cotizacion")===false,"No recalcula backend por cuenta");
check(ui.includes("goxion:b2-quote-change"),"Escenarios actualizables");
check(ui.includes("store.report")&&ui.includes("cargo_ids"),"Datos del reporte por obligación");
check(!ui.includes("fetch(WEBHOOK_DISCORD")&&!ui.includes("fetch('https://discord"),"Demo no envía a Discord");
check(!bridge.includes("service_role"),"Ningún secreto backend en cliente");
check(bridge.includes("X-Client-Token"),"Consulta B2 cliente autenticado");
check(bridge.includes("estado-financiero-b2-beta"),"Usa Edge beta aislada");
check(bridge.includes('demo: demo')&&bridge.includes("function makeQuote"),"Demo separada del estado real");

// Prueba comportamiento del bridge JS sin navegador ni red.
let params=new URLSearchParams("?cliente=b2-demo&demo=1");
const URLClass=URLSearchParams;
const ctx=createContext({
 window:{GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"client_token"},endpoint:x=>x},
  fetch:async()=>{throw Error("Demo intentó consultar la red");},
  dispatchEvent:()=>{}},
 location:{search:"?cliente=b2-demo&demo=1",pathname:"/preview/index-b2/index.html"},
 history:{replaceState:()=>{}},URLSearchParams:URLClass,
 Response:Response,localStorage:{getItem:()=>""},CustomEvent:class{},
 Intl,Date,Math,JSON,Number,String,Map,Set,Array
});
new Script(bridge).runInContext(ctx);
const data=await ctx.window.fetch("clientes.json").then(r=>r.json());
check(data["b2-demo"].nombre==="Cliente de prueba","Sin datos privados");
let state=ctx.window.GOXION_B2_PREVIEW;
check(state.quote.total_pendiente_centavos===9212,"Demo puntual por perfil 6%");
state.makeDemo("vencido");
check(state.quote.total_pendiente_centavos===10045,"Mora únicamente primer perfil; pierde lealtad en pendientes");
check(state.quote.cargos[1].mora_centavos===0,"Segundo perfil no genera mora antes de corte");
state.makeDemo("parcial");
check(state.quote.total_pendiente_centavos===7212,"Abono de 20 pesos reduce saldo");
state.makeDemo("primero-pagado");
check(state.quote.total_pendiente_centavos===4606,"Un acceso ya pagado no se vuelve a cobrar");
console.log("GOXION Index B2 beta · "+n+" verificaciones PASS, sin pagos reales");