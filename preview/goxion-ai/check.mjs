// GOXION · Goxy F5 · contratos y simulaciones sin clientes reales ni red.
// Ejecutar: node preview/goxion-ai/check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root=dirname(fileURLToPath(import.meta.url));
const js=readFileSync(join(root,'mascota.js'),'utf8');
const css=readFileSync(join(root,'mascota.css'),'utf8');
const html=readFileSync(join(root,'index.html'),'utf8');
const entry=readFileSync(join(root,'goxy-heads-entry.js'),'utf8');
new Function('window','document','localStorage','performance','setTimeout','clearTimeout',js);
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'loader HTML no encontrado');
new Function(inline);
for(const required of ['.gxai-canvas-slot','gxai-border-sweep','prefers-reduced-motion','touch-action:none','.gxai-typing','.gxai-composer','.gxai-chat-phase','gxai-message-input'])
  assert.ok(css.includes(required), 'Falta CSS '+required);
assert.ok(entry.includes('from "robot-heads"')&&entry.includes('shape:"rectangle"'), 'Usar renderer MIT original');
assert.ok(!js.includes('gxai-open-icon')&&!js.includes('↗'),'El CTA no debe tener el globo ni flecha');
assert.ok(js.includes('gxai-open-signal')&&css.includes('.gxai-open-balance'),'Conservar el CTA F4');
assert.ok(!js.includes('<linearGradient'),'No regresar al SVG plano');
assert.ok(js.includes('event.stopPropagation()')&&js.includes('capture: true'),'No regresar al poke feliz automático');
assert.ok(!js.includes('fetch(')&&!js.includes('XMLHttpRequest'),'La demo no realiza solicitudes HTTP');
assert.ok(!html.includes('https://api.'),'No incluir endpoints externos');
assert.ok(html.includes('mascota.js?v=goxy-f5'),'Versionar la beta F5');

class Element {
  constructor(name) {
    this.name=name;this.children=[];this.handlers={};this.states=new Set();this.attrs={};
    this.dataset={};this.disabled=false;this.value='';this.textContent='';this.innerHTML='';this.isConnected=true;
    this.style={overflow:'',setProperty:(k,v)=>this.style[k]=v};
    this.classList={
      contains:k=>this.states.has(k),
      add:(...a)=>a.forEach(x=>this.states.add(x)),
      remove:(...a)=>a.forEach(x=>this.states.delete(x))
    };
  }
  append(...nodes){nodes.forEach(n=>this.appendChild(n));}
  appendChild(node){this.children.push(node);node.parent=this;return node;}
  remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
  get childElementCount(){return this.children.length;}
  addEventListener(type,fn){(this.handlers[type] ||= []).push(fn);}
  fire(type,props={}){this.handlers[type]?.forEach(fn=>fn({preventDefault(){},stopPropagation(){},...props}));}
  setAttribute(name,value){this.attrs[name]=value;}
  focus(){doc.activeElement=this;}
  querySelector(sel) {
    if(this.name==='hero')return ({
      '.gxai-mascot-button':mascotButton,'.gxai-open':openButton,
      '.gxai-reactions':hearts,'.gxai-pet-status':petStatus
    })[sel]||null;
    if(this.name==='layer')return ({
      '.gxai-chat-scroll':scroll,'.gxai-chat':dialog,'.gxai-close':closeButton,
      '.gxai-backdrop':backdrop,'.gxai-chat-phase':phase,
      '.gxai-composer':composer,'.gxai-message-input':input,'.gxai-send':send
    })[sel]||null;
    return null;
  }
  querySelectorAll(sel) {
    if(this.name==='support'&&sel==='.gxai-mascot')return [robotHero,robotAvatar];
    if(this.name==='layer'&&sel==='.gxai-suggestion')return [btnAccess,btnAccount,btnCode,btnError];
    if(this.name==='dialog'&&sel.startsWith('button'))return [closeButton];
    return [];
  }
}
const mascotButton=new Element('mascotButton'),openButton=new Element('openButton');
const hearts=new Element('hearts'),petStatus=new Element('petStatus');
const robotHero=new Element('robotHero'),robotAvatar=new Element('robotAvatar');
const scroll=new Element('scroll'),dialog=new Element('dialog'),closeButton=new Element('closeButton');
const backdrop=new Element('backdrop'),phase=new Element('phase'),composer=new Element('composer');
const input=new Element('input'),send=new Element('send');
const btnAccess=new Element('access'),btnAccount=new Element('account'),btnCode=new Element('code'),btnError=new Element('error');
btnAccess.dataset.prompt='acceso';btnAccount.dataset.prompt='cuenta';
btnCode.dataset.prompt='codigo';btnError.dataset.prompt='error';
mascotButton.setPointerCapture=()=>{};
const section=new Element('support'),card=new Element('card');
section.querySelector=()=>null;
let created=0;
const doc={
  createElement(name){created++;return new Element(created===2?'hero':created===3?'layer':name);},
  getElementById(id){return ({'view-soporte':section,'smart-support-card':card})[id]||null;},
  querySelectorAll:()=>[],addEventListener:()=>{},
  documentElement:new Element('html'),body:new Element('body'),activeElement:null
};
let authed=true, reduced=false, authOpens=0, mounts=0;
const win={
  GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'demo-token'}},
  getCurrentClientKey:()=>authed?'test-client':'',
  GOXY_ROBOT:{mountAll:()=>mounts++},
  matchMedia:()=>({matches:reduced}),
  openAuthSheet:()=>authOpens++,
  addEventListener:()=>{}
};
const store={getItem:()=>authed?'fake-token':''};
const timers=new Map();let nextTimer=0;
function schedule(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id;}
function unschedule(id){timers.delete(id);}
function runNext(){
  const item=[...timers.entries()].sort((a,b)=>a[1].ms-b[1].ms||a[0]-b[0])[0];
  assert.ok(item,'No hay paso programado');
  timers.delete(item[0]);item[1].fn();
}
function flush(max=30){
  let i=0;while(timers.size&&i++<max)runNext();
  assert.ok(i<=max,'Ciclo infinito de timers');
}
new Function('window','document','localStorage','performance','setTimeout','clearTimeout',js)(
  win,doc,store,{now:()=>2100},schedule,unschedule
);
const layer=section.children.at(-1);
const api=win.GOXION_AI_BETA;
assert.ok(api,'Goxy no inició');assert.equal(mounts,1,'Render original no montó');
const pointer=(x,y,id=1)=>({isPrimary:true,pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0});
const clickDemo=button=>layer.fire('click',{target:{closest:selector=>selector==='.gxai-suggestion'?button:null}});
function doTap(i){mascotButton.fire('pointerdown',pointer(100,110,100+i));mascotButton.fire('pointerup',pointer(100,110,100+i));}
doTap(0);
const cycle=['happy','searching','listening','working','thinking','speaking','sleeping'];
const seen=[robotHero.attrs['data-mood']];
for(let i=1;i<cycle.length;i++){doTap(i);seen.push(robotHero.attrs['data-mood']);}
assert.deepEqual(seen,cycle,'Los siete toques deben ser distintos');
assert.equal(layer.classList.contains('gxai-visible'),false,'Tocar no abre chat');
mascotButton.fire('pointerdown',pointer(100,110,202));
mascotButton.fire('pointermove',pointer(151,112,202));
mascotButton.fire('pointerup',pointer(155,113,202));
assert.equal(robotHero.attrs['data-mood'],'love');
assert.ok(hearts.childElementCount,'Una caricia muestra corazones');
mascotButton.fire('click',{detail:0});
assert.equal(robotHero.attrs['data-mood'],'happy','Gesto de teclado preservado');

// Abrir ⇒ breve alegría ⇒ escucha. Sin autoenfocar el campo ni abrir el teclado.
openButton.fire('click');
assert.equal(layer.classList.contains('gxai-visible'),true);
assert.equal(api.chatState(),'happy');
assert.equal(doc.activeElement,dialog,'Foco inicial sobre diálogo, no la X ni input');
flush();
assert.equal(api.chatState(),'listening');
assert.equal(robotAvatar.attrs['data-mood'],'listening');

// Simulación de acceso ⇒ pensando → búsqueda → hablando → feliz → escucha.
clickDemo(btnAccess);
assert.equal(api.chatState(),'thinking');
assert.equal(input.disabled,true,'Bloquear mensajes simultáneos');
assert.equal(btnCode.disabled,true,'Bloquear opciones simultáneas');
assert.ok(scroll.children.some(x=>x.name==='div'),'Mostrar animación de carga');
runNext();assert.equal(api.chatState(),'searching');
runNext();assert.equal(api.chatState(),'speaking');
runNext();assert.equal(api.chatState(),'happy');
runNext();assert.equal(api.chatState(),'listening');
assert.equal(input.disabled,false);
assert.equal(btnCode.disabled,false);

// Flujo de error simulado: ojos X y regreso a escucha.
clickDemo(btnError);
assert.equal(api.chatState(),'thinking');
runNext();assert.equal(api.chatState(),'working');
runNext();assert.equal(api.chatState(),'error');
runNext();assert.equal(api.chatState(),'error');
runNext();assert.equal(api.chatState(),'listening');

// Mensaje escrito: contenido solo en DOM, sin peticiones de red.
input.value='¿Me ayudas a revisar un servicio?';
composer.fire('submit');
assert.equal(input.value,'');
assert.equal(api.chatState(),'thinking');
flush();
assert.equal(api.chatState(),'listening');

// Cerrar en mitad de la búsqueda debe cancelar respuesta, timer y estado.
clickDemo(btnAccount);
assert.equal(api.chatState(),'thinking');
closeButton.fire('click');
assert.equal(layer.classList.contains('gxai-visible'),false);
assert.equal(api.chatState(),'idle');
const afterCancel=scroll.children.length;
assert.equal(timers.size,0,'No dejar temporizadores después de cerrar');
flush();
assert.equal(scroll.children.length,afterCancel,'No aparece respuesta tras cerrar');

// Sesión inválida mientras se procesa: cerrar sin entregar respuesta.
openButton.fire('click');
flush();
clickDemo(btnCode);
authed=false;
runNext();
assert.equal(layer.classList.contains('gxai-visible'),false);
assert.equal(scroll.children.some(x=>x.name==='div'&&x.isConnected&&x.className==='gxai-typing'),false,'Indicador de carga eliminado al perder sesión');
const afterExpiry=scroll.children.length;
flush();
assert.equal(scroll.children.length,afterExpiry,'No responder después de expirar sesión');
openButton.fire('click');
assert.equal(authOpens,1,'Cliente sin sesión debe dirigirse a autenticación');

// Accesibilidad: reduced-motion no crea corazones.
authed=true;reduced=true;
const heartCount=hearts.childElementCount;
mascotButton.fire('pointerdown',pointer(100,110,220));
mascotButton.fire('pointermove',pointer(180,114,220));
mascotButton.fire('pointerup',pointer(182,114,220));
assert.equal(hearts.childElementCount,heartCount);
console.log('GOXION Goxy F5: estados de chat, error, cancelación, sesión, gestos F4 y CTA PASS (datos simulados).');
