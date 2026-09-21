import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AdminAccountState,
  AdminCatalogService,
  AdminClient,
  AdminData,
  AdminNotification,
  Benefit,
  Cancellation,
  FairDeal,
  Promotion,
  RegistrationRequest,
  adminAction,
  adminOperation,
  benefitAction,
  cancellationAction,
  getAdminToken,
  loadAdminBundle,
  loginAdmin,
  logoutAdmin,
  promotionAction,
  registrationAction,
} from '../lib/admin-api';

type Tab = 'home' | 'clients' | 'operations' | 'management';
type Bundle = Awaited<ReturnType<typeof loadAdminBundle>>;

const money = (value: unknown) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const shortDate = (value: unknown) => {
  const text = String(value || '');
  if (!text) return '—';
  const date = new Date(text);
  return Number.isNaN(date.getTime())
    ? text
    : new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(date);
};

const normalize = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function clientState(client: AdminClient, states: AdminAccountState[]) {
  const central = states.find((item) => String(item.cliente_id) === client.id);
  if (client.estado === 'suspendido') return 'suspendido';
  if (central?.estado) return central.estado;
  if (client.pago_en_revision) return 'revision';
  return client.estado || 'pendiente';
}

function stateLabel(state: string) {
  const map: Record<string, string> = {
    pagado: 'Pagado',
    revision: 'En revisión',
    suspendido: 'Suspendido',
    vencido: 'Vencido',
    vence_hoy: 'Vence hoy',
    por_vencer: 'Por vencer',
    incompleto: 'Incompleto',
    pendiente: 'Pendiente',
  };
  return map[state] || state;
}

function LoginPanel({ onLogin }: { onLogin: () => Promise<unknown> }) {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user.trim() || !password) {
      setError('Ingresa usuario y contraseña.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await loginAdmin(user.trim(), password);
      await onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="gx-admin-login">
      <div className="gx-admin-bg-orb a" />
      <div className="gx-admin-bg-orb b" />
      <motion.form
        className="gx-admin-login-card"
        onSubmit={submit}
        initial={{ opacity: 0, y: 15, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <div className="gx-admin-login-mark">G</div>
        <span className="gx-admin-eyebrow">GOXION // ADMIN</span>
        <h1>Centro de operaciones</h1>
        <p>Acceso restringido al panel administrativo.</p>
        <label>
          <span>Usuario</span>
          <input
            autoComplete="username"
            value={user}
            onChange={(event) => setUser(event.target.value)}
            disabled={busy}
          />
        </label>
        <label>
          <span>Contraseña</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
          />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Validando…' : 'Entrar a Admin'}
        </button>
        {error && <div className="gx-admin-login-error">{error}</div>}
      </motion.form>
    </main>
  );
}

function FinancePanel({ bundle }: { bundle: Bundle }) {
  const data = bundle.core;
  const activeClients = new Set(
    data.clientes
      .filter((client) => client.estado !== 'suspendido')
      .map((client) => client.id),
  );
  const income = data.cliente_servicios
    .filter(
      (service) =>
        service.activo !== false &&
        service.cliente_id &&
        activeClients.has(service.cliente_id),
    )
    .reduce((sum, service) => sum + Number(service.monto || 0), 0);
  const costs = data.catalogo
    .filter((service) => service.activo !== false)
    .reduce(
      (sum, service) =>
        sum + Number(service.costo || 0) * Math.max(1, Number(service.cuentas || 1)),
      0,
    );
  const profit = income - costs;
  const margin = income > 0 ? (profit / income) * 100 : 0;

  return (
    <details className="gx-admin-business" open>
      <summary>
        <div>
          <span className="gx-admin-eyebrow">NEGOCIO</span>
          <strong>Finanzas y panorama</strong>
        </div>
        <span>⌄</span>
      </summary>
      <div className="gx-admin-business-body">
        <div className="gx-admin-kpis">
          <div>
            <small>Ingresos</small>
            <strong>{money(income)}</strong>
            <span>Brutos mensuales</span>
          </div>
          <div>
            <small>Costos</small>
            <strong>{money(costs)}</strong>
            <span>Inversión mensual</span>
          </div>
          <div>
            <small>Ganancia</small>
            <strong className={profit < 0 ? 'bad' : 'good'}>{money(profit)}</strong>
            <span>Neta estimada</span>
          </div>
          <div>
            <small>Margen</small>
            <strong>{margin.toFixed(1)}%</strong>
            <span>Rentabilidad</span>
          </div>
        </div>
      </div>
    </details>
  );
}

function HomeView({
  bundle,
  go,
}: {
  bundle: Bundle;
  go: (tab: Tab, focus?: string) => void;
}) {
  const data = bundle.core;
  const states = bundle.accountStates;
  const dueToday = states.filter((item) => item.estado === 'vence_hoy');
  const overdue = states.filter((item) =>
    ['vencido', 'incompleto'].includes(String(item.estado)),
  );
  const reviews = data.clientes.filter(
    (client) =>
      client.pago_en_revision ||
      String(client.pago_revision_estado || '').toLowerCase() === 'revision',
  );
  const support = data.notificaciones.filter(
    (item) => !item.leida && item.tipo === 'soporte',
  );
  const payments = data.notificaciones.filter(
    (item) =>
      !item.leida &&
      (item.tipo === 'pagos' ||
        item.tipo === 'pago' ||
        item.titulo?.toLowerCase().includes('comprobante')),
  );
  const cancellations = bundle.cancellations.filter((item) =>
    ['solicitada', 'aprobada'].includes(String(item.estado || '')),
  );
  const registrationCount =
    Number(bundle.registrations?.resumen?.foco_rojo || 0) +
    Number(bundle.registrations?.resumen?.nuevos_pendientes || 0);
  const totalDecisions =
    reviews.length + cancellations.length + support.length + registrationCount;

  const nextPayments = [...states]
    .filter((item) => !['pagado', 'revision'].includes(String(item.estado)))
    .sort((a, b) => {
      const da = Number(a.dias_para_corte || 0) - Number(a.dias_atraso || 0);
      const db = Number(b.dias_para_corte || 0) - Number(b.dias_atraso || 0);
      return da - db;
    })
    .slice(0, 6);

  return (
    <div className="gx-admin-view">
      <section className="gx-admin-heading">
        <div>
          <span className="gx-admin-eyebrow">HOY EN GOXION</span>
          <h1>Qué requiere tu atención</h1>
          <p>Primero cobros, revisiones y solicitudes. Lo demás queda a un toque.</p>
        </div>
      </section>

      <div className="gx-admin-priority-grid">
        <button type="button" className="today" onClick={() => go('clients', 'today')}>
          <span>HOY</span>
          <strong>{dueToday.length}</strong>
          <small>Cobran hoy</small>
        </button>
        <button type="button" className="overdue" onClick={() => go('clients', 'overdue')}>
          <span>COBRO</span>
          <strong>{overdue.length}</strong>
          <small>Vencidos</small>
        </button>
        <button type="button" className="review" onClick={() => go('operations', 'payments')}>
          <span>VALIDAR</span>
          <strong>{reviews.length || payments.length}</strong>
          <small>En revisión</small>
        </button>
        <button type="button" className="requests" onClick={() => go('operations')}>
          <span>MI ESPACIO</span>
          <strong>{support.length + cancellations.length + registrationCount}</strong>
          <small>Solicitudes</small>
        </button>
      </div>

      <section className="gx-admin-decision-center">
        <div className="gx-admin-decision-head">
          <div>
            <span className="gx-admin-eyebrow">AUTOMATIZACIÓN</span>
            <h2>Tu veredicto</h2>
            <p>Solo lo que necesita una decisión tuya.</p>
          </div>
          <span>{totalDecisions} pendientes</span>
        </div>
        <div className="gx-admin-decision-grid">
          <button type="button" onClick={() => go('operations', 'payments')}>
            <span>Pagos</span>
            <strong>{reviews.length}</strong>
            <small>Por validar</small>
          </button>
          <button type="button" onClick={() => go('operations', 'cancellations')}>
            <span>Cancelaciones</span>
            <strong>{cancellations.length}</strong>
            <small>Esperan resolución</small>
          </button>
          <button type="button" onClick={() => go('operations', 'support')}>
            <span>Soporte</span>
            <strong>{support.length}</strong>
            <small>Solicitudes nuevas</small>
          </button>
          <button type="button" onClick={() => go('operations', 'registrations')}>
            <span>Registros</span>
            <strong>{registrationCount}</strong>
            <small>Por revisar</small>
          </button>
        </div>
      </section>

      <section className="gx-admin-upcoming">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">COBRO</span>
            <h2>Próximos vencimientos</h2>
          </div>
        </div>
        <div className="gx-admin-upcoming-list">
          {nextPayments.map((item) => (
            <article key={String(item.cliente_id)}>
              <div>
                <strong>{item.nombre || item.folio || 'Cliente'}</strong>
                <small>{item.estado_label || stateLabel(String(item.estado || ''))}</small>
              </div>
              <div>
                <b>{money(item.total_actual)}</b>
                <span>{item.fecha_corte ? shortDate(item.fecha_corte) : '—'}</span>
              </div>
            </article>
          ))}
          {!nextPayments.length && <div className="gx-admin-empty">No hay cobros pendientes.</div>}
        </div>
      </section>

      <FinancePanel bundle={bundle} />
    </div>
  );
}

function ClientEditor({
  client,
  state,
  data,
  onClose,
  onMutation,
}: {
  client: AdminClient;
  state?: AdminAccountState;
  data: AdminData;
  onClose: () => void;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [name, setName] = useState(client.nombre || '');
  const [folio, setFolio] = useState(client.folio || '');
  const [day, setDay] = useState(String(client.dia_pago || 15));
  const [status, setStatus] = useState(client.estado || 'pendiente');
  const services = data.cliente_servicios.filter(
    (service) => service.cliente_id === client.id && service.activo !== false,
  );

  const save = () =>
    onMutation(
      () =>
        adminAction('editar_cliente', {
          cliente_id: client.id,
          nombre: name.trim(),
          folio: folio.trim(),
          dia_pago: Number(day || 15),
          estado: status,
        }),
      'Cliente actualizado.',
    );

  const adjustLoyalty = (delta: number) =>
    onMutation(
      () => adminAction('ajustar_lealtad', { cliente_id: client.id, delta }),
      'Lealtad actualizada.',
    );

  return (
    <motion.div
      className="gx-admin-sheet-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <motion.section
        className="gx-admin-client-sheet"
        initial={{ opacity: 0, y: 22, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
      >
        <header>
          <div>
            <span className="gx-admin-eyebrow">CLIENTE</span>
            <h2>{client.nombre}</h2>
            <p>{client.folio || 'Sin folio'} · {state?.estado_label || client.estado}</p>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </header>

        <div className="gx-admin-client-overview">
          <div>
            <small>Mensualidad</small>
            <strong>{money(state?.subtotal || services.reduce((s, x) => s + Number(x.monto || 0), 0))}</strong>
          </div>
          <div>
            <small>Total actual</small>
            <strong>{money(state?.total_actual)}</strong>
          </div>
          <div>
            <small>Lealtad</small>
            <strong>Nivel {Number(state?.lealtad?.nivel || 0)}</strong>
          </div>
          <div>
            <small>Racha</small>
            <strong>{Number(client.pagos_puntuales || 0)}</strong>
          </div>
        </div>

        <div className="gx-admin-client-form">
          <label>
            <span>Nombre</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span>Folio</span>
            <input value={folio} onChange={(event) => setFolio(event.target.value)} />
          </label>
          <label>
            <span>Día de cobro</span>
            <input type="number" min={1} max={31} value={day} onChange={(event) => setDay(event.target.value)} />
          </label>
          <label>
            <span>Estado</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="suspendido">Suspendido</option>
            </select>
          </label>
          <button type="button" className="primary" onClick={() => void save()}>
            Guardar cambios
          </button>
        </div>

        <section className="gx-admin-sheet-section">
          <div className="gx-admin-section-head">
            <div><span className="gx-admin-eyebrow">LEALTAD</span><h3>Racha puntual</h3></div>
          </div>
          <div className="gx-admin-loyalty-control">
            <button type="button" onClick={() => void adjustLoyalty(-1)}>−</button>
            <strong>{Number(client.pagos_puntuales || 0)}</strong>
            <button type="button" onClick={() => void adjustLoyalty(1)}>＋</button>
          </div>
        </section>

        <section className="gx-admin-sheet-section">
          <div className="gx-admin-section-head">
            <div><span className="gx-admin-eyebrow">SERVICIOS</span><h3>{services.length} activos</h3></div>
          </div>
          <div className="gx-admin-client-services">
            {services.map((service) => (
              <div key={service.id}>
                <span>{service.nombre}</span>
                <strong>{money(service.monto)}</strong>
              </div>
            ))}
          </div>
        </section>
      </motion.section>
    </motion.div>
  );
}

function ClientsView({
  bundle,
  focus,
  onMutation,
}: {
  bundle: Bundle;
  focus?: string;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(
    focus === 'today' ? 'today' : focus === 'overdue' ? 'overdue' : 'all',
  );
  const [selected, setSelected] = useState<AdminClient | null>(null);
  const data = bundle.core;

  const rows = useMemo(() => {
    const q = normalize(query);
    return data.clientes
      .map((client) => ({
        client,
        state: bundle.accountStates.find(
          (item) => String(item.cliente_id) === client.id,
        ),
        bucket: clientState(client, bundle.accountStates),
      }))
      .filter((row) => {
        if (q) {
          const text = normalize(
            (row.client.nombre || '') + ' ' + (row.client.folio || ''),
          );
          if (!text.includes(q)) return false;
        }
        if (filter === 'all') return true;
        if (filter === 'today') return row.bucket === 'vence_hoy';
        if (filter === 'overdue')
          return ['vencido', 'incompleto'].includes(row.bucket);
        if (filter === 'revision') return row.bucket === 'revision';
        if (filter === 'pagado') return row.bucket === 'pagado';
        if (filter === 'suspendido') return row.bucket === 'suspendido';
        return row.bucket === filter;
      })
      .sort((a, b) => {
        const aLate = Number(a.state?.dias_atraso || 0);
        const bLate = Number(b.state?.dias_atraso || 0);
        if (aLate !== bLate) return bLate - aLate;
        return String(a.client.nombre || '').localeCompare(
          String(b.client.nombre || ''),
          'es',
        );
      });
  }, [bundle.accountStates, data.clientes, filter, query]);

  return (
    <div className="gx-admin-view">
      <section className="gx-admin-heading">
        <div>
          <span className="gx-admin-eyebrow">CRM OPERATIVO</span>
          <h1>Clientes</h1>
          <p>Busca, filtra y entra directo a lo que necesitas.</p>
        </div>
      </section>

      <div className="gx-admin-client-toolbar">
        <label>
          <span>⌕</span>
          <input
            placeholder="Buscar nombre, folio…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="gx-admin-filter-pills">
          {[
            ['all', 'Todos'],
            ['revision', 'Revisión'],
            ['pendiente', 'Pendientes'],
            ['pagado', 'Pagados'],
            ['suspendido', 'Suspendidos'],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="gx-admin-client-list">
        {rows.map(({ client, state, bucket }) => (
          <motion.button
            layout
            type="button"
            key={client.id}
            className="gx-admin-client-row"
            onClick={() => setSelected(client)}
          >
            <span className={'gx-admin-client-state ' + bucket} />
            <div>
              <strong>{client.nombre || 'Cliente'}</strong>
              <small>{client.folio || 'Sin folio'} · Día {client.dia_pago || 15}</small>
            </div>
            <div>
              <b>{money(state?.total_actual)}</b>
              <span>{state?.estado_label || stateLabel(bucket)}</span>
            </div>
            <i>→</i>
          </motion.button>
        ))}
        {!rows.length && <div className="gx-admin-empty">No hay clientes con este filtro.</div>}
      </div>

      <AnimatePresence>
        {selected && (
          <ClientEditor
            client={selected}
            state={bundle.accountStates.find(
              (item) => String(item.cliente_id) === selected.id,
            )}
            data={data}
            onClose={() => setSelected(null)}
            onMutation={onMutation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentDecisions({
  bundle,
  onMutation,
}: {
  bundle: Bundle;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const rows = bundle.core.clientes.filter(
    (client) =>
      client.pago_en_revision ||
      ['revision', 'incompleto'].includes(
        String(client.pago_revision_estado || '').toLowerCase(),
      ),
  );

  return (
    <div className="gx-admin-ops-list">
      {rows.map((client) => {
        const state = bundle.accountStates.find(
          (item) => String(item.cliente_id) === client.id,
        );
        const amount = Number(state?.total_actual || state?.subtotal || 0);
        return (
          <article key={client.id} className="gx-admin-decision-card">
            <div className="gx-admin-decision-card-head">
              <div>
                <strong>{client.nombre}</strong>
                <small>{client.folio || 'Sin folio'} · {state?.periodo_label || 'Periodo actual'}</small>
              </div>
              <b>{money(amount)}</b>
            </div>
            {client.pago_revision_mensaje && (
              <p>{client.pago_revision_mensaje}</p>
            )}
            <div className="gx-admin-decision-actions">
              <button
                type="button"
                className="success"
                onClick={() =>
                  void onMutation(
                    () =>
                      adminOperation('aprobar_pago', {
                        cliente_id: client.id,
                        monto: amount,
                        puntual: true,
                      }),
                    'Pago aprobado.',
                  )
                }
              >
                Aprobar
              </button>
              <button
                type="button"
                className="warning"
                onClick={() => {
                  const raw = window.prompt('Monto faltante:', '0');
                  if (raw === null) return;
                  void onMutation(
                    () =>
                      adminOperation('pago_incompleto', {
                        cliente_id: client.id,
                        monto_faltante: Number(raw || 0),
                        mensaje: 'El pago está incompleto.',
                      }),
                    'Pago marcado como incompleto.',
                  );
                }}
              >
                Incompleto
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (!window.confirm('¿Rechazar este comprobante?')) return;
                  void onMutation(
                    () =>
                      adminOperation('rechazar_pago', {
                        cliente_id: client.id,
                        mensaje: 'El comprobante fue rechazado.',
                      }),
                    'Comprobante rechazado.',
                  );
                }}
              >
                Rechazar
              </button>
            </div>
          </article>
        );
      })}
      {!rows.length && <div className="gx-admin-empty">No hay pagos pendientes de decisión.</div>}
    </div>
  );
}

function CancellationDecisions({
  rows,
  onMutation,
}: {
  rows: Cancellation[];
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const open = rows.filter((item) =>
    ['solicitada', 'aprobada'].includes(String(item.estado || '')),
  );

  return (
    <div className="gx-admin-ops-list">
      {open.map((item) => (
        <article key={String(item.id)} className="gx-admin-decision-card">
          <div className="gx-admin-decision-card-head">
            <div>
              <strong>{item.servicio_nombre || 'Servicio'}</strong>
              <small>{String(item.estado || 'solicitada')}</small>
            </div>
            <span className="gx-admin-badge">{String(item.estado || '')}</span>
          </div>
          {item.motivo && <p>{item.motivo}</p>}
          <div className="gx-admin-decision-actions">
            {item.estado === 'solicitada' && (
              <>
                <button
                  type="button"
                  className="success"
                  onClick={() =>
                    void onMutation(
                      () =>
                        cancellationAction('resolver', {
                          solicitud_id: item.id,
                          decision: 'aprobada',
                          fecha_efectiva: new Date().toISOString().slice(0, 10),
                        }),
                      'Cancelación aprobada.',
                    )
                  }
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() =>
                    void onMutation(
                      () =>
                        cancellationAction('resolver', {
                          solicitud_id: item.id,
                          decision: 'rechazada',
                        }),
                      'Cancelación rechazada.',
                    )
                  }
                >
                  Rechazar
                </button>
              </>
            )}
            {item.estado === 'aprobada' && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  if (!window.confirm('Esto desactivará el servicio. ¿Continuar?')) return;
                  void onMutation(
                    () =>
                      cancellationAction('hacer_efectiva', {
                        solicitud_id: item.id,
                      }),
                    'Cancelación aplicada.',
                  );
                }}
              >
                Hacer efectiva
              </button>
            )}
          </div>
        </article>
      ))}
      {!open.length && <div className="gx-admin-empty">No hay cancelaciones pendientes.</div>}
    </div>
  );
}

function RegistrationDecisions({
  rows,
  onMutation,
}: {
  rows: RegistrationRequest[];
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const pending = rows.filter(
    (item) =>
      item.estado_admin !== 'descartado' &&
      (item.estado_admin === 'pendiente' ||
        item.activacion?.estado === 'pendiente' ||
        !item.cliente_id),
  );
  const [delivery, setDelivery] = useState<Record<string, unknown> | null>(null);

  const prepare = async (request: RegistrationRequest) => {
    try {
      const result = await registrationAction('preparar_activacion', {
        solicitud_id: request.id,
      });
      setDelivery(result);
      await onMutation(async () => result, 'Activación preparada.');
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'No fue posible preparar la activación.');
    }
  };

  return (
    <>
      <div className="gx-admin-ops-list">
        {pending.map((item) => (
          <article key={item.id} className="gx-admin-decision-card">
            <div className="gx-admin-decision-card-head">
              <div>
                <strong>{item.nombre_declarado || 'Registro'}</strong>
                <small>{item.telefono_normalizado || 'Sin teléfono'} · {item.resultado}</small>
              </div>
              <span className={'gx-admin-badge ' + (item.resultado || '')}>
                {item.activacion?.estado || item.estado_admin || 'pendiente'}
              </span>
            </div>
            {item.detalle && <p>{item.detalle}</p>}
            <div className="gx-admin-decision-actions">
              {item.resultado === 'nuevo' && !item.activacion && (
                <button type="button" className="success" onClick={() => void prepare(item)}>
                  Preparar activación
                </button>
              )}
              {item.activacion?.estado === 'pendiente' && (
                <button
                  type="button"
                  onClick={() =>
                    void onMutation(
                      () =>
                        registrationAction('regenerar_activacion', {
                          solicitud_id: item.id,
                        }),
                      'Código regenerado.',
                    )
                  }
                >
                  Regenerar código
                </button>
              )}
              {item.resultado === 'review' || item.resultado === 'revisar' ? (
                <span className="gx-admin-inline-note">Requiere vincular o resolver desde identidad.</span>
              ) : null}
            </div>
          </article>
        ))}
        {!pending.length && <div className="gx-admin-empty">No hay registros pendientes.</div>}
      </div>

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
              <button type="button" onClick={() => setDelivery(null)}>×</button>
              <span className="gx-admin-eyebrow">ACTIVACIÓN PREPARADA</span>
              <h3>{String(delivery.nombre || 'Nuevo cliente')}</h3>
              <div>
                <small>GOXION ID</small>
                <strong>{String(delivery.goxion_id || '—')}</strong>
              </div>
              <div>
                <small>Código</small>
                <strong>{String(delivery.codigo || '—')}</strong>
              </div>
              <p>Vence: {shortDate(delivery.expira_at)}</p>
              {Boolean(delivery.mensaje_whatsapp) && (
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    void navigator.clipboard.writeText(
                      String(delivery.mensaje_whatsapp || ''),
                    )
                  }
                >
                  Copiar mensaje
                </button>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NotificationsPanel({
  notifications,
  onMutation,
}: {
  notifications: AdminNotification[];
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const unread = notifications.filter((item) => !item.leida);
  return (
    <div className="gx-admin-notifications">
      {notifications.slice(0, 40).map((item) => (
        <article className={item.leida ? '' : 'unread'} key={item.id}>
          <span />
          <div>
            <strong>{item.titulo || item.tipo || 'Notificación'}</strong>
            <p>{item.mensaje || ''}</p>
            <small>{shortDate(item.created_at)}</small>
          </div>
        </article>
      ))}
      {unread.length > 0 && (
        <button
          type="button"
          className="gx-admin-mark-read"
          onClick={() =>
            void onMutation(
              () =>
                adminOperation('marcar_notificaciones_leidas', {
                  ids: unread.map((item) => item.id),
                }),
              'Notificaciones marcadas como leídas.',
            )
          }
        >
          Marcar todo como leído
        </button>
      )}
    </div>
  );
}

function OperationsView({
  bundle,
  focus,
  onMutation,
}: {
  bundle: Bundle;
  focus?: string;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [section, setSection] = useState(focus || 'payments');
  const registrationRows = bundle.registrations?.solicitudes || [];
  const support = bundle.core.notificaciones.filter((item) => item.tipo === 'soporte');

  return (
    <div className="gx-admin-view">
      <section className="gx-admin-heading">
        <div>
          <span className="gx-admin-eyebrow">BANDEJA OPERATIVA</span>
          <h1>Operaciones</h1>
          <p>Decisiones reales, agrupadas por flujo.</p>
        </div>
      </section>

      <div className="gx-admin-ops-tabs">
        {[
          ['payments', 'Pagos'],
          ['cancellations', 'Cancelaciones'],
          ['support', 'Soporte'],
          ['registrations', 'Registros'],
          ['notifications', 'Actividad'],
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

      {section === 'payments' && <PaymentDecisions bundle={bundle} onMutation={onMutation} />}
      {section === 'cancellations' && (
        <CancellationDecisions rows={bundle.cancellations} onMutation={onMutation} />
      )}
      {section === 'registrations' && (
        <RegistrationDecisions rows={registrationRows} onMutation={onMutation} />
      )}
      {section === 'support' && (
        <NotificationsPanel notifications={support} onMutation={onMutation} />
      )}
      {section === 'notifications' && (
        <NotificationsPanel
          notifications={bundle.core.notificaciones}
          onMutation={onMutation}
        />
      )}
    </div>
  );
}

function CatalogManagement({ bundle }: { bundle: Bundle }) {
  const services = bundle.core.catalogo;
  const clientServices = bundle.core.cliente_servicios.filter((x) => x.activo !== false);

  const sold = (service: AdminCatalogService) => {
    const name = normalize(service.nombre);
    return clientServices.reduce((count, row) => {
      const rowName = normalize(row.nombre);
      let match = false;
      if (name.includes('netflix')) match = rowName.includes('netflix');
      else if (name.includes('disney')) match = rowName.includes('disney');
      else if (name.includes('max') || name.includes('hbo'))
        match = rowName.includes('max') || rowName.includes('hbo');
      else if (name.includes('prime'))
        match = rowName.includes('prime') || rowName.includes('amazon');
      else if (name.includes('youtube')) match = rowName.includes('youtube');
      else if (name.includes('vix')) match = rowName.includes('vix');
      else if (name.includes('crunchy')) match = rowName.includes('crunchy');
      else if (name.includes('microsoft') || name.includes('365'))
        match = rowName.includes('microsoft') || rowName.includes('365');
      else if (name.includes('google'))
        match = rowName.includes('google') || rowName.includes('one');
      if (!match) return count;
      const quantity = rowName.match(/\(x\s*(\d+)\)/)?.[1];
      return count + Math.max(1, Number(quantity || 1));
    }, 0);
  };

  return (
    <div className="gx-admin-management-list">
      {services.map((service) => {
        const capacity = Number(service.cuentas || 0) * Number(service.limite || 0);
        const used = sold(service);
        const available =
          service.stock_manual === null || service.stock_manual === undefined
            ? Math.max(0, capacity - used)
            : Math.max(0, Number(service.stock_manual));
        return (
          <article key={service.id}>
            <div>
              <strong>{service.nombre}</strong>
              <small>{service.etiqueta || 'Servicio activo'}</small>
            </div>
            <div className="gx-admin-catalog-numbers">
              <span>Venta <b>{money(service.precio)}</b></span>
              <span>Costo <b>{money(service.costo)}</b></span>
              <span>Disp. <b className={available <= 1 ? 'bad' : 'good'}>{available}</b></span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PromotionsManagement({
  bundle,
  onMutation,
}: {
  bundle: Bundle;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const promotions = bundle.promotions?.promociones || [];
  const services = bundle.promotions?.servicios || bundle.core.catalogo;
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [creating, setCreating] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [name, setName] = useState('Promoción especial');
  const [price, setPrice] = useState('');
  const [periods, setPeriods] = useState('1');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [countdown, setCountdown] = useState(false);
  const [flash, setFlash] = useState(false);

  const open = (promo?: Promotion) => {
    const p = promo || null;
    setEditing(p);
    setCreating(true);
    setServiceId(String(p?.servicio_id || services[0]?.id || ''));
    setName(p?.nombre || 'Promoción especial');
    setPrice(p?.precio_promocional ? String(p.precio_promocional) : '');
    setPeriods(String(p?.duracion_periodos || 1));
    setStart(p?.inicio ? String(p.inicio).slice(0, 16) : '');
    setEnd(p?.fin ? String(p.fin).slice(0, 16) : '');
    setCountdown(p?.mostrar_contador === true);
    setFlash(p?.oferta_flash === true);
  };

  const save = async () => {
    await onMutation(
      () =>
        promotionAction('guardar', {
          id: editing?.id,
          servicio_id: serviceId,
          nombre: name,
          precio_promocional: Number(price),
          duracion_periodos: Number(periods),
          inicio: start,
          fin: end,
          mostrar_precio_anterior: true,
          mostrar_contador: countdown,
          oferta_flash: flash,
          activa: true,
        }),
      'Promoción guardada.',
    );
    setCreating(false);
    setEditing(null);
  };

  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div>
          <span className="gx-admin-eyebrow">CEREBRO COMERCIAL</span>
          <h3>Promociones del catálogo</h3>
        </div>
        <button type="button" onClick={() => open()}>＋ Nueva</button>
      </div>

      <div className="gx-admin-promo-list">
        {promotions.map((promo) => (
          <article key={String(promo.id)}>
            <div>
              <strong>{promo.servicio?.nombre || promo.nombre}</strong>
              <small>{promo.nombre} · {promo.duracion_periodos || 1} periodo(s)</small>
            </div>
            <div>
              <b>{money(promo.precio_promocional)}</b>
              <span>{promo.estado_visual || (promo.activa ? 'activa' : 'inactiva')}</span>
              <button type="button" onClick={() => open(promo)}>Editar</button>
            </div>
          </article>
        ))}
        {!promotions.length && <div className="gx-admin-empty">No hay promociones configuradas.</div>}
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div className="gx-admin-inline-editor" initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}>
            <div className="gx-admin-inline-editor-head">
              <strong>{editing ? 'Editar promoción' : 'Nueva promoción'}</strong>
              <button type="button" onClick={() => setCreating(false)}>×</button>
            </div>
            <label><span>Plataforma</span><select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>{services.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></label>
            <label><span>Nombre interno</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <div className="gx-admin-form-pair">
              <label><span>Precio promo</span><input type="number" value={price} onChange={(e) => setPrice(e.target.value)} /></label>
              <label><span>Duración</span><select value={periods} onChange={(e) => setPeriods(e.target.value)}>{[1,2,3,4,6,12].map((x)=><option key={x} value={x}>{x} periodo{x===1?'':'s'}</option>)}</select></label>
            </div>
            <div className="gx-admin-form-pair">
              <label><span>Inicio</span><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
              <label><span>Fin</span><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            </div>
            <div className="gx-admin-checks">
              <label><input type="checkbox" checked={countdown} onChange={(e)=>setCountdown(e.target.checked)} /> Contador</label>
              <label><input type="checkbox" checked={flash} onChange={(e)=>setFlash(e.target.checked)} /> Oferta flash</label>
            </div>
            <button type="button" className="primary" onClick={() => void save()}>Guardar promoción</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BenefitsManagement({
  bundle,
  onMutation,
}: {
  bundle: Bundle;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [clientId, setClientId] = useState(bundle.core.clientes[0]?.id || '');
  const [concept, setConcept] = useState('Descuento programado');
  const [value, setValue] = useState('');
  const [periods, setPeriods] = useState('1');

  const create = async () => {
    await onMutation(
      () =>
        benefitAction('crear_manual', {
          cliente_id: clientId,
          concepto: concept,
          tipo: 'monto',
          valor: Number(value),
          periodos_total: Number(periods),
        }),
      'Beneficio programado.',
    );
  };

  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div><span className="gx-admin-eyebrow">BENEFICIOS</span><h3>Descuentos programados</h3></div>
        <span>{bundle.benefits.length} registrados</span>
      </div>
      <div className="gx-admin-benefit-form">
        <label><span>Cliente</span><select value={clientId} onChange={(e)=>setClientId(e.target.value)}>{bundle.core.clientes.map((c)=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
        <label><span>Concepto</span><input value={concept} onChange={(e)=>setConcept(e.target.value)} /></label>
        <div className="gx-admin-form-pair">
          <label><span>Monto</span><input type="number" value={value} onChange={(e)=>setValue(e.target.value)} /></label>
          <label><span>Periodos</span><input type="number" min={1} max={36} value={periods} onChange={(e)=>setPeriods(e.target.value)} /></label>
        </div>
        <button type="button" className="primary" onClick={() => void create()}>Programar descuento</button>
      </div>
      <div className="gx-admin-benefit-list">
        {bundle.benefits.slice(0, 30).map((benefit: Benefit) => (
          <article key={String(benefit.id)}>
            <div><strong>{benefit.concepto || 'Beneficio'}</strong><small>{benefit.origen || 'manual'} · {benefit.estado_visual || benefit.estado}</small></div>
            <div><b>−{benefit.tipo === 'porcentaje' ? String(benefit.valor || 0)+'%' : money(benefit.valor)}</b>{benefit.activo !== false && <button type="button" onClick={() => void onMutation(()=>benefitAction('cancelar',{id:benefit.id}),'Beneficio cancelado.')}>Cancelar</button>}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

function InfrastructureManagement({ bundle }: { bundle: Bundle }) {
  const access = bundle.accessModel;
  const accounts = bundle.motherAccounts?.cuentas || [];
  const credentials = bundle.credentials?.credenciales || [];
  const pendingDeliveries = (bundle.credentials?.entregas || []).filter(
    (item) => String(item.estado) === 'pendiente',
  );
  const activeAccesses = access?.accesos || [];

  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div><span className="gx-admin-eyebrow">ARQUITECTURA</span><h3>Accesos y credenciales</h3></div>
      </div>
      <div className="gx-admin-infra-kpis">
        <div><strong>{accounts.length}</strong><span>Cuentas madre</span></div>
        <div><strong>{activeAccesses.length}</strong><span>Accesos activos</span></div>
        <div><strong>{credentials.length}</strong><span>Versiones credencial</span></div>
        <div><strong>{pendingDeliveries.length}</strong><span>Entregas pendientes</span></div>
      </div>
      <div className="gx-admin-account-list">
        {accounts.map((account) => (
          <article key={String(account.id)}>
            <div><strong>{String(account.alias || 'Cuenta')}</strong><small>{String(account.correo_login || '')}</small></div>
            <div><b>{Number(account.ocupados || 0)}/{Number(account.limite_perfiles || 0)}</b><span>{Number(account.disponibles || 0)} libres</span></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FairDealManagement({ rows }: { rows: FairDeal[] }) {
  const active = rows.filter((item) => item.activo !== false);
  return (
    <div className="gx-admin-management-block">
      <div className="gx-admin-management-head">
        <div><span className="gx-admin-eyebrow">TRATO JUSTO</span><h3>Compensaciones activas</h3></div>
        <span>{active.length}</span>
      </div>
      <div className="gx-admin-benefit-list">
        {active.slice(0, 30).map((item) => (
          <article key={String(item.id)}>
            <div><strong>{item.motivo || 'Compensación'}</strong><small>{item.periodo} · {item.dias_falla || 0} día(s)</small></div>
            <div><b>−{money(item.monto)}</b><span>{Number(item.porcentaje || 0)}%</span></div>
          </article>
        ))}
        {!active.length && <div className="gx-admin-empty">No hay compensaciones activas.</div>}
      </div>
    </div>
  );
}

function ManagementView({
  bundle,
  onMutation,
}: {
  bundle: Bundle;
  onMutation: (work: () => Promise<unknown>, success: string) => Promise<void>;
}) {
  const [section, setSection] = useState('catalog');
  return (
    <div className="gx-admin-view">
      <section className="gx-admin-heading">
        <div>
          <span className="gx-admin-eyebrow">GESTIÓN</span>
          <h1>Configura GOXION</h1>
          <p>Catálogo, promociones, beneficios y arquitectura de acceso.</p>
        </div>
      </section>
      <div className="gx-admin-ops-tabs">
        {[
          ['catalog', 'Catálogo'],
          ['promotions', 'Promociones'],
          ['benefits', 'Beneficios'],
          ['access', 'Accesos'],
          ['fairdeal', 'Trato Justo'],
        ].map(([id,label])=>(
          <button type="button" key={id} className={section===id?'active':''} onClick={()=>setSection(id)}>{label}</button>
        ))}
      </div>
      {section === 'catalog' && <CatalogManagement bundle={bundle} />}
      {section === 'promotions' && <PromotionsManagement bundle={bundle} onMutation={onMutation} />}
      {section === 'benefits' && <BenefitsManagement bundle={bundle} onMutation={onMutation} />}
      {section === 'access' && <InfrastructureManagement bundle={bundle} />}
      {section === 'fairdeal' && <FairDealManagement rows={bundle.fairDeals} />}
    </div>
  );
}

export function AdminSurface() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [focus, setFocus] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    getAdminToken() ? 'loading' : 'ready',
  );
  const [message, setMessage] = useState('');

  const refresh = async () => {
    setStatus('loading');
    try {
      const next = await loadAdminBundle();
      setBundle(next);
      setStatus('ready');
      return next;
    } catch (error) {
      setBundle(null);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No fue posible cargar Admin.');
      logoutAdmin();
      throw error;
    }
  };

  useEffect(() => {
    if (getAdminToken()) void refresh().catch(() => {});
  }, []);

  const mutate = async (
    work: () => Promise<unknown>,
    success: string,
  ) => {
    setMessage('Procesando…');
    try {
      await work();
      await refresh();
      setMessage(success);
      window.setTimeout(() => setMessage(''), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible completar la acción.');
    }
  };

  const go = (next: Tab, nextFocus = '') => {
    setTab(next);
    setFocus(nextFocus);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const signOut = () => {
    logoutAdmin();
    setBundle(null);
    setTab('home');
    setFocus('');
    setStatus('ready');
  };

  if (!getAdminToken() || !bundle) {
    if (getAdminToken() && status === 'loading') {
      return (
        <main className="gx-admin-loading">
          <span />
          <strong>Sincronizando centro de operaciones…</strong>
        </main>
      );
    }
    return <LoginPanel onLogin={refresh} />;
  }

  const unread = bundle.core.notificaciones.filter((item) => !item.leida).length;

  return (
    <main className="gx-admin-next-shell">
      <header className="gx-admin-topbar">
        <div className="gx-admin-brand">
          <span>G</span>
          <div>
            <strong>GOXION</strong>
            <small>CENTRO DE OPERACIONES</small>
          </div>
        </div>
        <div className="gx-admin-top-actions">
          <button type="button" className="gx-admin-bell" onClick={() => go('operations','notifications')}>
            🔔
            {unread > 0 && <i>{unread > 99 ? '99+' : unread}</i>}
          </button>
          <span className="gx-admin-sync"><i />Sincronizado</span>
          <span className="gx-admin-live"><i />LIVE</span>
          <button type="button" className="gx-admin-logout" onClick={signOut}>⏻</button>
        </div>
      </header>

      <nav className="gx-admin-nav">
        {[
          ['home','⌂','Inicio'],
          ['clients','👥','Clientes'],
          ['operations','◎','Operaciones'],
          ['management','⌘','Gestión'],
        ].map(([id,icon,label])=>(
          <button
            type="button"
            key={id}
            className={tab===id?'active':''}
            onClick={()=>go(id as Tab)}
          >
            {tab===id && <motion.span layoutId="gx-admin-nav-highlight" />}
            <i>{icon}</i><b>{label}</b>
          </button>
        ))}
      </nav>

      <section className="gx-admin-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab + ':' + focus}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'home' && <HomeView bundle={bundle} go={go} />}
            {tab === 'clients' && <ClientsView bundle={bundle} focus={focus} onMutation={mutate} />}
            {tab === 'operations' && <OperationsView bundle={bundle} focus={focus} onMutation={mutate} />}
            {tab === 'management' && <ManagementView bundle={bundle} onMutation={mutate} />}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {message && (
          <motion.div
            className="gx-admin-toast"
            initial={{ opacity: 0, y: 7, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 7, x: '-50%' }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
