import { useState } from 'react';
import {
  AdminBillingPeriod,
  AdminClient,
  billingPeriodAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

export function AdminBillingCycleTools({
  client,
  period,
  onMutation,
}: {
  client: AdminClient;
  period?: AdminBillingPeriod;
  onMutation: Mutation;
}) {
  const initialPeriod = String(period?.periodo_pendiente || '')
    .slice(0, 7);
  const [month, setMonth] = useState(initialPeriod);
  const manual = period?.ciclo_cobro_manual === true;

  const savePeriod = async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      window.alert('Selecciona un periodo válido.');
      return;
    }
    const next = month + '-01';
    const current = String(period?.periodo_pendiente || '').slice(0, 10);
    if (next === current) return;

    if (
      !window.confirm(
        'Se cambiará el periodo pendiente de este cliente a ' +
          month +
          '.\n\nEsto afecta a qué mes se aplicará el próximo pago. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        billingPeriodAction('guardar_periodo', {
          cliente_id: client.id,
          periodo_pendiente: next,
        }),
      'Periodo de cobro actualizado.',
    );
  };

  const toggleManual = async (enabled: boolean) => {
    if (
      enabled &&
      !window.confirm(
        '¿Activar modo MANUAL para este cliente?\n\nEl corte mensual automático dejará de cambiar su estado hasta que vuelvas a modo automático.',
      )
    )
      return;

    await onMutation(
      () =>
        billingPeriodAction('guardar_ciclo_manual', {
          cliente_id: client.id,
          ciclo_cobro_manual: enabled,
        }),
      enabled
        ? 'Ciclo manual activado.'
        : 'Ciclo automático restaurado.',
    );
  };

  return (
    <section className="gx-admin-sheet-section">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">COBRO</span>
          <h3>Periodo y ciclo</h3>
        </div>
        <span className={'gx-admin-cycle-badge ' + (manual ? 'manual' : 'auto')}>
          {manual ? 'MANUAL' : 'AUTOMÁTICO'}
        </span>
      </div>

      <div className="gx-admin-inline-editor">
        <label>
          <span>Periodo pendiente</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>

        <div className="gx-admin-cycle-status">
          <div>
            <small>Estado guardado</small>
            <strong>{period?.estado_guardado || client.estado || 'pendiente'}</strong>
          </div>
          <div>
            <small>Estado efectivo</small>
            <strong>{period?.estado || client.estado || 'pendiente'}</strong>
          </div>
        </div>

        {period?.corte_aplicado && (
          <div className="gx-admin-rule-note">
            El corte automático ya considera este cliente pendiente para el
            periodo actual.
          </div>
        )}

        <div className="gx-admin-cycle-actions">
          <button type="button" className="primary" onClick={() => void savePeriod()}>
            Guardar periodo
          </button>

          <button
            type="button"
            className={manual ? 'success' : 'warning'}
            onClick={() => void toggleManual(!manual)}
          >
            {manual ? 'Volver a automático' : 'Activar modo manual'}
          </button>
        </div>
      </div>
    </section>
  );
}
