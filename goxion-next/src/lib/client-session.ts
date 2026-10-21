import { SUPABASE_PROJECT_URL } from './contracts';

export const CLIENT_TOKEN_KEY = 'goxion_client_token';

export type GoxionClient = {
  id?: string;
  clave?: string;
  folio?: string;
  nombre?: string;
  usuario_acceso?: string;
  dia_pago?: number;
  estado?: string;
  pago_en_revision?: boolean;
  pago_revision_estado?: string;
  pago_revision_mensaje?: string;
  pago_revision_monto_faltante?: number;
  pago_revision_updated_at?: string | null;
  pagos_puntuales?: number;
  descuento_fallas?: number;
  promo_nuevo_elegible?: boolean;
  origen_cliente?: string;
  created_at?: string | null;
};

export type GoxionService = {
  id?: string;
  nombre?: string;
  monto?: number;
  correo_login?: string;
  perfil_nombre?: string;
  perfil_pin?: string;
  activo?: boolean;
};

export type GoxionPayment = {
  id?: string;
  periodo?: string;
  fecha?: string;
  monto?: number;
  estado?: string;
  notas?: string;
};

export type GoxionMissionProgress = {
  mision_index?: number;
  tipo?: string;
  mision_key?: string;
  completada_at?: string;
  origen?: string;
};

export type GoxionGamification = {
  id?: string;
  misiones_activas?: boolean;
  descuento?: number;
  tareas?: string;
  cupon_reclamado?: boolean;
  cupon_reclamado_at?: string | null;
  misiones_version?: number;
  cupon_ciclo?: number;
  cupon_reclamado_ciclo?: number;
};

export type GoxionReferral = {
  id?: string;
  nombre?: string;
  plataformas?: number;
  meses?: number;
  servicios?: string[];
  fecha_inicio?: string | null;
  progreso_pausado?: boolean;
  meses_override?: number | null;
  meses_efectivos?: number;
  meses_modo?: string;
  activo?: boolean;
  beneficio_reclamado?: boolean;
  beneficio_reclamado_at?: string | null;
};

export type GoxionDiscount = {
  id?: string;
  descripcion?: string;
  monto?: number;
  activo?: boolean;
};

export type GoxionAccountState = {
  cliente_id?: string;
  folio?: string;
  nombre?: string;
  fecha_calculo?: string;
  periodo?: string;
  periodo_key?: string;
  periodo_label?: string;
  dia_pago?: number;
  fecha_corte?: string;
  dias_para_corte?: number;
  dias_atraso?: number;
  estado?: string;
  estado_label?: string;
  estado_db?: string;
  pago_en_revision?: boolean;
  pago_incompleto?: boolean;
  monto_faltante_revision?: number;
  esta_pagado_periodo?: boolean;
  subtotal?: number;
  total_calculado?: number;
  total_actual?: number;
  total_label?: string;
  servicios?: Array<{ id?: string; nombre?: string; monto?: number }>;
  lealtad?: {
    pagos_guardados?: number;
    pagos_efectivos?: number;
    racha_reiniciada_virtual?: boolean;
    nivel?: number;
    porcentaje?: number;
    monto?: number;
  };
  descuentos?: {
    lealtad?: number;
    especiales?: number;
    trato_justo?: number;
    programados?: number;
    total?: number;
    detalles?: Array<Record<string, unknown>>;
  };
  cargos?: {
    mora?: number;
    mora_porcentaje?: number;
    reactivacion?: number;
    total?: number;
  };
  beneficios_programados?: Array<Record<string, unknown>>;
  desglose?: Array<{
    tipo?: string;
    subtipo?: string;
    concepto?: string;
    monto?: number;
    porcentaje?: number;
  }>;
  fuente?: string;
};

export type GoxionAccess = {
  id?: string;
  cliente_servicio_id?: string;
  servicio_id?: string;
  servicio?: string;
  modo_acceso?: string;
  ordinal?: number;
  cuenta_id?: string | null;
  cuenta_alias?: string;
  correo?: string;
  perfil_nombre?: string;
  perfil_pin?: string;
  estado_invitacion?: string;
  configurado?: boolean;
};

export type CredentialDelivery = {
  id?: string;
  credencial_id?: string;
  cliente_servicio_id?: string;
  estado?: string;
  disponible_desde?: string | null;
  expira_at?: string | null;
  vista_at?: string | null;
  created_at?: string | null;
  plataforma?: string;
  servicio_nombre?: string;
  cuenta_login?: string;
  version?: number;
  activa?: boolean;
  servicio_activo?: boolean;
};

export type ServiceNovelty = {
  id?: string;
  cliente_servicio_id?: string;
  tipo?: string;
  titulo?: string;
  resumen?: string;
  referencia?: string;
  prioridad?: number;
  expira_at?: string | null;
  created_at?: string | null;
};

export type CancellationRequest = {
  id?: string;
  cliente_servicio_id?: string;
  estado?: string;
  motivo?: string;
  nota_admin?: string;
  solicitada_at?: string | null;
  resuelta_at?: string | null;
  fecha_efectiva?: string | null;
  efectiva_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  servicio_nombre?: string;
  servicio_activo?: boolean;
};

export type ClientSpaceData = {
  ok: boolean;
  cliente?: GoxionClient;
  servicios?: GoxionService[];
  pagos?: GoxionPayment[];
  estado_cuenta?: GoxionAccountState | null;
  gamificacion?: GoxionGamification | null;
  misiones_progreso?: GoxionMissionProgress[];
  referidos?: GoxionReferral[];
  descuentos?: GoxionDiscount[];
  cliente_accesos?: GoxionAccess[];
  credenciales_entregas?: CredentialDelivery[];
  novedades_servicio?: ServiceNovelty[];
  cancelaciones?: CancellationRequest[];
  catalogo?: Array<Record<string, unknown>>;
  alertas?: Record<string, unknown> | null;
  configuracion?: Record<string, unknown> | null;
  error?: string;
};

type LoginResponse = {
  ok: boolean;
  session_token?: string;
  cliente?: GoxionClient;
  error?: string;
};

type PrivateListResponse = {
  ok: boolean;
  accesos?: GoxionAccess[];
  entregas?: CredentialDelivery[];
  novedades?: ServiceNovelty[];
  solicitudes?: CancellationRequest[];
  estado_cuenta?: GoxionAccountState;
  error?: string;
};

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const value = payload as { error?: unknown };
    const message =
      typeof value.error === 'string'
        ? value.error
        : text || 'GOXION API error ' + response.status;
    throw new Error(message);
  }

  return payload as T;
}

async function privateRequest<T>(
  token: string,
  functionName: string,
  accion = 'listar',
  datos: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/' + functionName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: JSON.stringify({ accion, datos }),
      cache: 'no-store',
    },
  );
  return parseResponse<T>(response);
}

async function hydratePrivateExtras(
  base: ClientSpaceData,
  token: string,
): Promise<ClientSpaceData> {
  const [cancellations, credentials, news, account, accesses] =
    await Promise.allSettled([
      privateRequest<PrivateListResponse>(
        token,
        'cancelaciones-cliente',
        'listar',
      ),
      privateRequest<PrivateListResponse>(
        token,
        'credenciales-cliente',
        'listar',
      ),
      privateRequest<PrivateListResponse>(
        token,
        'novedades-cliente',
        'listar',
      ),
      privateRequest<PrivateListResponse>(
        token,
        'estado-cuenta-beta',
        'mi_estado',
      ),
      privateRequest<PrivateListResponse>(
        token,
        'accesos-cliente-beta',
        'listar',
      ),
    ]);

  return {
    ...base,
    cancelaciones:
      cancellations.status === 'fulfilled'
        ? cancellations.value.solicitudes ?? []
        : [],
    credenciales_entregas:
      credentials.status === 'fulfilled'
        ? credentials.value.entregas ?? []
        : [],
    novedades_servicio:
      news.status === 'fulfilled' ? news.value.novedades ?? [] : [],
    estado_cuenta:
      account.status === 'fulfilled'
        ? account.value.estado_cuenta ?? base.estado_cuenta ?? null
        : base.estado_cuenta ?? null,
    cliente_accesos:
      accesses.status === 'fulfilled' ? accesses.value.accesos ?? [] : [],
  };
}

export async function loadClientSpace(token: string): Promise<ClientSpaceData> {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/mi-espacio',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: '{}',
      cache: 'no-store',
    },
  );

  const data = await parseResponse<ClientSpaceData>(response);
  if (data.ok !== true || !data.cliente) {
    throw new Error(data.error || 'No fue posible abrir Mi Espacio.');
  }

  return hydratePrivateExtras(data, token);
}

export async function loginClient(nombre: string, pin: string) {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/login-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, pin }),
      cache: 'no-store',
    },
  );

  const login = await parseResponse<LoginResponse>(response);
  if (login.ok !== true || !login.session_token || !login.cliente) {
    throw new Error(login.error || 'Datos incorrectos.');
  }

  const space = await loadClientSpace(login.session_token);
  localStorage.setItem(CLIENT_TOKEN_KEY, login.session_token);
  return { token: login.session_token, login, space };
}

export async function restoreClientSession() {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) return null;

  try {
    const space = await loadClientSpace(token);
    return { token, space };
  } catch {
    localStorage.removeItem(CLIENT_TOKEN_KEY);
    return null;
  }
}

export async function refreshClientSpace() {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');
  return loadClientSpace(token);
}

export async function revealCredential(entregaId: string, pin: string) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{
    ok: boolean;
    cliente_servicio_id?: string;
    plataforma?: string;
    cuenta_login?: string;
    version?: number;
    password?: string;
    vista_at?: string;
    one_time?: boolean;
    error?: string;
  }>(token, 'credenciales-cliente', 'revelar', {
    entrega_id: entregaId,
    pin,
  });
}

export async function markServiceNewsRead(clienteServicioId: string) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{ ok: boolean; marcadas?: number }>(
    token,
    'novedades-cliente',
    'marcar_servicio',
    { cliente_servicio_id: clienteServicioId },
  );
}

export async function claimCoupon() {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/mi-espacio',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: JSON.stringify({ modo: 'reclamar_cupon' }),
      cache: 'no-store',
    },
  );

  return parseResponse<{
    ok: boolean;
    ya_reclamado?: boolean;
    cupon_reclamado?: boolean;
    descuento?: number;
    ciclo?: number;
    reclamado_at?: string;
    error?: string;
  }>(response);
}

export async function claimReferralMonth() {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/mi-espacio',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: JSON.stringify({ modo: 'reclamar_mes_referido' }),
      cache: 'no-store',
    },
  );

  return parseResponse<{
    ok: boolean;
    ya_reclamado?: boolean;
    beneficio_reclamado?: boolean;
    referido?: string;
    reclamado_at?: string;
    error?: string;
  }>(response);
}

export async function submitPaymentProof(input: {
  file: File;
  titulo?: string;
  mensaje?: string;
}) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  const markResponse = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/mi-espacio',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: JSON.stringify({ modo: 'marcar_pago_revision' }),
      cache: 'no-store',
    },
  );

  const marked = await parseResponse<{ ok: boolean; error?: string }>(markResponse);
  if (marked.ok !== true) {
    throw new Error(marked.error || 'No fue posible marcar el pago para revisión.');
  }

  const form = new FormData();
  form.set('categoria', 'pagos');
  form.set('file', input.file, input.file.name || 'comprobante.jpg');
  form.set(
    'payload_json',
    JSON.stringify({
      embeds: [
        {
          title: input.titulo || '💳 Comprobante recibido',
          description:
            input.mensaje ||
            'El cliente envió un comprobante de pago desde GOXION.',
          color: 3055683,
        },
      ],
    }),
  );

  const notifyResponse = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/notificar-goxion',
    {
      method: 'POST',
      headers: { 'X-Client-Token': token },
      body: form,
      cache: 'no-store',
    },
  );

  const notified = await parseResponse<{ ok: boolean; error?: string }>(
    notifyResponse,
  );
  if (notified.ok !== true) {
    throw new Error(notified.error || 'No fue posible enviar el comprobante.');
  }

  return { ok: true };
}


export type RetentionOffer = {
  id?: string;
  servicio_nombre?: string;
  porcentaje?: number;
  monto_base?: number;
  monto_descuento?: number;
  monto_final?: number;
  periodo_aplicacion?: string;
  uso_unico?: boolean;
};

export async function evaluateCancellationRetention(clienteServicioId: string) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{
    ok: boolean;
    elegible?: boolean;
    razon?: string;
    oferta?: RetentionOffer;
    error?: string;
  }>(token, 'cancelaciones-cliente', 'evaluar_retencion', {
    cliente_servicio_id: clienteServicioId,
  });
}

export async function acceptCancellationRetention(ofertaId: string) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{
    ok: boolean;
    aceptada?: boolean;
    oferta?: RetentionOffer;
    error?: string;
  }>(token, 'cancelaciones-cliente', 'aceptar_retencion', {
    oferta_id: ofertaId,
  });
}

export async function rejectCancellationRetention(ofertaId: string) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{
    ok: boolean;
    rechazada?: boolean;
    error?: string;
  }>(token, 'cancelaciones-cliente', 'rechazar_retencion', {
    oferta_id: ofertaId,
  });
}

export async function requestServiceCancellation(
  clienteServicioId: string,
  motivo = 'Solicitud desde Mi Espacio',
) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Sesión requerida.');

  return privateRequest<{
    ok: boolean;
    already_open?: boolean;
    solicitud?: CancellationRequest;
    error?: string;
  }>(token, 'cancelaciones-cliente', 'crear', {
    cliente_servicio_id: clienteServicioId,
    motivo,
  });
}

export async function sendSupportRequest(input: {
  titulo: string;
  mensaje: string;
}) {
  const token = localStorage.getItem(CLIENT_TOKEN_KEY) || '';
  if (!token) throw new Error('Inicia sesión para enviar una solicitud de soporte.');

  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/notificar-goxion',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Token': token,
      },
      body: JSON.stringify({
        categoria: 'soporte',
        titulo: input.titulo,
        mensaje: input.mensaje,
        colorHex: '00f2fe',
      }),
      cache: 'no-store',
    },
  );

  const result = await parseResponse<{ ok: boolean; error?: string }>(response);
  if (result.ok !== true) {
    throw new Error(result.error || 'No fue posible enviar la solicitud.');
  }
  return result;
}

export function logoutClient() {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}
