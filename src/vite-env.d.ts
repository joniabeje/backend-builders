/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", use the in-memory mock repository instead of /api (#57). */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
