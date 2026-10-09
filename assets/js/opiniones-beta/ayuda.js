/* GOXION Opiniones 2.0 / Cliente — beta aislada, sin notificaciones reales */
(() => {
  "use strict";
  const store=window.GOXION_REVIEWS_BETA;
  if(!store||window.__gxOpinionBetaClient)return;
  window.__gxOpinionBetaClient=true;
  const svg=store.starSvg;
  const icon={
    check:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4.5 4.5L19.5 6"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"/></svg>',
    arrow:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-5-5 5 5-5 5"/></svg>',
    badge:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 1.6 3.1.2.3 3.1L20 12l-1.8 3.1-.3 3.1-3.1.2L12 20l-2.8-1.6-3.1-.2-.3-3.1L4 12l1.8-3.1.3-3.1 3.1-.2L12 3Z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m8.8 12.1 2.1 2.1 4.2-4.4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  // Star outline is the light source itself, not a symbol inside a box.
  const heroStar='<svg class="gx-rb-neon-star" viewBox="0 0 100 100" aria-hidden="true">'+
    '<defs><linearGradient id="gx-rb-star-gradient" x1="0" y1="0" x2="1" y2="1">'+
      '<stop offset="0%" stop-color="#00f2fe"/><stop offset="55%" stop-color="#7c4dff"/><stop offset="100%" stop-color="#78faff"/>'+
    '</linearGradient></defs>'+
    '<path class="gx-rb-neon-star-halo" d="M50 7 62.6 34.7 93 38.5 70.5 59.2 76.5 89.5 50 74.2 23.5 89.5 29.5 59.2 7 38.5 37.4 34.7Z"/>'+
    '<path class="gx-rb-neon-star-line" d="M50 7 62.6 34.7 93 38.5 70.5 59.2 76.5 89.5 50 74.2 23.5 89.5 29.5 59.2 7 38.5 37.4 34.7Z"/>'+
    '<path class="gx-rb-neon-star-trail" pathLength="100" d="M50 7 62.6 34.7 93 38.5 70.5 59.2 76.5 89.5 50 74.2 23.5 89.5 29.5 59.2 7 38.5 37.4 34.7Z"/>'+
    '<path class="gx-rb-neon-star-runner" pathLength="100" d="M50 7 62.6 34.7 93 38.5 70.5 59.2 76.5 89.5 50 74.2 23.5 89.5 29.5 59.2 7 38.5 37.4 34.7Z"/>'+
    '</svg>';
  const modal=document.getElementById("modal-feedback");
  const view=document.getElementById("view-inicio");
  if(!modal||!view)return;
  modal.classList.add("gx-rb-modal");
  modal.setAttribute("aria-labelledby","gx-rb-title");
  modal.innerHTML=
    '<div class="glass-card modal-content gx-rb-shell">'+
      '<button type="button" class="gx-rb-close" id="gx-rb-close" aria-label="Cerrar">'+icon.close+'</button>'+
      '<div class="gx-rb-form" id="gx-rb-form">'+
        '<div class="gx-rb-form-head">'+
          '<div class="gx-rb-emblem" aria-hidden="true">'+heroStar+'</div>'+
          '<span class="gx-rb-eyebrow">TU EXPERIENCIA EN GOXION</span>'+
          '<h2 id="gx-rb-title">¿Cómo te fue con nosotros?</h2>'+
          '<p class="gx-rb-intro">Queremos escucharte. Comparte tu experiencia y ayúdanos a seguir mejorando.</p>'+
        '</div>'+
        '<div class="gx-rb-fields" id="gx-rb-fields">'+
        '<div class="gx-rb-score">'+
          '<span class="gx-rb-score-label">¿Cómo calificarías tu experiencia?</span>'+
          '<div class="gx-rb-stars" id="gx-rb-stars" role="group" aria-label="Califica de una a cinco estrellas">'+
          [1,2,3,4,5].map(i=>'<button type="button" class="gx-rb-star" data-score="'+i+'" aria-label="'+i+' '+(i===1?'estrella':'estrellas')+'" aria-pressed="false">'+svg+'</button>').join("")+
          '</div><span class="gx-rb-rating-feedback" id="gx-rb-rating-feedback" aria-live="polite">Selecciona las estrellas</span>'+
        '</div>'+
        '<div class="gx-rb-fieldhead"><label for="gx-rb-text">Cuéntanos un poco más</label><span class="gx-rb-counter" id="gx-rb-counter">0/500</span></div>'+
        '<textarea class="gx-rb-text" id="gx-rb-text" maxlength="500" placeholder="¿Qué te gustó? ¿Qué podríamos hacer mejor? Tu experiencia cuenta..." rows="4"></textarea>'+
        '<label class="gx-rb-consent"><input id="gx-rb-consent" type="checkbox"><span><strong>Permitir compartir mi opinión</strong><small>Si la autorizas, podrá aparecer en la portada después de revisión. Sin nombres completos, teléfonos ni folios.</small></span></label>'+
        '<p class="gx-rb-formnote">Beta de demostración: simula un cliente, guarda solo en este navegador y no completa misiones ni envía mensajes reales.</p>'+
        '<p class="gx-rb-error" id="gx-rb-error" role="alert" aria-live="polite"></p>'+
        '</div>'+
        '<div class="gx-rb-success-screen" id="gx-rb-success" hidden>'+
          '<p id="gx-rb-success-text">Tu comentario se encuentra en revisión.</p>'+
        '</div>'+
        '<button type="button" class="gx-rb-submit" id="gx-rb-submit"><span>Enviar mi opinión</span>'+icon.arrow+'</button>'+
      '</div>'+
    '</div>';
  let rating=0,preview=0,sending=false,lockedScroll=null,fieldsTimer=null;
  const originalTitle="¿Cómo te fue con nosotros?";
  function lockBackground(){
    if(lockedScroll)return;
    const body=document.body,styles=body.style;
    lockedScroll={
      y:window.scrollY,
      position:styles.position,top:styles.top,left:styles.left,
      right:styles.right,width:styles.width
    };
    styles.position="fixed";
    styles.top=(-lockedScroll.y)+"px";
    styles.left="0";
    styles.right="0";
    styles.width="100%";
  }
  function unlockBackground(){
    if(!lockedScroll)return;
    const saved=lockedScroll;
    lockedScroll=null;
    const style=document.body.style;
    for(const key of ["position","top","left","right","width"])style[key]=saved[key];
    window.scrollTo(0,saved.y);
  }
  const modalVisibility=new MutationObserver(()=>{
    if(modal.classList.contains("show"))lockBackground();
    else unlockBackground();
  });
  modalVisibility.observe(modal,{attributes:true,attributeFilter:["class"]});
  modal.addEventListener("touchmove",event=>{
    if(modal.classList.contains("gx-rb-complete")&&event.cancelable)event.preventDefault();
  },{passive:false});
  function closeFeedback(){
    if(typeof window.closeModal==="function")window.closeModal("modal-feedback");
    else{modal.classList.remove("show");modal.style.display="none"}
    unlockBackground();
  }
  const $=id=>document.getElementById(id);
  const starButtons=[...modal.querySelectorAll(".gx-rb-star")];
  const names=["Selecciona las estrellas","Podemos mejorar","Hay oportunidad de mejorar","Buena experiencia","¡Muy buena experiencia!","¡Excelente experiencia!"];
  function paint(){
    const score=preview||rating;
    for(const node of starButtons){
      const value=Number(node.dataset.score);
      node.classList.toggle("is-lit",value<=score);
      node.setAttribute("aria-pressed",String(value===rating));
    }
    $("gx-rb-rating-feedback").textContent=names[score];
  }
  function reset(){
    rating=0;preview=0;sending=false;
    clearTimeout(fieldsTimer);
    modal.classList.remove("gx-rb-complete","gx-rb-morphing");
    $("gx-rb-fields").hidden=false;
    $("gx-rb-fields").removeAttribute("aria-hidden");
    $("gx-rb-title").textContent=originalTitle;
    $("gx-rb-text").value="";
    $("gx-rb-counter").textContent="0/500";
    $("gx-rb-consent").checked=false;
    $("gx-rb-error").textContent="";
    $("gx-rb-form").hidden=false;
    $("gx-rb-success").hidden=true;
    $("gx-rb-submit").disabled=false;
    $("gx-rb-submit").classList.remove("is-success");
    $("gx-rb-submit").removeAttribute("aria-label");
    $("gx-rb-submit").querySelector("span").textContent="Enviar mi opinión";
    // Restore the arrow after the success morph when opening a fresh review.
    const submitIcon=$("gx-rb-submit").querySelector("svg");
    if(submitIcon)submitIcon.remove();
    $("gx-rb-submit").insertAdjacentHTML("beforeend",icon.arrow);
    paint();
  }
  starButtons.forEach(button=>{
    button.addEventListener("pointerenter",()=>{
      if(button.matches(":hover")&&window.matchMedia("(hover:hover)").matches){
        preview=Number(button.dataset.score);paint();
      }
    });
    button.addEventListener("pointerleave",()=>{preview=0;paint()});
    button.addEventListener("click",()=>{
      const chosen=Number(button.dataset.score);
      rating=chosen;preview=0;
      paint();
      button.classList.remove("is-chosen");
      void button.offsetWidth;
      button.classList.add("is-chosen");
      setTimeout(()=>button.classList.remove("is-chosen"),600);
      $("gx-rb-error").textContent="";
    });
  });
  $("gx-rb-text").addEventListener("input",event=>{
    $("gx-rb-counter").textContent=event.target.value.length+"/500";
    $("gx-rb-error").textContent="";
  });
  $("gx-rb-close").addEventListener("click",closeFeedback);
  function send(){
    if(sending)return;
    sending=true;
    const btn=$("gx-rb-submit");
    btn.disabled=true;
    $("gx-rb-error").textContent="";
    try{
      const review=store.add({
        rating,text:$("gx-rb-text").value,consent:$("gx-rb-consent").checked
      });
      $("gx-rb-success-text").textContent=review.consent?
        "Podrás verla en la cinta después de que se apruebe su publicación.":
        "Tu comentario es privado y solo podrá publicarse con tu autorización.";
      // Same DOM button morphs from submit into compact ✓ Listo; no second CTA.
      $("gx-rb-success").hidden=false;
      $("gx-rb-fields").setAttribute("aria-hidden","true");
      $("gx-rb-title").textContent="¡Opinión guardada!";
      modal.classList.add("gx-rb-morphing","gx-rb-complete");
      btn.classList.add("is-success");
      btn.querySelector("span").textContent="Listo";
      btn.querySelector("svg")?.remove();
      btn.insertAdjacentHTML("afterbegin",icon.check);
      btn.setAttribute("aria-label","Listo, cerrar opinión");
      btn.disabled=false;
      fieldsTimer=setTimeout(()=>{
        $("gx-rb-fields").hidden=true;
        modal.classList.remove("gx-rb-morphing");
      },450);
    }catch(error){
      $("gx-rb-error").textContent=error.message;
      btn.disabled=false;
    }finally{sending=false;}
  }
  $("gx-rb-submit").addEventListener("click",()=>{
    if(modal.classList.contains("gx-rb-complete"))closeFeedback();
    else send();
  });
  $("gx-rb-text").addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();send()}
  });
  window.openFeedbackModal=function(){
    reset();
    if(typeof window.openModal==="function")window.openModal("modal-feedback");
    else{modal.classList.add("show");modal.style.display="flex"}
  };
  // Animate a repeating STRIP, not fractional scrollLeft steps. Safari rounds
  // subpixel scroll changes to zero on some devices, leaving the marquee frozen.
  // Transform animations retain subpixel precision and loop seamlessly.
  const motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
  let marqueePauseTimer=null,isInteracting=false;
  function pauseMarquee(){
    clearTimeout(marqueePauseTimer);
    document.getElementById("gx-rb-track")?.classList.add("gx-rb-paused");
  }
  function resumeMarquee(delay=2200){
    clearTimeout(marqueePauseTimer);
    marqueePauseTimer=setTimeout(()=>{
      if(!isInteracting&&!document.hidden)
        document.getElementById("gx-rb-track")?.classList.remove("gx-rb-paused");
    },delay);
  }
  function buildHome(){
    const section=document.createElement("section");
    section.id="gx-rb-home";
    section.className="gx-rb-home";
    section.setAttribute("aria-label","Reseñas de GOXION en demostración");
    section.innerHTML=
      '<div class="gx-rb-home-top"><div><span class="gx-rb-kicker">EXPERIENCIAS GOXION</span><h2>Lo que opinan de GOXION</h2></div></div>'+
      '<div class="gx-rb-marquee"><div class="gx-rb-track" id="gx-rb-track" tabindex="0" aria-label="Reseñas que se desplazan lentamente; desliza para explorar"></div></div>'+
      '<div class="gx-rb-example-note">Opiniones de ejemplo para visualizar esta beta.</div>';
    // Editorial trust strip belongs near the end, before the final support invitation.
    const finalCall=view.querySelector(".final-cta");
    if(finalCall)finalCall.before(section);
    else view.appendChild(section);
    const track=$("gx-rb-track");
    for(const event of ["pointerdown","touchstart"]){
      track.addEventListener(event,()=>{isInteracting=true;pauseMarquee()},{passive:true});
    }
    for(const event of ["pointerup","pointercancel","touchend","touchcancel"]){
      track.addEventListener(event,()=>{isInteracting=false;resumeMarquee(2400)},{passive:true});
    }
    if(window.matchMedia("(hover:hover)").matches){
      track.addEventListener("mouseenter",()=>{isInteracting=true;pauseMarquee()});
      track.addEventListener("mouseleave",()=>{isInteracting=false;resumeMarquee(1600)});
    }
    track.addEventListener("focusin",()=>{isInteracting=true;pauseMarquee()});
    track.addEventListener("focusout",()=>{isInteracting=false;resumeMarquee(1600)});
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden)pauseMarquee();
      else resumeMarquee(350);
    });
  }
  function renderHome(){
    const track=$("gx-rb-track");
    if(!track)return;
    const reviews=store.load().filter(r=>r.status==="published"&&r.consent&&r.verified);
    track.replaceChildren();
    const strip=document.createElement("div");
    strip.className="gx-rb-marquee-strip";
    track.appendChild(strip);
    if(!reviews.length){
      const empty=document.createElement("div");
      empty.className="gx-rb-empty";
      empty.textContent="Aún no hay opiniones públicas. Puedes aprobar una desde Admin.";
      track.appendChild(empty);return;
    }
    const group=document.createElement("div");
    group.className="gx-rb-marquee-group";
    reviews.forEach(review=>{
      const card=document.createElement("article");
      card.className="gx-rb-quote";
      const stars=document.createElement("div");
      stars.className="gx-rb-rating";
      stars.setAttribute("aria-label",review.rating+" de 5 estrellas");
      for(let i=0;i<Number(review.rating);i++){
        const iconBox=document.createElement("span");iconBox.innerHTML=svg;
        stars.appendChild(iconBox);
      }
      const p=document.createElement("p");
      p.textContent="“"+review.text+"”";
      const line=document.createElement("div");
      line.className="gx-rb-byline";
      const badge=document.createElement("span");badge.innerHTML=icon.badge;
      const who=document.createElement("span");
      who.textContent=review.sample?"Opinión ficticia · Ejemplo":"Cliente de prueba · Beta";
      line.append(badge,who);
      card.append(stars,p,line);
      group.appendChild(card);
    });
    strip.appendChild(group);
    // Three identical groups form one seamless loop; duplicates are
    // aria-hidden so accessible readers hear each review only once.
    if(reviews.length>1&&!motionQuery.matches){
      for(let i=0;i<2;i++){
        const clone=group.cloneNode(true);
        clone.setAttribute("aria-hidden","true");
        strip.appendChild(clone);
      }
      strip.classList.add("gx-rb-marquee-running");
      if(isInteracting||document.hidden)pauseMarquee();
    }
  }
  function createBar(){
    const div=document.createElement("div");
    div.className="gx-rb-demo-bar gx-rb-demo-bar--ayuda";
    div.innerHTML='<div><strong>✨ Opiniones 2.0 · Beta</strong><span>Vista de prueba · Sin datos reales</span></div><a href="./preview/opiniones/admin-opiniones.html?v=20261009b">Ver en Admin ↗</a>';
    document.body.prepend(div);
  }
  buildHome();
  createBar();
  store.subscribe(renderHome);
  renderHome();
})();
