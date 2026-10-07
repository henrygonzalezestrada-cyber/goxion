(() => {
  let timer = null;
  let busy = false;
  let queued = false;

  const refreshAccount = async (reason = "account_state") => {
    if (busy) { queued = true; return; }
    if (typeof window.cargarEstadoCuenta !== "function") return;

    busy = true;
    const scrollY = window.scrollY;
    const activeElement = document.activeElement;
    const activeId = activeElement?.id || "";

    try {
      await window.cargarEstadoCuenta();

      requestAnimationFrame(() => {
        window.scrollTo({ top: scrollY, behavior: "instant" });
        if (activeId) document.getElementById(activeId)?.focus?.({ preventScroll: true });
      });

      window.dispatchEvent(new CustomEvent("goxion:account:updated", {
        detail: { reason, at: Date.now() }
      }));
    } catch (error) {
      console.warn("GOXION Realtime · Estado de cuenta:", error);
    } finally {
      busy = false;
      if (queued) {
        queued = false;
        setTimeout(() => refreshAccount("queued"), 180);
      }
    }
  };

  window.addEventListener("goxion:realtime", (event) => {
    const scope = event.detail?.scope || "";
    if (!["account_state", "client_state", "resync"].includes(scope)) return;

    clearTimeout(timer);
    timer = setTimeout(() => refreshAccount(scope), 220);
  });
})();