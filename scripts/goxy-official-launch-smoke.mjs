import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(join(root,path),"utf8");
const html=read("ayuda.html");
const news=read("assets/js/ayuda/20-release-announcement.js");
const legal=read("assets/js/ayuda/21-legal-v2-documents.js");
const css=read("assets/css/goxion-release-v2.css");
const login=read("assets/js/ayuda/02-client-supabase-layer.js");
const goxy=read("preview/goxion-ai/mascota.js");
const preview=read("preview/goxion-ai/index.html");
const sources=[
 "goxy-heads.bundle.js","goxy-support-knowledge.js","goxy-client-context.js",
 "goxy-access-routing.js","goxy-whatsapp-handoff.js","goxy-ai-client.js",
 "goxy-payment-read.js","mascota.js"
];
let last=-1;
for(const name of sources){
 const location="./preview/goxion-ai/"+name+"?v=official-f17";
 const pos=html.indexOf(location);
 assert.ok(pos>last,"Orden de GOXY incorrecto: "+name);
 last=pos;
}
assert.ok(html.includes("mascota.css?v=official-f17"));
assert.ok(html.includes("goxion-release-v2.css?v=oficial-v1"));
assert.ok(html.includes("20-release-announcement.js?v=oficial-v1"));
assert.ok(html.includes("21-legal-v2-documents.js?v=cola-v1"));
assert.ok(!html.includes("avisos-apilados-beta"));
assert.ok(!html.includes('iframe id="gxai-app"'));
assert.ok(goxy.includes("if (!section || !card || card.classList.contains('gxai-card')) return;"));
assert.ok(preview.includes("if (win.GOXION_AI_BETA && doc.querySelector('#view-soporte .gxai-card'))"));
assert.equal(login.match(/goxion:client-ready/g)?.length,2);
assert.ok(login.includes("goxion:client-logout"));
assert.ok(css.includes(".gx-release-v2-card")&&css.includes("overscroll-behavior:contain"));
assert.ok(css.includes("mask-image:linear-gradient")&&css.includes(".gx-release-stack-peek"));
assert.equal((news.match(/title:"/g)||[]).length,6,"Deben mostrarse las seis novedades");
assert.ok(news.includes("autoPosition=(autoPosition+elapsed*0.030)%loopHeight"));
assert.ok(news.includes("scroll.scrollTop=Math.floor(autoPosition)"));
assert.ok(news.includes('scroll.addEventListener("touchstart",claim'));
assert.ok(news.includes('scroll.querySelectorAll("[data-gx-release-clone]").forEach(node=>node.remove())'));
assert.ok(legal.includes('new CustomEvent("goxion:legal-opened"'));
assert.ok(legal.includes('new CustomEvent("goxion:legal-dismissed"'));
assert.ok(legal.includes("if(serverState?.estado===\"pendiente\"&&token())postpone();"));
assert.ok(news.includes('const VERSION="nov2026-novedades-apiladas-v1"'));

// Prueba de flujo con DOM reducido: toda la sesión es informativa.
// Nunca se registra una decisión legal desde el módulo de novedades.
class FakeElement{
 constructor(tag="div"){
  this.tag=tag;this.hidden=true;this.isConnected=true;this.style={};
  this.attrs={};this.listeners={};this.children=[];this.offsetHeight=130;
  this.clientHeight=320;this.scrollHeight=1500;this.scrollTop=0;this.dataset={};
  const set=new Set();
  this.classList={add:n=>set.add(n),remove:n=>set.delete(n),contains:n=>set.has(n)};
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 setAttribute(k,v){this.attrs[k]=v}
 focus(){document.activeElement=this}
 append(e){this.children.push(e)}
 remove(){this._removed=true}
 cloneNode(){return new FakeElement(this.tag)}
 querySelector(selector){return this.controls?.[selector]||null}
 querySelectorAll(selector){
  if(selector.includes("gx-release-v2-item:not"))return this.originalItems??[];
  if(selector==="[data-gx-release-clone]")return this.children.filter(x=>x.dataset.gxReleaseClone&&!x._removed);
  return [];
 }
 get innerHTML(){return this.html||""}
 set innerHTML(value){
  this.html=value;
  if(this.tag==="div"&&value.includes("gx-release-v2-card")){
   const scroller=new FakeElement("div");
   scroller.originalItems=Array.from({length:6},()=>new FakeElement("article"));
   const close=new FakeElement("button"),cta=new FakeElement("button");
   this.controls={".gx-release-v2-scroll":scroller};
   this.actions={close,cta};
  }
 }
}
let current="",signedIn=false,state={estado:"aceptado",deferido:false,modalAbierto:false};
const local=new Map(),timeouts=new Map(),frames=new Map();
let uid=0,scrollValue=35;
const localStorage={
 getItem:key=>key==="clientToken"?(signedIn?"session-token":null):local.get(key)||null,
 setItem:(key,value)=>local.set(key,String(value))
};
const document={
 hidden:false,readyState:"complete",activeElement:null,body:new FakeElement("body"),
 querySelector:()=>null,
 createElement:tag=>new FakeElement(tag),
 addEventListener(){}
};
const handlers={};
const window={
 GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"clientToken"}},
 GOXION_LEGAL_V2:{getQueueStatus:()=>state},
 globalClientesData:{a:{},b:{}},
 getCurrentClientKey:()=>current,scrollY:scrollValue,
 scrollTo:(_x,y)=>{scrollValue=y;window.scrollY=y},
 matchMedia:()=>({matches:false}),
 addEventListener:(event,fn)=>{(handlers[event]??=[]).push(fn)}
};
const setTimeout=fn=>{const id=++uid;timeouts.set(id,fn);return id};
const clearTimeout=id=>timeouts.delete(id);
const requestAnimationFrame=fn=>{const id=++uid;frames.set(id,fn);return id};
const cancelAnimationFrame=id=>frames.delete(id);
new Function(
 "window","document","localStorage","setTimeout","clearTimeout",
 "requestAnimationFrame","cancelAnimationFrame",news
)(window,document,localStorage,setTimeout,clearTimeout,requestAnimationFrame,cancelAnimationFrame);
const emit=event=>(handlers[event]||[]).forEach(fn=>fn({detail:{estado:state.estado}}));
function flush(n=4){
 for(let i=0;i<n&&timeouts.size;i++){
   const [id,fn]=timeouts.entries().next().value;timeouts.delete(id);fn();
 }
}
emit("goxion:client-ready");flush();
assert.equal(document.body.children.length,0,"Invitados sin avisos");
current="a";signedIn=true;
emit("goxion:client-ready");flush(2);
const overlay=document.body.children[0];
assert.ok(overlay&&!overlay.hidden,"Cuenta A recibe novedades");
assert.ok(overlay.innerHTML.includes("Goxy, tu asistente"));
assert.ok(overlay.innerHTML.includes("Misiones, cupones y opiniones"));
assert.ok(document.body.classList.contains("gx-release-v2-body-lock"));
window.GOXION_RELEASE_202610.close();
assert.ok(overlay.hidden,"Botón de cierre cierra novedades");
assert.ok([...local].some(([k,v])=>k.endsWith(":a")&&v==="1"),"Solo noticias quedan leídas");
emit("goxion:client-ready");flush(2);
assert.ok(overlay.hidden,"No repetir las novedades a A");
current="b";emit("goxion:client-ready");flush(2);
assert.ok(!overlay.hidden,"Cuenta B recibe su aviso independiente");
emit("goxion:client-logout");flush(1);
assert.ok(overlay.hidden,"Cerrar sesión cierra el aviso");
assert.ok(![...local.keys()].some(k=>k.endsWith(":b")),"Logout no marca visto");
state={estado:"pendiente",deferido:false,modalAbierto:false};
emit("goxion:client-ready");flush(2);
assert.ok(overlay.hidden,"Términos obligatorios se priorizan");
state={estado:"pendiente",deferido:true,modalAbierto:false};
emit("goxion:legal-dismissed");flush(2);
assert.ok(!overlay.hidden,"Al posponer términos aparece novedades");
window.GOXION_RELEASE_202610.close();
assert.ok([...local.keys()].some(k=>k.endsWith(":b")));
assert.equal(scrollValue,35,"Restaurar posición del documento");
console.log("GOXION Goxy F17 + avisos oficiales apilados: PASS");
