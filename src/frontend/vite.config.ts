import { defineConfig } from 'vite';
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
                // Optional: remove /api from the path before it hits the backend
                rewrite: (path) => path.replace(/^\/api/, '')
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
