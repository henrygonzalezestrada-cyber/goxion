/* GOXION · Beta aislada de pila de avisos para la cuenta Cliente Prueba.
 * Solo UI. No escribe decisiones legales, fechas, pagos, notificaciones ni marcas de lectura. */
(()=>{
  "use strict";
  const params=new URLSearchParams(location.search);
  if(params.get("avisosBeta")!=="1"||window.GOXION_AVISOS_STACK_BETA)return;
  const KEY="cliente-prueba";
  const SEEN_KEY="gx-beta-novedades-leidas:v2:"+KEY;
  const newsSeen=()=>{try{return localStorage.getItem(SEEN_KEY)==="1";}catch(_){return false;}};
  const rememberNews=()=>{try{localStorage.setItem(SEEN_KEY,"1");}catch(_){}};
  const resetNews=()=>{try{localStorage.removeItem(SEEN_KEY);}catch(_){}};
  const TOKEN_KEY=window.GOXION_CORE?.STORAGE?.CLIENT_TOKEN||"goxion_client_token";
  const news=[
    {symbol:"✦",title:"Conoce a Goxy, tu asistente",copy:"Ahora puedes conversar con Goxy desde Soporte para resolver dudas, consultar fechas de pago y recibir ayuda con tus servicios. Si necesitas atención humana, prepara tu solicitud contigo."},
    {symbol:"◉",title:"Notificaciones en Mi Espacio",copy:"Un centro más claro para revisar avisos importantes, recordatorios, novedades y comunicaciones de tu cuenta, sin depender únicamente de mensajes externos."},
    {symbol:"%",title:"Promociones y catálogo renovados",copy:"Explora ofertas, combos y descuentos destacados; revisa disponibilidad y condiciones antes de solicitar tus servicios."},
    {symbol:"◷",title:"Pagos más claros, incluso con distintas fechas",copy:"Si tus plataformas vencen en días diferentes, ahora puedes consultar cada cobro por separado o revisar el importe conjunto en tu estado de cuenta."},
    {symbol:"◇",title:"Prórrogas y beneficios más transparentes",copy:"Cuando tu cuenta sea elegible, puedes solicitar una prórroga desde Mi Espacio y conocer sus condiciones. También ves tu avance de lealtad y el efecto de los pagos puntuales."},
    {symbol:"★",title:"Misiones, cupones y opiniones",copy:"Seguimiento más intuitivo de tus misiones y recompensas, además de una mejor experiencia para dejar comentarios y ayudarnos a mejorar."}
  ];
  const isTest=()=>{
    let key="";
    try{key=String(window.getCurrentClientKey?.()||window.goxionCurrentClientKey||"");}catch(_){}
    return key===KEY&&Boolean(localStorage.getItem(TOKEN_KEY));
  };
  const safe=()=>isTest()&&!window.GOXION_LEGAL_V2?.getAccessState?.()?.restringido;
  let overlay=null,launcher=null,shown=false,open=false,stage="terms",savedFocus=null,scrollTop=0;
  let tries=0,retry=0;
  const $=(q,root=document)=>root.querySelector(q);
  const make=(tag,cls,txt)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(txt!==undefined)el.textContent=txt;
    return el;
  };
  const closeIcon='<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"></path></svg>';
  function mount(){
    if(overlay)return;
    launcher=make("button","gx-stack-beta-launcher","Volver a probar avisos");
    launcher.type="button";
    launcher.hidden=true;
    launcher.addEventListener("click",()=>{resetNews();show();});
    document.body.append(launcher);
    overlay=make("div","gx-stack-beta");
    overlay.id="gx-stack-beta";
    overlay.hidden=true;
    overlay.setAttribute("aria-label","Demostración de tarjetas apiladas");
    overlay.innerHTML=[
      '<div class="gx-stack-beta-scene">',
        '<div class="gx-stack-beta-peek" aria-hidden="true"><strong>Tu Espacio, más inteligente.</strong></div>',
        '<section class="gx-stack-beta-terms" role="dialog" aria-modal="true" aria-labelledby="gx-beta-terms-title">',
          '<div class="gx-stack-beta-headline"><span class="gx-stack-beta-demo">VISTA PREVIA · CLIENTE PRUEBA</span>',
            '<button class="gx-stack-beta-close" type="button" data-beta-terms-close aria-label="Posponer términos">'+closeIcon+'</button></div>',
          '<h2 id="gx-beta-terms-title"><span>Actualizamos</span> los términos.</h2>',
          '<p class="gx-stack-beta-copy">Consulta la versión 2.0 antes de decidir.</p>',
          '<button type="button" class="gx-stack-beta-primary" data-beta-accept>Simular aceptación <span aria-hidden="true">→</span></button>',
          '<div class="gx-stack-beta-terms-actions">',
            '<button type="button" data-beta-reject>Simular rechazo</button>',
            '<button type="button" data-beta-later>Ahora no</button>',
          '</div>',
          '<p class="gx-stack-beta-disclaimer">Esta prueba es visual. No modifica los términos aceptados en tu cuenta.</p>',
        '</section>',
        '<section class="gx-stack-beta-news" role="dialog" aria-modal="true" aria-labelledby="gx-beta-news-title" aria-hidden="true">',
          '<header class="gx-stack-beta-news-header">',
              '<button type="button" class="gx-stack-beta-close" data-beta-done aria-label="Cerrar novedades">'+closeIcon+'</button>',
            '<h2 id="gx-beta-news-title">Tu Espacio, <span>más inteligente.</span></h2>',
          '</header>',
          '<div class="gx-stack-beta-scroll" tabindex="0" role="region" aria-label="Las seis novedades; desplaza para leerlas">',
            news.map((item,i)=>
              '<article class="gx-stack-beta-news-item" data-beta-item="'+i+'"><span class="gx-stack-beta-mark" aria-hidden="true">'+item.symbol+'</span><div><h3>'+item.title+'</h3><p>'+item.copy+'</p></div></article>'
            ).join(""),
          '</div>',
          '<footer class="gx-stack-beta-news-footer">',
              '<button type="button" class="gx-stack-beta-primary" data-beta-done>¡Entendido! Explorar Mi Espacio</button>',
          '</footer>',
        '</section>',
        '<section class="gx-stack-beta-rejected" role="dialog" aria-modal="true" aria-labelledby="gx-beta-reject-title" aria-hidden="true">',
          '<div class="gx-stack-beta-demo">VISTA PREVIA · CLIENTE PRUEBA</div>',
          '<div class="gx-stack-beta-reject-icon">✕</div>',
          '<h2 id="gx-beta-reject-title">No se muestran novedades.</h2>',
          '<p>En este ejemplo, al rechazar los términos, la cola de novedades se descarta. No se modificó tu decisión real.</p>',
          '<button type="button" class="gx-stack-beta-primary" data-beta-restart>Repetir simulación</button>',
          '<button type="button" class="gx-stack-beta-reject-exit" data-beta-close>Cerrar beta</button>',
        '</section>',
        '<span class="gx-stack-beta-sr" role="status" aria-live="polite" data-beta-status></span>',
      '</div>'
    ].join("");
    document.body.append(overlay);
    overlay.addEventListener("click",event=>{
      const btn=event.target.closest?.("button");
      if(btn?.hasAttribute("data-beta-accept"))choose("accept");
      if(btn?.hasAttribute("data-beta-reject"))choose("reject");
      if(btn?.hasAttribute("data-beta-later")||btn?.hasAttribute("data-beta-terms-close"))choose("later");
      if(btn?.hasAttribute("data-beta-done"))dismissNews();
      if(btn?.hasAttribute("data-beta-close"))hide();
      if(btn?.hasAttribute("data-beta-restart")){resetNews();reset();}
      if(event.target===overlay){
        if(stage==="terms")choose("later");
        else if(stage==="news")dismissNews();
        else hide();
      }
    });
    overlay.addEventListener("keydown",event=>{
      if(event.key==="Escape"){
        event.preventDefault();
        if(stage==="terms")choose("later");
        else if(stage==="news")dismissNews();
        else hide();
        return;
      }
      if(event.key!=="Tab")return;
      const active=stage==="news"?$(".gx-stack-beta-news",overlay):
        stage==="rejected"?$(".gx-stack-beta-rejected",overlay):$(".gx-stack-beta-terms",overlay);
      const controls=[...active.querySelectorAll("button:not([disabled])")];
      if(!controls.length)return;
      if(event.shiftKey&&document.activeElement===controls[0]){
        event.preventDefault();controls[controls.length-1].focus();
      }else if(!event.shiftKey&&document.activeElement===controls[controls.length-1]){
        event.preventDefault();controls[0].focus();
      }
    });
  }

  function reset(){
    if(!overlay)return;
    overlay.dataset.stage="terms";stage="terms";
    $(".gx-stack-beta-news",overlay).setAttribute("aria-hidden","true");
    $(".gx-stack-beta-rejected",overlay).setAttribute("aria-hidden","true");
    $(".gx-stack-beta-terms",overlay).setAttribute("aria-hidden","false");
    $(".gx-stack-beta-scroll",overlay).scrollTop=0;
    $("[data-beta-status]",overlay).textContent="";
    $(".gx-stack-beta-peek",overlay).hidden=newsSeen();
    $(".gx-stack-beta-terms button",overlay)?.focus({preventScroll:true});
  }
  function show(){
    if(open||!safe())return;
    mount();
    const splash=$("#splash-screen");
    if(document.body.classList.contains("no-scroll")||
      (splash&&splash.style.visibility!=="hidden")||
      document.querySelector("dialog[open],.modal.show,.gx-release-overlay:not([hidden])"))return;
    shown=true;open=true;savedFocus=document.activeElement;scrollTop=window.scrollY||0;
    document.body.classList.add("gx-stack-beta-active");
    overlay.hidden=false;launcher.hidden=true;
    reset();
    setTimeout(()=>{if(open)$("[data-beta-accept]",overlay)?.focus({preventScroll:true})},120);
  }
  function choose(kind){
    if(!open||stage!=="terms")return;
    if(kind==="accept"||kind==="later"){
      if(newsSeen()){hide();return;}
      stage="news";overlay.dataset.stage="news";
      $(".gx-stack-beta-news",overlay).setAttribute("aria-hidden","false");
      $(".gx-stack-beta-terms",overlay).setAttribute("aria-hidden","true");
      $("[data-beta-status]",overlay).textContent=kind==="later"
        ?"Términos pospuestos; continúa la tarjeta independiente de novedades."
        :"Novedades disponibles. Desliza para consultar las seis mejoras.";
      setTimeout(()=>{if(open&&stage==="news")$(".gx-stack-beta-scroll",overlay)?.focus({preventScroll:true})},350);
    }else{
      stage="rejected";overlay.dataset.stage="rejected";
      $(".gx-stack-beta-rejected",overlay).setAttribute("aria-hidden","false");
      $(".gx-stack-beta-terms",overlay).setAttribute("aria-hidden","true");
      $("[data-beta-status]",overlay).textContent="Las novedades se retiraron de la cola.";
      setTimeout(()=>{if(open&&stage==="rejected")$("[data-beta-restart]",overlay)?.focus({preventScroll:true})},330);
    }
  }
  function dismissNews(){
    if(stage!=="news")return;
    // Solo la tarjeta de novedades se marca como vista en esta beta.
    // Términos, PIN, pagos y el anuncio oficial no se modifican.
    rememberNews();
    hide();
  }
  function hide(){
    if(!overlay||!open)return;
    open=false;overlay.hidden=true;
    document.body.classList.remove("gx-stack-beta-active");
    if(safe())launcher.hidden=false;
    const focus=savedFocus;savedFocus=null;
    if(focus?.isConnected&&!focus.closest("#gx-stack-beta"))focus.focus({preventScroll:true});
    else if(launcher&&!launcher.hidden)launcher.focus({preventScroll:true});
    window.scrollTo?.(0,scrollTop);
  }
  function cancel(){
    clearTimeout(retry);
    if(open)hide();
    if(launcher)launcher.hidden=true;
    shown=false;
  }
  function launch(){
    if(!safe()){if(launcher)launcher.hidden=true;return;}
    mount();launcher.hidden=open;
    if(shown)return;
    if(++tries>35)return;
    if(!document.hidden&&!document.body.classList.contains("no-scroll")&&
      !document.querySelector("dialog[open],.modal.show")&&
      (!$("#splash-screen")||$("#splash-screen").style.visibility==="hidden")){
      show();return;
    }
    clearTimeout(retry);retry=setTimeout(launch,700);
  }
  window.addEventListener("goxion:client-ready",()=>{
    if(isTest()){tries=0;launch();}else cancel();
  });
  window.addEventListener("goxion:client-logout",cancel);
  window.addEventListener("goxion:legal-state",event=>{
    if(event.detail?.acceso?.restringido===true)cancel();
  });
  window.addEventListener("storage",event=>{
    if(event.key===TOKEN_KEY){if(isTest())launch();else cancel();}
  });
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden&&isTest()&&!shown)launch();
  });
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",()=>{if(isTest())launch();},{once:true});
  }else if(isTest())launch();
  window.GOXION_AVISOS_STACK_BETA=Object.freeze({isActive:()=>open,replay:()=>show()});
})();