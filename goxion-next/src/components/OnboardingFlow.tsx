import { AnimatePresence, motion } from 'motion/react';
import { FormEvent, useMemo, useState } from 'react';
import {
  activateGoxionSpace,
  notifyNewRegistration,
  registerGoxionClient,
  validateActivationCode,
} from '../lib/onboarding';

type FlowMode = 'registration' | 'activation';
type ActivationStep = 'code' | 'pin' | 'success';

type Props = {
  mode: FlowMode;
  onClose: () => void;
  onGoLogin: (goxionId?: string) => void;
};

const cleanDigits = (value: string, max: number) =>
  value.replace(/\D/g, '').slice(0, max);

export function OnboardingFlow({ mode, onClose, onGoLogin }: Props) {
  return (
    <motion.div
      className="gx-onboarding-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.section
        className="gx-onboarding-sheet"
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      >
        <button
          type="button"
          className="gx-onboarding-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        {mode === 'registration' ? (
          <RegistrationFlow onGoLogin={onGoLogin} />
        ) : (
          <ActivationFlow onGoLogin={onGoLogin} />
        )}
      </motion.section>
    </motion.div>
  );
}

function RegistrationFlow({
  onGoLogin,
}: {
  onGoLogin: (goxionId?: string) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState<
    'form' | 'loading' | 'success' | 'blocked' | 'review' | 'error'
  >('form');
  const [title, setTitle] = useState('');
  const [copy, setCopy] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (name.trim().length < 2) {
      setState('error');
      setTitle('Revisa tu nombre');
      setCopy('Escribe tu nombre completo.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setState('error');
      setTitle('Revisa tu WhatsApp');
      setCopy('Escribe un número de WhatsApp válido.');
      return;
    }

    setState('loading');
    setTitle('');
    setCopy('');

    try {
      const data = await registerGoxionClient(name.trim(), phone.trim());

      if (data.status === 'existing') {
        setState('blocked');
        setTitle('Este número ya está registrado');
        setCopy(
          'Ya existe un registro o espacio GOXION asociado a este número. El -10% es únicamente para clientes completamente nuevos.',
        );
        return;
      }

      if (data.status === 'review') {
        setState('review');
        setTitle('Tu registro necesita revisión');
        setCopy(
          'Encontramos información que podría corresponder a un registro anterior. Revisaremos el caso antes de autorizar el -10%.',
        );
        return;
      }

      if (data.status === 'already_requested') {
        setState('success');
        setTitle('Tu solicitud ya está registrada');
        setCopy(
          'No necesitas enviarla nuevamente. Si es aprobada, recibirás por WhatsApp tu GOXION ID y un código de activación válido por 24 horas.',
        );
        return;
      }

      if (data.status === 'new') {
        setState('success');
        setTitle('Solicitud registrada');
        setCopy(
          'Gracias ' +
            name.trim() +
            '. Tu solicitud pasó la validación inicial. Si es aprobada en GOXION, recibirás por WhatsApp tu GOXION ID y código de activación.',
        );
        if (!data.already) {
          void notifyNewRegistration({
            nombre: name.trim(),
            telefono: phone.trim(),
            requestId: data.request_id,
          }).catch(() => {});
        }
        return;
      }

      throw new Error('No pudimos determinar el estado de tu solicitud.');
    } catch (error) {
      setState('error');
      setTitle('No pudimos validar tu registro');
      setCopy(error instanceof Error ? error.message : 'Intenta nuevamente.');
    }
  };

  const showForm = state === 'form' || state === 'loading' || state === 'error';

  return (
    <div className="gx-registration-flow">
      <div className="gx-onboarding-icon">✦</div>
      <span className="gx-onboarding-kicker">BIENVENIDA GOXION</span>
      <h2>Únete y obtén -10% OFF</h2>
      <p className="gx-onboarding-copy">
        Beneficio exclusivo para clientes completamente nuevos. Validamos tu
        registro antes de crear Mi Espacio.
      </p>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.form
            key="registration-form"
            className="gx-registration-form"
            onSubmit={submit}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <label>
              <span>Nombre completo</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                disabled={state === 'loading'}
              />
            </label>
            <label>
              <span>WhatsApp</span>
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                inputMode="tel"
                autoComplete="tel"
                disabled={state === 'loading'}
              />
            </label>

            <div className="gx-registration-rule">
              <b>Un beneficio por cliente nuevo</b>
              <span>
                Si el número o los datos ya existen en GOXION, el sistema lo
                detectará antes de enviar la solicitud.
              </span>
            </div>

            <button
              type="submit"
              className={'gx-registration-submit is-' + state}
              disabled={state === 'loading'}
            >
              {state === 'loading' ? (
                <>
                  <i />
                  <span>Validando registro…</span>
                </>
              ) : (
                <span>{state === 'error' ? 'Reintentar' : 'Validar y solicitar'}</span>
              )}
            </button>

            {state === 'error' && (
              <motion.div
                className="gx-registration-result error"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <strong>{title}</strong>
                <span>{copy}</span>
              </motion.div>
            )}
          </motion.form>
        ) : (
          <motion.div
            key="registration-result"
            className={'gx-registration-result ' + state}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <div className="gx-registration-result-mark">
              {state === 'blocked' ? '×' : state === 'review' ? '!' : '✓'}
            </div>
            <strong>{title}</strong>
            <span>{copy}</span>
            {state === 'blocked' && (
              <button type="button" onClick={() => onGoLogin(name.trim())}>
                Entrar a Mi Espacio
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActivationFlow({
  onGoLogin,
}: {
  onGoLogin: (goxionId?: string) => void;
}) {
  const [step, setStep] = useState<ActivationStep>('code');
  const [goxionId, setGoxionId] = useState('');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [validatedName, setValidatedName] = useState('');
  const [finalId, setFinalId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const progress = useMemo(() => (step === 'code' ? 1 : 2), [step]);

  const validateCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanCode = cleanDigits(code, 6);
    setCode(cleanCode);

    if (!goxionId.trim()) {
      setError('Escribe tu GOXION ID.');
      return;
    }
    if (cleanCode.length !== 6) {
      setError('Tu código debe tener 6 dígitos.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const data = await validateActivationCode(goxionId.trim(), cleanCode);
      setGoxionId(String(data.goxion_id || goxionId.trim()));
      setValidatedName(String(data.nombre || ''));
      setStep('pin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos validar tu código.');
    } finally {
      setBusy(false);
    }
  };

  const finish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanPin = cleanDigits(pin, 4);
    const cleanConfirm = cleanDigits(confirm, 4);
    setPin(cleanPin);
    setConfirm(cleanConfirm);

    if (cleanPin.length !== 4) {
      setError('Tu PIN debe tener 4 dígitos.');
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setError('Los PIN no coinciden.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const data = await activateGoxionSpace({
        goxionId,
        codigo: code,
        pin: cleanPin,
      });
      setFinalId(String(data.goxion_id || goxionId));
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos activar tu espacio.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gx-activation-flow">
      <span className="gx-onboarding-kicker">ACTIVACIÓN</span>
      <h2>Activa tu espacio</h2>
      <p className="gx-onboarding-copy">
        Usa el GOXION ID y el código de 6 dígitos que recibiste por WhatsApp.
      </p>

      <div className="gx-activation-progress" aria-hidden="true">
        <span className="active" />
        <span className={progress >= 2 ? 'active' : ''} />
      </div>

      <AnimatePresence mode="wait">
        {step === 'code' && (
          <motion.form
            key="activation-code"
            className="gx-activation-form"
            onSubmit={validateCode}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <label className="gx-next-float">
              <input
                placeholder=" "
                autoComplete="username"
                autoCapitalize="none"
                value={goxionId}
                onChange={(event) => setGoxionId(event.target.value)}
                disabled={busy}
              />
              <span>GOXION ID</span>
            </label>
            <label className="gx-activation-code-label">
              <span>Código de activación</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(cleanDigits(event.target.value, 6))
                }
                placeholder="000000"
                disabled={busy}
              />
            </label>
            <button type="submit" className="gx-activation-primary" disabled={busy}>
              {busy ? 'Validando…' : 'Continuar'}
            </button>
            {error && <div className="gx-activation-error">{error}</div>}
          </motion.form>
        )}

        {step === 'pin' && (
          <motion.form
            key="activation-pin"
            className="gx-activation-form"
            onSubmit={finish}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
          >
            <div className="gx-activation-valid-chip">
              <span>✓</span>
              Código confirmado{validatedName ? ' · ' + validatedName.split(/\s+/)[0] : ''}
            </div>
            <label className="gx-next-float">
              <input
                placeholder=" "
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(cleanDigits(event.target.value, 4))}
                disabled={busy}
              />
              <span>Crea tu PIN</span>
            </label>
            <label className="gx-next-float">
              <input
                placeholder=" "
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={confirm}
                onChange={(event) =>
                  setConfirm(cleanDigits(event.target.value, 4))
                }
                disabled={busy}
              />
              <span>Confirma tu PIN</span>
            </label>
            <button type="submit" className="gx-activation-primary" disabled={busy}>
              {busy ? 'Activando…' : 'Activar Mi Espacio'}
            </button>
            {error && <div className="gx-activation-error">{error}</div>}
            <button
              type="button"
              className="gx-activation-back"
              onClick={() => {
                setError('');
                setStep('code');
              }}
            >
              ← Revisar código
            </button>
          </motion.form>
        )}

        {step === 'success' && (
          <motion.div
            key="activation-success"
            className="gx-activation-success"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="gx-activation-success-orbit"
              initial={{ rotate: -40, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            >
              ✓
            </motion.div>
            <span className="gx-onboarding-kicker">MI ESPACIO ACTIVO</span>
            <h3>Tu espacio está listo</h3>
            <p>Ya puedes entrar con tu GOXION ID y el PIN que acabas de crear.</p>
            <div className="gx-activation-benefit">
              <b>-10%</b>
              <span>Beneficio de bienvenida activado</span>
            </div>
            <div className="gx-activation-id-card">
              <small>Tu GOXION ID</small>
              <strong>@{finalId}</strong>
            </div>
            <button
              type="button"
              className="gx-activation-primary"
              onClick={() => onGoLogin(finalId)}
            >
              Entrar a Mi Espacio
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
