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
  pagos_puntuales?: number;
  promo_nuevo_elegible?: boolean;
  origen_cliente?: string;
};

export type GoxionService = {
  id?: string;
  nombre?: string;
  monto?: number;
  perfil_nombre?: string;
  perfil_pin?: string;
};

export type GoxionPayment = {
  id?: string;
  periodo?: string;
  fecha?: string;
  monto?: number;
  estado?: string;
};

export type ClientSpaceData = {
  ok: boolean;
  cliente?: GoxionClient;
  servicios?: GoxionService[];
  pagos?: GoxionPayment[];
  estado_cuenta?: Record<string, unknown> | null;
  gamificacion?: Record<string, unknown> | null;
  error?: string;
};

type LoginResponse = {
  ok: boolean;
  session_token?: string;
  cliente?: GoxionClient;
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
    const message = typeof value.error === 'string'
      ? value.error
      : text || 'GOXION API error ' + response.status;
    throw new Error(message);
  }

  return payload as T;
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
  return data;
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

export function logoutClient() {
  localStorage.removeItem(CLIENT_TOKEN_KEY);
}
