import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { catalogBrands } from '../data/catalog';
import { CatalogCard } from './CatalogCard';
import { SeekSearch } from './SeekSearch';
import { SegmentedHighlight } from './SegmentedHighlight';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const demoOwned = new Set(['max']);

function recommendation(brandId: string, authenticated: boolean) {
  if (!authenticated || demoOwned.has(brandId)) return { score: 0, reason: '' };

  let score = catalogBrands
    .find((brand) => brand.id === brandId)
    ?.plans.some((plan) => plan.available > 0)
    ? 4
    : 0;

  let reason = 'Disponible para ti';

  if (brandId === 'prime' && demoOwned.has('max')) {
    score = 20;
    reason = 'Complementa tu HBO Max';
  } else if (brandId === 'max' && demoOwned.has('prime')) {
    score = 20;
    reason = 'Complementa tu Prime Video';
  }

  const tagged = catalogBrands
    .find((brand) => brand.id === brandId)
    ?.plans.some((plan) => Boolean(plan.tag));

  if (tagged) score += 2;
  return { score, reason };
}

export function CatalogPrototype() {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [authenticated, setAuthenticated] = useState(false);

  const filters = authenticated
    ? [
        { id: 'all', label: 'Todos' },
        { id: 'recommended', label: 'Para ti' },
        { id: 'available', label: 'Disponibles' },
      ]
    : [
        { id: 'all', label: 'Todos' },
        { id: 'available', label: 'Disponibles' },
      ];

  const computed = useMemo(() => {
    const q = normalize(query.trim());

    const withContext = catalogBrands.map((brand) => {
      const rec = recommendation(brand.id, authenticated);
      const owned = authenticated && demoOwned.has(brand.id);
      const available = brand.plans.some((plan) => plan.available > 0);
      const searchable = normalize(
        [brand.name, ...brand.plans.map((plan) => plan.name)].join(' '),
      );

      return {
        brand,
        owned,
        available,
        recommended: authenticated && !owned && rec.score > 0,
        recommendationScore: rec.score,
        recommendationReason: rec.reason,
        matchesText: !q || searchable.includes(q),
      };
    });

    if (authenticated) {
      withContext.sort((a, b) => {
        if (a.owned !== b.owned) return a.owned ? 1 : -1;
        if (a.recommendationScore !== b.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }
        return a.brand.name.localeCompare(b.brand.name, 'es');
      });

      const candidates = withContext
        .filter((item) => !item.owned && item.recommendationScore > 0)
        .slice(0, 4);
      const recommendedIds = new Set(candidates.map((item) => item.brand.id));

      withContext.forEach((item) => {
        item.recommended = recommendedIds.has(item.brand.id);
      });
    }

    return withContext.filter((item) => {
      if (!item.matchesText) return false;
      if (filter === 'available') return item.available;
      if (filter === 'recommended') return item.recommended;
      return true;
    });
  }, [authenticated, filter, query]);

  const changeContext = () => {
    setAuthenticated((current) => !current);
    setFilter('all');
    setQuery('');
  };

  return (
    <section className="gx-catalog-real">
      <div className="gx-catalog-title-row">
        <div>
          <span className="gx-kicker">CATÁLOGO NEXT</span>
          <h2>Elige tu próxima plataforma</h2>
          <p>Replica la lógica actual con componentes y animación de layout.</p>
        </div>

        <button type="button" className="gx-demo-context" onClick={changeContext}>
          <span className={authenticated ? 'is-on' : ''} />
          {authenticated ? 'Cliente demo' : 'Invitado'}
        </button>
      </div>

      <div className="gx-catalog-toolbar-next">
        <SeekSearch value={query} onChange={setQuery} />
        <SegmentedHighlight options={filters} value={filter} onChange={setFilter} />
      </div>

      <motion.div layout className="gx-catalog-grid-next">
        <AnimatePresence mode="popLayout" initial={false}>
          {computed.map((item) => (
            <CatalogCard
              key={item.brand.id}
              brand={item.brand}
              owned={item.owned}
              recommended={item.recommended}
              recommendationReason={item.recommendationReason}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {!computed.length && (
          <motion.div
            className="gx-next-empty"
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
          >
            <span>⌕</span>
            <strong>No encontramos coincidencias</strong>
            <small>Prueba con otro nombre o cambia el filtro.</small>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="gx-prototype-note">
        Esta fase sigue siendo sólo lectura. “Cliente demo” sirve únicamente para probar
        recomendaciones y la distribución personalizada.
      </p>
    </section>
  );
}
