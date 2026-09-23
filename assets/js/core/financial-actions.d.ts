export {};

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
      savePromotion(input: Record<string, unknown>): Promise<Record<string, unknown>>;
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
