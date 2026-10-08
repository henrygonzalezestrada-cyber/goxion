(() => {
  let refreshing = false;
  let queuedScope = "";

  const toast = (title, detail = "") => {
    let node = document.getElementById("gx-realtime-admin-toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "gx-realtime-admin-toast";
      Object.assign(node.style, {
        position:"fixed", right:"18px", top:"18px", zIndex:"99999",
        maxWidth:"320px", padding:"12px 14px", borderRadius:"16px",
        background:"rgba(10,12,22,.88)", border:"1px solid rgba(0,242,254,.28)",
        backdropFilter:"blur(18px)", boxShadow:"0 18px 45px rgba(0,0,0,.34)",
        color:"#fff", opacity:"0", transform:"translateY(-8px)",
        transition:"opacity .22s ease, transform .22s ease", pointerEvents:"none"
      });
      document.body.appendChild(node);
    }
    node.innerHTML = `<strong style="display:block;font-size:12px;">${String(title||"GOXION actualizado")}</strong>${detail?`<small style="display:block;margin-top:4px;opacity:.68;font-size:10px;line-height:1.35;">${String(detail)}</small>`:""}`;
    node.style.opacity="1";
    node.style.transform="translateY(0)";
    clearTimeout(node._gxTimer);
    node._gxTimer=setTimeout(()=>{node.style.opacity="0";node.style.transform="translateY(-8px)";},2600);
  };

  const captureUi = () => {
    const focus=document.getElementById("gx-client-focus");
    return {
      scrollY:window.scrollY,
      focusOpen:Boolean(focus?.classList.contains("show")),
      focusKey:String(focus?.dataset?.gxClientKey||""),
      focusSection:String(focus?.dataset?.gxFocusSection||"summary"),
      notificationsOpen:Boolean(document.getElementById("gx-notification-drawer")?.classList.contains("show")),
      registrationOpen:Boolean(document.getElementById("gx-registration-control")?.classList.contains("show")),
      notificationIds:new Set((window.gxAdminNotifications||[]).map(n=>String(n?.id||"")).filter(Boolean))
    };
  };

  const restoreUi = (state) => {
    if(state.focusOpen && state.focusKey && clientesDict?.[state.focusKey] && typeof window.gxOpenClientFocus==="function"){
      window.gxOpenClientFocus(state.focusKey);
      setTimeout(()=>{
        if(state.focusSection && typeof window.gxFocusSection==="function") window.gxFocusSection(state.focusSection);
      },130);
    }
    if(state.notificationsOpen && typeof window.gxToggleNotificationsBase==="function"){
      window.gxToggleNotificationsBase(true);
    }
    requestAnimationFrame(()=>window.scrollTo({top:Number(state.scrollY||0),behavior:"instant"}));
  };

  const renderFreshModel = (scope) => {
    if(typeof window.calcularInventarioYFinanzas==="function") window.calcularInventarioYFinanzas();
    if(typeof window.filtrarClientes==="function") window.filtrarClientes();
    if(typeof window.gxUpdateOperationsSummary==="function") window.gxUpdateOperationsSummary();
    if(typeof window.gxRefreshClientOperationalContext==="function") window.gxRefreshClientOperationalContext();
    if(typeof window.gxRefreshServiceRequestBadges==="function") window.gxRefreshServiceRequestBadges();

    window.dispatchEvent(new CustomEvent("goxion:admin:updated",{
      detail:{scope,at:Date.now()}
    }));
  };

  const refresh = async (scope = "resync") => {
    if(refreshing){queuedScope=scope||queuedScope||"resync";return;}
    refreshing=true;
    const ui=captureUi();

    try{
      if(scope==="registrations"){
        if(typeof window.gxLoadRegistrationState==="function"){
          await window.gxLoadRegistrationState(ui.registrationOpen);
          toast("Nueva actividad de registro","La bandeja de registros se actualizó en tiempo real.");
        }
        return;
      }

      if(typeof window.goxionReloadAdminModel!=="function") return;
      await window.goxionReloadAdminModel();
      renderFreshModel(scope);

      if((scope==="resync"||ui.registrationOpen) && typeof window.gxLoadRegistrationState==="function"){
        await window.gxLoadRegistrationState(ui.registrationOpen);
      }

      const fresh=(window.gxAdminNotifications||[]).filter(n=>n?.id&&!ui.notificationIds.has(String(n.id)));
      if(fresh.length){
        const first=fresh[0];
        toast(first.titulo||"Nueva solicitud",fresh.length>1?`${fresh.length} actividades nuevas`:(first.cliente_nombre||first.mensaje||""));
      }else if(scope==="cancellations"){
        toast("Cancelaciones actualizadas","Hay cambios nuevos en solicitudes de cancelación.");
      }else if(scope==="account_state"){
        toast("Estado financiero actualizado","Pagos y saldos se sincronizaron.");
      }

      restoreUi(ui);
    }catch(error){
      console.warn("GOXION Realtime · Admin:",error);
      if(error?.message==="SESION_EXPIRADA"||error?.status===401){
        toast("Sesión de Admin expirada","Vuelve a iniciar sesión para continuar recibiendo cambios.");
      }
    }finally{
      refreshing=false;
      if(queuedScope){
        const next=queuedScope;queuedScope="";
        setTimeout(()=>refresh(next),180);
      }
    }
  };

  window.addEventListener("goxion:realtime",(event)=>{
    const scope=event.detail?.scope||"";
    if(!["registrations","admin_activity","cancellations","account_state","client_state","client_access","rewards","referrals","resync"].includes(scope))return;
    refresh(scope);
  });
})();