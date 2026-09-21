export {};

declare global {
  type GoxionId = string;

  interface GoxionClient {
    id: GoxionId;
    clave?: string;
    folio?: string;
    nombre?: string;
    usuario_acceso?: string;
    dia_pago?: number;
    estado?: string;
    pago_en_revision?: boolean;
    pago_revision_estado?: string;
    pago_revision_mensaje?: string;
    pago_revision_monto_faltante?: number;
    pago_revision_updated_at?: string;
    pagos_puntuales?: number;
    descuento_fallas?: number;
    origen_cliente?: string;
    promo_nuevo_elegible?: boolean;
    periodo_pendiente?: string;
    ciclo_cobro_manual?: boolean;
    corte_virtual?: boolean;
    telefono_normalizado?: string;
    created_at?: string;
  }

  interface GoxionService {
    id: GoxionId;
    cliente_id?: GoxionId;
    servicio_id?: GoxionId;
    nombre?: string;
    monto?: number;
    correo_login?: string;
    perfil_nombre?: string;
    perfil_pin?: string;
    modo_acceso?: 'compartido' | 'invitacion' | string;
    activo?: boolean;
  }

  interface GoxionPayment {
    id?: GoxionId;
    fecha?: string;
    periodo?: string;
    monto?: number;
    estado?: string;
    notas?: string;
  }

  interface GoxionAccountBreakdownLine {
    concepto?: string;
    monto?: number;
    tipo?: 'cargo' | 'descuento' | string;
    [key: string]: unknown;
  }

  interface GoxionAccountState {
    cliente_id?: GoxionId;
    folio?: string;
    nombre?: string;
    fecha_calculo?: string;
    periodo?: string;
    periodo_key?: string;
    periodo_label?: string;
    dia_pago?: number;
    fecha_corte?: string;
    dias_para_corte?: number;
    dias_atraso?: number;
    estado?: string;
    estado_label?: string;
    estado_db?: string;
    pago_en_revision?: boolean;
    pago_incompleto?: boolean;
    monto_faltante_revision?: number;
    esta_pagado_periodo?: boolean;
    subtotal?: number;
    total_calculado?: number;
    total_actual?: number;
    total_label?: string;
    servicios?: unknown[];
    lealtad?: {
      nivel?: number;
      porcentaje?: number;
      pagos_puntuales?: number;
      [key: string]: unknown;
    };
    descuentos?: {
      total?: number;
      [key: string]: unknown;
    };
    cargos?: {
      mora?: number;
      reactivacion?: number;
      [key: string]: unknown;
    };
    desglose?: GoxionAccountBreakdownLine[];
  }

  interface GoxionCatalogService {
    id: GoxionId;
    nombre: string;
    precio?: number;
    costo?: number;
    cuentas?: number;
    limite?: number;
    disponibles_servidor?: number | null;
    stock_manual?: number | null;
    etiqueta?: string;
    beneficios?: string | string[];
    activo?: boolean;
    modo_acceso?: string;
  }

  interface GoxionClientSpacePayload {
    ok?: boolean;
    cliente?: GoxionClient;
    servicios?: GoxionService[];
    pagos?: GoxionPayment[];
    estado_cuenta?: GoxionAccountState | null;
    catalogo?: GoxionCatalogService[];
    alertas?: unknown;
    configuracion?: Record<string, unknown>;
    gamificacion?: Record<string, unknown> | null;
    misiones_progreso?: unknown[];
    referidos?: unknown[];
    descuentos?: unknown[];
    cancelaciones?: unknown[];
    credenciales_entregas?: unknown[];
    novedades_servicio?: unknown[];
    accesos_cliente?: unknown[];
    [key: string]: unknown;
  }

  interface GoxionRegistrationRequest {
    id: GoxionId;
    nombre_declarado?: string;
    telefono_normalizado?: string;
    estado_admin?: string;
    resultado?: string;
    detalle?: string;
    cliente_id?: GoxionId | null;
    activacion?: {
      estado?: string;
      expira_at?: string;
      [key: string]: unknown;
    } | null;
  }

  interface GoxionAdminData {
    clientes?: GoxionClient[];
    cliente_servicios?: GoxionService[];
    catalogo?: GoxionCatalogService[];
    pagos?: GoxionPayment[];
    descuentos?: unknown[];
    notificaciones?: unknown[];
    alertas?: unknown[];
    configuracion?: Record<string, unknown>;
    [key: string]: unknown;
  }

  interface Window {
    catalogGroups?: Record<string, unknown>;
    goxionCurrentClientKey?: string;
    GOXION_DATA?: {
      supportIssues?: Record<
        string,
        Array<{
          issue: string;
          instructions: string;
          labelInput: string;
          templateWA: string;
        }>
      >;
      [key: string]: unknown;
    };
  }
}
