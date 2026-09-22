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

  function normalizeActionPayload(payload) {
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

  async function saveFairDeal({
    clienteId,
    clienteServicioId,
    periodo,
    diasFalla = 1,
    motivo = 'Falla técnica',
  } = {}) {
    const cliente_id = String(clienteId || '').trim();
    const cliente_servicio_id = String(clienteServicioId || '').trim();
    const period = String(periodo || '').trim().slice(0, 7);
    const dias_falla = Math.max(1, Math.min(10, Math.trunc(Number(diasFalla || 1))));

    if (!cliente_id || !cliente_servicio_id) throw new Error('Cliente o servicio inválido.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Periodo inválido.');

    const payload = await invoke('trato_justo_guardar', {
      cliente_id,
      cliente_servicio_id,
      periodo: period + '-01',
      dias_falla,
      motivo: String(motivo || 'Falla técnica'),
    });
    return normalizeActionPayload(payload);
  }

  async function deleteFairDeal({ id } = {}) {
    const compensationId = String(id || '').trim();
    if (!compensationId) throw new Error('Falta compensación.');

    const payload = await invoke('trato_justo_eliminar', { id: compensationId });
    return normalizeActionPayload(payload);
  }

  async function applyFairDealBulk({
    clienteIds = [],
    servicioId = '',
    servicioNombre = '',
    periodo,
    diasFalla = 1,
    motivo = 'Falla técnica',
  } = {}) {
    const cliente_ids = [...new Set(
      (Array.isArray(clienteIds) ? clienteIds : [])
        .map(value => String(value || '').trim())
        .filter(Boolean)
    )];
    const period = String(periodo || '').trim().slice(0, 7);
    const dias_falla = Math.max(1, Math.min(10, Math.trunc(Number(diasFalla || 1))));

    if (!cliente_ids.length) throw new Error('Selecciona al menos un cliente.');
    if (!String(servicioId || '').trim() && !String(servicioNombre || '').trim()) {
      throw new Error('Selecciona un servicio.');
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error('Periodo inválido.');

    const payload = await invoke('trato_justo_masivo', {
      cliente_ids,
      servicio_id: String(servicioId || '').trim(),
      servicio_nombre: String(servicioNombre || '').trim(),
      periodo: period + '-01',
      dias_falla,
      motivo: String(motivo || 'Falla técnica'),
    });
    return normalizeActionPayload(payload);
  }


  window.GOXION_FINANCIAL_ACTIONS = Object.freeze({
    CONTRACT_VERSION: '1.1',
    approvePayment,
    saveFairDeal,
    deleteFairDeal,
    applyFairDealBulk,
  });
})();
