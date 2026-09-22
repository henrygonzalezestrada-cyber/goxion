export {};

declare global {
  interface Window {
    GOXION_FINANCIAL: {
      readonly MODE: 'shadow' | 'official' | string;
      readonly CONTRACT_VERSION: string;
      clientState(): Promise<GoxionFinancialState | null>;
      adminState(clienteId: string): Promise<GoxionFinancialState | null>;
      adminCompare(): Promise<{
        ok?: boolean;
        estados?: GoxionFinancialState[];
        comparacion?: {
          clientes?: number;
          diferencias?: number;
          delta_abs_total?: number;
        };
        modo?: string;
        [key: string]: unknown;
      }>;
    };
  }
}
