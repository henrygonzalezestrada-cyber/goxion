(() => {
  if (window.GOXION_CLIENT_NOTIFICATIONS) return;

  const GXCORE=window.GOXION_CORE;
  const URL=GXCORE?.endpoint?.("notificaciones-cliente");
  const TOKEN_KEY=GXCORE?.STORAGE?.CLIENT_TOKEN;
  const state={items:[],unread:0,loading:false,initialized:false,pendingDelete:null,viewportBound:false,
    confirmAction:null,confirmTimer:null,feedbackTimer:null,actionBusy:false,scrollLockY:null,scrollGuardBound:false,
    sessionKey:"",sessionEpoch:0,reloadQueued:false,reloadRing:false};

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

  // The request always keeps its originating token; never borrow a later account's token.
  async function api(accion,datos={},current=token()){
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

  function syncNotificationViewport(){
    const vv=window.visualViewport;
    const viewportHeight=Math.max(320,Math.round(vv?.height||window.innerHeight||640));
    const layoutHeight=Math.max(viewportHeight,Math.round(window.innerHeight||viewportHeight));
    const offsetTop=Math.max(0,Math.round(vv?.offsetTop||0));
    const bottomGap=Math.max(0,layoutHeight-viewportHeight-offsetTop);
    const panelMax=Math.max(300,Math.min(760,Math.round(viewportHeight*.78)));

    document.documentElement.style.setProperty("--gx-notif-vv-bottom",bottomGap+"px");
    document.documentElement.style.setProperty("--gx-notif-panel-max",panelMax+"px");
  }

  function bindNotificationViewport(){
    if(state.viewportBound)return;
    state.viewportBound=true;
    syncNotificationViewport();
    window.addEventListener("resize",syncNotificationViewport,{passive:true});
    window.visualViewport?.addEventListener("resize",syncNotificationViewport,{passive:true});
    window.visualViewport?.addEventListener("scroll",syncNotificationViewport,{passive:true});
  }

  /* iOS Safari: stop scroll chaining to the dashboard without changing body overflow or position. */
  function bindSheetScrollGuard(){
    if(state.scrollGuardBound)return;
    state.scrollGuardBound=true;
    let startX=0,startY=0;
    const open=()=>document.documentElement.classList.contains("gx-notif-open");
    document.addEventListener("touchstart",event=>{
      if(!open())return;
      const finger=event.touches?.[0];
      if(finger){startX=finger.clientX;startY=finger.clientY;}
    },{capture:true,passive:true});
    document.addEventListener("touchmove",event=>{
      if(!open()||!event.cancelable)return;
      const list=event.target.closest?.("#gx-client-notif-list");
      if(!list){event.preventDefault();return;}
      const finger=event.touches?.[0];
      if(!finger){event.preventDefault();return;}
      const dx=finger.clientX-startX,dy=finger.clientY-startY;
      // Let the existing notification-swipe handler own horizontal gestures.
      if(Math.abs(dx)>Math.abs(dy)+3)return;
      if(list.scrollHeight<=list.clientHeight+1||
         (dy>0&&list.scrollTop<=0)||
         (dy<0&&list.scrollTop+list.clientHeight>=list.scrollHeight-1)){
        event.preventDefault();
      }
    },{capture:true,passive:false});
    document.addEventListener("wheel",event=>{
      if(!open()||!event.cancelable)return;
      const list=event.target.closest?.("#gx-client-notif-list");
      if(!list||list.scrollHeight<=list.clientHeight+1||
         (event.deltaY<0&&list.scrollTop<=0)||
         (event.deltaY>0&&list.scrollTop+list.clientHeight>=list.scrollHeight-1)){
        event.preventDefault();
      }
    },{capture:true,passive:false});
    window.addEventListener("scroll",()=>{
      if(!open()||state.scrollLockY===null)return;
      if(Math.abs(window.scrollY-state.scrollLockY)>1||Math.abs(window.scrollX)>1){
        window.scrollTo(0,state.scrollLockY);
      }
    },{passive:true});
  }

  const sessionSignature=()=>{
    let clientKey="";
    try{clientKey=typeof getCurrentClientKey==="function"?String(getCurrentClientKey()||""):"";}catch(_){}
    return token()+"|"+clientKey;
  };

  function syncNotificationSession(){
    const signature=sessionSignature();
    if(signature===state.sessionKey)return;
    state.sessionKey=signature;
    state.sessionEpoch++;
    state.loading=false;
    state.reloadQueued=false;
    state.reloadRing=false;
    state.initialized=false;
    state.items=[];
    state.unread=0;
    state.actionBusy=false;
    // Never leave the previous customer's notices visible while the new request loads.
    document.getElementById("gx-client-notif-list")?.replaceChildren();
    const badge=document.getElementById("gx-client-notif-badge");
    if(badge)badge.textContent="0";
    document.getElementById("gx-client-notif-launch")?.classList.remove("gx-has-new");
    const read=document.getElementById("gx-client-notif-mark-all");
    const clear=document.getElementById("gx-client-notif-clear-all");
    if(read)read.disabled=true;
    if(clear)clear.disabled=true;
    clearTimeout(state.confirmTimer);
    clearTimeout(state.feedbackTimer);
    if(state.pendingDelete)clearTimeout(state.pendingDelete.timer);
    state.pendingDelete=null;
    resetActionConfirmation();
    hideUndo();
    document.getElementById("gx-client-notif-feedback")?.classList.remove("show");
    if(!token()||!signature.split("|")[1])closeSheet();
  }

  function setSessionHeader(){
    syncNotificationSession();
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
          '<div class="gx-client-notif-toolbar" role="toolbar" aria-label="Acciones de notificaciones">'+
            '<button type="button" id="gx-client-notif-mark-all" class="gx-client-notif-soft-action" aria-label="Marcar todo como leído" title="Marcar todo como leído"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 12 4 4L18 6"></path><path d="m10 16 2 2 8-8"></path></svg></button>'+
            '<button type="button" id="gx-client-notif-clear-all" class="gx-client-notif-clear-all" aria-label="Eliminar todo" title="Eliminar todo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"></path></svg></button>'+
          '</div>'+
          '<strong class="gx-client-notif-head-title">Notificaciones</strong>'+
          '<button type="button" class="gx-client-notif-close" aria-label="Cerrar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6 18 18M18 6 6 18"></path></svg></button>'+
        '</div>'+
        '<div id="gx-client-notif-list" class="gx-client-notif-list"></div>'+
        '<div id="gx-client-notif-undo" class="gx-client-notif-undo" aria-live="polite" aria-hidden="true"><span>Notificación eliminada</span><button type="button">Deshacer</button></div>'+
        '<div id="gx-client-notif-feedback" class="gx-client-notif-feedback" role="status" aria-live="polite" aria-atomic="true">'+
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg><span></span></div>';
      document.body.appendChild(sheet);
      sheet.querySelector(".gx-client-notif-close").onclick=()=>closeSheet();
      sheet.querySelector("#gx-client-notif-mark-all").onclick=()=>armActionConfirmation("read");
      sheet.querySelector("#gx-client-notif-clear-all").onclick=()=>armActionConfirmation("clear");
      sheet.querySelector("#gx-client-notif-undo button").onclick=()=>undoPendingDelete();
    }

    setSessionHeader();
    return true;
  }

  function render(options={}){
    const ring=options.ring===true;
    if(!ensureUi())return;
    const badge=document.getElementById("gx-client-notif-badge");
    const launch=document.getElementById("gx-client-notif-launch");
    const list=document.getElementById("gx-client-notif-list");
    const markAllBtn=document.getElementById("gx-client-notif-mark-all");
    const clearAllBtn=document.getElementById("gx-client-notif-clear-all");

    if(markAllBtn)markAllBtn.disabled=state.unread<=0&&!state.actionBusy;
    if(clearAllBtn)clearAllBtn.disabled=state.items.length<=0&&!state.actionBusy;
    if(!state.actionBusy&&state.confirmAction&&
       ((state.confirmAction==="read"&&state.unread<=0)||
        (state.confirmAction==="clear"&&state.items.length<=0)))resetActionConfirmation();

    if(badge)badge.textContent=state.unread>99?"99+":String(state.unread);
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
        '<div class="gx-client-notif-delete-bg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 6 18 18M18 6 6 18"></path></svg><span>Eliminar</span></div>'+
        '<article class="gx-client-notif-item '+(item.leida===true?"":"unread")+'" data-gx-notif-id="'+esc(item.id)+'" data-gx-notif-source="'+esc(item.source||"general")+'">'+
          '<div class="gx-client-notif-item-top">'+
            '<strong>'+esc(item.titulo||"GOXION")+'</strong>'+
            '<span class="gx-client-notif-time">'+esc(relative(item.created_at))+'</span>'+
          '</div>'+
          '<p>'+esc(item.mensaje||"")+'</p>'+
          (actionHtml?'<div class="gx-client-notif-item-foot">'+actionHtml+'</div>':'')+
        '</article>'+
      '</div>';
    }).join(""):'<div class="gx-client-notif-empty"><strong>Todo al día</strong><small>No tienes notificaciones recientes.</small></div>';

    list.querySelectorAll(".gx-client-notif-item").forEach(node=>{
      node.addEventListener("click",event=>{
        if(event.target.closest(".gx-client-notif-item-action"))return;
        const shell=node.closest(".gx-client-notif-swipe");
        if(shell && Number(shell.dataset.gxSuppressClickUntil||0)>Date.now())return;
        if(node.classList.contains("unread"))markOne(node.dataset.gxNotifId,node.dataset.gxNotifSource);
      });
    });
    list.querySelectorAll(".gx-client-notif-item-action").forEach(button=>{
      button.addEventListener("click",event=>{
        event.preventDefault();
        event.stopPropagation();
        goAction(button);
      });
    });
    bindSwipeRows(list);
  }

  function bindSwipeRows(list){
    list.querySelectorAll(".gx-client-notif-swipe").forEach(shell=>{
      if(shell.dataset.gxSwipeBound==="1")return;
      shell.dataset.gxSwipeBound="1";
      const card=shell.querySelector(".gx-client-notif-item");
      if(!card)return;

      let startX=0,startY=0,current=0,dragging=false,horizontal=false;

      card.addEventListener("touchstart",event=>{
        if(event.target.closest(".gx-client-notif-item-action"))return;
        const touch=event.touches?.[0];
        if(!touch)return;
        startX=touch.clientX;
        startY=touch.clientY;
        current=0;
        dragging=true;
        horizontal=false;
        card.style.transition="none";
        shell.classList.remove("gx-delete-ready");
        shell.style.removeProperty("--gx-swipe-reveal");
      },{passive:true});

      card.addEventListener("touchmove",event=>{
        if(!dragging)return;
        const touch=event.touches?.[0];
        if(!touch)return;
        const dx=touch.clientX-startX;
        const dy=touch.clientY-startY;

        if(!horizontal && Math.abs(dx)>7){
          if(Math.abs(dx)<=Math.abs(dy))return;
          horizontal=true;
          shell.dataset.gxSuppressClickUntil=String(Date.now()+420);
        }
        if(!horizontal)return;

        event.preventDefault();
        const width=Math.max(1,card.getBoundingClientRect().width);
        const threshold=Math.min(width*.58,190);
        current=Math.max(-width,Math.min(0,dx));
        const progress=Math.min(1,Math.abs(current)/threshold);
        card.style.transform="translateX("+current+"px)";
        shell.style.setProperty("--gx-swipe-progress",String(progress));
        shell.style.setProperty("--gx-swipe-reveal",Math.abs(current)+"px");
        shell.classList.toggle("gx-delete-ready",Math.abs(current)>=threshold);
      },{passive:false});

      const finish=()=>{
        if(!dragging)return;
        dragging=false;
        card.style.transition="";
        if(!horizontal){
          card.style.transform="";
          return;
        }

        const width=Math.max(1,card.getBoundingClientRect().width);
        const threshold=Math.min(width*.58,190);
        const shouldDelete=Math.abs(current)>=threshold;

        shell.classList.remove("gx-delete-ready");

        if(shouldDelete){
          shell.style.setProperty("--gx-swipe-progress","1");
          shell.style.setProperty("--gx-swipe-reveal",width+"px");
          shell.dataset.gxSuppressClickUntil=String(Date.now()+700);
          card.style.transform="translateX("+(-width-24)+"px)";
          shell.classList.add("gx-commit-delete");
          setTimeout(()=>deleteBySwipe(shell),170);
        }else{
          shell.style.removeProperty("--gx-swipe-progress");
          shell.style.removeProperty("--gx-swipe-reveal");
          card.style.transform="";
        }
        horizontal=false;
      };

      card.addEventListener("touchend",finish,{passive:true});
      card.addEventListener("touchcancel",finish,{passive:true});
    });
  }

  function pendingDeleteKey(item){
    return String(item?.source||"general")+":"+String(item?.id||"");
  }

  function showUndo(){
    const bar=document.getElementById("gx-client-notif-undo");
    if(!bar)return;
    bar.classList.add("show");
    bar.setAttribute("aria-hidden","false");
  }

  function hideUndo(){
    const bar=document.getElementById("gx-client-notif-undo");
    if(!bar)return;
    bar.classList.remove("show");
    bar.setAttribute("aria-hidden","true");
  }

  async function finalizePendingDelete(){
    const pending=state.pendingDelete;
    if(!pending||pending.epoch!==state.sessionEpoch||pending.signature!==state.sessionKey)return;
    clearTimeout(pending.timer);
    state.pendingDelete=null;
    hideUndo();
    try{
      await api("eliminar_una",{id:pending.item.id,source:pending.item.source||"general"},pending.token);
    }catch(error){
      if(pending.epoch!==state.sessionEpoch||pending.signature!==state.sessionKey)return;
      state.items.splice(Math.min(pending.index,state.items.length),0,pending.item);
      if(pending.item.leida!==true)state.unread++;
      render();
      console.warn("No se pudo eliminar la notificación:",error);
    }
  }

  function undoPendingDelete(){
    const pending=state.pendingDelete;
    if(!pending)return;
    clearTimeout(pending.timer);
    state.pendingDelete=null;
    hideUndo();
    state.items.splice(Math.min(pending.index,state.items.length),0,pending.item);
    if(pending.item.leida!==true)state.unread++;
    render();
  }

  async function schedulePendingDelete(item,index){
    if(state.pendingDelete)await finalizePendingDelete();
    const pending={item,index,timer:null,epoch:state.sessionEpoch,signature:state.sessionKey,token:token()};
    state.pendingDelete=pending;
    showUndo();
    pending.timer=setTimeout(()=>finalizePendingDelete(),3200);
  }

  async function deleteBySwipe(shell){
    const id=shell?.dataset?.gxNotifId||"";
    const source=shell?.dataset?.gxNotifSource||"general";
    const index=state.items.findIndex(x=>String(x.id)===String(id)&&String(x.source||"general")===String(source));
    if(index<0)return;

    const item=state.items[index];
    state.items.splice(index,1);
    if(item.leida!==true)state.unread=Math.max(0,state.unread-1);
    render();
    await schedulePendingDelete(item,index);
  }

  async function load(options={}){
    const realtime=options.realtime===true;
    syncNotificationSession();
    const current=token();
    if(!current)return;
    if(state.loading){
      state.reloadQueued=true;
      state.reloadRing=state.reloadRing||realtime;
      return;
    }
    const epoch=state.sessionEpoch;
    const signature=state.sessionKey;
    state.loading=true;
    try{
      const before=unreadIds(state.items);
      const r=await api("listar",{},current);
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey||current!==token())return;
      if(!r)return;
      const incoming=Array.isArray(r.items)?r.items:[];
      const pendingKey=state.pendingDelete?pendingDeleteKey(state.pendingDelete.item):"";
      state.items=pendingKey?incoming.filter(item=>pendingDeleteKey(item)!==pendingKey):incoming;
      state.unread=state.items.filter(item=>item?.leida!==true).length;
      const after=unreadIds(state.items);
      const hasNew=state.initialized && [...after].some(id=>!before.has(id));
      render({ring:realtime&&hasNew});
      state.initialized=true;
    }catch(error){
      if(epoch===state.sessionEpoch&&signature===state.sessionKey)
        console.warn("GOXION Notificaciones:",error);
    }finally{
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey)return;
      state.loading=false;
      if(state.reloadQueued){
        const queuedRealtime=state.reloadRing;
        state.reloadQueued=false;
        state.reloadRing=false;
        setTimeout(()=>load({realtime:queuedRealtime}),0);
      }
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

  async function markOne(id,source){
    const epoch=state.sessionEpoch,signature=state.sessionKey,current=token();
    const item=state.items.find(x=>String(x.id)===String(id)&&String(x.source||"general")===String(source||"general"));
    if(!item||item.leida===true)return;
    item.leida=true;
    state.unread=Math.max(0,state.unread-1);
    render();
    try{await api("marcar_leida",{id,source},current);}
    catch(error){
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey)return;
      item.leida=false;state.unread++;render();console.warn("No se pudo marcar notificación:",error);
    }
  }

  function resetActionConfirmation(){
    if(state.actionBusy)return;
    clearTimeout(state.confirmTimer);
    state.confirmTimer=null;
    state.confirmAction=null;
    const toolbar=document.querySelector("#gx-client-notif-sheet .gx-client-notif-toolbar");
    toolbar?.classList.remove("gx-confirm-read","gx-confirm-clear","gx-confirm-loading");
    const read=document.getElementById("gx-client-notif-mark-all");
    const clear=document.getElementById("gx-client-notif-clear-all");
    for(const [button,label] of [[read,"Marcar todo como leído"],[clear,"Eliminar todo"]]){
      if(!button)continue;
      button.setAttribute("aria-label",label);
      button.setAttribute("title",label);
      button.setAttribute("aria-pressed","false");
      button.removeAttribute("aria-busy");
    }
  }

  function armActionConfirmation(action){
    if(state.actionBusy||!["read","clear"].includes(action))return;
    if(action==="read"&&state.unread<=0)return;
    if(action==="clear"&&state.items.length<=0)return;
    if(state.confirmAction===action){
      if(action==="read")markAll();
      else clearAll();
      return;
    }
    resetActionConfirmation();
    state.confirmAction=action;
    const toolbar=document.querySelector("#gx-client-notif-sheet .gx-client-notif-toolbar");
    const button=document.getElementById(action==="read"?"gx-client-notif-mark-all":"gx-client-notif-clear-all");
    toolbar?.classList.add(action==="read"?"gx-confirm-read":"gx-confirm-clear");
    button?.setAttribute("aria-label",action==="read"?"Confirmar marcar todo como leído":"Confirmar eliminar todas las notificaciones");
    button?.setAttribute("title",action==="read"?"Toca otra vez para marcar todo":"Toca otra vez para eliminar todo");
    button?.setAttribute("aria-pressed","true");
    state.confirmTimer=setTimeout(()=>resetActionConfirmation(),3400);
  }

  function showActionFeedback(message,error=false){
    const node=document.getElementById("gx-client-notif-feedback");
    if(!node||!document.getElementById("gx-client-notif-sheet")?.classList.contains("show"))return;
    clearTimeout(state.feedbackTimer);
    node.querySelector("span").textContent=message;
    node.classList.toggle("gx-error",error);
    node.classList.remove("show");
    // Reflow allows two successive actions to animate independently.
    void node.offsetWidth;
    node.classList.add("show");
    state.feedbackTimer=setTimeout(()=>node.classList.remove("show"),3000);
  }

  async function markAll(){
    if(state.actionBusy||state.confirmAction!=="read"||state.unread<=0)return;
    const epoch=state.sessionEpoch,signature=state.sessionKey,current=token();
    state.actionBusy=true;
    clearTimeout(state.confirmTimer);
    const toolbar=document.querySelector("#gx-client-notif-sheet .gx-client-notif-toolbar");
    toolbar?.classList.add("gx-confirm-loading");
    try{
      const response=await api("marcar_todas",{},current);
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey||current!==token())return;
      if(!response?.ok)throw new Error("Sesión de cliente no disponible");
      state.items.forEach(item=>{item.leida=true});
      state.unread=0;
      state.actionBusy=false;
      resetActionConfirmation();
      render();
      showActionFeedback("Todo marcado como leído");
    }catch(error){
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey)return;
      state.actionBusy=false;
      resetActionConfirmation();
      showActionFeedback("No se pudo marcar como leído",true);
      console.warn("No se pudieron marcar notificaciones:",error);
    }
  }

  async function clearAll(){
    if(state.actionBusy||state.confirmAction!=="clear"||state.items.length<=0)return;
    const epoch=state.sessionEpoch,signature=state.sessionKey,current=token();
    state.actionBusy=true;
    clearTimeout(state.confirmTimer);
    const toolbar=document.querySelector("#gx-client-notif-sheet .gx-client-notif-toolbar");
    toolbar?.classList.add("gx-confirm-loading");
    try{
      const response=await api("eliminar_todas",{},current);
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey||current!==token())return;
      if(!response?.ok)throw new Error("Sesión de cliente no disponible");
      if(state.pendingDelete){
        clearTimeout(state.pendingDelete.timer);
        state.pendingDelete=null;
        hideUndo();
      }
      state.items=[];
      state.unread=0;
      state.actionBusy=false;
      resetActionConfirmation();
      render();
      showActionFeedback("Todas las notificaciones eliminadas");
    }catch(error){
      if(epoch!==state.sessionEpoch||signature!==state.sessionKey)return;
      state.actionBusy=false;
      resetActionConfirmation();
      showActionFeedback("No se pudieron eliminar",true);
      console.warn("No se pudieron eliminar las notificaciones:",error);
    }
  }

  function openSheet(){
    ensureUi();
    bindNotificationViewport();
    bindSheetScrollGuard();
    syncNotificationViewport();
    state.scrollLockY=window.scrollY;
    if(document.scrollingElement)document.scrollingElement.scrollLeft=0;
    document.getElementById("gx-client-notif-overlay")?.classList.add("show");
    const sheet=document.getElementById("gx-client-notif-sheet");
    sheet?.classList.add("show");
    sheet?.setAttribute("aria-hidden","false");
    document.documentElement.classList.add("gx-notif-open");
    load();
  }

  function closeSheet(){
    state.scrollLockY=null;
    resetActionConfirmation();
    clearTimeout(state.feedbackTimer);
    document.getElementById("gx-client-notif-feedback")?.classList.remove("show");
    document.getElementById("gx-client-notif-overlay")?.classList.remove("show");
    const sheet=document.getElementById("gx-client-notif-sheet");
    sheet?.classList.remove("show");
    sheet?.setAttribute("aria-hidden","true");
    document.documentElement.classList.remove("gx-notif-open");
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
    const scope=event.detail?.scope;
    if(scope!=="client_notifications"&&scope!=="resync")return;
    load({realtime:scope==="client_notifications"});
  });
  window.addEventListener("goxion:client-space:updated",()=>{
    ensureUi();
    setSessionHeader();
  });
  // Login/logout from another tab and Safari foreground return must not keep stale rows.
  window.addEventListener("storage",(event)=>{
    if(event.key!==TOKEN_KEY)return;
    syncNotificationSession();
    ensureUi();
    render();
    if(token())load();
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)return;
    syncNotificationSession();
    if(token())load();
  });

  const baseLogout=window.cerrarSesion;
  if(typeof baseLogout==="function"&&!baseLogout.__gxNotifWrapped){
    const wrappedLogout=function(...args){
      const result=baseLogout.apply(this,args);
      if(state.pendingDelete)clearTimeout(state.pendingDelete.timer);
      closeSheet();
      state.pendingDelete=null;
      hideUndo();
      syncNotificationSession();
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
    bindNotificationViewport();
    ensureUi();
    const active=setSessionHeader();
    if(active)load();
  },450));

  window.GOXION_CLIENT_NOTIFICATIONS=Object.freeze({
    open:openSheet,close:closeSheet,refresh:load,getUnread:()=>state.unread
  });
})();