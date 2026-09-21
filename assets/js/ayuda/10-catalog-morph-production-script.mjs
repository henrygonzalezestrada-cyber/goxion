import { createMorph } from "https://esm.sh/morphicons@1.5.0/dom";

const DOWN="M6 9l6 6 6-6";
const CLOSE="M6 6l12 12M18 6L6 18";

function reduced(){
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
}

function initCatalog(root=document){
    const hosts=[];
    if(root.matches?.(".brand-card > .brand-header > .brand-expand-icon.gx-chevron-motion")) hosts.push(root);
    root.querySelectorAll?.(".brand-card > .brand-header > .brand-expand-icon.gx-chevron-motion").forEach(el=>hosts.push(el));

    hosts.forEach(host=>{
        if(host.dataset.gxMorphBeta03==="1") return;
        const card=host.closest(".brand-card");
        const svg=host.querySelector(".gx-chevron-svg");
        const path=svg?.querySelector("path");
        if(!card || !svg || !path) return;

        host.dataset.gxMorphBeta03="1";
        host.classList.add("gx-morph-catalog-free");
        svg.classList.add("gx-morph-catalog-free-svg");
        svg.setAttribute("viewBox","0 0 24 24");

        const initial=card.classList.contains("expanded")?CLOSE:DOWN;
        const morph=createMorph(path,initial,{reducedMotion:"user"});

        const sync=()=>{
            const target=card.classList.contains("expanded")?CLOSE:DOWN;
            try{
                if(reduced()) morph.set(target);
                else morph.morphTo(target,"snappy");
            }catch(_){
                try{morph.set(target);}catch(__){}
            }
        };

        const observer=new MutationObserver(sync);
        observer.observe(card,{attributes:true,attributeFilter:["class"]});
    });
}

function boot(){
    initCatalog();
    const observer=new MutationObserver(mutations=>{
        for(const mutation of mutations){
            for(const node of mutation.addedNodes){
                if(node.nodeType!==1) continue;
                initCatalog(node);
            }
        }
    });
    observer.observe(document.body,{childList:true,subtree:true});

}

if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
}else{
    boot();
}