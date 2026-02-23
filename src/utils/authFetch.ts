import { auth } from '@/firebase';

/**
 * Wrapper around fetch() that adds a Firebase Auth Bearer token.
 * Use for ALL Cloud Function calls.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('Not authenticated');
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers instanceof Headers
        ? Object.fromEntries(options.headers.entries())
        : options.headers),
      'Authorization': `Bearer ${token}`,
    },
  });
}
