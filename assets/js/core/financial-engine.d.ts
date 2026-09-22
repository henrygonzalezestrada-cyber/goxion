export {};

declare global {
  interface Window {
    GOXION_FINANCIAL: {
      readonly MODE: 'shadow' | 'official' | string;
      readonly CONTRACT_VERSION: string;
      clientState(): Promise<GoxionFinancialState | null>;
      adminState(clienteId: string): Promise<GoxionFinancialState | null>;
      selectCompatibleState(
        legacyState: GoxionAccountState | null | undefined,
        financialState: GoxionFinancialState | null | undefined,
        expectedClientId?: string
      ): {
        state: GoxionFinancialState | GoxionAccountState | null;
        audit: {
          source: 'financial-v1' | 'legacy-fallback' | 'legacy-variance-fallback' | 'none';
          financial_valid: boolean;
          compared: boolean;
          matches: boolean | null;
          differences: Array<{ field: string; legacy: unknown; financial: unknown }>;
        };
      };
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
