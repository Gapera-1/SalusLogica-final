import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/BaseLayout';
import { safetyAPI, medicineAPI } from '../services/api';

const SafetyCheck = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [safetyReport, setSafetyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [populationType, setPopulationType] = useState('young');
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const response = await medicineAPI.getAll();
      setMedicines(response.data || []);
    } catch (err) {
      console.error('Failed to load medicines:', err);
      setError('Failed to load medicines.');
    }
  };

  const runSafetyCheck = async () => {
    if (!selectedMedicine) return;

    setLoading(true);
    setError(null);
    setSafetyReport(null);

    try {
      const response = await safetyAPI.safetyCheck(
        selectedMedicine.id,
        populationType
      );
      setSafetyReport(response.data);
    } catch (err) {
      console.error('Safety check failed:', err);
      setError('Failed to run safety check.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (!severity || typeof severity !== 'string') {
      return 'text-gray-600 bg-gray-50 border-gray-200';
    }

    switch (severity.toLowerCase()) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'major':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'dosage_safety':
        return '⚠️';
      case 'pregnancy_contraindication':
        return '🚫';
      case 'elderly_dosage':
        return '👴';
      case 'food_interaction':
        return '🍽';
      default:
        return '⚡';
    }
  };

  return (
    <BaseLayout>
      <div className="max-w-4xl mx-auto p-6">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🛡️ Safety Check Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Clinical safety validation based on selected patient population.
          </p>

          {/* Population Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Population Type
            </label>
            <select
              value={populationType}
              onChange={(e) => setPopulationType(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="young">Young (18-35)</option>
              <option value="pregnant">Pregnant</option>
              <option value="elderly">Elderly (65+)</option>
              <option value="extreme">Extreme Age</option>
            </select>
          </div>

          {/* Medicine Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Medicine
            </label>
            <select
              value={selectedMedicine?.id || ''}
              onChange={(e) => {
                const medicine = medicines.find(
                  (m) => String(m.id) === e.target.value
                );
                setSelectedMedicine(medicine || null);
              }}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="">Choose a medicine...</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} ({medicine.dosage})
                </option>
              ))}
            </select>
          </div>

          {/* Run Button */}
          <div className="flex justify-center">
            <button
              onClick={runSafetyCheck}
              disabled={!selectedMedicine || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin h-5 w-5 mr-3"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Running Safety Check...
                </div>
              ) : (
                '🛡️ Run Safety Check'
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Safety Report */}
        {safetyReport && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">
              Safety Report for {safetyReport.medicine?.name}
            </h2>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p><strong>Dosage:</strong> {safetyReport.medicine?.dosage}</p>
              <p><strong>Frequency:</strong> {safetyReport.medicine?.frequency}</p>
            </div>

            <h3 className="text-lg font-semibold mb-4">
              {safetyReport.overall_safety
                ? '✅ Safety Check Passed'
                : '⚠️ Safety Issues Found'}
            </h3>

            {safetyReport.safety_alerts?.map((alert, index) => (
              <div
                key={index}
                className={`p-4 mb-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start">
                  <span className="text-2xl mr-3">
                    {getAlertIcon(alert.type)}
                  </span>
                  <div>
                    <h4 className="font-semibold mb-1">
                      {alert.type.replace(/_/g, ' ')}
                    </h4>
                    <p>{alert.message}</p>
                    {alert.recommendation && (
                      <p className="text-sm mt-2">
                        <strong>Recommendation:</strong> {alert.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation */}
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => navigate('/medicine-list')}
                className="flex-1 px-4 py-2 border rounded-lg"
              >
                Back to Medicines
              </button>
              <button
                onClick={() => navigate('/add-medicine')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg"
              >
                Add New Medicine
              </button>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default SafetyCheck;
