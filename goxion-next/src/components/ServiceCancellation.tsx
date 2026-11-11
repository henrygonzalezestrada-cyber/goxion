import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type {
  CancellationRequest,
  GoxionService,
  RetentionOffer,
} from '../lib/client-session';
import {
  acceptCancellationRetention,
  evaluateCancellationRetention,
  rejectCancellationRetention,
  requestServiceCancellation,
} from '../lib/client-session';

type Props = {
  service: GoxionService;
  cancellation?: CancellationRequest;
  onRefresh: () => Promise<void>;
};

const money = (value: unknown) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export function ServiceCancellation({
  service,
  cancellation,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<
    'idle' | 'checking' | 'offer' | 'confirm' | 'sending' | 'success' | 'error'
  >('idle');
  const [offer, setOffer] = useState<RetentionOffer | null>(null);
  const [reason, setReason] = useState('Solicitud desde Mi Espacio');
  const [message, setMessage] = useState('');

  const state = String(cancellation?.estado || '').toLowerCase();
  const activeRequest = state === 'solicitada' || state === 'aprobada';

  const begin = async () => {
    if (!service.id) return;
    setOpen(true);
    setStage('checking');
    setMessage('');

    try {
      const result = await evaluateCancellationRetention(String(service.id));
      if (result.elegible && result.oferta?.id) {
        setOffer(result.oferta);
        setStage('offer');
      } else {
        setOffer(null);
        setStage('confirm');
      }
    } catch (error) {
      setStage('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible revisar la solicitud.',
      );
    }
  };

  const acceptOffer = async () => {
    if (!offer?.id) return;
    setStage('sending');
    setMessage('');

    try {
      const result = await acceptCancellationRetention(String(offer.id));
      setStage('success');
      setMessage(
        'Listo. El descuento de ' +
          Number(result.oferta?.porcentaje || offer.porcentaje || 30) +
          '% quedó aplicado para tu próximo periodo.',
      );
      await onRefresh();
    } catch (error) {
      setStage('error');
      setMessage(
        error instanceof Error ? error.message : 'No pudimos aplicar la oferta.',
      );
    }
  };

  const continueCancellation = async () => {
    if (offer?.id) {
      try {
        await rejectCancellationRetention(String(offer.id));
      } catch {
        // Si la oferta ya cambió, el backend de cancelación hará la validación final.
      }
    }
    setOffer(null);
    setStage('confirm');
  };

  const submitCancellation = async () => {
    if (!service.id) return;
    setStage('sending');
    setMessage('');

    try {
      const result = await requestServiceCancellation(
        String(service.id),
        reason.trim() || 'Solicitud desde Mi Espacio',
      );
      setStage('success');
      setMessage(
        result.already_open
          ? 'Tu solicitud ya estaba registrada y continúa en revisión.'
          : 'Solicitud enviada. Tu servicio permanece activo hasta que GOXION confirme la baja.',
      );
      await onRefresh();
    } catch (error) {
      setStage('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'No fue posible enviar la solicitud.',
      );
    }
  };

  if (activeRequest) {
    return (
      <div className={'gx-cancel-state ' + state}>
        <span>{state === 'aprobada' ? '✓' : '⌛'}</span>
        <div>
          <strong>
            {state === 'aprobada'
              ? 'Cancelación aprobada'
              : 'Cancelación en revisión'}
          </strong>
          <small>
            {cancellation?.nota_admin ||
              (state === 'aprobada'
                ? cancellation?.fecha_efectiva
                  ? 'Baja programada: ' + cancellation.fecha_efectiva
                  : 'GOXION confirmó tu solicitud.'
                : 'Tu servicio permanece activo mientras revisamos la baja.')}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div className="gx-service-cancellation">
      <button
        type="button"
        className="gx-cancel-entry"
        onClick={() => {
          if (open) {
            setOpen(false);
            setStage('idle');
            setOffer(null);
            setMessage('');
          } else {
            void begin();
          }
        }}
      >
        <span>
          <b>
            {state === 'rechazada'
              ? 'Solicitar cancelación de nuevo'
              : 'Solicitar cancelación'}
          </b>
          <small>Tu servicio continúa activo hasta confirmación</small>
        </span>
        <motion.i animate={{ rotate: open ? 90 : 0 }}>→</motion.i>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="gx-cancel-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="gx-cancel-panel-inner">
              {stage === 'checking' && (
                <div className="gx-cancel-checking">
                  <i />
                  <span>Revisando opciones para tu cuenta…</span>
                </div>
              )}

              {stage === 'offer' && offer && (
                <motion.div
                  className="gx-retention-offer"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="gx-space-kicker">ANTES DE IRTE</span>
                  <h4>
                    Quédate este periodo con{' '}
                    <b>-{Number(offer.porcentaje || 30)}%</b>
                  </h4>
                  <p>
                    Podemos aplicar un ahorro único de{' '}
                    <strong>{money(offer.monto_descuento)}</strong> en{' '}
                    {offer.servicio_nombre || service.nombre || 'este servicio'}.
                  </p>
                  <div className="gx-retention-price">
                    <span>
                      <small>Precio actual</small>
                      <b>{money(offer.monto_base)}</b>
                    </span>
                    <i>→</i>
                    <span>
                      <small>Con beneficio</small>
                      <b>{money(offer.monto_final)}</b>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="gx-retention-accept"
                    onClick={() => void acceptOffer()}
                  >
                    Aceptar beneficio
                  </button>
                  <button
                    type="button"
                    className="gx-retention-reject"
                    onClick={() => void continueCancellation()}
                  >
                    Continuar con cancelación
                  </button>
                </motion.div>
              )}

              {stage === 'confirm' && (
                <motion.div
                  className="gx-cancel-confirm"
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <strong>Confirmar solicitud</strong>
                  <p>
                    Los cargos ya generados no cambian. El servicio permanece
                    activo hasta que GOXION revise y confirme la baja.
                  </p>
                  <label>
                    <span>Motivo opcional</span>
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className="gx-cancel-submit"
                    onClick={() => void submitCancellation()}
                  >
                    Enviar solicitud
                  </button>
                </motion.div>
              )}

              {stage === 'sending' && (
                <div className="gx-cancel-checking">
                  <i />
                  <span>Procesando solicitud…</span>
                </div>
              )}

              {(stage === 'success' || stage === 'error') && message && (
                <motion.div
                  className={'gx-cancel-result ' + stage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span>{stage === 'success' ? '✓' : '!'}</span>
                  <p>{message}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
