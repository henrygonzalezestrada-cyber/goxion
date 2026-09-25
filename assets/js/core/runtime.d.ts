export {};

declare global {
  interface Window {
    GOXION_CORE: {
      readonly SUPABASE_ORIGIN: string;
      readonly ENDPOINTS: Readonly<Record<string, string>>;
      readonly STORAGE: {
        readonly CLIENT_TOKEN: 'goxion_client_token';
        readonly ADMIN_TOKEN: 'GOXION_ADMIN_TOKEN';
      };
      readonly BUSINESS: {
        readonly WHATSAPP: string;
        readonly BANK: {
          readonly NAME: string;
          readonly HOLDER: string;
          readonly CLABE: string;
          readonly ACCOUNTS: readonly {
            readonly ID: string;
            readonly LABEL: string;
            readonly INSTITUTION: string;
            readonly HOLDER: string;
            readonly CLABE: string;
            readonly CURRENCY: string;
            readonly PRIMARY: boolean;
          }[];
        };
        readonly CHANNELS: {
          readonly pedidos: string;
          readonly soporte: string;
          readonly logins: string;
          readonly pagos: string;
        };
      };
      endpoint(name: string): string;
      parseJSON(response: Response): Promise<{ text: string; json: any }>;
      getClientToken(): string;
      getAdminToken(): string;
      nativeFetch: typeof fetch;
      request(
        name: string,
        options?: {
          method?: string;
          headers?: Record<string, string>;
          body?: BodyInit | null;
          token?: string;
          tokenHeader?: string;
          cache?: RequestCache;
          fetchImpl?: typeof fetch;
        },
      ): Promise<Response>;
    };
  }
}
