import { useState, useEffect, useCallback } from 'react';
import { alarmAPI } from '../services/api';

export const useAlarms = () => {
  const [activeAlarms, setActiveAlarms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get active alarms
  const getActiveAlarms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alarmAPI.getActive();
      setActiveAlarms(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get active alarms:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get alarm details
  const getAlarmDetails = useCallback(async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await alarmAPI.getDetails(groupId);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get alarm details:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark group as taken
  const markGroupTaken = useCallback(async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      await alarmAPI.markGroupTaken(groupId);
      
      // Update local state
      setActiveAlarms(prev => 
        prev.map(alarm => 
          alarm.group_id === groupId 
            ? { ...alarm, status: 'TAKEN', taken_at: new Date().toISOString() }
            : alarm
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark group as taken:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Dismiss alarm
  const dismissAlarm = useCallback(async (groupId) => {
    setLoading(true);
    setError(null);
    try {
      await alarmAPI.dismiss(groupId);
      
      // Update local state
      setActiveAlarms(prev => 
        prev.map(alarm => 
          alarm.group_id === groupId 
            ? { ...alarm, status: 'DISMISSED', dismissed_at: new Date().toISOString() }
            : alarm
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to dismiss alarm:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Snooze alarm
  const snoozeAlarm = useCallback(async (groupId, minutes = 30) => {
    setLoading(true);
    setError(null);
    try {
      await alarmAPI.snooze(groupId, minutes);
      
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      
      // Update local state
      setActiveAlarms(prev => 
        prev.map(alarm => 
          alarm.group_id === groupId 
            ? { 
                ...alarm, 
                status: 'SNOOZED', 
                snoozed_until: snoozeUntil,
                snooze_count: (alarm.snooze_count || 0) + 1 
              }
            : alarm
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to snooze alarm:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check reminders (real-time)
  const checkReminders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alarmAPI.checkReminders();
      
      // Update active alarms with new data
      if (data && data.alarms) {
        setActiveAlarms(data.alarms);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to check reminders:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start real-time alarm checking
  const startRealTimeChecking = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        await checkReminders();
      } catch (error) {
        console.error('Real-time alarm check failed:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkReminders]);

  // Get alarms by status
  const getAlarmsByStatus = useCallback((status) => {
    return activeAlarms.filter(alarm => alarm.status === status);
  }, [activeAlarms]);

  // Get critical alarms (overdue)
  const getCriticalAlarms = useCallback(() => {
    const now = new Date();
    return activeAlarms.filter(alarm => {
      const alarmTime = new Date(alarm.scheduled_time);
      return alarmTime < now && alarm.status !== 'TAKEN';
    });
  }, [activeAlarms]);

  // Get upcoming alarms (next 30 minutes)
  const getUpcomingAlarms = useCallback(() => {
    const now = new Date();
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60 * 1000);
    
    return activeAlarms.filter(alarm => {
      const alarmTime = new Date(alarm.scheduled_time);
      return alarmTime >= now && alarmTime <= thirtyMinutesLater && alarm.status === 'PENDING';
    });
  }, [activeAlarms]);

  // Auto-fetch active alarms on mount
  useEffect(() => {
    getActiveAlarms();
  }, [getActiveAlarms]);

  return {
    activeAlarms,
    loading,
    error,
    getActiveAlarms,
    getAlarmDetails,
    markGroupTaken,
    dismissAlarm,
    snoozeAlarm,
    checkReminders,
    startRealTimeChecking,
    getAlarmsByStatus,
    getCriticalAlarms,
    getUpcomingAlarms,
  };
};
