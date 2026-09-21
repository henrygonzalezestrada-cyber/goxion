import { SUPABASE_PROJECT_URL } from './contracts';

export type CatalogOrderItem = {
  name: string;
  price: number;
  quantity: number;
};

export async function sendCatalogOrder(
  items: CatalogOrderItem[],
  client?: { nombre?: string; folio?: string } | null,
) {
  const selected = items.filter((item) => item.quantity > 0);
  if (!selected.length) throw new Error('Tu pedido está vacío.');

  const total = selected.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  const itemLines = selected
    .map(
      (item) =>
        '🛒 **' +
        item.quantity +
        'x** ' +
        item.name +
        ' (' +
        '$' +
        (item.price * item.quantity) +
        ' MXN)',
    )
    .join('\n');

  const clientInfo = client?.nombre
    ? [
        '👤 **Cliente:** ' + client.nombre,
        client.folio ? '📄 **Folio:** ' + client.folio : '',
      ]
        .filter(Boolean)
        .join('\n')
    : '👤 **Cliente:** INVITADO (Aún no inicia sesión)';

  const response = await fetch(
    SUPABASE_PROJECT_URL + '/functions/v1/notificar-goxion',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoria: 'pedidos',
        titulo: '🚀 NUEVO PEDIDO RECIBIDO',
        mensaje:
          clientInfo +
          '\n\n' +
          itemLines +
          '\n\n💰 **Total estimado:** $' +
          total +
          ' MXN',
        colorHex: '2ea043',
      }),
      cache: 'no-store',
    },
  );

  const text = await response.text();
  let payload: { ok?: boolean; error?: string } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok || payload.ok !== true) {
    throw new Error(payload.error || 'No fue posible enviar tu pedido.');
  }

  return { ok: true, total };
}
