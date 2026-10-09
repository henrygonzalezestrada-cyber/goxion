/* GOXION Opiniones 2.0 / Admin — vista de moderación DEMO sin credenciales */
(() => {
  "use strict";
  const store=window.GOXION_REVIEWS_BETA;
  if(!store||window.__gxOpinionBetaAdmin)return;
  window.__gxOpinionBetaAdmin=true;
  let filter="pending";
  const host=document.getElementById("gx-rb-admin-host")||(()=> {
    const panel=document.createElement("div");
    const anchor=document.querySelector("#gx-decision-center")||document.querySelector("#tab-resumen");
    panel.id="gx-rb-admin-host";
    if(anchor)anchor.after(panel);
    else document.body.append(panel);
    return panel;
  })();
  host.classList.add("gx-rb-focus-anchor");
  const root=document.createElement("section");
  root.className="gx-rb-admin";
  root.id="gx-rb-admin";
  root.innerHTML=
    '<div class="gx-rb-admin-head"><div><span class="gx-rb-kicker">RELACIÓN CON CLIENTES</span><h2>Opiniones</h2><p>Escucha, responde y decide qué mostrar en la portada.</p></div><span class="gx-rb-admin-tag">DEMO LOCAL</span></div>'+
    '<div class="gx-rb-stats"><div class="gx-rb-stat is-new"><strong id="gx-rb-stat-pending">0</strong><span>Por revisar</span></div><div class="gx-rb-stat"><strong id="gx-rb-stat-public">0</strong><span>Publicadas</span></div><div class="gx-rb-stat"><strong id="gx-rb-stat-total">0</strong><span>Total demo</span></div></div>'+
    '<div class="gx-rb-tabs" aria-label="Filtrar opiniones">'+
      '<button type="button" data-filter="pending" aria-pressed="true">Pendientes</button>'+
      '<button type="button" data-filter="published" aria-pressed="false">Publicadas</button>'+
      '<button type="button" data-filter="private" aria-pressed="false">Privadas</button>'+
      '<button type="button" data-filter="hidden" aria-pressed="false">Ocultas</button>'+
    '</div>'+
    '<div class="gx-rb-admin-list" id="gx-rb-admin-list" aria-live="polite"></div>'+
    '<div class="gx-rb-tools"><span>Los datos de esta beta permanecen solo en tu navegador.</span><button type="button" class="gx-rb-reset" id="gx-rb-reset">Restaurar ejemplo</button></div>';
  host.appendChild(root);
  const $=id=>document.getElementById(id);
  const tabs=[...root.querySelectorAll("[data-filter]")];
  tabs.forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;render()}));
  $("gx-rb-reset").addEventListener("click",()=>{
    if(!window.confirm("¿Restaurar las opiniones ficticias de demostración? Se perderán los cambios hechos en este navegador."))return;
    store.reset();filter="pending";render();
  });
  function element(tag,cls,content){
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(content!==undefined)el.textContent=content;
    return el;
  }
  function actionButton(label,action,review){
    const btn=element("button","",label);
    btn.type="button";btn.dataset.action=action;
    if(action==="publish"){
      const allowed=review.consent&&review.verified;
      btn.disabled=!allowed;
      if(!allowed)btn.title="Sin consentimiento o verificación, no se puede publicar.";
    }
    btn.addEventListener("click",()=>{
      try{store.update(review.id,action);render()}
      catch(error){window.alert(error.message)}
    });
    return btn;
  }
  function renderCard(review){
    const card=element("article","gx-rb-admin-card");
    const head=element("div","gx-rb-admin-card-head");
    const main=element("div");
    main.appendChild(element("div","gx-rb-admin-card-title",review.author||"Cliente"));
    const consentLabel=review.consent?"Autorizó publicación":"Solo privado · sin autorización";
    main.appendChild(element("div","gx-rb-admin-card-meta",store.date(review.date)+" · "+consentLabel));
    const statuses={pending:"Pendiente",published:"Publicada",private:"Privada",hidden:"Oculta"};
    const pill=element("span","gx-rb-status "+review.status,statuses[review.status]||review.status);
    head.append(main,pill);
    const stars=element("div","gx-rb-rating");
    stars.setAttribute("aria-label",review.rating+" estrellas");
    for(let i=0;i<review.rating;i++){
      const span=element("span");
      span.innerHTML=store.starSvg;
      stars.appendChild(span);
    }
    const content=element("p","",review.text);
    const actions=element("div","gx-rb-admin-actions");
    if(review.status!=="published")actions.appendChild(actionButton("✓ Aprobar publicación","publish",review));
    if(review.status!=="hidden")actions.appendChild(actionButton("Ocultar","hide",review));
    const replyTrigger=element("button","","Responder");
    replyTrigger.type="button";
    actions.append(replyTrigger);
    const replyWrap=element("div","gx-rb-admin-answer");
    replyWrap.hidden=true;
    const replyInput=document.createElement("input");
    replyInput.type="text";replyInput.maxLength=200;
    replyInput.placeholder="Escribe una respuesta (solo demo)";
    replyInput.setAttribute("aria-label","Respuesta de GOXION");
    replyInput.value=review.reply||"";
    const save=element("button","","Guardar");
    save.type="button";
    replyWrap.append(replyInput,save);
    replyTrigger.addEventListener("click",()=>{
      replyWrap.hidden=!replyWrap.hidden;
      if(!replyWrap.hidden)replyInput.focus();
    });
    save.addEventListener("click",()=>{
      try{store.update(review.id,"reply",replyInput.value);render()}
      catch(error){window.alert(error.message)}
    });
    card.append(head,stars,content,actions,replyWrap);
    if(review.reply)card.appendChild(element("div","gx-rb-admin-reply","GOXION responde: "+review.reply));
    return card;
  }
  function render(){
    const all=store.load();
    const pending=all.filter(r=>r.status==="pending").length;
    const publicCount=all.filter(r=>r.status==="published").length;
    $("gx-rb-stat-pending").textContent=pending;
    $("gx-rb-stat-public").textContent=publicCount;
    $("gx-rb-stat-total").textContent=all.length;
    tabs.forEach(btn=>btn.setAttribute("aria-pressed",String(btn.dataset.filter===filter)));
    const list=$("gx-rb-admin-list");
    list.replaceChildren();
    const rows=all.filter(r=>r.status===filter);
    if(!rows.length){
      list.appendChild(element("div","gx-rb-admin-empty","No hay opiniones en esta categoría."));
    }else rows.forEach(review=>list.appendChild(renderCard(review)));
  }
  const bar=document.createElement("div");
  bar.className="gx-rb-demo-bar";
  bar.innerHTML='<div><strong>✨ OPINIONES 2.0 · ADMIN</strong><span>Moderación simulada · datos locales</span></div><a href="./preview/opiniones/ayuda-opiniones.html?v=20261009a">Ver experiencia del cliente ↗</a>';
  const top=document.querySelector(".gx-admin-shell")||document.body.firstElementChild;
  if(top)top.before(bar);else document.body.prepend(bar);
  store.subscribe(render);
  render();
})();
