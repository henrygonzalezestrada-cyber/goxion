/* GOXION Opiniones oficiales · Moderación autenticada */
(() => {
  "use strict";
  const store=window.GOXION_REVIEWS;
  if(!store||window.__gxOpinionAdmin)return;
  window.__gxOpinionAdmin=true;
  let filter="pending";
  const host=document.createElement("div");
  host.className="gx-rb-admin-overlay";
  host.id="gx-rb-admin-host";
  host.hidden=true;
  host.setAttribute("role","dialog");
  host.setAttribute("aria-modal","true");
  host.setAttribute("aria-label","Moderación de opiniones GOXION");
  document.body.appendChild(host);
  const root=document.createElement("section");
  root.className="gx-rb-admin";
  root.id="gx-rb-admin";
  root.innerHTML=
    '<div class="gx-rb-admin-head"><div><span class="gx-rb-kicker">RELACIÓN CON CLIENTES</span><h2>Opiniones</h2><p>Escucha, responde y decide qué mostrar en la portada.</p></div><button type="button" class="gx-rb-admin-close" id="gx-rb-admin-close" aria-label="Cerrar opiniones">×</button></div>'+
    '<div class="gx-rb-stats"><div class="gx-rb-stat is-new"><strong id="gx-rb-stat-pending">0</strong><span>Por revisar</span></div><div class="gx-rb-stat"><strong id="gx-rb-stat-public">0</strong><span>Publicadas</span></div><div class="gx-rb-stat"><strong id="gx-rb-stat-total">0</strong><span>Total</span></div></div>'+
    '<div class="gx-rb-tabs" aria-label="Filtrar opiniones">'+
      '<button type="button" data-filter="pending" aria-pressed="true">Pendientes</button>'+
      '<button type="button" data-filter="published" aria-pressed="false">Publicadas</button>'+
      '<button type="button" data-filter="private" aria-pressed="false">Privadas</button>'+
      '<button type="button" data-filter="hidden" aria-pressed="false">Ocultas</button>'+
    '</div>'+
    '<div class="gx-rb-admin-list" id="gx-rb-admin-list" aria-live="polite"></div>'+
    '<div class="gx-rb-admin-message" id="gx-rb-admin-message" aria-live="polite">Solo opiniones verificadas, protegidas y revisadas por GOXION.</div>';
  host.appendChild(root);
  const $=id=>document.getElementById(id);
  const tabs=[...root.querySelectorAll("[data-filter]")];
  tabs.forEach(btn=>btn.addEventListener("click",()=>{filter=btn.dataset.filter;render()}));
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
    btn.addEventListener("click",async()=>{
      btn.disabled=true;
      try{await store.update(review.id,action);render()}
      catch(error){window.alert(error.message);btn.disabled=false}
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
    replyInput.placeholder="Escribe una respuesta de GOXION";
    replyInput.setAttribute("aria-label","Respuesta de GOXION");
    replyInput.value=review.reply||"";
    const save=element("button","","Guardar");
    save.type="button";
    replyWrap.append(replyInput,save);
    replyTrigger.addEventListener("click",()=>{
      replyWrap.hidden=!replyWrap.hidden;
      if(!replyWrap.hidden)replyInput.focus();
    });
    save.addEventListener("click",async()=>{
      save.disabled=true;
      try{await store.update(review.id,"reply",replyInput.value);render()}
      catch(error){window.alert(error.message);save.disabled=false}
    });
    card.append(head,stars,content,actions,replyWrap);
    if(review.reply)card.appendChild(element("div","gx-rb-admin-reply","GOXION responde: "+review.reply));
    return card;
  }
  function render(){
    const all=store.loadAdmin();
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
  function closePanel(){
    host.hidden=true;
    document.body.classList.remove("gx-rb-admin-locked");
  }
  $("gx-rb-admin-close").addEventListener("click",closePanel);
  host.addEventListener("click",event=>{
    if(event.target===host)closePanel();
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!host.hidden)closePanel();
  });
  window.gxOpenOpinionsAdmin=async function(){
    host.hidden=false;
    document.body.classList.add("gx-rb-admin-locked");
    filter="pending";
    const message=$("gx-rb-admin-message");
    message.textContent="Cargando opiniones reales…";
    message.classList.remove("is-error");
    render();
    $("gx-rb-admin-close").focus({preventScroll:true});
    try{
      await store.refreshAdmin();
      message.textContent="Solo comentarios reales. La publicación exige consentimiento explícito.";
    }catch(error){
      message.textContent=error.message||"No se pudieron cargar las opiniones.";
      message.classList.add("is-error");
    }
  };
  store.subscribe(()=>{if(!host.hidden)render()});
  setInterval(()=>{
    if(!host.hidden&&!document.hidden)store.refreshAdmin().catch(()=>{});
  },45000);
})();
