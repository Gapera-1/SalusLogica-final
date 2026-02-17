// DEPRECATED: This component has been replaced by the integrated alarm system
// The new system uses useAlarmManager hook and connects to the backend
// See: src/hooks/useAlarmManager.js, src/components/ActiveAlarm.jsx, src/components/AlarmContainer.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

const ReminderChecker = () => {
  const [reminders, setReminders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user, authToken } = useAuth();

  // Poll for reminders every 30 seconds
  useEffect(() => {
    if (!user || !authToken) return;

    const fetchReminders = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('/api/alarms/reminders/', {
          headers: {
            'Authorization': `Token ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch reminders');
        }

        const data = await response.json();
        setReminders(data.reminders || []);
      } catch (err) {
        console.error('Error fetching reminders:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchReminders();

    // Set up polling
    const interval = setInterval(fetchReminders, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, authToken]);

  const acknowledgeReminder = async (reminderId) => {
    try {
      const response = await fetch(`/api/alarms/reminders/${reminderId}/acknowledge/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge reminder');
      }

      // Remove the acknowledged reminder from the list
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Error acknowledging reminder:', err);
    }
  };

  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('rw-RW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getMinutesText = (minutes) => {
    if (minutes === 1) return 'umunota';
    if (minutes < 60) return `${minutes} minota`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} amasaha`;
    return `${hours} amasaha na ${remainingMinutes} minota`;
  };

  // Don't render if no reminders and not loading
  if (reminders.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 max-w-md w-full z-50 space-y-2">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong className="font-bold">Ikosa!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {isLoading && reminders.length === 0 && (
        <div className="bg-teal-100 border border-teal-400 text-teal-700 px-4 py-3 rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600 mr-2"></div>
            <span>Gushakisha ibimenyetso...</span>
          </div>
        </div>
      )}

      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={`bg-white rounded-lg shadow-lg border-l-4 p-4 transform transition-all duration-300 hover:scale-105 ${
            reminder.is_overdue 
              ? 'border-red-500 bg-red-50' 
              : reminder.type === 'upcoming' 
                ? 'border-yellow-500 bg-yellow-50'
                : 'border-teal-500 bg-teal-50'
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                reminder.is_overdue 
                  ? 'bg-red-500 animate-pulse' 
                  : reminder.type === 'upcoming' 
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-teal-500 animate-pulse'
              }`}></div>
              <div>
                <h3 className={`font-semibold text-sm ${
                  reminder.is_overdue 
                    ? 'text-red-800' 
                    : reminder.type === 'upcoming' 
                      ? 'text-yellow-800'
                      : 'text-teal-800'
                }`}>
                  {reminder.title}
                </h3>
                {reminder.scheduled_time && (
                  <p className="text-xs text-gray-600 mt-1">
                    {formatTime(reminder.scheduled_time)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => acknowledgeReminder(reminder.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Kureka"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          <div className="mb-3">
            <p className="text-sm text-gray-700">{reminder.message}</p>
            {reminder.minutes_until && (
              <p className="text-xs text-gray-600 mt-1">
                {reminder.minutes_until > 0 
                  ? `Uza kugera mu ${getMinutesText(reminder.minutes_until)}`
                  : 'Bigarukira nonaha'
                }
              </p>
            )}
          </div>

          {/* Action Buttons for due reminders */}
          {reminder.type === 'due' && reminder.group_id && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Mark as taken - this would integrate with the existing alarm system
                  window.location.href = `/alarms/taken/?group_id=${reminder.group_id}`;
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Byafashwe
              </button>
              
              <button
                onClick={() => {
                  // Snooze - this would integrate with the existing alarm system
                  window.location.href = `/alarms/snooze/?group_id=${reminder.group_id}`;
                }}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tegereza
              </button>
            </div>
          )}

          {/* Overdue Warning */}
          {reminder.is_overdue && (
            <div className="mt-3 p-2 bg-red-100 rounded-lg">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ Ibi byarengeye igihe. Nyamuneka wifate umuti wawe vuba.
              </p>
            </div>
          )}

          {/* Upcoming Indicator */}
          {reminder.type === 'upcoming' && (
            <div className="mt-3 p-2 bg-yellow-100 rounded-lg">
              <p className="text-xs text-yellow-700 font-medium">
                ⏰ Ibi bimenyetso bijya kuza mu {getMinutesText(reminder.minutes_until)}.
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ReminderChecker;