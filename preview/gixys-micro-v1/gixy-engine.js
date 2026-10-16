/* GOXION · Gixys v1: dibujos originales en Canvas 2D.
 * Base ligera sin React, Groq, tokens, cookies ni conexiones al backend.
 * NO reutiliza ni modifica el renderizador de Goxy. */
(()=>{
  "use strict";
  const canvases=[...document.querySelectorAll("canvas[data-gixy]")];
  if(!canvases.length||window.GOXION_GIXY_LAB)return;
  const media=window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced=media.matches,frameId=0;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const rgb=(hex)=>{const n=parseInt(hex.replace("#",""),16);return [(n>>16)&255,(n>>8)&255,n&255];};
  const mix=(a,b,t)=>a.map((x,i)=>Math.round(x+(b[i]-x)*t));
  const color=(channels,a=1)=>"rgba("+channels.join(",")+","+a+")";
  const shadow=[8,11,36];
  const instances=canvases.map((canvas,index)=>{
    const shape=canvas.dataset.gixy;
    const tint=rgb(canvas.dataset.color||"#7c4dff");
    const instance={canvas,ctx:canvas.getContext("2d",{alpha:true}),shape,tint,seed:index*.79,state:"idle",visible:false,look:0,target:0,happySince:-10000,last:0};
    canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();instance.target=clamp((e.clientX-r.left-r.width/2)/(r.width/2),-1,1);ensure();},{passive:true});
    canvas.addEventListener("pointerleave",()=>{instance.target=0;ensure();},{passive:true});
    canvas.addEventListener("click",()=>celebrateOne(instance));
    canvas.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();celebrateOne(instance);}});
    return instance;
  });
  const hexagon=(ctx)=>{
    const pts=[[46,17],[77,19],[95,51],[78,89],[45,91],[24,56]];
    const t=.19;
    ctx.beginPath();
    pts.forEach((p,i)=>{const a=pts[(i+pts.length-1)%pts.length],b=pts[(i+1)%pts.length];const inX=p[0]+(a[0]-p[0])*t,inY=p[1]+(a[1]-p[1])*t;const outX=p[0]+(b[0]-p[0])*t,outY=p[1]+(b[1]-p[1])*t;if(!i)ctx.moveTo(inX,inY);else ctx.lineTo(inX,inY);ctx.quadraticCurveTo(p[0],p[1],outX,outY);});ctx.closePath();
  };
  const square=(ctx)=>{
    ctx.beginPath();ctx.moveTo(46,17);ctx.lineTo(76,17);ctx.quadraticCurveTo(93,17,93,35);ctx.lineTo(93,72);ctx.quadraticCurveTo(93,91,75,91);ctx.lineTo(44,91);ctx.quadraticCurveTo(26,91,26,73);ctx.lineTo(26,36);ctx.quadraticCurveTo(26,17,46,17);ctx.closePath();
  };
  const circlePath=(ctx)=>{ctx.beginPath();ctx.ellipse(60,55,36,38,-.04,0,Math.PI*2);ctx.closePath();};
  const path=(ctx,shape)=>{if(shape==="hexagon")hexagon(ctx);else if(shape==="square")square(ctx);else circlePath(ctx);};
  const eye=(ctx,x,y,w,h)=>{
    ctx.beginPath();ctx.ellipse(x,y,w,h,-.05,0,Math.PI*2);ctx.fillStyle="#13152f";ctx.fill();
    ctx.beginPath();ctx.ellipse(x-w*.32,y-h*.38,w*.25,h*.23,0,0,Math.PI*2);ctx.fillStyle="rgba(255,255,255,.48)";ctx.fill();
  };
  function render(g,time,dt){
    const ctx=g.ctx;if(!ctx)return;
    const idle=g.state==="idle",work=g.state==="working",sleep=g.state==="sleeping";
    const age=(time-g.happySince)/1000;
    const celebrating=age>=0&&age<1.4&&!reduced;
    const t=reduced?0:time/1000;
    const speed=work?2.9:.87;
    const hover=reduced?0:Math.sin(t*speed+g.seed)*(.8+(work?2:0));
    const rise=celebrating?(-19*Math.max(0,Math.sin(age*Math.PI/.66))*Math.exp(-age*.75)):0;
    const landing=celebrating?(Math.sin(age*17)*Math.exp(-age*3.7)):(work?Math.sin(t*4.1+g.seed)*.06:0);
    const breathing=sleep?Math.sin(t*1.5+g.seed)*.023:Math.sin(t*1.25+g.seed)*.011;
    const twist=celebrating?(Math.sin(age*8)*Math.exp(-age*2)*.13):(sleep?-.02:Math.sin(t*.76+g.seed)*.045);
    const target=reduced?0:g.target;
    g.look+=(target-g.look)*Math.min(1,dt*.01);
    const gaze=g.look*3+(sleep?0:Math.sin(t*.83+g.seed)*.8);
    const blink=sleep?0.06:(reduced?1:Math.min(1,Math.max(.1,Math.abs(Math.sin((t+g.seed*2)*1.17))<.038?.13:1)));
    const bounce=clamp(landing,-.16,.13);
    ctx.setTransform(g.canvas.width/120,0,0,g.canvas.height/120,0,0);
    ctx.clearRect(0,0,120,120);
    // Shadow is kept in place while the body rises.
    ctx.save();ctx.beginPath();ctx.ellipse(60,108,28+rise*.16,5.5+rise*.025,0,0,Math.PI*2);ctx.fillStyle="rgba(0,0,0,.28)";ctx.shadowColor="rgba(4,6,17,.4)";ctx.shadowBlur=12;ctx.fill();ctx.restore();
    ctx.save();
    ctx.translate(60,58+hover+rise);
    ctx.rotate(twist);
    ctx.scale(1+bounce+breathing,1-bounce+breathing);
    ctx.translate(-60,-58);
    const light=mix(g.tint,[242,249,255],.35),dark=mix(g.tint,shadow,.43);
    const gradient=ctx.createRadialGradient(39,29,2,64,71,65);
    gradient.addColorStop(0,color(mix(g.tint,[255,255,255],.51)));
    gradient.addColorStop(.27,color(light));
    gradient.addColorStop(.59,color(g.tint));
    gradient.addColorStop(1,color(dark));
    ctx.save();ctx.shadowBlur=11;ctx.shadowColor=color(g.tint,.28);ctx.shadowOffsetY=5;path(ctx,g.shape);ctx.fillStyle=gradient;ctx.fill();ctx.restore();
    ctx.save();path(ctx,g.shape);ctx.clip();
    const sheen=ctx.createRadialGradient(46,29,4,54,40,33);sheen.addColorStop(0,"rgba(255,255,255,.31)");sheen.addColorStop(.5,"rgba(255,255,255,.1)");sheen.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=sheen;ctx.fillRect(15,9,91,96);
    const shade=ctx.createLinearGradient(20,78,96,19);shade.addColorStop(0,"rgba(4,8,33,.22)");shade.addColorStop(.54,"rgba(3,5,28,0)");shade.addColorStop(1,"rgba(255,255,255,.12)");ctx.fillStyle=shade;ctx.fillRect(18,13,87,86);
    ctx.restore();
    path(ctx,g.shape);ctx.strokeStyle="rgba(255,255,255,.12)";ctx.lineWidth=.7;ctx.stroke();
    const yy=sleep?57:54+gaze*.13;
    if(sleep){
      ctx.lineWidth=2.7;ctx.lineCap="round";ctx.strokeStyle="#1e2341";
      [47.5,72.5].forEach(x=>{ctx.beginPath();ctx.moveTo(x-5,yy);ctx.quadraticCurveTo(x,yy+4.5,x+5,yy);ctx.stroke();});
    }else{
      eye(ctx,47.5+gaze,yy,5.2,7.9*blink);
      eye(ctx,72.5+gaze,yy,5.2,7.9*blink);
    }
    if(work||celebrating){
      ctx.beginPath();ctx.arc(60,68,celebrating?5.5:3.8,.1,Math.PI-.1);
      ctx.strokeStyle="rgba(25,27,58,.78)";ctx.lineWidth=2.2;ctx.lineCap="round";ctx.stroke();
    }
    ctx.restore();
  }
  let last=0;
  function loop(time){
    frameId=0;
    if(document.hidden||reduced||!instances.some(x=>x.visible))return;
    const dt=Math.min(50,Math.max(0,time-last||16));last=time;
    for(const g of instances){if(g.visible)render(g,time,dt);}
    frameId=requestAnimationFrame(loop);
  }
  function ensure(){
    if(document.hidden||!instances.some(x=>x.visible))return;
    if(reduced){for(const g of instances)if(g.visible)render(g,0,16);return;}
    if(!frameId){last=performance.now();frameId=requestAnimationFrame(loop);}
  }
  function celebrateOne(g){g.happySince=performance.now();ensure();if(reduced)render(g,0,16);}
  const observer=new IntersectionObserver(entries=>{
    for(const e of entries){const found=instances.find(x=>x.canvas===e.target);if(found)found.visible=e.isIntersecting;}
    if(!instances.some(x=>x.visible)&&frameId){cancelAnimationFrame(frameId);frameId=0;}
    ensure();
  },{rootMargin:"80px 0px"});
  for(const g of instances){observer.observe(g.canvas);render(g,0,16);}
  document.addEventListener("visibilitychange",()=>{if(document.hidden){if(frameId)cancelAnimationFrame(frameId);frameId=0;}else ensure();});
  const onMotionChange=e=>{reduced=e.matches;if(frameId)cancelAnimationFrame(frameId);frameId=0;ensure();};
  if(media.addEventListener)media.addEventListener("change",onMotionChange);else if(media.addListener)media.addListener(onMotionChange);
  window.GOXION_GIXY_LAB=Object.freeze({
    setState(state,selector){
      if(!["idle","working","sleeping"].includes(state))return false;
      for(const g of instances){if(!selector||g.canvas.matches(selector))g.state=state;}
      ensure();return true;
    },
    celebrate(selector){for(const g of instances){if(!selector||g.canvas.matches(selector))celebrateOne(g);}},
    reset(){for(const g of instances){g.state="idle";g.target=0;g.happySince=-10000;}ensure();}
  });
})();