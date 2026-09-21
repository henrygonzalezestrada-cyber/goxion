import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import {
  AccessModel,
  MotherAccount,
  accessAction,
} from '../lib/admin-api';

type Mutation = (
  work: () => Promise<unknown>,
  success: string,
) => Promise<void>;

type AccessRow = {
  id?: string;
  cliente?: string;
  folio?: string;
  servicio_id?: string;
  servicio?: string;
  contratacion?: string;
  cuenta_id?: string | null;
  modo_acceso?: string;
  activo?: boolean;
};

type ComponentChoice = {
  servicio_id: string;
  cantidad: number;
};

export function AdminAccessArchitecture({
  model,
  accounts,
  onMutation,
}: {
  model: AccessModel | null;
  accounts: MotherAccount[];
  onMutation: Mutation;
}) {
  const services = (model?.servicios || []).filter((item) => item.activo !== false);
  const accesses = (model?.accesos || []) as AccessRow[];

  const [productOpen, setProductOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCost, setProductCost] = useState('');
  const [productTag, setProductTag] = useState('');
  const [productBenefits, setProductBenefits] = useState('');
  const [productLimit, setProductLimit] = useState('5');
  const [components, setComponents] = useState<ComponentChoice[]>([]);

  const [batchAccountId, setBatchAccountId] = useState('');
  const [selectedAccessIds, setSelectedAccessIds] = useState<string[]>([]);
  const [diagnostic, setDiagnostic] = useState<Record<string, unknown> | null>(
    null,
  );

  const selectedAccount = accounts.find(
    (item) => String(item.id) === batchAccountId,
  );

  const pendingForAccount = useMemo(() => {
    const serviceId = String(selectedAccount?.servicio_id || '');
    if (!serviceId) return [];
    return accesses.filter(
      (item) =>
        item.activo !== false &&
        !item.cuenta_id &&
        String(item.servicio_id || '') === serviceId &&
        String(item.modo_acceso || 'compartido') !== 'invitacion',
    );
  }, [accesses, selectedAccount]);

  const toggleComponent = (serviceId: string) => {
    setComponents((current) => {
      const exists = current.find((item) => item.servicio_id === serviceId);
      if (exists) return current.filter((item) => item.servicio_id !== serviceId);
      return [...current, { servicio_id: serviceId, cantidad: 1 }];
    });
  };

  const setComponentQuantity = (serviceId: string, cantidad: number) => {
    setComponents((current) =>
      current.map((item) =>
        item.servicio_id === serviceId
          ? { ...item, cantidad: Math.max(1, Math.min(20, cantidad || 1)) }
          : item,
      ),
    );
  };

  const createProduct = async () => {
    if (!productName.trim()) {
      window.alert('Escribe el nombre comercial del producto.');
      return;
    }
    if (!(Number(productPrice) > 0)) {
      window.alert('Escribe un precio de venta válido.');
      return;
    }
    if (!components.length) {
      window.alert('Selecciona al menos un componente.');
      return;
    }

    await onMutation(
      () =>
        accessAction('crear_producto', {
          nombre: productName.trim(),
          precio: Number(productPrice),
          costo: Number(productCost || 0),
          etiqueta: productTag.trim(),
          beneficios: productBenefits.trim(),
          limite: Math.max(1, Number(productLimit || 5)),
          componentes,
        }),
      'Producto compuesto creado.',
    );

    setProductOpen(false);
    setProductName('');
    setProductPrice('');
    setProductCost('');
    setProductTag('');
    setProductBenefits('');
    setProductLimit('5');
    setComponents([]);
  };

  const changeMode = async (serviceId: string, mode: string) => {
    const service = services.find((item) => item.id === serviceId);
    if (
      !window.confirm(
        'Cambiar el modo de acceso de ' +
          String(service?.nombre || 'este servicio') +
          ' a ' +
          mode +
          '.\n\nLos accesos existentes se conservarán, pero el modelo operativo cambiará. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        accessAction('cambiar_modo_servicio', {
          servicio_id: serviceId,
          modo_acceso: mode,
        }),
      'Modo de acceso actualizado.',
    );
  };

  const toggleBatchAccess = (id: string) => {
    setSelectedAccessIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };

  const assignBatch = async () => {
    if (!batchAccountId || !selectedAccessIds.length) {
      window.alert('Selecciona una cuenta y al menos un acceso.');
      return;
    }

    if (
      !window.confirm(
        'Se asignarán ' +
          selectedAccessIds.length +
          ' acceso(s) a ' +
          String(selectedAccount?.alias || 'la cuenta seleccionada') +
          '. ¿Continuar?',
      )
    )
      return;

    await onMutation(
      () =>
        accessAction('asignar_seleccion', {
          cuenta_id: batchAccountId,
          acceso_ids: selectedAccessIds,
        }),
      'Accesos asignados en lote.',
    );
    setSelectedAccessIds([]);
  };

  const runDiagnostic = async () => {
    try {
      const result = await accessAction('diagnostico', {});
      setDiagnostic(result);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'No fue posible ejecutar el diagnóstico.',
      );
    }
  };

  const summary =
    diagnostic && typeof diagnostic.summary === 'object'
      ? (diagnostic.summary as Record<string, unknown>)
      : null;

  return (
    <section className="gx-admin-subpanel gx-admin-access-architecture">
      <div className="gx-admin-section-head">
        <div>
          <span className="gx-admin-eyebrow">ARQUITECTURA AVANZADA</span>
          <h3>Productos, modos y diagnóstico</h3>
        </div>
        <button
          type="button"
          className="gx-admin-primary-action"
          onClick={() => setProductOpen((value) => !value)}
        >
          ＋ Producto
        </button>
      </div>

      <AnimatePresence initial={false}>
        {productOpen && (
          <motion.div
            className="gx-admin-inline-editor"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
          >
            <div className="gx-admin-inline-editor-head">
              <strong>Constructor de producto / combo</strong>
              <button type="button" onClick={() => setProductOpen(false)}>
                ×
              </button>
            </div>

            <label>
              <span>Nombre comercial</span>
              <input
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Ej. Max + Prime"
              />
            </label>

            <div className="gx-admin-form-pair">
              <label>
                <span>Precio</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productPrice}
                  onChange={(event) => setProductPrice(event.target.value)}
                />
              </label>
              <label>
                <span>Costo</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={productCost}
                  onChange={(event) => setProductCost(event.target.value)}
                />
              </label>
            </div>

            <div className="gx-admin-form-pair">
              <label>
                <span>Etiqueta</span>
                <input
                  value={productTag}
                  onChange={(event) => setProductTag(event.target.value)}
                />
              </label>
              <label>
                <span>Límite</span>
                <input
                  type="number"
                  min={1}
                  value={productLimit}
                  onChange={(event) => setProductLimit(event.target.value)}
                />
              </label>
            </div>

            <label>
              <span>Beneficios</span>
              <textarea
                rows={3}
                value={productBenefits}
                onChange={(event) => setProductBenefits(event.target.value)}
              />
            </label>

            <div className="gx-admin-component-builder">
              <span>Componentes</span>
              {services.map((service) => {
                const choice = components.find(
                  (item) => item.servicio_id === service.id,
                );
                return (
                  <div key={service.id} className={choice ? 'active' : ''}>
                    <label>
                      <input
                        type="checkbox"
                        checked={Boolean(choice)}
                        onChange={() => toggleComponent(service.id)}
                      />
                      <span>{service.nombre || 'Servicio'}</span>
                    </label>
                    {choice && (
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={choice.cantidad}
                        onChange={(event) =>
                          setComponentQuantity(
                            service.id,
                            Number(event.target.value),
                          )
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="primary"
              onClick={() => void createProduct()}
            >
              Crear producto
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="gx-admin-architecture-grid">
        <div className="gx-admin-inline-editor">
          <strong>Modo de acceso por servicio</strong>
          <div className="gx-admin-mode-list">
            {services.map((service) => (
              <label key={service.id}>
                <span>{service.nombre || 'Servicio'}</span>
                <select
                  value={service.modo_acceso || 'compartido'}
                  onChange={(event) =>
                    void changeMode(service.id, event.target.value)
                  }
                >
                  <option value="compartido">Cuenta compartida</option>
                  <option value="invitacion">Invitación</option>
                </select>
              </label>
            ))}
          </div>
        </div>

        <div className="gx-admin-inline-editor">
          <strong>Asignación en lote</strong>
          <label>
            <span>Cuenta madre</span>
            <select
              value={batchAccountId}
              onChange={(event) => {
                setBatchAccountId(event.target.value);
                setSelectedAccessIds([]);
              }}
            >
              <option value="">Selecciona una cuenta</option>
              {accounts
                .filter((item) => item.activo !== false)
                .map((account) => (
                  <option key={String(account.id)} value={String(account.id)}>
                    {String(account.alias || 'Cuenta')} ·{' '}
                    {String(account.correo_login || '')}
                  </option>
                ))}
            </select>
          </label>

          <div className="gx-admin-batch-access-list">
            {pendingForAccount.map((access) => {
              const id = String(access.id || '');
              return (
                <label
                  key={id}
                  className={selectedAccessIds.includes(id) ? 'active' : ''}
                >
                  <input
                    type="checkbox"
                    checked={selectedAccessIds.includes(id)}
                    onChange={() => toggleBatchAccess(id)}
                  />
                  <span>
                    <strong>{access.cliente || 'Cliente'}</strong>
                    <small>
                      {access.folio || 'sin folio'} ·{' '}
                      {access.servicio || access.contratacion || 'Servicio'}
                    </small>
                  </span>
                </label>
              );
            })}

            {batchAccountId && !pendingForAccount.length && (
              <div className="gx-admin-empty">
                No hay accesos pendientes compatibles con esta cuenta.
              </div>
            )}
          </div>

          <button
            type="button"
            className="primary"
            disabled={!selectedAccessIds.length}
            onClick={() => void assignBatch()}
          >
            Asignar {selectedAccessIds.length || ''} acceso(s)
          </button>
        </div>
      </div>

      <div className="gx-admin-diagnostic-card">
        <div>
          <span className="gx-admin-eyebrow">DIAGNÓSTICO</span>
          <strong>Consistencia de accesos</strong>
          <small>
            Revisa contratos, accesos, cuentas madre, invitaciones y credenciales.
          </small>
        </div>
        <button type="button" onClick={() => void runDiagnostic()}>
          Ejecutar diagnóstico
        </button>
      </div>

      <AnimatePresence>
        {summary && (
          <motion.div
            className="gx-admin-diagnostic-results"
            initial={{ opacity: 0, y: 7 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {[
              ['Contratos activos', summary.contratos_activos],
              ['Accesos asignados', summary.accesos_asignados],
              ['Accesos pendientes', summary.accesos_pendientes],
              ['Invitaciones', summary.accesos_invitacion],
              ['Cuentas madre', summary.cuentas_madre_activas],
              ['Credenciales vinculadas', summary.credenciales_vinculadas_cuenta],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <small>{label}</small>
                <strong>{Number(value || 0)}</strong>
              </div>
            ))}

            {Array.isArray(summary.plataformas_compartidas_sin_cuenta) &&
              summary.plataformas_compartidas_sin_cuenta.length > 0 && (
                <div className="wide warning">
                  <small>Plataformas compartidas sin cuenta madre</small>
                  <strong>
                    {summary.plataformas_compartidas_sin_cuenta
                      .map(String)
                      .join(', ')}
                  </strong>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
