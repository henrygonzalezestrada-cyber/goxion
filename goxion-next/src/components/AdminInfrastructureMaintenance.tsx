import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  CredentialAdminData,
  MotherAccount,
  credentialAction,
  motherAccountAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

type Credential = {
  id?: string;
  servicio_id?: string;
  cuenta_id?: string;
  plataforma?: string;
  cuenta_login?: string;
  version?: number;
  activa?: boolean;
  created_at?: string;
  updated_at?: string;
};

export function AdminInfrastructureMaintenance({
  accounts,
  credentials,
  onMutation,
}: {
  accounts: MotherAccount[];
  credentials: CredentialAdminData | null;
  onMutation: Mutation;
}) {
  const [editing, setEditing] = useState<MotherAccount | null>(null);
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [limit, setLimit] = useState('5');
  const [active, setActive] = useState(true);

  const credentialRows = (credentials?.credenciales || []) as Credential[];

  const deliveriesByCredential = useMemo(() => {
    const map = new Map<string, { pending: number; seen: number; revoked: number }>();
    for (const item of credentials?.entregas || []) {
      const id = String(item.credencial_id || '');
      if (!id) continue;
      const current = map.get(id) || { pending: 0, seen: 0, revoked: 0 };
      const state = String(item.estado || '');
      if (state === 'pendiente') current.pending += 1;
      else if (state === 'vista') current.seen += 1;
      else if (state === 'revocada') current.revoked += 1;
      map.set(id, current);
    }
    return map;
  }, [credentials?.entregas]);

  const openEdit = (account: MotherAccount) => {
    setEditing(account);
    setAlias(String(account.alias || 'Cuenta'));
    setEmail(String(account.correo_login || ''));
    setLimit(String(account.limite_perfiles || 5));
    setActive(account.activo !== false);
  };

  const saveAccount = async () => {
    if (!editing?.id) return;
    if (!email.trim()) {
      window.alert('El correo/login no puede quedar vacío.');
      return;
    }
    const occupied = Number(editing.ocupados || 0);
    if (
      editing.activo !== false &&
      !active &&
      occupied > 0 &&
      !window.confirm(
        'Esta cuenta tiene ' +
          occupied +
          ' acceso(s) asignado(s). Desactivarla no los borra, pero ya no deberá usarse para nuevas asignaciones. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        motherAccountAction('editar', {
          id: editing.id,
          alias: alias.trim() || 'Cuenta',
          correo_login: email.trim(),
          limite_perfiles: Math.max(1, Number(limit || 1)),
          activo: active,
        }),
      'Cuenta madre actualizada.',
    );
    setEditing(null);
  };

  const revoke = async (credential: Credential) => {
    if (!credential.id) return;
    const delivery = deliveriesByCredential.get(String(credential.id));
    if (
      !window.confirm(
        'Se revocará esta versión de contraseña' +
          (delivery?.pending
            ? ' y ' +
              delivery.pending +
              ' entrega(s) pendiente(s) dejarán de estar disponibles'
            : '') +
          '.\n\nLas entregas ya vistas no pueden recuperarse. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        credentialAction('revocar', {
          credencial_id: credential.id,
        }),
      'Credencial revocada.',
    );
  };

  return (
    <>
      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">MANTENIMIENTO</span>
            <h3>Cuentas madre</h3>
          </div>
          <span className="gx-admin-badge">{accounts.length} cuentas</span>
        </div>

        <div className="gx-admin-maintenance-list">
          {accounts.map((account) => (
            <article
              key={String(account.id)}
              className={account.activo === false ? 'inactive' : ''}
            >
              <div>
                <strong>{String(account.alias || 'Cuenta')}</strong>
                <small>{String(account.correo_login || '')}</small>
              </div>
              <div>
                <span>
                  {Number(account.ocupados || 0)}/
                  {Number(account.limite_perfiles || 0)} ocupados
                </span>
                <b>{account.activo === false ? 'Inactiva' : 'Activa'}</b>
                <button type="button" onClick={() => openEdit(account)}>
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">CREDENCIALES</span>
            <h3>Versiones publicadas</h3>
          </div>
          <span className="gx-admin-badge">
            {credentialRows.filter((item) => item.activa).length} activas
          </span>
        </div>

        <div className="gx-admin-maintenance-list">
          {credentialRows.slice(0, 40).map((credential) => {
            const delivery = deliveriesByCredential.get(String(credential.id));
            return (
              <article
                key={String(credential.id)}
                className={credential.activa === false ? 'inactive' : ''}
              >
                <div>
                  <strong>
                    {credential.plataforma || 'Servicio'} · v
                    {Number(credential.version || 0)}
                  </strong>
                  <small>{credential.cuenta_login || 'Cuenta'}</small>
                </div>
                <div>
                  <span>
                    {delivery?.pending || 0} pendientes · {delivery?.seen || 0}{' '}
                    vistas
                  </span>
                  <b>{credential.activa === false ? 'Revocada' : 'Activa'}</b>
                  {credential.activa !== false && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void revoke(credential)}
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {!credentialRows.length && (
            <div className="gx-admin-empty">
              No hay credenciales publicadas.
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {editing && (
          <motion.div
            className="gx-admin-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) setEditing(null);
            }}
          >
            <motion.section
              className="gx-admin-client-sheet gx-admin-account-maintenance-sheet"
              initial={{ opacity: 0, y: 18, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
            >
              <header>
                <div>
                  <span className="gx-admin-eyebrow">CUENTA MADRE</span>
                  <h2>{String(editing.alias || 'Cuenta')}</h2>
                  <p>
                    {Number(editing.ocupados || 0)} acceso(s) asignado(s)
                  </p>
                </div>
                <button type="button" onClick={() => setEditing(null)}>
                  ×
                </button>
              </header>

              <div className="gx-admin-inline-editor">
                <label>
                  <span>Alias</span>
                  <input
                    value={alias}
                    onChange={(event) => setAlias(event.target.value)}
                  />
                </label>
                <label>
                  <span>Correo / login</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                <label>
                  <span>Límite de perfiles</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                  />
                </label>
                <label className="gx-admin-check-row">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(event) => setActive(event.target.checked)}
                  />
                  <span>Cuenta activa para nuevas asignaciones</span>
                </label>

                <div className="gx-admin-rule-note">
                  Editar el correo cambia la referencia administrativa de la
                  cuenta madre. No revela ni modifica la contraseña guardada en
                  Vault.
                </div>

                <button
                  type="button"
                  className="primary"
                  onClick={() => void saveAccount()}
                >
                  Guardar cuenta
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
