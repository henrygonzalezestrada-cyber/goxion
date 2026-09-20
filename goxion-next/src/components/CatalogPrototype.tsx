import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { SegmentedHighlight } from './SegmentedHighlight';

const services = [
  { id: 'netflix', name: 'Netflix', category: 'streaming', badge: 'Premium', accent: 'N' },
  { id: 'max', name: 'HBO Max', category: 'streaming', badge: 'Platino', accent: 'M' },
  { id: 'prime', name: 'Prime Video', category: 'streaming', badge: 'Video', accent: 'P' },
  { id: 'youtube', name: 'YouTube Premium', category: 'premium', badge: 'Premium', accent: 'Y' },
  { id: 'google', name: 'Google One 2 TB', category: 'premium', badge: 'IA + nube', accent: 'G' },
  { id: 'microsoft', name: 'Microsoft 365', category: 'premium', badge: 'Productividad', accent: 'M' },
];

const filters = [
  { id: 'todos', label: 'Todos' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'premium', label: 'Premium' },
];

export function CatalogPrototype() {
  const [filter, setFilter] = useState('todos');

  const visible = useMemo(
    () => services.filter((service) => filter === 'todos' || service.category === filter),
    [filter],
  );

  return (
    <section className="gx-panel">
      <div className="gx-panel-head">
        <div>
          <span className="gx-kicker">CATÁLOGO</span>
          <h2>Explora GOXION</h2>
          <p>
            Primera prueba React + Motion. Los servicios son locales: todavía no consulta Supabase.
          </p>
        </div>
        <span className="gx-readonly">SOLO UI</span>
      </div>

      <SegmentedHighlight options={filters} value={filter} onChange={setFilter} />

      <motion.div layout className="gx-service-grid">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((service) => (
            <motion.article
              layout
              key={service.id}
              className="gx-service-card"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 31 }}
            >
              <div className="gx-service-mark">{service.accent}</div>
              <div className="gx-service-copy">
                <strong>{service.name}</strong>
                <span>{service.badge}</span>
              </div>
              <motion.span
                className="gx-service-arrow"
                whileTap={{ scale: 0.84 }}
                aria-hidden="true"
              >
                ↗
              </motion.span>
            </motion.article>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
