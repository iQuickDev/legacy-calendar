/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_UPLOADS_URL?: string;
    readonly VITE_LOG_LEVEL?: 'fatal' | 'critical' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
    readonly VITE_GOOGLE_MAPS_EMBED_API_KEY?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
