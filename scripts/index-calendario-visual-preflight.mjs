import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=p=>readFileSync(p,"utf8");
const html=read("index.html");
const css=read("assets/css/index.css");
const page=read("assets/js/index/02-02-inline.js");
const layer=read("assets/js/index/01-index-supabase-layer.js");
const edge=read("docs/edge/estado-financiero/index.ts");
const contract=read("docs/INDEX_CALENDARIO_VISUAL_BASELINE.md");
let checks=0;
const check=(condition,msg)=>{assert(condition,msg);checks++};

check(html.includes('family=Poppins'),"Index conserva Poppins");
check(!html.includes("assets/css/admin.css")&&!html.includes("assets/css/ayuda.css"),
 "Index no importa la estética de Admin o Ayuda");
check(css.includes(".sticky-area::after")&&css.includes("filter:blur(8px)"),
 "Límite difuminado del header fijo");
check(css.includes(".lava")&&css.includes("prefers-reduced-motion"),
 "Lámpara de lava y accesibilidad");
for(const marker of [
 'class="sticky-area"','class="balance-hero"','class="total-amount"',
 'class="scrollable-content"','class="glass-card card-info"',
 'class="glass-card services-container"','class="actions-group',
 'class="gx-payment-primary"','class="gx-bank-overlay"'
]){
 // El cuerpo de estado de cuenta se renderiza en JS; los modales están en HTML.
 check(page.includes(marker)||html.includes(marker),"Elemento aprobado desapareció: "+marker);
}
check(html.includes('id="bank-modal"'),"Se conserva modal de Nu/Revolut");
check(html.includes('id="payment-modal"'),"Se conserva modal de comprobante");
check(html.includes('id="btn-enviar-comprobante"'),"Se conserva envío de comprobante");
check(page.includes("pagoActualInfo = "), "El monto a reportar sigue unido al estado oficial");
check(page.includes("Ya realicé mi pago"), "Se conserva CTA principal");
check(layer.includes('window.gxSelectIndexFinancialState'),"Continúa conciliación oficial de Index");
check(layer.includes('const TOKEN_KEY = GXCORE.STORAGE.CLIENT_TOKEN'),
 "Index usa sesión central");
check(edge.includes('if(accion==="mi_calendario")'),"La lectura de fechas se concentra en backend");
check(edge.includes('if(accion==="mi_estado")'),"Se conserva saldo oficial");
check(!page.includes("mi_calendario")&&!layer.includes("mi_calendario"),
 "Index no consume calendarios no cobrables antes de implementar backend de pagos");
check(!html.includes('assets/css/admin.css')&&!html.includes('assets/css/ayuda.css'),
 "No se mezclaron las interfaces");
check(contract.includes("No activar esta hipótesis"),"La beta no se publicó como UI real");
console.log("GOXION Index visual preflight: "+checks+" guardas PASS · original sin modificar");
