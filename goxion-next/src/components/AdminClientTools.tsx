import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
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

type NewClientModalProps = {
  onClose: () => void;
  onMutation: Mutation;
};

export function NewClientModal({
  onClose,
  onMutation,
}: NewClientModalProps) {
  const [name, setName] = useState('');
  const [folio, setFolio] = useState('');
  const [pin, setPin] = useState('');
  const [day, setDay] = useState('15');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Escribe el nombre del cliente.');
      return;
    }
    if (!folio.trim()) {
      setError('Escribe el folio.');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('El PIN debe tener exactamente 4 dígitos.');
      return;
    }

    await onMutation(
      () =>
        adminAction('crear_cliente', {
          nombre: name.trim(),
          folio: folio.trim(),
          pin,
          dia_pago: Number(day || 15),
          estado: 'pendiente',
        }),
      'Cliente creado.',
    );
    onClose();
  };

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
      <motion.form
        className="gx-admin-client-sheet gx-admin-new-client-sheet"
        onSubmit={submit}
        initial={{ opacity: 0, y: 22, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12 }}
      >
        <header>
          <div>
            <span className="gx-admin-eyebrow">NUEVO CLIENTE</span>
            <h2>Crear cliente</h2>
            <p>Alta directa desde Admin.</p>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="gx-admin-client-form">
          <label>
            <span>Nombre completo</span>
            <input
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <div className="gx-admin-form-pair">
            <label>
              <span>Folio</span>
              <input
                value={folio}
                onChange={(event) => setFolio(event.target.value)}
              />
            </label>
            <label>
              <span>Día de cobro</span>
              <input
                type="number"
                min={1}
                max={31}
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
            </label>
          </div>

          <label>
            <span>PIN inicial</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
            />
          </label>

          <div className="gx-admin-rule-note">
            El PIN se almacena como hash. No podrá recuperarse después; sólo
            cambiarse o regenerarse.
          </div>

          {error && <div className="gx-admin-login-error">{error}</div>}

          <button type="submit" className="primary">
            Crear cliente
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}

type ClientOperationalToolsProps = {
  client: AdminClient;
  data: AdminData;
  onMutation: Mutation;
};

export function ClientOperationalTools({
  client,
  data,
  onMutation,
}: ClientOperationalToolsProps) {
  const services = data.cliente_servicios.filter(
    (item) => item.cliente_id === client.id && item.activo !== false,
  );
  const catalog = data.catalogo.filter((item) => item.activo !== false);
  const referral = data.referidos.find(
    (item) => item.cliente_id === client.id && item.activo !== false,
  );
  const gamification = data.gamificacion.find(
    (item) => item.cliente_id === client.id,
  );

  const [catalogId, setCatalogId] = useState('');
  const selectedCatalog = useMemo(
    () => catalog.find((item) => item.id === catalogId),
    [catalog, catalogId],
  );
  const [amount, setAmount] = useState('');
  const [customPin, setCustomPin] = useState('');
  const [sessionPin, setSessionPin] = useState('');
  const [refName, setRefName] = useState(referral?.nombre || '');
  const [refStart, setRefStart] = useState(
    String(referral?.fecha_inicio || new Date().toISOString().slice(0, 10)),
  );
  const [missionsActive, setMissionsActive] = useState(
    gamification?.misiones_activas === true,
  );
  const [missionsDiscount, setMissionsDiscount] = useState(
    String(gamification?.descuento || 5),
  );
  const [missionsText, setMissionsText] = useState(
    String(gamification?.tareas || ''),
  );

  const addService = async () => {
    if (!selectedCatalog) {
      window.alert('Selecciona una plataforma.');
      return;
    }
    const value = Number(amount || selectedCatalog.precio || 0);
    await onMutation(
      () =>
        adminAction('agregar_servicio_cliente', {
          cliente_id: client.id,
          servicio_id: selectedCatalog.id,
          nombre: selectedCatalog.nombre || 'Servicio',
          monto: value,
        }),
      'Servicio agregado.',
    );
    setCatalogId('');
    setAmount('');
  };

  const removeService = async (id: string, name: string) => {
    if (
      !window.confirm(
        'Se retirará ' +
          name +
          ' de este cliente. Esta acción modifica su contratación. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () => adminAction('quitar_servicio_cliente', { id }),
      'Servicio retirado.',
    );
  };

  const generatePin = async () => {
    if (
      !window.confirm(
        'Se generará un PIN nuevo y el acceso anterior dejará de funcionar. ¿Continuar?',
      )
    )
      return;

    let generated = '';
    await onMutation(
      async () => {
        const result = await adminOperation('generar_pin_unico', {
          cliente_id: client.id,
        });
        generated = String(result.pin || '');
        return result;
      },
      'PIN generado.',
    );
    setSessionPin(generated);
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(customPin)) {
      window.alert('El PIN debe tener exactamente 4 dígitos.');
      return;
    }
    if (
      !window.confirm(
        'El PIN actual será reemplazado. El cliente deberá usar el nuevo PIN. ¿Continuar?',
      )
    )
      return;

    let changed = '';
    await onMutation(
      async () => {
        const result = await adminOperation('cambiar_pin_unico', {
          cliente_id: client.id,
          pin: customPin,
        });
        changed = String(result.pin || customPin);
        return result;
      },
      'PIN actualizado.',
    );
    setSessionPin(changed);
    setCustomPin('');
  };

  const saveReferral = async () => {
    const linkedServices = services.map((item) => String(item.nombre || '')).filter(Boolean);
    await onMutation(
      () =>
        adminOperation('guardar_referido_inteligente', {
          cliente_id: client.id,
          nombre: refName.trim(),
          servicios: linkedServices,
          fecha_inicio: refStart,
        }),
      'Referido actualizado.',
    );
  };

  const removeReferral = async () => {
    if (!window.confirm('Se desactivará el referido activo de este cliente. ¿Continuar?'))
      return;
    await onMutation(
      () =>
        adminOperation('eliminar_referido_inteligente', {
          cliente_id: client.id,
        }),
      'Referido desactivado.',
    );
  };

  const adjustReferralMonths = async (delta: number) => {
    await onMutation(
      () =>
        adminOperation('ajustar_meses_referido', {
          cliente_id: client.id,
          delta,
        }),
      'Progreso del referido actualizado.',
    );
  };

  const automaticReferral = async () => {
    await onMutation(
      () =>
        adminOperation('modo_automatico_referido', {
          cliente_id: client.id,
        }),
      'Referido en modo automático.',
    );
  };

  const resetReferral = async () => {
    if (
      !window.confirm(
        'Se reiniciará el progreso del referido desde hoy: meses a 0, beneficio sin reclamar y cálculo automático desde una nueva fecha. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        adminOperation('reiniciar_referido_inteligente', {
          cliente_id: client.id,
        }),
      'Progreso del referido reiniciado.',
    );
  };

  const saveMissions = async () => {
    await onMutation(
      () =>
        adminAction('guardar_gamificacion', {
          cliente_id: client.id,
          misiones_activas: missionsActive,
          descuento: Number(missionsDiscount || 5),
          tareas: missionsText,
        }),
      'Misiones actualizadas.',
    );
  };

  return (
    <>
      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">SERVICIOS</span>
            <h3>Contratación</h3>
          </div>
        </div>

        <div className="gx-admin-service-editor-list">
          {services.map((service) => (
            <article key={service.id}>
              <div>
                <strong>{service.nombre || 'Servicio'}</strong>
                <small>{Number(service.monto || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</small>
              </div>
              <button
                type="button"
                className="danger"
                onClick={() =>
                  void removeService(service.id, service.nombre || 'Servicio')
                }
              >
                Retirar
              </button>
            </article>
          ))}
        </div>

        <div className="gx-admin-inline-editor">
          <strong>Agregar servicio</strong>
          <label>
            <span>Plataforma</span>
            <select
              value={catalogId}
              onChange={(event) => {
                const id = event.target.value;
                setCatalogId(id);
                const found = catalog.find((item) => item.id === id);
                setAmount(String(found?.precio || ''));
              }}
            >
              <option value="">Selecciona una plataforma</option>
              {catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Mensualidad del cliente</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </label>
          <button type="button" className="primary" onClick={() => void addService()}>
            Agregar servicio
          </button>
        </div>
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">ACCESO</span>
            <h3>PIN de Mi Espacio</h3>
          </div>
        </div>

        <div className="gx-admin-pin-protected">
          <div>
            <span>Protegido</span>
            <small>
              El PIN actual no se puede recuperar. Puedes reemplazarlo o generar
              uno único.
            </small>
          </div>
        </div>

        <div className="gx-admin-form-pair">
          <label>
            <span>Nuevo PIN</span>
            <input
              inputMode="numeric"
              maxLength={4}
              value={customPin}
              onChange={(event) =>
                setCustomPin(event.target.value.replace(/\D/g, '').slice(0, 4))
              }
              placeholder="4 dígitos"
            />
          </label>
          <div className="gx-admin-pin-actions">
            <button type="button" onClick={() => void savePin()}>
              Guardar PIN
            </button>
            <button type="button" className="primary" onClick={() => void generatePin()}>
              Generar PIN
            </button>
          </div>
        </div>

        {sessionPin && (
          <div className="gx-admin-pin-session">
            <div>
              <small>PIN actualizado · visible sólo en esta sesión</small>
              <strong>{sessionPin}</strong>
            </div>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(sessionPin)}
            >
              Copiar
            </button>
          </div>
        )}
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">REFERIDOS</span>
            <h3>Progreso inteligente</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label>
            <span>Nombre del referido</span>
            <input
              value={refName}
              onChange={(event) => setRefName(event.target.value)}
            />
          </label>
          <label>
            <span>Fecha de inicio</span>
            <input
              type="date"
              value={refStart}
              onChange={(event) => setRefStart(event.target.value)}
            />
          </label>
          <div className="gx-admin-rule-note">
            GOXION contará automáticamente los servicios activos vinculados a
            esta ficha para el requisito del referido.
          </div>
          <div className="gx-admin-referral-actions">
            <button type="button" className="primary" onClick={() => void saveReferral()}>
              {referral ? 'Actualizar referido' : 'Activar referido'}
            </button>
            {referral && (
              <>
                <button type="button" onClick={() => void adjustReferralMonths(-1)}>
                  − Mes
                </button>
                <button type="button" onClick={() => void adjustReferralMonths(1)}>
                  ＋ Mes
                </button>
                <button type="button" onClick={() => void automaticReferral()}>
                  Automático
                </button>
                <button type="button" className="warning" onClick={() => void resetReferral()}>
                  Reiniciar progreso
                </button>
                <button type="button" className="danger" onClick={() => void removeReferral()}>
                  Desactivar
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="gx-admin-sheet-section">
        <div className="gx-admin-section-head">
          <div>
            <span className="gx-admin-eyebrow">MISIONES</span>
            <h3>Gamificación del cliente</h3>
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <label className="gx-admin-check-row">
            <input
              type="checkbox"
              checked={missionsActive}
              onChange={(event) => setMissionsActive(event.target.checked)}
            />
            <span>Misiones activas</span>
          </label>
          <label>
            <span>Descuento al completar</span>
            <input
              type="number"
              min={0}
              max={100}
              value={missionsDiscount}
              onChange={(event) => setMissionsDiscount(event.target.value)}
            />
          </label>
          <label>
            <span>Tareas · una por línea</span>
            <textarea
              rows={5}
              value={missionsText}
              onChange={(event) => setMissionsText(event.target.value)}
              placeholder={'Ejemplo:\nPaga puntual\nExplora el catálogo\nRefiere a un amigo'}
            />
          </label>
          <button type="button" className="primary" onClick={() => void saveMissions()}>
            Guardar misiones
          </button>
        </div>
      </section>
    </>
  );
}
