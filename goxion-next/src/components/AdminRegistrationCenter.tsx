import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  RegistrationRequest,
  registrationAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

type ExistingClient = {
  id?: string;
  nombre?: string;
  folio?: string;
  usuario_acceso?: string;
  telefono_normalizado?: string | null;
  origen_cliente?: string;
  promo_nuevo_elegible?: boolean;
};

type Delivery = Record<string, unknown> & {
  nombre?: string;
  goxion_id?: string;
  codigo?: string;
  expira_at?: string;
  mensaje_whatsapp?: string;
  whatsapp_url?: string;
};

type Filter = 'attention' | 'new' | 'activation' | 'activated' | 'all';

const text = (value: unknown) => String(value ?? '').trim();

function statusOf(item: RegistrationRequest) {
  const activation = text(item.activacion?.estado);
  if (activation === 'activada') return 'activated';
  if (['pendiente', 'bloqueada', 'expirada'].includes(activation))
    return 'activation';
  if (
    item.resultado === 'cliente_existente' ||
    item.resultado === 'revisar' ||
    item.resultado === 'review'
  )
    return 'attention';
  if (item.resultado === 'nuevo' && !item.cliente_id) return 'new';
  return 'other';
}

function statusLabel(item: RegistrationRequest) {
  const activation = text(item.activacion?.estado);
  if (activation) return activation;
  if (item.estado_admin === 'descartado') return 'descartado';
  if (item.estado_admin === 'resuelto') return 'resuelto';
  if (item.resultado === 'cliente_existente') return 'cliente existente';
  if (item.resultado === 'revisar' || item.resultado === 'review')
    return 'revisión';
  if (item.resultado === 'nuevo') return 'nuevo';
  return item.estado_admin || 'pendiente';
}

export function AdminRegistrationCenter({
  rows,
  clients,
  onMutation,
}: {
  rows: RegistrationRequest[];
  clients: ExistingClient[];
  onMutation: Mutation;
}) {
  const [filter, setFilter] = useState<Filter>('attention');
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [linking, setLinking] = useState<RegistrationRequest | null>(null);
  const [targetClientId, setTargetClientId] = useState('');
  const [clientQuery, setClientQuery] = useState('');

  const summary = useMemo(
    () => ({
      attention: rows.filter((item) => statusOf(item) === 'attention').length,
      new: rows.filter((item) => statusOf(item) === 'new').length,
      activation: rows.filter((item) => statusOf(item) === 'activation').length,
      activated: rows.filter((item) => statusOf(item) === 'activated').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const usable = rows.filter((item) => item.estado_admin !== 'descartado');
    if (filter === 'all') return rows;
    return usable.filter((item) => statusOf(item) === filter);
  }, [filter, rows]);

  const clientOptions = useMemo(() => {
    const q = clientQuery.toLowerCase().trim();
    return clients
      .filter((client) => {
        if (!q) return true;
        return (
          text(client.nombre).toLowerCase().includes(q) ||
          text(client.folio).toLowerCase().includes(q) ||
          text(client.telefono_normalizado).includes(q)
        );
      })
      .slice(0, 80);
  }, [clientQuery, clients]);

  const finishAction = async (
    work: () => Promise<Record<string, unknown>>,
    success: string,
    captureDelivery = false,
  ) => {
    try {
      const result = await work();
      if (captureDelivery) setDelivery(result as Delivery);
      await onMutation(async () => result, success);
      return result;
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'No fue posible completar la acción.',
      );
      return null;
    }
  };

  const prepare = async (request: RegistrationRequest) => {
    await finishAction(
      () =>
        registrationAction('preparar_activacion', {
          solicitud_id: request.id,
        }),
      'Activación preparada.',
      true,
    );
  };

  const regenerate = async (request: RegistrationRequest) => {
    if (
      !window.confirm(
        'Se invalidará el código anterior y se generará uno nuevo. ¿Continuar?',
      )
    )
      return;

    await finishAction(
      () =>
        registrationAction('regenerar_activacion', {
          solicitud_id: request.id,
        }),
      'Código regenerado.',
      true,
    );
  };

  const cancelActivation = async (request: RegistrationRequest) => {
    if (
      !window.confirm(
        'Se cancelará la activación pendiente. El código dejará de funcionar, pero la solicitud de registro se conservará. ¿Continuar?',
      )
    )
      return;

    await finishAction(
      () =>
        registrationAction('cancelar_activacion', {
          solicitud_id: request.id,
        }),
      'Activación cancelada.',
    );
  };

  const markContacted = async (request: RegistrationRequest) => {
    await finishAction(
      () =>
        registrationAction('resolver_solicitud', {
          solicitud_id: request.id,
          estado_admin: 'contactado',
        }),
      'Solicitud marcada como contactada.',
    );
  };

  const discard = async (request: RegistrationRequest) => {
    if (request.activacion && request.activacion.estado !== 'cancelada') {
      window.alert(
        'Primero cancela la activación preparada. El backend no permite descartar una solicitud con activación vigente.',
      );
      return;
    }

    if (
      !window.confirm(
        'La solicitud quedará descartada y saldrá de la bandeja operativa. ¿Continuar?',
      )
    )
      return;

    await finishAction(
      () =>
        registrationAction('resolver_solicitud', {
          solicitud_id: request.id,
          estado_admin: 'descartado',
        }),
      'Solicitud descartada.',
    );
  };

  const deleteRecord = async (request: RegistrationRequest) => {
    if (
      !window.confirm(
        'MANTENIMIENTO\n\n¿Eliminar este registro de solicitud? El backend impedirá la operación si la cuenta ya fue activada. Esta acción no debe usarse como forma normal de rechazar registros.',
      )
    )
      return;

    await finishAction(
      () =>
        registrationAction('eliminar_registro', {
          solicitud_id: request.id,
        }),
      'Registro eliminado.',
    );
  };

  const openLink = (request: RegistrationRequest) => {
    setLinking(request);
    setTargetClientId('');
    setClientQuery('');
  };

  const linkExisting = async () => {
    if (!linking || !targetClientId) {
      window.alert('Selecciona el cliente existente.');
      return;
    }
    const target = clients.find((client) => client.id === targetClientId);
    if (
      !window.confirm(
        'Se vinculará esta solicitud a:\n\n' +
          text(target?.nombre || 'Cliente') +
          ' · ' +
          text(target?.folio || 'Sin folio') +
          '\n\nEl teléfono de la solicitud quedará asociado a ese cliente y el -10% de nuevo cliente NO será elegible. ¿Continuar?',
      )
    )
      return;

    const result = await finishAction(
      () =>
        registrationAction('vincular_existente', {
          solicitud_id: linking.id,
          cliente_id: targetClientId,
        }),
      'Solicitud vinculada al cliente existente.',
    );
    if (result) setLinking(null);
  };

  const copyDelivery = async () => {
    const message = text(delivery?.mensaje_whatsapp);
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      window.alert('No fue posible copiar el mensaje.');
    }
  };

  return (
    <div className="gx-admin-registration-center">
      <div className="gx-admin-registration-kpis">
        <button
          type="button"
          className={filter === 'attention' ? 'active danger' : 'danger'}
          onClick={() => setFilter('attention')}
        >
          <span>REVISAR</span>
          <strong>{summary.attention}</strong>
          <small>Coincidencias</small>
        </button>
        <button
          type="button"
          className={filter === 'new' ? 'active new' : 'new'}
          onClick={() => setFilter('new')}
        >
          <span>NUEVOS</span>
          <strong>{summary.new}</strong>
          <small>Sin activar</small>
        </button>
        <button
          type="button"
          className={filter === 'activation' ? 'active activation' : 'activation'}
          onClick={() => setFilter('activation')}
        >
          <span>CÓDIGO</span>
          <strong>{summary.activation}</strong>
          <small>En activación</small>
        </button>
        <button
          type="button"
          className={filter === 'activated' ? 'active activated' : 'activated'}
          onClick={() => setFilter('activated')}
        >
          <span>LISTOS</span>
          <strong>{summary.activated}</strong>
          <small>Activados</small>
        </button>
      </div>

      <div className="gx-admin-registration-tabs">
        {[
          ['attention', 'Revisión'],
          ['new', 'Nuevos'],
          ['activation', 'Activación'],
          ['activated', 'Activados'],
          ['all', 'Todos'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={filter === id ? 'active' : ''}
            onClick={() => setFilter(id as Filter)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="gx-admin-ops-list">
        {filtered.map((item) => {
          const status = statusOf(item);
          const activationState = text(item.activacion?.estado);
          const hasLiveActivation = ['pendiente', 'bloqueada', 'expirada'].includes(
            activationState,
          );

          return (
            <article
              key={item.id}
              className={'gx-admin-decision-card gx-admin-registration-row ' + status}
            >
              <div className="gx-admin-decision-card-head">
                <div>
                  <strong>{item.nombre_declarado || 'Registro'}</strong>
                  <small>
                    {item.telefono_normalizado || 'Sin teléfono'} ·{' '}
                    {item.resultado || 'sin clasificar'}
                  </small>
                </div>
                <span className={'gx-admin-badge ' + status}>
                  {statusLabel(item)}
                </span>
              </div>

              {item.detalle && <p>{item.detalle}</p>}

              {item.activacion && (
                <div className="gx-admin-registration-activation-info">
                  <div>
                    <small>GOXION ID</small>
                    <strong>{item.activacion.goxion_id || '—'}</strong>
                  </div>
                  <div>
                    <small>Estado</small>
                    <strong>{item.activacion.estado || '—'}</strong>
                  </div>
                  <div>
                    <small>Expira</small>
                    <strong>
                      {item.activacion.expira_at
                        ? new Date(item.activacion.expira_at).toLocaleString('es-MX')
                        : '—'}
                    </strong>
                  </div>
                </div>
              )}

              <div className="gx-admin-decision-actions gx-admin-registration-actions">
                {status === 'new' && !item.activacion && (
                  <button
                    type="button"
                    className="success"
                    onClick={() => void prepare(item)}
                  >
                    Preparar activación
                  </button>
                )}

                {(status === 'attention' || item.resultado === 'cliente_existente') &&
                  !hasLiveActivation && (
                    <button
                      type="button"
                      className="warning"
                      onClick={() => openLink(item)}
                    >
                      Vincular cliente
                    </button>
                  )}

                {activationState === 'pendiente' && (
                  <button type="button" onClick={() => void regenerate(item)}>
                    Regenerar código
                  </button>
                )}

                {hasLiveActivation && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void cancelActivation(item)}
                  >
                    Cancelar activación
                  </button>
                )}

                {item.estado_admin === 'pendiente' && (
                  <button type="button" onClick={() => void markContacted(item)}>
                    Marcar contactado
                  </button>
                )}

                {status !== 'activated' && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => void discard(item)}
                  >
                    Descartar
                  </button>
                )}

                <button
                  type="button"
                  className="maintenance"
                  onClick={() => void deleteRecord(item)}
                >
                  Eliminar registro
                </button>
              </div>
            </article>
          );
        })}

        {!filtered.length && (
          <div className="gx-admin-empty">
            No hay registros en esta sección.
          </div>
        )}
      </div>

      <AnimatePresence>
        {linking && (
          <motion.div
            className="gx-admin-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setLinking(null);
            }}
          >
            <motion.section
              className="gx-admin-client-sheet gx-admin-registration-linker"
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <header>
                <div>
                  <span className="gx-admin-eyebrow">VINCULAR EXISTENTE</span>
                  <h2>{linking.nombre_declarado || 'Solicitud'}</h2>
                  <p>{linking.telefono_normalizado || 'Sin teléfono'}</p>
                </div>
                <button type="button" onClick={() => setLinking(null)}>
                  ×
                </button>
              </header>

              <div className="gx-admin-inline-editor">
                <div className="gx-admin-rule-note">
                  Usa esta opción sólo cuando confirmaste que la solicitud
                  pertenece a un cliente que ya existe. El beneficio de nuevo
                  cliente quedará desactivado.
                </div>

                <label>
                  <span>Buscar cliente</span>
                  <input
                    value={clientQuery}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder="Nombre, folio o teléfono"
                  />
                </label>

                <label>
                  <span>Cliente existente</span>
                  <select
                    size={Math.min(7, Math.max(3, clientOptions.length))}
                    value={targetClientId}
                    onChange={(event) => setTargetClientId(event.target.value)}
                  >
                    <option value="">Selecciona un cliente</option>
                    {clientOptions.map((client) => (
                      <option key={text(client.id)} value={text(client.id)}>
                        {text(client.nombre || 'Cliente')} ·{' '}
                        {text(client.folio || 'Sin folio')}
                        {client.telefono_normalizado
                          ? ' · ' + text(client.telefono_normalizado)
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="primary"
                  disabled={!targetClientId}
                  onClick={() => void linkExisting()}
                >
                  Vincular solicitud
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {delivery && (
          <motion.div
            className="gx-admin-code-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setDelivery(null);
            }}
          >
            <motion.section
              className="gx-admin-code-card"
              initial={{ scale: 0.96, y: 12 }}
              animate={{ scale: 1, y: 0 }}
            >
              <button type="button" onClick={() => setDelivery(null)}>
                ×
              </button>
              <span className="gx-admin-eyebrow">ACTIVACIÓN PREPARADA</span>
              <h3>{text(delivery.nombre || 'Nuevo cliente')}</h3>

              <div>
                <small>GOXION ID</small>
                <strong>{text(delivery.goxion_id || '—')}</strong>
              </div>
              <div>
                <small>Código</small>
                <strong>{text(delivery.codigo || '—')}</strong>
              </div>
              <p>
                Vence:{' '}
                {delivery.expira_at
                  ? new Date(text(delivery.expira_at)).toLocaleString('es-MX')
                  : '—'}
              </p>

              {Boolean(delivery.mensaje_whatsapp) && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => void copyDelivery()}
                >
                  Copiar mensaje para el cliente
                </button>
              )}

              <div className="gx-admin-rule-note">
                El código es de un solo uso. Si lo regeneras, el anterior deja
                de ser válido.
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
