import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { alarmAPI, medicineAPI, doseAPI } from '../services/api';
import { Platform, Vibration, AppState } from 'react-native';

// Storage keys
const STORAGE_KEYS = {
  CACHED_MEDICINES: '@alarms/cached_medicines',
  SCHEDULED_ALARMS: '@alarms/scheduled_alarms',
  PENDING_ACTIONS: '@alarms/pending_actions',
  TAKEN_DOSES: '@alarms/taken_doses',
  LAST_SYNC: '@alarms/last_sync',
};

/**
 * Notification Channel Setup for Android
 */
if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
  Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    sound: true,
  });

  Notifications.setNotificationChannelAsync('alarms', {
    name: 'Medicine Alarms',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 500, 500],
    lightColor: '#FF0000',
    sound: true,
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

const AlarmContext = createContext(null);

export const useAlarm = () => {
  const context = useContext(AlarmContext);
  if (!context) {
    throw new Error('useAlarm must be used within an AlarmProvider');
  }
  return context;
};

export const AlarmProvider = ({ children }) => {
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [currentAlarm, setCurrentAlarm] = useState(null);
  const [isAlarmModalVisible, setIsAlarmModalVisible] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [cachedMedicines, setCachedMedicines] = useState([]);
  
  const pollingIntervalRef = useRef(null);
  const lastCheckedAlarmsRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const notificationListenerRef = useRef(null);
  const responseListenerRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const repeatIntervalRef = useRef(null);
  const autoRepeatIntervalRef = useRef(null);
  const currentAlarmRepeatCountRef = useRef(0);
  const lastAlarmTriggeredAtRef = useRef(null);

  // ==================== STORAGE FUNCTIONS ====================

  /**
   * Save data to AsyncStorage
   */
  const saveToStorage = useCallback(async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to ${key}:`, error);
    }
  }, []);

  /**
   * Load data from AsyncStorage
   */
  const loadFromStorage = useCallback(async (key, defaultValue = null) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading from ${key}:`, error);
      return defaultValue;
    }
  }, []);

  /**
   * Cache medicines locally for offline access
   */
  const cacheMedicines = useCallback(async (medicines) => {
    await saveToStorage(STORAGE_KEYS.CACHED_MEDICINES, medicines);
    setCachedMedicines(medicines);
  }, [saveToStorage]);

  /**
   * Load cached medicines
   */
  const loadCachedMedicines = useCallback(async () => {
    const medicines = await loadFromStorage(STORAGE_KEYS.CACHED_MEDICINES, []);
    setCachedMedicines(medicines);
    return medicines;
  }, [loadFromStorage]);

  /**
   * Queue an action for later sync when offline
   */
  const queuePendingAction = useCallback(async (action) => {
    const pending = await loadFromStorage(STORAGE_KEYS.PENDING_ACTIONS, []);
    pending.push({
      ...action,
      timestamp: new Date().toISOString(),
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    await saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, pending);
  }, [loadFromStorage, saveToStorage]);

  /**
   * Process pending actions when back online
   */
  const syncPendingActions = useCallback(async () => {
    const pending = await loadFromStorage(STORAGE_KEYS.PENDING_ACTIONS, []);
    if (pending.length === 0) return;

    const remaining = [];
    
    for (const action of pending) {
      try {
        switch (action.type) {
          case 'MARK_TAKEN':
            // For each dose log, call backend mark_taken which also updates stock
            if (action.doseLogIds?.length > 0) {
              for (const id of action.doseLogIds) {
                try {
                  await doseAPI.markTaken(id);
                } catch (err) {
                  console.error('Error syncing MARK_TAKEN for dose', id, err);
                  throw err;
                }
              }
            }
            break;
          case 'DISMISS':
            if (action.alarmId) {
              await alarmAPI.dismiss(action.alarmId);
            }
            break;
          case 'SNOOZE':
            if (action.alarmId) {
              await alarmAPI.snooze(action.alarmId, action.minutes || 5);
            }
            break;
        }
      } catch (error) {
        console.error('Error syncing action:', error);
        remaining.push(action); // Keep failed actions for retry
      }
    }

    await saveToStorage(STORAGE_KEYS.PENDING_ACTIONS, remaining);
  }, [loadFromStorage, saveToStorage]);

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

      const granted = finalStatus === 'granted';
      setNotificationPermission(granted);

      if (!granted) {
        console.warn('Notification permission denied');
      }

      return granted;
    } catch (error) {
      console.error('Error initializing notifications:', error);
      return false;
    }
  }, []);

  /**
   * Schedule a notification for a specific time (works offline)
   */
  const scheduleNotificationForTime = useCallback(async (medicine, scheduledTime) => {
    try {
      const now = new Date();
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      
      // Create trigger time for today
      const triggerDate = new Date();
      triggerDate.setHours(hours, minutes, 0, 0);
      
      // If time has passed today, schedule for tomorrow
      if (triggerDate <= now) {
        triggerDate.setDate(triggerDate.getDate() + 1);
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Medicine Reminder',
          body: `Time to take: ${medicine.name}`,
          data: { 
            medicine,
            scheduledTime,
            offlineAlarm: true,
          },
          badge: 1,
          sound: true,
          priority: 'max',
        },
        trigger: {
          date: triggerDate,
          channelId: 'alarms',
        },
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }, []);

  /**
   * Schedule notifications for all medicines (offline-capable)
   */
  const scheduleAllNotifications = useCallback(async (medicines) => {
    // Cancel existing scheduled notifications first
    await Notifications.cancelAllScheduledNotificationsAsync();

    const scheduledAlarms = [];

    for (const medicine of medicines) {
      if (!medicine.reminder_enabled || !medicine.reminder_times) continue;

      // Handle different reminder_times formats
      let times = [];
      if (Array.isArray(medicine.reminder_times)) {
        times = medicine.reminder_times;
      } else if (typeof medicine.reminder_times === 'string') {
        times = medicine.reminder_times.split(',').map(t => t.trim());
      }

      for (const time of times) {
        const notificationId = await scheduleNotificationForTime(medicine, time);
        if (notificationId) {
          scheduledAlarms.push({
            notificationId,
            medicineId: medicine.id,
            medicineName: medicine.name,
            time,
            dosage: medicine.dosage,
            doseAmount: medicine.dose_amount || 1,
          });
        }
      }
    }

    await saveToStorage(STORAGE_KEYS.SCHEDULED_ALARMS, scheduledAlarms);
    console.log(`Scheduled ${scheduledAlarms.length} offline notifications`);
    
    return scheduledAlarms;
  }, [scheduleNotificationForTime, saveToStorage]);

  /**
   * Send immediate notification
   */
  const sendImmediateNotification = useCallback(async (alarm) => {
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
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  /**
   * Text-to-speech announcement
   */
  const announceAlarm = useCallback(async (medicines) => {
    if (isSpeakingRef.current) {
      await Speech.stop();
    }

    try {
      isSpeakingRef.current = true;
      
      let medicineNames;
      if (Array.isArray(medicines)) {
        medicineNames = medicines.map(m => m.name).join(', and ') || 'your medicine';
      } else if (medicines?.name) {
        medicineNames = medicines.name;
      } else {
        medicineNames = 'your medicine';
      }
      
      const announcement = `It's time to take your medicine. Please take ${medicineNames}.`;

      await Speech.speak(announcement, {
        language: 'en',
        rate: 0.85,
        pitch: 1.0,
        onDone: () => {
          isSpeakingRef.current = false;
        },
        onError: () => {
          isSpeakingRef.current = false;
        },
      });
    } catch (error) {
      console.error('Error announcing alarm:', error);
      isSpeakingRef.current = false;
    }
  }, []);

  /**
   * Stop speech
   */
  const stopSpeech = useCallback(async () => {
    try {
      await Speech.stop();
      isSpeakingRef.current = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }, []);

  /**
   * Trigger vibration pattern
   */
  const triggerVibration = useCallback(() => {
    Vibration.vibrate([0, 500, 200, 500, 200, 500], false);
  }, []);

  /**
   * Show alarm modal with TTS and vibration
   */
  const triggerAlarmUI = useCallback(async (alarm) => {
    setCurrentAlarm(alarm);
    setIsAlarmModalVisible(true);
    
    // Track when alarm was triggered
    lastAlarmTriggeredAtRef.current = Date.now();
    currentAlarmRepeatCountRef.current = 0;
    
    // Trigger vibration
    triggerVibration();
    
    // Announce the alarm
    await announceAlarm(alarm.medicines || alarm.medicine);
    
    // Send immediate notification if not from scheduled notification
    if (!alarm.fromNotification) {
      await sendImmediateNotification(alarm);
    }
    
    // Start auto-repeat every 10 seconds until user interacts
    startAutoRepeatAlarm(alarm);
  }, [announceAlarm, triggerVibration, sendImmediateNotification]);

  /**
   * Start auto-repeat alarm every 10 seconds
   * Repeats until user marks as taken, snoozes, or dismisses
   */
  const startAutoRepeatAlarm = useCallback((alarm) => {
    // Clear any existing auto-repeat
    if (autoRepeatIntervalRef.current) {
      clearInterval(autoRepeatIntervalRef.current);
      autoRepeatIntervalRef.current = null;
    }
    
    // Start new auto-repeat interval (every 10 seconds)
    autoRepeatIntervalRef.current = setInterval(async () => {
      // Check if alarm modal is still visible (user hasn't interacted)
      if (!isAlarmModalVisible || !currentAlarm) {
        // User has interacted, stop repeating
        stopAutoRepeatAlarm();
        return;
      }
      
      // Increment repeat count
      currentAlarmRepeatCountRef.current += 1;
      
      // Max 30 repeats (5 minutes) to avoid infinite loop
      if (currentAlarmRepeatCountRef.current >= 30) {
        console.log('Auto-repeat max count reached (5 minutes), stopping');
        stopAutoRepeatAlarm();
        return;
      }
      
      console.log(`Auto-repeat alarm #${currentAlarmRepeatCountRef.current}`);
      
      // Trigger vibration
      triggerVibration();
      
      // Re-announce the alarm
      await announceAlarm(alarm.medicines || alarm.medicine);
      
      // Send urgent repeat notification
      await sendRepeatNotification(alarm, currentAlarmRepeatCountRef.current);
    }, 10000); // 10 seconds
  }, [isAlarmModalVisible, currentAlarm, triggerVibration, announceAlarm]);

  /**
   * Stop auto-repeat alarm
   */
  const stopAutoRepeatAlarm = useCallback(() => {
    if (autoRepeatIntervalRef.current) {
      clearInterval(autoRepeatIntervalRef.current);
      autoRepeatIntervalRef.current = null;
    }
    currentAlarmRepeatCountRef.current = 0;
    lastAlarmTriggeredAtRef.current = null;
  }, []);

  /**
   * Send repeat notification (more urgent)
   */
  const sendRepeatNotification = useCallback(async (alarm, repeatCount) => {
    try {
      const medicineNames = alarm.medicines?.map(m => m.name).join(', ') || 'Medicine';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ URGENT: Medicine Reminder (${repeatCount})`,
          body: `Time to take: ${medicineNames} - Please take your medicine now!`,
          data: { 
            alarm,
            isRepeat: true,
            repeatCount,
          },
          badge: 1,
          sound: true,
          priority: 'max',
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending repeat notification:', error);
    }
  }, []);

  /**
   * Handle notification response (when user taps notification)
   */
  const handleNotificationResponse = useCallback(async (response) => {
    const data = response.notification.request.content.data;
    
    if (data.offlineAlarm && data.medicine) {
      // Offline scheduled notification
      const alarm = {
        id: `offline_${Date.now()}`,
        medicines: [data.medicine],
        scheduled_time: data.scheduledTime,
        fromNotification: true,
      };
      await triggerAlarmUI(alarm);
    } else if (data.alarm) {
      // Online alarm from backend
      await triggerAlarmUI({ ...data.alarm, fromNotification: true });
    }
  }, [triggerAlarmUI]);

  /**
   * Handle foreground notification
   */
  const handleForegroundNotification = useCallback(async (notification) => {
    const data = notification.request.content.data;
    
    if (data.offlineAlarm && data.medicine) {
      const alarm = {
        id: `offline_${Date.now()}`,
        medicines: [data.medicine],
        scheduled_time: data.scheduledTime,
        fromNotification: true,
      };
      await triggerAlarmUI(alarm);
    }
  }, [triggerAlarmUI]);

  /**
   * Fetch medicines and sync
   */
  const syncMedicines = useCallback(async () => {
    try {
      const medicines = await medicineAPI.getAll();
      if (medicines && Array.isArray(medicines)) {
        await cacheMedicines(medicines);
        await scheduleAllNotifications(medicines);
        return medicines;
      }
    } catch (error) {
      console.error('Error syncing medicines:', error);
    }
    return null;
  }, [cacheMedicines, scheduleAllNotifications]);

  /**
   * Update medicines cache from external source (e.g., DataSyncContext)
   * This allows sync without re-fetching from API
   */
  const updateMedicinesFromSync = useCallback(async (medicines) => {
    if (medicines && Array.isArray(medicines)) {
      await cacheMedicines(medicines);
      await scheduleAllNotifications(medicines);
      console.log('AlarmContext: Updated medicines from sync, rescheduled notifications');
    }
  }, [cacheMedicines, scheduleAllNotifications]);

  /**
   * Fetch active alarms from backend (when online)
   */
  const checkAlarmsOnline = useCallback(async () => {
    try {
      const response = await alarmAPI.getActive();
      
      if (response.active_alarms && Array.isArray(response.active_alarms)) {
        const newAlarms = response.active_alarms;

        const previousAlarmIds = lastCheckedAlarmsRef.current.map(a => a.id);
        const addedAlarms = newAlarms.filter(a => !previousAlarmIds.includes(a.id));

        setActiveAlarms(newAlarms);
        lastCheckedAlarmsRef.current = newAlarms;

        if (addedAlarms.length > 0 && !isAlarmModalVisible) {
          await triggerAlarmUI(addedAlarms[0]);
        }
      }
    } catch (error) {
      console.error('Error checking online alarms:', error);
    }
  }, [triggerAlarmUI, isAlarmModalVisible]);

  /**
   * Check for alarms locally (when offline)
   */
  const checkAlarmsOffline = useCallback(async () => {
    const medicines = cachedMedicines.length > 0 
      ? cachedMedicines 
      : await loadCachedMedicines();

    if (!medicines || medicines.length === 0) return;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Get taken doses for today
    const takenDoses = await loadFromStorage(STORAGE_KEYS.TAKEN_DOSES, {});
    const today = now.toDateString();
    const takenToday = takenDoses[today] || [];

    for (const medicine of medicines) {
      if (!medicine.reminder_enabled || !medicine.reminder_times) continue;

      let times = [];
      if (Array.isArray(medicine.reminder_times)) {
        times = medicine.reminder_times;
      } else if (typeof medicine.reminder_times === 'string') {
        times = medicine.reminder_times.split(',').map(t => t.trim());
      }

      for (const time of times) {
        const doseKey = `${medicine.id}_${time}`;
        
        // Check if this dose is due (within 1 minute window) and not already taken
        if (time === currentTime && !takenToday.includes(doseKey)) {
          const alarm = {
            id: `offline_${medicine.id}_${time}`,
            medicines: [{
              id: medicine.id,
              name: medicine.name,
              dosage: medicine.dosage,
              dose_amount: medicine.dose_amount || 1,
              unit: medicine.unit,
            }],
            scheduled_time: time,
          };

          if (!isAlarmModalVisible) {
            await triggerAlarmUI(alarm);
          }
          break;
        }
      }
    }
  }, [cachedMedicines, loadCachedMedicines, loadFromStorage, isAlarmModalVisible, triggerAlarmUI]);

  /**
   * Main alarm check function (handles both online and offline)
   */
  const checkAlarms = useCallback(async () => {
    if (isOnline) {
      await checkAlarmsOnline();
    } else {
      await checkAlarmsOffline();
    }
  }, [isOnline, checkAlarmsOnline, checkAlarmsOffline]);

  /**
   * Start polling for alarms
   */
  const startPolling = useCallback(() => {
    if (isPolling) return;

    setIsPolling(true);
    console.log('Starting alarm polling (every 30 seconds)');

    // Check immediately
    checkAlarms();

    // Set up interval (check every 30 seconds)
    pollingIntervalRef.current = setInterval(() => {
      checkAlarms();
    }, 30000);
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
   * Mark dose as taken - works offline
   */
  const markDoseTaken = useCallback(async (alarm) => {
    try {
      const medicinesInAlarm = alarm.medicines || [];

      // Collect dose log IDs (for backend) – support both dose_log_id and id
      const doseLogIds = medicinesInAlarm
        .map(med => med.dose_log_id || med.id)
        .filter(Boolean);

      const stockUpdates = [];

      // Calculate local stock updates for cached medicines (for UI/offline)
      for (const medicine of medicinesInAlarm) {
        if (!medicine.id) continue;

        // Find cached medicine to get current stock
        const cached = cachedMedicines.find(m => m.id === medicine.id);
        if (!cached) continue;

        // Determine current stock from server-aligned fields
        const currentStock =
          typeof cached.stock_count === 'number'
            ? cached.stock_count
            : typeof cached.stock === 'number'
            ? cached.stock
            : typeof cached.current_stock === 'number'
            ? cached.current_stock
            : null;

        if (currentStock == null) continue;

        // Determine dose quantity:
        // 1) Prefer explicit dose_amount if present
        // 2) Fallback: parse first integer from dosage text (e.g. "2 tablets")
        let doseQuantity = medicine.dose_amount;

        if (!doseQuantity) {
          const dosageText = medicine.dosage || cached.dosage || '';
          try {
            const match = dosageText.match(/(\d+)/);
            if (match) {
              const parsed = parseInt(match[1], 10);
              if (!Number.isNaN(parsed) && parsed > 0) {
                doseQuantity = parsed;
              }
            }
          } catch (e) {
            console.warn('Failed to parse dose quantity from dosage text:', e);
          }
        }

        if (!doseQuantity || doseQuantity <= 0) {
          doseQuantity = 1;
        }

        const newStock = Math.max(0, currentStock - doseQuantity);

        stockUpdates.push({
          medicineId: medicine.id,
          newStock,
        });
      }

      // Record taken dose locally
      const takenDoses = await loadFromStorage(STORAGE_KEYS.TAKEN_DOSES, {});
      const today = new Date().toDateString();
      if (!takenDoses[today]) takenDoses[today] = [];
      
      for (const med of (alarm.medicines || [])) {
        const time = alarm.scheduled_time || new Date().toTimeString().slice(0, 5);
        takenDoses[today].push(`${med.id}_${time}`);
      }
      await saveToStorage(STORAGE_KEYS.TAKEN_DOSES, takenDoses);

      // Update cached medicines with new stock
      if (stockUpdates.length > 0) {
        const updatedMedicines = cachedMedicines.map(med => {
          const update = stockUpdates.find(u => u.medicineId === med.id);
          return update
            ? {
                ...med,
                stock_count: update.newStock,
              }
            : med;
        });
        await cacheMedicines(updatedMedicines);
      }

      if (isOnline) {
        // Online: call backend per-dose endpoint which also updates stock
        if (doseLogIds.length > 0) {
          await Promise.all(
            doseLogIds.map(async (id) => {
              try {
                await doseAPI.markTaken(id);
              } catch (err) {
                console.error('Error marking dose taken on backend for id', id, err);
                throw err;
              }
            })
          );
        }
      } else {
        // Queue for later sync when offline
        await queuePendingAction({
          type: 'MARK_TAKEN',
          doseLogIds,
          alarmId: alarm.id,
        });
      }

      // Stop auto-repeat alarm
      stopAutoRepeatAlarm();

      // Close modal
      await stopSpeech();
      setIsAlarmModalVisible(false);
      setCurrentAlarm(null);

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
  }, [isOnline, cachedMedicines, loadFromStorage, saveToStorage, cacheMedicines, queuePendingAction, stopSpeech, checkAlarms, stopAutoRepeatAlarm]);

  /**
   * Dismiss alarm - works offline
   */
  const dismissAlarm = useCallback(async (alarm) => {
    try {
      if (isOnline && alarm?.id && !alarm.id.startsWith('offline_')) {
        await alarmAPI.dismiss(alarm.id);
      } else if (!isOnline && alarm?.id && !alarm.id.startsWith('offline_')) {
        await queuePendingAction({
          type: 'DISMISS',
          alarmId: alarm.id,
        });
      }

      // Stop auto-repeat alarm
      stopAutoRepeatAlarm();

      await stopSpeech();
      setIsAlarmModalVisible(false);
      setCurrentAlarm(null);
      await checkAlarms();

      return { success: true };
    } catch (error) {
      console.error('Error dismissing alarm:', error);
      return {
        success: false,
        error: error.message || 'Failed to dismiss alarm',
      };
    }
  }, [isOnline, queuePendingAction, stopSpeech, checkAlarms, stopAutoRepeatAlarm]);

  /**
   * Snooze alarm - works offline
   */
  const snoozeAlarm = useCallback(async (alarm, minutes = 5) => {
    try {
      // Schedule a local notification for snooze time
      const snoozeTime = new Date(Date.now() + minutes * 60 * 1000);
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💊 Snoozed Reminder',
          body: `Time to take: ${alarm.medicines?.map(m => m.name).join(', ') || 'Medicine'}`,
          data: { 
            alarm,
            snoozed: true,
          },
          badge: 1,
          sound: true,
          priority: 'max',
        },
        trigger: {
          date: snoozeTime,
          channelId: 'alarms',
        },
      });

      if (isOnline && alarm?.id && !alarm.id.startsWith('offline_')) {
        await alarmAPI.snooze(alarm.id, minutes);
      } else if (!isOnline && alarm?.id && !alarm.id.startsWith('offline_')) {
        await queuePendingAction({
          type: 'SNOOZE',
          alarmId: alarm.id,
          minutes,
        });
      }

      // Stop auto-repeat alarm
      stopAutoRepeatAlarm();

      await stopSpeech();
      setIsAlarmModalVisible(false);
      setCurrentAlarm(null);
      await checkAlarms();

      return { success: true };
    } catch (error) {
      console.error('Error snoozing alarm:', error);
      return {
        success: false,
        error: error.message || 'Failed to snooze alarm',
      };
    }
  }, [isOnline, queuePendingAction, stopSpeech, checkAlarms, stopAutoRepeatAlarm]);

  /**
   * Repeat announcement
   */
  const repeatAnnouncement = useCallback(async () => {
    if (currentAlarm) {
      await announceAlarm(currentAlarm.medicines);
    }
  }, [currentAlarm, announceAlarm]);

  /**
   * Handle network state changes
   */
  const handleNetworkChange = useCallback(async (state) => {
    const wasOffline = !isOnline;
    const nowOnline = state.isConnected && state.isInternetReachable;
    
    setIsOnline(nowOnline);

    if (wasOffline && nowOnline) {
      console.log('Back online - syncing pending actions');
      await syncPendingActions();
      await syncMedicines();
    }
  }, [isOnline, syncPendingActions, syncMedicines]);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback(async (nextAppState) => {
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground
      if (isOnline) {
        await syncPendingActions();
        await checkAlarms();
      }
    }
    appStateRef.current = nextAppState;
  }, [isOnline, syncPendingActions, checkAlarms]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // Initialize notifications
      const granted = await initializeNotifications();
      
      // Load cached medicines
      await loadCachedMedicines();

      // Check network state
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected && netState.isInternetReachable);

      if (granted && isMounted) {
        // Sync medicines and schedule notifications
        if (netState.isConnected) {
          await syncMedicines();
          await syncPendingActions();
        }
        
        // Start polling
        startPolling();
      }
    };

    initialize();

    // Network listener
    const unsubscribeNetwork = NetInfo.addEventListener(handleNetworkChange);

    // App state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Notification listeners
    notificationListenerRef.current = Notifications.addNotificationReceivedListener(handleForegroundNotification);
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    // Cleanup
    return () => {
      isMounted = false;
      stopPolling();
      stopSpeech();
      unsubscribeNetwork();
      appStateSubscription.remove();
      
      if (notificationListenerRef.current) {
        Notifications.removeNotificationSubscription(notificationListenerRef.current);
      }
      if (responseListenerRef.current) {
        Notifications.removeNotificationSubscription(responseListenerRef.current);
      }
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
        repeatIntervalRef.current = null;
      }
      if (autoRepeatIntervalRef.current) {
        clearInterval(autoRepeatIntervalRef.current);
        autoRepeatIntervalRef.current = null;
      }
    };
  }, []);

  /**
   * Repeat alarm announcement every 10 seconds while an alarm is active
   */
  useEffect(() => {
    if (currentAlarm && isAlarmModalVisible) {
      // Start or reset 10-second repeat
      if (repeatIntervalRef.current) {
        clearInterval(repeatIntervalRef.current);
      }
      repeatIntervalRef.current = setInterval(() => {
        repeatAnnouncement();
      }, 10000);
    } else if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  }, [currentAlarm, isAlarmModalVisible, repeatAnnouncement]);

  const value = {
    activeAlarms,
    currentAlarm,
    isAlarmModalVisible,
    isPolling,
    notificationPermission,
    isOnline,
    cachedMedicines,
    startPolling,
    stopPolling,
    checkAlarms,
    markDoseTaken,
    dismissAlarm,
    snoozeAlarm,
    setIsAlarmModalVisible,
    repeatAnnouncement,
    stopSpeech,
    syncMedicines,
    updateMedicinesFromSync,
    scheduleAllNotifications,
  };

  return (
    <AlarmContext.Provider value={value}>
      {children}
    </AlarmContext.Provider>
  );
};

export default AlarmContext;
