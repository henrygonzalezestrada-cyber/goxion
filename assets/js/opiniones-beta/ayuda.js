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
  const modal=document.getElementById("modal-feedback");
  const view=document.getElementById("view-inicio");
  if(!modal||!view)return;
  modal.classList.add("gx-rb-modal");
  modal.setAttribute("aria-labelledby","gx-rb-title");
  modal.innerHTML=
    '<div class="glass-card modal-content gx-rb-shell">'+
      '<button type="button" class="gx-rb-close" id="gx-rb-close" aria-label="Cerrar">'+icon.close+'</button>'+
      '<div class="gx-rb-form" id="gx-rb-form">'+
        '<span class="gx-rb-eyebrow">GOXION · OPINIONES 2.0</span>'+
        '<h2 id="gx-rb-title">Tu opinión importa</h2>'+
        '<p class="gx-rb-intro">Cada experiencia nos ayuda a mejorar. Cuéntanos cómo te ha ido con GOXION.</p>'+
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
        '<button type="button" class="gx-rb-submit" id="gx-rb-submit"><span>Enviar mi opinión</span>'+icon.arrow+'</button>'+
      '</div>'+
      '<div class="gx-rb-success-screen" id="gx-rb-success" hidden>'+
        '<div class="gx-rb-success-icon">'+icon.check+'</div>'+
        '<h2>¡Opinión guardada!</h2>'+
        '<p id="gx-rb-success-text">Tu comentario se encuentra en revisión.</p>'+
        '<button type="button" class="gx-rb-done" id="gx-rb-done">Listo</button>'+
      '</div>'+
    '</div>';
  let rating=0,preview=0,sending=false;
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
    $("gx-rb-text").value="";
    $("gx-rb-counter").textContent="0/500";
    $("gx-rb-consent").checked=false;
    $("gx-rb-error").textContent="";
    $("gx-rb-form").hidden=false;
    $("gx-rb-success").hidden=true;
    $("gx-rb-submit").disabled=false;
    $("gx-rb-submit").classList.remove("is-success");
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
  $("gx-rb-close").addEventListener("click",()=>window.closeModal?.("modal-feedback"));
  $("gx-rb-done").addEventListener("click",()=>window.closeModal?.("modal-feedback"));
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
      btn.classList.add("is-success");
      btn.querySelector("span").textContent="¡Guardado!";
      btn.querySelector("svg")?.remove();
      btn.insertAdjacentHTML("beforeend",icon.check);
      $("gx-rb-success-text").textContent=review.consent?
        "Ya puedes revisar esta opinión en Admin. Aparecerá en la cinta solo después de aprobarla.":
        "Tu opinión es privada. Puedes verla en Admin, pero no podrá publicarse sin tu autorización.";
      $("gx-rb-form").hidden=true;
      $("gx-rb-success").hidden=false;
    }catch(error){
      $("gx-rb-error").textContent=error.message;
      btn.disabled=false;
    }finally{sending=false;}
  }
  $("gx-rb-submit").addEventListener("click",send);
  $("gx-rb-text").addEventListener("keydown",e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();send()}
  });
  window.openFeedbackModal=function(){
    reset();
    if(typeof window.openModal==="function")window.openModal("modal-feedback");
    else{modal.classList.add("show");modal.style.display="flex"}
  };
  function buildHome(){
    const section=document.createElement("section");
    section.id="gx-rb-home";
    section.className="gx-rb-home";
    section.setAttribute("aria-label","Reseñas de GOXION en demostración");
    section.innerHTML=
      '<div class="gx-rb-home-top"><div><span class="gx-rb-kicker">VOCES DE GOXION</span><h2>Lo que opinan de nosotros</h2></div><div class="gx-rb-home-count" id="gx-rb-count"></div></div>'+
      '<div class="gx-rb-track" id="gx-rb-track" tabindex="0" aria-label="Reseñas desliza horizontalmente"></div>'+
      '<div class="gx-rb-example-note">Vista de prueba: las reseñas de ejemplo no corresponden a clientes reales.</div>'+
      '<div class="gx-rb-home-footer"><span>Tu experiencia también cuenta ✨</span><button type="button" class="gx-rb-home-cta" id="gx-rb-open">Dejar mi opinión →</button></div>';
    const insertion=[...view.querySelectorAll(".section-title")].find(node=>node.textContent.includes("Cómo funciona"));
    if(insertion)insertion.before(section);
    else view.appendChild(section);
    $("gx-rb-open").addEventListener("click",()=>window.openFeedbackModal());
  }
  function renderHome(){
    const track=$("gx-rb-track");
    if(!track)return;
    const reviews=store.load().filter(r=>r.status==="published"&&r.consent&&r.verified);
    track.replaceChildren();
    $("gx-rb-count").textContent=reviews.length+" en esta demo";
    if(!reviews.length){
      const empty=document.createElement("div");
      empty.className="gx-rb-empty";
      empty.textContent="Aún no hay opiniones públicas. Puedes aprobar una desde Admin.";
      track.appendChild(empty);return;
    }
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
      track.appendChild(card);
    });
  }
  function createBar(){
    const div=document.createElement("div");
    div.className="gx-rb-demo-bar";
    div.innerHTML='<div><strong>✨ OPINIONES 2.0 · BETA</strong><span>Guardado local · Sin datos reales</span></div><a href="./preview/opiniones/admin-opiniones.html?v=20261009a">Ver revisión en Admin ↗</a>';
    document.body.prepend(div);
  }
  buildHome();
  createBar();
  store.subscribe(renderHome);
  renderHome();
})();
