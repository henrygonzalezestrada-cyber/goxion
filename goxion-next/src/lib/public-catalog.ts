import type { CatalogBrand, CatalogPlan } from '../data/catalog';
import { callGoxionFunction } from './goxion-api';

type PublicService = {
  id?: string;
  nombre?: string;
  precio?: number;
  etiqueta?: string | null;
  beneficios?: unknown;
  activo?: boolean;
};

type PublicSpaceResponse = {
  ok: boolean;
  catalogo?: PublicService[];
  error?: string;
};

type InventoryItem = {
  id?: string;
  nombre?: string;
  disponibles?: number;
  modo?: 'automatico' | 'manual' | string;
};

type InventoryResponse = {
  ok: boolean;
  inventario?: InventoryItem[];
  error?: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

function brandMeta(name: string) {
  const value = normalize(name);

  if (value.includes('netflix')) return { id: 'netflix', name: 'Netflix', mark: 'N' };
  if (value.includes('disney')) return { id: 'disney', name: 'Disney+', mark: 'D+' };
  if (value.includes('hbo') || value.includes('max')) return { id: 'max', name: 'Max', mark: 'M' };
  if (value.includes('prime') || value.includes('amazon')) return { id: 'prime', name: 'Prime Video', mark: 'P' };
  if (value.includes('youtube')) return { id: 'youtube', name: 'YouTube', mark: 'Y' };
  if (value.includes('vix')) return { id: 'vix', name: 'ViX Premium', mark: 'V' };
  if (value.includes('crunchy')) return { id: 'crunchyroll', name: 'Crunchyroll', mark: 'C' };
  if (value.includes('microsoft') || value.includes('365')) return { id: 'microsoft', name: 'Microsoft 365', mark: 'M365' };
  if (value.includes('google') || value.includes('one 2tb')) return { id: 'google', name: 'Google One', mark: 'G' };

  const compact = value.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'goxion';
  return {
    id: compact,
    name: name || 'GOXION',
    mark: (name || 'G').trim().slice(0, 2).toUpperCase(),
  };
}

function descriptionFromBenefits(benefits: unknown, name: string) {
  if (Array.isArray(benefits)) {
    const values = benefits.map(String).map((x) => x.trim()).filter(Boolean);
    if (values.length) return values.slice(0, 3).join(' · ');
  }

  if (typeof benefits === 'string' && benefits.trim()) {
    return benefits.trim();
  }

  return 'Servicio administrado desde GOXION.';
}

function tagFromLabel(label: unknown): CatalogPlan['tag'] | undefined {
  const value = normalize(String(label || ''));
  if (value.includes('popular')) return 'POPULAR';
  if (value.includes('ahorro') || value.includes('oferta')) return 'MÁS AHORRO';
  if (value.includes('nuevo')) return 'NUEVO';
  return undefined;
}

export async function loadPublicCatalog(): Promise<CatalogBrand[]> {
  const [catalogResponse, inventoryResponse] = await Promise.all([
    callGoxionFunction<PublicSpaceResponse>('mi-espacio', { modo: 'publico' }),
    callGoxionFunction<InventoryResponse>('inventario-publico', {}),
  ]);

  if (catalogResponse.ok !== true) {
    throw new Error(catalogResponse.error || 'No fue posible cargar el catálogo.');
  }
  if (inventoryResponse.ok !== true) {
    throw new Error(inventoryResponse.error || 'No fue posible cargar la disponibilidad.');
  }

  const inventoryById = new Map(
    (inventoryResponse.inventario || []).map((item) => [String(item.id || ''), item]),
  );
  const inventoryByName = new Map(
    (inventoryResponse.inventario || []).map((item) => [normalize(String(item.nombre || '')), item]),
  );

  const grouped = new Map<string, CatalogBrand>();

  for (const service of catalogResponse.catalogo || []) {
    if (service.activo === false || !service.nombre) continue;

    const meta = brandMeta(service.nombre);
    const inventory =
      inventoryById.get(String(service.id || '')) ||
      inventoryByName.get(normalize(service.nombre));

    const plan: CatalogPlan = {
      id: String(service.id || meta.id + '-' + grouped.size),
      name: service.nombre,
      price: Number(service.precio || 0),
      available: Math.max(0, Number(inventory?.disponibles || 0)),
      description: descriptionFromBenefits(service.beneficios, service.nombre),
      tag: tagFromLabel(service.etiqueta),
    };

    const current = grouped.get(meta.id);
    if (current) {
      current.plans.push(plan);
    } else {
      grouped.set(meta.id, {
        id: meta.id,
        name: meta.name,
        mark: meta.mark,
        plans: [plan],
      });
    }
  }

  return [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
