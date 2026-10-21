export const SUPABASE_PROJECT_URL = 'https://hmpevcwodcgbkviarfic.supabase.co';

export const GOXION_FUNCTIONS = {
  ayuda: [
    'accesos-cliente-beta',
    'activar-cuenta-goxion',
    'cancelaciones-cliente',
    'credenciales-cliente',
    'estado-cuenta-beta',
    'inventario-publico',
    'login-goxion',
    'mi-espacio',
    'notificar-goxion',
    'novedades-cliente',
    'registro-goxion',
  ],
  admin: [
    'accesos-admin-beta',
    'admin-acciones',
    'admin-ajustes',
    'admin-datos',
    'admin-operaciones',
    'beneficios-admin-beta',
    'cancelaciones-admin',
    'credenciales-admin-beta',
    'cuentas-plataforma-admin-beta',
    'estado-cuenta-beta',
    'inventario',
    'login-admin',
    'periodo-cobro',
    'promociones-admin-beta',
    'registro-admin',
    'trato-justo',
  ],
  index: [
    'estado-cuenta-beta',
    'mi-espacio',
    'notificar-goxion',
    'periodo-cobro',
    'trato-justo',
  ],
} as const;

export type GoxionSurface = keyof typeof GOXION_FUNCTIONS;
