/* Guardas de configuración y elegibilidad: VM sin DOM/HTTP. El smoke Playwright
   verifica aparte el overlay, navegación, foco y geometría. */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {execFileSync} from "node:child_process";
import vm from "node:vm";

const source=fs.readFileSync("preview/mi-espacio-v2/release-announcement.js","utf8");
const candidateSource=fs.readFileSync("preview/mi-espacio-v2/release-announcement-k3.js","utf8");
const oldVersion="nov2026-novedades-apiladas-v2-todos",version="nov2026-mi-espacio-lanzamiento-v1";
function fixture({enabled=true,mode=enabled?"enabled":"off",account="a",query="",token=true,profile=true,estado="aceptado",deferido=false,modalAbierto=false,blocked=false,dialog=false,priorSeen="",tabDeferred=false,storageUnusable=false,candidate=false}={}){
 const timers=new Map(),listeners=new Map(),local=new Map(),session=new Map();
 if(token)local.set("session","fixture");
 if(priorSeen)local.set("gx-release-seen:"+priorSeen+":"+account,"1");
 if(tabDeferred)session.set("gx-release-deferred:"+version+":"+account,"1");
 let timerId=0,attempts=0,writes=0;
 const storage={getItem:k=>{if(storageUnusable)throw new Error("unavailable");return local.get(k)||null;},setItem:(k,v)=>{writes++;local.set(k,v);}};
 const doc={documentElement:{getAttribute:k=>k==="data-gx-release-launch"?mode:null},
  body:{classList:{contains:()=>false}},readyState:"loading",hidden:false,addEventListener(){},
  querySelector:s=>dialog&&s==="dialog[open]"?{open:true}:null,
  createElement(){attempts++;throw new Error("MOUNT_SENTINEL");}};
 const win={GOXION_CORE:{STORAGE:{CLIENT_TOKEN:"session"}},getCurrentClientKey:()=>account,
  globalClientesData:profile?{[account]:{}}:{},location:{search:query},
  GOXION_LEGAL_V2:{getQueueStatus:()=>({estado,deferido,modalAbierto}),getAccessState:()=>({bloquea_operaciones:blocked})},
  addEventListener:(event,cb)=>listeners.set(event,cb)};
 const context={window:win,document:doc,localStorage:storage,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v)},
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),cancelAnimationFrame(){},console};
 vm.runInNewContext(candidate?candidateSource:source,context);
 const check=()=>{
  win.GOXION_RELEASE_202610.refresh();
  for(const [id,fn] of [...timers]){timers.delete(id);try{fn();}catch(e){if(e.message!=="MOUNT_SENTINEL")throw e;}}
  assert.equal(writes,0,"la elegibilidad no consume novedades");
  return attempts;
 };
 return {check,get version(){return win.GOXION_RELEASE_202610.version;},status:()=>win.GOXION_RELEASE_202610.handoffStatus(),held:()=>win.GOXION_RELEASE_202610.holdsLegalOffer()};
}
test("espejo piloto, aceptación apagada, y oficial promoción exacta",()=>{
 execFileSync(process.execPath,["scripts/build-goxy-mirror-bundle.mjs","--check"]);
 for(const path of ["ayuda-espejo-feed-v2.html","ayuda-aceptacion-v2.html"]){
  const html=fs.readFileSync(path,"utf8");
  assert.ok(html.includes('data-gx-release-launch="'+(path==="ayuda-espejo-feed-v2.html"?"pilot":"off")+'"'));
  assert.equal((html.match(/release-announcement(?:-k3)?\.js\?/g)||[]).length,1);
  assert.equal((html.match(/release-announcement-k3\.js\?/g)||[]).length,path==="ayuda-espejo-feed-v2.html"?1:0);
 }
 const official=fs.readFileSync("ayuda.html","utf8");
 assert.match(official,/<html[^>]+data-gx-release-launch="enabled"/);
 assert.match(official,/preview\/mi-espacio-v2\/goxy-heads-mirror.bundle.js/);
 assert.doesNotMatch(official,/preview\/goxion-ai\/goxy-heads.bundle.js/);
 assert.equal((official.match(/release-announcement\.js\?/g)||[]).length,1);
 assert.doesNotMatch(official,/release-announcement-k3\.js/);
 assert.match(fs.readFileSync("ayuda-espejo-feed-v2.html","utf8"),/preview\/mi-espacio-v2\/goxy-heads-mirror.bundle.js/);
 const off=fixture({enabled:false,query:"?launch=enabled&release-preview=1",priorSeen:oldVersion});
 assert.equal(off.version,oldVersion);assert.equal(off.check(),0);
});
test("F sólo admite sesión y perfil cargados, estado legal elegible y modal libre",()=>{
 for(const input of [{token:false},{profile:false},{estado:"sin_activar"},{estado:"rechazado"},{estado:"error"},
  {modalAbierto:true},{blocked:true},{dialog:true},{storageUnusable:true}]){
  const f=fixture(input);assert.equal(f.version,version);assert.equal(f.check(),0,JSON.stringify(input));
 }
 for(const input of [{},{estado:"pendiente"},{estado:"pendiente",deferido:true}]){
  const f=fixture(input);assert.equal(f.check(),1);
 }
});
test("versión y cuenta vistas; diferido informativo viejo no omite la presentación obligatoria",()=>{
 assert.equal(fixture({priorSeen:oldVersion}).check(),1);
 assert.equal(fixture({priorSeen:version}).check(),0);
 assert.equal(fixture({tabDeferred:true}).check(),1);
});

test("piloto exclusivo para la clave exacta Casone; versión separada, términos y sesión",()=>{
 const pilotVersion="nov2026-mi-espacio-lanzamiento-pilot-v5";
 const c=fixture({mode:"pilot",account:"casone",priorSeen:version});
 assert.equal(c.status(),"ready");assert.equal(c.version,pilotVersion);assert.equal(c.check(),1);
 for(const account of ["a","Casone","casone2",""]){
  const other=fixture({mode:"pilot",account,priorSeen:oldVersion});
  assert.equal(other.status(),"skip");assert.equal(other.version,oldVersion);assert.equal(other.check(),0);
 }
 for(const input of [{token:false},{profile:false},{estado:"rechazado"},{modalAbierto:true},{blocked:true}]){
  assert.equal(fixture({mode:"pilot",account:"casone",...input}).status(),"skip");
 }
 assert.equal(fixture({mode:"pilot",account:"casone",estado:"sin_activar"}).status(),"waiting");
 const pending=fixture({mode:"pilot",account:"casone",estado:"pendiente"});
 assert.equal(pending.status(),"ready");assert.equal(pending.check(),1);assert.equal(pending.held(),true);
 assert.equal(fixture({mode:"pilot",account:"b",estado:"pendiente"}).held(),false);
 assert.equal(fixture({mode:"off",account:"casone",estado:"pendiente"}).held(),false);
 assert.equal(fixture({mode:"pilot",account:"casone",estado:"rechazado"}).held(),false);
 assert.equal(fixture({mode:"pilot",account:"casone",estado:"pendiente",modalAbierto:true}).held(),false);
 const deferred=fixture({mode:"pilot",account:"casone",estado:"pendiente",deferido:true});
 assert.equal(deferred.status(),"ready");assert.equal(deferred.check(),1);assert.equal(deferred.held(),false);
 assert.equal(fixture({mode:"pilot",account:"casone",dialog:true}).status(),"waiting");
 assert.equal(fixture({mode:"pilot",account:"casone",estado:"pendiente",deferido:true,blocked:true}).status(),"skip");
});


test("edición oficial: reserva legal sólo durante novedades pendientes y cuenta elegible",()=>{
 const pending=fixture({mode:"enabled",account:"ordinary",estado:"pendiente"});
 assert.equal(pending.status(),"ready");assert.equal(pending.held(),true);
 assert.equal(pending.check(),1);
 assert.equal(fixture({mode:"enabled",estado:"pendiente",priorSeen:version}).held(),false);
 assert.equal(fixture({mode:"enabled",estado:"pendiente",modalAbierto:true}).held(),false);
 assert.equal(fixture({mode:"enabled",estado:"pendiente",deferido:true}).held(),false);
 assert.equal(fixture({mode:"enabled",estado:"pendiente",blocked:true}).held(),false);
});

test("K3 conserva gate de edición, identidad y cola legal en el candidato",()=>{
 const p={candidate:true,mode:"pilot",account:"casone"};
 const active=fixture(p);
 assert.equal(active.status(),"ready");
 assert.equal(active.version,"nov2026-mi-espacio-lanzamiento-pilot-k3b");
 assert.equal(active.check(),1);
 assert.equal(fixture({...p,estado:"pendiente"}).held(),true);
 for(const changes of [{token:false},{profile:false},{estado:"rechazado"},{blocked:true},{modalAbierto:true},{account:"Casone"},{account:"otro"}])
   assert.equal(fixture({...p,...changes}).status(),"skip");
 assert.equal(fixture({...p,estado:"sin_activar"}).status(),"waiting");
 assert.equal(fixture({...p,dialog:true}).status(),"waiting");
});
