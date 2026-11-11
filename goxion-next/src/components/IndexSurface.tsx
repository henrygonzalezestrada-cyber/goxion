import { AnimatePresence, motion } from 'motion/react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import {
  ClientSpaceData,
  refreshClientSpace,
  restoreClientSession,
  submitPaymentProof,
} from '../lib/client-session';

const BANK = {
  bank: 'NU BANCO',
  clabe: '638180000167909381',
  holder: 'Henry González',
};

const money = (value: unknown) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const shortDate = (value: unknown) => {
  const text = String(value || '').trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

function statusClass(status: string | undefined) {
  if (status === 'pagado') return 'paid';
  if (status === 'vence_hoy') return 'today';
  if (status === 'vencido' || status === 'incompleto') return 'late';
  if (status === 'revision') return 'review';
  return 'pending';
}

function ProtectedGate() {
  return (
    <main className="gx-index-shell">
      <div className="gx-index-ambient" />
      <section className="gx-index-gate">
        <div className="gx-index-lock">◉</div>
        <span className="gx-space-kicker">ESTADO DE CUENTA</span>
        <h1>Inicia sesión primero</h1>
        <p>
          Este resumen está protegido por tu sesión de GOXION. Entra a Mi Espacio
          para continuar.
        </p>
        <a href="./ayuda.html">Ir a Mi Espacio</a>
      </section>
    </main>
  );
}

function PaymentModal({
  data,
  onClose,
  onSuccess,
}: {
  data: ClientSpaceData;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] || null;
    setFile(next);
    setState('idle');
    setMessage('');
  };

  const submit = async () => {
    if (!file) {
      setState('error');
      setMessage('Selecciona una imagen de tu comprobante.');
      return;
    }

    setState('sending');
    setMessage('');

    try {
      const account = data.estado_cuenta;
      const client = data.cliente;
      await submitPaymentProof({
        file,
        titulo: '💳 Comprobante recibido',
        mensaje: [
          client?.nombre ? '**Cliente:** ' + client.nombre : '',
          client?.folio ? '**Folio:** ' + client.folio : '',
          account?.periodo_label
            ? '**Periodo:** ' + account.periodo_label
            : '',
          '**Monto esperado:** ' + money(account?.total_actual),
          'Comprobante enviado desde GOXION.',
        ]
          .filter(Boolean)
          .join('\n'),
      });

      setState('success');
      setMessage('Comprobante enviado. Tu pago quedó en revisión.');
      await onSuccess();
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error ? error.message : 'No fue posible enviar el comprobante.',
      );
    }
  };

  return (
    <motion.div
      className="gx-payment-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && state !== 'sending') onClose();
      }}
    >
      <motion.section
        className="gx-payment-modal"
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.99 }}
      >
        <button
          type="button"
          className="gx-payment-modal-close"
          onClick={onClose}
          disabled={state === 'sending'}
        >
          ×
        </button>

        <div className="gx-payment-modal-icon">▣</div>
        <span className="gx-space-kicker">VALIDAR PAGO</span>
        <h2>Sube tu comprobante</h2>
        <p>
          El reporte es válido únicamente cuando lo envías desde GOXION. No
          necesitamos capturas por WhatsApp.
        </p>

        <label className={'gx-payment-drop ' + (preview ? 'has-preview' : '')}>
          <input type="file" accept="image/*" onChange={choose} />
          {preview ? (
            <img src={preview} alt="Vista previa del comprobante" />
          ) : (
            <>
              <span>＋</span>
              <strong>Toca para elegir una imagen</strong>
              <small>Selecciona tu transferencia o depósito desde Fotos.</small>
            </>
          )}
        </label>

        {preview && (
          <button
            type="button"
            className="gx-payment-change"
            onClick={() => setFile(null)}
          >
            Cambiar imagen
          </button>
        )}

        <button
          type="button"
          className={'gx-payment-send is-' + state}
          onClick={() => void submit()}
          disabled={state === 'sending' || state === 'success'}
        >
          {state === 'sending'
            ? 'Enviando comprobante…'
            : state === 'success'
              ? 'Comprobante enviado ✓'
              : 'Enviar comprobante seguro'}
        </button>

        {message && (
          <div className={'gx-payment-result ' + state}>{message}</div>
        )}
      </motion.section>
    </motion.div>
  );
}

export function IndexSurface() {
  const [data, setData] = useState<ClientSpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    let active = true;
    restoreClientSession().then((restored) => {
      if (!active) return;
      setData(restored?.space ?? null);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const account = data?.estado_cuenta;
  const services = data?.servicios || [];
  const totalMonthly = useMemo(
    () => services.reduce((sum, item) => sum + Number(item.monto || 0), 0),
    [services],
  );

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('No se pudo copiar');
    }
  };

  const refresh = async () => {
    const refreshed = await refreshClientSpace();
    setData(refreshed);
  };

  if (loading) {
    return (
      <main className="gx-index-shell gx-index-official">
        <div className="bg gx-index-bg">
          <div className="lava lava-1" />
          <div className="lava lava-2" />
          <div className="lava lava-3" />
          <div className="lava lava-4" />
        </div>
        <div className="loading">Sincronizando con Goxion...</div>
      </main>
    );
  }

  if (!data?.cliente || !account) return <ProtectedGate />;

  const canReport =
    account.estado !== 'pagado' &&
    account.estado !== 'revision' &&
    data.cliente.pago_en_revision !== true;

  const breakdown = Array.isArray(account.desglose) ? account.desglose : [];
  const badge =
    account.estado === 'pagado'
      ? 'badge-paid'
      : account.estado === 'vence_hoy'
        ? 'badge-today'
        : account.estado === 'vencido' || account.estado === 'incompleto'
          ? 'badge-overdue'
          : account.estado === 'revision'
            ? 'badge-review'
            : 'badge-ok';

  return (
    <main className="gx-index-shell gx-index-official">
      <div className="bg gx-index-bg">
        <div className="lava lava-1" />
        <div className="lava lava-2" />
        <div className="lava lava-3" />
        <div className="lava lava-4" />
      </div>

      <div className="container">
        <div className="sticky-area">
          <div className="header">
            <div className="header-title">Estado de Cuenta</div>
          </div>

          <div className="balance-hero">
            <div className="total-label">
              {account.total_label || 'Total a pagar'}
            </div>
            <div className="total-amount">
              {money(account.total_actual)}
            </div>
            <div className={'time-badge ' + badge}>
              {account.estado === 'pagado'
                ? '✅ '
                : account.estado === 'revision'
                  ? '⏳ '
                  : account.estado === 'incompleto'
                    ? '⚠️ '
                    : account.estado === 'vencido'
                      ? '🚨 '
                      : '⏳ '}
              {account.estado_label || 'Pendiente'}
            </div>
          </div>
        </div>

        <div className="scrollable-content">
          {(account.estado === 'revision' || data.cliente.pago_en_revision) && (
            <div className="alert-banner gx-index-review-banner">
              Comprobante en revisión · ya recibimos tu reporte.
            </div>
          )}

          {(account.estado === 'vencido' || account.estado === 'incompleto') && (
            <div className="overdue-incentive-box">
              Tu cuenta tiene un saldo pendiente. Revisa el total actualizado y
              reporta tu pago desde GOXION para mantener tu cuenta al corriente.
            </div>
          )}

          <div className="glass-card card-info">
            <div className="info-block">
              <span className="label">Titular</span>
              <span className="value">
                {String(data.cliente.nombre || 'Cliente').split(' ')[0]}
              </span>
            </div>

            <div className="info-block gx-index-folio-block">
              <span className="label">Folio</span>
              <span className="value">{data.cliente.folio || '—'}</span>
            </div>

            <div className="info-block full">
              <span className="label">Periodo Facturado</span>
              <span className="value gx-index-period-line">
                <span>{account.periodo_label || 'Periodo actual'}</span>
                <small>Corte: {shortDate(account.fecha_corte)}</small>
              </span>
            </div>
          </div>

          <div className="section-title">Servicios Activos</div>
          <div className="glass-card services-container">
            {services.map((service, index) => (
              <div className="service-item" key={String(service.id || index)}>
                <span className="service-name">
                  {service.nombre || 'Servicio'}
                </span>
                <span className="service-price">{money(service.monto)}</span>
              </div>
            ))}
            {!services.length && (
              <div className="service-item">
                <span className="service-name">Sin servicios activos</span>
              </div>
            )}
          </div>

          {(breakdown.length > 0 ||
            Number(account.descuentos?.total || 0) > 0 ||
            Number(account.cargos?.mora || 0) > 0) && (
            <div className="glass-card breakdown-box">
              <div className="breakdown-line">
                <span>Subtotal Mensual</span>
                <span>{money(account.subtotal || totalMonthly)}</span>
              </div>

              {breakdown.map((line, index) => {
                const amount = Number(line.monto || 0);
                const cls =
                  amount < 0
                    ? 'discount-line'
                    : line.tipo === 'cargo'
                      ? 'surcharge-line'
                      : '';
                return (
                  <div className={'breakdown-line ' + cls} key={index}>
                    <span>{line.concepto || 'Movimiento'}</span>
                    <span>
                      {amount < 0
                        ? '−' + money(Math.abs(amount))
                        : amount > 0 && line.tipo === 'cargo'
                          ? '+' + money(amount)
                          : money(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="glass-card loyalty-badge">
            <div className="loyalty-icon">⭐</div>
            <div className="loyalty-content">
              <div className="loyalty-title">Programa Goxion</div>
              <div className="loyalty-desc">
                Nivel {Number(account.lealtad?.nivel || 0)} ·{' '}
                {Number(account.lealtad?.porcentaje || 0)}% de beneficio · racha{' '}
                {Number(data.cliente.pagos_puntuales || 0)}
              </div>
            </div>
          </div>

          <div className="glass-card gx-index-payment-card">
            <div className="section-title">Datos de Transferencia</div>

            <div className="gx-index-official-bank-row">
              <span>Banco</span>
              <strong>{BANK.bank}</strong>
            </div>

            <div className="gx-index-official-bank-row">
              <span>Titular</span>
              <strong>{BANK.holder}</strong>
              <button
                type="button"
                onClick={() => void copy(BANK.holder, 'Titular copiado')}
              >
                Copiar
              </button>
            </div>

            <div className="gx-index-official-bank-row">
              <span>CLABE</span>
              <strong>{BANK.clabe}</strong>
              <button
                type="button"
                onClick={() => void copy(BANK.clabe, 'CLABE copiada')}
              >
                Copiar
              </button>
            </div>
          </div>

          <div className="actions-group">
            <button
              type="button"
              className="btn gx-index-pay-action"
              disabled={!canReport}
              onClick={() => setPaymentOpen(true)}
            >
              {account.estado === 'pagado'
                ? '✅ Periodo pagado'
                : account.estado === 'revision' || data.cliente.pago_en_revision
                  ? '⏳ Comprobante en revisión'
                  : '🧾 Reportar pago'}
            </button>

            <a href="./ayuda.html" className="btn btn-wa">
              💬 Volver a Mi Espacio
            </a>
          </div>

          <div className="footer">
            <span className="gx-index-referral-title">
              🎁 ¡Gana un mes gratis!
            </span>
            <br />
            Invita a un amigo y consulta tus beneficios desde Mi Espacio.
            <div className="footer-logo-container">
              <img
                src="https://raw.githubusercontent.com/henrygonzalezestrada-cyber/goxion/main/logo2.PNG"
                alt="GOXION"
                className="footer-logo"
              />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {paymentOpen && (
          <PaymentModal
            data={data}
            onClose={() => setPaymentOpen(false)}
            onSuccess={async () => {
              await refresh();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {copied && (
          <motion.div
            className="gx-copy-toast"
            initial={{ opacity: 0, y: 8, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 8, x: '-50%' }}
          >
            {copied}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
