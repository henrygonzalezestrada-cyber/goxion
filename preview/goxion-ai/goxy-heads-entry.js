/*
 * GOXION · Goxy · adaptador de robot-heads 0.3.0 (MIT, © Fayaz Ahmed).
 * Bundle estático mismo origen, solo en preview/goxion-ai.
 * React queda encapsulado en 2 pequeños montajes, sin rehacer Ayuda.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { RobotHead } from "robot-heads";

const mounts = new WeakMap();
const allowedStates = new Set(["idle","thinking","searching","listening","speaking","working","happy","error","sleeping"]);
const mapState = (mood) => ({
  love:"happy", wink:"happy", surprised:"listening"
}[mood] || (allowedStates.has(mood) ? mood : "idle"));
const color = "#3552b1", trimColor = "#9eb1d4", screenColor = "#f3faff";

function mount(host) {
  if (!host || mounts.has(host)) return;
  const avatar = Boolean(host.closest(".gxai-avatar"));
  const root = createRoot(host);
  const size = avatar ? 46 : 250;
  let prevMood = null;
  const refresh = () => {
    const mood = host.getAttribute("data-mood") || "idle";
    if (prevMood === mood) return;
    prevMood = mood;
    root.render(React.createElement(RobotHead, {
      model:"tv", shape:"rectangle", size,
      state:mapState(mood),
      color, trimColor, screenColor,
      speed:0.94, floorShadow:!avatar, antenna:!avatar,
      interactive:!avatar,
      "aria-label": "Goxy, cabeza robótica tridimensional animada"
    }));
  };
  const observer = new MutationObserver(refresh);
  observer.observe(host, {attributes:true,attributeFilter:["data-mood"]});
  mounts.set(host, {root, observer});
  refresh();
}
function mountAll() {
  document.querySelectorAll("#view-soporte .gxai-canvas-slot").forEach(mount);
}
function unmountAll() {
  document.querySelectorAll("#view-soporte .gxai-canvas-slot").forEach(host => {
    const instance = mounts.get(host);
    if (!instance) return;
    instance.observer.disconnect();
    instance.root.unmount();
    mounts.delete(host);
  });
}
window.GOXY_ROBOT = Object.freeze({mount, mountAll, unmountAll, engine:"robot-heads@0.3.0"});
