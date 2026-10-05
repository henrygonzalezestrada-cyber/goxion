(() => {
  let busy = false;
  let queuedScope = "";

  const currentTab = () => {
    const active = document.querySelector(".view.active, .tab-content.active, [data-view].active");
    if (active?.id?.startsWith("view-")) return active.id.slice(5);
    if (document.getElementById("view-catalogo")?.classList.contains("active")) return "catalogo";
    return "";
  };

  const refresh = async (scope = "resync") => {
    if (busy) { queuedScope = scope; return; }
    if (typeof window.cargarDatosYVerificarSesion !== "function") return;

    const tab = currentTab();
    const scrollY = window.scrollY;
    busy = true;
    try {
      await window.cargarDatosYVerificarSesion();
      if (tab && typeof window.switchTab === "function") window.switchTab(tab);
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
    } catch (error) {
      console.warn("GOXION Realtime · Ayuda:", error);
    } finally {
      busy = false;
      if (queuedScope) {
        const next = queuedScope;
        queuedScope = "";
        setTimeout(() => refresh(next), 250);
      }
    }
  };

  window.addEventListener("goxion:realtime", (event) => {
    const scope = event.detail?.scope || "";
    if (["catalog","inventory","promotions","client_state","resync"].includes(scope)) refresh(scope);
  });
})();