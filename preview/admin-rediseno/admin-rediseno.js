/* ============================================================
   GOXION // ADMIN — Rediseño v2 (ESPEJO)
   preview/admin-rediseno/admin-rediseno.js
   SOLO espejo. No modifica los 43 scripts oficiales: los envuelve
   (mismo patrón de wrappers que usa Admin) o lee sus globales.
   - Bandeja de decisiones: fork de presentación de buildOps de
     14-admin-mobile-controller.js (misma fuente de datos, mismas
     acciones, sin duplicar lógica de negocio). Si 14 cambia, este
     fork debe revisarse (ver README del espejo).
   - v2: contadores easeOutExpo desde el valor anterior (nunca
     desde 0), morph skeleton→contenido, stagger con presupuesto
     de 500 ms, arrastre de hojas, check-pop + partículas,
     intercambiador de iconos para contenido dinámico, cambio de
     pestaña con solape de 60 ms.
   ============================================================ */
(function(){
"use strict";
const gx2BootAt = Date.now();
const $ = id => document.getElementById(id);
const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = v => (window.gxEscapeAdminHtml ? window.gxEscapeAdminHtml(v) : String(v ?? "")
  .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
  .replace(/"/g,"&quot;").replace(/'/g,"&#039;"));
const money0 = v => `$${Number(v || 0).toFixed(0)}`;
const clientMonthly = c => Number(c?.estado_cuenta?.total_actual ??
  (c?.servicios || []).reduce((s, x) => s + Number(x.monto || 0), 0));
const timingOf = c => typeof window.gxPaymentTiming === "function"
  ? window.gxPaymentTiming(c) : { type: "none", days: 999, due: null };

/* ---------------------------------------------------------------
   BANDEJA DE DECISIONES (#gx-decision-feed)
   Misma construcción de filas que 14.buildOps: comprobantes en
   revisión y vencidos sintéticos desde clientesDict + notificaciones
   persistidas (gxAdminNotifications) clasificadas por
   gxClassifyAdminNotification. Mismo orden, mismos filtros.
   --------------------------------------------------------------- */
let gx2FeedFilterState = "priority";
let gx2FeedFirstPaint = true;

function gx2BuildDecisionRows(){
  const rows = [];
  Object.entries(window.clientesDict || {}).forEach(([key, c]) => {
    if (c.pago_en_revision){
      rows.push({ id: `review-${key}`, key, synthetic: true, category: "review",
        title: "Pago pendiente de revisión",
        message: `${c.nombre} tiene un comprobante esperando validación.`,
        client: c.nombre, amount: clientMonthly(c),
        created_at: new Date().toISOString() });
      return;
    }
    const t = timingOf(c);
    if (t.type === "overdue"){
      rows.push({ id: `overdue-${key}`, key, synthetic: true, category: "overdue",
        title: "Pago vencido",
        message: `${c.nombre} lleva ${Number(t.days || 0)} día${Number(t.days || 0) === 1 ? "" : "s"} de atraso.`,
        client: c.nombre, amount: clientMonthly(c),
        created_at: new Date().toISOString() });
    }
  });
  const persisted = Array.isArray(window.gxAdminNotifications) ? window.gxAdminNotifications : [];
  persisted.forEach(n => {
    const cat = window.gxClassifyAdminNotification?.(n) || "activity";
    if (String(n?.tipo || "").toLowerCase() === "pago_revision") return;
    const key = Object.entries(window.clientesDict || {})
      .find(([, c]) => String(c?._id || c?.id || "") === String(n?.cliente_id || ""))?.[0] || "";
    const c = window.clientesDict?.[key];
    rows.push({ id: n.id, key, synthetic: false, category: cat,
      title: n.titulo || "Actividad", message: n.mensaje || "",
      client: n.cliente_nombre || "", amount: c ? clientMonthly(c) : null,
      created_at: n.created_at, read: n.leida === true });
  });
  const order = { review: 0, overdue: 1, cancellation: 2, support: 3, activity: 4 };
  return rows.sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9)
    || new Date(b.created_at || 0) - new Date(a.created_at || 0));
}

function gx2FeedRowsForFilter(rows){
  if (gx2FeedFilterState === "payments") return rows.filter(x => x.category === "review");
  if (gx2FeedFilterState === "cancellations") return rows.filter(x => x.category === "cancellation");
  if (gx2FeedFilterState === "support") return rows.filter(x => x.category === "support");
  return rows.filter(x => ["review", "overdue", "cancellation", "support"].includes(x.category)
    && (x.synthetic || !x.read));
}

const GX2_LABELS = { review: "Pago", overdue: "Vencido", cancellation: "Cancelación", support: "Soporte", activity: "Actividad" };
const GX2_KIND_ICON = { review: "doc", overdue: "alert", cancellation: "x", support: "message", activity: "clock" };
const gx2Icon = name => `<svg class="gx2-ic" aria-hidden="true"><use href="#gx2-ic-${name}"/></svg>`;

function gx2RenderFeed(){
  const feed = $("gx-decision-feed");
  if (!feed) return;
  if (typeof window.clientesDict === "undefined"){
    /* Sin capa de datos (sin sesión Admin o sin red), los esqueletos no
       deben quedarse para siempre: a los 4 s se muestra el estado real. */
    if (Date.now() - gx2BootAt > 4000){
      feed.innerHTML = `<div class="gx2-feed-empty">${gx2Icon("lock")}<strong>Sin sesión Admin</strong><p>Inicia sesión para cargar las decisiones. Tus pendientes aparecerán aquí.</p></div>`;
      feed.classList.add("gx2-no-enter");
    }
    return;
  }
  /* Morph skeleton → contenido: los esqueletos se atenúan 160 ms
     y luego entran las tarjetas (360 ms expo + 80 ms de desfase). */
  if (!reduced && feed.querySelector(".gx2-skeleton-card")){
    feed.querySelectorAll(".gx2-skeleton-card, .gx2-sk-caption").forEach(el => el.classList.add("gx2-morph-out"));
    setTimeout(gx2RenderFeedNow, 160);
    return;
  }
  gx2RenderFeedNow();
}

function gx2RenderFeedNow(){
  const feed = $("gx-decision-feed");
  if (!feed) return;
  const all = gx2FeedRowsForFilter(gx2BuildDecisionRows());
  const rows = all.slice(0, 8);
  const total = all.length;
  if (!rows.length){
    feed.innerHTML = `<div class="gx2-feed-empty">${gx2Icon("check")}<strong>Al corriente</strong><p>Nada pendiente en esta categoría. Cuando llegue algo, aparecerá aquí.</p></div>`;
    feed.classList.add("gx2-no-enter");
    return;
  }
  /* Stagger con presupuesto: total 500 ms, tarjeta 360 ms →
     desfase = (500−360)÷(n−1) por tarjeta. */
  const stagger = rows.length > 1 ? 140 / (rows.length - 1) : 0;
  feed.innerHTML = rows.map((x, i) => {
    const safeId = String(x.id || "").replace(/'/g, "");
    const safeKey = String(x.key || "").replace(/'/g, "");
    const amount = (x.category === "review" || x.category === "overdue") && x.amount != null
      ? `<span class="gx2-feed-amount">${money0(x.amount)}</span>` : "";
    return `<article class="gx2-feed-card ${x.category}" style="--gx2-d:${Math.round(i * stagger)}ms">
      <span class="gx2-feed-kind ${x.category}">${gx2Icon(GX2_KIND_ICON[x.category] || "clock")}${GX2_LABELS[x.category] || "Actividad"}</span>
      <strong class="gx2-feed-title">${esc(x.title)}</strong>
      <p class="gx2-feed-msg">${esc(x.message)}</p>
      <div class="gx2-feed-foot">
        <div>${amount}<span class="gx2-feed-client">${x.client ? esc(x.client) + " · " : ""}${x.read ? "Atendida" : "Pendiente"}</span></div>
        <div class="gx2-feed-actions">
          ${safeKey ? `<button type="button" class="primary" onclick="gxOpenClientFocus('${safeKey}')">${x.category === "review" ? "Revisar" : "Abrir cliente"}</button>` : ""}
          ${x.category === "cancellation" && !x.synthetic && safeId ? (window.gxCancellationButtons?.(safeId, "mobile") || "") : ""}
          ${!x.synthetic && !x.read && safeId && x.category !== "cancellation" ? `<button type="button" onclick="gxMarkNotificationRead('${safeId}')">Atendida</button>` : ""}
          ${!x.synthetic && safeId ? `<button type="button" class="danger" onclick="gxDeleteNotification('${safeId}')">Eliminar</button>` : ""}
        </div>
      </div>
    </article>`;
  }).join("") + (total > 8
    ? `<p class="gx2-feed-filter-label">Y ${total - 8} más en Operaciones.</p>` : "");
  /* Entrada escalonada solo en la primera pintura con datos y al filtrar.
     Los refrescos por Realtime no re-animan la lista. */
  if (gx2FeedFirstPaint){
    gx2FeedFirstPaint = false;
    setTimeout(() => feed.classList.add("gx2-no-enter"), 500);
  }
}

window.gx2FeedFilter = function(kind, btn){
  const labels = { priority: "Prioridad · lo urgente primero",
    payments: "Pagos por validar", cancellations: "Cancelaciones", support: "Soporte" };
  gx2FeedFilterState = (gx2FeedFilterState === kind) ? "priority" : kind;
  document.querySelectorAll("[data-gx2-decision]").forEach(b =>
    b.classList.toggle("gx2-filter-on", b.dataset.gx2Decision === gx2FeedFilterState));
  const label = $("gx2-feed-filter-label");
  if (label) label.textContent = labels[gx2FeedFilterState] || labels.priority;
  const feed = $("gx-decision-feed");
  if (feed){
    feed.classList.remove("gx2-no-enter");
    gx2RenderFeed();
    setTimeout(() => feed.classList.add("gx2-no-enter"), 500);
  }
};

/* ---------------------------------------------------------------
   PRÓXIMOS VENCIMIENTOS: revelado progresivo (5 + "ver más")
   Se reaplica en cada re-render de 14.renderUpcoming vía observer.
   El botón vive FUERA de la lista para que el re-render no lo borre.
   --------------------------------------------------------------- */
let gx2UpcomingExpanded = false;
function gx2ApplyUpcomingMore(){
  const list = $("gx-next-payments-list");
  const wrap = $("gx2-upcoming-more");
  if (!list || !wrap) return;
  const items = [...list.children].filter(el => el.classList.contains("gx-next-payment"));
  if (items.length <= 5){ wrap.innerHTML = ""; items.forEach(el => { el.style.display = ""; }); return; }
  items.forEach((el, i) => { el.style.display = (!gx2UpcomingExpanded && i >= 5) ? "none" : ""; });
  wrap.innerHTML = `<button class="gx2-more-btn" type="button" onclick="gx2ToggleUpcomingMore()">${gx2UpcomingExpanded ? "Ver menos" : `Ver más (${items.length - 5})`}</button>`;
}
window.gx2ToggleUpcomingMore = function(){
  gx2UpcomingExpanded = !gx2UpcomingExpanded;
  gx2ApplyUpcomingMore();
};

/* ---------------------------------------------------------------
   CONTEO ANIMADO (easeOutExpo: 600 ms si Δ < $20, 900 ms si
   Δ ≥ $20) — desde el valor anterior, nunca desde 0; sin
   animación si Δ < $1; máximo 1 animación a la vez por contador.
   Si el código oficial escribe durante la animación, al terminar
   se respeta su valor (no se pisa con el texto viejo).
   --------------------------------------------------------------- */
const GX2_COUNT_TARGETS = [
  { id: "kpi-ingresos", kind: "money" }, { id: "kpi-costos", kind: "money" },
  { id: "kpi-ganancias", kind: "money" }, { id: "kpi-margen", kind: "percent" },
  { id: "gx-decision-total", kind: "suffixed", suffix: " pendientes", singular: " pendiente" },
  { id: "gx-count-due-today", kind: "int" }, { id: "gx-count-overdue-home", kind: "int" }
];
function gx2ParseNumber(text){
  const m = String(text || "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}
function gx2WatchCounts(){
  GX2_COUNT_TARGETS.forEach(({ id, kind }) => {
    const el = $(id);
    if (!el) return;
    let last = gx2ParseNumber(el.textContent);
    let rafId = 0, animating = false, first = true, lastWritten = el.textContent;
    const fmt = v => kind === "money" ? `$${v.toFixed(2)}`
      : kind === "percent" ? `${v.toFixed(1)}%`
      : kind === "suffixed" ? `${Math.round(v)}${Math.round(v) === 1 ? " pendiente" : " pendientes"}`
      : `${Math.round(v)}`;
    const animate = (from, to, finalText) => {
      if (reduced || from === to){ el.textContent = finalText; last = to; return; }
      cancelAnimationFrame(rafId);
      animating = true;
      const start = performance.now(), dur = Math.abs(to - from) >= 20 ? 900 : 600;
      const frame = now => {
        const t = Math.min(1, (now - start) / dur);
        const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        lastWritten = fmt(from + (to - from) * eased);
        el.textContent = lastWritten;
        if (t < 1) rafId = requestAnimationFrame(frame);
        else {
          animating = false;
          if (el.textContent === lastWritten) el.textContent = finalText;
          last = gx2ParseNumber(el.textContent);
        }
      };
      rafId = requestAnimationFrame(frame);
    };
    new MutationObserver(() => {
      if (animating) return;
      const current = el.textContent;
      const to = gx2ParseNumber(current);
      if (first){
        first = false;
        if (last === 0){ last = to; return; } /* nunca contar desde 0 */
        animate(last, to, current);
        return;
      }
      if (Math.abs(to - last) < 1){ last = to; return; } /* Δ < $1: directo */
      animate(last, to, current);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
}

/* ---------------------------------------------------------------
   POP DE BADGE (150 ms, transform) + espejo del total en la
   barra segmentada. Solo cuando el cambio sigue a una decisión
   de Henry (clic en aprobar / atendida / eliminar / incompleto).
   --------------------------------------------------------------- */
let gx2DecidedAt = 0;
document.addEventListener("click", e => {
  const t = e.target.closest("button");
  if (!t) return;
  const oc = t.getAttribute("onclick") || "";
  const isDecision = /gxPaymentApprove|gxMarkNotificationRead|gxDeleteNotification|gxPaymentIncomplete|gxPaymentReject|gxConfirmIncomplete|gxOpenDecision/.test(oc)
      || t.closest("#gx-decision-feed") || t.closest("#gx-mobile-ops-list");
  if (isDecision){
    gx2DecidedAt = Date.now();
    gx2CheckPop(t);
  }
}, true);

/* Check-pop + partículas al aprobar/atender: el botón hace pop
   (420 ms ease-back) y suelta 6 partículas verdes (520 ms). Solo
   el primer toque que cambia estado; los toques repetidos en
   560 ms no vuelven a disparar. */
function gx2CheckPop(btn){
  if (!btn || reduced || btn.querySelector(".gx2-particle")) return;
  btn.classList.add("gx2-check-pop");
  setTimeout(() => btn.classList.remove("gx2-check-pop"), 450);
  if (getComputedStyle(btn).position === "static") btn.style.position = "relative";
  for (let i = 0; i < 6; i++){
    const p = document.createElement("span");
    p.className = "gx2-particle";
    p.style.setProperty("--gx2-a", `${i * 60}deg`);
    btn.appendChild(p);
    setTimeout(() => p.remove(), 560);
  }
}

function gx2Pop(el){
  if (!el || reduced) return;
  el.classList.remove("gx2-pop");
  void el.offsetWidth;
  el.classList.add("gx2-pop");
  setTimeout(() => el.classList.remove("gx2-pop"), 180);
}
function gx2WatchBadges(){
  const total = $("gx-decision-total");
  const badge = $("gx2-nav-ops-badge");
  if (total && badge){
    const sync = () => {
      const n = gx2ParseNumber(total.textContent);
      badge.textContent = String(n);
      badge.hidden = n === 0;
    };
    new MutationObserver(() => {
      sync();
      if (Date.now() - gx2DecidedAt < 2000){ gx2Pop(badge); gx2Pop(total); }
    }).observe(total, { childList: true, characterData: true, subtree: true });
    sync();
  }
  ["gx-decision-payments", "gx-decision-cancellations", "gx-decision-support",
   "gx-decision-registrations", "gx-ops-registration-count"].forEach(id => {
    const el = $(id);
    if (!el) return;
    new MutationObserver(() => {
      if (Date.now() - gx2DecidedAt < 2000) gx2Pop(el);
    }).observe(el, { childList: true, characterData: true, subtree: true });
  });
}

/* ---------------------------------------------------------------
   CAMPANA: abre el cajón de notificaciones como hoja inferior
   también en teléfono (en la oficial, 14 redirige el toque móvil
   a Operaciones). Se llama a la base (07) para no romper el resto.
   --------------------------------------------------------------- */
(function wrapBell(){
  const prev = window.gxToggleNotifications;
  window.gxToggleNotifications = function(force){
    if (force === false) return typeof prev === "function" ? prev.call(this, force) : undefined;
    if (typeof window.gxToggleNotificationsBase === "function")
      return window.gxToggleNotificationsBase(true);
    const d = $("gx-notification-drawer"), o = $("gx-notification-overlay");
    if (d) d.classList.add("show");
    if (o) o.classList.add("show");
    return undefined;
  };
})();

/* ---------------------------------------------------------------
   CAMBIO DE PESTAÑA: la saliente se atenúa 160 ms y la entrante
   empieza 60 ms después (solape de 60 ms, expo 300 ms). Sin
   solape en movimiento reducido.
   --------------------------------------------------------------- */
(function wrapTabs(){
  const install = () => {
    const prev = window.goAdminTab;
    if (typeof prev !== "function" || prev.__gx2Wrapped) return false;
    const wrapped = function(id, btn){
      const current = document.querySelector(".tab-content.active");
      if (current && current.id !== id && !reduced){
        current.classList.add("gx2-leaving");
        setTimeout(() => {
          prev.call(this, id, btn);
          current.classList.remove("gx2-leaving");
        }, 60);
      } else prev.call(this, id, btn);
    };
    wrapped.__gx2Wrapped = true;
    window.goAdminTab = wrapped;
    return true;
  };
  if (!install()) document.addEventListener("DOMContentLoaded", install);
})();

/* ---------------------------------------------------------------
   ARRASTRE DE HOJAS (solo teléfono): tirar hacia abajo con
   resistencia 0.55; soltar a >120 px o >0.5 px/ms cierra la hoja
   (salida 300 ms); si no, vuelve con muelle 320 ms. El cierre usa
   siempre la función oficial (gxCloseClientFocus,
   gxClosePaymentModal, gxToggleNotifications(false)). El arrastre
   solo arranca desde el tirador o desde los 28 px superiores de
   la hoja, nunca desde botones o campos.
   --------------------------------------------------------------- */
function gx2AttachSheetDrag(sheet, closeFn, handleSel){
  if (!sheet || reduced) return;
  let startY = 0, startT = 0, dy = 0, dragging = false;
  const handle = handleSel ? sheet.querySelector(handleSel) : null;
  const hitZone = e => {
    if (window.innerWidth > 840) return false;
    if (e.target.closest("button, input, select, textarea, a")) return false;
    if (handle && handle.contains(e.target)) return true;
    const r = sheet.getBoundingClientRect();
    return e.clientY - r.top <= 28;
  };
  sheet.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!hitZone(e)) return;
    dragging = true; startY = e.clientY; startT = performance.now(); dy = 0;
    try { sheet.setPointerCapture(e.pointerId); } catch (_) {}
  });
  sheet.addEventListener("pointermove", e => {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    if (dy > 0){
      sheet.classList.add("gx2-dragging");
      sheet.style.transform = `translateY(${dy * 0.55}px)`;
    }
  });
  const finish = () => {
    if (!dragging) return;
    dragging = false;
    const dt = Math.max(1, performance.now() - startT);
    const v = dy / dt;
    sheet.classList.remove("gx2-dragging");
    if (dy > 120 || v > 0.5){
      sheet.classList.add("gx2-closing");
      sheet.style.transform = "translateY(105%)";
      setTimeout(() => {
        sheet.classList.remove("gx2-closing");
        sheet.style.transform = "";
        closeFn();
      }, 300);
    } else if (dy > 0){
      sheet.style.transition = "transform .32s var(--spring-soft)";
      sheet.style.transform = "";
      setTimeout(() => { sheet.style.transition = ""; }, 340);
    }
    dy = 0;
  };
  sheet.addEventListener("pointerup", finish);
  sheet.addEventListener("pointercancel", finish);
}

/* ---------------------------------------------------------------
   REFRESCOS VISIBLES (siempre hay botón; el gesto es secundario)
   --------------------------------------------------------------- */
window.gx2RefreshClients = function(){
  if (typeof window.filtrarClientes === "function") window.filtrarClientes();
  if (typeof window.gxUpdateOperationsSummary === "function") window.gxUpdateOperationsSummary();
};
window.gx2RefreshOps = function(){
  if (typeof window.gxUpdateOperationsSummary === "function") window.gxUpdateOperationsSummary();
  gx2RenderFeed();
};

/* ---------------------------------------------------------------
   PULL-TO-REFRESH (solo listas Clientes y Operaciones, gesto
   secundario). Nunca dentro de hojas/modales; nunca es la única
   forma de refrescar (además está el botón y el Realtime).
   --------------------------------------------------------------- */
(function pullToRefresh(){
  if (!("ontouchstart" in window)) return;
  let startY = 0, active = false, armed = false;
  const ind = $("gx2-ptr-indicator");
  const sheetOpen = () => !!document.querySelector(
    ".gx-client-focus.show, .gx-notification-drawer.show, .gx-payment-modal.show, #gx-tj-overlay.show, .gx-product-builder.show, .gx-benefit-modal.show");
  const inListTab = () => {
    const tab = document.querySelector(".tab-content.active");
    return tab && (tab.id === "tab-clientes" || tab.id === "tab-operaciones");
  };
  document.addEventListener("touchstart", e => {
    if (sheetOpen() || !inListTab() || window.scrollY > 0) { active = false; return; }
    const t = e.target.closest("input, select, textarea, button, a");
    if (t) { active = false; return; }
    active = true; armed = false; startY = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (!active) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 12 && window.scrollY <= 0){
      e.preventDefault();
      armed = dy >= 70;
      if (ind){
        ind.classList.add("show");
        ind.firstElementChild.textContent = armed ? "↑ Suelta para actualizar" : "↓ Sigue bajando para actualizar";
      }
    } else if (ind) ind.classList.remove("show");
  }, { passive: false });
  document.addEventListener("touchend", () => {
    if (!active) return;
    active = false;
    if (ind) ind.classList.remove("show");
    if (armed){
      armed = false;
      if (ind){
        ind.firstElementChild.textContent = "Actualizando…";
        ind.classList.add("show");
        setTimeout(() => ind.classList.remove("show"), 900);
      }
      const tab = document.querySelector(".tab-content.active");
      if (tab?.id === "tab-clientes") window.gx2RefreshClients();
      else window.gx2RefreshOps();
    }
  }, { passive: true });
})();

/* ---------------------------------------------------------------
   INTERCAMBIADOR DE ICONOS (contenido dinámico de los 43 scripts
   oficiales): los glifos emoji/símbolo que 06/07/08/09/10/23/28/34
   inyectan (⛔ 🔔 ✓ ⚠ ◷ 🧪 ⚠️ ⏳ 👁) se sustituyen por el mismo
   SVG del sprite. Observador con debounce de 150 ms, solo en los
   contenedores que mutaron; idempotente (el SVG es un elemento,
   no texto, así que una segunda pasada no lo vuelve a tocar).
   --------------------------------------------------------------- */
const GX2_GLYPH_ICON = { "⛔": "alert", "🔔": "bell", "✓": "check", "⚠": "alert", "◷": "clock", "🧪": "flask", "⏳": "clock", "👁": "eye" };
const GX2_GLYPH_RE = /[⛔🔔✓⚠◷🧪⏳👁]/;
function gx2SwapIconsIn(root){
  if (!root || root.nodeType !== 1) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node){
      if (!GX2_GLYPH_RE.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      const p = node.parentElement;
      if (!p || p.closest("script, style, input, textarea, select")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    const frag = document.createDocumentFragment();
    let rest = node.nodeValue, m;
    while ((m = GX2_GLYPH_RE.exec(rest))){
      if (m.index > 0) frag.appendChild(document.createTextNode(rest.slice(0, m.index)));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "gx2-ic");
      svg.setAttribute("aria-hidden", "true");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      use.setAttribute("href", `#gx2-ic-${GX2_GLYPH_ICON[m[0]]}`);
      svg.appendChild(use);
      frag.appendChild(svg);
      rest = rest.slice(m.index + m[0].length);
    }
    if (rest) frag.appendChild(document.createTextNode(rest));
    node.parentNode.replaceChild(frag, node);
  });
}
(function gx2WatchIcons(){
  const scopeIds = ["gx-focus-overview", "gx-focus-body", "clients-container",
    "gx-mobile-ops-list", "gx-notification-list", "gx-next-payments-list",
    "gx-catalog-mobile-list", "gx-promo-list"];
  const dirty = new Set();
  let timer = 0;
  const flush = () => {
    timer = 0;
    dirty.forEach(id => gx2SwapIconsIn($(id)));
    dirty.clear();
  };
  const queue = id => {
    dirty.add(id);
    if (!timer) timer = setTimeout(flush, 150);
  };
  scopeIds.forEach(id => {
    const el = $(id);
    if (!el) return;
    new MutationObserver(() => queue(id)).observe(el, { childList: true, subtree: true, characterData: true });
    gx2SwapIconsIn(el);
  });
  setTimeout(() => scopeIds.forEach(id => gx2SwapIconsIn($(id))), 1500);
})();

/* ---------------------------------------------------------------
   INICIO: re-render del feed tras cada resumen, "ver más" en
   próximos vencimientos y primera pintura.
   --------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  gx2WatchCounts();
  gx2WatchBadges();
  /* Arrastre de hojas (ficha de cliente, pago, notificaciones). */
  const focusSheet = document.querySelector(".gx-focus-sheet");
  if (focusSheet) gx2AttachSheetDrag(focusSheet, () => { if (typeof window.gxCloseClientFocus === "function") window.gxCloseClientFocus(); }, ".gx-focus-handle");
  const paySheet = document.querySelector(".gx-payment-sheet");
  if (paySheet) gx2AttachSheetDrag(paySheet, () => { if (typeof window.gxClosePaymentModal === "function") window.gxClosePaymentModal(); }, ".gx-focus-handle");
  const drawer = $("gx-notification-drawer");
  if (drawer) gx2AttachSheetDrag(drawer, () => { if (typeof window.gxToggleNotifications === "function") window.gxToggleNotifications(false); }, null);
  /* Stagger de la bandeja de Operaciones en la primera pintura. */
  const opsList = $("gx-mobile-ops-list");
  if (opsList){
    let opsStaggerDone = false, opsTimer = 0;
    new MutationObserver(() => {
      if (opsStaggerDone) return;
      clearTimeout(opsTimer);
      opsTimer = setTimeout(() => {
        const items = [...opsList.children].filter(el => el.classList.contains("gx-mobile-op-item"));
        if (!items.length) return;
        opsStaggerDone = true;
        const stagger = items.length > 1 ? 140 / (items.length - 1) : 0;
        items.forEach((el, i) => el.style.setProperty("--gx2-d", `${Math.round(i * stagger)}ms`));
        setTimeout(() => opsList.classList.add("gx2-no-enter"), 500);
      }, 150);
    }).observe(opsList, { childList: true, subtree: false });
  }
  const upcoming = $("gx-next-payments-list");
  if (upcoming){
    new MutationObserver(gx2ApplyUpcomingMore)
      .observe(upcoming, { childList: true, subtree: false });
    gx2ApplyUpcomingMore();
  }
  /* El feed se re-renderiza cuando el resumen se actualiza (14 ya
     envuelve gxUpdateOperationsSummary; aquí se encadena después). */
  const prevSummary = window.gxUpdateOperationsSummary;
  if (typeof prevSummary === "function"){
    window.gxUpdateOperationsSummary = function(...a){
      const r = prevSummary.apply(this, a);
      setTimeout(gx2RenderFeed, 60);
      return r;
    };
  }
  const prevDecision = window.gxRefreshDecisionCenter;
  if (typeof prevDecision === "function"){
    window.gxRefreshDecisionCenter = function(...a){
      const r = prevDecision.apply(this, a);
      if (r && typeof r.then === "function") r.then(() => setTimeout(gx2RenderFeed, 60));
      else setTimeout(gx2RenderFeed, 60);
      return r;
    };
  }
  setTimeout(gx2RenderFeed, 900);
  setTimeout(gx2RenderFeed, 1800);
  setTimeout(gx2RenderFeed, 4200); /* Si a los 4 s no hay capa de datos,
    el feed muestra el estado "sin sesión" en vez de esqueletos. */
});
})();
