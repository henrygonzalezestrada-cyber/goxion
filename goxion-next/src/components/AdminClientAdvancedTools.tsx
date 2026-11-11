import { useState } from 'react';
import {
  AdminClient,
  AdminData,
  AdminClientService,
  adminAction,
  registrationAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

function money(value: unknown) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function ServiceDetailEditor({
  service,
  onMutation,
}: {
  service: AdminClientService;
  onMutation: Mutation;
}) {
  const [amount, setAmount] = useState(String(service.monto ?? ''));
  const [email, setEmail] = useState(service.correo_login || '');
  const [profile, setProfile] = useState(service.perfil_nombre || '');
  const [profilePin, setProfilePin] = useState(service.perfil_pin || '');

  const save = async () => {
    await onMutation(
      () =>
        adminAction('editar_servicio_cliente', {
          id: service.id,
          monto: Number(amount || 0),
          correo_login: email.trim(),
          perfil_nombre: profile.trim(),
          perfil_pin: profilePin.trim(),
        }),
      'Datos del servicio actualizados.',
    );
  };

  return (
    <article className="gx-admin-service-detail-editor">
      <header>
        <div>
          <strong>{service.nombre || 'Servicio'}</strong>
          <small>Configuración individual del cliente</small>
        </div>
        <b>{money(service.monto)}</b>
      </header>

      <div className="gx-admin-form-pair">
        <label>
          <span>Mensualidad</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          <span>Correo / login</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </div>

      <div className="gx-admin-form-pair">
        <label>
          <span>Perfil</span>
          <input
            value={profile}
            onChange={(event) => setProfile(event.target.value)}
          />
        </label>
        <label>
          <span>PIN de perfil</span>
          <input
            value={profilePin}
            onChange={(event) => setProfilePin(event.target.value)}
          />
        </label>
      </div>

      <button type="button" className="primary" onClick={() => void save()}>
        Guardar servicio
      </button>
    </article>
  );
}

export function AdminClientAdvancedTools({
  client,
  data,
  onMutation,
}: {
  client: AdminClient;
  data: AdminData;
  onMutation: Mutation;
}) {
  const services = data.cliente_servicios.filter(
    (item) => item.cliente_id === client.id && item.activo !== false,
  );
  const discounts = data.descuentos.filter(
    (item) =>
      String(item.cliente_id || '') === client.id &&
      item.activo !== false,
  );

  const [discountConcept, setDiscountConcept] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [phone, setPhone] = useState(client.telefono_normalizado || '');
  const [origin, setOrigin] = useState(client.origen_cliente || 'sd_streaming');
  const [eligible, setEligible] = useState(client.promo_nuevo_elegible === true);

  const addDiscount = async () => {
    const amount = Number(discountAmount || 0);
    if (!discountConcept.trim() || !(amount > 0)) {
      window.alert('Escribe concepto y monto del descuento.');
      return;
    }

    await onMutation(
      () =>
        adminAction('agregar_descuento', {
          cliente_id: client.id,
          descripcion: discountConcept.trim(),
          monto: amount,
        }),
      'Descuento especial agregado.',
    );
    setDiscountConcept('');
    setDiscountAmount('');
  };

  const removeDiscount = async (id: unknown) => {
    if (!id) return;
    if (!window.confirm('¿Eliminar este descuento especial?')) return;

    await onMutation(
      () => adminAction('eliminar_descuento', { id: String(id) }),
      'Descuento eliminado.',
    );
  };

  const resetLoyalty = async () => {
    if (
      !window.confirm(
        '¿Reiniciar la racha de pagos puntuales de este cliente a 0?'
      )
    )
      return;

    await onMutation(
      () =>
        adminAction('reiniciar_lealtad', {
          cliente_id: client.id,
        }),
      'Racha reiniciada.',
    );
  };

  const saveIdentity = async () => {
    if (
      origin === 'sd_streaming' &&
      eligible &&
      !window.confirm(
        'Este cliente está marcado como previo de SD Streaming. ¿Seguro que quieres hacerlo elegible para el -10% de bienvenida?'
      )
    )
      return;

    await onMutation(
      () =>
        registrationAction('actualizar_cliente', {
          cliente_id: client.id,
          telefono: phone.trim(),
          origen_cliente: origin,
          promo_nuevo_elegible: eligible,
        }),
      'Identidad comercial actualizada.',
    );
  };

  const releasePhone = async () => {
    if (!phone) return;
    if (
      !window.confirm(
        'Se liberará el teléfono de la identidad comercial. La cuenta, PIN, servicios, pagos y beneficios permanecen intactos. ¿Continuar?'
      )
    )
      return;
    if (!window.confirm('Confirma por segunda vez: liberar teléfono.')) return;

    await onMutation(
      () =>
        registrationAction('liberar_telefono', {
          cliente_id: client.id,
        }),
      'Teléfono liberado.',
    );
    setPhone('');
  };

  return (
    <>
      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">DETALLE DE SERVICIOS</span>
            <h3>Mensualidad y accesos</h3>
          </div>
        </div>

        <div className="gx-admin-service-detail-list">
          {services.map((service) => (
            <ServiceDetailEditor
              key={service.id}
              service={service}
              onMutation={onMutation}
            />
          ))}
          {!services.length && (
            <div className="gx-admin-empty">Este cliente no tiene servicios activos.</div>
          )}
        </div>
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">DESCUENTOS</span>
            <h3>Especiales</h3>
          </div>
        </div>

        <div className="gx-admin-special-discounts">
          {discounts.map((discount, index) => (
            <article key={String(discount.id || index)}>
              <div>
                <strong>{String(discount.descripcion || 'Descuento')}</strong>
                <small>Aplicado mientras permanezca activo</small>
              </div>
              <div>
                <b>−{money(discount.monto)}</b>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void removeDiscount(discount.id)}
                >
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>Concepto</span>
            <input
              value={discountConcept}
              onChange={(event) => setDiscountConcept(event.target.value)}
              placeholder="Ej. Ajuste comercial"
            />
          </label>
          <label>
            <span>Monto</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discountAmount}
              onChange={(event) => setDiscountAmount(event.target.value)}
            />
          </label>
          <button type="button" className="primary" onClick={() => void addDiscount()}>
            Agregar descuento
          </button>
        </div>
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">IDENTIDAD</span>
            <h3>Registro comercial</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>WhatsApp / teléfono</span>
            <input
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>

          <label>
            <span>Origen</span>
            <select value={origin} onChange={(event) => setOrigin(event.target.value)}>
              <option value="sd_streaming">SD Streaming / previo</option>
              <option value="goxion">GOXION nuevo</option>
              <option value="manual">Alta manual</option>
              <option value="importado">Importado</option>
            </select>
          </label>

          <label className="gx-admin-check-row">
            <input
              type="checkbox"
              checked={eligible}
              onChange={(event) => setEligible(event.target.checked)}
            />
            <span>Elegible para -10% de bienvenida</span>
          </label>

          <div className="gx-admin-referral-actions">
            <button type="button" className="primary" onClick={() => void saveIdentity()}>
              Guardar identidad
            </button>
            {phone && (
              <button type="button" className="danger" onClick={() => void releasePhone()}>
                Liberar teléfono
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">LEALTAD</span>
            <h3>Acciones de racha</h3>
          </div>
        </div>

        <div className="gx-admin-danger-zone">
          <div>
            <strong>Reiniciar racha</strong>
            <small>
              Úsalo sólo cuando la lógica comercial requiera volver los pagos
              puntuales a cero.
            </small>
          </div>
          <button type="button" className="danger" onClick={() => void resetLoyalty()}>
            Reiniciar a 0
          </button>
        </div>
      </section>
    </>
  );
}
