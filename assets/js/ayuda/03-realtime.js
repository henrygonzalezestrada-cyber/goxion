(() => {
  const GXCORE = window.GOXION_CORE;
  const TOKEN_KEY = GXCORE?.STORAGE?.CLIENT_TOKEN;
  const MI_URL = GXCORE?.endpoint?.("mi-espacio");
  let busy = false;
  let queuedScope = "";

  const captureRewardsView = () => {
    const grid = document.getElementById("gamif-grid");
    const ref = document.getElementById("gamif-expanded-referral");
    const cup = document.getElementById("gamif-expanded-coupon");
    const isVisible = el => !!el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
    return {
      openType: isVisible(ref) && grid && getComputedStyle(grid).display === "none"
        ? "referral"
        : (isVisible(cup) && grid && getComputedStyle(grid).display === "none" ? "coupon" : ""),
      scrollY: window.scrollY
    };
  };

  const restoreRewardsView = (state) => {
    if (!state?.openType) {
      requestAnimationFrame(() => window.scrollTo({ top: state?.scrollY || 0, behavior: "instant" }));
      return;
    }

    const grid = document.getElementById("gamif-grid");
    const ref = document.getElementById("gamif-expanded-referral");
    const cup = document.getElementById("gamif-expanded-coupon");
    const target = state.openType === "referral" ? ref : cup;
    const other = state.openType === "referral" ? cup : ref;

    if (grid) grid.style.display = "none";
    if (other) {
      other.classList.remove("gx-shared-panel");
      other.style.display = "none";
      other.style.opacity = "";
      other.style.visibility = "";
    }
    if (target) {
      target.classList.remove("slide-left", "gx-morph-in", "gx-morph-out");
      target.classList.add("gx-shared-panel");
      target.style.display = "block";
      target.style.opacity = "1";
      target.style.visibility = "visible";
      target.style.transform = "";
    }

    requestAnimationFrame(() => window.scrollTo({ top: state.scrollY || 0, behavior: "instant" }));
  };

  const fetchClientSnapshot = async () => {
    const token = localStorage.getItem(TOKEN_KEY) || "";
    if (!token || !MI_URL) return null;

    const response = await fetch(MI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Token": token
      },
      body: "{}",
      cache: "no-store"
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok !== true) {
      if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new CustomEvent("goxion:realtime:client-session", {
          detail: { status: response.status }
        }));
      }
      throw new Error(data?.error || "No fue posible resincronizar Mi Espacio.");
    }
    return data;
  };

  const refreshClientSpace = async (scope) => {
    if (busy) {
      queuedScope = scope || queuedScope || "resync";
      return;
    }

    const key = typeof getCurrentClientKey === "function" ? getCurrentClientKey() : "";
    if (!key || typeof renderDashboard !== "function" || typeof goxionViewModelAdapter !== "function") return;

    busy = true;
    const ui = captureRewardsView();

    try {
      const raw = await fetchClientSnapshot();
      if (!raw) return;

      const adapted = goxionViewModelAdapter(raw);
      const fresh = adapted?.[key] || Object.values(adapted || {}).find(value =>
        value && typeof value === "object" && String(value.id || "") === String(globalClientesData?.[key]?.id || "")
      );

      if (!fresh || !globalClientesData?.[key]) return;

      // Reemplazamos únicamente el modelo privado del cliente. No tocamos catálogo/inventario.
      globalClientesData[key] = {
        ...globalClientesData[key],
        ...fresh
      };

      // renderDashboard actualiza Mi Espacio sin cambiar de pestaña.
      // El estado expandido de Rewards se restaura en el mismo ciclo de JS, antes del siguiente paint.
      renderDashboard(key);
      restoreRewardsView(ui);

      window.dispatchEvent(new CustomEvent("goxion:client-space:updated", {
        detail: { scope: scope || "resync", at: Date.now() }
      }));
    } catch (error) {
      console.warn("GOXION Realtime · Mi Espacio:", error);
    } finally {
      busy = false;
      if (queuedScope) {
        const next = queuedScope;
        queuedScope = "";
        setTimeout(() => refreshClientSpace(next), 180);
      }
    }
  };

  window.addEventListener("goxion:realtime", (event) => {
    const scope = event.detail?.scope || "";
    // Catálogo, inventario y promociones quedan explícitamente fuera de Realtime.
    if (!["rewards", "referrals", "client_state", "resync"].includes(scope)) return;
    refreshClientSpace(scope);
  });
})();