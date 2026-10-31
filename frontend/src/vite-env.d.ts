/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MIZAN_REGISTRY_ADDRESS?: string;
  readonly VITE_SEPOLIA_RPC_URL?: string;
  readonly VITE_MIZAN_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
