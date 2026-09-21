import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { ClientSpaceData, GoxionService } from '../lib/client-session';
import { sendSupportRequest } from '../lib/client-session';

type Props = {
  data: ClientSpaceData | null;
  onLogin: () => void;
};

type Issue = {
  issue: string;
  instructions: string;
  labelInput: string;
};

const SUPPORT_ISSUES: Record<string, Issue[]> = {
  Netflix: [
    {
      issue: '🔑 Solicitar Código de Acceso',
      instructions:
        "En tu pantalla selecciona 'Iniciar sesión con código'. Al hacerlo, Netflix enviará un código al correo administrado por GOXION. Indícanos el correo que aparece en pantalla para localizar la solicitud.",
      labelInput: 'Correo que aparece en tu TV',
    },
    {
      issue: '📺 Tu TV pide Actualizar Hogar',
      instructions:
        "Selecciona 'Actualizar Hogar' en tu TV. Cuando la plataforma envíe la confirmación, indícanos el correo que aparece en pantalla para revisar la autorización.",
      labelInput: 'Correo que aparece en tu TV',
    },
    {
      issue: '⚠️ Límite de Pantallas',
      instructions:
        'Cada perfil equivale a una pantalla asignada. Revisa que no exista otro televisor usando el mismo perfil y, si continúa, comparte el nombre de tu perfil.',
      labelInput: 'Nombre de tu perfil',
    },
  ],
  'Disney+': [
    {
      issue: '🔑 Código de Verificación',
      instructions:
        "Presiona 'Continuar' con el correo asignado. Disney+ enviará un código de 6 dígitos a la bandeja administrada por GOXION. Indícanos el correo que acabas de usar.",
      labelInput: 'Correo que acabas de ingresar',
    },
    {
      issue: "🏠 Mensaje de 'Hogar Principal'",
      instructions:
        "Selecciona 'Actualizar Hogar' en tu dispositivo para generar la solicitud de autorización y comparte el correo de la cuenta.",
      labelInput: 'Correo de tu cuenta Disney+',
    },
  ],
  Max: [
    {
      issue: '🔑 Iniciar Sesión con Código',
      instructions:
        "Selecciona 'Iniciar sesión con un código' en tu TV. Copia aquí las letras o números que aparezcan para que GOXION pueda revisar la vinculación.",
      labelInput: 'Código en tu pantalla de TV',
    },
    {
      issue: '❌ Contraseña Incorrecta',
      instructions:
        'Comprueba que no haya espacios al copiar tus datos. Si persiste, indícanos el correo de la cuenta para revisar la credencial actual.',
      labelInput: 'Correo de la cuenta Max',
    },
  ],
  'Prime Video': [
    {
      issue: '📺 Registrar Dispositivo',
      instructions:
        "Abre Prime Video, presiona 'Identifícate' y copia el código de registro que aparece en pantalla.",
      labelInput: 'Código en pantalla de TV',
    },
  ],
  YouTube: [
    {
      issue: '📩 No me llegó la invitación',
      instructions:
        'Revisa SPAM y confirma que tu cuenta no pertenezca ya a otro grupo familiar. Si no aparece, comparte tu Gmail para revisar la invitación.',
      labelInput: 'Tu correo Gmail',
    },
  ],
  ViX: [
    {
      issue: '🔑 Vincular TV o Iniciar Sesión',
      instructions:
        "Selecciona 'Iniciar sesión' y copia el código alfanumérico que aparece en tu TV.",
      labelInput: 'Código en pantalla',
    },
  ],
  Crunchyroll: [
    {
      issue: '🔑 Vincular Consola o TV',
      instructions:
        "Abre 'Activar dispositivo' en tu consola o TV y comparte el código mostrado.",
      labelInput: 'Código de activación',
    },
  ],
  Microsoft: [
    {
      issue: '💻 Reenviar Invitación familiar',
      instructions:
        'Comparte el correo Outlook/Hotmail con el que te uniste para verificar y reenviar la invitación.',
      labelInput: 'Tu correo Outlook/Hotmail',
    },
  ],
  'Google One': [
    {
      issue: '☁️ Espacio no reflejado',
      instructions:
        'Confirma que aceptaste la invitación familiar en tu Gmail. Si sigues sin ver los beneficios, comparte tu correo.',
      labelInput: 'Tu correo Gmail',
    },
  ],
  Default: [
    {
      issue: '🔑 Solicitar Código / Asistencia',
      instructions:
        'Si tu plataforma solicita un código o confirmación, genera la solicitud desde el dispositivo y comparte aquí el dato que aparece en pantalla.',
      labelInput: 'Dato en pantalla / correo',
    },
  ],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function supportKey(name: string) {
  const value = normalize(name);
  if (value.includes('netflix')) return 'Netflix';
  if (value.includes('disney')) return 'Disney+';
  if (value.includes('hbo') || value.includes('max')) return 'Max';
  if (value.includes('prime') || value.includes('amazon')) return 'Prime Video';
  if (value.includes('youtube')) return 'YouTube';
  if (value.includes('vix')) return 'ViX';
  if (value.includes('crunchy')) return 'Crunchyroll';
  if (value.includes('microsoft') || value.includes('365')) return 'Microsoft';
  if (value.includes('google') || value.includes('one 2tb')) return 'Google One';
  return 'Default';
}

function relevantDefault(service: GoxionService | undefined, label: string) {
  if (!service) return '';
  const field = normalize(label);
  if (field.includes('correo')) return service.correo_login || '';
  if (field.includes('perfil')) return service.perfil_nombre || '';
  if (field.includes('pin')) return service.perfil_pin || '';
  return '';
}

export function SupportCenter({ data, onLogin }: Props) {
  const services = Array.isArray(data?.servicios) ? data?.servicios ?? [] : [];
  const guestPlatforms = [
    'Netflix',
    'Disney+',
    'Max',
    'Prime Video',
    'YouTube',
    'ViX',
    'Crunchyroll',
    'Microsoft 365',
    'Google One',
  ];

  const platforms = useMemo(() => {
    if (services.length) {
      return services.map((service) => ({
        id: String(service.id || service.nombre || Math.random()),
        name: String(service.nombre || 'Servicio GOXION'),
        service,
      }));
    }
    return guestPlatforms.map((name) => ({ id: name, name, service: undefined }));
  }, [services]);

  const [platformId, setPlatformId] = useState('');
  const [issueIndex, setIssueIndex] = useState<number | null>(null);
  const [detail, setDetail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>(
    'idle',
  );
  const [message, setMessage] = useState('');

  const selectedPlatform = platforms.find((item) => item.id === platformId);
  const issueList = selectedPlatform
    ? SUPPORT_ISSUES[supportKey(selectedPlatform.name)] || SUPPORT_ISSUES.Default
    : [];
  const issue = issueIndex === null ? undefined : issueList[issueIndex];

  const selectPlatform = (id: string) => {
    setPlatformId(id);
    setIssueIndex(null);
    setDetail('');
    setState('idle');
    setMessage('');
  };

  const selectIssue = (index: number) => {
    setIssueIndex(index);
    setState('idle');
    setMessage('');
    const next = issueList[index];
    setDetail(relevantDefault(selectedPlatform?.service, next.labelInput));
  };

  const submit = async () => {
    if (!data?.cliente) {
      onLogin();
      return;
    }
    if (!selectedPlatform || !issue || !detail.trim()) {
      setState('error');
      setMessage('Completa el dato solicitado antes de enviar.');
      return;
    }

    setState('sending');
    setMessage('');

    const client = data.cliente;
    const service = selectedPlatform.service;
    const context = [
      '**Cliente:** ' + (client.nombre || 'Cliente'),
      client.folio ? '**Folio:** ' + client.folio : '',
      '**Plataforma:** ' + selectedPlatform.name,
      '**Situación:** ' + issue.issue.replace(/^[^\wÁÉÍÓÚÜÑ]+/u, ''),
      '**Dato reportado:** ' + detail.trim(),
      service?.correo_login ? '**Cuenta:** ' + service.correo_login : '',
      service?.perfil_nombre ? '**Perfil:** ' + service.perfil_nombre : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await sendSupportRequest({
        titulo: '🛠️ Nueva Petición de Soporte',
        mensaje: context,
      });
      setState('success');
      setMessage(
        'Solicitud enviada. GOXION recibió el contexto de tu cuenta y la plataforma.',
      );
    } catch (error) {
      setState('error');
      setMessage(
        error instanceof Error ? error.message : 'No fue posible enviar la solicitud.',
      );
    }
  };

  return (
    <div className="gx-help-view gx-support-center">
      <section className="gx-support-hero">
        <span className="gx-help-eyebrow">SOPORTE GOXION</span>
        <h1>Resuelve desde aquí</h1>
        <p>
          Elige tu plataforma, sigue las instrucciones y envía la solicitud sin
          salir de GOXION.
        </p>
      </section>

      {!data?.cliente && (
        <div className="gx-support-session-note">
          <span>◉</span>
          <div>
            <strong>Puedes consultar la guía como invitado</strong>
            <small>
              Para enviar una solicitud real necesitamos identificar tu Mi Espacio.
            </small>
          </div>
          <button type="button" onClick={onLogin}>
            Entrar
          </button>
        </div>
      )}

      <section className="gx-support-live-card">
        <div className="gx-support-live-step">
          <span>01</span>
          <div>
            <small>PLATAFORMA</small>
            <strong>
              {services.length ? 'Selecciona uno de tus servicios' : '¿Dónde necesitas ayuda?'}
            </strong>
          </div>
        </div>

        <motion.div layout className="gx-support-platform-grid">
          {platforms.map((platform) => (
            <motion.button
              layout
              key={platform.id}
              type="button"
              className={platformId === platform.id ? 'active' : ''}
              onClick={() => selectPlatform(platform.id)}
              whileTap={{ scale: 0.975 }}
            >
              <span>{platform.name.slice(0, 1).toUpperCase()}</span>
              <strong>{platform.name}</strong>
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence initial={false}>
          {selectedPlatform && (
            <motion.div
              key={'issues-' + selectedPlatform.id}
              className="gx-support-live-stage"
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="gx-support-live-step">
                <span>02</span>
                <div>
                  <small>SITUACIÓN</small>
                  <strong>¿Qué está pasando?</strong>
                </div>
              </div>

              <div className="gx-support-issue-list">
                {issueList.map((item, index) => (
                  <button
                    key={item.issue}
                    type="button"
                    className={issueIndex === index ? 'active' : ''}
                    onClick={() => selectIssue(index)}
                  >
                    <span>{item.issue}</span>
                    <i>→</i>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {issue && (
            <motion.div
              key={issue.issue}
              className="gx-support-live-stage"
              initial={{ opacity: 0, y: 9 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              <div className="gx-support-live-step">
                <span>03</span>
                <div>
                  <small>SOLUCIÓN</small>
                  <strong>Sigue estos pasos</strong>
                </div>
              </div>

              <div className="gx-support-instructions">
                <span>💡</span>
                <p>{issue.instructions}</p>
              </div>

              <label className="gx-support-detail">
                <span>{issue.labelInput}</span>
                <input
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Escribe el dato aquí"
                />
              </label>

              <button
                type="button"
                className={'gx-support-submit is-' + state}
                onClick={() => void submit()}
                disabled={state === 'sending' || state === 'success'}
              >
                {state === 'sending'
                  ? 'Enviando solicitud…'
                  : state === 'success'
                    ? 'Solicitud enviada ✓'
                    : data?.cliente
                      ? 'Enviar a soporte'
                      : 'Entrar para enviar'}
              </button>

              {message && (
                <motion.div
                  className={'gx-support-result ' + state}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {message}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="gx-support-security">
        <span>✦</span>
        <p>
          Tu solicitud llega con tu nombre, folio y servicio relacionado. No
          necesitas volver a explicar datos que GOXION ya conoce.
        </p>
      </div>
    </div>
  );
}
