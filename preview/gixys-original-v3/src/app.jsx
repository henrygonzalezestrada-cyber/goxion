import React, { useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {BotAvatar} from 'bot-avatars';
import PulseHeart from './vendor/PulseHeart.jsx';

const settings={
  hexagon:{name:'Hex',role:'Misiones',color:'#8663ff'},
  square:{name:'Square',role:'Notificaciones',color:'#04c8ee'},
  circle:{name:'Circle',role:'Lealtad',color:'#9c6aff'}
};

function Gixy({kind,material,state='default',size=104,seed}){
  const conf=settings[kind];
  return <div className="gixy-float" data-avatar={kind}>
    <BotAvatar type={kind} face="eyes" state={state} size={size} color={conf.color}
      shading={material} speed={0.90} seed={seed} turn={1} depth={0.74}
      jumpSpin={1} jumpEvery={8} interactive={true} theme="dark"
      aria-label={'Gixy '+conf.name+', '+(state==='working'?'animándose':state==='sleeping'?'descansando':'en reposo')}/>
  </div>;
}

function useReaction(trigger){
  const [reaction,setReaction]=useState(false);
  useEffect(()=>{
    if(!trigger){setReaction(false);return;}
    setReaction(true);
    const id=setTimeout(()=>setReaction(false),1550);
    return ()=>clearTimeout(id);
  },[trigger]);
  return reaction;
}

function Mission({material}){
  const [done,setDone]=useState(false);
  const active=useReaction(done);
  return <article className="glass stage" data-scene="mission">
    <div className="kicker-row"><span>MISIONES</span><small>01 / PROGRESO</small></div>
    <Gixy kind="hexagon" seed={0.19} state={active?'working':'default'} material={material}/>
    <div className="scene-copy"><h2>Un paso más cerca</h2><p>Tu recompensa está casi lista.</p></div>
    <div className="metric"><span>Tu progreso de prueba</span><strong>{done?'3/3':'2/3'}</strong></div>
    <div className="progress" role="progressbar" aria-label="Progreso ficticio de misiones"
      aria-valuemin="0" aria-valuemax="3" aria-valuenow={done?3:2}><span style={{width:done?'100%':'66.667%'}}/></div>
    <div className="component-slot mission-component">
      <button type="button" id="mission-btn" className={'action-btn'+(done?' is-complete':'')}
        disabled={done} onClick={()=>setDone(true)} aria-label="Completar misión ficticia">
        <span className="action-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M5 12.5 10 17l9-10"/></svg>
        </span>
        <span>{done?'Misión de prueba completada':'Completar misión de prueba'}</span>
      </button>
    </div>
    {done&&<button className="quiet-btn" type="button" onClick={()=>setDone(false)}>Repetir animación</button>}
    <p className="under-action">{done?'¡Listo! Gixy Hex también celebra.':'El mismo check elástico de la primera beta.'}</p>
  </article>;
}

function Loyalty({material}){
  const [advanced,setAdvanced]=useState(false);
  const active=useReaction(advanced);
  return <article className="glass stage" data-scene="loyalty">
    <div className="kicker-row"><span>LEALTAD</span><small>02 / LATIDO</small></div>
    <Gixy kind="circle" seed={0.52} state={active?'working':'default'} material={material}/>
    <div className="scene-copy"><h2>Tu constancia cuenta</h2><p>Conservamos el rojo y el movimiento del original.</p></div>
    <div className="metric"><span>Pagos puntuales de ejemplo</span><strong>{advanced?'4/4':'3/4'}</strong></div>
    <div className="progress" role="progressbar" aria-label="Progreso ficticio de lealtad"
      aria-valuemin="0" aria-valuemax="4" aria-valuenow={advanced?4:3}><span style={{width:advanced?'100%':'75%'}}/></div>
    <div className="component-slot"><PulseHeart liked={advanced} onChange={setAdvanced}
      showCount={false} size={51} corner={32} likedColor="#ff4d6d"
      idleColor="#ff4d6d" pillColor="#27232c" textColor="#fff"
      duration={560} dotSize={.3} overshoot={1.7} label="Simular avance de lealtad"/></div>
    <p className="under-action">{advanced?'Nivel alcanzado (simulación).':'Toca el corazón original de React Bits.'}</p>
  </article>;
}

function Notification({material}){
  const [step,setStep]=useState(0); // 0: sin aviso, 1: nuevo, 2: leído.
  const [dismissed,setDismissed]=useState(false);
  const [ringing,setRinging]=useState(false);
  const active=useReaction(step===1);
  const next=()=>{
    if(step===0){setStep(1);setDismissed(false);setRinging(true);}
    else if(step===1){setStep(2);setRinging(false);setDismissed(true);}
  };
  const reset=()=>{setStep(0);setDismissed(false);setRinging(false);};
  return <article className="glass stage" data-scene="notification">
    <div className="kicker-row"><span>NOTIFICACIONES</span><small>03 / AVISOS</small></div>
    <Gixy kind="square" seed={0.79} state={active?'working':'default'} material={material}/>
    <div className="scene-copy"><h2>Avisos con intención</h2><p>Regresa la campana que te gustó de la primera beta.</p></div>
    <div className="notification-display">
      <button type="button" className={'bell'+(step===1?' has-news':'')+(ringing?' is-ringing':'')}
        onClick={next} onAnimationEnd={()=>setRinging(false)}
        aria-label={step===0?'Simular recepción de un aviso':step===1?'Marcar aviso como leído':'Aviso ya leído'}
        disabled={step===2} aria-expanded={step===1}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4"/>
        </svg><i aria-hidden="true"/>
      </button>
      <div><strong role="status">{step===0?'Todo al día':step===1?'1 aviso sin leer':'Aviso leído'}</strong>
        <p>{step===0?'Prueba la llegada de un aviso.':step===1?'Tienes una notificación nueva.':'Todo está actualizado.'}</p>
      </div>
    </div>
    {step===1&&!dismissed&&<div className="notification-toast" role="status">
      <span className="toast-dot"/><span>Tu recompensa tiene novedades.</span>
      <button type="button" onClick={()=>setDismissed(true)} aria-label="Descartar aviso de prueba">×</button>
    </div>}
    <div className="component-slot">
      <button type="button" className={'action-btn notification-action'+(step===2?' is-complete':'')}
        disabled={step===2} onClick={next}>
        {step===0?'Probar llegada de un aviso':step===1?'Marcar aviso como leído':'Aviso de prueba atendido'}
      </button>
    </div>
    {step!==0&&<button className="quiet-btn" type="button" onClick={reset}>Repetir animación</button>}
    <p className="under-action">Animación original de la primera beta; datos simulados.</p>
  </article>;
}

function Studio({material}){
  const [state,setState]=useState('default');
  return <section className="glass studio" aria-label="Laboratorio del motor original">
    <div className="studio-head"><div><div className="eyebrow">FASE 1 · EL MISMO MOTOR ORIGINAL</div>
      <h2>Conoce a los Gixys</h2>
      <p>Giran, parpadean, se comprimen y saltan con la física de Libraries.dev. Tócalos.</p></div>
      <span className="studio-chip">BOT AVATARS 0.2.2</span></div>
    <div className="cast">{Object.entries(settings).map(([kind,conf],i)=>
      <div className="cast-member" key={kind}>
        <BotAvatar type={kind} face="eyes" color={conf.color} shading={material} theme="dark"
          state={state} size={104} seed={[.13,.45,.78][i]} turn={1} jumpSpin={1} jumpEvery={8}
          interactive speed={.95} depth={.74} aria-label={'Gixy '+conf.name}/>
        <strong>{conf.name}</strong><small>{conf.role}</small>
      </div>)}</div>
    <div className="control-row" role="group" aria-label="Estado de los Gixys">
      {[['default','Reposo'],['working','Activo'],['sleeping','Descanso']].map(([val,label])=>
      <button key={val} type="button" className={'pill'+(state===val?' chosen':'')}
        aria-pressed={state===val} onClick={()=>setState(val)}>{label}</button>)}</div>
    <p className="hint">El color cambia para adaptarse a GOXION. Las formas, expresiones y transiciones pertenecen al motor original.</p>
  </section>;
}

function App(){
  const [material,setMaterial]=useState('plastic');
  return <div className="page">
    <header className="brandbar">
      <div className="wordmark"><div className="orbits" aria-hidden="true"><i/><i/></div><strong>GOXION</strong></div>
      <div className="beta">LABORATORIO V4</div>
    </header>
    <div className="intro"><div className="eyebrow">GOXION · EXPERIENCIA INTERACTIVA</div>
      <h1>Esta vez,<br/><em>el movimiento es real.</em></h1>
      <p>Motor original de Gixys con acabado Plastic y los movimientos de checklist y campana que aprobaste en la primera beta.</p>
      <div className="disclaimer"><span className="disc-led"/>Solo demostración visual · Sin datos ni cambios en clientes</div>
    </div>
    <div className="material-bar"><span>Material de los Gixys</span><div className="control-row">
      <button type="button" className={'pill'+(material==='fabric'?' chosen':'')} aria-pressed={material==='fabric'} onClick={()=>setMaterial('fabric')}>Suave / Fabric (comparar)</button>
      <button type="button" className={'pill'+(material==='plastic'?' chosen':'')} aria-pressed={material==='plastic'} onClick={()=>setMaterial('plastic')}>Plastic · predeterminado</button>
    </div></div>
    <section className="scenes" aria-label="Componentes interactivos reales">
      <Mission material={material}/><Loyalty material={material}/><Notification material={material}/>
    </section>
    <Studio material={material}/>
    <footer>GOXION · Beta separada de Mi Espacio · Gixys originales de Libraries.dev · corazón Pulse Heart de React Bits</footer>
  </div>;
}
const root=document.getElementById('root');
createRoot(root).render(<App/>);
window.GOXION_ORIGINAL_BETA={renderer:'bot-avatars@0.2.2',defaultMaterial:'plastic',components:['MissionCheckV1','PulseHeart','BellV1'],isolated:true};
