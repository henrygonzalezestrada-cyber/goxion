import { SUPABASE_PROJECT_URL } from './contracts';

export type RegistrationStatus =
  | 'new'
  | 'existing'
  | 'review'
  | 'already_requested';

export type RegistrationResponse = {
  ok: boolean;
  status?: RegistrationStatus;
  eligible?: boolean;
  already?: boolean;
  request_id?: string;
  error?: string;
};

export type ActivationValidation = {
  ok: boolean;
  status?: string;
  error?: string | null;
  goxion_id?: string | null;
  nombre?: string | null;
  expira_at?: string | null;
};

export type ActivationResult = {
  ok: boolean;
  status?: string;
  error?: string | null;
  cliente_id?: string | null;
  folio?: string | null;
  nombre?: string | null;
  goxion_id?: string | null;
};

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const value = payload as { error?: unknown };
    throw new Error(
      typeof value.error === 'string'
        ? value.error
        : text || 'No fue posible completar la solicitud.',
    );
  }

  return payload as T;
}

export async function registerGoxionClient(
  nombre: string,
  telefono: string,
): Promise<RegistrationResponse> {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/registro-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, telefono }),
      cache: 'no-store',
    },
  );

  const data = await parseJson<RegistrationResponse>(response);
  if (data.ok !== true || !data.status) {
    throw new Error(data.error || 'No pudimos validar tu registro.');
  }
  return data;
}

export async function notifyNewRegistration(input: {
  nombre: string;
  telefono: string;
  requestId?: string;
}) {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/notificar-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria: 'pedidos',
        titulo: '🎁 REGISTRO -10% OFF',
        mensaje:
          '**Nombre:** ' +
          input.nombre +
          '\n**WhatsApp:** ' +
          input.telefono +
          '\n**Solicitud:** ' +
          (input.requestId || 'N/A') +
          '\n\n*Validación inicial: sin coincidencias como cliente previo. El beneficio queda sujeto a alta final.*',
        colorHex: '7c4dff',
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    throw new Error('No fue posible enviar la notificación administrativa.');
  }
}

export async function validateActivationCode(
  goxionId: string,
  codigo: string,
): Promise<ActivationValidation> {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/activar-cuenta-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'validar_codigo',
        goxion_id: goxionId,
        codigo,
      }),
      cache: 'no-store',
    },
  );

  const data = await parseJson<ActivationValidation>(response);
  if (data.ok !== true || !data.goxion_id) {
    throw new Error(data.error || 'GOXION ID o código incorrecto.');
  }
  return data;
}

export async function activateGoxionSpace(input: {
  goxionId: string;
  codigo: string;
  pin: string;
}): Promise<ActivationResult> {
  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/activar-cuenta-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accion: 'activar',
        goxion_id: input.goxionId,
        codigo: input.codigo,
        pin: input.pin,
      }),
      cache: 'no-store',
    },
  );

  const data = await parseJson<ActivationResult>(response);
  if (data.ok !== true || !data.goxion_id) {
    throw new Error(data.error || 'No pudimos activar tu espacio.');
  }
  return data;
}
