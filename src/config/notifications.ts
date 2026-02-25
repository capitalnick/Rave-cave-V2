import { getMessaging, getToken, onMessage, isSupported, type MessagePayload } from 'firebase/messaging';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { isProd } from '@/config/firebaseConfig';

const VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || '';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  const { getApp } = await import('firebase/app');
  messagingInstance = getMessaging(getApp());
  return messagingInstance;
}

/**
 * Request notification permission and store FCM token for the user.
 * Returns true if permission granted and token stored.
 */
export async function requestNotificationPermission(uid: string): Promise<boolean> {
  if (!VAPID_KEY) return false;

  const messaging = await getMessagingInstance();
  if (!messaging) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) return false;

  // Store token in user's fcmTokens subcollection
  const tokenRef = doc(db, 'users', uid, 'fcmTokens', token);
  await setDoc(tokenRef, { token, createdAt: serverTimestamp() });

  return true;
}

/**
 * Listen for foreground FCM messages. Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void,
): () => void {
  let unsubscribe = () => {};

  getMessagingInstance().then((messaging) => {
    if (!messaging) return;
    unsubscribe = onMessage(messaging, callback);
  });

  return () => unsubscribe();
}

/**
 * Check if notifications are supported and permission is already granted.
 */
export async function getNotificationStatus(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  const supported = await isSupported();
  if (!supported) return 'unsupported';
  return Notification.permission;
}
