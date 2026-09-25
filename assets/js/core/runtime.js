(() => {
  if (window.GOXION_CORE) return;

  const SUPABASE_ORIGIN = 'https://hmpevcwodcgbkviarfic.supabase.co';

  const ENDPOINTS = Object.freeze({
    'acciones-financieras': 'acciones-financieras',
    'accesos-cliente-beta': 'accesos-cliente-beta',
    'activar-cuenta-goxion': 'activar-cuenta-goxion',
    'cancelaciones-cliente': 'cancelaciones-cliente',
    'credenciales-cliente': 'credenciales-cliente',
    'estado-cuenta-beta': 'estado-cuenta-beta',
    'estado-financiero': 'estado-financiero',
    'inventario-publico': 'inventario-publico',
    'login-goxion': 'login-goxion',
    'mi-espacio': 'mi-espacio',
    'notificar-goxion': 'notificar-goxion',
    'novedades-cliente': 'novedades-cliente',
    'registro-goxion': 'registro-goxion',

    'periodo-cobro': 'periodo-cobro',
    'trato-justo': 'trato-justo',

    'accesos-admin-beta': 'accesos-admin-beta',
    'admin-acciones': 'admin-acciones',
    'admin-ajustes': 'admin-ajustes',
    'admin-datos': 'admin-datos',
    'admin-operaciones': 'admin-operaciones',
    'beneficios-admin-beta': 'beneficios-admin-beta',
    'cancelaciones-admin': 'cancelaciones-admin',
    'credenciales-admin-beta': 'credenciales-admin-beta',
    'cuentas-plataforma-admin-beta': 'cuentas-plataforma-admin-beta',
    'inventario': 'inventario',
    'login-admin': 'login-admin',
    'promociones-admin-beta': 'promociones-admin-beta',
    'registro-admin': 'registro-admin',
  });

  const STORAGE = Object.freeze({
    CLIENT_TOKEN: 'goxion_client_token',
    ADMIN_TOKEN: 'GOXION_ADMIN_TOKEN',
  });

  const BUSINESS = Object.freeze({
    WHATSAPP: '528136836901',
    BANK: Object.freeze({
      // Compatibilidad: la cuenta principal conserva las claves históricas.
      NAME: 'NU BANCO',
      HOLDER: 'Henry González',
      CLABE: '638180000167909381',
      ACCOUNTS: Object.freeze([
        Object.freeze({
          ID: 'nu',
          LABEL: 'Nu',
          INSTITUTION: 'Nu México',
          HOLDER: 'Henry González',
          CLABE: '638180000167909381',
          CURRENCY: 'MXN',
          PRIMARY: true,
        }),
        Object.freeze({
          ID: 'revolut',
          LABEL: 'Revolut',
          INSTITUTION: 'STP',
          HOLDER: 'Henry González Estrada',
          CLABE: '646990404063309449',
          CURRENCY: 'MXN',
          PRIMARY: false,
        }),
      ]),
    }),
    CHANNELS: Object.freeze({
      pedidos: 'goxion://pedidos',
      soporte: 'goxion://soporte',
      logins: 'goxion://logins',
      pagos: 'goxion://pagos',
    }),
  });

  const nativeFetch = window.fetch.bind(window);

  const endpoint = (name) => {
    const slug = ENDPOINTS[name] || String(name || '').trim();
    if (!slug) throw new Error('Endpoint GOXION no definido.');
    return SUPABASE_ORIGIN + '/functions/v1/' + slug;
  };

  const parseJSON = async (response) => {
    const text = await response.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {}
    return { text, json };
  };

  const getClientToken = () =>
    localStorage.getItem(STORAGE.CLIENT_TOKEN) || '';

  const getAdminToken = () =>
    localStorage.getItem(STORAGE.ADMIN_TOKEN) || '';

  const request = async (
    name,
    {
      method = 'POST',
      headers = {},
      body,
      token,
      tokenHeader,
      cache,
      fetchImpl = nativeFetch,
    } = {},
  ) => {
    const finalHeaders = { ...headers };
    if (token && tokenHeader) finalHeaders[tokenHeader] = token;

    return fetchImpl(endpoint(name), {
      method,
      headers: finalHeaders,
      body,
      ...(cache ? { cache } : {}),
    });
  };

  window.GOXION_CORE = Object.freeze({
    SUPABASE_ORIGIN,
    ENDPOINTS,
    STORAGE,
    BUSINESS,
    endpoint,
    parseJSON,
    getClientToken,
    getAdminToken,
    nativeFetch,
    request,
  });
})();
