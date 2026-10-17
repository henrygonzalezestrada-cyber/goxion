import React, {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BotAvatar} from 'bot-avatars';
import PulseHeart from './vendor/PulseHeart.jsx';

/* Fase 3 beta: messages are deterministic, short and strictly event-driven.
 * Genuine bot-avatars@0.2.2 / Plastic; no second Goxy, no backend request.
 */
const palette={hexagon:'#8663ff',square:'#04c8ee',circle:'#9c6aff'};
const hints={
  mission:{kind:'hexagon',anchor:'#gamif-expanded-coupon',text:'¡Terminaste tus misiones! Revisa tu recompensa.'},
  loyalty:{kind:'circle',anchor:'#loyalty-msg',text:'¡Tu lealtad avanzó de nivel!'},
  notification:{kind:'square',anchor:'#gx-client-notif-launch',text:'¡Tienes una novedad! Consulta tu campana.'}
};

const protectedSelectors=[
 '#gx-client-notif-launch','.gx-header-actions > *','.app-logo','#goxion-main-nav',
 '.gx-mirror-note','#dynamic-greeting-text','#dash-date','#dash-badge',
 '#loyalty-count','#loyalty-msg','.gx-mirror-loyalty-label','#loyalty-bar',
 '.gx-gamif-card-mission .gamif-title','.gx-gamif-card-mission .gx-gamif-card-status',
 '.gx-gamif-progress','#gamif-expanded-coupon .btn-gamif-close',
 '#gamif-expanded-coupon .gx-mirror-expanded-head strong',
 '#gamif-expanded-coupon .gx-mirror-expanded-head p',
 '#gamif-expanded-coupon .mission-item .gx-mission-text',
 '#gamif-expanded-coupon .mission-item .mission-checkbox',
 '#gamif-expanded-coupon .gx-mirror-mission-action',
 '#gamif-expanded-coupon .gx-mirror-retry'
];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
 Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const bounds=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height});
const slots={
 notification:[['below','right',-1],['below','right',11],['below','center',-4]],
 loyalty:[['above','right',-9],['below','right',7],['above','center',6]],
 mission:[['above','right',-4],['below','right',9],['above','left',5]]
};
const contexts={
 notification:['#gx-client-notif-launch','#goxion-main-nav','#dynamic-greeting-text'],
 loyalty:['#dash-billing-card','.gx-mirror-loyalty-label'],
 mission:['#gamif-expanded-coupon .gx-mirror-expanded-head','#gx-mirror-complete-btn']
};
const isShown=el=>{
 const r=el.getBoundingClientRect(),style=getComputedStyle(el);
 return r.width>0&&r.height>0&&style.display!=='none'&&style.visibility!=='hidden';
};
function selectPlace(kind,node,sequence,dimensions){
 const vw=document.documentElement.clientWidth,vh=innerHeight;
 const w=Math.min(dimensions.width||202,vw-22),h=dimensions.height||74;
 if(w<140||h>vh-24)return null;
 // Lealtad: su espacio es la propia línea explicativa, que se expande
 // durante el consejo. Esto impide que Circle salte hasta las tarjetas inferiores.
 if(kind==='loyalty'){
  const row=document.querySelector('#loyalty-msg');
  if(!row||!isShown(row))return null;
  const r=row.getBoundingClientRect();
  const left=clamp(Math.round(r.left+3),12,Math.max(12,vw-w-12));
  const top=Math.round(r.top+3);
  if(top<14||top+h>vh-16)return null;
  return {left,top,width:w,height:h,slot:sequence%3,collision:0,sourceIdx:0,score:0};
 }
 const obstacles=protectedSelectors.flatMap(s=>[...document.querySelectorAll(s)])
   .filter(el=>el!==node&&isShown(el))
   .map(el=>el.getBoundingClientRect())
   .filter(r=>r.right>=0&&r.left<=vw&&r.bottom>=0&&r.top<=vh)
   .map(r=>bounds(r.left-2,r.top-2,r.width+4,r.height+4));

 let best=null;
 contexts[kind].forEach((selector,sourceIdx)=>{
  const source=document.querySelector(selector);
  if(!source||!isShown(source))return;
  const area=source.getBoundingClientRect();
  if(area.bottom<4||area.top>vh-4)return;
  const order=[sequence%3,(sequence+1)%3,(sequence+2)%3];
  order.forEach((idx,priority)=>{
   const [direction,align,delta]=slots[kind][idx];
   let left=align==='right'?area.right-w:align==='left'?area.left:area.left+(area.width-w)/2;
   let top=direction==='above'?area.top-h-9:area.bottom+9;
   left+=delta+[-7,8,0,5,-4][sequence%5];top+=(sequence%2?3:-3);
   // The actual header has a narrow protected gap: stay below the bell and above the menu.
   if(kind==='notification'&&sourceIdx===0)top=area.bottom+3;
   left=clamp(Math.round(left),11,Math.max(11,vw-w-11));
   if(top<12||top+h>vh-14)return;
   top=Math.round(top);
   const box=bounds(left,top,w,h);
   const collision=obstacles.reduce((n,o)=>n+overlap(box,o),0);
   if(collision>40)return;
   const candidate={left,top,width:w,height:h,slot:idx,collision,priority,sourceIdx};
   // Context always wins over a more distant fallback.
   const score=sourceIdx*12+priority*3+collision*.06;
   if(!best||score<best.score)best={...candidate,score};
  });
 });
 return best;
}

const sayings={
 mission:[
  '¡Soy Hex, del equipo de Goxy!',
  'Goxy dice: cada logro cuenta.',
  'Con Goxy, los pequeños pasos importan.',
  'Goxy nos enseñó a celebrar contigo.',
  'Somos los Gixys. ¡Vamos contigo!',
  'En GOXION, los logros se comparten.'
 ],
 loyalty:[
  'Goxy nos enseñó a cuidar tu confianza.',
  'Soy Circle, del pequeño equipo de Goxy.',
  'Para Goxy, cada detalle cuenta.',
  'En GOXION, tu constancia nos inspira.',
  'Goxy y los Gixys te acompañamos.',
  'Tu confianza nos hace mejores.'
 ],
 notification:[
  '¡Square, del equipo de Goxy, presente!',
  'Goxy nos pidió estar atentos.',
  'Somos los ojos curiosos de Goxy.',
  'En GOXION, nada importante se pierde.',
  'Goxy y sus Gixys están contigo.',
  'Un buen aviso merece tu atención.'
 ]
};
// 42 ms por carácter: lectura suave, no teletipo apresurado.
// One exclusive timeout chain per phrase; changing or dismissing the message
// cancels all pending characters and prevents overlapping animations.
const WRITE_MS=42;
function GixyMessage({kind,serial,phase,onDismiss,onEngage,onTextComplete}){
 const cfg=hints[kind],scene=useRef(null),avatar=useRef(null),metric=useRef(null);
 const textVersion=useRef(0),writeTimer=useRef(null),unlockTimer=useRef(null);
 const reactTimer=useRef(null),touchLock=useRef(true);
 const doneRef=useRef(onTextComplete);doneRef.current=onTextComplete;
 const [layout,setLayout]=useState(null);
 const [touches,setTouches]=useState(0);
 const [text,setText]=useState(cfg.text);
 const [charsShown,setCharsShown]=useState(0);
 const [typing,setTyping]=useState(true);
 const [speechSize,setSpeechSize]=useState({width:34,height:34});
 const [reacting,setReacting]=useState(false);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const letters=[...text];
 const written=letters.slice(0,charsShown).join('');
 useEffect(()=>{
  const version=++textVersion.current;
  clearTimeout(writeTimer.current);clearTimeout(unlockTimer.current);
  touchLock.current=true;setCharsShown(0);setTyping(true);
  const glyphs=[...text];
  if(reduced){
   setCharsShown(glyphs.length);setTyping(false);
   touchLock.current=false;doneRef.current?.();
   return;
  }
  let cursor=0;
  function write(){
   if(textVersion.current!==version)return;
   cursor=Math.min(cursor+1,glyphs.length);
   setCharsShown(cursor);
   if(cursor<glyphs.length){
    writeTimer.current=setTimeout(write,WRITE_MS);
   }else{
    setTyping(false);
    doneRef.current?.();
    unlockTimer.current=setTimeout(()=>{
     if(textVersion.current===version)touchLock.current=false;
    },240);
   }
  }
  writeTimer.current=setTimeout(write,190);
  return ()=>{
   textVersion.current++;
   clearTimeout(writeTimer.current);clearTimeout(unlockTimer.current);
  };
 },[text,kind,reduced]);
 // Bubble dimensions are driven by the actual visible letters, not total text.
 // Width and height use numeric transitions, including when a word wraps.
 useLayoutEffect(()=>{
  const el=metric.current;
  if(!el)return;
  const box=el.getBoundingClientRect();
  const width=clamp(Math.ceil(box.width),32,132);
  const height=clamp(Math.ceil(box.height),34,64);
  setSpeechSize(old=>old.width===width&&old.height===height?old:{width,height});
 },[written]);
 useLayoutEffect(()=>{
  let raf=0;
  if(kind==='loyalty')document.body.classList.add('gx-loyalty-speaking');
  const place=()=>{
   if(!scene.current)return;
   setLayout(selectPlace(kind,scene.current,serial,scene.current.getBoundingClientRect()));
  };
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(place);};
  place();
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('scroll',schedule,{passive:true,capture:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  return ()=>{
   cancelAnimationFrame(raf);
   window.removeEventListener('resize',schedule);
   window.removeEventListener('scroll',schedule,true);
   window.visualViewport?.removeEventListener('resize',schedule);
   window.visualViewport?.removeEventListener('scroll',schedule);
   if(kind==='loyalty')document.body.classList.remove('gx-loyalty-speaking');
  };
 },[kind,serial]);
 useEffect(()=>()=>{clearTimeout(reactTimer.current);},[]);
 function play(){
  // The lock is synchronous; taps during writing/reaction cannot queue or
  // cancel half-written bubbles. Same phrase cannot be started twice.
  if(phase!=='shown'||!layout||touchLock.current)return;
  touchLock.current=true;
  const n=touches+1;
  setTouches(n);setText(sayings[kind][(n-1)%sayings[kind].length]);
  setReacting(true);
  clearTimeout(reactTimer.current);
  reactTimer.current=setTimeout(()=>setReacting(false),610);
  onEngage();
 }
 const visible=Boolean(layout),leaving=phase!=='shown';
 return <div ref={scene}
  className={'gx-gixy-message'+(visible?' is-visible':'')+(leaving?' is-leaving':'')}
  data-kind={kind} data-variant={serial%5} data-placement={layout?.slot??'hidden'}
  data-touch-count={touches} data-phase={phase}
  data-typing={typing?'true':'false'} data-visible-chars={charsShown}
  data-write-ms={WRITE_MS}
  style={{left:layout?.left??0,top:layout?.top??0,visibility:visible?'visible':'hidden'}}>
  <button className="gx-gixy-message__avatar" type="button" ref={avatar}
   onClick={play} disabled={leaving||typing} aria-label={'Tocar a Gixy '+kind+' para otra frase'}
   title={typing?'Gixy está hablando':'Toca para escuchar otra frase de Goxy'}>
   <BotAvatar type={cfg.kind} color={palette[cfg.kind]} size={50} face="eyes"
    shading="plastic" state={reacting?'working':'default'} turn={1} speed={.82}
    depth={.74} jumpSpin={1} jumpEvery={8} interactive={false} theme="dark"/>
  </button>
  <button className="gx-gixy-message__bubble" type="button"
   onClick={()=>onDismiss('fade')} aria-label={'Cerrar consejo: '+text}
   style={{width:speechSize.width+'px',height:speechSize.height+'px'}}>
   <span className="gx-gixy-message__measure" ref={metric} aria-hidden="true">{written||'\u00a0'}</span>
   <span className="gx-gixy-message__written" aria-hidden="true">{written}</span>
   <span className="gx-gixy-message__sr" role="status" aria-live="polite">{text}</span>
  </button>
 </div>;
}
function Messages(){
 const [current,setCurrent]=useState(null);
 const timers=useRef({shown:null,exit:null}),currentKind=useRef(null),last=useRef({}),count=useRef(0);
 const clearTimers=()=>{clearTimeout(timers.current.shown);clearTimeout(timers.current.exit);};
 const dismiss=(mode='fade')=>{
  if(!currentKind.current)return;
  clearTimers();
  const exitingKind=currentKind.current;
  setCurrent(c=>c&&c.kind===exitingKind?{...c,phase:mode}:c);
  timers.current.exit=setTimeout(()=>{
   // An older exit must not remove a newer event that replaced it.
   if(currentKind.current===exitingKind){currentKind.current=null;setCurrent(null);}
  },430);
 };
 const engage=()=>{
  clearTimeout(timers.current.shown);
  timers.current.shown=setTimeout(()=>dismiss(),8700);
 };
 const textComplete=()=>{
  clearTimeout(timers.current.shown);
  timers.current.shown=setTimeout(()=>dismiss(),2900);
 };
 useEffect(()=>{
  const listeners=Object.keys(hints).map(kind=>{
   const listener=event=>{
    if(!event.detail?.active){if(currentKind.current===kind)dismiss();return;}
    const now=Date.now();
    if(now-(last.current[kind]||0)<2500)return;
    last.current[kind]=now;clearTimers();
    count.current++;
    currentKind.current=kind;
    setCurrent({kind,serial:count.current,phase:'shown'});
    // Watchdog even if text animation or tab visibility stalls.
    timers.current.shown=setTimeout(()=>dismiss(),10000);
   };
   document.addEventListener('gx-mirror:'+kind,listener);
   return ()=>document.removeEventListener('gx-mirror:'+kind,listener);
  });
  return ()=>{listeners.forEach(unlisten=>unlisten());clearTimers();};
 },[]);
 return current?<GixyMessage key={current.serial} {...current}
  onDismiss={dismiss} onEngage={engage} onTextComplete={textComplete}/>:null;
}
function LoyaltyHeart(){
  const [liked,setLiked]=useState(false);
  return <PulseHeart liked={liked} onChange={next=>{
    setLiked(next);
    document.dispatchEvent(new CustomEvent('gx-mirror:loyalty-toggle',{detail:{value:next}}));
  }} showCount={false} size={35} corner={24} likedColor="#ff4d6d"
    idleColor="#ff4d6d" pillColor="transparent" textColor="#fff" duration={560}
    dotSize={.3} overshoot={1.7} label="Probar avance de lealtad"/>;
}
let mounted=false;
function mount(){
  if(mounted||!window.GOXION_GIXYS_MIRROR)return;
  const heart=document.getElementById('gx-mirror-heart');
  if(!heart)return;
  createRoot(heart).render(<LoyaltyHeart/>);
  const holder=document.createElement('div');
  holder.id='gx-gixys-message-root';document.body.append(holder);
  createRoot(holder).render(<Messages/>);
  mounted=true;
  window.GOXION_GIXYS_ESPEJO_ENGINE=Object.freeze({
    renderer:'bot-avatars@0.2.2',shading:'plastic',
    components:['PulseHeart','OfficialMorphV1','OfficialBellV1','TypewriterBubbleV1','GoxyFamilySayingsV1'],
    noBackend:true
  });
}
document.addEventListener('gx-mirror-ready',mount);
if(document.readyState!=='loading')mount();
