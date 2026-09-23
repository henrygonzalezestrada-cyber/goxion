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


  async function savePromotion(data = {}) {
    const payload = await invoke('promocion_guardar', { ...data });
    return normalizeActionPayload(payload);
  }

  async function togglePromotion({ id, activa } = {}) {
    const promotionId = String(id || '').trim();
    if (!promotionId) throw new Error('Falta promoción.');
    const payload = await invoke('promocion_estado', { id: promotionId, activa: activa === true });
    return normalizeActionPayload(payload);
  }

  async function deletePromotion({ id } = {}) {
    const promotionId = String(id || '').trim();
    if (!promotionId) throw new Error('Falta promoción.');
    const payload = await invoke('promocion_eliminar', { id: promotionId });
    return normalizeActionPayload(payload);
  }

  async function assignPromotion({
    clienteServicioId,
    promocionId,
    periodoInicio = '',
  } = {}) {
    const cliente_servicio_id = String(clienteServicioId || '').trim();
    const promocion_id = String(promocionId || '').trim();
    if (!cliente_servicio_id || !promocion_id) throw new Error('Servicio o promoción inválida.');
    const payload = await invoke('promocion_asignar', {
      cliente_servicio_id,
      promocion_id,
      periodo_inicio: String(periodoInicio || '').trim(),
    });
    return normalizeActionPayload(payload);
  }

  async function removePromotionAssignment({ id } = {}) {
    const assignmentId = String(id || '').trim();
    if (!assignmentId) throw new Error('Falta asignación.');
    const payload = await invoke('promocion_quitar_asignacion', { id: assignmentId });
    return normalizeActionPayload(payload);
  }

  async function registerPartialPayment({
    clienteId,
    saldoRestante,
    notas = 'Pago parcial registrado',
    periodoEsperado,
  } = {}) {
    const cliente_id = String(clienteId || '').trim();
    const saldo_restante = Number(saldoRestante);
    const periodo_esperado = String(periodoEsperado || '').trim().slice(0, 7);
    if (!cliente_id || !(saldo_restante > 0)) throw new Error('Cliente o saldo restante inválido.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo_esperado)) throw new Error('Periodo inválido.');
    const payload = await invoke('registrar_pago_parcial', {
      cliente_id,
      saldo_restante,
      notas: String(notas || 'Pago parcial registrado'),
      periodo_esperado,
    });
    return normalizeActionPayload(payload);
  }

  async function pactPaymentDate({
    clienteId,
    fechaPactada,
    motivo = 'Acuerdo de pago',
    periodoEsperado,
  } = {}) {
    const cliente_id = String(clienteId || '').trim();
    const fecha_pactada = String(fechaPactada || '').trim().slice(0, 10);
    const periodo_esperado = String(periodoEsperado || '').trim().slice(0, 7);
    if (!cliente_id || !/^\d{4}-\d{2}-\d{2}$/.test(fecha_pactada)) throw new Error('Cliente o fecha pactada inválida.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo_esperado)) throw new Error('Periodo inválido.');
    const payload = await invoke('pactar_fecha_pago', {
      cliente_id,
      fecha_pactada,
      motivo: String(motivo || 'Acuerdo de pago'),
      periodo_esperado,
    });
    return normalizeActionPayload(payload);
  }

  async function cancelPactPaymentDate({
    clienteId,
    periodoEsperado,
  } = {}) {
    const cliente_id = String(clienteId || '').trim();
    const periodo_esperado = String(periodoEsperado || '').trim().slice(0, 7);
    if (!cliente_id) throw new Error('Falta cliente.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo_esperado)) throw new Error('Periodo inválido.');
    const payload = await invoke('cancelar_fecha_pactada', { cliente_id, periodo_esperado });
    return normalizeActionPayload(payload);
  }


  window.GOXION_FINANCIAL_ACTIONS = Object.freeze({
    CONTRACT_VERSION: '1.2',
    approvePayment,
    saveFairDeal,
    deleteFairDeal,
    applyFairDealBulk,
    savePromotion,
    togglePromotion,
    deletePromotion,
    assignPromotion,
    removePromotionAssignment,
    registerPartialPayment,
    pactPaymentDate,
    cancelPactPaymentDate,
  });
})();
