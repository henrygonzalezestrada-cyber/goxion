/* GOXION · Index oficial · morph del encabezado (integración R5.2–R17).
 * Porta SOLO el comportamiento visual del preview E1/B2 al Index
 * oficial. No toca el motor financiero, no calcula importes, no
 * cambia textos ni estados: el importe, la píldora y la etiqueta
 * los escribe el render oficial (02-02-inline.js) o el adaptador B2
 * (index-adapter.js); este controlador solo los mueve con transform.
 *
 * Adaptaciones respecto al preview (estado.js R5.2–R17):
 *  · La geometría se MIDE del DOM oficial en cada enlace (nada de
 *    constantes 116/172 del preview): alto del hero, tops del
 *    importe y la píldora, zona del título, alto del sticky.
 *    Medido en Chromium 390 px: hero 108 px, importe top 16,
 *    píldora top 80, sticky 169 px (158 con el gap R15).
 *  · El ancho del importe se mide con Range: en la oficial el
 *    importe es bloque al 100% y scrollWidth miente (da el ancho
 *    del hero); el texto real de "$46.00" mide ~159 px a 52 px.
 *  · El sticky oficial vivo es gx-payment-v2: fondo transparente
 *    con blur 27 px en ::before y cola de fundido de 58 px por
 *    debajo de la caja. El recorte usa --gx-rm-cut, que en reposo
 *    vale -58 (conserva la cola exacta) y en compacto vale el
 *    clip; el ::before se acorta con la misma variable para que
 *    el fundido siempre termine en el borde visible. Sin esto, el
 *    clip-path se comería la cola en reposo.
 *  · El blur oficial es 27 px (V2) / 28 px (base): NO se cambia
 *    a 25 px del preview. El cristal y el fundido se conservan.
 *  · La hoja de reporte oficial (#payment-modal) YA entra con
 *    resorte en V2 (.34s cubic-bezier(.18,.86,.22,1.04) desde
 *    translateY(18px) scale(.978)): no se le añade otra animación
 *    que pelearía con la suya. Su importe ya es vivo (lo pasa
 *    abrirModalPago / el adaptador B2 con la cotización real).
 *  · Energía R17: la oficial no tiene pistas de progreso; el
 *    equivalente fiel es la fila del próximo pago B2
 *    (.gx-b2-row.is-next): una línea de luz recorre su base
 *    cada 2.8 s. En flujo global no hay fila: no hay energía,
 *    no se inventa UI nueva.
 *  · El botón "Mi Espacio" se inyecta en el hero (la oficial no
 *    lo tiene) con el estilo Ayuda y texto blanco; solo existe
 *    cuando el morph está enlazado y solo recibe puntero en
 *    compacto. Destino ayuda.html, igual que el enlace "Ir a Mi
 *    Espacio" de la puerta de login oficial.
 *  · El conteo R8/R9 solo corre al cargar y cuando el importe
 *    CAMBIA de verdad (lo observa con MutationObserver): si el
 *    re-render de realtime vuelve a pintar el mismo valor, no
 *    se cuenta; si el cliente desplaza, se cancela y queda el
 *    valor exacto (nunca $45.72 a mitad de morph). El pulso R7
 *    usa la propiedad CSS `scale` (no transform) para no pelear
 *    con el transform del morph ni tocar el DOM que el adaptador
 *    B2 reescribe con textContent.
 *  · Asentamiento R10/R13: solo en la zona del morph
 *    (0–RANGE); fuera no toca el scroll. RANGE se mide:
 *    alto del sticky + margin-bottom.
 * Si no hay .sticky-area (puerta de login, error), no hace nada.
 */
(()=>{
'use strict';
if(window.__gxIndexMorphLoaded)return;
window.__gxIndexMorphLoaded=true;

const root=document.documentElement;
const reducedMQ=matchMedia('(prefers-reduced-motion: reduce)');
const TAIL=58; /* cola de fundido del sticky V2 por debajo de la caja */
const TAU=64,SETTLE_TAU=26,IDLE_MS=120,SNAP_IDLE_MS=250;
const GAP=10;

const money=cents=>'$'+(Math.round(cents)/100).toFixed(2);
const parseCents=text=>{
 const m=String(text||'').replace(/[^0-9.]/g,'');
 if(!m)return null;
 const v=Math.round(parseFloat(m)*100);
 return Number.isFinite(v)?v:null;
};
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const px=n=>Math.round(n)+'px';

/* Texto que escribió el propio morph (conteo): el observador lo
 * ignora; cualquier otro cambio de texto es externo (render
 * oficial o adaptador B2) y sí dispara conteo/repintado. */
let myText=null;

function textWidth(el){
 /* scrollWidth es independiente del transform: bajo el CSS del
  * morph el importe es width:max-content, así que scrollWidth es
  * el ancho del texto. Un Range NO sirve aquí: su rect es el
  * ancho VISUAL (ya escalado) y al remediar a mitad de morph el
  * ancho se encogería al cuadrado de la escala (bug cazado por
  * el test: el importe se desplazaba 17 px de menos y la píldora
  * se encimaba 8 px en compacto). */
 return Math.max(el.scrollWidth,1);
}

function pulseInk(el){
 if(!el||!el.isConnected||reducedMQ.matches)return;
 try{
  el.getAnimations().forEach(a=>a.cancel());
  el.animate([{opacity:.55,scale:'1.04'},{opacity:1,scale:'1'}],
   {duration:300,easing:'cubic-bezier(.2,.78,.24,1)'});
 }catch(_){}
}

/* R8/R9 · conteo de centavos exactos a centavos exactos, 700 ms,
 * ease-out cúbico. Termina siempre en el valor exacto. */
function makeCounter(){
 let raf=0,el=null,to=0,done=null,shown=0;
 return {
  get shown(){return shown},
  start(node,fromCents,toCents,onDone){
   if(raf)cancelAnimationFrame(raf);
   el=node;to=toCents;done=onDone||null;shown=fromCents;
   const t0=performance.now(),dur=700;
   const step=now=>{
    const t=Math.min(1,(now-t0)/dur);
    const eased=1-Math.pow(1-t,3);
    const cents=Math.round(fromCents+(toCents-fromCents)*eased);
    shown=cents;
    if(el.isConnected){myText=money(cents);el.textContent=myText;}
    if(t<1){raf=requestAnimationFrame(step)}
    else{raf=0;const d=done;done=null;if(d)d()}
   };
   raf=requestAnimationFrame(step);
  },
  cancel(settle){
   if(raf)cancelAnimationFrame(raf);
   raf=0;
   if(settle&&el&&el.isConnected){
    el.getAnimations().forEach(a=>a.cancel());
    myText=money(to);el.textContent=myText;shown=to;
   }
   el=null;done=null;
  }
 };
}
const heroCounter=makeCounter();

/* Estado del enlace actual con el DOM oficial (se re-enlaza en
 * cada re-render de realtime: #app se reescribe entero). */
const S={sticky:null,hero:null,header:null,label:null,amount:null,badge:null,
 content:null,banner:null,btn:null};
const geo={stickyH:0,heroH:0,heroW:0,topPad:15,fadeZone:20,amountTop:16,
 badgeTop:80,amountH:52,badgeH:28,range:176,marginBottom:18};
let amountObs=null;
let lastCents=null,displayedCents=null;

/* El importe cambió en el DOM (render oficial o adaptador B2).
 * Cuenta solo si el valor cambió de verdad y la página está
 * arriba; si está desplazada o hay reduced-motion, queda exacto. */
function handleAmountNode(node){
 const cents=parseCents(node.textContent);
 if(cents===null)return;
 if(lastCents===null){
  lastCents=cents;displayedCents=cents;
  if(window.scrollY===0&&!reducedMQ.matches){
   displayedCents=0;
   myText=money(0);node.textContent=myText;
   heroCounter.start(node,0,cents,()=>pulseInk(node));
  }
  return;
 }
 if(cents===lastCents){displayedCents=cents;return;}
 const from=(displayedCents==null?lastCents:displayedCents);
 lastCents=cents;
 if(window.scrollY>0||reducedMQ.matches){displayedCents=cents;return;}
 displayedCents=from;
 myText=money(from);node.textContent=myText;
 heroCounter.start(node,from,cents,()=>pulseInk(node));
}

function attachAmountObserver(){
 if(amountObs)amountObs.disconnect();
 const node=S.amount;
 if(!node)return;
 amountObs=new MutationObserver(()=>{
  if(!S.amount||!S.amount.isConnected)return;
  if(S.amount.textContent===myText)return;
  handleAmountNode(S.amount);
  repaint();
 });
 amountObs.observe(node,{characterData:true,childList:true,subtree:true});
}

/* ---- morph (R5.2/R7/R10/R12/R13/R14/R15/R17, adaptado) ---- */
let value=0,goal=0,frame=0,watchdog=0,lastTick=0,lastScroll=0;
let measureKey='',moneyWidth=0,statusWidth=0,amountH=0,badgeH=0,
 lastPainted=null,heroRestH=0,heroW=0,btnW=0,btnH=0;
let snapTimer=0,snapping=false,snapRaf=0,snapDeadline=0,touching=false;

function paint(){
 if(!S.sticky||!S.amount||!S.badge)return;
 const p=value;
 const pp=smooth(p/.45);
 const pb=smooth((p-.30)/.45);
 const paired=smooth((p-.05)/.30);
 const spread=smooth((p-.75)/.25);
 const spreadV=smooth((p-.75)/.125);
 const spreadH=smooth((p-.875)/.125);
 const freedLabelSpace=7*smooth((p-.10)/.35);
 const amountSize=52-18*pp; /* R16/R17: compacto 34 px visuales */
 const amountScale=amountSize/52,badgeScale=1; /* R15: píldora 12 px, sin scale */
 const key=S.amount.textContent+'|'+S.badge.textContent+'|'+
  Math.round(amountSize)+'|'+window.innerWidth;
 if(Math.abs(p-(lastPainted??-1))<.0004&&key===measureKey)return;
 lastPainted=p;
 const remeasured=key!==measureKey;
 if(remeasured){
  measureKey=key;
  moneyWidth=textWidth(S.amount);
  statusWidth=Math.max(S.badge.getBoundingClientRect().width,S.badge.scrollWidth);
  amountH=S.amount.offsetHeight;
  badgeH=S.badge.offsetHeight;
  heroW=S.hero.offsetWidth;
  if(S.btn){btnW=S.btn.offsetWidth;btnH=S.btn.offsetHeight;}
 }
 const amountTop=geo.amountTop-10*pp-freedLabelSpace;
 const amountVH=amountH*amountScale,badgeVH=badgeH*badgeScale;
 /* R17 · UNA SOLA BARRA: en compacto la píldora se queda en la
  * misma fila del importe, a su derecha, con gap 10; el botón
  * queda aislado a la derecha. Título y etiqueta desaparecen
  * JUNTOS con spreadV. */
 const badgeRowTop=amountTop+(amountVH-badgeVH)/2;
 const badgeTop=(geo.badgeTop-71*pb-freedLabelSpace)*(1-spread)+badgeRowTop*spread;
 const heroVH=Math.round(Math.max(amountTop+amountVH,badgeTop+badgeVH)+8-pb);
 if(heroRestH===0||(p<.02&&remeasured))heroRestH=heroVH;
 const amountVW=moneyWidth*amountScale;
 const amountShiftBase=-(statusWidth*badgeScale+GAP)*.5*paired;
 const amountShiftLeft=-(heroW/2-amountVW/2);
 const amountShift=amountShiftBase+(amountShiftLeft-amountShiftBase)*spread;
 let badgeMaxW=0;
 if(spread>0){
  /* R17 · piso 20 px: con texto largo la píldora recorta con
   * ellipsis, el solape nunca ocurre. */
  badgeMaxW=Math.max(20,heroW-btnW-amountVW-26);
  root.style.setProperty('--gx-rm-badge-max',px(badgeMaxW));
 }else{
  root.style.setProperty('--gx-rm-badge-max','96%');
 }
 const badgeVW=Math.min(statusWidth,badgeMaxW||statusWidth)*badgeScale;
 const badgeShiftBase=(moneyWidth*amountScale+GAP)*.5*paired;
 const badgeShiftLeftBlock=amountShiftLeft+(amountVW+badgeVW)/2+GAP;
 const badgeShift=badgeShiftBase*(1-spread)+badgeShiftLeftBlock*spread;
 const btnTop=amountTop+(amountVH-btnH)/2;
 /* R12 · solo-transform: el clip recorta lo visible sin tocar el
  * layout; el contenido sube exactamente lo recortado. En reposo
  * clip 0 y cut -58: la cola de fundido V2 queda intacta. */
 const clip=Math.max(0,geo.heroH-heroVH+geo.fadeZone*spread);
 const cut=clip-TAIL*(1-p);
 root.style.setProperty('--gx-rm-space',spreadH.toFixed(3));
 root.style.setProperty('--gx-rm-space-top',px(btnTop));
 root.style.setProperty('--gx-rm-space-h',px(btnH));
 root.style.setProperty('--gx-rm-title-fade',spreadV.toFixed(3));
 root.style.setProperty('--gx-rm-amount-scale',amountScale.toFixed(4));
 root.style.setProperty('--gx-rm-amount-dy',px(amountTop-geo.amountTop-amountH*(1-amountScale)/2));
 root.style.setProperty('--gx-rm-amount-shift',px(amountShift));
 root.style.setProperty('--gx-rm-badge-scale',badgeScale.toFixed(4));
 root.style.setProperty('--gx-rm-badge-dy',px(badgeTop-geo.badgeTop-badgeH*(1-badgeScale)/2));
 root.style.setProperty('--gx-rm-badge-shift',px(badgeShift));
 root.style.setProperty('--gx-rm-hero-dy',px(-geo.fadeZone*spread));
 root.style.setProperty('--gx-rm-content-shift',px(-clip));
 root.style.setProperty('--gx-rm-clip',px(clip));
 root.style.setProperty('--gx-rm-cut',px(cut));
 root.style.setProperty('--gx-rm-title-scale',((14-3*p)/14).toFixed(4));
 root.style.setProperty('--gx-rm-label-opacity',String(1-spreadV));
 root.style.setProperty('--gx-rm-progress',p.toFixed(3));
 root.dataset.gxRmCompact=String(p>.95);
}

function schedule(){
 if(frame)cancelAnimationFrame(frame);
 clearTimeout(watchdog);
 frame=requestAnimationFrame(tick);
 watchdog=window.setTimeout(()=>{
  if(frame)cancelAnimationFrame(frame);
  frame=0;watchdog=0;tick();
 },62);
}
function tick(ts){
 frame=0;
 const now=typeof ts==='number'?ts:performance.now();
 const dt=lastTick?Math.min(100,Math.max(0,now-lastTick)):16.7;
 lastTick=now;
 const tau=(now-lastScroll)>IDLE_MS?SETTLE_TAU:TAU;
 value+=(goal-value)*(1-Math.exp(-dt/tau));
 if(Math.abs(goal-value)<.003)value=goal;
 paint();
 if(value!==goal)schedule();
 else{clearTimeout(watchdog);watchdog=0;lastTick=0}
}
function request(){
 if(!S.sticky)return;
 goal=clamp(window.scrollY/geo.range);
 /* R8/R9 · al desplazar, el conteo del hero se cancela y deja el
  * valor exacto: contar mientras el precio viaja fue el bug del
  * espejo viejo ($45.72 / $86.16 a mitad de morph). */
 if(window.scrollY>0){heroCounter.cancel(true);displayedCents=heroCounter.shown;}
 lastScroll=performance.now();
 if(!snapping&&!touching)armSnap();
 if(reducedMQ.matches){
  cancelAnimationFrame(frame);clearTimeout(watchdog);
  frame=0;watchdog=0;value=goal;lastTick=0;paint();return;
 }
 if(!frame&&!watchdog)schedule();
}

/* R10/R13 · asentamiento al soltar, solo en la zona del morph.
 * Mueve el scrollY; el morph lo sigue. Fuera de la zona no toca
 * el scroll (sin resorte al bajar al final de la página). */
function modalOpen(){
 return !!document.querySelector('#payment-modal.show, #bank-modal.show');
}
function armSnap(){
 clearTimeout(snapTimer);
 snapTimer=setTimeout(maybeSnap,SNAP_IDLE_MS);
}
function maybeSnap(){
 clearTimeout(snapTimer);snapTimer=0;
 if(snapping||touching||!S.sticky)return;
 if(modalOpen())return;
 const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 if(maxScroll<8)return;
 const anchor=Math.min(geo.range,maxScroll);
 const y=window.scrollY;
 if(y>anchor)return;
 const target=y<anchor/2?0:anchor;
 if(Math.abs(y-target)<4)return;
 animateSnap(target);
}
function cancelSnap(){
 if(snapRaf)cancelAnimationFrame(snapRaf);
 snapRaf=0;snapping=false;
}
function animateSnap(target){
 cancelSnap();
 snapping=true;
 if(reducedMQ.matches){window.scrollTo(0,target);snapping=false;return}
 snapDeadline=performance.now()+1000;
 let prevY=window.scrollY;
 const step=()=>{
  snapRaf=0;
  const y=window.scrollY;
  if(Math.abs(y-prevY)>24){snapping=false;return}
  const maxScroll=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
  const eff=Math.min(target,maxScroll);
  const d=eff-y;
  if(Math.abs(d)<1||performance.now()>snapDeadline){
   window.scrollTo(0,eff);snapping=false;return;
  }
  window.scrollTo(0,y+d*.25);
  prevY=window.scrollY;
  snapRaf=requestAnimationFrame(step);
 };
 snapRaf=requestAnimationFrame(step);
}
function onScrollEnd(){
 if(snapping)return;
 if(performance.now()-lastScroll>200)maybeSnap();
}
function repaint(){measureKey='';paint();}

/* Enlaza el morph con el DOM oficial actual. Mide la geometría
 * en flujo ANTES de activar el CSS (tops del importe/píldora,
 * alto del hero) y el resto DESPUÉS (alto del sticky, zona del
 * título con el gap R15 ya aplicado, RANGE). Idempotente: si los
 * nodos son los mismos, no hace nada. */
function bind(){
 const sticky=document.querySelector('.sticky-area');
 const hero=sticky?.querySelector('.balance-hero');
 const amount=hero?.querySelector('.total-amount');
 const badge=hero?.querySelector('.time-badge');
 if(!sticky||!hero||!amount||!badge)return false;
 if(sticky===S.sticky&&hero===S.hero&&amount===S.amount&&badge===S.badge)return true;
 const sr=sticky.getBoundingClientRect(),hr=hero.getBoundingClientRect();
 const cs=getComputedStyle(sticky);
 geo.topPad=parseFloat(cs.paddingTop)||15;
 geo.heroH=hero.offsetHeight;
 geo.heroW=hero.offsetWidth;
 geo.amountTop=amount.getBoundingClientRect().top-hr.top;
 geo.badgeTop=badge.getBoundingClientRect().top-hr.top;
 geo.amountH=amount.offsetHeight;
 geo.badgeH=badge.offsetHeight;
 S.sticky=sticky;S.hero=hero;S.header=sticky.querySelector('.header');
 S.label=hero.querySelector('.total-label');
 S.amount=amount;S.badge=badge;
 S.content=document.querySelector('.scrollable-content');
 S.banner=sticky.querySelector('.alert-banner');
 root.dataset.gxIndexMorph='r17';
 root.style.setProperty('--gx-rm-hero-h',px(geo.heroH));
 root.style.setProperty('--gx-rm-amount-top',px(geo.amountTop));
 root.style.setProperty('--gx-rm-badge-top',px(geo.badgeTop));
 void sticky.offsetHeight;
 const sr2=sticky.getBoundingClientRect(),hr2=hero.getBoundingClientRect();
 const cs2=getComputedStyle(sticky);
 geo.stickyH=sticky.offsetHeight;
 geo.marginBottom=parseFloat(cs2.marginBottom)||18;
 geo.fadeZone=(hr2.top-sr2.top)-geo.topPad;
 geo.range=Math.max(120,geo.stickyH+geo.marginBottom);
 let btn=hero.querySelector('.gx-index-space-btn');
 if(!btn){
  btn=document.createElement('a');
  btn.className='gx-index-space-btn';
  btn.href='ayuda.html';
  btn.textContent='Mi Espacio';
  hero.appendChild(btn);
 }
 S.btn=btn;
 btnW=btn.offsetWidth;btnH=btn.offsetHeight;
 attachAmountObserver();
 measureKey='';lastPainted=null;heroRestH=0;
 handleAmountNode(amount);
 paint();request();
 return true;
}

/* Re-render de realtime: #app se reescribe; re-enlazar si los
 * nodos cambiaron. Con debounce: el conteo escribe texto cada
 * frame y no debe re-enlazar en cada frame. */
let appTimer=0;
const app=document.getElementById('app');
if(app){
 new MutationObserver(()=>{
  clearTimeout(appTimer);
  appTimer=setTimeout(()=>{bind();},120);
 }).observe(app,{childList:true,subtree:true,characterData:true});
}

document.addEventListener('visibilitychange',()=>{
 root.classList.toggle('gx-r8-paused',document.hidden);
});
window.addEventListener('scroll',request,{passive:true});
window.addEventListener('scrollend',request,{passive:true});
window.addEventListener('scrollend',onScrollEnd,{passive:true});
window.addEventListener('touchstart',()=>{touching=true;clearTimeout(snapTimer);cancelSnap()},{passive:true});
window.addEventListener('touchend',()=>{touching=false;armSnap()},{passive:true});
window.addEventListener('wheel',()=>{cancelSnap()},{passive:true});
window.addEventListener('resize',()=>{paint();request()},{passive:true});
if(reducedMQ.addEventListener)reducedMQ.addEventListener('change',request);
bind();
window.GOXION_INDEX_MORPH=Object.freeze({
 progress:()=>value,
 repaint,
 bound:()=>!!S.sticky,
});
})();
