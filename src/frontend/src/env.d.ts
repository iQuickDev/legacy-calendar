/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_UPLOADS_URL?: string;
    readonly VITE_LOG_LEVEL?: 'fatal' | 'critical' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
