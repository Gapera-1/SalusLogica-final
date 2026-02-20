import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { medicineAPI } from "../services/api";
import BarcodeScanner from "../components/BarcodeScanner";
import MedicinePhotoCapture from "../components/MedicinePhotoCapture";

const AddMedicine = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
    startDate: new Date().toISOString().split('T')[0],
    endDate: "",
    instructions: ""
  });
  const [calculatedDuration, setCalculatedDuration] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showScanner, setShowScanner] = useState(false);
  const [medicinePhoto, setMedicinePhoto] = useState(null);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const frequencies = [
    t("addMedicine.onceDaily"),
    t("addMedicine.twiceDaily"),
    t("addMedicine.threeTimesDaily"),
    t("addMedicine.fourTimesDaily"),
    t("addMedicine.asNeeded"),
    t("addMedicine.weekly"),
    t("addMedicine.monthly")
  ];

  // Calculate doses per day based on frequency
  const getDosesPerDay = (frequency) => {
    const freq = frequency.toLowerCase();
    if (freq.includes('once') || freq.includes('une fois') || freq.includes('rimwe')) return 1;
    if (freq.includes('twice') || freq.includes('deux fois') || freq.includes('kabiri')) return 2;
    if (freq.includes('three') || freq.includes('trois fois') || freq.includes('gatatu')) return 3;
    if (freq.includes('four') || freq.includes('quatre fois') || freq.includes('kane')) return 4;
    if (freq.includes('weekly') || freq.includes('hebdomadaire') || freq.includes('icyumweru')) return 1/7; // 1 dose per 7 days
    if (freq.includes('monthly') || freq.includes('mensuel') || freq.includes('ukwezi')) return 1/30; // 1 dose per 30 days
    return null; // "As needed" - can't calculate
  };

  // Calculate duration and end date based on stock and frequency
  const calculateDuration = (stock, frequency, startDate) => {
    if (!stock || !frequency) return null;
    
    const dosesPerDay = getDosesPerDay(frequency);
    if (dosesPerDay === null) return null; // "As needed" - can't calculate
    
    const stockNum = parseInt(stock);
    if (isNaN(stockNum) || stockNum <= 0) return null;
    
    const durationDays = Math.floor(stockNum / dosesPerDay);
    
    // Calculate end date
    let endDate = null;
    if (startDate && durationDays > 0) {
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + durationDays);
      endDate = end.toISOString().split('T')[0];
    }
    
    return { days: durationDays, endDate };
  };

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
    const newFormData = {
      ...formData,
      frequency,
      times: getSuggestedTimes(frequency)
    };
    
    // Calculate duration with new frequency
    const result = calculateDuration(formData.stock, frequency, formData.startDate);
    if (result) {
      setCalculatedDuration(result.days);
      newFormData.endDate = result.endDate || '';
    } else {
      setCalculatedDuration(null);
    }
    
    setFormData(newFormData);
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
    const newValue = type === "checkbox" ? checked : value;
    
    const newFormData = {
      ...formData,
      [name]: newValue
    };
    
    // Recalculate duration when stock or startDate changes
    if (name === 'stock' || name === 'startDate') {
      const stockVal = name === 'stock' ? value : formData.stock;
      const startVal = name === 'startDate' ? value : formData.startDate;
      const result = calculateDuration(stockVal, formData.frequency, startVal);
      if (result) {
        setCalculatedDuration(result.days);
        newFormData.endDate = result.endDate || '';
      } else {
        setCalculatedDuration(null);
      }
    }
    
    setFormData(newFormData);
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  // Handle barcode scan result
  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false);
    setBarcodeLookupLoading(true);
    setBarcodeResult(null);

    try {
      const data = await medicineAPI.barcodeLookup(barcode);
      if (data && data.name) {
        // Auto-fill form with barcode lookup data
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          dosage: data.dosage || prev.dosage,
          instructions: data.instructions || prev.instructions,
          notes: data.notes ? `${prev.notes ? prev.notes + '\n' : ''}${data.notes}` : prev.notes,
        }));
        setBarcodeResult(data);
        showToast(t("scanner.autoFillSuccess"));
      } else {
        showToast(t("scanner.notFound"), "error");
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
      showToast(t("scanner.lookupError"), "error");
    } finally {
      setBarcodeLookupLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t("addMedicine.medicineNameRequired");
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = t("addMedicine.dosageRequired");
    }
    if (!formData.frequency) {
      newErrors.frequency = t("addMedicine.frequencyRequired");
    }
    if (!formData.times || formData.times.length === 0) {
      newErrors.times = t("addMedicine.timesRequired");
    }
    if (!formData.stock || formData.stock < 0) {
      newErrors.stock = t("addMedicine.stockRequired");
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
      // Use real backend API - all fields must match Django model snake_case
      const medicineData = {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency.toLowerCase().replace(" ", "_"),
        times: formData.times, // Array of times
        duration: calculatedDuration || parseInt(formData.stock) || 30,
        stock_count: parseInt(formData.stock) || 30,
        prescribed_for: formData.prescribedFor || "",
        prescribing_doctor: formData.doctor || "",
        start_date: formData.startDate || new Date().toISOString().split('T')[0],
        end_date: formData.endDate || new Date(Date.now() + (calculatedDuration || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        instructions: formData.instructions || "",
        notes: formData.notes || "",
        reminder_enabled: formData.reminderEnabled,
        barcode: barcodeResult?.barcode || ""
      };
      
      const response = await medicineAPI.create(medicineData);

      // Upload photo if one was captured
      if (medicinePhoto && response.id) {
        try {
          await medicineAPI.uploadPhoto(response.id, medicinePhoto);
        } catch (photoErr) {
          console.error("Photo upload failed:", photoErr);
          // Don't block medicine creation for photo failure
        }
      }
      
      // Check for safety warnings
      if (response.safety_warnings && response.safety_warnings.length > 0) {
        const warnings = response.safety_warnings;
        const criticalWarnings = warnings.filter(w => 
          w.severity === 'absolute' || w.severity === 'critical'
        );
        
        if (criticalWarnings.length > 0) {
          const warningMessage = criticalWarnings.map(w => 
            `⚠️ ${w.type?.toUpperCase()}: ${w.message}\n${w.recommendation || ''}`
          ).join('\n\n');
          alert(`${t("addMedicine.criticalSafetyWarning")}\n\n${warningMessage}\n\n${t("addMedicine.consultDoctor")}`);
        } else {
          const warningMessage = warnings.map(w => 
            `ℹ️ ${w.message}`
          ).join('\n\n');
          alert(`${t("addMedicine.safetyInformation")}\n\n${warningMessage}`);
        }
      }
      
      alert(t("addMedicine.success"));
      navigate("/medicine-list");
    } catch (error) {
      console.error("Error adding medicine:", error);
      console.error("Error details:", error.response || error.message);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.detail 
        || error.response?.data?.message 
        || error.message 
        || t("addMedicine.error");
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate("/medicine-list");
  };

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-card p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-gray-900 text-2xl font-bold mb-2">{t("addMedicine.title")}</h2>
          <p className="text-gray-600 text-sm">{t("addMedicine.subtitle")}</p>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all duration-300 ${
            toast.type === 'error' ? 'bg-red-500' : 'bg-teal-500'
          }`}>
            {toast.message}
          </div>
        )}

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onScanSuccess={handleBarcodeScan}
            onClose={() => setShowScanner(false)}
          />
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick-fill toolbar */}
          <div className="flex flex-wrap items-center gap-3 p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              disabled={barcodeLookupLoading}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              {barcodeLookupLoading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              )}
              {t("scanner.scanBarcode")}
            </button>
            {barcodeResult && (
              <span className="text-teal-700 text-xs">
                ✓ {t("scanner.autoFillSuccess")}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Medicine Name */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                {t("addMedicine.medicineName")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.name ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder={t("addMedicine.medicinePlaceholder")}
              />
              {errors.name && <span className="text-red-400 text-xs">{errors.name}</span>}
            </div>

            {/* Dosage */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                {t("addMedicine.dosage")} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.dosage ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder={t("addMedicine.dosagePlaceholder")}
              />
              {errors.dosage && <span className="text-red-400 text-xs">{errors.dosage}</span>}
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                {t("addMedicine.frequency")} <span className="text-red-500">*</span>
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleFrequencyChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer ${
                  errors.frequency ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
              >
                <option value="" className="text-gray-900">{t("addMedicine.frequency")}</option>
                {frequencies.map(freq => (
                  <option key={freq} value={freq} className="text-gray-900">{freq}</option>
                ))}
              </select>
              {errors.frequency && <span className="text-red-400 text-xs">{errors.frequency}</span>}
            </div>

            {/* Times of Day */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">{t("addMedicine.times")}</label>
              <div className="space-y-2">
                {formData.times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => updateTime(index, e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
                    />
                    {formData.times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title={t("addMedicine.removeTimeSlot")}
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
                  className="w-full px-4 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-teal-500 hover:text-teal-500 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t("addMedicine.addTimeSlot")}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {t("addMedicine.selectExactTimes")}
              </p>
              {errors.times && <span className="text-red-400 text-xs">{errors.times}</span>}
            </div>

            {/* Stock */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium flex items-center gap-1">
                {t("addMedicine.stock")} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 border rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 ${
                  errors.stock ? "border-red-500 focus:ring-red-500 focus:ring-opacity-20" : "border-gray-300"
                }`}
                placeholder={t("addMedicine.stockPlaceholder")}
                min="0"
              />
              {/* Calculated Duration Display */}
              {calculatedDuration && (
                <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm text-teal-700">
                    {t("addMedicine.estimatedDuration") || "Estimated duration"}: <strong>{calculatedDuration} {t("addMedicine.days") || "days"}</strong>
                  </span>
                </div>
              )}
              {errors.stock && <span className="text-red-400 text-xs">{errors.stock}</span>}
            </div>

            {/* Prescribed For */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">{t("addMedicine.prescribedFor")}</label>
              <input
                type="text"
                name="prescribedFor"
                value={formData.prescribedFor}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-500 focus:ring-opacity-30 transition-all duration-300"
                placeholder={t("addMedicine.prescribedForPlaceholder")}
              />
            </div>

            {/* Doctor */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">{t("addMedicine.doctor")}</label>
              <input
                type="text"
                name="doctor"
                value={formData.doctor}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-white border-opacity-30 rounded-lg bg-white bg-opacity-10 text-white placeholder-white placeholder-opacity-60 focus:outline-none focus:border-green-500 focus:ring-3 focus:ring-green-500 focus:ring-opacity-30 transition-all duration-300"
                placeholder={t("addMedicine.doctorPlaceholder")}
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-medium">{t("addMedicine.startDate")}</label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className="text-gray-700 text-sm font-medium">{t("addMedicine.instructions")}</label>
            <textarea
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
              placeholder={t("addMedicine.instructionsPlaceholder")}
              rows="3"
            />
          </div>

          {/* Medicine Photo */}
          <div className="space-y-2">
            <MedicinePhotoCapture
              photo={medicinePhoto}
              onPhotoChange={setMedicinePhoto}
              onRemove={() => setMedicinePhoto(null)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-gray-700 text-sm font-medium">{t("addMedicine.notes")}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
              placeholder={t("addMedicine.notesPlaceholder")}
              rows="4"
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
              {t("addMedicine.enableReminders")}
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              {t("addMedicine.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t("addMedicine.submitting")}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  {t("addMedicine.submit")}
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
