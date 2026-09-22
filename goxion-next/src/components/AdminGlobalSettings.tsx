import { useMemo, useState } from 'react';
import {
  AdminData,
  adminAction,
  adminAdjustAction,
  adminOperation,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

export function AdminGlobalSettings({
  data,
  onMutation,
}: {
  data: AdminData;
  onMutation: Mutation;
}) {
  const clients = data.clientes;
  const services = data.catalogo;
  const activeAlert =
    (data.alertas || []).find((item) => item.activa === true) ||
    (data.alertas || [])[0] ||
    null;
  const configuration = data.configuracion || {};

  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [missionDiscount, setMissionDiscount] = useState('5');
  const [missionTasks, setMissionTasks] = useState('');
  const [loyaltyValue, setLoyaltyValue] = useState('0');
  const [loyaltyReason, setLoyaltyReason] = useState('Ajuste masivo de lealtad');

  const [alertActive, setAlertActive] = useState(activeAlert?.activa === true);
  const [alertPlatform, setAlertPlatform] = useState(
    String(activeAlert?.plataforma || ''),
  );
  const [alertFault, setAlertFault] = useState(String(activeAlert?.falla || ''));
  const [alertMessage, setAlertMessage] = useState(
    String(activeAlert?.mensaje || ''),
  );
  const [comboUpsell, setComboUpsell] = useState(
    configuration.combo_upsell === true,
  );

  const [maintenanceClient, setMaintenanceClient] = useState(
    String(clients[0]?.id || ''),
  );

  const selectedCount = selectedClients.length;
  const allSelected =
    clients.length > 0 && selectedClients.length === clients.length;

  const toggleClient = (id: string) => {
    setSelectedClients((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const selectedNames = useMemo(
    () =>
      selectedClients
        .map((id) => clients.find((client) => client.id === id)?.nombre)
        .filter(Boolean)
        .slice(0, 3)
        .join(', '),
    [clients, selectedClients],
  );

  const applyMassMissions = async () => {
    if (!selectedClients.length) {
      window.alert('Selecciona al menos un cliente.');
      return;
    }
    if (!missionTasks.trim()) {
      window.alert('Escribe al menos una tarea.');
      return;
    }
    if (
      !window.confirm(
        'Se aplicarán estas misiones a ' +
          selectedClients.length +
          ' cliente(s). ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminAction('misiones_masivas', {
          clientes: selectedClients,
          descuento: Number(missionDiscount || 0),
          tareas: missionTasks.trim(),
        }),
      'Misiones masivas aplicadas.',
    );
  };

  const clearAllMissions = async () => {
    if (
      !window.confirm(
        '¿Desactivar y borrar las tareas de misiones de TODOS los clientes?',
      )
    )
      return;
    if (
      !window.confirm(
        'Confirma por segunda vez. Esta operación afecta a toda la cartera.',
      )
    )
      return;

    await onMutation(
      () => adminAction('borrar_misiones_masivas', {}),
      'Misiones masivas desactivadas.',
    );
  };

  const applyMassLoyalty = async () => {
    if (!selectedClients.length) {
      window.alert('Selecciona al menos un cliente.');
      return;
    }
    const value = Math.max(0, Math.min(99, Math.trunc(Number(loyaltyValue || 0))));
    if (
      !window.confirm(
        'Se establecerá la racha en ' +
          value +
          ' pago(s) para ' +
          selectedClients.length +
          ' cliente(s). ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminOperation('establecer_lealtad_masiva', {
          cliente_ids: selectedClients,
          valor: value,
          motivo: loyaltyReason.trim() || 'Ajuste masivo de lealtad',
        }),
      'Lealtad masiva aplicada.',
    );
  };

  const saveAlert = async () => {
    await onMutation(
      () =>
        adminAction('guardar_alerta', {
          activa: alertActive,
          plataforma: alertPlatform.trim(),
          falla: alertFault.trim(),
          mensaje: alertMessage.trim(),
        }),
      'Alerta pública actualizada.',
    );
  };

  const saveConfiguration = async () => {
    await onMutation(
      () =>
        adminAction('guardar_configuracion', {
          combo_upsell: comboUpsell,
        }),
      'Configuración actualizada.',
    );
  };

  const resetClientMissions = async () => {
    if (!maintenanceClient) return;
    if (
      !window.confirm(
        'Se reiniciará el progreso de misiones de este cliente sin cambiar la configuración de tareas. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminAdjustAction('reiniciar_misiones_cliente', {
          cliente_id: maintenanceClient,
        }),
      'Progreso de misiones reiniciado.',
    );
  };

  const newCouponRound = async () => {
    if (!maintenanceClient) return;
    if (
      !window.confirm(
        'Se abrirá una nueva ronda de cupón para este cliente y también se reiniciará su versión de misiones. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminAdjustAction('nueva_ronda_cupon', {
          cliente_id: maintenanceClient,
        }),
      'Nueva ronda de cupón creada.',
    );
  };

  const clearNotifications = async () => {
    const ids = data.notificaciones.map((item) => item.id).filter(Boolean);
    if (!ids.length) {
      window.alert('No hay notificaciones para eliminar.');
      return;
    }
    if (
      !window.confirm(
        'Se eliminarán las notificaciones administrativas actuales. Esto no borra clientes, pagos ni solicitudes. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () => adminOperation('eliminar_notificaciones', { ids }),
      'Notificaciones administrativas eliminadas.',
    );
  };

  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div>
          <span className="gx-admin-eyebrow">AJUSTES GLOBALES</span>
          <h3>Operación y mantenimiento</h3>
        </div>
      </div>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">SELECCIÓN</span>
            <h3>Clientes para operaciones masivas</h3>
          </div>
          <span className="gx-admin-badge">{selectedCount} seleccionados</span>
        </div>

        <div className="gx-admin-global-select-actions">
          <button
            type="button"
            onClick={() =>
              setSelectedClients(
                allSelected ? [] : clients.map((client) => client.id),
              )
            }
          >
            {allSelected ? 'Quitar todos' : 'Seleccionar todos'}
          </button>
          {selectedCount > 0 && (
            <small>
              {selectedNames}
              {selectedCount > 3 ? ' y ' + (selectedCount - 3) + ' más' : ''}
            </small>
          )}
        </div>

        <div className="gx-admin-global-client-grid">
          {clients.map((client) => (
            <label
              key={client.id}
              className={selectedClients.includes(client.id) ? 'active' : ''}
            >
              <input
                type="checkbox"
                checked={selectedClients.includes(client.id)}
                onChange={() => toggleClient(client.id)}
              />
              <span>
                <strong>{client.nombre || 'Cliente'}</strong>
                <small>{client.folio || 'Sin folio'}</small>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">MISIONES</span>
            <h3>Aplicación masiva</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>Descuento %</span>
            <input
              type="number"
              min={0}
              max={100}
              value={missionDiscount}
              onChange={(event) => setMissionDiscount(event.target.value)}
            />
          </label>
          <label>
            <span>Tareas · una por línea</span>
            <textarea
              rows={5}
              value={missionTasks}
              onChange={(event) => setMissionTasks(event.target.value)}
            />
          </label>
          <div className="gx-admin-referral-actions">
            <button
              type="button"
              className="primary"
              onClick={() => void applyMassMissions()}
            >
              Aplicar a seleccionados
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => void clearAllMissions()}
            >
              Desactivar todas
            </button>
          </div>
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">LEALTAD</span>
            <h3>Ajuste masivo</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>Pagos puntuales finales</span>
            <input
              type="number"
              min={0}
              max={99}
              value={loyaltyValue}
              onChange={(event) => setLoyaltyValue(event.target.value)}
            />
          </label>
          <label>
            <span>Motivo</span>
            <input
              value={loyaltyReason}
              onChange={(event) => setLoyaltyReason(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="primary"
            onClick={() => void applyMassLoyalty()}
          >
            Establecer lealtad
          </button>
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">CATÁLOGO</span>
            <h3>Stock manual</h3>
          </div>
        </div>

        <div className="gx-admin-stock-grid">
          {services.map((service) => (
            <StockRow
              key={service.id}
              service={service}
              onMutation={onMutation}
            />
          ))}
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">ALERTA PÚBLICA</span>
            <h3>Incidencia de plataforma</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label className="gx-admin-check-row">
            <input
              type="checkbox"
              checked={alertActive}
              onChange={(event) => setAlertActive(event.target.checked)}
            />
            <span>Alerta activa</span>
          </label>
          <label>
            <span>Plataforma</span>
            <input
              value={alertPlatform}
              onChange={(event) => setAlertPlatform(event.target.value)}
            />
          </label>
          <label>
            <span>Falla</span>
            <input
              value={alertFault}
              onChange={(event) => setAlertFault(event.target.value)}
            />
          </label>
          <label>
            <span>Mensaje</span>
            <textarea
              rows={4}
              value={alertMessage}
              onChange={(event) => setAlertMessage(event.target.value)}
            />
          </label>
          <button type="button" className="primary" onClick={() => void saveAlert()}>
            Guardar alerta
          </button>
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">CATÁLOGO</span>
            <h3>Configuración comercial</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label className="gx-admin-check-row">
            <input
              type="checkbox"
              checked={comboUpsell}
              onChange={(event) => setComboUpsell(event.target.checked)}
            />
            <span>Mostrar sugerencias de combo / upsell</span>
          </label>
          <button
            type="button"
            className="primary"
            onClick={() => void saveConfiguration()}
          >
            Guardar configuración
          </button>
        </div>
      </section>

      <section className="gx-admin-subpanel">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">MANTENIMIENTO</span>
            <h3>Misiones, cupón y actividad</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>Cliente</span>
            <select
              value={maintenanceClient}
              onChange={(event) => setMaintenanceClient(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.nombre || 'Cliente'} · {client.folio || 'sin folio'}
                </option>
              ))}
            </select>
          </label>

          <div className="gx-admin-referral-actions">
            <button type="button" onClick={() => void resetClientMissions()}>
              Reiniciar misiones
            </button>
            <button type="button" onClick={() => void newCouponRound()}>
              Nueva ronda de cupón
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => void clearNotifications()}
            >
              Limpiar actividad
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function StockRow({
  service,
  onMutation,
}: {
  service: AdminData['catalogo'][number];
  onMutation: Mutation;
}) {
  const [value, setValue] = useState(
    service.stock_manual === null || service.stock_manual === undefined
      ? ''
      : String(service.stock_manual),
  );

  const save = async () => {
    await onMutation(
      () =>
        adminAdjustAction('guardar_stock_manual', {
          id: service.id,
          stock_manual: value.trim() === '' ? null : Number(value),
        }),
      'Stock manual actualizado.',
    );
  };

  return (
    <article>
      <div>
        <strong>{service.nombre || 'Servicio'}</strong>
        <small>
          {value === '' ? 'Automático' : 'Stock manual activo'}
        </small>
      </div>
      <div>
        <input
          type="number"
          min={0}
          placeholder="Auto"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <button type="button" onClick={() => void save()}>
          Guardar
        </button>
      </div>
    </article>
  );
}
