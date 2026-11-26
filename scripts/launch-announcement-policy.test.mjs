/* Guardas de configuración y elegibilidad: VM sin DOM/HTTP. El smoke Playwright
   verifica aparte el overlay, navegación, foco y geometría. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("assets/js/ayuda/20-release-announcement.js","utf8");
const oldVersion="nov2026-novedades-apiladas-v2-todos",version="nov2026-mi-espacio-lanzamiento-v1";
function fixture({enabled=true,query="",token=true,profile=true,estado="aceptado",deferido=false,modalAbierto=false,blocked=false,dialog=false,priorSeen="",tabDeferred=false,storageUnusable=false}={}){
 const timers=new Map(),listeners=new Map(),local=new Map(),session=new Map();
 if(token)local.set("session","fixture");
 if(priorSeen)local.set("gx-release-seen:"+priorSeen+":a","1");
 if(tabDeferred)session.set("gx-release-deferred:"+version+":a","1");
 let timerId=0,attempts=0,writes=0;
 const storage={getItem:k=>{if(storageUnusable)throw new Error("unavailable");return local.get(k)||null;},setItem:(k,v)=>{writes++;local.set(k,v);}};
 const doc={documentElement:{getAttribute:k=>k==="data-gx-release-launch"?(enabled?"enabled":"off"):null},
  body:{classList:{contains:()=>false}},readyState:"loading",hidden:false,addEventListener(){},
  querySelector:s=>dialog&&s==="dialog[open]"?{open:true}:null,
  createElement(){attempts++;throw new Error("MOUNT_SENTINEL");}};
 const win={GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"session"}},getCurrentClientKey:()=>"a",
  globalClientesData:profile?{a:{}}:{},location:{search:query},
  GOXION_LEGAL_V2:{getQueueStatus:()=>({estado,deferido,modalAbierto}),getAccessState:()=>({bloquea_operaciones:blocked})},
  addEventListener:(event,cb)=>listeners.set(event,cb)};
 const context={window:win,document:doc,localStorage:storage,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),cancelAnimationFrame(){},console};
 vm.runInNewContext(source,context);
 const check=()=>{
  win.GOXION_RELEASE_202610.refresh();
  for(const [id,fn] of [...timers]){timers.delete(id);try{fn();}catch(e){if(e.message!=="MOUNT_SENTINEL")throw e;}}
  assert.equal(writes,0,"la elegibilidad no consume novedades");
  return attempts;
 };
 return {check,version:win.GOXION_RELEASE_202610.version};
}
test("espejo y aceptación conservan edición desactivada; oficial sin opt-in",()=>{
 for(const path of ["ayuda-espejo-feed-v2.html","ayuda-aceptacion-v2.html"]){
  const html=fs.readFileSync(path,"utf8");
  assert.match(html,/<html[^>]+data-gx-release-launch="off"/);
  assert.equal((html.match(/20-release-announcement\.js\?/g)||[]).length,1);
 }
 assert.doesNotMatch(fs.readFileSync("ayuda.html","utf8"),/<html[^>]+data-gx-release-launch="enabled"/);
 const off=fixture({enabled:false,query:"?launch=enabled&release-preview=1",priorSeen:oldVersion});
 assert.equal(off.version,oldVersion);assert.equal(off.check(),0);
});
test("F sólo admite sesión y perfil cargados, estado legal elegible y modal libre",()=>{
 for(const input of [{token:false},{profile:false},{estado:"sin_activar"},{estado:"rechazado"},{estado:"error"},
  {estado:"pendiente"},{modalAbierto:true},{blocked:true},{dialog:true},{storageUnusable:true}]){
  const f=fixture(input);assert.equal(f.version,version);assert.equal(f.check(),0,JSON.stringify(input));
 }
 for(const input of [{},{estado:"pendiente",deferido:true}]){
  const f=fixture(input);assert.equal(f.check(),1);
 }
});
test("versión y cuenta vistas; X diferida de esta pestaña no consume versión",()=>{
 assert.equal(fixture({priorSeen:oldVersion}).check(),1);
 assert.equal(fixture({priorSeen:version}).check(),0);
 assert.equal(fixture({tabDeferred:true}).check(),0);
});
