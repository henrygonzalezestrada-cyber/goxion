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
 *  · El ancho del importe se mide con scrollWidth (el importe es
 *    width:max-content bajo el CSS del morph): un Range da el
 *    ancho VISUAL (ya escalado) y al remediar a mitad de morph el
 *    ancho se encogería al cuadrado de la escala (bug cazado por
 *    el test en PR #184). La píldora usa scrollWidth igual que
 *    el importe; su caja se recorta con --gx-rm-badge-max.
 *  · Marquee de la píldora (R17-completar): si el texto no cabe
 *    en la píldora, se desplaza por dentro hasta el final y
 *    regresa, con la distancia medida; pausa con pestaña oculta
 *    y con reduced-motion. El texto vive en un span interno que
 *    el observador de la píldora repone cuando el render oficial
 *    o el adaptador B2 reescriben textContent.
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
 *    (.gx-b2-row.is-next, y .is-due-next para las demás filas que
 *    vencen en esa misma fecha): una línea de luz recorre su base
 *    cada 2.8 s. En flujo global no hay fila: no hay energía,
 *    no se inventa UI nueva.
 *  · La "X" de cierre (R18) se inyecta en el hero (la oficial no
 *    la tiene) con cian sólido #00f2fe y X negra; solo existe
 *    cuando el morph está enlazado y solo recibe puntero en
 *    compacto. Destino ayuda.html, igual que el enlace "Ir a Mi
 *    Espacio" de la puerta de login oficial. Es un ancla que
 *    navega sola; el click es respaldo y el pointerup con guardia
 *    de movimiento cubre el caso iOS en que el clic sintetizado
 *    se cancela porque la página se desplaza (asentamiento).
 *  · La geometría se mide con los transforms del morph
 *    neutralizados (withRestTransforms): medir con
 *    getBoundingClientRect a mitad de morph leía posiciones
 *    VISUALES (ya desplazadas) y cada re-bind corrompía la base
 *    (la píldora caía de la barra, el clip oscilaba y al volver
 *    arriba el precio quedaba encima de la píldora).
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
    /* El timestamp del rAF puede preceder a t0 (reloj del frame):
     * sin el piso en 0, el primer cuadro del conteo salía negativo
     * ("$-98.71") antes de subir al importe real. */
    const t=Math.min(1,Math.max(0,(now-t0)/dur));
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
/* Medición de la geometría en flujo (tops del importe/píldora,
 * alto del hero) y del resto DESPUÉS de activar el CSS (alto del
 * sticky, zona del título, RANGE). Separadas para remediar sin
 * re-enlazar: si el texto nuevo cambia el alto del hero, los
 * tops viejos solaparían el contenido bajo la barra. */
function measureFlow(){
 const hr=S.hero.getBoundingClientRect();
 const cs=getComputedStyle(S.sticky);
 geo.topPad=parseFloat(cs.paddingTop)||15;
 geo.heroH=S.hero.offsetHeight;
 geo.heroW=S.hero.offsetWidth;
 geo.amountTop=S.amount.getBoundingClientRect().top-hr.top;
 geo.badgeTop=S.badge.getBoundingClientRect().top-hr.top;
 geo.amountH=S.amount.offsetHeight;
 geo.badgeH=S.badge.offsetHeight;
}
function measureSticky(){
 root.style.setProperty('--gx-rm-hero-h',px(geo.heroH));
 root.style.setProperty('--gx-rm-amount-top',px(geo.amountTop));
 root.style.setProperty('--gx-rm-badge-top',px(geo.badgeTop));
 void S.sticky.offsetHeight;
 const sr2=S.sticky.getBoundingClientRect(),hr2=S.hero.getBoundingClientRect();
 const cs2=getComputedStyle(S.sticky);
 geo.stickyH=S.sticky.offsetHeight;
 geo.marginBottom=parseFloat(cs2.marginBottom)||18;
 geo.fadeZone=(hr2.top-sr2.top)-geo.topPad;
 geo.range=Math.max(120,geo.stickyH+geo.marginBottom);
}
function remeasureGeometry(){withRestTransforms(()=>{measureFlow();measureSticky();});}

/* Medir geometría de LAYOUT, no visual. Si el morph está activo
 * (p>0), getBoundingClientRect devuelve posiciones ya desplazadas
 * por los transforms del morph (dy/scale/shift): medir con ellas
 * corrompía la base en cada re-bind a mitad de morph — la píldora
 * caía de la barra, el clip oscilaba (88→122 px) y al volver
 * arriba el precio quedaba encima de la píldora con clip 66 en
 * reposo. Se neutralizan los transforms del morph durante la
 * medición y se restauran después. La medición es síncrona: ningún
 * rAF se intercala y no hay parpadeo. */
const RM_TRANSFORM_VARS=['--gx-rm-amount-dy','--gx-rm-badge-dy','--gx-rm-hero-dy',
 '--gx-rm-amount-shift','--gx-rm-badge-shift','--gx-rm-content-shift'];
const RM_SCALE_VARS=['--gx-rm-amount-scale','--gx-rm-badge-scale'];
function withRestTransforms(fn){
 const saved={};
 for(const k of RM_TRANSFORM_VARS){saved[k]=root.style.getPropertyValue(k);root.style.setProperty(k,'0px');}
 for(const k of RM_SCALE_VARS){saved[k]=root.style.getPropertyValue(k);root.style.setProperty(k,'1');}
 if(S.sticky)void S.sticky.offsetHeight;
 try{fn();}
 finally{
  for(const k in saved)root.style.setProperty(k,saved[k]);
  if(S.sticky)void S.sticky.offsetHeight;
 }
}

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

/* ---- marquee de la píldora (R17-completar) ---- */
let badgeObs=null,myBadge=null,badgeAnim=null,badgeOverflow=0;
function badgeTextNode(){
 return S.badge?S.badge.querySelector('.gx-rm-badge-text'):null;
}
/* Envuelve el texto de la píldora en su span interno. El render
 * oficial y el adaptador B2 escriben badge.textContent, lo que
 * borraría el span: el observador lo repone (ver abajo). */
function wrapBadge(){
 const badge=S.badge;
 if(!badge)return;
 const text=badge.textContent;
 const span=badge.querySelector('.gx-rm-badge-text');
 if(span){
  if(span.textContent!==text){myBadge=text;span.textContent=text;}
  return;
 }
 myBadge=text;
 badge.textContent='';
 const s=document.createElement('span');
 s.className='gx-rm-badge-text';
 s.textContent=text;
 badge.appendChild(s);
}
function attachBadgeObserver(){
 if(badgeObs)badgeObs.disconnect();
 const badge=S.badge;
 if(!badge)return;
 badgeObs=new MutationObserver(()=>{
  if(!S.badge||!S.badge.isConnected)return;
  /* El span interno es lo que anima el marquee: si desapareció,
   * hay que reponerlo SIEMPRE, aunque el texto sea el mismo.
   * El adaptador B2 escribe badge.textContent en cada render()
   * con el MISMO texto; ese textContent destruye el span y el
   * guardado por igualdad (textContent===myBadge) lo dejaba
   * muerto: sin span no hay marquee y la píldora recorta
   * centrada ("rvicio vencido · 6…", bug del video de Henry).
   * Escritura propia (wrapBadge): el span existe y el texto
   * coincide, se ignora. */
  if(!S.badge.querySelector('.gx-rm-badge-text')){wrapBadge();repaint();return;}
  if(S.badge.textContent===myBadge)return;
  wrapBadge();
  repaint();
 });
 badgeObs.observe(badge,{characterData:true,childList:true,subtree:true});
}
function stopBadgeMarquee(){
 if(badgeAnim){badgeAnim.cancel();badgeAnim=null;}
 badgeOverflow=0;
 root.removeAttribute('data-gx-rm-badge-marquee');
 const span=badgeTextNode();
 if(span)span.style.transform='';
}
/* Mide si el texto cabe y arranca/para el marquee. Solo se mueve
 * el texto DENTRO de la píldora: la caja no cambia, así que no
 * se encima al precio ni se sale de la barra. */
function updateMarquee(){
 const badge=S.badge,span=badgeTextNode();
 if(!badge||!span){stopBadgeMarquee();return;}
 const cs=getComputedStyle(badge);
 const avail=Math.max(0,badge.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0));
 const over=Math.max(0,span.scrollWidth-avail);
 if(over<=4){stopBadgeMarquee();return;}
 /* El alineado a la izquierda depende SOLO del overflow, no de
  * la animación: con justify-content:center el recorte se comía
  * el INICIO del texto ("🚨 Servicio vencido" se veía "ervicio
  * vencido · 6…"). Con reduced-motion no hay marquee, pero el
  * texto sí empieza a la izquierda y se lee desde el principio. */
 root.setAttribute('data-gx-rm-badge-marquee','1');
 const prevOverflow=badgeOverflow;
 badgeOverflow=over;
 if(reducedMQ.matches){
  if(badgeAnim){badgeAnim.cancel();badgeAnim=null;}
  return;
 }
 /* La animación pertenece al span actual: si el span se repuso
  * (re-render del adaptador/B2), la animación guardada apunta
  * al span viejo ya desconectado y el guardado por overflow
  * la dejaría correr en el vacío mientras el span nuevo no se
  * mueve. También se descarta si quedó cancelada. */
 if(badgeAnim&&(!badgeAnim.effect||badgeAnim.effect.target!==span||
   badgeAnim.playState==='idle')){badgeAnim.cancel();badgeAnim=null;}
 if(badgeAnim&&prevOverflow===over)return;
 if(badgeAnim)badgeAnim.cancel();
 /* Ida y vuelta suave con pausa en cada extremo: el texto se
  * desplaza hasta el final y regresa. ~45 ms por px + holds. */
 const dur=Math.min(9000,Math.max(2400,over*45+1600));
 badgeAnim=span.animate([
  {transform:'translateX(0)',offset:0},
  {transform:'translateX(0)',offset:.22},
  {transform:'translateX('+(-over)+'px)',offset:.78},
  {transform:'translateX('+(-over)+'px)',offset:1}
 ],{duration:dur,easing:'ease-in-out',iterations:Infinity,direction:'alternate'});
 if(document.hidden)badgeAnim.pause();
}
function pauseBadgeMarquee(paused){
 if(!badgeAnim)return;
 if(paused)badgeAnim.pause();
 else badgeAnim.play();
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
 /* La etiqueta ("Próximo pago") se disuelve con la misma curva
  * con la que el importe sube a su fila (paired, 0.05→0.35):
  * desde R17 la etiqueta se desvanecía con spreadV (0.75→0.875)
  * pero el importe ya sube 17 px a su fila desde p≈0.1, así que
  * a mitad de morph el precio cubría la etiqueta todavía opaca
  * ("PRÓXIMO PAGO" tapado por $53.90, video de Henry). En
  * compacto siguen sin quedar ni título ni etiqueta: el título
  * se desvanece con spreadV, la etiqueta al subir el importe. */
 const labelFade=paired;
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
  /* R17-completar · si el texto nuevo cambió el alto del hero,
   * remediar la geometría: con tops viejos el contenido quedaba
   * solapado bajo la barra. */
  if(S.hero.offsetHeight!==geo.heroH)remeasureGeometry();
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
 root.style.setProperty('--gx-rm-label-opacity',String(1-labelFade));
 root.style.setProperty('--gx-rm-progress',p.toFixed(3));
 root.dataset.gxRmCompact=String(p>.95);
 /* La "X" recibe puntero en cuanto empieza a
  * verse (spreadH>0), no solo en compacto total. */
 root.dataset.gxRmSpaceVisible=String(spreadH>0.02);
 updateMarquee();
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
 /* Durante el asentamiento el morph sigue al scroll con el tau
  * rápido (26 ms): con el tau normal (64 ms) y el salto del
  * scroll, el precio quedaba grande mientras el contenido ya
  * había subido y tapaba el tracker a mitad de morph. */
 const tau=snapping?SETTLE_TAU:((now-lastScroll)>IDLE_MS?SETTLE_TAU:TAU);
 value+=(goal-value)*(1-Math.exp(-dt/tau));
 if(Math.abs(goal-value)<.003)value=goal;
 paint();
 if(value!==goal)schedule();
 else{clearTimeout(watchdog);watchdog=0;lastTick=0}
}
/* arm=false: actualizar el objetivo y repintar SIN armar el
 * asentamiento. El resize (la barra del navegador en Safari
 * aparece/desaparece al desplazar) armaba el salto: 250 ms
 * después la página se iba sola al ancla y el encabezado
 * "bugueaba". El desplazamiento real sí arma el asentamiento. */
function request(arm=true){
 if(!S.sticky)return;
 goal=clamp(window.scrollY/geo.range);
 /* R8/R9 · al desplazar, el conteo del hero se cancela y deja el
  * valor exacto: contar mientras el precio viaja fue el bug del
  * espejo viejo ($45.72 / $86.16 a mitad de morph). */
 if(window.scrollY>0){heroCounter.cancel(true);displayedCents=heroCounter.shown;}
 lastScroll=performance.now();
 if(arm&&!snapping&&!touching)armSnap();
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
  /* Asentamiento más despacio (0.18 por frame, antes 0.25): con
   * el salto rápido el morph no alcanzaba al scroll y el precio
   * grande pasaba por encima del tracker a mitad de morph. */
  window.scrollTo(0,y+d*.18);
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
 S.sticky=sticky;S.hero=hero;S.header=sticky.querySelector('.header');
 S.label=hero.querySelector('.total-label');
 S.amount=amount;S.badge=badge;
 S.content=document.querySelector('.scrollable-content');
 S.banner=sticky.querySelector('.alert-banner');
 /* La medición se hace con los transforms neutralizados: si un
  * re-render cae a mitad de morph, medir con rects visuales
  * corrompía la base (ver withRestTransforms). */
 withRestTransforms(()=>{
  measureFlow();
  root.dataset.gxIndexMorph='r17';
  measureSticky();
 });
 let btn=hero.querySelector('.gx-index-close-btn');
 if(!btn){
  btn=document.createElement('a');
  btn.className='gx-index-close-btn';
  btn.href='ayuda.html';
  btn.setAttribute('aria-label','Mi Espacio');
  btn.title='Mi Espacio';
  btn.textContent='✕';
  /* El ancla ya navega sola; el click es red de seguridad.
   * Además, en iOS el clic sintetizado se cancela si la página
   * se desplaza entre el toque y el clic (el asentamiento mueve
   * el scroll): el pointerup con guardia de movimiento navega
   * aunque el clic no llegue. La guardia (>10 px) evita navegar
   * cuando el gesto era desplazar empezando sobre la X. El
   * candado navDone evita la doble navegación: pointerup y clic
   * disparan los dos en un mismo toque y el segundo assign
   * abortaba la primera navegación (ERR_ABORTED). */
  let navDone=false;
  const goSpace=()=>{if(navDone)return;navDone=true;window.location.assign('ayuda.html');};
  /* preventDefault en el clic: sin él, el pointerup ya navega por
   * assign y luego el clic dispara ADEMÁS la navegación nativa
   * del ancla a la misma URL, abortando la primera (ERR_ABORTED
   * intermitente). Con preventDefault solo queda una navegación:
   * la de assign (o la del clic si el pointerup no llegó, p. ej.
   * activación por teclado, que no genera pointer events). */
  btn.addEventListener('click',e=>{e.preventDefault();goSpace();});
  btn.addEventListener('pointerdown',e=>{btn._gxDownX=e.clientX;btn._gxDownY=e.clientY;});
  btn.addEventListener('pointerup',e=>{
   const dx=e.clientX-(btn._gxDownX??e.clientX),dy=e.clientY-(btn._gxDownY??e.clientY);
   if(Math.hypot(dx,dy)>10)return;
   if(document.documentElement.dataset.gxRmSpaceVisible!=='true')return;
   goSpace();
  });
  hero.appendChild(btn);
 }
 S.btn=btn;
 btnW=btn.offsetWidth;btnH=btn.offsetHeight;
 attachAmountObserver();
 attachBadgeObserver();
 wrapBadge();
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
 pauseBadgeMarquee(document.hidden);
});
window.addEventListener('scroll',request,{passive:true});
window.addEventListener('scrollend',request,{passive:true});
window.addEventListener('scrollend',onScrollEnd,{passive:true});
window.addEventListener('touchstart',()=>{touching=true;clearTimeout(snapTimer);cancelSnap()},{passive:true});
window.addEventListener('touchend',()=>{touching=false;armSnap()},{passive:true});
window.addEventListener('wheel',()=>{cancelSnap()},{passive:true});
/* El resize (la barra del navegador en Safari aparece/desaparece
 * al desplazar) NO arma el asentamiento y cancela el temporizador
 * pendiente: sin esto, 250 ms después del resize la página se
 * iba sola al ancla y el encabezado "bugueaba" en mitad del
 * gesto. El siguiente desplazamiento real vuelve a armarlo. */
window.addEventListener('resize',()=>{clearTimeout(snapTimer);paint();request(false)},{passive:true});
if(reducedMQ.addEventListener)reducedMQ.addEventListener('change',request);
bind();
window.GOXION_INDEX_MORPH=Object.freeze({
 progress:()=>value,
 repaint,
 bound:()=>!!S.sticky,
 range:()=>geo.range,
 marquee:()=>({active:!!badgeAnim,overflow:badgeOverflow}),
});
})();
