/**
 * Firebase configuration for SalusLogica.
 *
 * HOW TO SET UP:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a project (or use the existing one that has the service account)
 * 3. Enable Cloud Messaging (FCM)
 * 4. Go to Project Settings → General → Your apps → Add web app
 * 5. Copy the config values into your .env file (see below)
 * 6. Go to Project Settings → Cloud Messaging → Web Push certificates
 *    → Generate key pair → copy the public key as VITE_FIREBASE_VAPID_KEY
 *
 * Required environment variables in medicine-reminder/.env:
 *   VITE_FIREBASE_API_KEY=...
 *   VITE_FIREBASE_AUTH_DOMAIN=...
 *   VITE_FIREBASE_PROJECT_ID=...
 *   VITE_FIREBASE_STORAGE_BUCKET=...
 *   VITE_FIREBASE_MESSAGING_SENDER_ID=...
 *   VITE_FIREBASE_APP_ID=...
 *   VITE_FIREBASE_VAPID_KEY=...
 */

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

// Only initialise if config looks valid
const hasConfig = firebaseConfig.apiKey && firebaseConfig.projectId;

let app = null;
let messaging = null;

/**
 * Lazily initialise Firebase + Messaging.
 * Returns null when FCM is not supported or not configured.
 */
export async function getFirebaseMessaging() {
  if (messaging) return messaging;
  if (!hasConfig) {
    console.warn('[Firebase] No config – push notifications disabled');
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging not supported in this browser');
    return null;
  }

  app = app || initializeApp(firebaseConfig);
  messaging = getMessaging(app);
  return messaging;
}

/**
 * Request notification permission and return the FCM registration token.
 * Returns null if permission is denied or FCM not available.
 */
export async function requestFCMToken() {
  const msg = await getFirebaseMessaging();
  if (!msg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.info('[Firebase] Notification permission denied');
    return null;
  }

  try {
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js'
    );

    // Send Firebase config to the service worker so it can initialise
    if (swRegistration.active) {
      swRegistration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
    }
    // Also send when it activates later
    navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig,
      });
    });

    const token = await getToken(msg, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    console.info('[Firebase] FCM token obtained');
    return token;
  } catch (err) {
    console.error('[Firebase] Failed to get FCM token:', err);
    return null;
  }
}

/**
 * Subscribe to foreground messages.
 * @param {(payload: object) => void} callback
 * @returns {() => void} unsubscribe function, or noop
 */
export async function onForegroundMessage(callback) {
  const msg = await getFirebaseMessaging();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}

export { VAPID_KEY, hasConfig };
