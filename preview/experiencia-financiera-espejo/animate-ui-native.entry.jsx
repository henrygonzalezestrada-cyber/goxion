/**
 * GOXION E1/B2 R5 — An actual Animate UI / Motion React island.
 *
 * All animated Lucide components are the UNMODIFIED registry v2 components
 * from https://github.com/imskyleen/animate-ui (MIT + Commons Clause).
 * Icons are not traced, recreated, or approximated by hand.
 *
 * This remains physically separate from Index's classic JS. Financial
 * calculations, the legacy DOM, and payment actions stay vanilla.
 * The trusted view model enters solely through renderProof/renderLoyalty.
 */
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';
import * as AnimateUIProgress from '@animate-ui/react/primitives/base-ui/progress';
import { HeartCrack } from 'lucide-react';
import { Star } from './animate-ui-src/icons/star';
import { Clock } from './animate-ui-src/icons/clock';
import { CircleCheck } from './animate-ui-src/icons/circle-check';
import { CircleX } from './animate-ui-src/icons/circle-x';
import { FileCheck } from './animate-ui-src/icons/file-check';
import { createMorph } from 'morphicons/dom';

const e=React.createElement;
const statusDefinitions=Object.freeze({
 review:{name:'Recibimos tu comprobante',hint:'No lo envíes de nuevo.',progress:66,
   icon:Clock,tone:'review',steps:['Recibido','Validando','Resultado'],completed:1},
 correction:{name:'Hay una observación',hint:'Revisa los datos antes de enviarlo otra vez.',progress:66,
   icon:CircleX,tone:'correction',steps:['Recibido','Revisado','Corregir'],completed:1},
 approved:{name:'Comprobante validado',hint:'El pago ya fue aplicado.',progress:100,
   icon:CircleCheck,tone:'approved',steps:['Recibido','Verificado','Aplicado'],completed:3}
});
function ProofExperience({phase}){
 const reduced=useReducedMotion();
 const p=statusDefinitions[phase];
 if(!p)return null;
 const Icon=p.icon;
 return e(motion.div,{
  className:'gx-aui-proof gx-aui-proof-'+p.tone,
  initial:reduced?false:{opacity:0,y:7},
  animate:{opacity:1,y:0},
  transition:{type:'spring',stiffness:200,damping:25}
 },
  e('div',{className:'gx-aui-proof-head'},
   e('div',{className:'gx-aui-proof-icon',key:'icon-'+phase},
    e(Icon,{size:29,animate:!reduced,'aria-hidden':true})),
   e('div',{className:'gx-aui-proof-words'},
    e('div',{className:'gx-aui-proof-eyebrow'},'COMPROBANTE'),
    e('strong',{className:'gx-aui-proof-name'},p.name),
    e('p',{className:'gx-aui-proof-hint'},p.hint)
   )
  ),
  e(AnimateUIProgress.Progress.Root,{
   value:p.progress,min:0,max:100,
   className:'gx-aui-progress',
   'aria-label':'Etapas completadas del comprobante',
   'aria-valuetext':p.completed+' de 3 etapas; '+p.steps[Math.min(2,p.completed)]
  },
   e(AnimateUIProgress.Progress.Track,{className:'gx-aui-progress-track'},
    e(AnimateUIProgress.Progress.Indicator,{className:'gx-aui-progress-indicator',
     transition:{type:'spring',stiffness:100,damping:30}})
   )
  ),
  e('div',{className:'gx-aui-progress-labels','aria-hidden':true},
   ...p.steps.map((label,i)=>e('span',{key:label,
     className:(i<p.completed?'is-reached':'')+
      (p.tone==='correction'&&i===2?' is-attention':'')
   },label))
  )
 );
}
function LoyaltyRing({count,target}){
 const reduced=useReducedMotion();
 const progress= Math.max(0,Math.min(1,count/target));
 return e('div',{className:'gx-aui-loyalty-jewel'},
  e('svg',{className:'gx-aui-loyalty-orbit',viewBox:'0 0 100 100','aria-hidden':true},
   e('circle',{className:'gx-aui-loyalty-back',cx:50,cy:50,r:40}),
   e(motion.circle,{
    className:'gx-aui-loyalty-fill',cx:50,cy:50,r:40,
    initial:reduced?false:{pathLength:0},
    animate:{pathLength:progress},
    transition:reduced?{duration:0}:{type:'spring',stiffness:100,damping:30}
   })
  ),
  e('span',{className:'gx-aui-loyalty-star'},
   e(Star,{size:34,animation:'fill',animate:!reduced,'aria-hidden':true})
  )
 );
}
function LoyaltyExperience({state}){
 const reduced=useReducedMotion();
 if(!state)return null;
 if(state.state==='lost'){
  return e(motion.span,{
   className:'gx-aui-heart-crack',
   initial:reduced?false:{opacity:0,scale:.86,y:5},
   animate:{opacity:1,scale:1,y:0},
   transition:{type:'spring',stiffness:200,damping:25}
  },e(HeartCrack,{size:40,strokeWidth:1.7,'aria-hidden':true}));
 }
 return e(LoyaltyRing,{count:state.count,target:state.target});
}
const proofNode=document.getElementById('gx-b2-proof');
const loyaltyNode=document.getElementById('gx-b2-loyalty-mark');
if(!proofNode||!loyaltyNode)throw new Error('Missing isolated GOXION preview host');
const proofRoot=createRoot(proofNode),loyaltyRoot=createRoot(loyaltyNode);
window.GOXION_ANIMATEUI_NATIVE=Object.freeze({
 version:'2.0.0',
 actualReactComponents:true,
 reducedMotionSupported:true,
 renderProof:phase=>proofRoot.render(e(ProofExperience,{phase,key:'proof-'+phase})),
 renderLoyalty:state=>loyaltyRoot.render(e(LoyaltyExperience,{
  state,key:state?.state==='lost'?'lost':state?.count+'/'+state?.target
 })),
});
/**
 * THE SAME Morphicons DOM implementation used in Ayuda:
 * assets/js/ayuda/09-morphicons-production-script.mjs
 * Identical paths, spring preset and reducedMotion policy; no rotation.
 * The existing billing calendar remains controlled by estado.js.
 */
function installAyudaCalendarChevron(){
 const button=document.getElementById('gx-b2-calendar-toggle');
 const host=button?.querySelector('.gx-chevron-motion');
 const path=host?.querySelector('.gx-morph-chevron path');
 if(!button||!host||!path)throw new Error('Missing calendar Morphicons host');
 const DOWN='M6 9l6 6 6-6';
 const UP='M6 15l6-6 6 6';
 const getOpen=()=>button.getAttribute('aria-expanded')==='true';
 let lastOpen=getOpen();
 const morph=createMorph(path,lastOpen?UP:DOWN,{reducedMotion:'user'});
 host.dataset.gxMorphiconsHost='1';
 const observer=new MutationObserver(()=>{
  const open=getOpen();
  if(open===lastOpen)return; // calendar refresh is not a toggle
  lastOpen=open;
  morph.morphTo(open?UP:DOWN,'snappy');
 });
 observer.observe(button,{attributes:true,attributeFilter:['aria-expanded']});
 window.GOXION_CALENDAR_MORPH=Object.freeze({
  installed:true,library:'morphicons@1.5.0',origin:'Ayuda',
  spring:'snappy',isOpen:getOpen
 });
}
installAyudaCalendarChevron();

window.dispatchEvent(new Event('gx-animate-ui-ready'));
