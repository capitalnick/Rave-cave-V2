/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '%%FIREBASE_API_KEY%%',
  authDomain: '%%FIREBASE_AUTH_DOMAIN%%',
  projectId: '%%FIREBASE_PROJECT_ID%%',
  storageBucket: '%%FIREBASE_STORAGE_BUCKET%%',
  messagingSenderId: '%%FIREBASE_MESSAGING_SENDER_ID%%',
  appId: '%%FIREBASE_APP_ID%%',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Rave Cave';
  const options = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const wineId = event.notification.data?.wineId;
  const url = wineId ? `/?wine=${wineId}` : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
