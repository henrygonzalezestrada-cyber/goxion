import { useMemo, useState } from 'react';
import {
  AdminClient,
  AdminData,
  adminAction,
  adminOperation,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

const stringValue = (value: unknown) => String(value ?? '').trim();

function ClientSelector({
  clients,
  selected,
  setSelected,
}: {
  clients: AdminClient[];
  selected: Set<string>;
  setSelected: (next: Set<string>) => void;
}) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (client) =>
        stringValue(client.nombre).toLowerCase().includes(q) ||
        stringValue(client.folio).toLowerCase().includes(q),
    );
  }, [clients, query]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const allVisibleSelected =
    visible.length > 0 && visible.every((client) => selected.has(client.id));

  return (
    <div className="gx-admin-mass-selector">
      <div className="gx-admin-mass-selector-head">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente…"
        />
        <button
          type="button"
          onClick={() => {
            const next = new Set(selected);
            if (allVisibleSelected) {
              visible.forEach((client) => next.delete(client.id));
            } else {
              visible.forEach((client) => next.add(client.id));
            }
            setSelected(next);
          }}
        >
          {allVisibleSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
        </button>
      </div>

      <div className="gx-admin-mass-client-list">
        {visible.map((client) => (
          <label key={client.id}>
            <input
              type="checkbox"
              checked={selected.has(client.id)}
              onChange={() => toggle(client.id)}
            />
            <span>
              <strong>{client.nombre || 'Cliente'}</strong>
              <small>
                {client.folio || 'Sin folio'} · {client.estado || 'pendiente'}
              </small>
            </span>
            <b>{Number(client.pagos_puntuales || 0)}</b>
          </label>
        ))}
      </div>

      <div className="gx-admin-mass-count">
        {selected.size} cliente{selected.size === 1 ? '' : 's'} seleccionado
        {selected.size === 1 ? '' : 's'}
      </div>
    </div>
  );
}

function AlertSettings({
  data,
  onMutation,
}: {
  data: AdminData;
  onMutation: Mutation;
}) {
  const current = data.alertas?.[0] || {};
  const [active, setActive] = useState(Boolean(current.activa));
  const [platform, setPlatform] = useState(stringValue(current.plataforma));
  const [failure, setFailure] = useState(stringValue(current.falla));
  const [message, setMessage] = useState(stringValue(current.mensaje));

  const save = async () => {
    await onMutation(
      () =>
        adminAction('guardar_alerta', {
          activa: active,
          plataforma: platform.trim(),
          falla: failure.trim(),
          mensaje: message.trim(),
        }),
      'Alerta operativa actualizada.',
    );
  };

  return (
    <section className="gx-admin-settings-card">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">INCIDENCIAS</span>
          <h3>Alerta visible para clientes</h3>
        </div>
      </div>

      <div className="gx-admin-inline-editor">
        <label className="gx-admin-check-row">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>Mostrar alerta</span>
        </label>
        <label>
          <span>Plataforma</span>
          <input
            value={platform}
            onChange={(event) => setPlatform(event.target.value)}
            placeholder="Netflix, Disney+, General…"
          />
        </label>
        <label>
          <span>Falla</span>
          <input
            value={failure}
            onChange={(event) => setFailure(event.target.value)}
            placeholder="Descripción corta"
          />
        </label>
        <label>
          <span>Mensaje al cliente</span>
          <textarea
            rows={4}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <button type="button" className="primary" onClick={() => void save()}>
          Guardar alerta
        </button>
      </div>
    </section>
  );
}

function AppSettings({
  data,
  onMutation,
}: {
  data: AdminData;
  onMutation: Mutation;
}) {
  const [upsell, setUpsell] = useState(
    Boolean(data.configuracion?.combo_upsell),
  );

  const save = async () => {
    await onMutation(
      () =>
        adminAction('guardar_configuracion', {
          combo_upsell: upsell,
        }),
      'Experiencia de la app actualizada.',
    );
  };

  return (
    <section className="gx-admin-settings-card">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">EXPERIENCIA</span>
          <h3>Comportamiento de la app</h3>
        </div>
      </div>

      <div className="gx-admin-inline-editor">
        <label className="gx-admin-check-row">
          <input
            type="checkbox"
            checked={upsell}
            onChange={(event) => setUpsell(event.target.checked)}
          />
          <span>Mostrar recomendaciones / combo upsell</span>
        </label>
        <div className="gx-admin-rule-note">
          Este ajuste controla si GOXION puede sugerir opciones complementarias
          dentro de la experiencia del cliente.
        </div>
        <button type="button" className="primary" onClick={() => void save()}>
          Guardar experiencia
        </button>
      </div>
    </section>
  );
}

function LoyaltyMassSettings({
  clients,
  onMutation,
}: {
  clients: AdminClient[];
  onMutation: Mutation;
}) {
  const [selected, setSelected] = useState(new Set<string>());
  const [value, setValue] = useState('0');
  const [reason, setReason] = useState('Ajuste administrativo de lealtad');

  const apply = async () => {
    const ids = [...selected];
    if (!ids.length) {
      window.alert('Selecciona al menos un cliente.');
      return;
    }
    const count = Math.max(0, Math.min(99, Math.trunc(Number(value || 0))));
    if (
      !window.confirm(
        'Se establecerá la racha de ' +
          ids.length +
          ' cliente(s) en ' +
          count +
          ' pago(s) puntuales.\n\nEsto reemplaza el contador actual, no suma. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminOperation('establecer_lealtad_masiva', {
          cliente_ids: ids,
          valor: count,
          motivo: reason.trim() || 'Ajuste administrativo de lealtad',
        }),
      'Lealtad masiva actualizada.',
    );
    setSelected(new Set());
  };

  return (
    <section className="gx-admin-settings-card">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">LEALTAD</span>
          <h3>Ajuste masivo de racha</h3>
        </div>
      </div>

      <ClientSelector
        clients={clients}
        selected={selected}
        setSelected={setSelected}
      />

      <div className="gx-admin-inline-editor">
        <div className="gx-admin-form-pair">
          <label>
            <span>Pagos puntuales finales</span>
            <input
              type="number"
              min={0}
              max={99}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
          </label>
          <label>
            <span>Motivo</span>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="primary"
          disabled={!selected.size}
          onClick={() => void apply()}
        >
          Aplicar a {selected.size || 0} cliente(s)
        </button>
      </div>
    </section>
  );
}

function MissionMassSettings({
  clients,
  onMutation,
}: {
  clients: AdminClient[];
  onMutation: Mutation;
}) {
  const [selected, setSelected] = useState(new Set<string>());
  const [discount, setDiscount] = useState('5');
  const [tasks, setTasks] = useState(
    'Paga puntual\nExplora tu catálogo\nRefiere a un amigo',
  );

  const apply = async () => {
    const ids = [...selected];
    if (!ids.length) {
      window.alert('Selecciona al menos un cliente.');
      return;
    }
    if (
      !window.confirm(
        'Se activarán estas misiones para ' +
          ids.length +
          ' cliente(s).\n\nLas tareas actuales de esos clientes serán reemplazadas. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminAction('misiones_masivas', {
          clientes: ids,
          descuento: Number(discount || 0),
          tareas: tasks,
        }),
      'Misiones masivas aplicadas.',
    );
    setSelected(new Set());
  };

  const clearAll = async () => {
    const phrase = window.prompt(
      'MANTENIMIENTO GLOBAL\n\nEsta acción desactiva las misiones de TODOS los clientes.\n\nEscribe BORRAR MISIONES para confirmar:',
    );
    if (phrase !== 'BORRAR MISIONES') return;

    await onMutation(
      () => adminAction('borrar_misiones_masivas', {}),
      'Misiones globales desactivadas.',
    );
  };

  return (
    <section className="gx-admin-settings-card">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">MISIONES</span>
          <h3>Plantilla masiva</h3>
        </div>
      </div>

      <ClientSelector
        clients={clients}
        selected={selected}
        setSelected={setSelected}
      />

      <div className="gx-admin-inline-editor">
        <label>
          <span>Descuento al completar</span>
          <input
            type="number"
            min={0}
            max={100}
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
          />
        </label>
        <label>
          <span>Tareas · una por línea</span>
          <textarea
            rows={5}
            value={tasks}
            onChange={(event) => setTasks(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="primary"
          disabled={!selected.size}
          onClick={() => void apply()}
        >
          Aplicar a {selected.size || 0} cliente(s)
        </button>
        <button
          type="button"
          className="gx-admin-destructive-maintenance"
          onClick={() => void clearAll()}
        >
          Desactivar misiones de todos…
        </button>
      </div>
    </section>
  );
}

export function AdminSystemSettings({
  data,
  onMutation,
}: {
  data: AdminData;
  onMutation: Mutation;
}) {
  const [section, setSection] = useState('alerts');

  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div>
          <span className="gx-admin-eyebrow">AJUSTES</span>
          <h3>Experiencia y reglas globales</h3>
        </div>
      </div>

      <div className="gx-admin-ops-tabs">
        {[
          ['alerts', 'Incidencias'],
          ['app', 'App'],
          ['loyalty', 'Lealtad'],
          ['missions', 'Misiones'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={section === id ? 'active' : ''}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {section === 'alerts' && (
        <AlertSettings data={data} onMutation={onMutation} />
      )}
      {section === 'app' && <AppSettings data={data} onMutation={onMutation} />}
      {section === 'loyalty' && (
        <LoyaltyMassSettings
          clients={data.clientes}
          onMutation={onMutation}
        />
      )}
      {section === 'missions' && (
        <MissionMassSettings
          clients={data.clientes}
          onMutation={onMutation}
        />
      )}
    </div>
  );
}
