(() => {
  let busy = false;
  let queued = false;
  const refresh = async () => {
    if (busy) { queued = true; return; }
    if (typeof window.cargarDatosYVerificarSesion !== "function") return;
    busy = true;
    try { await window.cargarDatosYVerificarSesion(); }
    catch (error) { console.warn("GOXION Realtime · Ayuda:", error); }
    finally {
      busy = false;
      if (queued) { queued = false; setTimeout(refresh, 250); }
    }
  };
  window.addEventListener("goxion:realtime", (event) => {
    if (["catalog","inventory","promotions","client_state","resync"].includes(event.detail?.scope)) refresh();
  });
})();