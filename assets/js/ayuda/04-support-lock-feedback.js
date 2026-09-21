(() => {
    const overlay = document.getElementById("support-lock-overlay");
    const card = overlay?.querySelector(".support-lock-card");

    if (!overlay || !card) return;

    let resetTimer = null;

    function denyFeedback() {
        if (!overlay.classList.contains("show")) return;

        clearTimeout(resetTimer);
        card.classList.remove("gx-lock-denied");

        /* Reinicia la animación incluso con taps repetidos. */
        void card.offsetWidth;
        card.classList.add("gx-lock-denied");

        resetTimer = setTimeout(() => {
            card.classList.remove("gx-lock-denied");
        }, 620);
    }

    overlay.addEventListener("pointerdown", (event) => {
        if (!overlay.classList.contains("show")) return;
        event.preventDefault();
        denyFeedback();
    });

    overlay.addEventListener("contextmenu", (event) => {
        if (overlay.classList.contains("show")) {
            event.preventDefault();
        }
    });
})();