// GOXION · Goxy F13 · pagos oficiales, contexto y cola inteligente de IA.
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
const clientContextSrc=readFileSync(join(root,'goxy-client-context.js'),'utf8');
const accessSrc=readFileSync(join(root,'goxy-access-routing.js'),'utf8');
const handoffSrc=readFileSync(join(root,'goxy-whatsapp-handoff.js'),'utf8');
const paymentSrc=readFileSync(join(root,'goxy-payment-read.js'),'utf8');
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
assert.deepEqual(knowledge.resolveAllPlatforms('HBO Max + Prime Video'),['Max','Prime Video']);
let account='test-client';
const privateView={
 'test-client':{servicios:[
  {nombre:'Netflix Premium',correo_login:'privado@test.invalid',perfil_pin:'3321'},
  {nombre:'Disney+ Premium'},
  {nombre:'Combo HBO Max + Prime Video'}]},
 'otro-cliente':{servicios:[{nombre:'ViX Premium'}]},
 'multi-client':{servicios:[{nombre:'ViX Premium',correo_login:'primero@ejemplo.invalid'},
  {nombre:'ViX Premium',correo_login:'segundo@ejemplo.invalid'}]}
};
const clientWindow={
 GOXY_SUPPORT:knowledge,
 GOXION_CORE:{getClientToken:()=>account?'fake-token':''},
 getCurrentClientKey:()=>account,
 goxionReloadPrivateClientView:async()=>({key:account,cliente:privateView[account]})
};
new Function('window','globalClientesData',clientContextSrc)(clientWindow,privateView);
const current=await clientWindow.GOXY_CLIENT_CONTEXT.refresh();
assert.deepEqual(current.platforms,['Netflix','Disney+','Max','Prime Video'],'Combos + nombres de plataformas');
assert.ok(!JSON.stringify(current).includes('privado@test.invalid') &&
 !JSON.stringify(current).includes('3321'),'Nunca devolver datos personales');
account='otro-cliente';
const other=await clientWindow.GOXY_CLIENT_CONTEXT.refresh();
assert.deepEqual(other.platforms,['ViX'],'Una segunda sesión no hereda servicios');
assert.deepEqual(clientWindow.GOXY_CLIENT_CONTEXT.destinations('Netflix'),[],'No heredar servicios de otra sesión');
account='test-client';
assert.equal(clientWindow.GOXY_CLIENT_CONTEXT.supportReference('Netflix').loginEmail,'privado@test.invalid',
  'Correo asociado a sesión validada');
assert.equal(clientWindow.GOXY_CLIENT_CONTEXT.supportReference('ViX'),null,'No leer cuenta distinta');
account='multi-client';
assert.equal(clientWindow.GOXY_CLIENT_CONTEXT.supportReference('ViX'),null,
 'Dos accesos de ViX requieren selección');
assert.equal(clientWindow.GOXY_CLIENT_CONTEXT.supportReference('ViX',1).loginEmail,
 'segundo@ejemplo.invalid','El correo pertenece a la cuenta exacta');
account='test-client';
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
assert.ok(html.includes('goxy-ai-client.js?v=goxy-f10'),'Cargar puente seguro F7');
assert.ok(html.includes('mascota.js?v=goxy-f13') && html.includes('goxy-support-knowledge.js?v=goxy-f7-2') &&
 html.includes('goxy-client-context.js?v=goxy-f12') &&
 html.includes('goxy-access-routing.js?v=goxy-f12') &&
 html.includes('goxy-whatsapp-handoff.js?v=goxy-f12') &&
 html.includes('goxy-payment-read.js?v=goxy-f13'),'Cargar lectura financiera F13 antes del chat');
assert.ok(!css.includes('touch-action:none'),'No bloquear scroll con touch-action none');
assert.ok(js.includes('parent.visualViewport') && js.includes('syncChatViewport'),'Leer viewport real padre');
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
  replaceChildren(...nodes){this.children=[];nodes.forEach(n=>this.appendChild(n));}
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
    if(this.name==='layer'&&sel==='.gxai-suggestion')return [btnAccess,btnAccount,btnCode,btnMissions,btnPromos];
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
const btnAccess=new Element('access'),btnAccount=new Element('account'),btnCode=new Element('code'),btnError=new Element('error'),btnMissions=new Element('missions'),btnPromos=new Element('promos');
btnAccess.dataset.prompt='acceso';btnAccount.dataset.prompt='cuenta';
btnCode.dataset.prompt='codigo';btnError.dataset.prompt='error';btnMissions.dataset.prompt='misiones';btnPromos.dataset.prompt='promociones';
let captures=0, humanOpens=0, switches=[], payNavigation=0;
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
  GOXION_CORE:{STORAGE:{CLIENT_TOKEN:'demo-token'},endpoint:()=>'/estado-financiero-b2-beta'},
  getCurrentClientKey:()=>authed?'test-client':'',
  GOXY_ROBOT:{mountAll:()=>mounts++},
  GOXY_SUPPORT:knowledge,
  GOXY_CLIENT_CONTEXT:{
   local:()=>({ok:true,platforms:['Netflix','Disney+','Prime Video'],serviceCount:3}),
   refresh:()=>Promise.resolve({ok:true,platforms:['Netflix','Disney+','Prime Video'],serviceCount:3}),
   destinations:p=>p==='Netflix'?[{index:0,label:'Netflix',hasProfile:true,hasLogin:true,hasPendingPassword:true}]:
     p==='ViX'?[{index:1,label:'ViX · 1',hasProfile:true,hasLogin:true,hasPendingPassword:false},
     {index:2,label:'ViX · 2',hasProfile:true,hasLogin:true,hasPendingPassword:false}]:[],
   supportReference:(p,index=null)=>['Netflix','ViX'].includes(p) && (p!=='ViX'||Number.isInteger(index))?{
     clientId:'test-client',clientName:'Cliente Prueba',platform:p,serviceIndex:p==='Netflix'?0:index,
     serviceLabel:p==='Netflix'?'Netflix':'ViX · '+index,loginEmail:'acceso@ejemplo.invalid'
   }:null
  },
  GOXY_AI:{
    status:()=>Promise.resolve({ok:true,configured:false}),
    account:()=>Promise.resolve({ok:true,answer:'Lectura de cuenta desde GOXION.',source:'official_account'}),
    ask:()=>Promise.resolve({ok:false,code:'AI_NOT_CONFIGURED',
      message:'La conexión de IA está preparada, pero falta configurar la clave.'})
  },
  switchTab:(name)=>switches.push(name),
  irAlTicket:()=>payNavigation++,
  matchMedia:()=>({matches:reduced}),
  openAuthSheet:()=>authOpens++,
  addEventListener:()=>{}
};
const openedWhatsApp=[];
win.open=url=>{openedWhatsApp.push(url);return {};};
new Function('window',accessSrc)(win);
new Function('window','NUMERO_GOXION',handoffSrc)(win,'5219611234567');
const ticket=win.GOXY_HANDOFF.prepare('ViX',{serviceIndex:1,issue:'App pide Premium',checks:['Solo QR']});
assert.equal(win.GOXY_HANDOFF.prepare('ViX',{issue:'App pide Premium'}),null,
 'No compartir un correo de otra cuenta por selección automática');
assert.ok(ticket.message.includes('Cliente Prueba') && ticket.message.includes('acceso@ejemplo.invalid'));
assert.ok(!ticket.message.includes('3321'),'No trasladar PIN a ficha');
assert.ok(win.GOXY_HANDOFF.url(ticket).startsWith('https://wa.me/5219611234567?text='));
assert.equal(win.GOXY_ACCESS.inspect('ViX solicita contratar Premium',null,null).stage.type,'premium');
assert.ok(win.GOXY_ACCESS.inspect('Solo QR','ViX',{type:'premium',platform:'ViX'}).reply.includes('asesor'));
assert.ok(win.GOXY_ACCESS.routes('Netflix','update').options.some(c=>c.kind==='open-service'&&c.view==='credential'));
assert.equal(win.GOXY_ACCESS.inspect('Bixby',null,null).options[0].kind,'confirm-vix');

// Safari: el visual viewport del padre se encoge al desplegar el teclado.
const vv={height:844,offsetTop:0,handlers:{},
  addEventListener(type,fn){this.handlers[type]=fn;}};
win.parent={innerHeight:844,visualViewport:vv,addEventListener(){}};
const store={getItem:()=>authed?'fake-token':''};
const charge=(id,day,ordinal)=>({cargo_id:id,acceso_id:'access-'+id,servicio:'ViX Premium',ordinal,
  vence:'2026-11-'+day,total_centavos:4600,pagado:false});
const financialResponse={ok:true,modo:'b2_multifecha',calendario_financiero:{ok:true,cobrable:true,
  ciclo_id:'22222222-2222-2222-2222-222222222222',
  total_pendiente_centavos:9200,cargos:[charge('uno','06',1),charge('dos','30',2)]}};
new Function('window','localStorage','fetch',paymentSrc)(win,store,
  async()=>({ok:true,json:async()=>financialResponse}));
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
assert.ok(js.includes('setAIStatus')&&js.includes('escalateAutomatically'),'Enrutador automático con estado verificado');
assert.ok(css.includes('.gxai-ai-panel .gxai-ai-start{display:none!important}'),
  'No mostrar botón manual de IA al cliente');
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

// Escalamiento: si aún no hay referencia de servicio verificable, no
// construir ficha ni enviar datos a terceros. Mantener las guías disponibles.
openButton.fire('click');flush();
clickDemo(btnAccess);flush();
clickChoice(currentChoice('platform','Disney+'));flush();
clickChoice(currentChoice('human'));
assert.equal(humanOpens,0,'Nunca abrir WhatsApp sin confirmación');
assert.equal(layer.classList.contains('gxai-visible'),true);
assert.ok(currentChoice('account'),'Sin referencia, remitir a Mi Espacio');
closeButton.fire('click');

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
assert.deepEqual(api.contractedPlatforms(),['Netflix','Disney+','Prime Video'],'Priorización por cuenta');
assert.ok(!js.includes('gxai-my-services') && !css.includes('.gxai-my-services'),
  'Sin tarjeta/caja duplicada al abrir chat');
assert.ok(!currentChoice('platform','Netflix'),
  'Al abrir no se fuerza ningún menú adicional sobre el mensaje de bienvenida');
clickDemo(btnAccess);
flush();
assert.ok(currentChoice('platform','Netflix'),'Mostrar plataformas del cliente en la conversación');
assert.ok(!currentChoice('platform','Max'),'No mezclar otras marcas al inicio');
assert.ok(currentChoice('other'),'Consultar otras plataformas está junto a los chips en el chat');
const options=scroll.children.filter(x=>x.className==='gxai-choices'&&x.isConnected);
assert.equal(options.length,1,'No duplicar menús de plataformas');
assert.ok(options[0].children.some(x=>x.className==='gxai-choice-heading'&&x.textContent==='Tus plataformas activas'));
clickChoice(currentChoice('other'));
assert.ok(currentChoice('platform','Max'),'La opción de otras abre marcas no contratadas');
assert.ok(currentChoice('mine'),'Volver a mis plataformas tras consultar otras');
assert.equal(aiStart.disabled,true,'Sin clave no permitir entrar a IA');
closeButton.fire('click');

// F11: sin botón. Primero guías gratuitas, preguntar síntomas, luego IA.
win.GOXY_AI.status=()=>Promise.resolve({ok:true,configured:true,providerReady:true});
const sent=[];
win.GOXY_AI.ask=async payload=>{
  sent.push(payload);
  return {ok:true,answer:'Respuesta de prueba desde backend autorizado.',remaining:7};
};
openButton.fire('click');flush();
await Promise.resolve();
assert.equal(api.aiStatus(),'ready','Proveedor realmente disponible');
assert.equal(aiStart.disabled,false,'Estado interno listo sin botón visible');
clickDemo(btnAccess);flush();
clickChoice(currentChoice('platform','Netflix'));flush();
clickChoice(currentChoice('issue','Netflix'));flush();
assert.ok(currentChoice('unresolved'),'Ofrecer seguimiento si la guía no resolvió');
assert.ok(!currentChoice('ai'),'No ofrecer un botón para gastar IA');
clickChoice(currentChoice('unresolved'));
assert.equal(sent.length,0,'Autorización de código se deriva a humano sin gastar IA');
assert.ok(currentChoice('human'),'Ofrecer asesor al requerir vinculación');
flush();closeButton.fire('click');

// La primera consulta imprecisa pide UN síntoma antes de usar Groq.
openButton.fire('click');flush();await Promise.resolve();
input.value='Tengo un problema con Netflix';composer.fire('submit');
assert.equal(sent.length,0,'Consulta vaga no gasta IA');
assert.equal(api.awaitingSymptom(),true,'Falta síntoma concreto: pedir aclaración');
flush();
input.value='Se congela al reproducir un video';composer.fire('submit');
await Promise.resolve();
assert.equal(sent.length,1,'Síntoma nuevo sin guía se escala automáticamente');
assert.equal(sent[0].platform,'Netflix','Contexto de plataforma preservado');
assert.equal(sent[0].issueIndex,undefined,'No obligar a elegir guía antes de IA');
assert.ok(!('cliente_id' in sent[0]),'No filtrar ID cliente a Groq');
assert.ok(disclaimer.textContent.includes('7'),'Mostrar saldo IA después de respuesta');
flush();
input.value='¿Y si ya hice eso?';composer.fire('submit');
flush();await Promise.resolve();
assert.equal(sent.length,2,'Continuidad de IA solo tras necesitarla');
assert.deepEqual(sent[1].history,[
  {role:'user',content:'Se congela al reproducir un video'},
  {role:'assistant',content:'Respuesta de prueba desde backend autorizado.'}
], 'La IA conserva únicamente conversación de soporte, no cuenta');
flush();
input.value='Qué puedes hacer?';composer.fire('submit');
assert.equal(sent.length,2,'Capacidades de Goxy no gastan IA');
flush();
input.value='Ya coloqué el código pero no responde';composer.fire('submit');
assert.equal(sent.length,2,'Código ya ingresado NO consume otra consulta');
assert.ok(currentChoice('human'),'Escalar al asesor sin recibir códigos');
flush();closeButton.fire('click');

// Otro problema técnico conocido (Hogar) puede aclararse; tener botón humano
// en la guía no debe bloquear toda la IA como ocurre con los códigos.
openButton.fire('click');flush();await Promise.resolve();
input.value='Netflix actualizar hogar';composer.fire('submit');flush();
assert.ok(currentChoice('unresolved'),'La guía conocida se resuelve gratis primero');
clickChoice(currentChoice('unresolved'));
flush();await Promise.resolve();
assert.equal(sent.length,3,'Si Hogar sigue fallando, IA explica diagnóstico');
assert.equal(sent[2].platform,'Netflix');
assert.equal(sent[2].issueIndex,1,'Mantener contexto de la guía oficial');
flush();closeButton.fire('click');

// Nueva ruta: consulta de misiones por backend propio sin gastar IA.
openButton.fire('click');
flush();
let askCount=sent.length,accountCount=0;
win.GOXY_AI.account=async(topic)=>{
  accountCount++;
  return {ok:true,source:'official_account',answer:'Misiones verificadas en el servidor: 2 pendientes.',topic};
};
clickDemo(btnMissions);
await Promise.resolve();
assert.equal(accountCount,1,'Consultar misiones via backend');
assert.equal(sent.length,askCount,'No gastar IA en misiones');
assert.ok(scroll.children.some(x=>x.textContent.includes('Misiones verificadas')),'Respuesta real sin Groq');
flush();
input.value='Hola';composer.fire('submit');
assert.equal(sent.length,askCount,'Saludar no consume cuota IA');
input.value='¿Qué puedo hacer?';composer.fire('submit');
assert.equal(sent.length,askCount,'Explicar capacidades no debe consumir IA');
flush();
closeButton.fire('click');
// F13: consultar importe por perfil desde el estado FINANCIERO real sin gastar Groq.
openButton.fire('click');flush();await Promise.resolve();
const initialSent=sent.length;
input.value='Cuánto tengo que pagar';composer.fire('submit');
await Promise.resolve();flush();
assert.equal(sent.length,initialSent,'Las cuentas jamás consultan Groq');
assert.ok(scroll.children.some(x=>String(x.textContent).includes('6 de noviembre de 2026')),
  'Un perfil muestra su vencimiento confirmado');
assert.ok(scroll.children.some(x=>String(x.textContent).includes('30 de noviembre de 2026')),
  'Segunda fecha independiente');
assert.ok(scroll.children.some(x=>String(x.textContent).includes('$92.00')),
  'Todo junto usa importes ya calculados en backend');
assert.ok(currentChoice('pay-one'),'Permitir consultar perfiles separados');
clickChoice(currentChoice('pay-next'));await Promise.resolve();flush();
assert.ok(scroll.children.some(x=>String(x.textContent).includes('Total de esa fecha: $46.00')),
  'Próximo cobro no equivale al total de todos los servicios');
clickChoice(currentChoice('pay-open'));
assert.equal(payNavigation,1,'Redirigir a Index oficial existente, sin cobro paralelo');
openButton.fire('click');flush();
const beforeCatalog=accountCount;
win.GOXY_AI.account=async(topic)=>{accountCount++;return {ok:true,
  answer:topic==='missions'?'La misión "Navega por nuestro catálogo" figura pendiente en tu ronda actual. Sigue las instrucciones de esa misión en Mi Espacio; si requiere una validación, GOXION debe confirmarla allí.':'Consulta oficial.',topic};};
input.value='Qué tengo que hacer en la misión ver catálogo';composer.fire('submit');
await Promise.resolve();flush();
assert.ok(scroll.children.some(x=>String(x.textContent).includes('abre la pestaña Catálogo')),
 'Goxy explica acción de misión real, no muestra plataformas de soporte');
assert.ok(currentChoice('catalog'),'Ofrecer apertura directa del Catálogo');
input.value='Y qué hago en ver catálogo';composer.fire('submit');
await Promise.resolve();flush();
assert.equal(accountCount,beforeCatalog+2,'La referencia de seguimiento conserva el contexto de misión');
assert.equal(sent.length,initialSent,'Misiones no gastan IA');
closeButton.fire('click');
// iPhone: campo >=16px, teclado encoge la capa y se recupera tras cerrar.
assert.ok(css.includes('font-size:16px!important'),'Evitar zoom de Safari sobre el input');
assert.ok(css.includes('.gxai-keyboard-open'),'La UI adapta el compositor a teclado abierto');
openButton.fire('click');flush();
assert.equal(layer.style['--gxai-viewport-height'],'844px','Inicialmente cabe en el viewport');
input.focus();input.fire('focus');
vv.height=460;vv.handlers.resize();
assert.equal(layer.style['--gxai-viewport-height'],'460px','Al abrir teclado, utilizar altura visible');
assert.ok(layer.classList.contains('gxai-keyboard-open'),'El input queda sobre el teclado');
doc.activeElement=dialog;vv.height=844;vv.handlers.resize();
assert.equal(layer.classList.contains('gxai-keyboard-open'),false,'Restaurar altura al ocultar teclado');
closeButton.fire('click');flush();
openButton.fire('click');flush();await Promise.resolve();
input.value='ViX me pide contratar Premium';composer.fire('submit');
assert.ok(currentChoice('premium-qr'),'Preguntar correo o QR sin gastar IA');
clickChoice(currentChoice('premium-qr'));
assert.ok(currentChoice('device'),'Antes de contacto debe preguntar por dispositivo');
assert.equal(openedWhatsApp.length,0);
clickChoice(currentChoice('device'));
assert.ok(currentChoice('human'),'Tras especificar dispositivo permite preparar ficha');
assert.equal(openedWhatsApp.length,0,'Sin apertura automática');
clickChoice(currentChoice('human'));
assert.ok(currentChoice('handoff-service'),'Antes de preparar ficha elegir cuenta afectada');
clickChoice(currentChoice('handoff-service'));
assert.ok(currentChoice('send-handoff'),'Ficha presentada para revisión');
assert.equal(openedWhatsApp.length,0);
clickChoice(currentChoice('cancel-handoff'));
assert.equal(openedWhatsApp.length,0,'Cancelar no abre WhatsApp');
closeButton.fire('click');flush();
openButton.fire('click');flush();await Promise.resolve();
clickDemo(btnAccess);flush();
clickChoice(currentChoice('platform','Netflix'));flush();
clickChoice(currentChoice('issue','Netflix'));flush();
clickChoice(currentChoice('human'));
assert.ok(currentChoice('send-handoff'),'Revisar ficha de Netflix');
clickChoice(currentChoice('send-handoff'));
assert.equal(openedWhatsApp.length,1,'Solo confirmar abre WhatsApp');
assert.ok(openedWhatsApp[0].includes('GOXION')&&!openedWhatsApp[0].includes('3321'));
console.log('GOXION Goxy F13: pagos B2, espera IA, misiones y WhatsApp seguro PASS.');
