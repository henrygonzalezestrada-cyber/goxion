import { SUPABASE_PROJECT_URL } from './contracts';

type JsonBody = Record<string, unknown> | undefined;

export async function callGoxionFunction<T>(
  functionName: string,
  body?: JsonBody,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${SUPABASE_PROJECT_URL}/functions/v1/${functionName}`,
    {
      method: init.method ?? 'POST',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      body: body === undefined ? init.body : JSON.stringify(body),
      cache: 'no-store',
    },
  );

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : typeof payload?.message === 'string'
          ? payload.message
          : `GOXION API error ${response.status}`;

    throw new Error(message);
  }

  return payload as T;
}

/*
 * Guardrail de GOXION Next:
 * este cliente existe para preservar el contrato actual, pero la primera
 * prueba visual NO lo invoca. Conectaremos lecturas y escrituras por etapas.
 */
