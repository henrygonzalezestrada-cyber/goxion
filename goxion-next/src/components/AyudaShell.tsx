import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { CatalogPrototype } from './CatalogPrototype';

type Tab = 'inicio' | 'catalogo' | 'soporte';

const navItems: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'inicio', label: 'Inicio', icon: '⌂' },
  { id: 'catalogo', label: 'Catálogo', icon: '◈' },
  { id: 'soporte', label: 'Soporte', icon: '✦' },
];

function HomePrototype({ onCatalog, onSpace }: { onCatalog: () => void; onSpace: () => void }) {
  return (
    <div className="gx-help-view gx-home-view">
      <motion.section className="gx-help-hero" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
        <span className="gx-help-eyebrow">TODO EN UN SOLO LUGAR</span>
        <h1>Tus apps premium<span> al mejor precio</span></h1>
        <div className="gx-help-rotator"><span className="gx-help-check">✓</span><span>Calidad, control y beneficios GOXION</span></div>
        <button type="button" className="gx-welcome-cta"><span className="gx-welcome-gift">✦</span><span>Únete hoy y obtén -10% OFF</span></button>
        <p className="gx-help-eligibility">Exclusivo para clientes completamente nuevos.<button type="button" onClick={onSpace}> ¿Ya eras cliente? Recupera tu acceso</button></p>
      </motion.section>

      <section className="gx-help-block">
        <div className="gx-help-section-head">
          <div><span className="gx-help-section-kicker">DESCUBRE</span><h2>Servicios populares</h2></div>
          <button type="button" onClick={onCatalog}>Ver catálogo <span>→</span></button>
        </div>
        <div className="gx-popular-grid">
          <motion.button type="button" className="gx-popular-card" whileTap={{ scale: 0.985 }} onClick={onCatalog}>
            <span className="gx-popular-orbit gx-popular-purple">N</span><strong>Netflix & más</strong><small>Desde $49 MXN</small>
          </motion.button>
          <motion.button type="button" className="gx-popular-card" whileTap={{ scale: 0.985 }} onClick={onCatalog}>
            <span className="gx-popular-orbit gx-popular-cyan">✦</span><strong>Combos GOXION</strong><small>Más entretenimiento, mejor valor</small>
          </motion.button>
        </div>
      </section>

      <section className="gx-help-block">
        <div className="gx-help-section-head gx-help-section-simple"><div><span className="gx-help-section-kicker">TU EXPERIENCIA</span><h2>Todo bajo control</h2></div></div>
        <div className="gx-control-card">
          <div className="gx-control-visual"><div className="gx-control-phone"><span /><b>GOXION</b><i>Mi Espacio</i></div></div>
          <div className="gx-control-copy">
            <strong>Tu espacio, tus servicios</strong>
            <p>Consulta tu cuenta, administra accesos, revisa beneficios y solicita soporte desde el mismo lugar.</p>
            <div className="gx-control-tags"><span>Estado de cuenta</span><span>Beneficios</span><span>Soporte</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SupportPrototype() {
  const steps = [
    ['01', 'Reportas', 'Cuéntanos qué sucede desde tu espacio.'],
    ['02', 'Revisamos', 'Validamos tu cuenta y el servicio relacionado.'],
    ['03', 'Resolvemos', 'Te guiamos con una solución concreta.'],
  ];
  return (
    <div className="gx-help-view gx-support-view">
      <section className="gx-support-hero"><span className="gx-help-eyebrow">SOPORTE GOXION</span><h1>Estamos para ayudarte</h1><p>Un flujo más claro para que tus solicitudes lleguen al lugar correcto.</p></section>
      <div className="gx-support-flow">
        {steps.map(([step, title, copy], index) => (
          <motion.article key={step} className="gx-support-step" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <span>{step}</span><div><strong>{title}</strong><p>{copy}</p></div>
          </motion.article>
        ))}
      </div>
      <div className="gx-support-card"><div className="gx-support-glow" /><span className="gx-help-section-kicker">DESDE MI ESPACIO</span><h2>Soporte con contexto</h2><p>La conexión real llegará después de validar esta migración visual. Por ahora no se envía ninguna solicitud.</p><button type="button" disabled>Disponible al conectar Mi Espacio</button></div>
    </div>
  );
}

function LoginCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div className="gx-login-card" layoutId="gx-space-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ type: 'spring', stiffness: 330, damping: 31 }}>
      <button type="button" className="gx-login-close" onClick={onClose} aria-label="Cerrar acceso">×</button>
      <span className="gx-login-kicker">MI ESPACIO</span><h2>Accede a tu espacio</h2><p>Tus servicios, beneficios y cuenta en un solo lugar.</p>
      <label className="gx-next-float"><input placeholder=" " autoComplete="username" /><span>Nombre o ID</span></label>
      <label className="gx-next-float"><input placeholder=" " type="password" inputMode="numeric" maxLength={4} autoComplete="current-password" /><span>PIN de acceso</span></label>
      <button type="button" className="gx-login-submit" disabled><span>Entrar a Mi Espacio</span></button>
      <small className="gx-login-note">Primera migración visual · acceso real se conectará en una etapa controlada.</small>
    </motion.div>
  );
}

export function AyudaShell() {
  const [tab, setTab] = useState<Tab>('inicio');
  const [loginOpen, setLoginOpen] = useState(false);
  const reducedMotion = useReducedMotion();

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <main className="gx-ayuda-shell">
      <div className="gx-help-ambient gx-help-ambient-a" aria-hidden="true" /><div className="gx-help-ambient gx-help-ambient-b" aria-hidden="true" />
      <div className="gx-help-line gx-help-line-a" aria-hidden="true" /><div className="gx-help-line gx-help-line-b" aria-hidden="true" />

      <header className="gx-help-header">
        <button type="button" className="gx-help-brand" onClick={() => go('inicio')} aria-label="Ir al inicio">
          <span className="gx-help-brandmark"><i /><i /><i /></span><span>GOXION</span>
        </button>
        <motion.button type="button" className="gx-space-pill" layoutId="gx-space-card" onClick={() => setLoginOpen(true)} whileTap={{ scale: 0.97 }}>
          <span className="gx-space-dot">◉</span><span>Mi Espacio</span>
        </motion.button>
      </header>

      <nav className="gx-help-nav" aria-label="Secciones principales">
        {navItems.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? 'active' : ''} onClick={() => go(item.id)}>
            {tab === item.id && <motion.span className="gx-help-nav-highlight" layoutId="gx-help-tab-highlight" />}
            <span className="gx-help-nav-icon">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>

      <section className="gx-help-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={reducedMotion ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={reducedMotion ? undefined : { opacity: 0, y: -7, filter: 'blur(3px)' }} transition={{ duration: reducedMotion ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}>
            {tab === 'inicio' && <HomePrototype onCatalog={() => go('catalogo')} onSpace={() => setLoginOpen(true)} />}
            {tab === 'catalogo' && <CatalogPrototype />}
            {tab === 'soporte' && <SupportPrototype />}
          </motion.div>
        </AnimatePresence>
      </section>

      <footer className="gx-help-footer"><span>GOXION</span><small>Tu entretenimiento, en un solo lugar.</small></footer>

      <AnimatePresence>
        {loginOpen && (
          <motion.div className="gx-login-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) setLoginOpen(false); }}>
            <LoginCard onClose={() => setLoginOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
