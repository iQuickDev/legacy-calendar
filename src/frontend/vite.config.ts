import { defineConfig } from 'vite';
import { Socket } from 'node:net';

// Polyfill socket.destroySoon for Bun compatibility with Vite's proxy
if (typeof process !== 'undefined' && process.versions && process.versions.bun) {
    if (!(Socket.prototype as any).destroySoon) {
        (Socket.prototype as any).destroySoon = Socket.prototype.destroy;
    }
}
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import vueDevTools from 'vite-plugin-vue-devtools';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    server: {
        proxy: {
            // Directs any request starting with /api to your backend
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
                ws: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
                configure: (proxy, options) => {
                    void options;
                    proxy.on('proxyReqWs', (proxyReq, req, socket) => {
                        void proxyReq;
                        void req;
                        if (socket && !(socket as any).destroySoon) {
                            (socket as any).destroySoon = (socket as any).destroy;
                        }
                    });
                    proxy.on('proxyRes', (_proxyRes, _req, res) => {
                        const socket = (res as any).socket || (res as any).connection;
                        if (socket && !(socket as any).destroySoon) {
                            (socket as any).destroySoon = (socket as any).destroy;
                        }
                    });
                    proxy.on('error', (_err, _req, res) => {
                        const socket = (res as any).socket || (res as any).connection;
                        if (socket && !(socket as any).destroySoon) {
                            (socket as any).destroySoon = (socket as any).destroy;
                        }
                    });
                }
            }
        }
    },
    build: {
        sourcemap: true
    },
    plugins: [
        tailwindcss(),
        vue(),
        vueDevTools(),
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            injectManifest: {
                rollupFormat: 'iife'
            },
            registerType: 'autoUpdate',
            injectRegister: 'auto',
            devOptions: {
                enabled: true,
                type: 'module'
            },
            manifest: {
                name: 'Legacy Calendar',
                short_name: 'Calendar',
                description: "Legacy's calendar",
                theme_color: '#000000',
                background_color: '#000000',
                display: 'standalone',
                start_url: '/',
                id: '/',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any'
                    },
                    {
                        src: 'icon.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'icon.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'icon.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            }
        })
    ]
});
