import { SUPABASE_PROJECT_URL } from './contracts';

export const ADMIN_TOKEN_KEY = 'GOXION_ADMIN_TOKEN';

export type AdminClient = {
  id: string;
  clave?: string;
  folio?: string;
  nombre?: string;
  dia_pago?: number;
  estado?: string;
  pago_en_revision?: boolean;
  pago_revision_estado?: string;
  pago_revision_mensaje?: string | null;
  pago_revision_monto_faltante?: number;
  pago_revision_updated_at?: string | null;
  pagos_puntuales?: number;
  created_at?: string;
  updated_at?: string;
};

export type AdminCatalogService = {
  id: string;
  nombre?: string;
  precio?: number;
  costo?: number;
  cuentas?: number;
  limite?: number;
  etiqueta?: string | null;
  beneficios?: unknown;
  activo?: boolean;
  stock_manual?: number | null;
  tipo_producto?: string;
  modo_acceso?: string;
};

export type AdminClientService = {
  id: string;
  cliente_id?: string;
  servicio_id?: string | null;
  nombre?: string;
  monto?: number;
  correo_login?: string;
  perfil_nombre?: string;
  perfil_pin?: string;
  activo?: boolean;
};

export type AdminPayment = {
  id: string;
  cliente_id?: string;
  fecha?: string;
  periodo?: string;
  monto?: number;
  estado?: string;
  notas?: string;
};

export type AdminNotification = {
  id: string;
  cliente_id?: string | null;
  cliente_nombre?: string | null;
  tipo?: string;
  titulo?: string;
  mensaje?: string;
  referencia?: string | null;
  leida?: boolean;
  created_at?: string;
};

export type AdminReferral = Record<string, unknown> & {
  id?: string;
  cliente_id?: string;
  nombre?: string;
  plataformas?: number;
  meses?: number;
  servicios?: string[];
  fecha_inicio?: string | null;
  progreso_pausado?: boolean;
  meses_override?: number | null;
  beneficio_reclamado?: boolean;
  beneficio_reclamado_at?: string | null;
  activo?: boolean;
};

export type AdminGamification = Record<string, unknown> & {
  id?: string;
  cliente_id?: string;
  misiones_activas?: boolean;
  descuento?: number;
  tareas?: string;
  cupon_reclamado?: boolean;
  misiones_version?: number;
  cupon_ciclo?: number;
};

export type AdminData = {
  ok: boolean;
  clientes: AdminClient[];
  catalogo: AdminCatalogService[];
  cliente_servicios: AdminClientService[];
  pagos: AdminPayment[];
  referidos: AdminReferral[];
  descuentos: Array<Record<string, unknown>>;
  gamificacion: AdminGamification[];
  alertas: Array<Record<string, unknown>>;
  configuracion: Record<string, unknown> | null;
  notificaciones: AdminNotification[];
  error?: string;
};

export type AdminAccountState = {
  cliente_id?: string;
  folio?: string;
  nombre?: string;
  periodo?: string;
  periodo_label?: string;
  dia_pago?: number;
  fecha_corte?: string;
  dias_para_corte?: number;
  dias_atraso?: number;
  estado?: string;
  estado_label?: string;
  subtotal?: number;
  total_actual?: number;
  lealtad?: {
    nivel?: number;
    porcentaje?: number;
    pagos_efectivos?: number;
  };
  cargos?: {
    mora?: number;
    reactivacion?: number;
    total?: number;
  };
  error?: string;
};

export type RegistrationRequest = {
  id: string;
  nombre_declarado?: string;
  telefono_normalizado?: string;
  resultado?: string;
  cliente_id?: string | null;
  elegible_promocion?: boolean;
  estado_admin?: string;
  detalle?: string;
  created_at?: string;
  updated_at?: string;
  activacion?: RegistrationActivation | null;
};

export type RegistrationActivation = {
  id?: string;
  solicitud_id?: string;
  cliente_id?: string;
  nombre_declarado?: string;
  telefono_normalizado?: string;
  goxion_id?: string;
  estado?: string;
  codigo_generado_at?: string | null;
  expira_at?: string | null;
  intentos_fallidos?: number;
  max_intentos?: number;
  regeneraciones?: number;
  activada_at?: string | null;
};

export type RegistrationSummary = {
  foco_rojo?: number;
  nuevos_pendientes?: number;
  activaciones_pendientes?: number;
  activaciones_bloqueadas?: number;
  activaciones_expiradas?: number;
  activadas?: number;
  legacy_sin_telefono?: number;
};

export type RegistrationData = {
  ok: boolean;
  clientes?: Array<Record<string, unknown>>;
  solicitudes?: RegistrationRequest[];
  activaciones?: RegistrationActivation[];
  resumen?: RegistrationSummary;
  error?: string;
};

export type Promotion = {
  id?: string;
  servicio_id?: string;
  nombre?: string;
  precio_promocional?: number;
  duracion_periodos?: number;
  inicio?: string;
  fin?: string;
  mostrar_precio_anterior?: boolean;
  mostrar_contador?: boolean;
  oferta_flash?: boolean;
  activa?: boolean;
  estado_visual?: string;
  servicio?: AdminCatalogService | null;
};

export type Benefit = Record<string, unknown> & {
  id?: string;
  cliente_id?: string;
  concepto?: string;
  tipo?: string;
  valor?: number;
  periodo_inicio?: string;
  periodos_total?: number;
  periodos_consumidos?: number;
  origen?: string;
  estado?: string;
  estado_visual?: string;
  activo?: boolean;
};

export type Cancellation = Record<string, unknown> & {
  id?: string;
  cliente_id?: string;
  cliente_servicio_id?: string;
  estado?: string;
  motivo?: string;
  nota_admin?: string;
  fecha_efectiva?: string | null;
  servicio_nombre?: string;
};

export type FairDeal = Record<string, unknown> & {
  id?: string;
  cliente_id?: string;
  cliente_servicio_id?: string;
  periodo?: string;
  dias_falla?: number;
  porcentaje?: number;
  monto?: number;
  motivo?: string;
  activo?: boolean;
};

export type AccessModel = {
  ok: boolean;
  servicios?: AdminCatalogService[];
  componentes?: Array<Record<string, unknown>>;
  cuentas?: Array<Record<string, unknown>>;
  accesos?: Array<Record<string, unknown>>;
  error?: string;
};

export type MotherAccount = Record<string, unknown> & {
  id?: string;
  servicio_id?: string;
  alias?: string;
  correo_login?: string;
  limite_perfiles?: number;
  activo?: boolean;
  ocupados?: number;
  disponibles?: number;
  clientes?: Array<Record<string, unknown>>;
};

export type CredentialAdminData = {
  ok: boolean;
  credenciales?: Array<Record<string, unknown>>;
  entregas?: Array<Record<string, unknown>>;
  error?: string;
};

type LoginResponse = {
  ok: boolean;
  token?: string;
  expires_in?: number;
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
    if (response.status === 401) localStorage.removeItem(ADMIN_TOKEN_KEY);
    throw new Error(
      typeof value.error === 'string'
        ? value.error
        : text || 'GOXION Admin API error ' + response.status,
    );
  }

  return payload as T;
}

export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

export function logoutAdmin() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function loginAdmin(usuario: string, password: string) {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/login-admin',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, password }),
      cache: 'no-store',
    },
  );

  const data = await parseResponse<LoginResponse>(response);
  if (data.ok !== true || !data.token) {
    throw new Error(data.error || 'No fue posible iniciar sesión.');
  }
  localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
  return data.token;
}

export async function adminRequest<T>(
  functionName: string,
  accion?: string,
  datos: Record<string, unknown> = {},
): Promise<T> {
  const token = getAdminToken();
  if (!token) throw new Error('Sesión administrativa requerida.');

  const body =
    accion === undefined ? {} : { accion, datos };

  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/' + functionName,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  );
  return parseResponse<T>(response);
}

export async function loadAdminData(): Promise<AdminData> {
  const data = await adminRequest<AdminData>('admin-datos');
  if (data.ok !== true) throw new Error(data.error || 'No fue posible cargar Admin.');
  return {
    ...data,
    clientes: data.clientes || [],
    catalogo: data.catalogo || [],
    cliente_servicios: data.cliente_servicios || [],
    pagos: data.pagos || [],
    referidos: data.referidos || [],
    descuentos: data.descuentos || [],
    gamificacion: data.gamificacion || [],
    alertas: data.alertas || [],
    notificaciones: data.notificaciones || [],
  };
}

export async function loadAdminAccountStates() {
  const data = await adminRequest<{
    ok: boolean;
    estados?: AdminAccountState[];
    error?: string;
  }>('estado-cuenta-beta', 'listar_admin');
  return data.estados || [];
}

export async function loadRegistrations() {
  return adminRequest<RegistrationData>('registro-admin', 'resumen');
}

export async function loadPromotions() {
  return adminRequest<{
    ok: boolean;
    promociones?: Promotion[];
    servicios?: AdminCatalogService[];
  }>('promociones-admin-beta', 'listar');
}

export async function loadBenefits(clienteId = '') {
  return adminRequest<{ ok: boolean; beneficios?: Benefit[] }>(
    'beneficios-admin-beta',
    'listar',
    clienteId ? { cliente_id: clienteId } : {},
  );
}

export async function loadCancellations() {
  return adminRequest<{ ok: boolean; solicitudes?: Cancellation[] }>(
    'cancelaciones-admin',
    'listar',
  );
}

export async function loadFairDeals() {
  return adminRequest<{ ok: boolean; compensaciones?: FairDeal[] }>(
    'trato-justo',
    'listar_todas',
  );
}

export async function loadAccessModel() {
  return adminRequest<AccessModel>('accesos-admin-beta', 'modelo');
}

export async function loadMotherAccounts() {
  return adminRequest<{
    ok: boolean;
    cuentas?: MotherAccount[];
    asignaciones?: Array<Record<string, unknown>>;
  }>('cuentas-plataforma-admin-beta', 'listar');
}

export async function loadAdminCredentials() {
  return adminRequest<CredentialAdminData>('credenciales-admin-beta', 'listar');
}

export async function loadBillingPeriods() {
  return adminRequest<{
    ok: boolean;
    periodos?: Array<Record<string, unknown>>;
    mes_actual?: string;
  }>('periodo-cobro', 'listar_periodos');
}

export async function loadAdminBundle() {
  const [
    core,
    accountStates,
    registrations,
    promotions,
    benefits,
    cancellations,
    fairDeals,
    accessModel,
    motherAccounts,
    credentials,
    periods,
  ] = await Promise.allSettled([
    loadAdminData(),
    loadAdminAccountStates(),
    loadRegistrations(),
    loadPromotions(),
    loadBenefits(),
    loadCancellations(),
    loadFairDeals(),
    loadAccessModel(),
    loadMotherAccounts(),
    loadAdminCredentials(),
    loadBillingPeriods(),
  ]);

  if (core.status !== 'fulfilled') throw core.reason;

  return {
    core: core.value,
    accountStates: accountStates.status === 'fulfilled' ? accountStates.value : [],
    registrations:
      registrations.status === 'fulfilled' ? registrations.value : null,
    promotions: promotions.status === 'fulfilled' ? promotions.value : null,
    benefits: benefits.status === 'fulfilled' ? benefits.value.beneficios || [] : [],
    cancellations:
      cancellations.status === 'fulfilled'
        ? cancellations.value.solicitudes || []
        : [],
    fairDeals:
      fairDeals.status === 'fulfilled'
        ? fairDeals.value.compensaciones || []
        : [],
    accessModel: accessModel.status === 'fulfilled' ? accessModel.value : null,
    motherAccounts:
      motherAccounts.status === 'fulfilled' ? motherAccounts.value : null,
    credentials:
      credentials.status === 'fulfilled' ? credentials.value : null,
    periods: periods.status === 'fulfilled' ? periods.value : null,
  };
}

export async function adminOperation(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'admin-operaciones',
    accion,
    datos,
  );
}

export async function adminAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'admin-acciones',
    accion,
    datos,
  );
}

export async function registrationAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'registro-admin',
    accion,
    datos,
  );
}

export async function promotionAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'promociones-admin-beta',
    accion,
    datos,
  );
}

export async function benefitAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'beneficios-admin-beta',
    accion,
    datos,
  );
}

export async function cancellationAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'cancelaciones-admin',
    accion,
    datos,
  );
}

export async function fairDealAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'trato-justo',
    accion,
    datos,
  );
}

export async function accessAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'accesos-admin-beta',
    accion,
    datos,
  );
}

export async function motherAccountAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'cuentas-plataforma-admin-beta',
    accion,
    datos,
  );
}

export async function credentialAction(
  accion: string,
  datos: Record<string, unknown> = {},
) {
  return adminRequest<Record<string, unknown> & { ok: boolean }>(
    'credenciales-admin-beta',
    accion,
    datos,
  );
}
