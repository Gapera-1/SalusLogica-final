import React from 'react';
import useAlarmManager from '../hooks/useAlarmManager';
import ActiveAlarm from './ActiveAlarm';

const AlarmContainer = () => {
  const {
    activeAlarms,
    isListening,
    markAlarmTaken,
    snoozeAlarm,
    dismissAlarm
  } = useAlarmManager();

  const handleTake = async (groupId) => {
    try {
      await markAlarmTaken(groupId);
    } catch (error) {
      console.error('Failed to mark alarm as taken:', error);
    }
  };

  const handleSnooze = async (groupId) => {
    try {
      await snoozeAlarm(groupId, 30); // Default 30 minutes
    } catch (error) {
      console.error('Failed to snooze alarm:', error);
    }
  };

  const handleDismiss = async (groupId) => {
    try {
      await dismissAlarm(groupId);
    } catch (error) {
      console.error('Failed to dismiss alarm:', error);
    }
  };

  if (!isListening || activeAlarms.length === 0) {
    return null;
  }

  // Show only the most urgent alarm
  const sortedAlarms = [...activeAlarms].sort((a, b) => {
    // Sort by scheduled time (earliest first)
    return new Date(a.scheduled_time) - new Date(b.scheduled_time);
  });

  const primaryAlarm = sortedAlarms[0];

  return (
    <ActiveAlarm
      alarm={primaryAlarm}
      onTake={handleTake}
      onSnooze={handleSnooze}
      onDismiss={handleDismiss}
    />
  );
};

export default AlarmContainer;
