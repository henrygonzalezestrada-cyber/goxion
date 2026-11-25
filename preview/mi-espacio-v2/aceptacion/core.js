(() => {
  if (window.GOXION_CORE) return;

  const SUPABASE_ORIGIN = 'https://nsvybyvvdpdgbgtvydfb.supabase.co';

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
    'goxy-ai-beta': 'goxy-ai-qa',
    'goxy-vision-qa': 'goxy-vision-qa',
    'legal-consent-v2': 'legal-consent-v2',
    'mi-espacio': 'mi-espacio',
    'notificar-goxion': 'notificar-goxion',
    'notificaciones-cliente': 'notificaciones-cliente',
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
    WHATSAPP:"",BANK:Object.freeze({NAME:"BANCO NO OPERATIVO",HOLDER:"SOLO ACEPTACIÓN QA",CLABE:"000000000000000000",
    ACCOUNTS:Object.freeze([Object.freeze({ID:"qa",LABEL:"Prueba",INSTITUTION:"Sin transferencia real",HOLDER:"SOLO ACEPTACIÓN QA",CLABE:"000000000000000000",CURRENCY:"MXN",PRIMARY:true})])}),
    CHANNELS:Object.freeze({pedidos:"",soporte:"",logins:"",pagos:""})
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
