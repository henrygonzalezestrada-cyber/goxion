import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";

const admin=readFileSync("admin.html","utf8");
const css=readFileSync("assets/css/admin.css","utf8");
const module=readFileSync("assets/js/admin/32-admin-calendario-beta.js","utf8");
const page=readFileSync("preview/calendario-financiero/index.html","utf8");
assert(admin.includes("32-admin-calendario-beta.js"),"El acceso contextual no está conectado a Admin");
assert(css.includes(".gx-calendar-entry")&&css.includes(".gx-calendar-dialog"),"La interfaz debe utilizar las superficies de Admin");
assert(!page.includes("1. Selecciona")&&!page.includes("2. Fechas")&&!page.includes("3. ¿Qué"),"No mostrar un formulario por pasos");
assert(page.includes("html.embedded header")&&page.includes("html.embedded #clientPanel"),"En el expediente no se repiten encabezados ni selector");
assert(page.includes('initialClient=param?.get("cliente")'),"El iframe debe recibir el cliente del expediente");
new vm.Script(module);
new vm.Script(page.match(/<script>([\s\S]*?)<\/script>/)[1]);

const UUID="11111111-1111-4111-8111-111111111111";
const events={};
const element=(tag)=>({
 tagName:tag.toUpperCase(),dataset:{},children:[],open:false,src:"",
 append(...nodes){this.children.push(...nodes)},
 appendChild(node){this.children.push(node)},
 addEventListener(name,fn){(this.events||= {})[name]=fn},
 setAttribute(name,value){this[name]=value},removeAttribute(name){delete this[name]},
 showModal(){this.open=true},close(){this.open=false;this.events?.close?.()}
});
const focus=element("div");
focus.dataset.gxClientKey="key";
focus.classList={contains(x){return x==="show"}};
const body=element("div");
const section=element("div");
section.querySelector=(selector)=>selector==="[data-gx-calendar-entry]"?
  section.children.find(c=>c.dataset?.gxCalendarEntry==="1"):null;
let modal;
const fakeDocument={
 readyState:"complete",body:element("body"),
 getElementById(id){return id==="gx-client-focus"?focus:id==="gx-focus-body"?body:null},
 querySelector(sel){return sel.includes('data-gx-section="services"')?section:null},
 createElement(tag){
  const e=element(tag);
  if(tag==="dialog"){
    modal=e;
    const content=element("div"),close=element("button"),name=element("span");
    e.querySelector=s=>s===".gx-calendar-dialog-content"?content:
      s===".gx-calendar-dialog-close"?close:s==="#gx-calendar-client-name"?name:null;
    e.content=content;e.closeButton=close;e.name=name;
  }
  return e;
 }
};
class FakeMutationObserver{constructor(callback){this.callback=callback}observe(){events.observed=(events.observed||0)+1}}
const clients={key:{_id:UUID,nombre:"Cliente X2"}};
vm.runInNewContext(module,{
 document:fakeDocument,MutationObserver:FakeMutationObserver,clientesDict:clients,
 location:{href:"https://example.org/admin.html"},URL
},{timeout:1000});
assert.equal(events.observed,2,"Observar actualizaciones del expediente y apertura");
assert.equal(section.children.length,1,"Insertar solo acceso contextual en Servicios");
const row=section.children[0];
assert.equal(row.dataset.gxCalendarEntry,"1");
assert.equal(row.children.length,2);
const button=row.children[1];
button.events.click();
assert.equal(modal.open,true,"Debe abrir el panel dentro de Admin");
assert.equal(modal.name.textContent,"Cliente X2");
assert.equal(modal.content.children.length,1);
const iframe=modal.content.children[0];
const url=new URL(iframe.src);
assert.equal(url.pathname,"/preview/calendario-financiero/index.html");
assert.equal(url.searchParams.get("embedded"),"1");
assert.equal(url.searchParams.get("cliente"),UUID,"Abrir el cliente correcto");
modal.closeButton.events.click();
assert.equal(modal.open,false);
assert.equal(iframe.src,undefined,"Quitar fuente del iframe al cerrar");

// Regresión visual: detalle técnico de X2 oculto hasta abrir la plataforma.
const accessController=readFileSync("assets/js/admin/23-admin-beta-13-access-controller.js","utf8");
const serviceTemplate=readFileSync("assets/js/admin/01-01-inline.js","utf8");
assert(serviceTemplate.includes('class="gx-service-title-toggle"'),"El título del servicio debe abrir el detalle");
assert(serviceTemplate.includes('<details class="gx-service-access-details">'),"Conservar desplegable técnico nativo");
assert(serviceTemplate.indexOf('gx-smart-access-box')>serviceTemplate.indexOf('gx-service-access-details'),"Editor dentro de details");
assert(accessController.includes("box.insertAdjacentHTML('beforebegin',"),"Resumen MÚLTIPLE dentro del desplegable, no en la lista");
assert(!accessController.includes("details?.insertAdjacentHTML('beforebegin',"),"No mostrar resumen fuera de details");
const handlers={};
const listenerStart=accessController.indexOf("document.addEventListener('click',event=>{");
const listenerEnd=accessController.indexOf("    // ---------- Detección visible por plataforma ----------",listenerStart);
assert(listenerStart>=0&&listenerEnd>listenerStart,"Debe existir controlador accesible de clic en el nombre");
vm.runInNewContext(accessController.slice(listenerStart,listenerEnd),{
  document:{addEventListener(type,handler){handlers[type]=handler}}
});
const nativeDetails={open:false};
const titleButton={expanded:"false",closest(sel){
 assert.equal(sel,'.gx-service-compact');
 return {querySelector(q){assert.equal(q,'.gx-service-access-details');return nativeDetails}};
},setAttribute(key,value){if(key==="aria-expanded")this.expanded=value}};
const clickEvent={target:{closest(selector){return selector===".gx-service-title-toggle"?titleButton:null}}};
handlers.click(clickEvent);
assert.equal(nativeDetails.open,true,"Tocar ViX abre detalle");
assert.equal(titleButton.expanded,"true");
handlers.click(clickEvent);
assert.equal(nativeDetails.open,false,"Tocar ViX nuevamente cierra detalle");
handlers.toggle({target:{
 open:true,matches(sel){return sel===".gx-service-access-details"},
 closest(){return {querySelector(){return titleButton}}}
}});
assert.equal(titleButton.expanded,"true","Resumen y nombre del servicio sincronizados");
// iPhone: calendario no comparte columna con el botón General.
assert(page.includes('class="access-date-heading"'),"General va arriba del calendario");
assert(page.includes('Usar fecha general</button></div>'),"Acción General textual y sin superposiciones");
assert(page.includes('height:46px;min-height:46px'),"Altura nativa de control estable");
assert(page.includes('.access-date-row{display:block;'),"Calendario en fila completa");
assert(page.includes('width:100%;min-width:0;max-width:100%'),"El control debe respetar el ancho en móvil");

console.log("GOXION Admin: integración contextual en Servicios, modal y cliente correcto PASS.");
