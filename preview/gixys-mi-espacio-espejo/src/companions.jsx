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
  loyalty:{kind:'circle',anchor:'#dash-billing-card',text:'¡Avanzaste en lealtad! Consulta tu nuevo nivel.'},
  notification:{kind:'square',anchor:'#gx-client-notif-launch',text:'¡Tienes una novedad! Consulta tu campana.'}
};

const protectedSelectors=[
 '#gx-client-notif-launch','.gx-header-actions > *','.app-logo','#goxion-main-nav',
 '#dynamic-greeting-text','#dash-date','#dash-badge',
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
function GixyMessage({kind,serial,phase,onDismiss}){
 const cfg=hints[kind],scene=useRef(null),avatar=useRef(null);
 const hits=useRef(0),[layout,setLayout]=useState(null),[touches,setTouches]=useState(0);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 useLayoutEffect(()=>{
  let raf=0;
  function place(){
   if(!scene.current)return;
   setLayout(selectPlace(kind,scene.current,serial,scene.current.getBoundingClientRect()));
  }
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
  };
 },[kind,serial]);
 function play(){
  if(phase!=='shown'||!layout)return;
  hits.current+=1;setTouches(hits.current);
  const n=hits.current;
  if(n>=4){onDismiss('hop');return;}
  if(reduced)return;
  const dir=n%2?1:-1,amplitude=n===1?10:n===2?16:19;
  // Contained wall rebounds: never send the avatar over a payment or navigation action.
  avatar.current?.getAnimations?.().forEach(a=>a.cancel());
  avatar.current?.animate([
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:0},
   {transform:'translate3d('+(dir*amplitude)+'px,-'+(5+n*2)+'px,0) rotate('+(dir*15)+'deg) scale(.92,1.09)',offset:.24},
   {transform:'translate3d('+(dir*-7)+'px,2px,0) rotate('+(dir*-9)+'deg) scale(1.12,.93)',offset:.49},
   {transform:'translate3d('+(dir*4)+'px,-3px,0) rotate('+(dir*4)+'deg) scale(.97,1.04)',offset:.7},
   {transform:'translate3d(0,0,0) rotate(0deg) scale(1)',offset:1}
  ],{duration:550+70*n,easing:'cubic-bezier(.19,.94,.26,1)'});
 }
 const visible=Boolean(layout),leaving=phase!=='shown';
 return <div ref={scene}
   className={'gx-gixy-message'+(visible?' is-visible':'')+(leaving?' is-leaving':'')+
    (phase==='hop'?' is-hopping':'')}
   data-kind={kind} data-variant={serial%5} data-placement={layout?.slot??'hidden'}
   data-touch-count={touches} data-phase={phase}
   style={{left:layout?.left??0,top:layout?.top??0,visibility:visible?'visible':'hidden'}}>
   <button className="gx-gixy-message__avatar" type="button" ref={avatar}
     onClick={play} disabled={leaving} aria-label={'Jugar con Gixy '+kind}
     title="Toca a Gixy para hacerlo rebotar">
     <BotAvatar type={cfg.kind} color={palette[cfg.kind]} size={50} face="eyes"
      shading="plastic" state="working" turn={1} speed={.92} depth={.74}
      jumpSpin={1} jumpEvery={8} interactive={false} theme="dark"/>
   </button>
   <button className="gx-gixy-message__bubble" type="button"
     onClick={()=>onDismiss('fade')}
     aria-label={'Cerrar consejo de Gixy: '+cfg.text}>
     <span role="status" aria-live="polite">{cfg.text}</span>
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
  timers.current.exit=setTimeout(()=>{currentKind.current=null;setCurrent(null);},mode==='hop'?690:390);
 };
 useEffect(()=>{
  const handlers=Object.keys(hints).map(kind=>{
   const listener=e=>{
    if(!e.detail?.active){if(currentKind.current===kind)dismiss('fade');return;}
    const now=Date.now();
    if(now-(last.current[kind]||0)<2500)return;
    last.current[kind]=now;
    clearTimers();
    count.current++;
    currentKind.current=kind;
    setCurrent({kind,serial:count.current,phase:'shown'});
    timers.current.shown=setTimeout(()=>dismiss('hop'),5000);
   };
   document.addEventListener('gx-mirror:'+kind,listener);
   return ()=>document.removeEventListener('gx-mirror:'+kind,listener);
  });
  return ()=>{handlers.forEach(fn=>fn());clearTimers();};
 },[]);
 return current?<GixyMessage key={current.serial} {...current} onDismiss={dismiss}/>:null;
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
    components:['PulseHeart','OfficialMorphV1','OfficialBellV1','ContextualMessagesV1'],
    noBackend:true
  });
}
document.addEventListener('gx-mirror-ready',mount);
if(document.readyState!=='loading')mount();
