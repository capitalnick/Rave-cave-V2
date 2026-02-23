import { auth } from '@/firebase';

/** Returns the current user's UID. Throws if not authenticated. */
export function requireUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}
