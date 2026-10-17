import React, {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
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


/* They are all Gixys; geometry is an internal renderer detail, not a name. */
const sayings={
 mission:[
  '¡Somos los Gixys, el equipo de Goxy!',
  'Goxy dice que cada logro merece alegría.',
  'Creo que soy Gixy dos... ¿o tres? ¡Ups!',
  'Goxy nos pidió cuidar cada pequeño logro.',
  'En GOXION, hasta los píxeles celebran.'
 ],
 loyalty:[
  'Goxy nos enseñó que la confianza vale oro.',
  '¡Soy Gixy! ¿Qué número? No lo recuerdo.',
  'La constancia también tiene superpoderes.',
  'Goxy nos dejó a cargo de las sonrisas.',
  'Tres Gixys y una misión: acompañarte.'
 ],
 notification:[
  '¡Uno de los Gixys reportándose!',
  'Goxy nos dijo que estuviéramos atentos.',
  '¿Soy Gixy tres? Eso dice mi calculadora.',
  'Tenemos noticias. ¡Sin hacer ruido!',
  'Con Goxy, siempre hay algo nuevo.'
 ]
};
const WRITE_MS=39;
const MAX_LINE=121;
// Balanced pre-layout: prefer three readable lines over four cramped ones.
// Never leave "que", "de", "y", etc. alone at the end of a short sentence.
function wrapSpeech(message){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(ctx)ctx.font='600 10.5px Poppins,system-ui,sans-serif';
 const size=t=>ctx?ctx.measureText(t).width:[...t].length*5.7;
 const words=message.trim().split(/\s+/);
 if(words.length<2)return message;
 let best=null;
 const limit=MAX_LINE;
 const memo=new Map();
 function divide(i,remaining){
  if(i===words.length)return {cost:0,lines:[]};
  if(remaining===0)return null;
  const key=i+'|'+remaining;
  if(memo.has(key))return memo.get(key);
  let winner=null;
  for(let e=i+1;e<=words.length;e++){
   const line=words.slice(i,e).join(' '),len=size(line);
   if(len>limit&&e>i+1)break;
   const next=divide(e,remaining-1);
   if(!next)continue;
   const short=words[e-1].replace(/[¡!¿?.,;:]/g,'').length;
   const isLast=e===words.length;
   const orphan=e===i+1&&short<=4;
   const trailing=short<=3&&!isLast;
   const ragged=(limit-Math.min(limit,len))/limit;
   const score=next.cost+ragged*ragged*13
    +(orphan?110:0)+(trailing?48:0)
    +(isLast&&len<limit*.28?65:0)+(len>limit?80:0)+9;
   if(!winner||score<winner.cost)winner={cost:score,lines:[line,...next.lines]};
  }
  memo.set(key,winner);
  return winner;
 }
 for(const n of [3,4]){
  memo.clear();
  const solution=divide(0,n);
  if(solution&&(!best||solution.cost<best.cost))best=solution;
 }
 return best?.lines.join('\n')||message;
}
function measureSpeech(visible,full){
 const ctx=document.createElement('canvas').getContext('2d');
 if(ctx)ctx.font='600 10.5px Poppins,system-ui,sans-serif';
 const size=t=>ctx?ctx.measureText(t).width:t.length*5.7;
 const shownLines=visible.split('\n');
 const lastIndex=shownLines.length-1;
 const lineStart=visible.lastIndexOf('\n')+1;
 const remainder=full.slice(lineStart);
 const consumed=shownLines[lastIndex]||'';
 // Reserve width for the word currently being typed, so the glass grows at
 // WORD boundaries instead of jittering each pixel on each keystroke.
 const nextSpace=remainder.indexOf(' ',consumed.length);
 const nextBreak=remainder.indexOf('\n',consumed.length);
 const end=[nextSpace,nextBreak].filter(v=>v>=0).sort((a,b)=>a-b)[0];
 const reserved=remainder.slice(0,end===undefined?remainder.length:end);
 const width=Math.max(0,...shownLines.map(size),size(reserved));
 const height=Math.min(75,Math.ceil(17+14.3*shownLines.length));
 return {width:Math.min(144,Math.max(36,Math.ceil(width+19))),height:Math.max(32,height)};
}
function GixyMessage({kind,serial,phase,onDismiss,onEngage,onTextComplete,onTouch}){
 const cfg=hints[kind],scene=useRef(null),lock=useRef(true);
 const textVersion=useRef(0),writeTimer=useRef(null),unlockTimer=useRef(null);
 const reactionTimer=useRef(null),done=useRef(onTextComplete),touchRef=useRef(onTouch);
 done.current=onTextComplete;touchRef.current=onTouch;
 const [layout,setLayout]=useState(null);
 const [touches,setTouches]=useState(0);
 const [text,setText]=useState(cfg.text);
 const [charsShown,setCharsShown]=useState(0);
 const [typing,setTyping]=useState(true);
 const [ready,setReady]=useState(false);
 const [reacting,setReacting]=useState(false);
 const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
 const full=useMemo(()=>wrapSpeech(text),[text]);
 const glyphs=useMemo(()=>[...full],[full]);
 const written=glyphs.slice(0,charsShown).join('');
 const speechSize=useMemo(()=>measureSpeech(written,full),[written,full]);
 useEffect(()=>{
  const version=++textVersion.current;
  clearTimeout(writeTimer.current);clearTimeout(unlockTimer.current);
  lock.current=true;setReady(false);setCharsShown(0);setTyping(true);
  if(reduced){
   setCharsShown(glyphs.length);setTyping(false);setReady(true);lock.current=false;
   done.current?.();return;
  }
  let cursor=0;
  const tick=()=>{
   if(version!==textVersion.current)return;
   cursor=Math.min(cursor+1,glyphs.length);
   setCharsShown(cursor);
   if(cursor<glyphs.length){
    writeTimer.current=setTimeout(tick,glyphs[cursor-1]==='\n'?80:WRITE_MS);
   }else{
    setTyping(false);
    done.current?.();
    unlockTimer.current=setTimeout(()=>{
     if(version===textVersion.current){lock.current=false;setReady(true);}
    },220);
   }
  };
  writeTimer.current=setTimeout(tick,170);
  return ()=>{
   textVersion.current++;
   clearTimeout(writeTimer.current);clearTimeout(unlockTimer.current);
  };
 },[full,reduced,glyphs.length]);
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
 useEffect(()=>()=>clearTimeout(reactionTimer.current),[]);
 function play(){
  if(phase!=='shown'||!layout||lock.current)return;
  lock.current=true;setReady(false);setTyping(true);setCharsShown(0);
  const n=touches+1;setTouches(n);
  const next=touchRef.current?.(kind,n);
  setText(next||sayings[kind][(n-1)%sayings[kind].length]);
  setReacting(true);
  clearTimeout(reactionTimer.current);
  reactionTimer.current=setTimeout(()=>setReacting(false),1850);
  onEngage();
 }
 const visible=Boolean(layout);
 return <div ref={scene} className={'gx-gixy-message'+(visible?' is-visible':'')+(phase!=='shown'?' is-leaving':'')}
  data-kind={kind} data-variant={serial%5} data-placement={layout?.slot??'hidden'}
  data-touch-count={touches} data-phase={phase} data-typing={typing?'true':'false'}
  data-visible-chars={charsShown} data-write-ms={WRITE_MS}
  style={{left:layout?.left??0,top:layout?.top??0,visibility:visible?'visible':'hidden'}}>
  <button className="gx-gixy-message__avatar" type="button"
   disabled={phase!=='shown'||!ready} onClick={play}
   aria-label="Tocar a un Gixy para una sorpresa"
   title={typing?'Un Gixy está hablando':'Toca a un Gixy'}>
   <BotAvatar type={cfg.kind} color={palette[cfg.kind]} size={50} face="eyes"
    shading="plastic" state={(reacting||typing)?'working':'default'} turn={1} speed={.72}
    depth={.74} jumpSpin={1} jumpEvery={8} interactive={false} theme="dark"/>
   <span className="gx-gixy-joy" key={text+'-'+touches} aria-hidden="true">
    {['✦','♥','✧','✦','♥','·','✧','✦'].map((symbol,i)=>
     <span key={i} className={'gx-gixy-joy__piece gx-gixy-joy__piece--'+i}
      style={{'--i':i}}>{symbol}</span>)}
   </span>
  </button>
  <button className="gx-gixy-message__bubble" type="button"
   aria-label="Cerrar mensaje de un Gixy" onClick={()=>onDismiss('fade')}
   style={{'--gx-bubble-width':speechSize.width+'px','--gx-bubble-height':speechSize.height+'px'}}>
   <span className="gx-gixy-message__written" aria-hidden="true">{written}</span>
   <span className="gx-gixy-message__sr" role="status" aria-live="polite">{text}</span>
  </button>
 </div>;
}
function Messages(){
 const [current,setCurrent]=useState(null);
 const [reward,setReward]=useState(false);
 const [found,setFound]=useState(0);
 const timers=useRef({shown:null,exit:null,reward:null}),currentKind=useRef(null);
 const last=useRef({}),count=useRef(0),met=useRef(new Set());
 const awaitingReward=useRef(false),alreadyAwarded=useRef(false);
 const clearTimers=()=>{clearTimeout(timers.current.shown);clearTimeout(timers.current.exit);};
 const dismiss=(mode='fade')=>{
  if(!currentKind.current)return;
  clearTimers();
  const old=currentKind.current;
  setCurrent(c=>c&&c.kind===old?{...c,phase:mode}:c);
  timers.current.exit=setTimeout(()=>{
   if(currentKind.current===old){currentKind.current=null;setCurrent(null);}
  },400);
 };
 const onEngage=()=>{
  clearTimeout(timers.current.shown);
  timers.current.shown=setTimeout(()=>dismiss(),9000);
 };
 const onTouch=(kind,n)=>{
  if(!met.current.has(kind)&&!alreadyAwarded.current){
   met.current.add(kind);setFound(met.current.size);
   if(met.current.size===1)return 'Goxy dejó un secreto entre nosotros tres...';
   if(met.current.size===2)return '¡Dos saludos! Te falta encontrar al otro Gixy.';
   awaitingReward.current=true;
   return '¡Nos encontraste! Goxy guardó una sorpresa.';
  }
  return sayings[kind][(n-1)%sayings[kind].length];
 };
 const onTextComplete=()=>{
  clearTimeout(timers.current.shown);
  timers.current.shown=setTimeout(()=>dismiss(),3300);
  if(awaitingReward.current&&!alreadyAwarded.current){
   awaitingReward.current=false;alreadyAwarded.current=true;
   setReward(true);
   clearTimeout(timers.current.reward);
   timers.current.reward=setTimeout(()=>setReward(false),10000);
  }
 };
 useEffect(()=>{
  const unsubs=Object.keys(hints).map(kind=>{
   const handler=event=>{
    if(!event.detail?.active){if(currentKind.current===kind)dismiss();return;}
    const now=Date.now();if(now-(last.current[kind]||0)<2500)return;
    last.current[kind]=now;clearTimers();count.current++;
    currentKind.current=kind;
    setCurrent({kind,serial:count.current,phase:'shown'});
    timers.current.shown=setTimeout(()=>dismiss(),11000); // watchdog for stalled tabs
   };
   document.addEventListener('gx-mirror:'+kind,handler);
   return ()=>document.removeEventListener('gx-mirror:'+kind,handler);
  });
  return ()=>{unsubs.forEach(fn=>fn());clearTimers();clearTimeout(timers.current.reward);};
 },[]);
 return <>
  {current?<GixyMessage key={current.serial} {...current} onDismiss={dismiss}
   onEngage={onEngage} onTouch={onTouch} onTextComplete={onTextComplete}/>:null}
  {reward?<div className="glass-card gx-gixys-secret" role="status" aria-live="polite">
   <span className="gx-gixys-secret__aura" aria-hidden="true"></span>
   <span className="gx-gixys-secret__confetti" aria-hidden="true">
    {Array.from({length:30},(_,i)=><i key={i} style={{
     '--dx':((i%10)-4.5)*(13+(i%3)*5)+'px',
     '--dy':(-42-(Math.floor(i/10)*22)-(i%4)*5)+'px',
     '--rot':(i%2?420:-360)+'deg',
     '--delay':((i%7)*45)+'ms',
     '--tone':i%3===0?'#04dbee':i%3===1?'#9368ff':'#ff6caa'
    }}/>)}
   </span>
   <div className="gx-gixys-secret__top">SECRETO DE LOS GIXYS <span>3/3</span></div>
   <div className="gx-gixys-secret__award">5 % OFF <small>de demostración</small></div>
   <p>¡Encontraste a los tres! Este cupón es ficticio: no se generó ni aplicó un descuento real.</p>
   <button type="button" onClick={()=>setReward(false)} aria-label="Cerrar recompensa de demostración">Entendido</button>
  </div>:null}
  <span className="gx-gixys-progress" data-found={found} hidden aria-hidden="true">{found}/3</span>
 </>;
}
function LoyaltyHeart(){
  const [liked,setLiked]=useState(false);
  return <PulseHeart liked={liked} onChange={next=>{
    setLiked(next);
    document.dispatchEvent(new CustomEvent('gx-mirror:loyalty-toggle',{detail:{value:next}}));
  }} showCount={false} size={28} corner={22} likedColor="#ff4d6d"
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
    components:['PulseHeart','OfficialMorphV1','OfficialBellV1','BalancedTypewriterV3','GixysNativeJoy','EasterEggDemo5','CelebrationConfetti'],
    noBackend:true
  });
}
document.addEventListener('gx-mirror-ready',mount);
if(document.readyState!=='loading')mount();
