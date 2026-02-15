import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const fileEnv = loadEnv(mode, '.', '');
    // loadEnv only reads .env files; on Vercel env vars live in process.env
    const e = (key: string) => fileEnv[key] || process.env[key] || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tailwindcss()],
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
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
