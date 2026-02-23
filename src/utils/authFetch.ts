import { auth } from '@/firebase';

export class RateLimitError extends Error {
  constructor() {
    super('You are making requests too quickly. Please try again in a minute.');
    this.name = 'RateLimitError';
  }
}

/**
 * Wrapper around fetch() that adds a Firebase Auth Bearer token.
 * Use for ALL Cloud Function calls.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : options.headers),
      'Authorization': `Bearer ${token}`,
    },
  });
  if (res.status === 429) throw new RateLimitError();
  return res;
}
