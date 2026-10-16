import React, { useEffect, useState } from 'react';
import {createRoot} from 'react-dom/client';
import {BotAvatar} from 'bot-avatars';
import SpringCheck from './vendor/SpringCheck.jsx';
import PulseHeart from './vendor/PulseHeart.jsx';
import BellToggle from './vendor/BellToggle.jsx';

const h=React.createElement;
const settings={
  hexagon:{name:'Hex',role:'Misiones',color:'#8663ff'},
  square:{name:'Square',role:'Notificaciones',color:'#04c8ee'},
  circle:{name:'Circle',role:'Lealtad',color:'#9c6aff'}
};

function Gixy({kind,material,state='default',size=92,seed}){
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
    <div className="scene-copy"><h2>Un paso más cerca</h2><p>Una pequeña acción puede sentirse especial.</p></div>
    <div className="metric"><span>Progreso de ejemplo</span><strong>{done?'3/3':'2/3'}</strong></div>
    <div className="progress" role="progressbar" aria-label="Progreso ficticio de misiones"
      aria-valuemin="0" aria-valuemax="3" aria-valuenow={done?3:2}><span style={{width:done?'100%':'66.667%'}}/></div>
    <div className="component-slot mission-component">
      <SpringCheck label={done?'Misión completada':'Completar misión'} checked={done}
        onChange={setDone} fontSize={14} boxSize={30} boxRadius={10} bounce={.27}
        color="#f0f3ff" fillColor="#00f2fe" checkColor="#030305" strike="none"
        ariaLabel="Cambiar estado ficticio de una misión"/>
    </div>
    <p className="under-action">{done?'¡Listo! Gixy Hex también lo celebra.':'Toca la casilla para probar la animación original.'}</p>
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
  const [notified,setNotified]=useState(false);
  const active=useReaction(notified);
  return <article className="glass stage" data-scene="notification">
    <div className="kicker-row"><span>NOTIFICACIONES</span><small>03 / AVISOS</small></div>
    <Gixy kind="square" seed={0.79} state={active?'working':'default'} material={material}/>
    <div className="scene-copy"><h2>Avisos con intención</h2><p>La campana responde con su propia física.</p></div>
    <div className="notification-state" role="status">{notified?'1 aviso de prueba recibido':'Todo al día'}</div>
    <div className="component-slot">
      <BellToggle pressed={notified} onChange={setNotified} offLabel="Probar aviso"
        onLabel="Aviso recibido" count={notified?1:0} badge clapper waves
        color="#edf2ff" background="#252532" onColor="#04181c" onBackground="#87f5fb"
        badgeColor="#7c4dff" size="md" ringAmplitude={17} ringPasses={5}
        ringDuration={820} revealBounce={0.12} label="Simular llegada de notificación"/>
    </div>
    <p className="under-action">Control interactivo de laboratorio, no una suscripción real.</p>
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
  const [material,setMaterial]=useState('fabric');
  return <div className="page">
    <header className="brandbar">
      <div className="wordmark"><div className="orbits" aria-hidden="true"><i/><i/></div><strong>GOXION</strong></div>
      <div className="beta">LABORATORIO V3</div>
    </header>
    <div className="intro"><div className="eyebrow">GOXION · EXPERIENCIA INTERACTIVA</div>
      <h1>Esta vez,<br/><em>el movimiento es real.</em></h1>
      <p>El mismo motor de avatares y las microinteracciones originales, adaptados a nuestros colores y a un entorno aislado de prueba.</p>
      <div className="disclaimer"><span className="disc-led"/>Solo demostración visual · Sin datos ni cambios en clientes</div>
    </div>
    <div className="material-bar"><span>Material de los Gixys</span><div className="control-row">
      <button type="button" className={'pill'+(material==='fabric'?' chosen':'')} aria-pressed={material==='fabric'} onClick={()=>setMaterial('fabric')}>Suave / Fabric</button>
      <button type="button" className={'pill'+(material==='plastic'?' chosen':'')} aria-pressed={material==='plastic'} onClick={()=>setMaterial('plastic')}>Brillante / Plastic</button>
    </div></div>
    <section className="scenes" aria-label="Componentes interactivos reales">
      <Mission material={material}/><Loyalty material={material}/><Notification material={material}/>
    </section>
    <Studio material={material}/>
    <footer>GOXION · Beta separada de Mi Espacio · Motion original de Libraries.dev y React Bits</footer>
  </div>;
}
const root=document.getElementById('root');
createRoot(root).render(<App/>);
window.GOXION_ORIGINAL_BETA={renderer:'bot-avatars@0.2.2',components:['SpringCheck','PulseHeart','BellToggle'],isolated:true};
