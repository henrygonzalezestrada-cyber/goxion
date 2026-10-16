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
 '#gx-client-notif-launch','.app-logo','.gx-header-actions','#goxion-main-nav',
 '.gx-mirror-note','#dynamic-greeting-text','#dash-date','#dash-badge',
 '#loyalty-count','#loyalty-msg','.gx-mirror-loyalty-label','#loyalty-bar',
 '.gx-gamif-card-mission .gamif-title','.gx-gamif-card-mission .gx-gamif-card-status',
 '.gx-gamif-progress','#gamif-expanded-coupon .btn-gamif-close',
 '#gamif-expanded-coupon .gx-mirror-expanded-head strong',
 '#gamif-expanded-coupon .gx-mirror-expanded-head p',
 '#gamif-expanded-coupon .mission-item',
 '#gamif-expanded-coupon .gx-mirror-mission-action',
 '#gamif-expanded-coupon .gx-mirror-retry'
];
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
const intersection=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
  Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
const rect=(left,top,width,height)=>({left,top,right:left+width,bottom:top+height});
function choosePosition(kind,node,variant,box){
  const cfg=hints[kind],anchor=document.querySelector(cfg.anchor);
  if(!anchor||!anchor.isConnected)return null;
  const viewport=window.visualViewport;
  // Browser viewport coordinates match getBoundingClientRect(); safe areas are conservative.
  const vw=Math.min(document.documentElement.clientWidth,viewport?.width||innerWidth);
  const vh=Math.min(innerHeight,viewport?.height||innerHeight);
  const a=anchor.getBoundingClientRect();
  if(a.bottom<0||a.top>vh-5)return null;
  const width=Math.min(box.width||212,vw-20);
  const height=box.height||86;
  const anchors=[
    [a.right-width+8,a.top-height-14],
    [a.left+8,a.bottom+14],
    [a.left+(a.width-width)/2,a.top-height-15],
    [a.right-width+8,a.bottom+15],
    [a.left-width-12,a.top+5],
    [a.right+11,a.top+5],
    [a.left+12,a.top+(a.height-height)/2],
    [a.right-width-6,a.top+(a.height-height)/2],
    [vw-width-12,Math.max(17,Math.min(vh-height-16,a.top-42))],
    [12,Math.max(17,Math.min(vh-height-16,a.bottom+7))]
  ];
  // Nearby gaps are preferred; if dense, scan clear space without covering controls.
  for(let top=12;top<=vh-height-12;top+=24){
    if(Math.abs(top-(a.top+a.height/2))>390)continue;
    for(const left of [12,(vw-width)/2,vw-width-12]){
      anchors.push([left,top]);
    }
  }
  const shifts=[[-8,0],[9,-7],[1,9],[-5,5],[7,4]];
  const [sx,sy]=shifts[variant%shifts.length];
  const ignored=node;
  const obstacles=protectedSelectors.flatMap(selector=>[...document.querySelectorAll(selector)])
    .filter(el=>el!==ignored&&el.offsetParent!==null)
    .map(el=>el.getBoundingClientRect())
    .filter(r=>r.width>0&&r.height>0&&r.right>0&&r.left<vw&&r.bottom>0&&r.top<vh)
    .map(r=>rect(r.left-3,r.top-3,r.width+6,r.height+6));
  let best=null;
  anchors.forEach(([x,y],i)=>{
    const left=clamp(Math.round(x+sx),10,Math.max(10,vw-width-10));
    const top=clamp(Math.round(y+sy),10,Math.max(10,vh-height-12));
    const test=rect(left,top,width,height);
    const overlap=obstacles.reduce((sum,other)=>sum+intersection(test,other),0);
    const acx=a.left+a.width/2,acy=a.top+a.height/2;
    const distance=Math.hypot(left+width/2-acx,top+height/2-acy);
    const preference=(i-variant+anchors.length)%anchors.length;
    const score=overlap*15+distance*.24+preference*3.8;
    if(!best||score<best.score)best={left,top,score,overlap,distance,slot:i,width,height};
  });
  window.GX_MIRROR_PLACEMENT_DEBUG={
    kind,best,anchor:{left:a.left,top:a.top,right:a.right,bottom:a.bottom},
    stage:{width,height},viewport:{width:vw,height:vh},
    obstacles:obstacles.map(r=>({left:r.left,top:r.top,right:r.right,bottom:r.bottom}))
  };
  if(!best||best.overlap>50||best.distance>415)return null; // Never sacrifice important content to show a mascot.
  return best;
}
function GixyMessage({kind,serial,onClose}){
  const cfg=hints[kind];
  const stage=useRef(null);
  const [pos,setPos]=useState(null);
  const [ready,setReady]=useState(false);
  const seq=serial%5;
  useLayoutEffect(()=>{
    let raf=0;
    const locate=()=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        if(!stage.current)return;
        const b=stage.current.getBoundingClientRect();
        const p=choosePosition(kind,stage.current,seq,b);
        setPos(p);
        setReady(Boolean(p));
      });
    };
    locate();
    window.addEventListener('resize',locate,{passive:true});
    window.addEventListener('scroll',locate,{passive:true,capture:true});
    window.visualViewport?.addEventListener('resize',locate,{passive:true});
    window.visualViewport?.addEventListener('scroll',locate,{passive:true});
    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener('resize',locate);
      window.removeEventListener('scroll',locate,true);
      window.visualViewport?.removeEventListener('resize',locate);
      window.visualViewport?.removeEventListener('scroll',locate);
    };
  },[kind,serial,seq]);
  return <div ref={stage} className={'gx-gixy-message gx-gixy-message--'+kind+(ready?' is-visible':'')}
    data-kind={kind} data-variant={seq} data-placement={pos?.slot??'hidden'}
    style={{left:pos?.left??0,top:pos?.top??0,visibility:ready?'visible':'hidden'}}>
    <span className="gx-gixy-message__avatar" aria-hidden="true">
      <BotAvatar type={cfg.kind} color={palette[cfg.kind]} size={63} face="eyes"
        shading="plastic" state="working" turn={1} speed={.92} depth={.74}
        jumpSpin={1} jumpEvery={8} interactive={false} theme="dark"/>
    </span>
    <button className="gx-gixy-message__bubble" type="button" onClick={onClose}
      aria-label={'Cerrar mensaje de Gixy: '+cfg.text}>
      <span role="status" aria-live="polite">{cfg.text}</span>
    </button>
  </div>;
}
function Messages(){
  const [current,setCurrent]=useState(null);
  const expiry=useRef(null),serial=useRef(0),seen=useRef({});
  useEffect(()=>{
    const clear=()=>{clearTimeout(expiry.current);expiry.current=null;setCurrent(null);};
    const handlers=Object.keys(hints).map(kind=>{
      const handler=event=>{
        if(!event.detail?.active){if(currentKind.current===kind)clear();return;}
        const now=Date.now();
        // Same state cannot bombard the customer even if a backend emits rapid duplicates.
        if(now-(seen.current[kind]||0)<2500)return;
        seen.current[kind]=now;
        serial.current+=1;
        currentKind.current=kind;
        setCurrent({kind,serial:serial.current});
        clearTimeout(expiry.current);
        expiry.current=setTimeout(()=>{currentKind.current=null;setCurrent(null);},5300);
      };
      document.addEventListener('gx-mirror:'+kind,handler);
      return ()=>document.removeEventListener('gx-mirror:'+kind,handler);
    });
    return ()=>{handlers.forEach(unsub=>unsub());clearTimeout(expiry.current);};
  },[]);
  const currentKind=useRef(null);
  const dismiss=()=>{clearTimeout(expiry.current);currentKind.current=null;setCurrent(null);};
  return current?<GixyMessage key={current.serial} kind={current.kind}
    serial={current.serial} onClose={dismiss}/>:null;
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
