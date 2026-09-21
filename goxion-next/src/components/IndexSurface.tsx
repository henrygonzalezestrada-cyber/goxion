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
          'Comprobante enviado desde GOXION Next.',
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
  const [details, setDetails] = useState(false);

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
    const next = await refreshClientSpace();
    setData(next);
  };

  if (loading) {
    return (
      <main className="gx-index-shell">
        <div className="gx-index-ambient" />
        <div className="gx-index-loading">
          <span />
          <strong>Sincronizando con GOXION…</strong>
        </div>
      </main>
    );
  }

  if (!data?.cliente || !account) return <ProtectedGate />;

  const canReport =
    account.estado !== 'pagado' &&
    account.estado !== 'revision' &&
    data.cliente.pago_en_revision !== true;

  const breakdown = Array.isArray(account.desglose) ? account.desglose : [];

  return (
    <main className="gx-index-shell">
      <div className="gx-index-ambient gx-index-ambient-a" />
      <div className="gx-index-ambient gx-index-ambient-b" />

      <header className="gx-index-header">
        <a href="./ayuda.html" className="gx-index-brand">
          <span className="gx-help-brandmark">
            <i />
            <i />
            <i />
          </span>
          <span>GOXION</span>
        </a>
        <span className="gx-index-folio">{data.cliente.folio || 'Mi cuenta'}</span>
      </header>

      <section className="gx-index-hero">
        <span className="gx-space-kicker">RESUMEN DE CUENTA</span>
        <h1>{data.cliente.nombre || 'Cliente GOXION'}</h1>
        <p>{account.periodo_label || 'Periodo actual'}</p>
      </section>

      <section className="gx-index-total-card">
        <div className="gx-index-total-top">
          <span className={'gx-account-status ' + statusClass(account.estado)}>
            {account.estado_label || 'Pendiente'}
          </span>
          <small>Corte {shortDate(account.fecha_corte)}</small>
        </div>

        <div className="gx-index-total">
          <small>{account.total_label || 'Total a pagar'}</small>
          <strong>{money(account.total_actual)}</strong>
          <span>
            Mensualidad base {money(account.subtotal || totalMonthly)}
          </span>
        </div>

        <div className="gx-index-total-grid">
          <div>
            <small>Descuentos</small>
            <strong className="good">-{money(account.descuentos?.total)}</strong>
          </div>
          <div>
            <small>Mora</small>
            <strong className={Number(account.cargos?.mora || 0) > 0 ? 'bad' : ''}>
              {money(account.cargos?.mora)}
            </strong>
          </div>
          <div>
            <small>Lealtad</small>
            <strong>
              Nivel {Number(account.lealtad?.nivel || 0)} ·{' '}
              {Number(account.lealtad?.porcentaje || 0)}%
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="gx-index-breakdown-toggle"
          onClick={() => setDetails((value) => !value)}
        >
          <span>{details ? 'Ocultar desglose' : 'Ver desglose completo'}</span>
          <motion.i animate={{ rotate: details ? 180 : 0 }}>⌄</motion.i>
        </button>

        <AnimatePresence initial={false}>
          {details && (
            <motion.div
              className="gx-index-breakdown"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div>
                {breakdown.map((line, index) => {
                  const amount = Number(line.monto || 0);
                  return (
                    <p key={index}>
                      <span>{line.concepto || 'Movimiento'}</span>
                      <b
                        className={
                          amount < 0
                            ? 'good'
                            : line.tipo === 'cargo'
                              ? 'bad'
                              : ''
                        }
                      >
                        {amount < 0
                          ? '−' + money(Math.abs(amount))
                          : money(amount)}
                      </b>
                    </p>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {(account.estado === 'revision' || data.cliente.pago_en_revision) && (
        <section className="gx-index-review-note">
          <span>⌛</span>
          <div>
            <strong>Comprobante en revisión</strong>
            <small>Ya recibimos tu reporte. Te avisaremos cuando sea validado.</small>
          </div>
        </section>
      )}

      <section className="gx-index-bank-card">
        <div className="gx-index-section-title">
          <span className="gx-space-kicker">DATOS DE PAGO</span>
          <strong>Transferencia bancaria</strong>
        </div>

        <div className="gx-index-bank-row">
          <span>Banco</span>
          <strong>{BANK.bank}</strong>
        </div>
        <div className="gx-index-bank-row">
          <span>Titular</span>
          <div>
            <strong>{BANK.holder}</strong>
            <button type="button" onClick={() => void copy(BANK.holder, 'Titular copiado')}>
              Copiar
            </button>
          </div>
        </div>
        <div className="gx-index-bank-row">
          <span>CLABE</span>
          <div>
            <strong>{BANK.clabe}</strong>
            <button type="button" onClick={() => void copy(BANK.clabe, 'CLABE copiada')}>
              Copiar
            </button>
          </div>
        </div>

        <button
          type="button"
          className="gx-index-report-payment"
          disabled={!canReport}
          onClick={() => setPaymentOpen(true)}
        >
          {account.estado === 'pagado'
            ? 'Periodo pagado ✓'
            : account.estado === 'revision' || data.cliente.pago_en_revision
              ? 'Comprobante en revisión'
              : 'Reportar pago'}
        </button>

        <small className="gx-index-payment-note">
          El pago sólo cuenta como reportado cuando adjuntas el comprobante desde
          GOXION.
        </small>
      </section>

      <section className="gx-index-services">
        <div className="gx-index-section-title">
          <span className="gx-space-kicker">SERVICIOS</span>
          <strong>Tu mensualidad</strong>
        </div>
        {services.map((service, index) => (
          <div key={String(service.id || index)}>
            <span>{service.nombre || 'Servicio'}</span>
            <strong>{money(service.monto)}</strong>
          </div>
        ))}
      </section>

      <footer className="gx-index-footer">
        <a href="./ayuda.html">Volver a Mi Espacio</a>
        <span>GOXION Next</span>
      </footer>

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
