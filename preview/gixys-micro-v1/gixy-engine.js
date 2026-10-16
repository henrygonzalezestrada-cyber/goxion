/* GOXION · Gixys v2, laboratorio independiente.
 * Volumen simulado en Canvas 2D: giro en profundidad, cuerpo inflado,
 * parpadeos y ojos expresivos. Sin bocas, sin IA, sin modificar a Goxy. */
(()=>{
  "use strict";
  if(window.GOXION_GIXY_LAB)return;
  const canvases=[...document.querySelectorAll("canvas[data-gixy]")];
  if(!canvases.length)return;
  const media=matchMedia("(prefers-reduced-motion: reduce)");
  let reduced=media.matches,frame=0,lastTime=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const blend=(a,b,t)=>a.map((n,i)=>Math.round(n+(b[i]-n)*t));
  const rgb=(hex)=>{const h=parseInt(hex.replace("#",""),16);return [(h>>16)&255,(h>>8)&255,h&255];};
  const rgba=(v,a)=>"rgba("+v.join(",")+","+a+")";
  const smooth=t=>t*t*(3-2*t);
  const bounce=t=>1-Math.pow(1-t,3)*Math.cos(t*Math.PI*2.6);
  function bodyPath(ctx,shape){
    ctx.beginPath();
    if(shape==="circle"){
      ctx.ellipse(60,55,37,38,0,0,Math.PI*2);
    }else if(shape==="square"){
      ctx.moveTo(42,17);ctx.lineTo(78,17);
      ctx.quadraticCurveTo(96,18,96,36);ctx.lineTo(96,75);
      ctx.quadraticCurveTo(95,94,77,94);ctx.lineTo(43,94);
      ctx.quadraticCurveTo(24,93,24,75);ctx.lineTo(24,36);
      ctx.quadraticCurveTo(24,17,42,17);
    }else{
      const points=[[45,15],[76,17],[97,53],[79,91],[44,93],[22,54]];
      const k=.21;
      points.forEach((p,i)=>{
        const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length];
        const xin=p[0]+(before[0]-p[0])*k,yin=p[1]+(before[1]-p[1])*k;
        const xout=p[0]+(after[0]-p[0])*k,yout=p[1]+(after[1]-p[1])*k;
        if(i===0)ctx.moveTo(xin,yin);else ctx.lineTo(xin,yin);
        ctx.quadraticCurveTo(p[0],p[1],xout,yout);
      });
    }
    ctx.closePath();
  }
  function oneEye(ctx,x,y,w,h,closed,happy){
    const ink="#19182f";
    ctx.save();ctx.strokeStyle=ink;ctx.fillStyle=ink;
    if(closed||happy){
      ctx.lineWidth=2.8;ctx.lineCap="round";
      ctx.beginPath();
      ctx.moveTo(x-w,y+(closed?-1:1));
      ctx.quadraticCurveTo(x,y+(closed?3:-4.4),x+w,y+(closed?-1:1));
      ctx.stroke();
    }else{
      ctx.beginPath();ctx.ellipse(x,y,w,Math.max(.65,h),-.04,0,Math.PI*2);ctx.fill();
      if(h>3){
        ctx.beginPath();ctx.ellipse(x-w*.3,y-h*.38,w*.23,h*.23,-.1,0,Math.PI*2);
        ctx.fillStyle="rgba(255,255,255,.43)";ctx.fill();
      }
    }
    ctx.restore();
  }
  const avatars=canvases.map((canvas,i)=>{
    const g={
      canvas,ctx:canvas.getContext("2d",{alpha:true}),shape:canvas.dataset.gixy,
      tone:rgb(canvas.dataset.color||"#7c4dff"),seed:i*.92,state:"idle",
      visible:false,look:0,target:0,happyAt:-10000
    };
    canvas.addEventListener("pointermove",e=>{
      const r=canvas.getBoundingClientRect();
      g.target=clamp((e.clientX-(r.left+r.width*.5))/(r.width*.5),-1,1);
      start();
    },{passive:true});
    canvas.addEventListener("pointerleave",()=>{g.target=0;start();},{passive:true});
    canvas.addEventListener("click",()=>celebrate(g));
    canvas.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();celebrate(g);}
    });
    return g;
  });
  function draw(g,now,dt){
    if(!g.ctx)return;
    const ctx=g.ctx,t=reduced?0:now*.001;
    const working=g.state==="working",sleeping=g.state==="sleeping";
    const elapsed=(now-g.happyAt)*.001,cheering=!reduced&&elapsed>=0&&elapsed<1.15;
    const u=cheering?clamp(elapsed/1.03,0,1):0;
    const rotation=cheering?(2*Math.PI*smooth(u)):(Math.sin(t*(working?1.15:.58)+g.seed)*(.24+(working?.17:0)));
    const yaw=rotation+(reduced?0:g.look*.26);
    const facing=Math.cos(yaw);
    const halfWidth=.33+.67*Math.abs(facing); // a true rotating head narrows toward profile
    const hover=reduced?0:Math.sin(t*(working?2.2:1.1)+g.seed)*(.75+(working?1.2:0));
    const hop=cheering?-23*Math.pow(Math.sin(Math.PI*u),.9):
      (!reduced&&working?-3*Math.pow(Math.max(0,Math.sin((t+g.seed)*2.5)),4):
      (!reduced&&((t+g.seed*2)%9)<.68?-7*Math.sin(Math.PI*((t+g.seed*2)%9)/.68):0));
    const floor=cheering?Math.pow(Math.max(0,Math.sin(Math.PI*u)),2):0;
    const land=cheering&&u>.83?Math.max(0,Math.sin((u-.83)*Math.PI/.17))*.16:0;
    const squash=1+land-floor*.045+(reduced?0:Math.sin(t*1.1+g.seed)*.009);
    const stretch=1-land*.62+floor*.1;
    const tilt=cheering?Math.sin(u*Math.PI*2)*.095*(1-u):
      (reduced?0:Math.sin(t*.61+g.seed)*.05);
    const pitch=sleeping?.035:(reduced?0:Math.sin(t*.8+g.seed)*.02);
    g.look+=(reduced?0:g.target-g.look)*Math.min(1,dt*.01);
    const blinkPhase=((t+g.seed*1.7)%3.85);
    const blinking=!reduced&&!sleeping&&blinkPhase>3.62&&blinkPhase<3.79;
    const isHappy=cheering&&u>.07&&u<.68&&(facing>.32);
    const pupil=clamp(g.look*3+Math.sin(t*.82+g.seed)*.65,-3.5,3.5);
    ctx.setTransform(g.canvas.width/120,0,0,g.canvas.height/120,0,0);
    ctx.clearRect(0,0,120,120);
    // Continuous contact shadow: stays grounded even while the avatar hops.
    ctx.save();
    ctx.beginPath();ctx.ellipse(60,108,Math.max(13,29+hop*.4),4.2+Math.abs(hop)*.02,0,0,Math.PI*2);
    ctx.fillStyle="rgba(0,0,0,.31)";ctx.shadowColor="rgba(0,0,0,.33)";ctx.shadowBlur=10;ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(60,56+hover+hop);ctx.rotate(tilt);
    ctx.transform(halfWidth*squash,Math.sin(pitch)*.09,.045*Math.sin(yaw),stretch,0,0);
    ctx.translate(-60,-56);
    // Rounded outer shell: faux depth through moving light and thick edge falloff.
    const sideShade=blend(g.tone,[13,18,43],.48);
    const lit=blend(g.tone,[252,251,255],.33);
    const peak=blend(g.tone,[255,255,255],.69);
    const lightX=39-10*Math.sin(yaw),lightY=28-5*Math.sin(pitch*5);
    const grad=ctx.createRadialGradient(lightX,lightY,3,64+7*Math.sin(yaw),74,73);
    grad.addColorStop(0,rgba(peak,1));
    grad.addColorStop(.2,rgba(lit,1));
    grad.addColorStop(.53,rgba(g.tone,1));
    grad.addColorStop(.81,rgba(blend(g.tone,sideShade,.33),1));
    grad.addColorStop(1,rgba(sideShade,1));
    ctx.save();bodyPath(ctx,g.shape);
    ctx.shadowColor=rgba(g.tone,.2);ctx.shadowBlur=11;ctx.shadowOffsetY=5;ctx.fillStyle=grad;ctx.fill();
    ctx.restore();
    ctx.save();bodyPath(ctx,g.shape);ctx.clip();
    // Broad, soft studio reflection shifts as the body turns.
    const sheenX=36-18*Math.sin(yaw);
    const shine=ctx.createRadialGradient(sheenX,32,0,sheenX+7,36,39);
    shine.addColorStop(0,"rgba(255,255,255,.38)");
    shine.addColorStop(.42,"rgba(255,255,255,.13)");
    shine.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle=shine;ctx.fillRect(15,10,92,92);
    const edge=ctx.createLinearGradient(20+14*Math.sin(yaw),90,102-9*Math.sin(yaw),26);
    edge.addColorStop(0,"rgba(0,0,22,.34)");
    edge.addColorStop(.42,"rgba(0,0,30,0)");
    edge.addColorStop(1,"rgba(255,255,255,.16)");
    ctx.fillStyle=edge;ctx.fillRect(15,10,92,92);
    ctx.restore();
    bodyPath(ctx,g.shape);ctx.strokeStyle="rgba(255,255,255,.085)";ctx.lineWidth=.9;ctx.stroke();
    // Facial features ride the perspective of the same volume, never a separate flat mouth.
    const visibility=clamp((facing+.14)/.55,0,1);
    if(visibility>0){
      ctx.save();ctx.globalAlpha=visibility;
      const faceShift=6*Math.sin(yaw);
      const spacing=12.2*(.45+.55*Math.max(0,facing));
      const eyeY=54+(sleeping?3:working?-1:0)+Math.sin(pitch)*3;
      const yblink=sleeping||blinking;
      const w=5.1*(working?1.06:1);
      const h=working?8.3:7.65;
      oneEye(ctx,60-spacing+faceShift+pupil,eyeY,w,h,yblink,isHappy);
      oneEye(ctx,60+spacing+faceShift+pupil,eyeY,w,h,yblink,isHappy);
      ctx.restore();
    }
    ctx.restore();
  }
  function renderStatic(){
    for(const g of avatars)if(g.visible)draw(g,0,16);
  }
  function tick(now){
    frame=0;
    if(document.hidden||reduced||!avatars.some(g=>g.visible))return;
    const delta=Math.min(55,Math.max(0,now-lastTime||16));
    lastTime=now;
    for(const g of avatars)if(g.visible)draw(g,now,delta);
    frame=requestAnimationFrame(tick);
  }
  function start(){
    if(document.hidden||!avatars.some(g=>g.visible))return;
    if(reduced){renderStatic();return;}
    if(frame===0){lastTime=performance.now();frame=requestAnimationFrame(tick);}
  }
  function celebrate(g){g.happyAt=performance.now();start();}
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      const g=avatars.find(a=>a.canvas===entry.target);
      if(g)g.visible=entry.isIntersecting;
    }
    if(!avatars.some(g=>g.visible)&&frame){cancelAnimationFrame(frame);frame=0;}
    start();
  },{rootMargin:"80px 0px"});
  for(const g of avatars){observer.observe(g.canvas);draw(g,0,16);}
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}
    else start();
  });
  const motion=e=>{reduced=e.matches;if(frame)cancelAnimationFrame(frame);frame=0;start();};
  if(media.addEventListener)media.addEventListener("change",motion);
  else media.addListener(motion);
  window.GOXION_GIXY_LAB=Object.freeze({
    setState(state,selector){
      if(!["idle","working","sleeping"].includes(state))return false;
      for(const g of avatars)if(!selector||g.canvas.matches(selector))g.state=state;
      start();return true;
    },
    celebrate(selector){for(const g of avatars)if(!selector||g.canvas.matches(selector))celebrate(g);},
    reset(){for(const g of avatars){g.state="idle";g.target=0;g.happyAt=-10000;}start();}
  });
})();