(() => {
  let refreshing = false;
  let queued = false;

  const refresh = async (reason) => {
    if (refreshing) { queued = true; return; }
    if (typeof window.gxAdminRealtimeRefresh !== "function") return;
    refreshing = true;
    try {
      await window.gxAdminRealtimeRefresh();
      if (reason === "promotions" && typeof window.gxPromoLoad === "function") {
        await window.gxPromoLoad();
      }
    } catch (error) {
      console.warn("GOXION Realtime · Admin no pudo resincronizar:", error);
    } finally {
      refreshing = false;
      if (queued) {
        queued = false;
        setTimeout(() => refresh("queued"), 250);
      }
    }
  };

  window.addEventListener("goxion:realtime", (event) => {
    const scope = event.detail?.scope || "general";
    if (["registrations", "admin_activity", "catalog", "inventory", "promotions", "resync"].includes(scope)) {
      refresh(scope);
    }
  });
})();