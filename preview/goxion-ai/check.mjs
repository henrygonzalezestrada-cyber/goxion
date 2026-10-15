// GOXION · Goxy F2 · prueba de unidad sin APIs, clientes ni red.
// Ejecutar: node preview/goxion-ai/check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const js = readFileSync(join(root, 'mascota.js'), 'utf8');
const css = readFileSync(join(root, 'mascota.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
new Function('window','document','localStorage','performance','setTimeout','clearTimeout',js);
for (const needle of ['.gxai-canvas-slot','gxai-border-sweep','prefers-reduced-motion','touch-action:none']) {
  assert.ok(css.includes(needle), 'Falta estilo: '+needle);
}
assert.ok(!html.includes('https://api.'), 'Preview no debe llamar una API');
assert.ok(!js.includes('↗'), 'No dejar flecha en el CTA');
assert.ok(js.includes('gxai-canvas-slot') && !js.includes('<linearGradient'), 'Usar Canvas original, no el SVG plano.');
const entry=readFileSync(join(root,'goxy-heads-entry.js'),'utf8');
assert.ok(entry.includes('from "robot-heads"'), 'Debe importar el motor original.');
assert.ok(entry.includes('shape:"rectangle"'), 'Debe usar la cabeza rectangular de referencia.');

class Element {
  constructor(name) {
    this.name=name; this.children=[]; this.handlers={}; this.states=new Set(); this.attrs={};
    this.style={overflow:'',setProperty:(k,v)=>this.style[k]=v}; this.dataset={}; this.isConnected=true;
    this.classList={
      contains:v=>this.states.has(v),
      add:(...xs)=>xs.forEach(v=>this.states.add(v)),
      remove:(...xs)=>xs.forEach(v=>this.states.delete(v))
    };
  }
  append(...nodes){nodes.forEach(x=>this.appendChild(x));}
  appendChild(node){this.children.push(node);return node;}
  remove(){this.isConnected=false;}
  get childElementCount(){return this.children.length;}
  addEventListener(event,fn){(this.handlers[event] ||= []).push(fn);}
  fire(name,props={}){this.handlers[name]?.forEach(fn=>fn({preventDefault(){},stopPropagation(){},...props}));}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){doc.activeElement=this;}
  querySelector(selector) {
    const hero={'.gxai-mascot-button':mascotButton,'.gxai-open':chatButton,'.gxai-reactions':hearts,'.gxai-pet-status':status};
    const layer={'.gxai-chat-scroll':messages,'.gxai-chat':dialog,'.gxai-close':close,'.gxai-backdrop':backdrop};
    return this.name==='hero'?hero[selector]||null:this.name==='layer'?layer[selector]||null:null;
  }
  querySelectorAll(selector) {
    if(this.name==='support'&&selector==='.gxai-mascot')return [bigMascot,smallMascot];
    if(this.name==='dialog'&&selector.startsWith('button'))return [close];
    return [];
  }
}
const mascotButton=new Element('mascotButton'),chatButton=new Element('chatButton'),hearts=new Element('hearts'),status=new Element('status'),messages=new Element('messages'),dialog=new Element('dialog'),close=new Element('close'),backdrop=new Element('backdrop'),bigMascot=new Element('bigMascot'),smallMascot=new Element('smallMascot'),section=new Element('support'),card=new Element('card');
mascotButton.setPointerCapture=()=>{};
section.querySelector=()=>null;
let creations=0;
const doc={
  createElement(name){creations++;return new Element(creations===2?'hero':creations===3?'layer':name);},
  getElementById:id=>({'view-soporte':section,'smart-support-card':card})[id],
  querySelectorAll:()=>[],addEventListener:()=>{},activeElement:null,
  documentElement:new Element('html'),body:new Element('body')
};
let hasToken=true, reduced=false, authOpenCount=0, mounted=0;
const win={
  GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'token'}},
  GOXY_ROBOT:{mountAll:()=>{mounted++;}},
  getCurrentClientKey:()=> 'test-client',
  matchMedia:()=>({matches:reduced}),
  openAuthSheet:()=>{authOpenCount++;},
  addEventListener:()=>{}
};
const store={getItem:()=>hasToken?'fake-token':''};
let timer=0;
new Function('window','document','localStorage','performance','setTimeout','clearTimeout',js)(
  win,doc,store,{now:()=>1800},()=>++timer,()=>{}
);
const layer=section.children.at(-1);
assert.ok(win.GOXION_AI_BETA, 'Goxy no se inicializó');
assert.equal(mounted,1,'Canvas original debe montarse después del diálogo');
const p=(x,y,id=1)=>({isPrimary:true,pointerType:'touch',pointerId:id,button:0,clientX:x,clientY:y});

// Tocar Goxy: expresión, nunca chat.
mascotButton.fire('pointerdown',p(100,110));
mascotButton.fire('pointerup',p(100,110));
assert.equal(bigMascot.attrs['data-mood'],'happy');
assert.equal(layer.classList.contains('gxai-visible'),false);

// Caricia lenta y caricia de un único fotograma (iOS) ⇒ corazones.
mascotButton.fire('pointerdown',p(100,110,2));
mascotButton.fire('pointermove',p(157,112,2));
mascotButton.fire('pointerup',p(160,112,2));
assert.equal(bigMascot.attrs['data-mood'],'love');
assert.ok(hearts.childElementCount>0);
assert.equal(layer.classList.contains('gxai-visible'),false);
mascotButton.fire('pointerdown',p(90,90,3));
mascotButton.fire('pointerup',p(188,95,3));
assert.equal(bigMascot.attrs['data-mood'],'love');

// Teclado también hace gesto; solo CTA abre chat.
mascotButton.fire('click',{detail:0});
assert.equal(bigMascot.attrs['data-mood'],'wink');
chatButton.fire('click');
assert.equal(layer.classList.contains('gxai-visible'),true);
assert.equal(doc.activeElement,dialog);
close.fire('click');
assert.equal(layer.classList.contains('gxai-visible'),false);

// Sesión ausente: no se abre chat ni se dispara interacción privada.
hasToken=false;
chatButton.fire('click');
assert.equal(layer.classList.contains('gxai-visible'),false);
assert.equal(authOpenCount,1);

// Movimiento reducido: sin partículas automáticas.
hasToken=true; reduced=true;
const originalCount=hearts.childElementCount;
mascotButton.fire('pointerdown',p(100,110,4));
mascotButton.fire('pointermove',p(150,111,4));
mascotButton.fire('pointerup',p(151,111,4));
assert.equal(hearts.childElementCount,originalCount);
console.log('GOXION Goxy F2: Goxy original Canvas + interacciones F2 PASS (sin navegador ni datos reales).');
