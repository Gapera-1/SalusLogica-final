// DEPRECATED: This component has been replaced by the integrated alarm system
// The new system uses useAlarmManager hook and connects to the backend
// See: src/hooks/useAlarmManager.js, src/components/ActiveAlarm.jsx, src/components/AlarmContainer.jsx

export default function ReminderChecker() {
  console.warn('ReminderChecker is deprecated. Please use the integrated alarm system.');
  return null;
}