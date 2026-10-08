(() => {
  if (window.GOXION_REALTIME) return;

  const GXCORE = window.GOXION_CORE;
  const supabaseLib = window.supabase;
  if (!GXCORE || !supabaseLib?.createClient) {
    console.warn("GOXION Realtime: cliente Supabase no disponible.");
    return;
  }

  const PUBLISHABLE_KEY = "sb_publishable_5oY3Fodu8NgppBXNR0QBMQ_RIU7ZfGd";
  const client = supabaseLib.createClient(GXCORE.SUPABASE_ORIGIN, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });

  const pending = new Map();
  let channel = null;
  let status = "CLOSED";
  let hasSubscribedOnce = false;
  let reconnectTimer = null;
  let manualClose = false;

  const emit = (scope, payload = {}) => {
    const key = String(scope || "general");
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => {
      pending.delete(key);
      window.dispatchEvent(new CustomEvent("goxion:realtime", {
        detail: { scope: key, ...payload }
      }));
    }, 220));
  };

  const dispatchStatus = (nextStatus, error = null) => {
    status = nextStatus;
    window.dispatchEvent(new CustomEvent("goxion:realtime:status", {
      detail: { status: nextStatus, error: error || null }
    }));
  };

  const clearReconnect = () => {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = (delay = 1200) => {
    if (manualClose || reconnectTimer || !navigator.onLine) return;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      if (manualClose || !navigator.onLine) return;

      const stale = channel;
      channel = null;
      if (stale) {
        try { await client.removeChannel(stale); } catch (_) {}
      }
      connect();
    }, delay);
  };

  function connect() {
    manualClose = false;

    if (channel && status === "SUBSCRIBED") return channel;
    if (channel) {
      scheduleReconnect(0);
      return channel;
    }

    const current = client
      .channel("goxion:live", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "invalidate" }, ({ payload }) => {
        emit(payload?.scope || "general", {
          table: payload?.table || "",
          operation: payload?.operation || "",
          at: payload?.at || Date.now()
        });
      });

    channel = current;

    current.subscribe((nextStatus, error) => {
      if (current !== channel) return;
      dispatchStatus(nextStatus, error);

      if (nextStatus === "SUBSCRIBED") {
        clearReconnect();
        if (hasSubscribedOnce) emit("resync", { operation: "RECONNECT" });
        hasSubscribedOnce = true;
        return;
      }

      if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(nextStatus)) {
        if (nextStatus !== "CLOSED" || !manualClose) {
          console.warn("GOXION Realtime:", nextStatus, error || "");
        }
        scheduleReconnect(nextStatus === "CLOSED" ? 700 : 1200);
      }
    });

    return current;
  }

  const disconnect = async () => {
    manualClose = true;
    clearReconnect();
    if (!channel) {
      dispatchStatus("CLOSED");
      return;
    }
    const current = channel;
    channel = null;
    try { await client.removeChannel(current); } catch (_) {}
    dispatchStatus("CLOSED");
  };

  window.addEventListener("online", () => {
    if (status !== "SUBSCRIBED") scheduleReconnect(0);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden || !navigator.onLine) return;

    if (status === "SUBSCRIBED") {
      emit("resync", { operation: "VISIBLE" });
    } else {
      scheduleReconnect(0);
    }
  });

  window.GOXION_REALTIME = Object.freeze({
    connect,
    disconnect,
    emit,
    getStatus: () => status
  });

  if (navigator.onLine) connect();
})();