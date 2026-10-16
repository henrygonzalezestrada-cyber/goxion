import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BotAvatar} from 'bot-avatars';
import PulseHeart from './vendor/PulseHeart.jsx';

// Engine, mesh, lighting and motion: unmodified from bot-avatars@0.2.2.
const palette={hexagon:'#8663ff',square:'#04c8ee',circle:'#9c6aff'};
const sizes={hexagon:72,circle:67,square:65};
function Companion({kind,trigger}){
  const [state,setState]=useState('default');
  useEffect(()=>{
    let timer=null;
    const listener=(event)=>{
      clearTimeout(timer);
      if(event.detail?.active){
        setState('working');
        timer=setTimeout(()=>setState('default'),1550);
      }else setState('default');
    };
    document.addEventListener('gx-mirror:'+trigger,listener);
    return ()=>{document.removeEventListener('gx-mirror:'+trigger,listener);clearTimeout(timer);};
  },[trigger]);
  return <BotAvatar type={kind} color={palette[kind]} size={sizes[kind]} face="eyes"
    shading="plastic" state={state} turn={1} speed={.92} depth={.74}
    jumpSpin={1} jumpEvery={8} interactive={false} theme="dark"
    aria-label={'Gixy '+kind+' decorativo'}/>;
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
let ready=false;
function mount(){
  if(ready||!window.GOXION_GIXYS_MIRROR)return;
  const mapping=[['gx-mirror-hex','hexagon','mission'],['gx-mirror-hex-expanded','hexagon','mission'],['gx-mirror-circle','circle','loyalty'],['gx-mirror-square','square','notification']];
  for(const [id,kind,trigger] of mapping){
    const root=document.getElementById(id);
    if(!root)return;
    createRoot(root).render(<Companion kind={kind} trigger={trigger}/>);
  }
  const heart=document.getElementById('gx-mirror-heart');
  if(!heart)return;
  createRoot(heart).render(<LoyaltyHeart/>);
  ready=true;
  window.GOXION_GIXYS_ESPEJO_ENGINE=Object.freeze({renderer:'bot-avatars@0.2.2',shading:'plastic',components:['PulseHeart','OfficialMorphV1','OfficialBellV1'],noBackend:true});
}
document.addEventListener('gx-mirror-ready',mount);
if(document.readyState!=='loading')mount();
