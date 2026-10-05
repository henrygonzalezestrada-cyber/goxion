(() => {
  let timer = null;
  window.addEventListener("goxion:realtime", (event) => {
    if (!["inventory","client_state","resync"].includes(event.detail?.scope)) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (typeof window.cargarEstadoCuenta === "function") {
        Promise.resolve(window.cargarEstadoCuenta()).catch(error =>
          console.warn("GOXION Realtime · Index:", error)
        );
      }
    }, 250);
  });
})();