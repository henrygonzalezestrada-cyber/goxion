import { createMorph } from "https://esm.sh/morphicons@1.5.0/dom";

const CHEVRON_DOWN = "M6 9l6 6 6-6";
const CHEVRON_UP   = "M6 15l6-6 6 6";

const EYE = "M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6ZM9.5 12a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0Z";
const EYE_OFF = "M3 3l18 18M10.6 6.15A10.7 10.7 0 0 1 12 6c6 0 9.5 6 9.5 6a15.6 15.6 0 0 1-2.05 2.67M6.1 7.1C3.8 8.75 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.15-.5";

let enabled = true;
const records = new Set();

function transition(record, icon, spring = "snappy"){
    if(!record?.morph) return;
    if(enabled) record.morph.morphTo(icon, spring);
    else record.morph.set(icon);
}

function register(path, initial, getTarget, targetNode, spring = "snappy"){
    if(!path || path.dataset.gxMorphiconsReady === "1") return;
    path.dataset.gxMorphiconsReady = "1";

    const morph = createMorph(path, initial, { reducedMotion:"user" });
    const record = { path, morph, getTarget, spring };
    records.add(record);

    if(targetNode){
        const observer = new MutationObserver(() => {
            transition(record, getTarget(), spring);
        });
        observer.observe(targetNode, {attributes:true, attributeFilter:["class","aria-expanded"]});
        record.observer = observer;
    }
}

function initServiceChevrons(root = document){
    root.querySelectorAll(".gx-service-expand-icon.gx-chevron-motion").forEach(host => {
        if(host.dataset.gxMorphiconsHost === "1") return;

        const svg = host.querySelector(".gx-chevron-svg");
        const path = svg?.querySelector("path");
        if(!svg || !path) return;

        host.dataset.gxMorphiconsHost = "1";
        svg.classList.add("gx-morph-chevron");
        svg.setAttribute("viewBox","0 0 24 24");
        svg.setAttribute("aria-hidden","true");

        const getTarget = () => host.classList.contains("open") ? CHEVRON_UP : CHEVRON_DOWN;
        register(path, getTarget(), getTarget, host, "snappy");
    });
}

function initFAQ(root = document){
    root.querySelectorAll(".faq-item").forEach(item => {
        if(item.dataset.gxMorphiconsFaq === "1") return;
        const icon = item.querySelector(".faq-header .icon");
        if(!icon) return;

        item.dataset.gxMorphiconsFaq = "1";
        icon.classList.add("gx-morph-faq-host");
        icon.textContent = "";

        const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
        svg.setAttribute("viewBox","0 0 24 24");
        svg.setAttribute("aria-hidden","true");
        svg.classList.add("gx-morph-faq-svg");

        const path = document.createElementNS("http://www.w3.org/2000/svg","path");
        svg.appendChild(path);
        icon.appendChild(svg);

        const getTarget = () => item.classList.contains("open") ? CHEVRON_UP : CHEVRON_DOWN;
        register(path, getTarget(), getTarget, item, "smooth");
    });
}

function initPinEye(){
    const btn = document.getElementById("gx-pin-eye-btn");
    if(!btn || btn.dataset.gxMorphiconsEye === "1") return;

    btn.dataset.gxMorphiconsEye = "1";
    const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    svg.classList.add("gx-morph-eye");

    const path = document.createElementNS("http://www.w3.org/2000/svg","path");
    svg.appendChild(path);
    btn.appendChild(svg);

    const getTarget = () => btn.classList.contains("is-visible") ? EYE_OFF : EYE;
    register(path, getTarget(), getTarget, btn, "snappy");
}

function initAll(root = document){
    initServiceChevrons(root);
    initFAQ(root);
    initPinEye();
}

function boot(){
    initAll();

    const observer = new MutationObserver(mutations => {
        for(const mutation of mutations){
            for(const node of mutation.addedNodes){
                if(node.nodeType !== 1) continue;
                initAll(node);
                if(node.matches?.(".gx-service-expand-icon.gx-chevron-motion, .faq-item")) initAll(node.parentElement || node);
            }
        }
    });
    observer.observe(document.body,{childList:true,subtree:true});

}

if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded",boot,{once:true});
}else{
    boot();
}