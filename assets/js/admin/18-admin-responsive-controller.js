(() => {
    function gxResponsiveMode(){
        const w=window.innerWidth;
        if(w<=840)return "mobile";
        if(w<1100)return "tablet";
        if(w<1280)return "laptop";
        if(w<1600)return "desktop";
        return "desktop-wide";
    }

    function applyMode(){
        document.documentElement.dataset.gxResponsiveMode=gxResponsiveMode();
    }

    applyMode();
    window.addEventListener("resize",applyMode,{passive:true});

})();