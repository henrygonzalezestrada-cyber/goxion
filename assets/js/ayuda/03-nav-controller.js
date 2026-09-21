(() => {
    const nav = document.getElementById("goxion-main-nav");
    if (!nav) return;

    nav.addEventListener("click", (event) => {
        const button = event.target.closest("[data-goxion-tab]");
        if (!button || !nav.contains(button)) return;

        const tabName = button.dataset.goxionTab;
        if (!["inicio", "catalogo", "soporte"].includes(tabName)) return;

        event.preventDefault();

        if (typeof window.switchTab === "function") {
            window.switchTab(tabName);
        }
    });
})();