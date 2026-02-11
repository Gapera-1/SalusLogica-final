import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";

const EditMedicine = ({ setIsAuthenticated, setUser, user }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [medicine, setMedicine] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    start_date: "",
    end_date: "",
    instructions: "",
    prescribed_for: "",
    doctor: "",
    notes: "",
    reminder_times: ["08:00", "14:00", "20:00"]
  });
  const [errors, setErrors] = useState({});

  const frequencyOptions = [
    { value: "ONCE_DAILY", label: "Once Daily" },
    { value: "TWICE_DAILY", label: "Twice Daily" },
    { value: "THREE_TIMES_DAILY", label: "Three Times Daily" },
    { value: "FOUR_TIMES_DAILY", label: "Four Times Daily" },
    { value: "EVERY_OTHER_DAY", label: "Every Other Day" },
    { value: "WEEKLY", label: "Weekly" },
    { value: "MONTHLY", label: "Monthly" },
    { value: "AS_NEEDED", label: "As Needed" }
  ];

  useEffect(() => {
    loadMedicine();
  }, [id]);

  const loadMedicine = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock medicine data
      const mockMedicine = {
        id: parseInt(id),
        name: "Aspirin",
        dosage: "100mg",
        frequency: "TWICE_DAILY",
        duration: "30",
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        instructions: "Take with food to avoid stomach upset",
        prescribed_for: "Headache prevention",
        doctor: "Dr. Smith",
        notes: "Patient history of stomach sensitivity",
        reminder_times: ["08:00", "20:00"]
      };
      
      setMedicine(mockMedicine);
      setLoading(false);
    } catch (error) {
      console.error("Error loading medicine:", error);
      setMessage({ type: "error", text: "Failed to load medicine details" });
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMedicine(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleReminderTimeChange = (index, value) => {
    const newReminderTimes = [...medicine.reminder_times];
    newReminderTimes[index] = value;
    setMedicine(prev => ({ ...prev, reminder_times: newReminderTimes }));
  };

  const addReminderTime = () => {
    setMedicine(prev => ({
      ...prev,
      reminder_times: [...prev.reminder_times, "12:00"]
    }));
  };

  const removeReminderTime = (index) => {
    if (medicine.reminder_times.length > 1) {
      const newReminderTimes = medicine.reminder_times.filter((_, i) => i !== index);
      setMedicine(prev => ({ ...prev, reminder_times: newReminderTimes }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!medicine.name.trim()) {
      newErrors.name = "Medicine name is required";
    }
    if (!medicine.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }
    if (!medicine.frequency) {
      newErrors.frequency = "Frequency is required";
    }
    if (!medicine.duration || medicine.duration < 1) {
      newErrors.duration = "Duration must be at least 1 day";
    }
    if (!medicine.start_date) {
      newErrors.start_date = "Start date is required";
    }
    if (!medicine.end_date) {
      newErrors.end_date = "End date is required";
    }
    if (medicine.start_date && medicine.end_date && new Date(medicine.start_date) > new Date(medicine.end_date)) {
      newErrors.end_date = "End date must be after start date";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update localStorage
      const medicines = JSON.parse(localStorage.getItem("medicines") || "[]");
      const updatedMedicines = medicines.map(m => 
        m.id === parseInt(id) ? { ...medicine, id: parseInt(id) } : m
      );
      localStorage.setItem("medicines", JSON.stringify(updatedMedicines));
      
      setMessage({ type: "success", text: "Medicine updated successfully!" });
      
      setTimeout(() => {
        navigate("/medicine-list");
      }, 2000);
      
    } catch (error) {
      console.error("Error updating medicine:", error);
      setMessage({ type: "error", text: "Failed to update medicine. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading medicine details...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => navigate("/medicine-list")}
                  className="text-blue-600 hover:text-blue-500 mr-3"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Edit Medicine: {medicine.name}
                </h3>
              </div>

              {message && (
                <div className={`rounded-md p-4 mb-4 ${
                  message.type === "error" ? "bg-red-50" : 
                  message.type === "success" ? "bg-green-50" : "bg-blue-50"
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {message.type === "error" ? (
                        <i className="fas fa-exclamation-circle text-red-400"></i>
                      ) : message.type === "success" ? (
                        <i className="fas fa-check-circle text-green-400"></i>
                      ) : (
                        <i className="fas fa-info-circle text-blue-400"></i>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        message.type === "error" ? "text-red-800" : 
                        message.type === "success" ? "text-green-800" : "text-blue-800"
                      }`}>
                        {message.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Medicine Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={medicine.name}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.name ? "border-red-300" : ""
                      }`}
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      id="dosage"
                      name="dosage"
                      required
                      placeholder="e.g., 500mg, 10ml"
                      value={medicine.dosage}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.dosage ? "border-red-300" : ""
                      }`}
                    />
                    {errors.dosage && (
                      <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                      Frequency *
                    </label>
                    <select
                      id="frequency"
                      name="frequency"
                      required
                      value={medicine.frequency}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.frequency ? "border-red-300" : ""
                      }`}
                    >
                      <option value="">Select frequency</option>
                      {frequencyOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.frequency && (
                      <p className="mt-1 text-sm text-red-600">{errors.frequency}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration (days) *
                    </label>
                    <input
                      type="number"
                      id="duration"
                      name="duration"
                      required
                      min="1"
                      value={medicine.duration}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.duration ? "border-red-300" : ""
                      }`}
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      id="start_date"
                      name="start_date"
                      required
                      value={medicine.start_date}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.start_date ? "border-red-300" : ""
                      }`}
                    />
                    {errors.start_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                      End Date *
                    </label>
                    <input
                      type="date"
                      id="end_date"
                      name="end_date"
                      required
                      value={medicine.end_date}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                        errors.end_date ? "border-red-300" : ""
                      }`}
                    />
                    {errors.end_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">
                    Instructions
                  </label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    rows={3}
                    value={medicine.instructions}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="How to take this medicine"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="prescribed_for" className="block text-sm font-medium text-gray-700">
                      Prescribed For
                    </label>
                    <input
                      type="text"
                      id="prescribed_for"
                      name="prescribed_for"
                      value={medicine.prescribed_for}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Condition or symptom"
                    />
                  </div>

                  <div>
                    <label htmlFor="doctor" className="block text-sm font-medium text-gray-700">
                      Prescribing Doctor
                    </label>
                    <input
                      type="text"
                      id="doctor"
                      name="doctor"
                      value={medicine.doctor}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Dr. Smith"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={medicine.notes}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Any additional information"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Reminder Times
                  </label>
                  <div className="space-y-2">
                    {medicine.reminder_times.map((time, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                          className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                        {medicine.reminder_times.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReminderTime(index)}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addReminderTime}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                    >
                      <i className="fas fa-plus mr-2"></i>
                      Add Reminder Time
                    </button>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate("/medicine-list")}
                    className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default EditMedicine;
