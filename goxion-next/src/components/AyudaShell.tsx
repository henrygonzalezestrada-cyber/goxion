import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FormEvent, useEffect, useState } from 'react';
import { CatalogView } from './CatalogView';
import { OnboardingFlow } from './OnboardingFlow';
import { ClientSpace } from './ClientSpace';
import { SupportCenter } from './SupportCenter';
import { HomeExperience } from './HomeExperience';
import {
  ClientSpaceData,
  loginClient,
  logoutClient,
  restoreClientSession,
} from '../lib/client-session';

type Tab = 'inicio' | 'catalogo' | 'soporte';

const RAW =
  'https://raw.githubusercontent.com/henrygonzalezestrada-cyber/goxion/main/';

const navItems: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'inicio', label: 'Inicio', icon: '🏠' },
  { id: 'catalogo', label: 'Catálogo', icon: '🛒' },
  { id: 'soporte', label: 'Soporte', icon: '🛠️' },
];

function HomeView({
  onCatalog,
  onSpace,
  onRegister,
}: {
  onCatalog: () => void;
  onSpace: () => void;
  onRegister: () => void;
}) {
  return (
    <div className="gx-help-view gx-home-view gx-official-ayuda-home">
      <motion.section
        className="gx-official-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <h2 className="hero-title">
          Tus apps premium
          <br />
          <span>al mejor precio</span>
        </h2>

        <div className="rotator-container">
          <motion.div
            className="rotator-box"
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="rotator-text">✓ Calidad, control y beneficios GOXION</span>
          </motion.div>
        </div>

        <button
          type="button"
          className="btn-shimmer gx-welcome-trigger"
          onClick={onRegister}
        >
          🎁 Únete hoy y obtén -10% OFF
        </button>

        <div className="gx-welcome-eligibility-note">
          Exclusivo para clientes completamente nuevos.
          <button type="button" onClick={onSpace}>
            ¿Ya eras cliente? Recupera tu acceso
          </button>
        </div>
      </motion.section>

      <div className="section-title">🔥 Servicios Populares</div>
      <div className="teaser-grid">
        <motion.button
          type="button"
          className="teaser-card"
          whileTap={{ scale: 0.985 }}
          onClick={onCatalog}
        >
          <div className="dynamic-popular">
            <img
              className="pop-logo active"
              alt="Netflix"
              src={RAW + 'logos/netflix.PNG'}
            />
            <span className="fire-fx">🔥</span>
          </div>
          <div className="teaser-title">Netflix & Más</div>
          <div className="teaser-price">Desde $49 MXN</div>
        </motion.button>

        <motion.button
          type="button"
          className="teaser-card"
          whileTap={{ scale: 0.985 }}
          onClick={onCatalog}
        >
          <div className="dynamic-combo">
            <img
              className="combo-logo left"
              alt="HBO Max"
              src={RAW + 'logos/hbo-max.PNG'}
            />
            <img
              className="combo-logo right"
              alt="Prime Video"
              src={RAW + 'logos/prime-video.PNG'}
            />
            <span className="impact-fx">💥</span>
          </div>
          <div className="teaser-title">Combos Premium</div>
          <div className="teaser-price">Ahorro Mensual</div>
        </motion.button>
      </div>

      <HomeExperience onCatalog={onCatalog} onSpace={onSpace} />
    </div>
  );
}

function LoginCard({
  onClose,
  onLoggedIn,
  onActivation,
  initialName = '',
}: {
  onClose: () => void;
  onLoggedIn: (data: ClientSpaceData) => void;
  onActivation: () => void;
  initialName?: string;
}) {
  const [name, setName] = useState(initialName);
  const [pin, setPin] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !pin.trim()) {
      setStatus('error');
      setMessage('Ingresa tu Nombre o ID y tu PIN.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const result = await loginClient(name.trim(), pin.trim());
      setStatus('success');
      setMessage('Validación exitosa');
      window.setTimeout(() => onLoggedIn(result.space), 260);
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error ? error.message : 'Datos incorrectos.',
      );
    }
  };

  return (
    <motion.form
      className="gx-login-card"
      layoutId="gx-space-card"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 330, damping: 31 }}
      onSubmit={submit}
    >
      <button
        type="button"
        className="gx-login-close"
        onClick={onClose}
        aria-label="Cerrar acceso"
      >
        ×
      </button>
      <span className="gx-login-kicker">MI ESPACIO</span>
      <h2>Accede a tu espacio</h2>
      <p>Tus servicios, beneficios y cuenta en un solo lugar.</p>

      <label className="gx-next-float">
        <input
          placeholder=" "
          autoComplete="username"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={status === 'loading'}
        />
        <span>Nombre o ID</span>
      </label>

      <label className="gx-next-float">
        <input
          placeholder=" "
          type="password"
          inputMode="numeric"
          maxLength={4}
          autoComplete="current-password"
          value={pin}
          onChange={(event) =>
            setPin(event.target.value.replace(/\D/g, '').slice(0, 4))
          }
          disabled={status === 'loading'}
        />
        <span>PIN de acceso</span>
      </label>

      <button
        type="submit"
        className={'gx-login-submit is-' + status}
        disabled={status === 'loading' || status === 'success'}
      >
        <span>
          {status === 'loading'
            ? 'Validando información…'
            : status === 'success'
              ? '✓ Validación exitosa'
              : 'Validar acceso'}
        </span>
      </button>

      {message && <div className={'gx-login-status ' + status}>{message}</div>}

      <button
        type="button"
        className="gx-login-activation-entry"
        onClick={onActivation}
      >
        <span>
          <b>¿Recibiste tu código?</b>
          <small>Activa tu cuenta</small>
        </span>
        <i>→</i>
      </button>

      <small className="gx-login-note">Acceso protegido por GOXION.</small>
    </motion.form>
  );
}

export function AyudaShell() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginPrefill, setLoginPrefill] = useState('');
  const [onboarding, setOnboarding] = useState<
    'registration' | 'activation' | null
  >(null);
  const [session, setSession] = useState<ClientSpaceData | null>(null);
  const [restoring, setRestoring] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let active = true;
    restoreClientSession().then((restored) => {
      if (!active) return;
      setSession(restored?.space ?? null);
      setRestoring(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = () => {
    logoutClient();
    setSession(null);
    setLoginOpen(false);
    setLoginPrefill('');
    setOnboarding(null);
    setTab('inicio');
  };

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <main className="gx-ayuda-shell">
      <div className="gx-official-bg" aria-hidden="true" />
      <div className="gx-help-ambient gx-help-ambient-a" aria-hidden="true" />
      <div className="gx-help-ambient gx-help-ambient-b" aria-hidden="true" />

      <header className="gx-help-header">
        <button
          type="button"
          className="gx-help-brand"
          onClick={() => go('inicio')}
          aria-label="Ir al inicio"
        >
          <img className="app-logo" alt="GOXION" src={RAW + 'logo2.PNG'} />
        </button>

        <motion.button
          type="button"
          className="gx-space-pill"
          layoutId="gx-space-card"
          onClick={() => (session ? signOut() : setLoginOpen(true))}
          whileTap={{ scale: 0.97 }}
        >
          <span className="gx-auth-pill-icon">👤</span>
          <span>{session ? 'Cerrar Sesión' : 'Mi Espacio'}</span>
        </motion.button>
      </header>

      <nav className="gx-help-nav" aria-label="Secciones principales">
        {navItems.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={active ? 'active' : ''}
              onClick={() => go(item.id)}
            >
              <span className="gx-help-nav-icon">{item.icon}</span>
              <span className="gx-help-nav-label">
                {item.id === 'inicio' && session ? 'Mi Espacio' : item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="gx-help-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={
              reducedMotion
                ? false
                : { opacity: 0, y: 10 }
            }
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -7 }}
            transition={{
              duration: reducedMotion ? 0 : 0.26,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            {tab === 'inicio' &&
              (restoring ? (
                <div className="gx-session-restoring">
                  <span />
                  <strong>Sincronizando GOXION…</strong>
                </div>
              ) : session ? (
                <ClientSpace
                  data={session}
                  onCatalog={() => go('catalogo')}
                  onLogout={signOut}
                  onDataChange={setSession}
                />
              ) : (
                <HomeView
                  onCatalog={() => go('catalogo')}
                  onSpace={() => {
                    setLoginPrefill('');
                    setLoginOpen(true);
                  }}
                  onRegister={() => setOnboarding('registration')}
                />
              ))}

            {tab === 'catalogo' && (
              <CatalogView
                ownedServiceNames={(session?.servicios || []).map((service) =>
                  String(service.nombre || ''),
                )}
                client={session?.cliente || null}
              />
            )}

            {tab === 'soporte' && (
              <SupportCenter
                data={session}
                onLogin={() => {
                  setLoginPrefill('');
                  setLoginOpen(true);
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="gx-help-footer">
        <img src={RAW + 'logo2.PNG'} alt="GOXION" />
        <small>Tu entretenimiento, en un solo lugar.</small>
      </footer>

      <AnimatePresence>
        {loginOpen && (
          <motion.div
            className="gx-login-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setLoginOpen(false);
            }}
          >
            <LoginCard
              initialName={loginPrefill}
              onClose={() => setLoginOpen(false)}
              onActivation={() => {
                setLoginOpen(false);
                setOnboarding('activation');
              }}
              onLoggedIn={(data) => {
                setSession(data);
                setLoginOpen(false);
                setLoginPrefill('');
                go('inicio');
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {onboarding && (
          <OnboardingFlow
            mode={onboarding}
            onClose={() => setOnboarding(null)}
            onGoLogin={(goxionId) => {
              setOnboarding(null);
              setLoginPrefill(goxionId || '');
              setLoginOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
