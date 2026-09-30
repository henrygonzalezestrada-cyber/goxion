import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  AccessModel,
  MotherAccount,
  accessAction,
  motherAccountAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

type AccessRow = {
  id?: string;
  cliente_servicio_id?: string;
  cliente_id?: string;
  servicio_id?: string;
  ordinal?: number;
  cuenta_id?: string | null;
  modo_config?: string;
  correo_override?: string;
  perfil_nombre?: string;
  perfil_pin?: string;
  estado_invitacion?: string;
  modo_acceso?: string;
  activo?: boolean;
  cliente?: string;
  folio?: string;
  contratacion?: string;
  monto?: number;
  servicio?: string;
};

export function AdminAccessAssignments({
  model,
  accounts,
  onMutation,
}: {
  model: AccessModel | null;
  accounts: MotherAccount[];
  onMutation: Mutation;
}) {
  const accesses = (model?.accesos || []) as AccessRow[];
  const [sessionResult, setSessionResult] = useState<{
    accessId: string;
    account?: string;
    email?: string;
    pin?: string;
  } | null>(null);
  const [editingInvite, setEditingInvite] = useState<AccessRow | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteState, setInviteState] = useState('pendiente');

  const shared = useMemo(
    () =>
      accesses.filter(
        (item) =>
          item.activo !== false &&
          String(item.modo_acceso || 'compartido') !== 'invitacion',
      ),
    [accesses],
  );
  const invitations = useMemo(
    () =>
      accesses.filter(
        (item) =>
          item.activo !== false &&
          String(item.modo_acceso || '') === 'invitacion',
      ),
    [accesses],
  );

  const pendingShared = shared.filter((item) => !item.cuenta_id);
  const assignedShared = shared.filter((item) => Boolean(item.cuenta_id));

  const accountLabel = (id: string | null | undefined) => {
    const account = accounts.find((item) => String(item.id) === String(id || ''));
    if (!account) return 'Cuenta asignada';
    return String(account.alias || 'Cuenta') + ' · ' + String(account.correo_login || '');
  };

  const smartAssign = async (access: AccessRow) => {
    if (!access.id) return;
    let response: Record<string, unknown> = {};
    await onMutation(
      async () => {
        response = await motherAccountAction('asignacion_inteligente', {
          cliente_acceso_id: access.id,
        });
        return response;
      },
      'Acceso asignado automáticamente.',
    );

    const account =
      response.cuenta && typeof response.cuenta === 'object'
        ? (response.cuenta as Record<string, unknown>)
        : {};
    setSessionResult({
      accessId: access.id,
      account: String(account.alias || ''),
      email: String(account.correo_login || ''),
      pin: String(response.pin || ''),
    });
  };

  const unassign = async (access: AccessRow) => {
    if (!access.id) return;
    if (
      !window.confirm(
        'Se liberará este acceso de su cuenta madre. El cliente conservará la contratación, pero quedará pendiente de nueva asignación. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        motherAccountAction('desasignar', {
          cliente_acceso_id: access.id,
        }),
      'Acceso liberado.',
    );
    if (sessionResult?.accessId === access.id) setSessionResult(null);
  };

  const openInvitation = (access: AccessRow) => {
    setEditingInvite(access);
    setInviteEmail(access.correo_override || '');
    setInviteState(access.estado_invitacion || 'pendiente');
  };

  const saveInvitation = async () => {
    if (!editingInvite?.id) return;
    if (!inviteEmail.trim()) {
      window.alert('Escribe el correo de invitación.');
      return;
    }
    await onMutation(
      () =>
        accessAction('editar_acceso', {
          acceso_id: editingInvite.id,
          correo_override: inviteEmail.trim(),
          estado_invitacion: inviteState,
          modo_config: 'personalizado',
        }),
      'Invitación actualizada.',
    );
    setEditingInvite(null);
  };

  return (
    <section className="gx-admin-subpanel">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">DISTRIBUCIÓN</span>
          <h3>Accesos de clientes</h3>
        </div>
        <span className="gx-admin-badge">
          {pendingShared.length} pendientes
        </span>
      </div>

      <div className="gx-admin-access-summary">
        <div>
          <strong>{assignedShared.length}</strong>
          <span>Compartidos asignados</span>
        </div>
        <div>
          <strong>{pendingShared.length}</strong>
          <span>Sin cuenta madre</span>
        </div>
        <div>
          <strong>{invitations.length}</strong>
          <span>Por invitación</span>
        </div>
      </div>

      {pendingShared.length > 0 && (
        <div className="gx-admin-access-group">
          <span className="gx-admin-eyebrow">PENDIENTES</span>
          {pendingShared.map((access) => (
            <article key={String(access.id)}>
              <div>
                <strong>{access.cliente || 'Cliente'}</strong>
                <small>
                  {access.folio || 'Sin folio'} · {access.servicio || access.contratacion || 'Servicio'}
                </small>
              </div>
              <button
                type="button"
                className="primary"
                onClick={() => void smartAssign(access)}
              >
                Asignar automático
              </button>
            </article>
          ))}
        </div>
      )}

      {assignedShared.length > 0 && (
        <div className="gx-admin-access-group">
          <span className="gx-admin-eyebrow">ASIGNADOS</span>
          {assignedShared.slice(0, 40).map((access) => (
            <article key={String(access.id)}>
              <div>
                <strong>{access.cliente || 'Cliente'}</strong>
                <small>
                  {access.servicio || 'Servicio'} · {accountLabel(access.cuenta_id)}
                </small>
              </div>
              <div className="gx-admin-access-row-actions">
                {access.perfil_nombre && <span>{access.perfil_nombre}</span>}
                {access.perfil_pin && <b>PIN {access.perfil_pin}</b>}
                <button
                  type="button"
                  className="danger"
                  onClick={() => void unassign(access)}
                >
                  Liberar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {invitations.length > 0 && (
        <div className="gx-admin-access-group">
          <span className="gx-admin-eyebrow">INVITACIONES</span>
          {invitations.map((access) => (
            <article key={String(access.id)}>
              <div>
                <strong>{access.cliente || 'Cliente'}</strong>
                <small>
                  {access.servicio || 'Servicio'} ·{' '}
                  {access.correo_override || 'Correo pendiente'}
                </small>
              </div>
              <div className="gx-admin-access-row-actions">
                <span>{access.estado_invitacion || 'sin_verificar'}</span>
                <button type="button" onClick={() => openInvitation(access)}>
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AnimatePresence>
        {sessionResult && (
          <motion.div
            className="gx-admin-assignment-result"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div>
              <small>Asignación recién creada</small>
              <strong>{sessionResult.account || 'Cuenta asignada'}</strong>
              {sessionResult.email && <span>{sessionResult.email}</span>}
            </div>
            {sessionResult.pin && (
              <div>
                <small>PIN generado</small>
                <strong>{sessionResult.pin}</strong>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(sessionResult.pin || '')
                  }
                >
                  Copiar
                </button>
              </div>
            )}
            <button type="button" onClick={() => setSessionResult(null)}>
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingInvite && (
          <motion.div
            className="gx-admin-inline-editor"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            <div className="gx-admin-inline-editor-head">
              <strong>Invitación · {editingInvite.cliente || 'Cliente'}</strong>
              <button type="button" onClick={() => setEditingInvite(null)}>
                ×
              </button>
            </div>
            <label>
              <span>Correo invitado</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
            </label>
            <label>
              <span>Estado</span>
              <select
                value={inviteState}
                onChange={(event) => setInviteState(event.target.value)}
              >
                <option value="sin_verificar">Sin verificar</option>
                <option value="pendiente">Pendiente</option>
                <option value="enviada">Enviada</option>
                <option value="activa">Activa</option>
                <option value="revision">Revisión</option>
              </select>
            </label>
            <button
              type="button"
              className="primary"
              onClick={() => void saveInvitation()}
            >
              Guardar invitación
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
