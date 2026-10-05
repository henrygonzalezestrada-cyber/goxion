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

  const emit = (scope, payload = {}) => {
    const key = String(scope || "general");
    clearTimeout(pending.get(key));
    pending.set(key, setTimeout(() => {
      pending.delete(key);
      window.dispatchEvent(new CustomEvent("goxion:realtime", {
        detail: { scope: key, ...payload }
      }));
    }, 350));
  };

  const connect = () => {
    if (channel) return channel;
    channel = client
      .channel("goxion:live", { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "invalidate" }, ({ payload }) => {
        emit(payload?.scope || "general", {
          table: payload?.table || "",
          operation: payload?.operation || "",
          at: payload?.at || Date.now()
        });
      })
      .subscribe((nextStatus, error) => {
        status = nextStatus;
        window.dispatchEvent(new CustomEvent("goxion:realtime:status", {
          detail: { status: nextStatus, error: error || null }
        }));
        if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT") {
          console.warn("GOXION Realtime:", nextStatus, error || "");
        }
        if (nextStatus === "SUBSCRIBED") emit("resync", { operation: "RECONNECT" });
      });
    return channel;
  };

  const disconnect = async () => {
    if (!channel) return;
    const current = channel;
    channel = null;
    await client.removeChannel(current);
    status = "CLOSED";
  };

  window.addEventListener("online", connect);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) emit("resync", { operation: "VISIBLE" });
  });

  window.GOXION_REALTIME = Object.freeze({
    connect,
    disconnect,
    emit,
    getStatus: () => status
  });

  if (navigator.onLine) connect();
})();