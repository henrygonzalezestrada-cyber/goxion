(() => {
  if (window.GOXION_FINANCIAL_ACTIONS) return;

  const core = window.GOXION_CORE;
  if (!core) throw new Error('GOXION_CORE no disponible antes de acciones financieras.');

  async function invoke(action, data = {}) {
    const token = core.getAdminToken();
    if (!token) throw new Error('Sesión administrativa no disponible.');

    const response = await core.request('acciones-financieras', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: action, datos: data }),
      token,
      tokenHeader: 'X-Admin-Token',
      cache: 'no-store',
    });

    const { text, json } = await core.parseJSON(response);
    if (!response.ok || json?.ok !== true) {
      const error = new Error(json?.error || text || `HTTP ${response.status}`);
      error.code = json?.codigo || '';
      error.operationId = json?.operation_id || '';
      error.status = response.status;
      throw error;
    }

    return json;
  }

  async function approvePayment({
    clienteId,
    monto,
    puntual = true,
    notas = 'Aprobado desde Admin',
    periodoEsperado,
  } = {}) {
    const cliente_id = String(clienteId || '').trim();
    const amount = Number(monto);
    const periodo_esperado = String(periodoEsperado || '').trim().slice(0, 7);

    if (!cliente_id) throw new Error('Falta cliente.');
    if (!Number.isFinite(amount)) throw new Error('Monto inválido.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo_esperado)) {
      throw new Error('Periodo de cobro inválido. Recarga la ficha antes de continuar.');
    }

    const payload = await invoke('aprobar_pago', {
      cliente_id,
      monto: amount,
      puntual: puntual !== false,
      notas: String(notas || 'Aprobado desde Admin'),
      periodo_esperado,
    });

    return {
      ...(payload.resultado || {}),
      operation_id: payload.operation_id || '',
      contrato: payload.contrato || '',
      version: payload.version || '',
      estado_anterior: payload.estado_anterior || null,
      estado_financiero: payload.estado_financiero || null,
      estado_financiero_error: payload.estado_financiero_error || null,
    };
  }

  window.GOXION_FINANCIAL_ACTIONS = Object.freeze({
    CONTRACT_VERSION: '1.0',
    approvePayment,
  });
})();
