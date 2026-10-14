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
check(!html.includes("gx-b2-beta-banner"),"Sin banner visible de demostración");
check(!ui.includes("data-b2-scenario")&&!ui.includes("CAMBIAR ESCENARIO"),"Sin controles de escenarios visibles");
check(!css.includes(".gx-b2-scenario")&&!css.includes(".gx-b2-beta-banner"),"Sin espacio ni estilos de controles de prueba");
check(!ui.includes("VISTA PREVIA · NO SE ENVIARÁ"),"Sin textos de prueba en el formulario");
check(ui.includes("no acepta pagos reales")&&ui.includes("no está habilitado aquí"),"La beta no permite reportar pagos reales");
check(css.includes("prefers-reduced-motion"),"Reducción de movimiento accesible");
check(css.includes(".gx-b2-card"),"Estilos separados");
check(ui.includes("services-container")&&ui.includes('insertAdjacentElement("afterend"'),"El calendario se inserta después de los servicios contratados");
check(ui.includes("function updateBreakdown()")&&ui.includes("function breakdown()"),"Desglose reintroducido sobre selección multifecha");
check(!ui.includes('globalBreakdown.style.display="none"'),"Nunca ocultar el subtotal original");
check(ui.includes("Otros ajustes al saldo")&&ui.includes("Pagos parciales aprobados"),"Conciliación y pagos aplicados en desglose");
check(ui.includes("updateBreakdown();")&&css.includes(".gx-b2-breakdown"),"Se integra a la tarjeta original de desglose");
check(ui.includes("gx-b2-reveal")&&ui.includes("aria-expanded"),"Animación y ARIA");
check(ui.includes('["proximo","Próximo vencimiento"]')&&ui.includes('["todo","Todo junto"]'),"Solo pago próximo y todo junto en selección principal");
check(!ui.includes('data-b2-mode="abono"')&&!ui.includes('id="b2-partial"'),"Sin abonos como opción habitual");
check(!ui.includes("data-b2-review")&&!ui.includes("gx-b2-confirm"),"Index no ofrece solicitudes; sólo refleja acuerdos");
check(ui.includes("Acuerdo pactado"),"Index muestra acuerdo pactado si existe");
check(ui.includes("gx-b2-next-tag")&&ui.includes("PRÓXIMO"),"Distintivo del próximo vencimiento");
check(css.includes("gxB2NextSheen")&&css.includes("gxB2TextLight")&&css.includes("prefers-reduced-motion"),"Énfasis premium por iluminación sin iconos");
check(!ui.includes("gx-b2-ico")&&!ui.includes("gx-b2-mark"),"Sin barras ni puntos delante de los vencimientos");
check(!css.includes(".gx-b2-row.is-next:before")&&!css.includes(".gx-b2-mark"),"CSS sin bordes iniciales ni marcadores redondos");
check(css.includes("background-clip:text"),"Distintivo tipográfico sin cápsulas");
check(ui.includes("solo_cotizacion")===false,"Los términos de la prórroga no acreditan pago");
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
 window:{GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"client_token"},endpoint:x=>x,
  BUSINESS:{BANK:{NAME:"Banco",HOLDER:"Titular",CLABE:"123456789012345678",
    ACCOUNTS:[]}}},
  fetch:async()=>{throw Error("Demo intentó consultar la red");},
  dispatchEvent:()=>{}},
 location:{search:"?cliente=b2-demo&demo=1",pathname:"/preview/index-b2/index.html"},
 history:{replaceState:()=>{}},URLSearchParams:URLClass,
 Response:Response,localStorage:{getItem:()=>""},CustomEvent:class{},
 Intl,Date,Math,JSON,Number,String,Map,Set,Array
});
new Script(bridge).runInContext(ctx);
const data=await ctx.window.fetch("clientes.json").then(r=>r.json());
check(data["b2-demo"].nombre==="Cliente GOXION","Sin datos privados");
check(ctx.window.GOXION_CORE.BUSINESS.BANK.CLABE==="000000000000000000",
 "La demo no expone CLABE real");
let state=ctx.window.GOXION_B2_PREVIEW;
check(state.quote.total_pendiente_centavos===9212,"Demo puntual por perfil 6%");
state.makeDemo("vencido");
check(state.quote.total_pendiente_centavos===10045,"Mora únicamente primer perfil; pierde lealtad en pendientes");
check(state.quote.cargos[1].mora_centavos===0,"Segundo perfil no genera mora antes de corte");
state.makeDemo("prorroga");
check(state.quote.total_pendiente_centavos===9212,"La prórroga mantiene el importe y la lealtad");
check(state.quote.cargos[0].fecha_pactada==="2026-11-09","Fecha pactada independiente");
state.makeDemo("prorroga-incumplida");
check(state.quote.total_pendiente_centavos===10780,"Mora retroactiva y descuento perdido en ambos");
check(state.quote.cargos[0].mora_centavos===980,"Mora solo del acceso incumplido");
state.makeDemo("primero-pagado");
check(state.quote.total_pendiente_centavos===4606,"Un acceso ya pagado no se vuelve a cobrar");
console.log("GOXION Index B2 beta · "+n+" verificaciones PASS, sin pagos reales");
