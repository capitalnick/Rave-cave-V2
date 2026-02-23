import * as Sentry from '@sentry/react';

const DSN = process.env.SENTRY_DSN || '';

export function initSentry() {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.DEV ? 'development' : 'production',
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
  });
}

export function setSentryUser(uid: string | null, email?: string | null) {
  if (!DSN) return;
  if (uid) {
    Sentry.setUser({ id: uid, email: email ?? undefined });
  } else {
    Sentry.setUser(null);
  }
}
