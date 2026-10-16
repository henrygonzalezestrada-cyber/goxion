import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {join,dirname} from "node:path";
import {fileURLToPath} from "node:url";
const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const html=readFileSync(join(root,"ayuda.html"),"utf8");
const launch=readFileSync(join(root,"assets/js/ayuda/20-release-announcement.js"),"utf8");
const css=readFileSync(join(root,"assets/css/goxion-release-oct2026.css"),"utf8");
const login=readFileSync(join(root,"assets/js/ayuda/02-client-supabase-layer.js"),"utf8");
const goxy=readFileSync(join(root,"preview/goxion-ai/mascota.js"),"utf8");
const preview=readFileSync(join(root,"preview/goxion-ai/index.html"),"utf8");
const sources=[
 "goxy-heads.bundle.js","goxy-support-knowledge.js","goxy-client-context.js",
 "goxy-access-routing.js","goxy-whatsapp-handoff.js","goxy-ai-client.js",
 "goxy-payment-read.js","mascota.js"
];
let last=-1;
for(const name of sources){
 const src="./preview/goxion-ai/"+name+"?v=official-f17";
 const pos=html.indexOf(src);
 assert.ok(pos>last,"Orden de dependencias oficiales incorrecto: "+name);
 last=pos;
}
assert.ok(html.includes("mascota.css?v=official-f17"));
assert.ok(html.includes("20-release-announcement.js?v=launch1"));
assert.ok(!html.includes('iframe id="gxai-app"'),"El Soporte oficial no usa iframe");
assert.ok(goxy.includes("if (!section || !card || card.classList.contains('gxai-card')) return;"),
 "Goxy debe ser idempotente por documento");
assert.ok(preview.includes("if (win.GOXION_AI_BETA && doc.querySelector('#view-soporte .gxai-card'))"),
 "El enlace beta evita un segundo asistente");
assert.equal(login.match(/goxion:client-ready/g)?.length,2,
 "Sesión restaurada y login validado disparan anuncio");
assert.ok(login.includes("goxion:client-logout"));
assert.ok(css.includes(".gx-release-sheet")&&css.includes("overscroll-behavior:contain"));
assert.ok(launch.includes("Goxy, tu asistente")&&
 launch.includes("distintas fechas")&&launch.includes("Notificaciones")&&
 launch.includes("Promociones")&&launch.includes("Prórrogas")&&
 launch.includes("Misiones"));

class FakeEl{
 constructor(tag="div"){
  this.tag=tag;this.listeners={};this.attrs={};this.style={position:"",top:"",width:""};
  this.hidden=true;this.isConnected=true;this.children=[];
  this.classes=new Set();this.classList={add:(n)=>this.classes.add(n),
   remove:(n)=>this.classes.delete(n),contains:(n)=>this.classes.has(n)};
 }
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 click(){this.listeners.click?.forEach(fn=>fn({target:this}))}
 focus(){document.activeElement=this}
 setAttribute(k,v){this.attrs[k]=v}
 appendChild(el){this.children.push(el)}
 querySelector(sel){return this.controls?.[sel]||null}
 get innerHTML(){return this.html||""}
 set innerHTML(html){this.html=html;this.controls={
  ".gx-release-close":new FakeEl("button"),
  ".gx-release-primary":new FakeEl("button")
 }}
}
let current="",signedIn=false,scrollValue=42,created=0;
const local=new Map(),tasks=new Map();let counter=0;
const localStorage={
 getItem:k=>k==="clientToken"?(signedIn?"signed-token":null):local.get(k)||null,
 setItem:(k,v)=>local.set(k,String(v))
};
const document={
 hidden:false,activeElement:null,
 body:new FakeEl("body"),
 getElementById:id=>id==="splash-screen"?{style:{visibility:"hidden"}}:null,
 querySelector:()=>null,
 createElement:(tag)=>{created++;return new FakeEl(tag)},
 addEventListener(type,cb){(this.listeners??={})[type]=cb}
};
const handlers={};
const window={
 GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"clientToken"}},
 getCurrentClientKey:()=>current,scrollY:scrollValue,
 scrollTo:(_x,y)=>{scrollValue=y;window.scrollY=y},
 addEventListener:(type,fn)=>{(handlers[type]??=[]).push(fn)}
};
const users={a:{},b:{}};
const schedule=(fn)=>{const id=++counter;tasks.set(id,fn);return id};
const clear=(id)=>tasks.delete(id);
new Function("window","document","localStorage","globalClientesData","setTimeout","clearTimeout",launch)(
 window,document,localStorage,users,schedule,clear);
const emit=type=>(handlers[type]||[]).forEach(fn=>fn({}));
const flush=(max=20)=>{
 let n=0;while(tasks.size&&n++<max){const [id,fn]=tasks.entries().next().value;tasks.delete(id);fn();}
 assert.ok(n<max,"Loop de UI indefinido");
};
emit("goxion:client-ready");flush();
assert.equal(created,0,"No popup para invitados");
current="a";signedIn=true;
emit("goxion:client-ready");flush();
const overlay=document.body.children[0];
assert.ok(overlay&&!overlay.hidden,"El primer cliente recibe popup");
assert.equal(document.body.style.position,"fixed","Fondo fijo en Safari");
assert.ok(overlay.innerHTML.includes("Prórrogas y beneficios más transparentes"));
overlay.querySelector(".gx-release-primary").click();
assert.ok(overlay.hidden,"CTA cierra");
assert.equal(document.body.style.position,"","Restaura fondo");
assert.equal(scrollValue,42,"Restaura posición");
assert.ok([...local].some(([k,v])=>k.includes(":a")&&v==="1"),"Marca leído por cliente");
emit("goxion:client-ready");flush();
assert.equal(overlay.hidden,true,"No reaparece en cada ingreso del mismo cliente");
current="b";emit("goxion:client-ready");flush();
assert.equal(overlay.hidden,false,"Segundo cliente del mismo navegador también lo ve");
emit("goxion:client-logout");flush();
assert.equal(overlay.hidden,true,"Logout cancela popup");
assert.ok(![...local].some(([k])=>k.includes(":b")),"Logout no confirma vista");
current="b";signedIn=true;emit("goxion:client-ready");flush();
assert.equal(overlay.hidden,false,"Se puede reintentar si cerró sesión antes de aceptar");
overlay.querySelector(".gx-release-close").click();
assert.ok([...local].some(([k])=>k.includes(":b")),"Cerrar marca versión como vista");
console.log("GOXION Goxy F17 oficial + anuncio por cliente: PASS");
