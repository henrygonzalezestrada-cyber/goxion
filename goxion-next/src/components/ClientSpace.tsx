import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
import {
  claimCoupon,
  claimReferralMonth,
  ClientSpaceData,
  CredentialDelivery,
  GoxionAccess,
  GoxionService,
  revealCredential,
  refreshClientSpace,
} from '../lib/client-session';
import { ServiceCancellation } from './ServiceCancellation';

type Props = {
  data: ClientSpaceData;
  onLogout: () => void;
  onCatalog: () => void;
  onDataChange: (data: ClientSpaceData) => void;
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

const statusClass = (value: unknown) => {
  const status = String(value || '').toLowerCase();
  if (status === 'pagado') return 'paid';
  if (status === 'vence_hoy') return 'today';
  if (status === 'vencido' || status === 'incompleto') return 'late';
  if (status === 'revision') return 'review';
  return 'pending';
};

function PaymentAlert({ data }: { data: ClientSpaceData }) {
  const client = data.cliente ?? {};
  const review = String(client.pago_revision_estado || '').toLowerCase();
  const missing = Number(client.pago_revision_monto_faltante || 0);

  if (review === 'incompleto') {
    return (
      <div className="gx-client-payment-alert warning">
        <span>!</span>
        <div>
          <strong>Tu pago requiere corrección</strong>
          <small>
            {client.pago_revision_mensaje || 'Detectamos un pago incompleto.'}
            {missing > 0 ? ' Faltante: ' + money(missing) : ''}
          </small>
        </div>
      </div>
    );
  }

  if (review === 'rechazado') {
    return (
      <div className="gx-client-payment-alert danger">
        <span>×</span>
        <div>
          <strong>No pudimos validar tu comprobante</strong>
          <small>
            {client.pago_revision_mensaje ||
              'Verifica los datos y vuelve a enviar tu comprobante.'}
          </small>
        </div>
      </div>
    );
  }

  if (client.pago_en_revision || review === 'revision') {
    return (
      <div className="gx-client-payment-alert review">
        <span>⌛</span>
        <div>
          <strong>Comprobante en revisión</strong>
          <small>Ya recibimos tu pago. Te avisaremos cuando quede validado.</small>
        </div>
      </div>
    );
  }

  return null;
}

function BillingCard({ data }: { data: ClientSpaceData }) {
  const account = data.estado_cuenta;
  const [details, setDetails] = useState(false);

  if (!account) {
    return (
      <section className="gx-space-card gx-billing-unavailable">
        <span className="gx-space-kicker">ESTADO DE CUENTA</span>
        <strong>Información temporalmente no disponible</strong>
        <small>Tu sesión sigue activa. Intenta actualizar en unos momentos.</small>
      </section>
    );
  }

  const loyalty = account.lealtad ?? {};
  const discounts = account.descuentos ?? {};
  const charges = account.cargos ?? {};
  const breakdown = Array.isArray(account.desglose) ? account.desglose : [];

  return (
    <motion.section layout className="gx-space-card gx-billing-card">
      <div className="gx-billing-top">
        <div>
          <span className="gx-space-kicker">ESTADO DE CUENTA</span>
          <strong>{account.periodo_label || 'Periodo actual'}</strong>
        </div>
        <span className={'gx-account-status ' + statusClass(account.estado)}>
          {account.estado_label || 'Pendiente'}
        </span>
      </div>

      <div className="gx-billing-total">
        <small>{account.total_label || 'Total a pagar'}</small>
        <strong>{money(account.total_actual)}</strong>
        <span>Corte: {shortDate(account.fecha_corte)}</span>
      </div>

      <div className="gx-billing-metrics">
        <div>
          <small>Mensualidad</small>
          <strong>{money(account.subtotal)}</strong>
        </div>
        <div>
          <small>Descuentos</small>
          <strong className="good">-{money(discounts.total)}</strong>
        </div>
        <div>
          <small>Cargos</small>
          <strong className={Number(charges.total || 0) > 0 ? 'bad' : ''}>
            {money(charges.total)}
          </strong>
        </div>
      </div>

      <div className="gx-loyalty-strip">
        <div>
          <span>NIVEL {Number(loyalty.nivel || 0)}</span>
          <strong>
            {Number(loyalty.porcentaje || 0) > 0
              ? '-' + Number(loyalty.porcentaje || 0) + '% lealtad'
              : 'Construyendo tu racha'}
          </strong>
        </div>
        <div className="gx-loyalty-count">
          <b>{Number(loyalty.pagos_efectivos || 0)}</b>
          <small>pagos puntuales</small>
        </div>
      </div>

      <button
        type="button"
        className="gx-billing-details-toggle"
        onClick={() => setDetails((value) => !value)}
      >
        <span>{details ? 'Ocultar desglose' : 'Ver desglose'}</span>
        <motion.i animate={{ rotate: details ? 180 : 0 }}>⌄</motion.i>
      </button>

      <motion.a
        href="./index.html"
        className="gx-billing-payment-link"
        whileTap={{ scale: 0.985 }}
      >
        <span>
          <b>Ver estado de cuenta completo</b>
          <small>Consulta el desglose y reporta tu pago desde GOXION</small>
        </span>
        <i>→</i>
      </motion.a>

      <AnimatePresence initial={false}>
        {details && (
          <motion.div
            className="gx-billing-breakdown"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="gx-billing-breakdown-inner">
              {breakdown.map((line, index) => {
                const amount = Number(line.monto || 0);
                return (
                  <div key={index}>
                    <span>{line.concepto || 'Movimiento'}</span>
                    <strong
                      className={
                        amount < 0 ? 'good' : line.tipo === 'cargo' ? 'bad' : ''
                      }
                    >
                      {amount < 0 ? '−' + money(Math.abs(amount)) : money(amount)}
                    </strong>
                  </div>
                );
              })}
              {!breakdown.length && <small>No hay movimientos adicionales.</small>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function PaymentHistory({ data }: { data: ClientSpaceData }) {
  const payments = Array.isArray(data.pagos) ? data.pagos : [];
  const [open, setOpen] = useState(false);

  if (!payments.length) return null;

  return (
    <section className="gx-space-section">
      <button
        type="button"
        className="gx-space-section-head"
        onClick={() => setOpen((value) => !value)}
      >
        <div>
          <span className="gx-space-kicker">HISTORIAL</span>
          <strong>Tus pagos</strong>
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }}>⌄</motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="gx-payment-history"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="gx-payment-history-inner">
              {payments.slice(0, 12).map((payment, index) => (
                <article key={String(payment.id || index)}>
                  <div>
                    <strong>{payment.periodo || shortDate(payment.fecha)}</strong>
                    <small>{shortDate(payment.fecha)}</small>
                  </div>
                  <div>
                    <b>{money(payment.monto)}</b>
                    <span>{payment.estado || 'Pagado'}</span>
                  </div>
                </article>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CredentialReveal({
  delivery,
  onRevealed,
}: {
  delivery: CredentialDelivery;
  onRevealed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const reveal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pin.length !== 4 || !delivery.id) {
      setError('Ingresa tu PIN de 4 dígitos.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const result = await revealCredential(delivery.id, pin);
      if (!result.password) throw new Error('La contraseña ya no está disponible.');
      setPassword(result.password);
      onRevealed();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible consultar la contraseña.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gx-credential-delivery">
      <button type="button" onClick={() => setOpen((value) => !value)}>
        <span>
          <b>Contraseña nueva disponible</b>
          <small>Se muestra una sola vez · confirma con tu PIN</small>
        </span>
        <i>→</i>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="gx-credential-reveal"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="gx-credential-reveal-inner">
              {!password ? (
                <form onSubmit={reveal}>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(event) =>
                      setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
                    }
                    placeholder="PIN"
                  />
                  <button type="submit" disabled={busy}>
                    {busy ? 'Validando…' : 'Mostrar'}
                  </button>
                </form>
              ) : (
                <div className="gx-credential-secret">
                  <small>{delivery.cuenta_login || 'Cuenta'}</small>
                  <strong>{password}</strong>
                  <span>Guárdala ahora. Por seguridad no podrá mostrarse otra vez.</span>
                </div>
              )}
              {error && <p>{error}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function accessForService(
  service: GoxionService,
  accesses: GoxionAccess[],
): GoxionAccess[] {
  return accesses.filter(
    (access) => String(access.cliente_servicio_id || '') === String(service.id || ''),
  );
}

function ServicesSection({
  data,
  onRefresh,
}: {
  data: ClientSpaceData;
  onRefresh: () => Promise<void>;
}) {
  const services = Array.isArray(data.servicios) ? data.servicios : [];
  const accesses = Array.isArray(data.cliente_accesos) ? data.cliente_accesos : [];
  const deliveries = Array.isArray(data.credenciales_entregas)
    ? data.credenciales_entregas
    : [];
  const news = Array.isArray(data.novedades_servicio) ? data.novedades_servicio : [];
  const cancellations = Array.isArray(data.cancelaciones) ? data.cancelaciones : [];
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section className="gx-space-section">
      <div className="gx-space-section-static-head">
        <div>
          <span className="gx-space-kicker">TUS SERVICIOS</span>
          <strong>{services.length} activo{services.length === 1 ? '' : 's'}</strong>
        </div>
      </div>

      <div className="gx-service-list">
        {services.map((service, index) => {
          const id = String(service.id || index);
          const open = openId === id;
          const serviceAccesses = accessForService(service, accesses);
          const pending = deliveries.find(
            (item) =>
              String(item.cliente_servicio_id || '') === id &&
              String(item.estado || '').toLowerCase() === 'pendiente' &&
              item.activa !== false &&
              item.servicio_activo !== false,
          );
          const serviceNews = news.filter(
            (item) => String(item.cliente_servicio_id || '') === id,
          );
          const cancellation = cancellations.find(
            (item) => String(item.cliente_servicio_id || '') === id,
          );

          return (
            <motion.article layout key={id} className="gx-service-live-card">
              <button
                type="button"
                className="gx-service-live-head"
                onClick={() => setOpenId(open ? null : id)}
              >
                <div className="gx-service-live-mark">
                  {String(service.nombre || 'G').slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <strong>{service.nombre || 'Servicio GOXION'}</strong>
                  <small>
                    {serviceAccesses.length
                      ? serviceAccesses.length +
                        ' acceso' +
                        (serviceAccesses.length === 1 ? '' : 's')
                      : service.perfil_nombre
                        ? 'Perfil: ' + service.perfil_nombre
                        : 'Servicio activo'}
                  </small>
                </div>
                <div className="gx-service-live-price">
                  <b>{money(service.monto)}</b>
                  <motion.i animate={{ rotate: open ? 180 : 0 }}>⌄</motion.i>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    className="gx-service-live-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="gx-service-live-body-inner">
                      {serviceNews.map((item, nIndex) => (
                        <div className="gx-service-news" key={String(item.id || nIndex)}>
                          <span>✦</span>
                          <div>
                            <strong>{item.titulo || 'Novedad'}</strong>
                            <small>{item.resumen || 'Hay una actualización para tu servicio.'}</small>
                          </div>
                        </div>
                      ))}

                      {serviceAccesses.length ? (
                        serviceAccesses.map((access, aIndex) => (
                          <div className="gx-service-access" key={String(access.id || aIndex)}>
                            <div>
                              <small>
                                {access.modo_acceso === 'invitacion'
                                  ? 'Acceso por invitación'
                                  : 'Cuenta / perfil'}
                              </small>
                              <strong>{access.correo || 'Configuración en proceso'}</strong>
                            </div>
                            <div>
                              {access.perfil_nombre && <span>{access.perfil_nombre}</span>}
                              {access.perfil_pin && <b>PIN {access.perfil_pin}</b>}
                              {access.modo_acceso === 'invitacion' &&
                                access.estado_invitacion && (
                                  <em>{access.estado_invitacion}</em>
                                )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="gx-service-access">
                          <div>
                            <small>Acceso</small>
                            <strong>{service.correo_login || 'Configuración en proceso'}</strong>
                          </div>
                          <div>
                            {service.perfil_nombre && <span>{service.perfil_nombre}</span>}
                            {service.perfil_pin && <b>PIN {service.perfil_pin}</b>}
                          </div>
                        </div>
                      )}

                      {pending && (
                        <CredentialReveal
                          delivery={pending}
                          onRevealed={() => void onRefresh()}
                        />
                      )}

                      <ServiceCancellation
                        service={service}
                        cancellation={cancellation}
                        onRefresh={onRefresh}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}

        {!services.length && (
          <div className="gx-client-empty">
            <strong>Tu primer servicio aparecerá aquí</strong>
            <small>Explora el catálogo para comenzar.</small>
          </div>
        )}
      </div>
    </section>
  );
}

function BenefitsSection({
  data,
  onRefresh,
}: {
  data: ClientSpaceData;
  onRefresh: () => Promise<void>;
}) {
  const gamif = data.gamificacion;
  const referral = (data.referidos || []).find((item) => item.activo !== false);
  const progress = Array.isArray(data.misiones_progreso) ? data.misiones_progreso : [];
  const tasks = String(gamif?.tareas || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const completed = new Set(
    progress
      .map((item) => Number(item.mision_index))
      .filter((value) => Number.isInteger(value)),
  );
  const allDone = tasks.length > 0 && completed.size >= tasks.length;
  const couponClaimed =
    gamif?.cupon_reclamado === true ||
    Number(gamif?.cupon_reclamado_ciclo || 0) >= Number(gamif?.cupon_ciclo || 1);
  const referralReady =
    Number(referral?.plataformas || 0) >= 2 &&
    Number(referral?.meses_efectivos || referral?.meses_override || referral?.meses || 0) >= 3;
  const [busy, setBusy] = useState<'coupon' | 'referral' | null>(null);
  const [message, setMessage] = useState('');

  const doClaimCoupon = async () => {
    setBusy('coupon');
    setMessage('');
    try {
      const result = await claimCoupon();
      setMessage(
        result.ya_reclamado
          ? 'Tu cupón ya estaba reclamado.'
          : 'Cupón reclamado correctamente.',
      );
      await onRefresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'No fue posible reclamar el cupón.');
    } finally {
      setBusy(null);
    }
  };

  const doClaimReferral = async () => {
    setBusy('referral');
    setMessage('');
    try {
      const result = await claimReferralMonth();
      setMessage(
        result.ya_reclamado
          ? 'El beneficio ya estaba reclamado.'
          : 'Mes gratis reclamado correctamente.',
      );
      await onRefresh();
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : 'No fue posible reclamar el beneficio.',
      );
    } finally {
      setBusy(null);
    }
  };

  if (!gamif?.misiones_activas && !referral) return null;

  return (
    <section className="gx-space-section gx-benefits-section">
      <div className="gx-space-section-static-head">
        <div>
          <span className="gx-space-kicker">BENEFICIOS</span>
          <strong>Misiones y referidos</strong>
        </div>
      </div>

      {gamif?.misiones_activas && (
        <article className="gx-benefit-card">
          <div className="gx-benefit-card-head">
            <div>
              <small>MISIONES</small>
              <strong>{Number(gamif.descuento || 0)}% de descuento</strong>
            </div>
            <span>
              {completed.size}/{tasks.length}
            </span>
          </div>
          <div className="gx-mission-list">
            {tasks.map((task, index) => (
              <div className={completed.has(index) ? 'done' : ''} key={index}>
                <span>{completed.has(index) ? '✓' : index + 1}</span>
                <small>{task.replace(/\s*\[[^\]]+\]\s*$/, '')}</small>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="gx-benefit-action"
            disabled={!allDone || couponClaimed || busy !== null}
            onClick={() => void doClaimCoupon()}
          >
            {couponClaimed
              ? 'Cupón reclamado ✓'
              : busy === 'coupon'
                ? 'Registrando…'
                : allDone
                  ? 'Aplicar cupón'
                  : 'Completa tus misiones'}
          </button>
        </article>
      )}

      {referral && (
        <article className="gx-benefit-card referral">
          <div className="gx-benefit-card-head">
            <div>
              <small>REFERIDO ACTIVO</small>
              <strong>{referral.nombre || 'Tu referido'}</strong>
            </div>
            <span>{Number(referral.meses_efectivos || referral.meses || 0)}/3 meses</span>
          </div>
          <p>
            {Number(referral.plataformas || 0)} plataforma
            {Number(referral.plataformas || 0) === 1 ? '' : 's'} activa
            {Number(referral.plataformas || 0) === 1 ? '' : 's'}.
          </p>
          <button
            type="button"
            className="gx-benefit-action"
            disabled={
              !referralReady ||
              referral.beneficio_reclamado === true ||
              busy !== null
            }
            onClick={() => void doClaimReferral()}
          >
            {referral.beneficio_reclamado
              ? 'Mes gratis reclamado ✓'
              : busy === 'referral'
                ? 'Registrando…'
                : referralReady
                  ? 'Reclamar mes gratis'
                  : 'Beneficio en progreso'}
          </button>
        </article>
      )}

      {message && <div className="gx-benefit-message">{message}</div>}
    </section>
  );
}

export function ClientSpace({
  data,
  onLogout,
  onCatalog,
  onDataChange,
}: Props) {
  const client = data.cliente ?? {};
  const services = Array.isArray(data.servicios) ? data.servicios : [];
  const firstName =
    String(client.nombre || 'Cliente').trim().split(/\s+/)[0] || 'Cliente';
  const [refreshing, setRefreshing] = useState(false);

  const totalMonthly = useMemo(
    () => services.reduce((sum, service) => sum + Number(service.monto || 0), 0),
    [services],
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      const next = await refreshClientSpace();
      onDataChange(next);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="gx-help-view gx-client-space">
      <section className="gx-client-welcome">
        <div>
          <span className="gx-help-eyebrow">MI ESPACIO</span>
          <h1>
            ¡Hola, <span>{firstName}</span>! 👋
          </h1>
          <p>
            {client.folio ? 'Folio ' + client.folio + ' · ' : ''}
            {services.length} servicio{services.length === 1 ? '' : 's'} ·{' '}
            {money(totalMonthly)} mensual
          </p>
        </div>
        <button
          type="button"
          className={'gx-space-refresh ' + (refreshing ? 'loading' : '')}
          onClick={() => void refresh()}
          disabled={refreshing}
          aria-label="Actualizar Mi Espacio"
        >
          ↻
        </button>
      </section>

      <PaymentAlert data={data} />
      <BillingCard data={data} />

      <div className="gx-client-quick-grid">
        <button type="button" onClick={onCatalog}>
          <span>◈</span>
          <div>
            <strong>Explorar catálogo</strong>
            <small>Consulta disponibilidad</small>
          </div>
          <i>→</i>
        </button>
        <div>
          <span>✦</span>
          <div>
            <strong>Lealtad</strong>
            <small>
              Nivel {Number(data.estado_cuenta?.lealtad?.nivel || 0)} ·{' '}
              {Number(data.estado_cuenta?.lealtad?.pagos_efectivos || 0)} pagos
            </small>
          </div>
        </div>
      </div>

      <ServicesSection data={data} onRefresh={refresh} />
      <BenefitsSection data={data} onRefresh={refresh} />
      <PaymentHistory data={data} />

      <section className="gx-client-security-note">
        <span>◉</span>
        <div>
          <strong>Tu espacio está protegido</strong>
          <small>
            Las contraseñas de plataforma de una sola vista requieren tu PIN y no
            se guardan en esta pantalla.
          </small>
        </div>
      </section>

      <button type="button" className="gx-client-logout" onClick={onLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}
