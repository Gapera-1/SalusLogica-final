import { useState, useEffect, useCallback, useRef } from 'react';
import { requestFCMToken, onForegroundMessage, hasConfig } from '../firebase';
import { notificationAPI } from '../services/api';

/**
 * Custom hook for managing Firebase Cloud Messaging push notifications.
 *
 * Provides:
 * - pushSupported: whether FCM is available in this browser
 * - pushEnabled:   whether the user has granted permission & token is registered
 * - enabling:      loading state while requesting permission
 * - enablePush():  request permission → get token → register with backend
 * - disablePush(): unregister the token from the backend
 * - sendTestPush(): send a test notification via the backend
 * - foregroundPayload: the most recent foreground message payload
 */
export default function usePushNotifications() {
  const [pushSupported, setPushSupported] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [foregroundPayload, setForegroundPayload] = useState(null);
  const tokenRef = useRef(null);
  const unsubFgRef = useRef(null);

  // ── Check support on mount ──
  useEffect(() => {
    const check = async () => {
      if (!hasConfig) { setPushSupported(false); return; }
      if (!('Notification' in window)) { setPushSupported(false); return; }
      if (!('serviceWorker' in navigator)) { setPushSupported(false); return; }

      try {
        const { isSupported } = await import('firebase/messaging');
        const ok = await isSupported();
        setPushSupported(ok);

        // If permission was previously granted, try to restore the token
        if (ok && Notification.permission === 'granted') {
          const token = await requestFCMToken();
          if (token) {
            tokenRef.current = token;
            // Re-register (upsert) so the backend knows the device is still alive
            try {
              await notificationAPI.registerDevice(token, 'web');
            } catch { /* backend might be down, that's ok */ }
            setPushEnabled(true);
            // Start listening for foreground messages
            setupForegroundListener();
          }
        }
      } catch {
        setPushSupported(false);
      }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setupForegroundListener = useCallback(async () => {
    if (unsubFgRef.current) return; // already listening
    const unsub = await onForegroundMessage((payload) => {
      console.log('[Push] Foreground message:', payload);
      setForegroundPayload(payload);

      // Also show a browser notification so the user notices
      if (Notification.permission === 'granted' && payload.notification) {
        new Notification(payload.notification.title || 'SalusLogica', {
          body: payload.notification.body,
          icon: '/favicon.ico',
          tag: payload.data?.type || 'foreground',
        });
      }
    });
    unsubFgRef.current = unsub;
  }, []);

  // ── Enable push ──
  const enablePush = useCallback(async () => {
    setEnabling(true);
    try {
      const token = await requestFCMToken();
      if (!token) {
        setEnabling(false);
        return false;
      }

      tokenRef.current = token;
      await notificationAPI.registerDevice(token, 'web');
      setPushEnabled(true);
      setupForegroundListener();
      return true;
    } catch (err) {
      console.error('[Push] enablePush failed:', err);
      return false;
    } finally {
      setEnabling(false);
    }
  }, [setupForegroundListener]);

  // ── Disable push ──
  const disablePush = useCallback(async () => {
    if (tokenRef.current) {
      try {
        await notificationAPI.unregisterDevice(tokenRef.current);
      } catch (err) {
        console.error('[Push] unregister failed:', err);
      }
    }
    tokenRef.current = null;
    setPushEnabled(false);
    if (unsubFgRef.current) {
      unsubFgRef.current();
      unsubFgRef.current = null;
    }
  }, []);

  // ── Test push ──
  const sendTestPush = useCallback(async () => {
    try {
      return await notificationAPI.sendTestPush();
    } catch (err) {
      console.error('[Push] test push failed:', err);
      return null;
    }
  }, []);

  return {
    pushSupported,
    pushEnabled,
    enabling,
    enablePush,
    disablePush,
    sendTestPush,
    foregroundPayload,
  };
}
