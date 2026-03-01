import React from 'react';
import useAlarmManager from '../hooks/useAlarmManager';

const ActiveAlarm = ({ alarm, onTake, onSnooze, onDismiss }) => {
  const formatTime = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isOverdue = new Date(alarm.scheduled_time) < new Date();

  return (
    <div className={`fixed top-4 right-4 max-w-md w-full bg-white rounded-lg shadow-lg border-l-4 ${
      isOverdue ? 'border-red-500 bg-red-50' : 'border-teal-500 bg-teal-50'
    } p-4 z-50 animate-pulse`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isOverdue ? 'bg-red-500' : 'bg-teal-500'
          } animate-ping`}></div>
          <div>
            <h3 className={`font-semibold text-sm ${
              isOverdue ? 'text-red-800' : 'text-teal-800'
            }`}>
              {isOverdue ? 'Missed Medicine' : 'Medicine Reminder'}
            </h3>
            <p className="text-xs text-gray-600 mt-1">
              {formatTime(alarm.scheduled_time)}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDismiss(alarm.group_id)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Medicines */}
      <div className="space-y-2 mb-4">
        {alarm.medicines.map((medicine, index) => (
          <div key={medicine.id} className="flex items-center justify-between bg-white bg-opacity-60 rounded-lg p-2">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-teal-600 text-xs">💊</span>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">{medicine.name}</p>
                <p className="text-xs text-gray-600">{medicine.dosage}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onTake(alarm.group_id)}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Taken
        </button>
        
        <button
          onClick={() => onSnooze(alarm.group_id)}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Snooze
        </button>
        
        <button
          onClick={() => onDismiss(alarm.group_id)}
          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Dismiss
        </button>
      </div>

      {/* Overdue Warning */}
      {isOverdue && (
        <div className="mt-3 p-2 bg-red-100 rounded-lg">
          <p className="text-xs text-red-700 font-medium">
            ⚠️ This dose was missed. Please take it as soon as possible.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveAlarm;
