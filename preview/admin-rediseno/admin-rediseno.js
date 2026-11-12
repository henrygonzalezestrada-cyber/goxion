/* ============================================================
   GOXION // ADMIN — Rediseño (ESPEJO)
   preview/admin-rediseno/admin-rediseno.js
   SOLO espejo. No modifica los 43 scripts oficiales: los envuelve
   (mismo patrón de wrappers que usa Admin) o lee sus globales.
   - Bandeja de decisiones: fork de presentación de buildOps de
     14-admin-mobile-controller.js (misma fuente de datos, mismas
     acciones, sin duplicar lógica de negocio). Si 14 cambia, este
     fork debe revisarse (ver README del espejo).
   - Conteo animado, pop de badge, campana como hoja inferior,
     "ver más" en próximos vencimientos, refrescos y pull-to-refresh.
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

function gx2RenderFeed(){
  const feed = $("gx-decision-feed");
  if (!feed) return;
  if (typeof window.clientesDict === "undefined"){
    /* Sin capa de datos (sin sesión Admin o sin red), los esqueletos no
       deben quedarse para siempre: a los 4 s se muestra el estado real. */
    if (Date.now() - gx2BootAt > 4000){
      feed.innerHTML = `<div class="gx2-feed-empty">Sin sesión Admin: inicia sesión para cargar las decisiones.</div>`;
      feed.classList.add("gx2-no-enter");
    }
    return;
  }
  const rows = gx2FeedRowsForFilter(gx2BuildDecisionRows()).slice(0, 8);
  const total = gx2FeedRowsForFilter(gx2BuildDecisionRows()).length;
  if (!rows.length){
    feed.innerHTML = `<div class="gx2-feed-empty">Nada pendiente en esta categoría. Al corriente.</div>`;
    feed.classList.add("gx2-no-enter");
    return;
  }
  feed.innerHTML = rows.map((x, i) => {
    const safeId = String(x.id || "").replace(/'/g, "");
    const safeKey = String(x.key || "").replace(/'/g, "");
    const amount = (x.category === "review" || x.category === "overdue") && x.amount != null
      ? `<span class="gx2-feed-amount">${money0(x.amount)}</span>` : "";
    return `<article class="gx2-feed-card ${x.category}" style="--gx2-i:${Math.min(i, 5)}">
      <span class="gx2-feed-kind ${x.category}">${GX2_LABELS[x.category] || "Actividad"}</span>
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
   CONTEO ANIMADO (600-800 ms, ease-out) — solo en la primera
   pintura con datos. Los cambios por Realtime no se animan.
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
function gx2AnimateCount(el, from, to, kind, finalText){
  if (reduced || from === to){ el.textContent = finalText; return; }
  const start = performance.now(), dur = 700;
  const fmt = v => kind === "money" ? `$${v.toFixed(2)}`
    : kind === "percent" ? `${v.toFixed(1)}%`
    : kind === "suffixed" ? `${Math.round(v)}${Math.round(v) === 1 ? " pendiente" : " pendientes"}`
    : `${Math.round(v)}`;
  function frame(now){
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = finalText;
  }
  requestAnimationFrame(frame);
}
function gx2WatchCounts(){
  GX2_COUNT_TARGETS.forEach(({ id, kind }) => {
    const el = $(id);
    if (!el) return;
    let done = false;
    const initial = el.textContent;
    const obs = new MutationObserver(() => {
      if (done) return;
      const current = el.textContent;
      if (current === initial) return;
      done = true;
      obs.disconnect();
      gx2AnimateCount(el, gx2ParseNumber(initial), gx2ParseNumber(current), kind, current);
    });
    obs.observe(el, { childList: true, characterData: true, subtree: true });
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
  if (/gxPaymentApprove|gxMarkNotificationRead|gxDeleteNotification|gxPaymentIncomplete|gxPaymentReject|gxConfirmIncomplete|gxOpenDecision/.test(oc)
      || t.closest("#gx-decision-feed") || t.closest("#gx-mobile-ops-list"))
    gx2DecidedAt = Date.now();
}, true);

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
   INICIO: re-render del feed tras cada resumen, "ver más" en
   próximos vencimientos y primera pintura.
   --------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  gx2WatchCounts();
  gx2WatchBadges();
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
