/* GOXION · Lanzamiento octubre 2026. Aviso una sola vez por cliente y versión,
 * en este navegador, después de validar su sesión de Mi Espacio.
 * No usa datos privados ni hace consultas a Supabase, Groq o WhatsApp. */
(()=>{
  "use strict";
  if(window.GOXION_RELEASE_202610) return;
  const VERSION="oct2026-goxy-f17-v1";
  const PREFIX="gx-release-seen:";
  const SESSION_KEY=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN;
  let activeClient="",timer=0,tries=0,dialog=null,lastFocus=null,scrollY=0,bodyPrev=null;
  const readyClient=()=>{
    let key="";
    try{key=String(window.getCurrentClientKey?.()||"");}catch(_){}
    if(!key||!SESSION_KEY||!localStorage.getItem(SESSION_KEY))return "";
    if(!window.globalClientesData?.[key]&&!globalClientesData?.[key])return "";
    return key;
  };
  const storageKey=key=>PREFIX+VERSION+":"+key;
  const acknowledged=key=>{
    try{return localStorage.getItem(storageKey(key))==="1";}catch(_){return false;}
  };
  const remember=key=>{
    try{localStorage.setItem(storageKey(key),"1");}catch(_){}
  };
  const blocked=()=>{
    if(document.hidden || document.body.classList.contains("no-scroll"))return true;
    const splash=document.getElementById("splash-screen");
    if(splash && splash.style.visibility!=="hidden")return true;
    return Boolean(document.querySelector(
      ".modal.show,.gxai-chat-layer.gxai-visible,.gx-welcome-modal.show,"+
      ".gx-client-notif-overlay.show,.gx-auth-sheet.show,.auth-overlay.show"));
  };
  const markup=()=>[
    '<section class="gx-release-sheet" role="dialog" aria-modal="true" aria-labelledby="gx-release-title" aria-describedby="gx-release-intro">',
    '<header class="gx-release-head">',
      '<button class="gx-release-close" type="button" aria-label="Cerrar novedades">×</button>',
      '<div class="gx-release-kicker"><span class="gx-release-signal" aria-hidden="true"></span> UNA NUEVA ETAPA EN GOXION</div>',
      '<h2 class="gx-release-title" id="gx-release-title">Tu Espacio, <em>más inteligente.</em></h2>',
      '<p class="gx-release-intro" id="gx-release-intro">Hicimos mejoras para que tengas más claridad, control y ayuda cuando la necesites. Esto es lo nuevo:</p>',
    '</header>',
    '<div class="gx-release-content">',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">✦</span><div><strong>Conoce a Goxy, tu asistente</strong><p>Ahora puedes conversar con Goxy desde Soporte para resolver dudas, consultar fechas de pago y recibir ayuda con tus servicios. Si necesitas atención humana, prepara tu solicitud contigo.</p></div></article>',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">◉</span><div><strong>Notificaciones en Mi Espacio</strong><p>Un centro más claro para revisar avisos importantes, recordatorios, novedades y comunicaciones de tu cuenta, sin depender únicamente de mensajes externos.</p></div></article>',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">%</span><div><strong>Promociones y catálogo renovados</strong><p>Explora ofertas, combos y descuentos destacados; revisa disponibilidad y condiciones antes de solicitar tus servicios.</p></div></article>',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">◷</span><div><strong>Pagos más claros, incluso con distintas fechas</strong><p>Si tus plataformas vencen en días diferentes, ahora puedes consultar cada cobro por separado o revisar el importe conjunto en tu estado de cuenta.</p></div></article>',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">◇</span><div><strong>Prórrogas y beneficios más transparentes</strong><p>Cuando tu cuenta sea elegible, puedes solicitar una prórroga desde Mi Espacio y conocer sus condiciones. También ves tu avance de lealtad y el efecto de los pagos puntuales.</p></div></article>',
      '<article class="gx-release-item"><span class="gx-release-item-mark" aria-hidden="true">★</span><div><strong>Misiones, cupones y opiniones</strong><p>Seguimiento más intuitivo de tus misiones y recompensas, además de una mejor experiencia para dejar comentarios y ayudarnos a mejorar.</p></div></article>',
    '</div>',
    '<footer class="gx-release-foot"><button class="gx-release-primary" type="button">¡Entendido! Explorar Mi Espacio</button>',
      '<small>Las funciones y promociones se muestran según tu cuenta y su disponibilidad.</small></footer>',
    '</section>'
  ].join("");
  function unfreeze(){
    if(!bodyPrev)return;
    const body=document.body;
    body.classList.remove("gx-release-body-lock");
    body.style.position=bodyPrev.position;
    body.style.top=bodyPrev.top;
    body.style.width=bodyPrev.width;
    window.scrollTo?.(0,scrollY);
    bodyPrev=null;
  }
  function close(mark=true){
    if(!dialog)return;
    const key=activeClient;
    dialog.hidden=true;
    dialog.setAttribute("aria-hidden","true");
    unfreeze();
    if(mark && key)remember(key);
    const prev=lastFocus;
    lastFocus=null;activeClient="";
    if(prev?.isConnected)prev.focus?.();
  }
  function mount(){
    if(dialog)return dialog;
    const overlay=document.createElement("div");
    overlay.id="gx-release-overlay";
    overlay.className="gx-release-overlay";
    overlay.hidden=true;
    overlay.setAttribute("aria-hidden","true");
    overlay.innerHTML=markup();
    document.body.appendChild(overlay);
    const closeBtn=overlay.querySelector(".gx-release-close");
    const primary=overlay.querySelector(".gx-release-primary");
    closeBtn.addEventListener("click",()=>close());
    primary.addEventListener("click",()=>close());
    overlay.addEventListener("click",event=>{if(event.target===overlay)close();});
    overlay.addEventListener("keydown",event=>{
      if(event.key==="Escape"){event.preventDefault();close();return;}
      if(event.key!=="Tab")return;
      const elements=[closeBtn,primary],atFirst=document.activeElement===closeBtn,
        atLast=document.activeElement===primary;
      if(event.shiftKey&&atFirst){event.preventDefault();primary.focus();}
      else if(!event.shiftKey&&atLast){event.preventDefault();closeBtn.focus();}
    });
    dialog=overlay;
    return overlay;
  }
  function present(key){
    if(!key||readyClient()!==key||acknowledged(key)||blocked()||!document.body)return false;
    const overlay=mount();
    if(!overlay.hidden)return false;
    activeClient=key;lastFocus=document.activeElement;
    scrollY=Number(window.scrollY)||0;
    const body=document.body;
    bodyPrev={position:body.style.position,top:body.style.top,width:body.style.width};
    body.classList.add("gx-release-body-lock");
    body.style.position="fixed";
    body.style.top="-"+scrollY+"px";
    body.style.width="100%";
    overlay.hidden=false;
    overlay.setAttribute("aria-hidden","false");
    overlay.querySelector(".gx-release-close")?.focus();
    return true;
  }
  function schedule(){
    clearTimeout(timer);tries=0;
    const key=readyClient();
    if(!key||acknowledged(key))return;
    function next(){
      if(readyClient()!==key)return;
      if(present(key))return;
      if(++tries<16)timer=setTimeout(next,1200);
    }
    timer=setTimeout(next,1000);
  }
  window.addEventListener("goxion:client-ready",schedule);
  window.addEventListener("goxion:client-logout",()=>{clearTimeout(timer);close(false);});
  window.addEventListener("storage",event=>{
    if(event.key===SESSION_KEY && !event.newValue){clearTimeout(timer);close(false);}
  });
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)schedule();});
  window.GOXION_RELEASE_202610=Object.freeze({version:VERSION,close:()=>close()});
})();
