interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const devConfig: FirebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_DEV_API_KEY!,
  authDomain: process.env.VITE_FIREBASE_DEV_AUTH_DOMAIN!,
  projectId: process.env.VITE_FIREBASE_DEV_PROJECT_ID!,
  storageBucket: process.env.VITE_FIREBASE_DEV_STORAGE_BUCKET!,
  messagingSenderId: process.env.VITE_FIREBASE_DEV_MESSAGING_SENDER_ID!,
  appId: process.env.VITE_FIREBASE_DEV_APP_ID!,
};

const prodConfig: FirebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_PROD_API_KEY!,
  authDomain: process.env.VITE_FIREBASE_PROD_AUTH_DOMAIN!,
  projectId: process.env.VITE_FIREBASE_PROD_PROJECT_ID!,
  storageBucket: process.env.VITE_FIREBASE_PROD_STORAGE_BUCKET!,
  messagingSenderId: process.env.VITE_FIREBASE_PROD_MESSAGING_SENDER_ID!,
  appId: process.env.VITE_FIREBASE_PROD_APP_ID!,
};

export const FIREBASE_ENV = (process.env.VITE_FIREBASE_ENV || 'prod') as 'dev' | 'prod';
export const firebaseConfig = FIREBASE_ENV === 'dev' ? devConfig : prodConfig;
export const isDev = FIREBASE_ENV === 'dev';
export const isProd = FIREBASE_ENV === 'prod';
