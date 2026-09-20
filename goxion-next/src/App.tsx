import { motion } from 'motion/react';
import { CatalogPrototype } from './components/CatalogPrototype';

export default function App() {
  return (
    <main className="gx-app">
      <div className="gx-orbit gx-orbit-a" aria-hidden="true" />
      <div className="gx-orbit gx-orbit-b" aria-hidden="true" />

      <motion.header
        className="gx-topbar"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <span className="gx-wordmark">GOXION</span>
          <span className="gx-next">NEXT</span>
        </div>
        <span className="gx-beta-pill">Arquitectura Beta</span>
      </motion.header>

      <motion.section
        className="gx-hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.52, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="gx-kicker">PRUEBA AISLADA</span>
        <h1>El mismo GOXION, con una base preparada para crecer.</h1>
        <p>
          React organiza la interfaz por componentes y Motion coordina layout, presencia y springs.
          La lógica oficial permanece fuera de esta prueba.
        </p>
      </motion.section>

      <CatalogPrototype />

      <footer className="gx-foot">
        GOXION Next 0.1 · sin escrituras a Supabase
      </footer>
    </main>
  );
}
