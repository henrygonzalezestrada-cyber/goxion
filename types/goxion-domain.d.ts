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
    puntual?: boolean | null;
    lealtad_efecto?: 'sumo' | 'reinicio' | 'sin_cambio' | string | null;
    racha_resultado?: number | null;
  }

  interface GoxionFinancialPromotionLine {
    asignacion_id?: GoxionId;
    promocion_id?: GoxionId | null;
    promocion?: string;
    cliente_servicio_id?: GoxionId;
    servicio?: string;
    precio_base?: number;
    precio_normal_snapshot?: number;
    precio_promocional?: number;
    ahorro?: number;
    periodo_inicio?: string;
    periodo_indice?: number;
    periodos_totales?: number;
    periodos_consumidos?: number;
  }

  interface GoxionFinancialState extends GoxionAccountState {
    fuente_financiera?: string;
    contrato_financiero?: {
      version?: string;
      motor?: string;
      modo?: 'sombra' | 'oficial' | string;
      total_oficial_preservado?: boolean;
    };
    promociones?: {
      periodo?: string;
      total_ahorro?: number;
      detalles?: GoxionFinancialPromotionLine[];
    };
    shadow?: {
      subtotal_oficial?: number;
      subtotal_con_promociones?: number;
      total_oficial?: number;
      total_con_promociones?: number;
      delta_total?: number;
      coincide_con_oficial?: boolean;
    };
    reglas?: {
      lealtad?: Array<{ nivel?: number; pagos?: number; porcentaje?: number }>;
      mora?: { porcentaje_diario?: number; tope_porcentaje?: number };
      reactivacion?: { despues_de_dias?: number; porcentaje?: number };
      trato_justo?: { porcentaje_diario?: number; tope_dias?: number };
      promociones?: { aplicacion?: string; consumo?: string };
      pagos_parciales?: { mora_sobre_saldo?: boolean; reinicia_base_mora_en_parcial?: boolean };
      acuerdos_cobro?: { solo_periodo_actual?: boolean; preserva_dia_original?: boolean };
    };
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
    fecha_corte_original?: string;
    fecha_pactada?: string | null;
    acuerdo_cobro?: {
      id?: GoxionId;
      fecha_original?: string;
      fecha_pactada?: string;
      motivo?: string;
      activo?: boolean;
    } | null;
    dias_para_corte?: number;
    dias_atraso?: number;
    estado?: string;
    estado_label?: string;
    estado_db?: string;
    pago_en_revision?: boolean;
    pago_incompleto?: boolean;
    monto_faltante_revision?: number;
    pago_parcial?: {
      id?: GoxionId;
      fecha_pago?: string;
      monto_pagado?: number;
      saldo_restante?: number;
      activo?: boolean;
    } | null;
    esta_pagado_periodo?: boolean;
    subtotal?: number;
    subtotal_efectivo?: number;
    promociones?: {
      total_ahorro?: number;
      detalles?: GoxionFinancialPromotionLine[];
      [key: string]: unknown;
    };
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
      mora_porcentaje?: number;
      mora_base?: number;
      mora_dias?: number;
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
