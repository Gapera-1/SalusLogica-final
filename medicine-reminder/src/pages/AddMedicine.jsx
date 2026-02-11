import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { medicineAPI } from "../services/api";

const AddMedicine = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "",
    times: ["08:00"], // Array of exact times
    stock: "",
    prescribedFor: "",
    doctor: "",
    notes: "",
    reminderEnabled: true,
    startDate: "",
    endDate: "",
    instructions: ""
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const frequencies = [
    "Once daily",
    "Twice daily", 
    "Three times daily",
    "Four times daily",
    "As needed",
    "Weekly",
    "Monthly"
  ];

  // Helper function to get suggested times based on frequency
  const getSuggestedTimes = (frequency) => {
    switch (frequency) {
      case "Once daily":
        return ["08:00"];
      case "Twice daily":
        return ["08:00", "20:00"];
      case "Three times daily":
        return ["08:00", "14:00", "20:00"];
      case "Four times daily":
        return ["08:00", "12:00", "16:00", "20:00"];
      default:
        return ["08:00"];
    }
  };

  // Update times when frequency changes
  const handleFrequencyChange = (e) => {
    const frequency = e.target.value;
    setFormData(prev => ({
      ...prev,
      frequency,
      times: getSuggestedTimes(frequency)
    }));
  };

  // Add a new time slot
  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      times: [...prev.times, "12:00"]
    }));
  };

  // Remove a time slot
  const removeTimeSlot = (index) => {
    if (formData.times.length > 1) {
      setFormData(prev => ({
        ...prev,
        times: prev.times.filter((_, i) => i !== index)
      }));
    }
  };

  // Update a specific time
  const updateTime = (index, value) => {
    setFormData(prev => ({
      ...prev,
      times: prev.times.map((time, i) => i === index ? value : time)
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Medicine name is required";
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = "Dosage is required";
    }
    if (!formData.frequency) {
      newErrors.frequency = "Frequency is required";
    }
    if (!formData.times || formData.times.length === 0) {
      newErrors.times = "At least one time is required";
    }
    if (!formData.stock || formData.stock < 0) {
      newErrors.stock = "Valid stock quantity is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Use real backend API
      const medicineData = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency.toLowerCase().replace(" ", "_"),
        times: formData.times, // Use the exact times array
        duration: parseInt(formData.stock) || 30, // Use stock as duration
        prescribedFor: formData.prescribedFor,
        prescribing_doctor: formData.doctor,
        start_date: formData.startDate || new Date().toISOString().split('T')[0],
        end_date: formData.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: formData.notes,
        reminder_enabled: formData.reminderEnabled,
        instructions: formData.instructions
      };
      
      await medicineAPI.create(medicineData);
      alert("Medicine added successfully!");
      navigate("/medicine-list");
    } catch (error) {
      console.error("Error adding medicine:", error);
      alert("Failed to add medicine. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/medicine-list");
  };

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-gray-900 text-2xl font-bold mb-2">Add New Medicine</h2>
          <p className="text-gray-600 text-sm">Enter the details for your medicine reminder</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medicine Name */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.name ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder="e.g., Aspirin, Vitamin D"
              />
              {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
            </div>

            {/* Dosage */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                Dosage <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.dosage ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder="e.g., 100mg, 2 tablets"
              />
              {errors.dosage && <span className="text-red-400 text-xs">{errors.dosage}</span>}
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleFrequencyChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer ${
                  errors.frequency ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
              >
                <option value="" className="text-gray-900">Select frequency</option>
                {frequencies.map(freq => (
                  <option key={freq} value={freq} className="text-gray-900">{freq}</option>
                ))}
              </select>
              {errors.frequency && <span className="text-red-400 text-xs">{errors.frequency}</span>}
            </div>

            {/* Times of Day */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">Times of Day</label>
              <div className="space-y-2">
                {formData.times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
                    />
                    {formData.times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove time"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Time
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Select exact times when you need to take this medicine
              </p>
              {errors.times && <span className="text-red-400 text-xs">{errors.times}</span>}
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                Duration (days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.stock ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder="Number of tablets/capsules"
                min="0"
              />
              {errors.stock && <span className="text-red-400 text-xs">{errors.stock}</span>}
            </div>

            {/* Prescribed For */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">Prescribed For</label>
              <input
                type="text"
                name="prescribedFor"
                value={formData.prescribedFor}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-500 focus:ring-opacity-30 transition-all duration-300"
                placeholder="e.g., Headaches, Blood pressure"
              />
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">Prescribing Doctor</label>
              <input
                type="text"
                name="doctor"
                value={formData.doctor}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-500 focus:ring-opacity-30 transition-all duration-300"
                placeholder="Dr. Smith"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">Start Date</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-gray-700 text-sm font-medium">Instructions</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
              placeholder="e.g., Take with food, avoid grapefruit"
              rows="3"
            />
          </div>

          {/* Reminder Toggle */}
          <div className="space-y-2">
            <label className="flex items-center gap-3 text-gray-700 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                name="reminderEnabled"
                checked={formData.reminderEnabled}
                onChange={handleInputChange}
                className="w-5 h-5 opacity-0 cursor-pointer"
              />
              <span className={`w-5 h-5 border-2 border-gray-300 rounded flex items-center justify-center transition-all duration-300 ${
                formData.reminderEnabled ? 'bg-green-500 border-green-500' : 'bg-transparent'
              }`}>
                {formData.reminderEnabled && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </span>
              Enable reminders for this medicine
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Medicine
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </BaseLayout>
  );
};

export default AddMedicine;
