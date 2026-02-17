import React from 'react';

const MedicineCard = ({ medicine, onEdit, onDelete, showActions = true }) => {
  // Get stock level color based on remaining amount
  const getStockLevel = (stock) => {
    if (stock === 0) {
      return {
        label: 'Out of Stock',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '🚫',
        textColor: 'text-red-600'
      };
    } else if (stock <= 5) {
      return {
        label: 'Critical',
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: '⚠️',
        textColor: 'text-red-600'
      };
    } else if (stock <= 10) {
      return {
        label: 'Low',
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: '⚡',
        textColor: 'text-yellow-600'
      };
    } else if (stock <= 20) {
      return {
        label: 'Moderate',
        color: 'bg-teal-100 text-teal-800 border-teal-300',
        icon: '📦',
        textColor: 'text-teal-600'
      };
    } else {
      return {
        label: 'Good',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: '✅',
        textColor: 'text-green-600'
      };
    }
  };

  // Get frequency display icon
  const getFrequencyIcon = (frequency) => {
    const icons = {
      'once_daily': '1️⃣',
      'twice_daily': '2️⃣',
      'three_times_daily': '3️⃣',
      'four_times_daily': '4️⃣',
      'every_six_hours': '⏰',
      'as_needed': '🔔',
      'weekly': '📅',
      'monthly': '🗓️'
    };
    return icons[frequency] || '💊';
  };

  // Format frequency for display
  const formatFrequency = (frequency) => {
    const labels = {
      'once_daily': 'Once Daily',
      'twice_daily': 'Twice Daily',
      'three_times_daily': '3 Times Daily',
      'four_times_daily': '4 Times Daily',
      'every_six_hours': 'Every 6 Hours',
      'as_needed': 'As Needed',
      'weekly': 'Weekly',
      'monthly': 'Monthly'
    };
    return labels[frequency] || frequency?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not Set';
  };

  const stockLevel = getStockLevel(medicine.stock_count || 0);
  const isOutOfStock = medicine.stock_count === 0 || medicine.stock_count === null || medicine.stock_count === undefined;

  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 hover:border-teal-400 hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header with medicine name and stock indicator */}
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-4">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-1">{medicine.name || 'Unnamed Medicine'}</h3>
            {medicine.scientific_name && (
              <p className="text-teal-100 text-sm italic">{medicine.scientific_name}</p>
            )}
            {medicine.dosage && (
              <span className="inline-block mt-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                {medicine.dosage}
              </span>
            )}
          </div>
          
          {/* Stock indicator badge */}
          <div className={`${stockLevel.color} border-2 px-4 py-2 rounded-lg font-bold text-center ml-3 shadow-lg`}>
            <div className="text-2xl mb-1">{stockLevel.icon}</div>
            <div className="text-lg font-bold">{medicine.stock_count || 0}</div>
            <div className="text-xs font-semibold uppercase">{stockLevel.label}</div>
          </div>
        </div>
      </div>

      {/* Medicine details */}
      <div className="p-5 space-y-4">
        
        {/* Frequency Row */}
        <div className="bg-teal-50 border-l-4 border-teal-500 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{getFrequencyIcon(medicine.frequency)}</div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frequency</p>
              <p className="text-lg font-bold text-gray-900">{formatFrequency(medicine.frequency)}</p>
            </div>
          </div>
        </div>

        {/* Times to Take Row */}
        <div className="bg-teal-50 border-l-4 border-purple-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-3xl mt-1">⏰</div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Times to Take</p>
              <div className="flex flex-wrap gap-2">
                {medicine.times && medicine.times.length > 0 ? (
                  medicine.times.map((time, index) => (
                    <span
                      key={index}
                      className="bg-purple-600 text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-sm"
                    >
                      {time}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500 italic text-sm">No times scheduled</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {medicine.prescribed_for && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Prescribed For</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{medicine.prescribed_for}</p>
            </div>
          )}
          
          {medicine.prescribing_doctor && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Doctor</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{medicine.prescribing_doctor}</p>
            </div>
          )}

          {medicine.start_date && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Started</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {new Date(medicine.start_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {medicine.duration && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Duration</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{medicine.duration} days</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 pt-3 border-t border-gray-200">
            {isOutOfStock ? (
              <div className="w-full bg-red-50 border-2 border-red-300 rounded-lg p-3 text-center">
                <p className="text-red-700 font-bold text-sm">🚫 Out of Stock - Auto-Delete Enabled</p>
                <p className="text-red-600 text-xs mt-1">Delete this medicine from the system</p>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${medicine.name}" permanently from the system?\n\nThis cannot be undone.`)) {
                      onDelete && onDelete(medicine);
                    }
                  }}
                  className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove Medicine
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => onEdit && onEdit(medicine)}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (window.confirm(`Delete "${medicine.name}" from your medicines?\n\nYou can add it back later.`)) {
                      onDelete && onDelete(medicine);
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MedicineCard;
