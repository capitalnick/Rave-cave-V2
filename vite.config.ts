import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig(({ mode }) => {
    const fileEnv = loadEnv(mode, '.', '');
    // loadEnv only reads .env files; on Vercel env vars live in process.env
    const e = (key: string) => fileEnv[key] || process.env[key] || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          manifest: {
            name: 'Rave Cave',
            short_name: 'Rave Cave',
            description: 'AI Sommelier — cellar management, recommendations & wine list analysis',
            start_url: '/',
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            icons: [
              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            navigateFallback: '/index.html',
          },
        }),
        ...(e('SENTRY_AUTH_TOKEN') ? [sentryVitePlugin({
          org: e('SENTRY_ORG'),
          project: e('SENTRY_PROJECT'),
          authToken: e('SENTRY_AUTH_TOKEN'),
        })] : []),
      ],
      build: {
        sourcemap: true,
      },
      define: {
        'process.env.VITE_FIREBASE_ENV': JSON.stringify(e('VITE_FIREBASE_ENV')),
        // DEV project
        'process.env.VITE_FIREBASE_DEV_API_KEY': JSON.stringify(e('VITE_FIREBASE_DEV_API_KEY')),
        'process.env.VITE_FIREBASE_DEV_AUTH_DOMAIN': JSON.stringify(e('VITE_FIREBASE_DEV_AUTH_DOMAIN')),
        'process.env.VITE_FIREBASE_DEV_PROJECT_ID': JSON.stringify(e('VITE_FIREBASE_DEV_PROJECT_ID')),
        'process.env.VITE_FIREBASE_DEV_STORAGE_BUCKET': JSON.stringify(e('VITE_FIREBASE_DEV_STORAGE_BUCKET')),
        'process.env.VITE_FIREBASE_DEV_MESSAGING_SENDER_ID': JSON.stringify(e('VITE_FIREBASE_DEV_MESSAGING_SENDER_ID')),
        'process.env.VITE_FIREBASE_DEV_APP_ID': JSON.stringify(e('VITE_FIREBASE_DEV_APP_ID')),
        // PROD project
        'process.env.VITE_FIREBASE_PROD_API_KEY': JSON.stringify(e('VITE_FIREBASE_PROD_API_KEY')),
        'process.env.VITE_FIREBASE_PROD_AUTH_DOMAIN': JSON.stringify(e('VITE_FIREBASE_PROD_AUTH_DOMAIN')),
        'process.env.VITE_FIREBASE_PROD_PROJECT_ID': JSON.stringify(e('VITE_FIREBASE_PROD_PROJECT_ID')),
        'process.env.VITE_FIREBASE_PROD_STORAGE_BUCKET': JSON.stringify(e('VITE_FIREBASE_PROD_STORAGE_BUCKET')),
        'process.env.VITE_FIREBASE_PROD_MESSAGING_SENDER_ID': JSON.stringify(e('VITE_FIREBASE_PROD_MESSAGING_SENDER_ID')),
        'process.env.VITE_FIREBASE_PROD_APP_ID': JSON.stringify(e('VITE_FIREBASE_PROD_APP_ID')),
        // Non-Firebase
        'process.env.TTS_FUNCTION_URL': JSON.stringify(e('TTS_FUNCTION_URL')),
        'process.env.GEMINI_PROXY_URL': JSON.stringify(e('GEMINI_PROXY_URL')),
        'process.env.SENTRY_DSN': JSON.stringify(e('SENTRY_DSN')),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
