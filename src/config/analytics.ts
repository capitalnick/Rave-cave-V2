import posthog from 'posthog-js';
import { isProd } from '@/config/firebaseConfig';

const POSTHOG_KEY = process.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (!isProd || !POSTHOG_KEY) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    persistence: 'memory',
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
  });
  initialized = true;
}

export function identifyUser(uid: string) {
  if (!initialized) return;
  posthog.identify(uid);
}

export function resetAnalytics() {
  if (!initialized) return;
  posthog.reset();
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (!initialized) return;
  posthog.capture(event, properties);
}
