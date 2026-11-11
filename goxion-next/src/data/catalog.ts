export type CatalogPlan = {
  id: string;
  name: string;
  price: number;
  available: number;
  description: string;
  tag?: 'POPULAR' | 'MÁS AHORRO' | 'NUEVO';
};

export type CatalogBrand = {
  id: string;
  name: string;
  mark: string;
  plans: CatalogPlan[];
};

export const catalogBrands: CatalogBrand[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    mark: 'N',
    plans: [
      {
        id: 'netflix-premium',
        name: 'Netflix Premium',
        price: 109,
        available: 2,
        description: 'Perfil premium para disfrutar series, películas y estrenos.',
        tag: 'POPULAR',
      },
    ],
  },
  {
    id: 'disney',
    name: 'Disney+',
    mark: 'D+',
    plans: [
      {
        id: 'disney-premium',
        name: 'Disney+ Premium',
        price: 89,
        available: 4,
        description: 'Disney, Pixar, Marvel, Star Wars y contenido premium.',
        tag: 'NUEVO',
      },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    mark: 'M',
    plans: [
      {
        id: 'max-platino',
        name: 'HBO Max Platino',
        price: 79,
        available: 3,
        description: 'Películas, series HBO, Max Originals y estrenos seleccionados.',
        tag: 'MÁS AHORRO',
      },
    ],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    mark: 'P',
    plans: [
      {
        id: 'prime-video',
        name: 'Prime Video',
        price: 45,
        available: 4,
        description: 'Series, películas y producciones Amazon Originals.',
      },
    ],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    mark: 'Y',
    plans: [
      {
        id: 'youtube-premium',
        name: 'YouTube Premium',
        price: 89,
        available: 3,
        description: 'YouTube sin anuncios, reproducción en segundo plano y YouTube Music.',
      },
    ],
  },
  {
    id: 'vix',
    name: 'ViX Premium',
    mark: 'V',
    plans: [
      {
        id: 'vix-premium',
        name: 'ViX Premium',
        price: 49,
        available: 4,
        description: 'Series, películas, novelas, deportes y contenido en español.',
      },
    ],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    mark: 'C',
    plans: [
      {
        id: 'crunchyroll',
        name: 'Crunchyroll',
        price: 100,
        available: 1,
        description: 'Anime, estrenos y temporadas completas.',
      },
    ],
  },
  {
    id: 'google',
    name: 'Google One',
    mark: 'G',
    plans: [
      {
        id: 'google-one-2tb',
        name: 'Google One 2 TB + IA',
        price: 29,
        available: 3,
        description: 'Almacenamiento Google One de 2 TB con funciones de IA compatibles.',
        tag: 'MÁS AHORRO',
      },
    ],
  },
  {
    id: 'microsoft',
    name: 'Microsoft 365',
    mark: 'M365',
    plans: [
      {
        id: 'microsoft-365',
        name: 'Microsoft 365',
        price: 79,
        available: 3,
        description: 'Office, almacenamiento y herramientas de productividad.',
      },
    ],
  },
];
