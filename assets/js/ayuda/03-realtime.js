(() => {
  let busy = false;
  let queuedScope = "";

  const captureUi = () => {
    const grid = document.getElementById("gamif-grid");
    const ref = document.getElementById("gamif-expanded-referral");
    const cup = document.getElementById("gamif-expanded-coupon");
    const visible = el => !!el && getComputedStyle(el).display !== "none" && getComputedStyle(el).visibility !== "hidden";
    const expandedService = document.querySelector(".gx-service-manage-card.expanded");

    return {
      rewardsType: visible(ref) && grid && getComputedStyle(grid).display === "none"
        ? "referral"
        : (visible(cup) && grid && getComputedStyle(grid).display === "none" ? "coupon" : ""),
      serviceIndex: expandedService
        ? Number(String(expandedService.id || "").split("-").pop())
        : -1,
      scrollY: window.scrollY
    };
  };

  const restoreUi = (state) => {
    if (Number.isInteger(state?.serviceIndex) && state.serviceIndex >= 0) {
      const card = document.getElementById(`gx-service-card-${state.serviceIndex}`);
      if (card && typeof gxSetServiceCardState === "function") {
        gxSetServiceCardState(card, state.serviceIndex, true);
      }
    }

    if (state?.rewardsType) {
      const grid = document.getElementById("gamif-grid");
      const ref = document.getElementById("gamif-expanded-referral");
      const cup = document.getElementById("gamif-expanded-coupon");
      const target = state.rewardsType === "referral" ? ref : cup;
      const other = state.rewardsType === "referral" ? cup : ref;

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
    }

    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(state?.scrollY || 0), behavior: "instant" });
    });
  };

  const refreshClientSpace = async (scope) => {
    if (busy) {
      queuedScope = scope || queuedScope || "resync";
      return;
    }

    if (typeof window.goxionReloadPrivateClientView !== "function") {
      console.warn("GOXION Realtime · API privada de Mi Espacio no disponible.");
      return;
    }

    busy = true;
    const ui = captureUi();

    try {
      const snapshot = await window.goxionReloadPrivateClientView();
      const key = String(snapshot?.key || (typeof getCurrentClientKey === "function" ? getCurrentClientKey() : ""));
      const fresh = snapshot?.cliente || (key ? snapshot?.viewModel?.[key] : null);

      if (!key || !fresh || !globalClientesData?.[key] || typeof renderDashboard !== "function") return;

      globalClientesData[key] = {
        ...globalClientesData[key],
        ...fresh
      };

      renderDashboard(key);
      restoreUi(ui);

      window.dispatchEvent(new CustomEvent("goxion:client-space:updated", {
        detail: { scope: scope || "resync", at: Date.now() }
      }));
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        window.dispatchEvent(new CustomEvent("goxion:realtime:client-session", {
          detail: { status: error.status }
        }));
      }
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

  if (window.location.pathname.includes("/preview/realtime/")) {
    window.irAlTicket = function() {
      const key = typeof getCurrentClientKey === "function" ? getCurrentClientKey() : "";
      if (!key) return;
      const url = new URL("index-realtime.html", window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("cliente", key);
      window.location.href = url.toString();
    };
  }

  window.addEventListener("goxion:realtime", (event) => {
    const scope = event.detail?.scope || "";
    if (!["account_state", "rewards", "referrals", "client_state", "client_access", "client_notifications", "cancellations", "resync"].includes(scope)) return;
    refreshClientSpace(scope);
  });
})();