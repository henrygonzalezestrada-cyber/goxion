(() => {
  if (window.GOXION_CLIENT_NOTIFICATIONS) return;

  const GXCORE=window.GOXION_CORE;
  const URL=GXCORE?.endpoint?.("notificaciones-cliente");
  const TOKEN_KEY=GXCORE?.STORAGE?.CLIENT_TOKEN;
  const state={items:[],unread:0,loading:false,initialized:false};

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
    if(t.includes("referido"))return "Referidos";
    if(t.includes("mision")||t.includes("cupon"))return "Rewards";
    if(t.includes("pedido"))return "Solicitud";
    if(t.includes("cancel"))return "Cancelación";
    if(item?.source==="servicio"||t.includes("acceso")||t.includes("perfil")||t.includes("correo")||t.includes("pin"))return "Servicio";
    return "GOXION";
  };

  const tone=(item)=>{
    const action=String(item?.accion||"");
    const t=String(item?.tipo||"").toLowerCase();
    if(action==="account")return "account";
    if(action==="referral"||action==="coupon")return "reward";
    if(action==="service"||action==="services")return t.includes("cancel")?"warning":"service";
    return "neutral";
  };

  const notifIcon=(item)=>{
    const action=String(item?.accion||"");
    const t=String(item?.tipo||"").toLowerCase();
    if(action==="account")return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5h16v11H4z"></path><path d="M4 10h16"></path><path d="M7 14h4"></path></svg>';
    if(action==="referral")return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 18c.6-3 2.4-4.5 5.5-4.5s4.9 1.5 5.5 4.5"></path><path d="M17 7v6M14 10h6"></path></svg>';
    if(action==="coupon")return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z"></path><path d="M9 8.5v7"></path></svg>';
    if(action==="service"||action==="services")return t.includes("cancel")
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3.5 7.5 12 12l8.5-4.5z"></path><path d="M3.5 12 12 16.5 20.5 12"></path><path d="M3.5 16.5 12 21l8.5-4.5"></path></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="3"></rect><path d="M8 9h8M8 13h5"></path></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
  };

  const token=()=>localStorage.getItem(TOKEN_KEY)||"";
  const unreadIds=(items)=>new Set((items||[]).filter(x=>x?.leida!==true).map(x=>String(x.id||"")).filter(Boolean));

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

  function setSessionHeader(){
    const auth=document.getElementById("header-action-btn");
    const text=document.getElementById("header-btn-text");
    const bell=document.getElementById("gx-client-notif-launch");
    const active=Boolean(token() && typeof getCurrentClientKey==="function" && getCurrentClientKey());

    if(auth){
      auth.classList.toggle("gx-client-session-active",active);
      auth.classList.toggle("gx-client-session-guest",!active);
    }
    if(text)text.textContent=active?"Salir":"Iniciar sesión";
    if(bell){
      bell.classList.toggle("gx-session-guest",!active);
      bell.disabled=!active;
      bell.tabIndex=active?0:-1;
      bell.setAttribute("aria-hidden",active?"false":"true");
    }
    return active;
  }

  function ringBell(){
    const launch=document.getElementById("gx-client-notif-launch");
    if(!launch||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)return;
    launch.classList.remove("gx-ringing");
    void launch.offsetWidth;
    launch.classList.add("gx-ringing");
    clearTimeout(launch._gxRingTimer);
    launch._gxRingTimer=setTimeout(()=>launch.classList.remove("gx-ringing"),900);
  }

  function ensureUi(){
    const header=document.querySelector(".app-header");
    const auth=document.getElementById("header-action-btn");
    if(!header||!auth)return false;

    let actions=header.querySelector(".gx-header-actions");
    if(!actions){
      actions=document.createElement("div");
      actions.className="gx-header-actions";
      header.insertBefore(actions,auth);
      actions.appendChild(auth);
    }

    let btn=document.getElementById("gx-client-notif-launch");
    if(!btn){
      btn=document.createElement("button");
      btn.type="button";
      btn.id="gx-client-notif-launch";
      btn.className="gx-client-notif-launch";
      btn.setAttribute("aria-label","Abrir notificaciones");
      btn.innerHTML=
        '<span class="gx-client-notif-icon" aria-hidden="true">'+
          '<svg class="gx-client-notif-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+
            '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>'+
            '<path class="gx-client-notif-clapper" d="M10 21h4"></path>'+
          '</svg>'+
        '</span>'+
        '<span id="gx-client-notif-badge" class="gx-client-notif-badge">0</span>';
      btn.onclick=()=>openSheet();
    }
    if(btn.parentElement!==actions)actions.insertBefore(btn,auth);

    setSessionHeader();

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
          '<div class="gx-client-notif-head-copy"><strong>Notificaciones</strong><small id="gx-client-notif-head-summary">Actividad de tu cuenta</small></div>'+
          '<div class="gx-client-notif-head-actions">'+
            '<button type="button" id="gx-client-notif-mark-all" class="gx-client-notif-soft-action" aria-label="Marcar todas como leídas" title="Marcar leídas"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg><span>Marcar leídas</span></button>'+
            '<button type="button" id="gx-client-notif-clear-all" class="gx-client-notif-clear-all" aria-label="Eliminar todas las notificaciones" title="Eliminar todo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"></path></svg><span>Eliminar todo</span></button>'+
            '<button type="button" class="gx-client-notif-close" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"></path></svg></button>'+
          '</div>'+
        '</div>'+
        '<div id="gx-client-notif-list" class="gx-client-notif-list"></div>';
      document.body.appendChild(sheet);
      sheet.querySelector(".gx-client-notif-close").onclick=()=>closeSheet();
      sheet.querySelector("#gx-client-notif-mark-all").onclick=()=>markAll();
      sheet.querySelector("#gx-client-notif-clear-all").onclick=()=>armClearAll();
    }

    setSessionHeader();
    return true;
  }

  function render(options={}){
    const ring=options.ring===true;
    if(!ensureUi())return;
    const badge=document.getElementById("gx-client-notif-badge");
    const headSummary=document.getElementById("gx-client-notif-head-summary");
    const launch=document.getElementById("gx-client-notif-launch");
    const list=document.getElementById("gx-client-notif-list");
    const markAllBtn=document.getElementById("gx-client-notif-mark-all");
    const clearAllBtn=document.getElementById("gx-client-notif-clear-all");

    if(markAllBtn)markAllBtn.disabled=state.unread<=0;
    if(clearAllBtn){
      clearAllBtn.disabled=state.items.length<=0;
      if(state.items.length<=0)resetClearAll();
    }

    if(badge)badge.textContent=state.unread>99?"99+":String(state.unread);
    if(headSummary)headSummary.textContent=state.unread?(state.unread+" sin leer"):"Actividad reciente";
    if(launch){
      launch.classList.toggle("gx-has-new",state.unread>0);
      launch.setAttribute("aria-label",state.unread>0
        ? "Abrir notificaciones, "+state.unread+" sin leer"
        : "Abrir notificaciones");
      if(ring)ringBell();
    }
    if(!list)return;

    list.innerHTML=state.items.length?state.items.map(item=>{
      const action=String(item.accion||"");
      const actionHtml=action
        ? '<button type="button" class="gx-client-notif-item-action" data-gx-notif-action="'+esc(action)+'" data-gx-notif-ref="'+esc(item.accion_ref||"")+'" data-gx-notif-id="'+esc(item.id)+'" data-gx-notif-source="'+esc(item.source||"general")+'"><span>'+esc(item.accion_label||"Abrir")+'</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l7 7-7 7"></path></svg></button>'
        : '';
      return '<div class="gx-client-notif-swipe" data-gx-notif-id="'+esc(item.id)+'" data-gx-notif-source="'+esc(item.source||"general")+'">'+
        '<button type="button" class="gx-client-notif-delete-one" aria-label="Eliminar notificación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"></path></svg><span>Eliminar</span></button>'+
        '<article class="gx-client-notif-item '+(item.leida===true?"":"unread")+'" data-gx-notif-id="'+esc(item.id)+'" data-gx-notif-source="'+esc(item.source||"general")+'">'+
          '<div class="gx-client-notif-item-top">'+
            '<strong>'+esc(item.titulo||"GOXION")+'</strong>'+
            '<span class="gx-client-notif-time">'+esc(relative(item.created_at))+'</span>'+
          '</div>'+
          '<p>'+esc(item.mensaje||"")+'</p>'+
          '<div class="gx-client-notif-item-foot"><span class="gx-client-notif-kind">'+esc(kind(item))+'</span>'+actionHtml+'</div>'+
        '</article>'+
      '</div>';
    }).join(""):'<div class="gx-client-notif-empty"><strong>Todo al día</strong><small>No tienes notificaciones recientes.</small></div>';

    list.querySelectorAll(".gx-client-notif-item.unread").forEach(node=>{
      node.addEventListener("click",event=>{
        if(event.target.closest(".gx-client-notif-item-action"))return;
        const shell=node.closest(".gx-client-notif-swipe");
        if(shell?.classList.contains("gx-open")){
          closeSwipe(shell);
          return;
        }
        markOne(node.dataset.gxNotifId,node.dataset.gxNotifSource);
      });
    });
    list.querySelectorAll(".gx-client-notif-item-action").forEach(button=>{
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        goAction(button);
      });
    });
    list.querySelectorAll(".gx-client-notif-delete-one").forEach(button=>{
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        const shell=button.closest(".gx-client-notif-swipe");
        deleteOne(shell?.dataset?.gxNotifId,shell?.dataset?.gxNotifSource,button);
      });
    });
    bindSwipeRows(list);
  }

  function closeSwipe(shell){
    if(!shell)return;
    shell.classList.remove("gx-open");
    const card=shell.querySelector(".gx-client-notif-item");
    if(card){
      card.style.transform="";
      card.style.transition="";
    }
  }

  function closeOtherSwipes(except){
    document.querySelectorAll(".gx-client-notif-swipe.gx-open").forEach(shell=>{
      if(shell!==except)closeSwipe(shell);
    });
  }

  function bindSwipeRows(list){
    list.querySelectorAll(".gx-client-notif-swipe").forEach(shell=>{
      if(shell.dataset.gxSwipeBound==="1")return;
      shell.dataset.gxSwipeBound="1";
      const card=shell.querySelector(".gx-client-notif-item");
      if(!card)return;

      let startX=0,startY=0,current=0,dragging=false,horizontal=false;

      card.addEventListener("touchstart",event=>{
        const touch=event.touches?.[0];
        if(!touch)return;
        closeOtherSwipes(shell);
        startX=touch.clientX;
        startY=touch.clientY;
        current=shell.classList.contains("gx-open")?-82:0;
        dragging=true;
        horizontal=false;
        card.style.transition="none";
      },{passive:true});

      card.addEventListener("touchmove",event=>{
        if(!dragging)return;
        const touch=event.touches?.[0];
        if(!touch)return;
        const dx=touch.clientX-startX;
        const dy=touch.clientY-startY;
        if(!horizontal && Math.abs(dx)>8){
          if(Math.abs(dx)<=Math.abs(dy))return;
          horizontal=true;
        }
        if(!horizontal)return;
        event.preventDefault();
        current=Math.max(-82,Math.min(0,(shell.classList.contains("gx-open")?-82:0)+dx));
        card.style.transform="translateX("+current+"px)";
        shell.style.setProperty("--gx-swipe-progress",String(Math.min(1,Math.abs(current)/82)));
      },{passive:false});

      const finish=()=>{
        if(!dragging)return;
        dragging=false;
        card.style.transition="";
        card.style.transform="";
        const open=current<=-42;
        shell.classList.toggle("gx-open",open);
        shell.style.removeProperty("--gx-swipe-progress");
        horizontal=false;
      };
      card.addEventListener("touchend",finish,{passive:true});
      card.addEventListener("touchcancel",finish,{passive:true});
    });
  }

  async function load(options={}){
    const realtime=options.realtime===true;
    if(state.loading||!token())return;
    state.loading=true;
    try{
      const before=unreadIds(state.items);
      const r=await api("listar");
      if(!r)return;
      state.items=Array.isArray(r.items)?r.items:[];
      state.unread=Number(r.no_leidas||0);

      const after=unreadIds(state.items);
      const hasNew=state.initialized && [...after].some(id=>!before.has(id));
      render({ring:realtime&&hasNew});
      state.initialized=true;
    }catch(error){
      console.warn("GOXION Notificaciones:",error);
    }finally{
      state.loading=false;
    }
  }

  function showDashboard(){
    if(typeof window.switchTab==="function")window.switchTab("inicio");
  }

  async function goAction(button){
    const id=button?.dataset?.gxNotifId||"";
    const source=button?.dataset?.gxNotifSource||"general";
    const action=button?.dataset?.gxNotifAction||"";
    const ref=button?.dataset?.gxNotifRef||"";

    if(id)await markOne(id,source);
    closeSheet();

    if(action==="account"){
      if(typeof window.irAlTicket==="function")window.irAlTicket();
      return;
    }

    showDashboard();
    setTimeout(()=>{
      if(action==="referral"&&typeof window.openGamif==="function"){
        window.openGamif("referral");
        document.getElementById("referral-section-container")?.scrollIntoView({behavior:"smooth",block:"start"});
        return;
      }
      if(action==="coupon"&&typeof window.openGamif==="function"){
        window.openGamif("coupon");
        document.getElementById("referral-section-container")?.scrollIntoView({behavior:"smooth",block:"start"});
        return;
      }

      const stack=document.getElementById("dash-services");
      if(action==="service"&&ref){
        const key=typeof getCurrentClientKey==="function"?getCurrentClientKey():"";
        const services=globalClientesData?.[key]?.servicios||[];
        const index=services.findIndex(service=>String(service?.id||"")===String(ref));
        const card=index>=0?document.getElementById("gx-service-card-"+index):null;
        if(card){
          card.scrollIntoView({behavior:"smooth",block:"center"});
          if(!card.classList.contains("expanded")&&typeof window.gxToggleServiceCard==="function"){
            setTimeout(()=>window.gxToggleServiceCard(index),260);
          }
          return;
        }
      }
      stack?.scrollIntoView({behavior:"smooth",block:"start"});
    },180);
  }

  async function deleteOne(id,source,button){
    if(!id)return;
    const index=state.items.findIndex(x=>String(x.id)===String(id)&&String(x.source||"general")===String(source||"general"));
    if(index<0)return;

    const backup=state.items[index];
    const backupUnread=state.unread;
    const shell=button?.closest?.(".gx-client-notif-swipe");
    shell?.classList.add("gx-removing");
    await new Promise(resolve=>setTimeout(resolve,180));

    state.items.splice(index,1);
    if(backup.leida!==true)state.unread=Math.max(0,state.unread-1);
    render();

    try{
      await api("eliminar_una",{id,source});
    }catch(error){
      state.items.splice(index,0,backup);
      state.unread=backupUnread;
      render();
      console.warn("No se pudo eliminar la notificación:",error);
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

  function resetClearAll(){
    const btn=document.getElementById("gx-client-notif-clear-all");
    if(!btn)return;
    clearTimeout(btn._gxConfirmTimer);
    btn._gxArmed=false;
    btn.classList.remove("gx-confirm");
    const label=btn.querySelector("span");
    if(label)label.textContent="Eliminar todo";
  }

  function armClearAll(){
    const btn=document.getElementById("gx-client-notif-clear-all");
    if(!btn||state.items.length<=0)return;

    if(btn._gxArmed){
      clearAll();
      return;
    }

    btn._gxArmed=true;
    btn.classList.add("gx-confirm");
    const label=btn.querySelector("span");
    if(label)label.textContent="Confirmar";
    clearTimeout(btn._gxConfirmTimer);
    btn._gxConfirmTimer=setTimeout(()=>resetClearAll(),2800);
  }

  async function clearAll(){
    const btn=document.getElementById("gx-client-notif-clear-all");
    if(!btn||state.items.length<=0)return;

    const backup=state.items.map(x=>({...x}));
    const backupUnread=state.unread;
    btn.disabled=true;
    const label=btn.querySelector("span");
    if(label)label.textContent="Eliminando…";

    state.items=[];
    state.unread=0;
    render();

    try{
      await api("eliminar_todas");
      resetClearAll();
    }catch(error){
      state.items=backup;
      state.unread=backupUnread;
      render();
      resetClearAll();
      console.warn("No se pudieron eliminar las notificaciones:",error);
    }
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
    load({realtime:true});
  });
  window.addEventListener("goxion:client-space:updated",()=>{
    ensureUi();
    setSessionHeader();
  });

  const baseLogout=window.cerrarSesion;
  if(typeof baseLogout==="function"&&!baseLogout.__gxNotifWrapped){
    const wrappedLogout=function(...args){
      const result=baseLogout.apply(this,args);
      state.items=[];
      state.unread=0;
      state.initialized=false;
      setTimeout(()=>{
        ensureUi();
        setSessionHeader();
        render();
      },0);
      return result;
    };
    wrappedLogout.__gxNotifWrapped=true;
    window.cerrarSesion=wrappedLogout;
    try{cerrarSesion=wrappedLogout;}catch(_){}
  }

  document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{
    ensureUi();
    const active=setSessionHeader();
    if(active)load();
  },450));

  window.GOXION_CLIENT_NOTIFICATIONS=Object.freeze({
    open:openSheet,close:closeSheet,refresh:load,getUnread:()=>state.unread
  });
})();