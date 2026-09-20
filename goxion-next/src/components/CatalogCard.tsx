import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import type { CatalogBrand } from '../data/catalog';

type Props = {
  brand: CatalogBrand;
  owned?: boolean;
  recommended?: boolean;
  recommendationReason?: string;
};

export function CatalogCard({
  brand,
  owned = false,
  recommended = false,
  recommendationReason = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(0);

  const plan = brand.plans[selectedPlan] ?? brand.plans[0];
  const minPrice = useMemo(
    () => Math.min(...brand.plans.map((item) => item.price)),
    [brand.plans],
  );
  const available = brand.plans.some((item) => item.available > 0);
  const tag = brand.plans.find((item) => item.tag)?.tag;

  return (
    <motion.article
      layout
      className={[
        'gx-brand-card',
        open ? 'is-open' : '',
        owned ? 'is-owned' : '',
        tag ? `has-tag tag-${tag.toLowerCase().replace(/\s+/g, '-')}` : '',
      ].join(' ')}
      transition={{ layout: { type: 'spring', stiffness: 330, damping: 31 } }}
    >
      <button
        type="button"
        className="gx-brand-head"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <div className="gx-brand-left">
          <motion.div
            layout
            className="gx-brand-logo"
            animate={{ scale: open ? 1.045 : 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 27 }}
          >
            {brand.mark}
          </motion.div>

          <div className="gx-brand-titles">
            <div className="gx-brand-name-row">
              <strong>{brand.name}</strong>
              {tag && <span className="gx-brand-promo">{tag}</span>}
            </div>

            <div className="gx-brand-meta">
              <span>Desde ${minPrice}</span>
              {owned && <b className="gx-context-badge owned">✓ Ya lo tienes</b>}
              {!owned && recommended && (
                <b className="gx-context-badge recommended">✦ Para ti</b>
              )}
            </div>
          </div>
        </div>

        <motion.span
          className="gx-brand-morph"
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 430, damping: 28 }}
          aria-hidden="true"
        >
          <i />
          <i />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="expanded"
            className="gx-brand-expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { type: 'spring', stiffness: 300, damping: 32 },
              opacity: { duration: 0.18 },
            }}
          >
            <div className="gx-brand-expanded-inner">
              {recommended && !owned && recommendationReason && (
                <div className="gx-smart-reason">{recommendationReason}</div>
              )}

              {brand.plans.length > 1 && (
                <div className="gx-plan-pills">
                  {brand.plans.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      className={index === selectedPlan ? 'active' : ''}
                      onClick={() => setSelectedPlan(index)}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}

              <motion.div layout className="gx-plan-details">
                <div className="gx-plan-details-head">
                  <span>Beneficios</span>
                  <b className={available ? 'available' : 'out'}>
                    {plan.available > 0 ? `${plan.available} disponibles` : 'Sin disponibilidad'}
                  </b>
                </div>
                <p>{plan.description}</p>
              </motion.div>

              <motion.div layout className="gx-price-action">
                <div className="gx-price">
                  <small>$</small>
                  <strong>{plan.price}</strong>
                  <span>MXN</span>
                </div>
                <button type="button" disabled={!plan.available} className="gx-readonly-action">
                  {plan.available ? 'Vista previa' : 'Agotado'}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
