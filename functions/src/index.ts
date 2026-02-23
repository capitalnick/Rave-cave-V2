import {setGlobalOptions} from "firebase-functions/v2";
import {getApps, initializeApp} from "firebase-admin/app";

if (getApps().length === 0) initializeApp();
setGlobalOptions({maxInstances: 10});

export {tts} from "./tts";
export {gemini, geminiStream} from "./gemini";
export {queryInventory} from "./queryInventory";
export {onWineWrite} from "./onWineWrite";
export {backfillEmbeddings} from "./backfillEmbeddings";
export {
  createCheckoutSession,
  createPortalSession,
  cancelSubscription,
  stripeWebhook,
} from "./stripe";
