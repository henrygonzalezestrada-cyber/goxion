// GOXION · Goxy F7 · puente de IA con guías y scroll F6 preservados.
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
const official=readFileSync(join(root,'../../assets/js/ayuda/data/support-issues.js'),'utf8');
const adapter=readFileSync(join(root,'goxy-support-knowledge.js'),'utf8');
const knowledgeWindow={};
new Function('window',official)(knowledgeWindow);
new Function('window',adapter)(knowledgeWindow);
const knowledge=knowledgeWindow.GOXY_SUPPORT;
assert.ok(knowledge.platforms().includes('Netflix') && knowledge.platforms().includes('Disney+'),'Usar las guías oficiales de Ayuda');
assert.equal(knowledge.guide('Netflix',0).requiresHuman,true,'Código requiere agente humano');
assert.ok(knowledge.guide('Netflix',0).instructions.includes('Iniciar Sesión con Código'),'Conservar pasos canónicos');
assert.ok(!knowledge.guide('Netflix',0).instructions.includes('<strong>'),'No pasar HTML a chat');
assert.equal(knowledge.resolvePlatform('Tengo error de Disney+'),'Disney+');
assert.equal(knowledge.resolvePlatform('Estoy en Prime Video'),'Prime Video');
assert.equal(knowledge.matchIssue('Netflix','Netflix actualizar hogar'),1);
assert.equal(knowledge.guide('Disney+',500),null,'Nunca inventar situaciones ausentes');
new Function('window','document','localStorage','performance','setTimeout','clearTimeout',js);
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline, 'loader HTML no encontrado');
new Function(inline);
for(const required of ['.gxai-canvas-slot','gxai-border-sweep','prefers-reduced-motion','touch-action:pan-y','.gxai-typing','.gxai-composer','.gxai-chat-phase','gxai-message-input'])
  assert.ok(css.includes(required), 'Falta CSS '+required);
assert.ok(entry.includes('from "robot-heads"')&&entry.includes('shape:"rectangle"'), 'Usar renderer MIT original');
assert.ok(!js.includes('gxai-open-icon')&&!js.includes('↗'),'El CTA no debe tener el globo ni flecha');
assert.ok(js.includes('gxai-open-signal')&&css.includes('.gxai-open-balance'),'Conservar el CTA F4');
assert.ok(!js.includes('<linearGradient'),'No regresar al SVG plano');
assert.ok(js.includes('event.stopPropagation()')&&js.includes('capture: true'),'No regresar al poke feliz automático');
assert.ok(!js.includes('SUPABASE_SERVICE_ROLE_KEY')&&!js.includes('GROQ_API_KEY'),'Ninguna clave privada en el UI');
const bridge=readFileSync(join(root,'goxy-ai-client.js'),'utf8');
assert.ok(bridge.includes('goxy-ai-beta') && !bridge.includes('GROQ_API_KEY'),'Cliente conecta a Edge, no a Groq');
assert.ok(!bridge.includes('api.groq.com'),'Nunca conectar Groq desde el navegador');
assert.ok(!html.includes('https://api.groq.com'),'El loader no conecta el proveedor');
assert.ok(html.includes('goxy-ai-client.js?v=goxy-f7'),'Cargar puente seguro F7');
assert.ok(html.includes('mascota.js?v=goxy-f7-1') && html.includes('goxy-support-knowledge.js?v=goxy-f7'),'Cargar F7.1 con catálogo');
assert.ok(!css.includes('touch-action:none'),'No bloquear scroll con touch-action none');
assert.ok(!js.includes('heroTrigger.setPointerCapture'),'No capturar dedo al inicio del gesto');
assert.ok(!js.includes('sendSmartWA('),'Goxy no debe usar soporte que agrega PIN y credenciales');

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
  getAttribute(name){return this.attrs[name]??null;}
  focus(){doc.activeElement=this;}
  querySelector(sel) {
    if(this.name==='hero')return ({
      '.gxai-mascot-button':mascotButton,'.gxai-open':openButton,
      '.gxai-reactions':hearts,'.gxai-pet-status':petStatus
    })[sel]||null;
    if(this.name==='layer')return ({
      '.gxai-chat-scroll':scroll,'.gxai-chat':dialog,'.gxai-close':closeButton,
      '.gxai-backdrop':backdrop,'.gxai-chat-phase':phase,
      '.gxai-composer':composer,'.gxai-message-input':input,'.gxai-send':send,'.gxai-chat-disclaimer':disclaimer,
      '.gxai-ai-panel':aiPanel,'.gxai-ai-title':aiTitle,'.gxai-ai-description':aiDescription,'.gxai-ai-start':aiStart
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
const input=new Element('input'),send=new Element('send'),disclaimer=new Element('disclaimer');
const aiPanel=new Element('aiPanel'),aiTitle=new Element('aiTitle'),
  aiDescription=new Element('aiDescription'),aiStart=new Element('aiStart');
const btnAccess=new Element('access'),btnAccount=new Element('account'),btnCode=new Element('code'),btnError=new Element('error');
btnAccess.dataset.prompt='acceso';btnAccount.dataset.prompt='cuenta';
btnCode.dataset.prompt='codigo';btnError.dataset.prompt='error';
let captures=0, humanOpens=0, switches=[];
mascotButton.setPointerCapture=()=>{captures++;};
const officialHuman=new Element('human');officialHuman.click=()=>{humanOpens++;};
const section=new Element('support'),card=new Element('card');
section.querySelector=(sel)=>sel==='.direct-contact-box button'?officialHuman:null;
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
  GOXY_SUPPORT:knowledge,
  GOXY_AI:{
    status:()=>Promise.resolve({ok:true,configured:false}),
    ask:()=>Promise.resolve({ok:false,code:'AI_NOT_CONFIGURED',
      message:'La conexión de IA está preparada, pero falta configurar la clave.'})
  },
  switchTab:(name)=>switches.push(name),
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
new Function('window','document','localStorage','performance','setTimeout','clearTimeout','AbortController',js)(
  win,doc,store,{now:()=>2100},schedule,unschedule,
  class MockAbortController { constructor(){this.signal={aborted:false};} abort(){this.signal.aborted=true;} }
);
const layer=section.children.at(-1);
const api=win.GOXION_AI_BETA;
assert.ok(api,'Goxy no inició');assert.equal(mounts,1,'Render original no montó');
assert.ok(js.includes('setAIStatus')&&js.includes('aiMode = true'),'Mostrar estado y activar modo explícito IA');
assert.ok(js.includes("if (aiMode && chosenGuide)"),'Modo IA debe usar la guía incluso cuando el texto menciona la plataforma');
const pointer=(x,y,id=1)=>({isPrimary:true,pointerType:'touch',pointerId:id,clientX:x,clientY:y,button:0});
const clickDemo=button=>layer.fire('click',{target:{closest:selector=>selector==='.gxai-suggestion'?button:null}});
const clickChoice=button=>layer.fire('click',{target:{closest:selector=>selector==='.gxai-choice'?button:null}});
const currentChoice=(kind,platform)=>scroll.children
  .filter(x=>x.className==='gxai-choices'&&x.isConnected)
  .flatMap(x=>x.children)
  .find(x=>x.dataset.kind===kind && (!platform || x.dataset.platform===platform));
function doTap(i){mascotButton.fire('pointerdown',pointer(100,110,100+i));mascotButton.fire('pointerup',pointer(100,110,100+i));}
doTap(0);
const cycle=['happy','searching','listening','working','thinking','speaking','sleeping'];
const seen=[robotHero.attrs['data-mood']];
for(let i=1;i<cycle.length;i++){doTap(i);seen.push(robotHero.attrs['data-mood']);}
assert.deepEqual(seen,cycle,'Los siete toques deben ser distintos');
assert.equal(layer.classList.contains('gxai-visible'),false,'Tocar no abre chat');
// Regresión del reporte: arrastrar VERTICAL sobre el robot no es una caricia,
// no genera corazones ni captura el pointer; la página conserva pan-y.
const heartsBeforeScroll=hearts.childElementCount;
const moodBeforeScroll=robotHero.attrs['data-mood'];
let downPrevented=false;
mascotButton.fire('pointerdown',{...pointer(100,110,301),preventDefault:()=>{downPrevented=true;}});
mascotButton.fire('pointermove',pointer(102,200,301));
mascotButton.fire('pointerup',pointer(104,265,301));
assert.equal(downPrevented,false,'No prevenir scroll vertical al tocar');
assert.equal(captures,0,'No capturar pointer: Safari debe hacer scroll');
assert.equal(hearts.childElementCount,heartsBeforeScroll,'Scroll vertical no genera corazones');
assert.equal(robotHero.attrs['data-mood'],moodBeforeScroll,'Scroll vertical no cambia expresión');
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
assert.ok(currentChoice('platform','Netflix'),'Al elegir acceso, ofrecer plataformas canónicas');
// Flujo real: elegir Netflix -> temas -> guía original -> opciones humano.
clickChoice(currentChoice('platform','Netflix'));
flush();
assert.ok(currentChoice('issue','Netflix'),'Ver temas oficiales de Netflix');
const issueChoice=currentChoice('issue','Netflix');
assert.equal(issueChoice.dataset.issueIndex,'0');
clickChoice(issueChoice);
flush();
assert.ok(scroll.children.some(x=>typeof x.textContent==='string' &&
  x.textContent.includes('Iniciar Sesión con Código') &&
  x.textContent.includes('correo que nosotros administramos')),'Mostrar instrucciones reales sin inventar');
assert.ok(currentChoice('human'),'Dejar claro cuándo requiere un asesor');

// Flujo de error simulado: ojos X y regreso a escucha.
clickDemo(btnError);
assert.equal(api.chatState(),'thinking');
runNext();assert.equal(api.chatState(),'working');
runNext();assert.equal(api.chatState(),'error');
runNext();assert.equal(api.chatState(),'error');
runNext();assert.equal(api.chatState(),'listening');

// Mensaje escrito: contenido solo en DOM, sin peticiones de red.
input.value='Quiero cambiar de plataforma';
composer.fire('submit');
assert.equal(input.value,'');
assert.equal(api.chatState(),'thinking');
flush();
assert.equal(api.chatState(),'listening');
assert.ok(currentChoice('platform','Prime Video'),'Mensaje genérico ofrece plataformas');

// Navegación a Mi Espacio sin inventar montos.
clickDemo(btnAccount); flush();
const accountAction=currentChoice('account');
assert.ok(accountAction,'Ofrecer entrada a estado de cuenta autorizado');
clickChoice(accountAction);
assert.equal(layer.classList.contains('gxai-visible'),false);
assert.equal(switches.at(-1),'inicio','Volver al Mi Espacio existente, no crear vista duplicada');
openButton.fire('click');flush();
// Un mensaje libre con plataforma + problema debe usar la guía real directamente.
input.value='Netflix actualizar hogar';composer.fire('submit');
flush();
assert.ok(scroll.children.some(x=>String(x.textContent).includes('Tu TV pide Actualizar Hogar')),'Guía directa por texto');
assert.ok(currentChoice('human'),'Ofrecer contacto al requerir aprobación');

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

// Escalamiento: usar SOLO contacto humano existente, sin PIN, y cerrar chat.
openButton.fire('click');flush();
clickDemo(btnAccess);flush();
clickChoice(currentChoice('platform','Disney+'));flush();
clickChoice(currentChoice('human'));
assert.equal(humanOpens,1,'Usar contacto humano oficial existente');
assert.equal(layer.classList.contains('gxai-visible'),false);

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
assert.ok(js.includes('ai.ask(') && js.includes('chosenGuide') && js.includes('aiController?.abort()'),
  'La IA usa guía seleccionada y cancela llamadas al cerrar');
assert.ok(js.includes('AI_NOT_CONFIGURED'), 'Mostrar estado no configurado sin respuesta falsa');
assert.ok(aiPanel.getAttribute('data-ai-status')==='checking'||aiPanel.getAttribute('data-ai-status')===null,
  'El estado IA se debe manejar por respuesta del servidor, no inventarlo');
// F7.1: panel muestra estado real tras resolver promesa; sin clave no inventa IA.
openButton.fire('click');
flush();
await Promise.resolve();
assert.equal(aiPanel.getAttribute('data-ai-status'),'pending','Clave sin configurar debe aparecer explícitamente');
assert.equal(aiStart.disabled,true,'Sin clave no permitir entrar a IA');
closeButton.fire('click');

// Con proveedor configurado, la ruta inteligente es deliberada y visible.
win.GOXY_AI.status=()=>Promise.resolve({ok:true,configured:true});
const sent=[];
win.GOXY_AI.ask=async payload=>{
  sent.push(payload);
  return {ok:true,answer:'Respuesta de prueba desde backend autorizado.',remaining:7};
};
openButton.fire('click');
flush();
await Promise.resolve();
assert.equal(aiPanel.getAttribute('data-ai-status'),'ready','El panel refleja conexión real');
assert.equal(aiStart.disabled,false,'El usuario puede elegir IA solo tras confirmar estado');
aiStart.fire('click');
assert.ok(currentChoice('platform','Netflix'),'Entrada directa guía al catálogo de plataformas');
clickChoice(currentChoice('platform','Netflix'));flush();
clickChoice(currentChoice('issue','Netflix'));flush();
assert.ok(currentChoice('ai'),'La guía ofrece entrar a IA');
clickChoice(currentChoice('ai'));
assert.equal(api.aiMode(),true,'El botón debe activar el modo IA');
input.value='Netflix todavía no abre mi pantalla';
composer.fire('submit');
await Promise.resolve();
assert.equal(sent.length,1,'Una pregunta debe llegar al backend, no volver al menú de plataforma');
assert.equal(sent[0].platform,'Netflix','El backend recibe solo plataforma seleccionada');
assert.equal(sent[0].issueIndex,0,'El backend recibe solo ID canónico de guía');
flush();
closeButton.fire('click');
console.log('GOXION Goxy F7.1: estado IA real, bloqueo sin clave, ruta IA funcional y F6 intacta PASS.');
