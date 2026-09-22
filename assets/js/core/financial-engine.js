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

  function selectCompatibleState(legacyState, financialState, expectedClientId = "") {
    const legacy = legacyState && typeof legacyState === 'object' ? legacyState : null;
    const financial = financialState && typeof financialState === 'object' ? financialState : null;
    const expectedId = String(expectedClientId || '').trim();
    const money = value => Number.isFinite(Number(value)) && Number(value) >= 0;

    const validFinancial = Boolean(
      financial &&
      financial.fuente_financiera === 'supabase:goxion_estado_financiero' &&
      financial.contrato_financiero?.version === '1.0' &&
      financial.contrato_financiero?.modo === 'sombra' &&
      money(financial.subtotal) &&
      money(financial.total_actual) &&
      /^\d{4}-\d{2}/.test(String(financial.periodo || '')) &&
      (!expectedId || !financial.cliente_id || String(financial.cliente_id) === expectedId)
    );

    const fields = [
      ['periodo', value => String(value || ''), state => state?.periodo],
      ['estado', value => String(value || ''), state => state?.estado],
      ['subtotal', value => Number(value || 0), state => state?.subtotal],
      ['total_actual', value => Number(value || 0), state => state?.total_actual],
      ['pagos_efectivos', value => Number(value || 0), state => state?.lealtad?.pagos_efectivos],
      ['nivel_lealtad', value => Number(value || 0), state => state?.lealtad?.nivel],
      ['mora', value => Number(value || 0), state => state?.cargos?.mora],
      ['reactivacion', value => Number(value || 0), state => state?.cargos?.reactivacion],
      ['pago_en_revision', value => value === true, state => state?.pago_en_revision],
      ['pago_incompleto', value => value === true, state => state?.pago_incompleto],
    ];

    const differences = [];
    if (legacy && financial) {
      for (const [field, normalize, pick] of fields) {
        const a = normalize(pick(legacy));
        const b = normalize(pick(financial));
        if (typeof a === 'number' && typeof b === 'number') {
          if (Math.abs(a - b) >= 0.005) differences.push({ field, legacy:a, financial:b });
        } else if (a !== b) {
          differences.push({ field, legacy:a, financial:b });
        }
      }
    }

    const compared = Boolean(legacy && financial);
    const matches = compared ? differences.length === 0 : null;
    const useFinancial = validFinancial && (!legacy || matches === true);
    const state = useFinancial ? financial : legacy;

    return {
      state,
      audit: {
        source: useFinancial
          ? 'financial-v1'
          : (validFinancial && legacy && matches === false
            ? 'legacy-variance-fallback'
            : (legacy ? 'legacy-fallback' : 'none')),
        financial_valid: validFinancial,
        compared,
        matches,
        differences
      }
    };
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
    selectCompatibleState,
  });
})();
