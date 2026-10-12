import assert from "node:assert/strict";
import vm from "node:vm";
import {readFileSync} from "node:fs";

const src=readFileSync("assets/js/admin/23-admin-beta-13-access-controller.js","utf8");
const css=readFileSync("assets/css/admin.css","utf8");
const html=readFileSync("admin.html","utf8");
new vm.Script(src);
const start=src.indexOf("window.gxOpenTechnicalPassword=function(serviceId,accountId,event){");
const end=src.indexOf("    // ---------- Constructor de productos / combos ----------",start);
assert(start>=0&&end>start,"Existe el controlador de contraseña");
const handler=src.slice(start,end);
const events=[],window={};
const service={
 value:"",options:[{value:"0"},{value:"1"}]
};
const account={
 value:"",options:[{value:"account-1"},{value:"account-2"}]
};
const password={focus(args){events.push("focus"); assert.deepEqual(args,{preventScroll:true})}};
window.gxCloseClientFocus=()=>events.push("close-client-focus");
window.gxOpenMoreDestination=name=>{events.push("open-"+name)};
window.gxCredentialServiceChanged=()=>events.push("service-changed");
window.gxCredentialAccountChanged=()=>events.push("account-changed");
const document={
 getElementById:id=>({
   "gx-cred-service":service,"gx-cred-account":account,"gx-cred-password":password
 }[id]||null),
 querySelectorAll:()=>[]
};
const context={
 window,document,configGlobal:{serviciosGlobales:[{id:"netflix"},{id:"disney"}]},
 setTimeout:fn=>fn(),goAdminTab:tab=>events.push("tab-"+tab),
};
vm.runInNewContext(handler,context);
let prevented=false,stopped=false;
window.gxOpenTechnicalPassword("netflix","account-2",{
 preventDefault(){prevented=true},
 stopPropagation(){stopped=true}
});
assert(prevented&&stopped,"Click consumido correctamente");
assert.equal(service.value,"0","Preselección del servicio");
assert.equal(account.value,"account-2","Preselección de la cuenta madre");
assert.deepEqual(events,[
 "close-client-focus","open-credentials","service-changed","account-changed","focus"
],"Cerrar ficha primero, navegar y seleccionar credenciales después");
assert(!handler.includes("gxPublishCredential("),"Nunca publicar contraseña desde el botón");

// Ruta de respaldo y ausencia de cuenta: no debe bloquear ni ejecutar escrituras.
events.length=0; delete window.gxOpenMoreDestination;

window.gxSettingsView=view=>events.push("view-"+view);
window.gxOpenTechnicalPassword("disney","missing",{
 preventDefault(){},stopPropagation(){}
});
assert.equal(service.value,"1");
assert.deepEqual(events.slice(0,3),[
 "close-client-focus","tab-tab-ajustes","view-credentials"
],"Respaldo de navegación a Ajustes → Credenciales");

// Estructura: Perfil/PIN, cuenta, contraseña. Nunca una acción centrada bajo todo el contenido.
const segment=src.slice(src.indexOf('class="gx-tech-credential-grid gx-tech-compact-pair"'));
assert(segment.indexOf("gx-tech-account-side")>0);
assert(segment.indexOf("gx-tech-password-line")>segment.indexOf("gx-tech-account-side"),
 "La contraseña va después de seleccionar cuenta compartida");
assert(src.includes('class="gx-tech-password-action"'),"Acción con clase aislada");
assert(src.includes('aria-label="Gestionar contraseña de'),"Etiqueta accesible");
assert(src.includes("!current?'<em class=\"missing\">Pendiente</em>':''"),
 "No duplicar el estado de cuenta asignada");
const scope=".gx-focus-v3 .gx-service-access-details .gx-beta-access-row-live .gx-tech-password-line";
assert(css.includes(scope),'Estilo aislado en Servicios de Admin');
assert(css.includes("grid-template-columns:minmax(0,1fr) auto!important"),
 "Botón alineado a la derecha de título y descripción");
assert(css.includes(".gx-tech-password-action:focus-visible"),"Accesible con teclado");
assert(html.includes("23-admin-beta-13-access-controller.js"),"Admin carga el controlador corregido");
console.log("GOXION Admin contraseña: navegación visible, cuenta exacta, fallback, orden, ancho y no-escritura PASS");
