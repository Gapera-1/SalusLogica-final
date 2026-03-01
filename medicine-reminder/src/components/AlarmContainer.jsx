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
      console.log('Handling Take action for group:', groupId);
      await markAlarmTaken(groupId);
      console.log('Take action completed successfully');
    } catch (error) {
      console.error('Failed to mark alarm as taken:', error);
      alert('Failed to mark as taken: ' + error.message);
    }
  };

  const handleSnooze = async (groupId) => {
    try {
      console.log('Handling Snooze action for group:', groupId);
      await snoozeAlarm(groupId, 30); // Default 30 minutes
      console.log('Snooze action completed successfully');
    } catch (error) {
      console.error('Failed to snooze alarm:', error);
      alert('Failed to snooze: ' + error.message);
    }
  };

  const handleDismiss = async (groupId) => {
    try {
      console.log('Handling Dismiss action for group:', groupId);
      await dismissAlarm(groupId);
      console.log('Dismiss action completed successfully');
    } catch (error) {
      console.error('Failed to dismiss alarm:', error);
      alert('Failed to dismiss: ' + error.message);
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
