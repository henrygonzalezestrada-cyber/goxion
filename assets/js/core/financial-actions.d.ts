export {};

type GoxionPromotionMechanic = 'precio_fijo' | 'porcentaje' | 'combo' | 'addon';
type GoxionPromotionAudience = 'todos' | 'nuevos' | 'actuales' | 'con_servicio' | 'sin_servicio' | 'lealtad_1' | 'lealtad_2';
type GoxionPromotionItemRole = 'principal' | 'incluido' | 'disparador' | 'complemento';

interface GoxionPromotionInput {
  id?: string;
  mecanica: GoxionPromotionMechanic;
  nombre: string;
  titulo_publico?: string;
  descripcion_publica?: string;
  badge?: string;
  prioridad?: number;
  items: Array<{
    servicio_id: string;
    rol: GoxionPromotionItemRole;
    orden?: number;
  }>;
  servicio_id?: string;
  servicio_disparador_id?: string;
  servicios_complemento_ids?: string[];
  precio_promocional?: number;
  descuento_porcentaje?: number;
  duracion_periodos: number;
  inicio: string;
  fin: string;
  audiencia: GoxionPromotionAudience;
  segmentacion?: { servicio_id?: string; [key: string]: unknown };
  acumulacion?: {
    lealtad?: boolean;
    trato_justo?: boolean;
    beneficios_programados?: boolean;
    bienvenida?: boolean;
  };
  mostrar_precio_anterior?: boolean;
  oferta_flash?: boolean;
  mostrar_contador?: boolean;
  destacada?: boolean;
  notificar_cliente?: boolean;
  publicada?: boolean;
  activa?: boolean;
}

declare global {
  interface Window {
    GOXION_FINANCIAL_ACTIONS: {
      readonly CONTRACT_VERSION: string;
      saveFairDeal(input: {
        clienteId: string;
        clienteServicioId: string;
        periodo: string;
        diasFalla?: number;
        motivo?: string;
      }): Promise<Record<string, unknown>>;
      deleteFairDeal(input: {
        id: string;
      }): Promise<Record<string, unknown>>;
      applyFairDealBulk(input: {
        clienteIds: string[];
        servicioId?: string;
        servicioNombre?: string;
        periodo: string;
        diasFalla?: number;
        motivo?: string;
      }): Promise<Record<string, unknown>>;
      saveBenefit(input: {
        clienteId: string;
        concepto?: string;
        tipo?: 'monto' | 'porcentaje' | string;
        valor: number;
        periodoInicio: string;
        periodosTotal?: number;
      }): Promise<Record<string, unknown>>;
      cancelBenefit(input: { id: string }): Promise<Record<string, unknown>>;
      deleteBenefit(input: { id: string }): Promise<Record<string, unknown>>;
      savePromotion(input: GoxionPromotionInput): Promise<Record<string, unknown>>;
      togglePromotion(input: { id: string; activa: boolean }): Promise<Record<string, unknown>>;
      deletePromotion(input: { id: string }): Promise<Record<string, unknown>>;
      assignPromotion(input: {
        clienteServicioId: string;
        promocionId: string;
        periodoInicio?: string;
      }): Promise<Record<string, unknown>>;
      removePromotionAssignment(input: { id: string }): Promise<Record<string, unknown>>;
      registerPartialPayment(input: {
        clienteId: string;
        saldoRestante: number;
        notas?: string;
        periodoEsperado: string;
      }): Promise<Record<string, unknown>>;
      pactPaymentDate(input: {
        clienteId: string;
        fechaPactada: string;
        motivo?: string;
        periodoEsperado: string;
      }): Promise<Record<string, unknown>>;
      cancelPactPaymentDate(input: {
        clienteId: string;
        periodoEsperado: string;
      }): Promise<Record<string, unknown>>;
      approvePayment(input: {
        clienteId: string;
        monto: number;
        puntual?: boolean;
        notas?: string;
        periodoEsperado: string;
      }): Promise<{
        periodo_pagado?: string;
        periodo_pendiente?: string;
        pagos_puntuales?: number;
        reutilizado?: boolean;
        puntual?: boolean | null;
        lealtad_efecto?: string | null;
        racha_resultado?: number | null;
        operation_id?: string;
        contrato?: string;
        version?: string;
        estado_anterior?: GoxionFinancialState | null;
        estado_financiero?: GoxionFinancialState | null;
        estado_financiero_error?: string | null;
        [key: string]: unknown;
      }>;
    };
  }
}
