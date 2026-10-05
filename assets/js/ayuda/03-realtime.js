(() => {
  let busy = false;
  let queuedScope = "";

  const captureUi = () => {
    const activeView = [...document.querySelectorAll('[id^="view-"]')]
      .find(el => el.classList.contains("active") || getComputedStyle(el).display !== "none");
    const expanded = document.querySelector("#catalog-container .brand-card.expanded");
    const activeFilter = document.querySelector("#gx-catalog-filters .gx-catalog-filter-chip.active");
    const search = document.getElementById("gx-catalog-search");
    const selectedPlan = expanded?.querySelector(".plan-pill.active");
    return {
      tab: activeView?.id?.replace(/^view-/, "") || "",
      scrollY: window.scrollY,
      expandedId: expanded?.id || "",
      filterText: activeFilter?.textContent?.trim() || "",
      search: search?.value || "",
      selectedPlanIndex: selectedPlan
        ? [...selectedPlan.parentElement.querySelectorAll(".plan-pill")].indexOf(selectedPlan)
        : -1
    };
  };

  const restoreUi = (state) => {
    if (state.tab && typeof window.switchTab === "function") window.switchTab(state.tab);

    const search = document.getElementById("gx-catalog-search");
    if (search && state.search) {
      search.value = state.search;
      search.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (state.filterText) {
      const filter = [...document.querySelectorAll("#gx-catalog-filters .gx-catalog-filter-chip")]
        .find(btn => btn.textContent.trim() === state.filterText);
      if (filter && !filter.classList.contains("active")) filter.click();
    }

    if (state.expandedId) {
      const card = document.getElementById(state.expandedId);
      if (card && !card.classList.contains("expanded")) {
        const brandId = state.expandedId.replace(/^brand-card-/, "");
        if (typeof window.toggleBrandCard === "function") window.toggleBrandCard(brandId);
        else card.querySelector(".brand-header")?.click();
      }
      if (card && state.selectedPlanIndex > 0) {
        const pills = card.querySelectorAll(".plan-pill");
        pills[state.selectedPlanIndex]?.click();
      }
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: state.scrollY, behavior: "instant" }));
    });
  };

  const refresh = async (scope = "resync") => {
    if (busy) { queuedScope = scope; return; }
    if (typeof window.cargarDatosYVerificarSesion !== "function") return;

    const ui = captureUi();
    busy = true;
    try {
      await window.cargarDatosYVerificarSesion();
      restoreUi(ui);
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