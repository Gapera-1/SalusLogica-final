/* eslint-disable no-undef */
/**
 * Firebase Messaging Service Worker for SalusLogica.
 *
 * This file MUST be served from the root of the domain (e.g. /firebase-messaging-sw.js).
 * Vite serves files from public/ at the root during dev and copies them to dist/ on build.
 *
 * The Firebase config is passed dynamically from the main app via a MessageChannel
 * when the service worker is first activated.  This avoids hardcoding credentials.
 * As a fallback it also accepts hardcoded values if you prefer that approach.
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

let messaging = null;

/**
 * Initialise Firebase lazily.  Called either when the main thread sends config
 * via postMessage, or when a push event arrives (using whatever config is available).
 */
function initFirebase(config) {
  if (messaging) return; // already initialised
  if (!config || !config.apiKey) return;

  firebase.initializeApp(config);
  messaging = firebase.messaging();
  console.log('[SW] Firebase initialised');
}

// Listen for config from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initFirebase(event.data.config);
  }
});

// Handle background messages (when the app/tab is not in focus).
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'SalusLogica';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type || 'default',
    requireInteraction: true,
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click – open the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if ('focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow('/dashboard');
        }
      })
  );
});
