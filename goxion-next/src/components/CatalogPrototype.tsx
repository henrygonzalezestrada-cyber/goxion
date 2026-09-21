import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import type { CatalogBrand } from '../data/catalog';
import { loadPublicCatalog } from '../lib/public-catalog';
import { CatalogCard } from './CatalogCard';
import { SeekSearch } from './SeekSearch';
import { SegmentedHighlight } from './SegmentedHighlight';

type Props = {
  ownedServiceNames?: string[];
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function ownedBrandIds(names: string[]) {
  const ids = new Set<string>();

  for (const raw of names) {
    const name = normalize(raw);
    if (name.includes('netflix')) ids.add('netflix');
    if (name.includes('disney')) ids.add('disney');
    if (name.includes('hbo') || name.includes('max')) ids.add('max');
    if (name.includes('prime') || name.includes('amazon')) ids.add('prime');
    if (name.includes('youtube')) ids.add('youtube');
    if (name.includes('vix')) ids.add('vix');
    if (name.includes('crunchy')) ids.add('crunchyroll');
    if (name.includes('microsoft') || name.includes('365')) ids.add('microsoft');
    if (name.includes('google') || name.includes('one 2tb')) ids.add('google');
  }

  return ids;
}

function recommendation(
  brand: CatalogBrand,
  owned: Set<string>,
  authenticated: boolean,
) {
  if (!authenticated || owned.has(brand.id)) {
    return { score: 0, reason: '' };
  }

  const available = brand.plans.some((plan) => plan.available > 0);
  if (!available) return { score: 0, reason: '' };

  let score = 4;
  let reason = 'Disponible para ti';

  if (brand.id === 'prime' && owned.has('max')) {
    score = 20;
    reason = 'Complementa tu HBO Max';
  } else if (brand.id === 'max' && owned.has('prime')) {
    score = 20;
    reason = 'Complementa tu Prime Video';
  }

  if (brand.plans.some((plan) => Boolean(plan.tag))) score += 2;
  return { score, reason };
}

export function CatalogPrototype({ ownedServiceNames = [] }: Props) {
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  const owned = useMemo(
    () => ownedBrandIds(ownedServiceNames),
    [ownedServiceNames],
  );
  const authenticated = ownedServiceNames.length > 0;

  useEffect(() => {
    let active = true;

    setStatus('loading');
    setError('');
    loadPublicCatalog()
      .then((data) => {
        if (!active) return;
        setBrands(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        setError(
          err instanceof Error ? err.message : 'No fue posible cargar el catálogo.',
        );
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated && filter === 'recommended') setFilter('all');
  }, [authenticated, filter]);

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

    const withContext = brands.map((brand) => {
      const rec = recommendation(brand, owned, authenticated);
      const isOwned = owned.has(brand.id);
      const available = brand.plans.some((plan) => plan.available > 0);
      const searchable = normalize(
        [brand.name, ...brand.plans.map((plan) => plan.name)].join(' '),
      );

      return {
        brand,
        owned: isOwned,
        available,
        recommended: authenticated && !isOwned && rec.score > 0,
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

      const recommendedIds = new Set(
        withContext
          .filter((item) => !item.owned && item.recommendationScore > 0)
          .slice(0, 4)
          .map((item) => item.brand.id),
      );

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
  }, [authenticated, brands, filter, owned, query]);

  return (
    <section className="gx-catalog-real">
      <div className="gx-catalog-title-row">
        <div>
          <span className="gx-kicker">CATÁLOGO</span>
          <h2>Elige tu próxima plataforma</h2>
          <p>Precios y disponibilidad sincronizados con GOXION.</p>
        </div>

        <div className={'gx-live-catalog-badge ' + (authenticated ? 'client' : '')}>
          <span />
          {authenticated ? 'Mi Espacio' : 'En vivo'}
        </div>
      </div>

      <div className="gx-catalog-toolbar-next">
        <SeekSearch value={query} onChange={setQuery} />
        <SegmentedHighlight
          options={filters}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {status === 'loading' && (
        <div className="gx-catalog-sync">
          <i />
          <strong>Sincronizando catálogo…</strong>
          <small>Consultando precios y disponibilidad.</small>
        </div>
      )}

      {status === 'error' && (
        <motion.div
          className="gx-catalog-error"
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <strong>No pudimos sincronizar el catálogo</strong>
          <small>{error}</small>
        </motion.div>
      )}

      {status === 'ready' && (
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
      )}

      <AnimatePresence>
        {status === 'ready' && !computed.length && (
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
        Consulta en tiempo real. Las contrataciones permanecen bloqueadas durante
        la migración segura.
      </p>
    </section>
  );
}
