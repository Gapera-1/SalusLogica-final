import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Audio from 'expo-audio';
import * as Speech from 'expo-speech';
import { alarmAPI } from '../services/api';

/**
 * Notification Channel Setup for Android
 */
if (Notifications.android?.setNotificationChannelAsync) {
  Notifications.android.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: true,
  });

  Notifications.android.setNotificationChannelAsync('alarms', {
    name: 'Medicine Alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 500, 500],
    lightColor: '#FF0000',
    sound: 'alarm',
    bypassDnd: true,
  });
}

/**
 * Configure notification handler
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * useAlarmManager Hook
 * Polls for active alarms and triggers notifications
 * Mirrors web app's useAlarmManager behavior
 */
export const useAlarmManager = () => {
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const soundRef = useRef(null);
  const lastCheckedRef = useRef(null);
  const notificationResponseListener = useRef(null);

  /**
   * Initialize notifications permission
   */
  const initializeNotifications = useCallback(async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission denied');
      }

      // Set up notification response handler
      notificationResponseListener.current = 
        Notifications.addNotificationResponseReceivedListener((response) => {
          console.log('Notification response:', response);
          // Handle notification interaction
          handleNotificationResponse(response);
        });

      return finalStatus === 'granted';
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }, []);

  /**
   * Play alarm sound
   */
  const playAlarmSound = useCallback(async () => {
    try {
      // Prepare audio first
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      // Try to load alarm sound from assets
      // Fallback to default notification sound
      soundRef.current = new Audio.Sound();

      // Use system notification sound
      await soundRef.current.loadAsync(require('../assets/alarm-sound.mp3')).catch(() => {
        console.log('Using default notification sound');
      });

      await soundRef.current.playAsync();

      // Loop the sound for 10 seconds
      setTimeout(() => {
        soundRef.current?.stopAsync();
      }, 10000);
    } catch (error) {
      console.error('Error playing alarm sound:', error);
    }
  }, []);

  /**
   * Text-to-speech announcement
   */
  const announceAlarm = useCallback(async (alarmMessage) => {
    try {
      await Speech.stop();
      await Speech.speak(alarmMessage, {
        language: 'en',
        rate: 0.9,
        pitch: 1.0,
      });
    } catch (error) {
      console.error('Error announcing alarm:', error);
    }
  }, []);

  /**
   * Send local notification
   */
  const sendNotification = useCallback(async (alarm) => {
    try {
      const medicineNames = alarm.medicines?.map(m => m.name).join(', ') || 'Medicine';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medicine Reminder',
          body: `Time to take: ${medicineNames}`,
          data: { alarm },
          badge: 1,
          sound: true,
          priority: 'max',
          autoDismiss: false,
          sticky: true,
        },
        trigger: null, // Show immediately
      });

      // Play alarm sounds
      await playAlarmSound();

      // Announce alarm
      const announcement = `Time to take ${medicineNames}`;
      await announceAlarm(announcement);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [playAlarmSound, announceAlarm]);

  /**
   * Handle notification interaction
   */
  const handleNotificationResponse = useCallback((response) => {
    const { alarm } = response.notification.request.content.data;
    // Trigger callback if provided
    if (onAlarmInteraction) {
      onAlarmInteraction(alarm);
    }
  }, []);

  /**
   * Fetch active alarms from backend
   */
  const checkAlarms = useCallback(async () => {
    try {
      const response = await alarmAPI.getActive();
      
      if (response.active_alarms && Array.isArray(response.active_alarms)) {
        const newAlarms = response.active_alarms;

        // Check if there are new alarms
        const previousAlarmIds = lastCheckedRef.current?.map(a => a.id) || [];
        const newAlarmIds = newAlarms.map(a => a.id);
        const addedAlarms = newAlarms.filter(
          a => !previousAlarmIds.includes(a.id)
        );

        // Update state
        setActiveAlarms(newAlarms);
        lastCheckedRef.current = newAlarms;

        // Send notifications for new alarms
        for (const alarm of addedAlarms) {
          console.log('New alarm detected:', alarm);
          await sendNotification(alarm);
        }
      }
    } catch (error) {
      console.error('Error checking alarms:', error);
    }
  }, [sendNotification]);

  /**
   * Start polling for alarms
   */
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    console.log('Starting alarm polling (every 30 seconds)');

    // Check immediately
    checkAlarms();

    // Set up interval (check every 30 seconds like web app)
    pollingIntervalRef.current = setInterval(() => {
      checkAlarms();
    }, 30000); // 30 seconds
  }, [isPolling, checkAlarms]);

  /**
   * Stop polling for alarms
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsPolling(false);
    console.log('Stopped alarm polling');
  }, []);

  /**
   * Mark dose as taken
   */
  const markDoseTaken = useCallback(async (doseLogIds) => {
    try {
      await alarmAPI.markGroupTaken(doseLogIds);

      // Refresh alarms
      await checkAlarms();

      return { success: true };
    } catch (error) {
      console.error('Error marking dose taken:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark dose as taken',
      };
    }
  }, [checkAlarms]);

  /**
   * Dismiss alarm
   */
  const dismissAlarm = useCallback(async (alarmId) => {
    try {
      await alarmAPI.dismiss(alarmId);

      // Refresh alarms
      await checkAlarms();

      return { success: true };
    } catch (error) {
      console.error('Error dismissing alarm:', error);
      return {
        success: false,
        error: error.message || 'Failed to dismiss alarm',
      };
    }
  }, [checkAlarms]);

  /**
   * Snooze alarm
   */
  const snoozeAlarm = useCallback(async (alarmId, minutes = 5) => {
    try {
      await alarmAPI.snooze(alarmId, minutes);

      // Refresh alarms
      await checkAlarms();

      return { success: true };
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      return {
        success: false,
        error: error.message || 'Failed to snooze alarm',
      };
    }
  }, [checkAlarms]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeNotifications().then((granted) => {
      if (granted) {
        startPolling();
      }
    });

    // Cleanup
    return () => {
      stopPolling();
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
    };
  }, []);

  return {
    activeAlarms,
    isPolling,
    startPolling,
    stopPolling,
    checkAlarms,
    markDoseTaken,
    dismissAlarm,
    snoozeAlarm,
  };
};

export default useAlarmManager;
