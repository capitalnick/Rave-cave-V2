import { firebaseConfig } from './firebaseConfig';

const BASE =
  `https://australia-southeast1-${firebaseConfig.projectId}.cloudfunctions.net`;

export const FUNCTION_URLS = {
  gemini: process.env.GEMINI_PROXY_URL || `${BASE}/gemini`,
  geminiStream: `${BASE}/geminiStream`,
  queryInventory: `${BASE}/queryInventory`,
  tts: process.env.TTS_FUNCTION_URL || `${BASE}/tts`,
  backfillEmbeddings: `${BASE}/backfillEmbeddings`,
  createCheckout: `${BASE}/createCheckoutSession`,
  createPortal: `${BASE}/createPortalSession`,
  cancelSubscription: `${BASE}/cancelSubscription`,
} as const;
