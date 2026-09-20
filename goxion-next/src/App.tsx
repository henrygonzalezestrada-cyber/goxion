import { motion } from 'motion/react';
import { CatalogPrototype } from './components/CatalogPrototype';

export default function App() {
  return (
    <main className="gx-app gx-app-real">
      <div className="gx-background-line gx-line-one" aria-hidden="true" />
      <div className="gx-background-line gx-line-two" aria-hidden="true" />

      <motion.header
        className="gx-next-header"
        initial={{ opacity: 0, y: -9 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="gx-next-brand">
          <div className="gx-next-orbit-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
          <span>GOXION</span>
        </div>

        <div className="gx-next-status">
          <span />
          NEXT · READ ONLY
        </div>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 13 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <CatalogPrototype />
      </motion.div>

      <footer className="gx-foot">
        GOXION Next · Fase 2 · sin escrituras a Supabase
      </footer>
    </main>
  );
}
