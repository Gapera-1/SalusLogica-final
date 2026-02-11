import { useState, useEffect, useCallback, useRef } from 'react';
import { alarmAPI } from '../services/api';
import useWebSocket from './useWebSocket';

const useAlarmManager = () => {
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);

  const intervalRef = useRef(null);
  const notifiedAlarmsRef = useRef(new Set());

  // WebSocket connection - COMPLETELY DISABLED
  const wsUrl = null; // Completely disabled to prevent connection errors
  // const wsUrl =
  //   import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/alarms/';

  const { lastMessage } = useWebSocket(false ? wsUrl : null); // Only connect if explicitly enabled

  // =============================
  // Handle WebSocket Messages
  // =============================
  useEffect(() => {
    if (!lastMessage) return;

    switch (lastMessage.type) {
      case 'alarm_triggered':
        handleIncomingAlarm(lastMessage.payload);
        break;

      case 'alarm_dismissed':
      case 'alarm_taken':
        setActiveAlarms((prev) =>
          prev.filter(
            (alarm) => alarm.group_id !== lastMessage.payload.group_id
          )
        );
        break;

      default:
        console.log('Unknown WS message:', lastMessage.type);
    }
  }, [lastMessage]);

  // =============================
  // Prevent Duplicate Notifications
  // =============================
  const handleIncomingAlarm = useCallback((alarm) => {
    setActiveAlarms((prev) => {
      const exists = prev.find((a) => a.group_id === alarm.group_id);
      if (!exists) {
        triggerNotificationOnce(alarm);
        return [...prev, alarm];
      }
      return prev;
    });
  }, []);

  const triggerNotificationOnce = (alarm) => {
    if (notifiedAlarmsRef.current.has(alarm.group_id)) return;

    notifiedAlarmsRef.current.add(alarm.group_id);
    showAlarmNotification(alarm);
  };

  // =============================
  // Notifications
  // =============================
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return false;

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return Notification.permission === 'granted';
  };

  const showBrowserNotification = (title, body, options = {}) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: options.tag || 'medicine-reminder',
        requireInteraction: true,
        ...options,
      });

      setTimeout(() => notification.close(), 10000);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  };

  const speakAlarm = (text) => {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.volume = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const playAlarmSound = () => {
    try {
      const audioContext =
        new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.warn('Audio failed:', err);
    }
  };

  const showAlarmNotification = (alarm) => {
    const medicineNames = alarm.medicines
      ?.map((m) => m.name)
      .join(', ') || 'your medicine';

    showBrowserNotification(
      'Medicine Reminder',
      `Time to take ${medicineNames}`,
      {
        tag: `alarm-${alarm.group_id}`,
      }
    );

    speakAlarm(`Please take ${medicineNames}`);
    playAlarmSound();
  };

  // =============================
  // Polling Fallback
  // =============================
  const checkActiveAlarms = useCallback(async () => {
    try {
      const alarms = await alarmAPI.getActive();
      setLastCheck(new Date());

      alarms.forEach((alarm) => handleIncomingAlarm(alarm));
    } catch (err) {
      console.error('Alarm check failed:', err);
    }
  }, [handleIncomingAlarm]);

  // =============================
  // Controls
  // =============================
  const startListening = useCallback(async () => {
    if (isListening) return;

    await requestNotificationPermission();
    setIsListening(true);

    intervalRef.current = setInterval(checkActiveAlarms, 30000);
    await checkActiveAlarms();
  }, [isListening, checkActiveAlarms]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // =============================
  // Auto Start
  // =============================
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) startListening();

    return () => stopListening();
  }, []);

  return {
    activeAlarms,
    isListening,
    lastCheck,
    checkActiveAlarms,
    markAlarmTaken: (id) => alarmAPI.markGroupTaken(id),
    snoozeAlarm: (id, minutes) => alarmAPI.snooze(id, minutes),
    dismissAlarm: (id) => alarmAPI.dismiss(id),
    startListening,
    stopListening,
  };
};

export default useAlarmManager;
