(() => {
  if (window.GOXION_CLIENT_NOTIFICATIONS) return;

  const GXCORE=window.GOXION_CORE;
  const URL=GXCORE?.endpoint?.("notificaciones-cliente");
  const TOKEN_KEY=GXCORE?.STORAGE?.CLIENT_TOKEN;
  const state={items:[],unread:0,loading:false};

  const esc=(v)=>String(v??"")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&#039;");

  const relative=(iso)=>{
    const t=new Date(iso||0).getTime();
    if(!Number.isFinite(t)||t<=0)return "";
    const s=Math.max(0,Math.floor((Date.now()-t)/1000));
    if(s<60)return "ahora";
    if(s<3600)return "hace "+Math.floor(s/60)+" min";
    if(s<86400)return "hace "+Math.floor(s/3600)+" h";
    if(s<604800)return "hace "+Math.floor(s/86400)+" d";
    return new Date(t).toLocaleDateString("es-MX",{day:"numeric",month:"short"});
  };

  const kind=(item)=>{
    const t=String(item?.tipo||"").toLowerCase();
    if(t.includes("pago"))return "Pago";
    if(t.includes("beneficio"))return "Beneficio";
    if(t.includes("cancel"))return "Solicitud";
    if(item?.source==="servicio")return "Servicio";
    return "GOXION";
  };

  const token=()=>localStorage.getItem(TOKEN_KEY)||"";

  async function api(accion,datos={}){
    const current=token();
    if(!current||!URL)return null;
    const r=await fetch(URL,{
      method:"POST",
      headers:{"Content-Type":"application/json","X-Client-Token":current},
      body:JSON.stringify({accion,datos}),
      cache:"no-store"
    });
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j?.ok!==true){
      const e=new Error(j?.error||("HTTP "+r.status));
      e.status=r.status;
      throw e;
    }
    return j;
  }

  function ensureUi(){
    const greeting=document.getElementById("dash-greeting-container");
    if(!greeting)return false;

    if(!document.getElementById("gx-client-notif-launch")){
      const btn=document.createElement("button");
      btn.type="button";
      btn.id="gx-client-notif-launch";
      btn.className="gx-client-notif-launch";
      btn.setAttribute("aria-label","Abrir notificaciones");
      btn.innerHTML=
        '<span class="gx-client-notif-launch-main">'+
          '<span class="gx-client-notif-icon" aria-hidden="true">'+
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>'+
          '</span>'+
          '<span class="gx-client-notif-copy"><strong>Notificaciones</strong><small id="gx-client-notif-summary">Todo al día</small></span>'+
        '</span>'+
        '<span id="gx-client-notif-badge" class="gx-client-notif-badge" hidden>0</span>';
      btn.onclick=()=>openSheet();
      greeting.insertAdjacentElement("afterend",btn);
    }

    if(!document.getElementById("gx-client-notif-overlay")){
      const overlay=document.createElement("div");
      overlay.id="gx-client-notif-overlay";
      overlay.className="gx-client-notif-overlay";
      overlay.onclick=()=>closeSheet();
      document.body.appendChild(overlay);

      const sheet=document.createElement("section");
      sheet.id="gx-client-notif-sheet";
      sheet.className="gx-client-notif-sheet";
      sheet.setAttribute("aria-hidden","true");
      sheet.innerHTML=
        '<div class="gx-client-notif-handle"></div>'+
        '<div class="gx-client-notif-head">'+
          '<div><strong>Notificaciones</strong><small id="gx-client-notif-head-summary">Actividad de tu cuenta</small></div>'+
          '<div class="gx-client-notif-head-actions">'+
            '<button type="button" id="gx-client-notif-mark-all">Marcar leídas</button>'+
            '<button type="button" class="gx-client-notif-close" aria-label="Cerrar">×</button>'+
          '</div>'+
        '</div>'+
        '<div id="gx-client-notif-list" class="gx-client-notif-list"></div>';
      document.body.appendChild(sheet);
      sheet.querySelector(".gx-client-notif-close").onclick=()=>closeSheet();
      sheet.querySelector("#gx-client-notif-mark-all").onclick=()=>markAll();
    }
    return true;
  }

  function render(pulse=false){
    if(!ensureUi())return;
    const badge=document.getElementById("gx-client-notif-badge");
    const summary=document.getElementById("gx-client-notif-summary");
    const headSummary=document.getElementById("gx-client-notif-head-summary");
    const launch=document.getElementById("gx-client-notif-launch");
    const list=document.getElementById("gx-client-notif-list");

    if(badge){
      badge.hidden=state.unread<=0;
      badge.textContent=state.unread>99?"99+":String(state.unread);
    }
    if(summary)summary.textContent=state.unread?(state.unread+" nueva"+(state.unread===1?"":"s")):"Todo al día";
    if(headSummary)headSummary.textContent=state.unread?(state.unread+" sin leer"):"Actividad reciente";
    if(launch){
      launch.classList.toggle("gx-has-new",state.unread>0);
      if(pulse&&state.unread>0){
        launch.classList.remove("gx-has-new");
        void launch.offsetWidth;
        launch.classList.add("gx-has-new");
      }
    }
    if(!list)return;

    list.innerHTML=state.items.length?state.items.map(item=>
      '<article class="gx-client-notif-item '+(item.leida===true?"":"unread")+'" data-gx-notif-id="'+esc(item.id)+'" data-gx-notif-source="'+esc(item.source||"general")+'">'+
        '<div class="gx-client-notif-item-top">'+
          '<strong>'+esc(item.titulo||"GOXION")+'</strong>'+
          '<span class="gx-client-notif-time">'+esc(relative(item.created_at))+'</span>'+
        '</div>'+
        '<p>'+esc(item.mensaje||"")+'</p>'+
        '<span class="gx-client-notif-kind">'+esc(kind(item))+'</span>'+
      '</article>'
    ).join(""):'<div class="gx-client-notif-empty">No tienes notificaciones recientes.</div>';

    list.querySelectorAll(".gx-client-notif-item.unread").forEach(node=>{
      node.addEventListener("click",()=>markOne(node.dataset.gxNotifId,node.dataset.gxNotifSource));
    });
  }

  async function load(options={}){
    const pulse=options.pulse===true;
    if(state.loading||!token())return;
    state.loading=true;
    try{
      const r=await api("listar");
      if(!r)return;
      const previousUnread=state.unread;
      state.items=Array.isArray(r.items)?r.items:[];
      state.unread=Number(r.no_leidas||0);
      render(pulse||state.unread>previousUnread);
    }catch(error){
      console.warn("GOXION Notificaciones:",error);
    }finally{
      state.loading=false;
    }
  }

  async function markOne(id,source){
    const item=state.items.find(x=>String(x.id)===String(id)&&String(x.source||"general")===String(source||"general"));
    if(!item||item.leida===true)return;
    item.leida=true;
    state.unread=Math.max(0,state.unread-1);
    render();
    try{await api("marcar_leida",{id,source});}
    catch(error){item.leida=false;state.unread++;render();console.warn("No se pudo marcar notificación:",error);}
  }

  async function markAll(){
    if(state.unread<=0)return;
    const backup=state.items.map(x=>({...x}));
    const backupUnread=state.unread;
    state.items.forEach(x=>{x.leida=true});
    state.unread=0;
    render();
    try{await api("marcar_todas");}
    catch(error){state.items=backup;state.unread=backupUnread;render();console.warn("No se pudieron marcar notificaciones:",error);}
  }

  function openSheet(){
    ensureUi();
    document.getElementById("gx-client-notif-overlay")?.classList.add("show");
    const sheet=document.getElementById("gx-client-notif-sheet");
    sheet?.classList.add("show");
    sheet?.setAttribute("aria-hidden","false");
    document.body.style.overflow="hidden";
    load();
  }

  function closeSheet(){
    document.getElementById("gx-client-notif-overlay")?.classList.remove("show");
    const sheet=document.getElementById("gx-client-notif-sheet");
    sheet?.classList.remove("show");
    sheet?.setAttribute("aria-hidden","true");
    document.body.style.overflow="";
  }

  const baseRender=window.renderDashboard;
  if(typeof baseRender==="function"){
    window.renderDashboard=function(...args){
      const r=baseRender.apply(this,args);
      setTimeout(()=>{ensureUi();load();},0);
      return r;
    };
  }

  window.addEventListener("goxion:realtime",(event)=>{
    if(event.detail?.scope!=="client_notifications")return;
    load({pulse:true});
  });
  window.addEventListener("goxion:client-space:updated",()=>{ensureUi();});

  document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{ensureUi();if(token())load();},450));

  window.GOXION_CLIENT_NOTIFICATIONS=Object.freeze({
    open:openSheet,close:closeSheet,refresh:load,getUnread:()=>state.unread
  });
})();