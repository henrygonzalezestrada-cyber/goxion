(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gxMotion") !== "buttons") return;

    document.body.classList.add("gx-motion-buttons-v1");
    document.documentElement.dataset.gxMotionButtons = "1";
})();
