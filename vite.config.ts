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
        'process.env.GEMINI_PROXY_URL': JSON.stringify(e('GEMINI_PROXY_URL')),
        'process.env.FIREBASE_API_KEY': JSON.stringify(e('FIREBASE_API_KEY')),
        'process.env.FIREBASE_AUTH_DOMAIN': JSON.stringify(e('FIREBASE_AUTH_DOMAIN')),
        'process.env.FIREBASE_PROJECT_ID': JSON.stringify(e('FIREBASE_PROJECT_ID')),
        'process.env.FIREBASE_STORAGE_BUCKET': JSON.stringify(e('FIREBASE_STORAGE_BUCKET')),
        'process.env.FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(e('FIREBASE_MESSAGING_SENDER_ID')),
        'process.env.FIREBASE_APP_ID': JSON.stringify(e('FIREBASE_APP_ID')),
        'process.env.FIREBASE_MEASUREMENT_ID': JSON.stringify(e('FIREBASE_MEASUREMENT_ID')),
        'process.env.TTS_FUNCTION_URL': JSON.stringify(e('TTS_FUNCTION_URL')),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      }
    };
});
