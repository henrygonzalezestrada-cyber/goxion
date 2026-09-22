(() => {
  if (window.GOXION_FINANCIAL) return;

  const core = window.GOXION_CORE;
  if (!core) throw new Error('GOXION_CORE no disponible antes del motor financiero.');

  async function invoke(action, data, kind) {
    const isAdmin = kind === 'admin';
    const token = isAdmin ? core.getAdminToken() : core.getClientToken();
    const tokenHeader = isAdmin ? 'X-Admin-Token' : 'X-Client-Token';

    if (!token) {
      throw new Error(isAdmin
        ? 'Sesión administrativa no disponible.'
        : 'Sesión de cliente no disponible.');
    }

    const response = await core.request('estado-financiero', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: action, datos: data || {} }),
      token,
      tokenHeader,
      cache: 'no-store',
    });

    const { json } = await core.parseJSON(response);
    if (!response.ok || json?.ok !== true) {
      throw new Error(json?.error || 'No fue posible consultar el estado financiero.');
    }
    return json;
  }

  async function clientState() {
    const payload = await invoke('mi_estado', {}, 'client');
    return payload.estado_financiero || null;
  }

  async function adminState(clienteId) {
    const id = String(clienteId || '').trim();
    if (!id) throw new Error('Falta cliente_id.');
    const payload = await invoke('obtener_admin', { cliente_id: id }, 'admin');
    return payload.estado_financiero || null;
  }

  async function adminCompare() {
    return invoke('comparar_admin', {}, 'admin');
  }

  window.GOXION_FINANCIAL = Object.freeze({
    MODE: 'shadow',
    CONTRACT_VERSION: '1.0',
    clientState,
    adminState,
    adminCompare,
  });
})();
