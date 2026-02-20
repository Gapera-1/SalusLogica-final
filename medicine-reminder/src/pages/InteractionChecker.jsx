import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { medicineAPI, interactionAPI } from "../services/api";

const InteractionChecker = ({ setIsAuthenticated, setUser, user }) => {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await medicineAPI.getAll();
      
      // Handle different response formats
      if (data.results && Array.isArray(data.results)) {
        setMedicines(data.results);
      } else if (Array.isArray(data)) {
        setMedicines(data);
      } else {
        setMedicines([]);
      }
    } catch (err) {
      console.error("Failed to load medicines:", err);
      setError("Failed to load medicines. Please try again.");
      setMedicines([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineToggle = (medicineId) => {
    setSelectedMedicines(prev => 
      prev.includes(medicineId) 
        ? prev.filter(id => id !== medicineId)
        : [...prev, medicineId]
    );
  };

  const clearSelection = () => {
    setSelectedMedicines([]);
    setResults(null);
  };

  const checkInteractions = async () => {
    if (selectedMedicines.length < 2) {
      alert(t("interactionChecker.selectAtLeast2"));
      return;
    }

    setChecking(true);
    setError(null);
    
    try {
      const response = await interactionAPI.check(selectedMedicines);
      
      // Parse API response - adapt to backend response format
      const interactions = response.interactions || [];
      const overallRisk = calculateOverallRisk(interactions);
      
      setResults({
        overallRisk,
        interactions: interactions.map((int, idx) => ({
          id: idx + 1,
          medicines: [int.medicine1 || int.drug1, int.medicine2 || int.drug2].filter(Boolean),
          severity: (int.severity || 'MINOR').toUpperCase(),
          description: int.description || '',
          recommendation: int.recommendation || int.management || '',
          mechanism: int.mechanism || ''
        })),
        allergies: response.allergies || [],
        contraindications: response.contraindications || []
      });
    } catch (err) {
      console.error("Failed to check interactions:", err);
      setError("Failed to check interactions. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const calculateOverallRisk = (interactions) => {
    if (!interactions || interactions.length === 0) {
      return { level: "SAFE", message: "No significant interactions detected", color: "risk-safe" };
    }
    
    const severities = interactions.map(i => (i.severity || '').toUpperCase());
    
    if (severities.includes('CONTRAINDICATED') || severities.includes('CRITICAL')) {
      return { level: "CONTRAINDICATED", message: "Contraindicated combination - avoid use", color: "risk-contraindicated" };
    } else if (severities.includes('MAJOR') || severities.includes('HIGH')) {
      return { level: "HIGH", message: "High risk - consult healthcare provider", color: "risk-high" };
    } else if (severities.includes('MODERATE') || severities.includes('MEDIUM')) {
      return { level: "MODERATE", message: "Moderate risk - use with caution", color: "risk-moderate" };
    } else if (severities.includes('MINOR') || severities.includes('LOW')) {
      return { level: "CAUTION", message: "Minor interaction - monitor for side effects", color: "risk-caution" };
    }
    
    return { level: "SAFE", message: "No significant interactions detected", color: "risk-safe" };
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case "SAFE": return "risk-safe";
      case "CAUTION": return "risk-caution";
      case "MODERATE": return "risk-moderate";
      case "HIGH": return "risk-high";
      case "CONTRAINDICATED": return "risk-contraindicated";
      default: return "risk-safe";
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "MINOR": return "severity-minor";
      case "MODERATE": return "severity-moderate";
      case "MAJOR": return "severity-major";
      case "CONTRAINDICATED": return "severity-contraindicated";
      default: return "severity-minor";
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case "SAFE": return "fas fa-check-circle";
      case "CAUTION": return "fas fa-exclamation-triangle";
      case "MODERATE": return "fas fa-exclamation-circle";
      case "HIGH": return "fas fa-times-circle";
      case "CONTRAINDICATED": return "fas fa-ban";
      default: return "fas fa-check-circle";
    }
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">{t("interactionChecker.loading")}</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t("interactionChecker.title")}</h1>
          <p className="mt-2 text-gray-600">
            {t("interactionChecker.checkSafety") || "Check for drug interactions, allergy alerts, and contraindications to ensure medication safety"}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {medicines.length === 0 && !loading && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <div className="flex items-center">
              <i className="fas fa-info-circle text-yellow-500 text-2xl mr-3"></i>
              <div>
                <h4 className="text-lg font-medium text-yellow-800">No Medicines Found</h4>
                <p className="text-sm text-yellow-600">Add some medicines to your profile first to check for interactions.</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Medicine Selection */}
          <div className="lg:col-span-2">
            {/* Medicine Selection */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t("interactionChecker.selectAtLeast2") || "Select Medications"}</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("interactionChecker.chooseToCheck") || "Choose medications to check for interactions"}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {medicines.map((medicine) => (
                      <label 
                        key={medicine.id}
                        className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMedicines.includes(medicine.id)}
                          onChange={() => handleMedicineToggle(medicine.id)}
                          className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{medicine.name}</div>
                          <div className="text-xs text-gray-500">{medicine.dosage}{medicine.frequency ? ` • ${medicine.frequency}` : ''}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={checkInteractions}
                    disabled={checking || selectedMedicines.length < 2}
                    className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium disabled:cursor-not-allowed"
                  >
                    <i className="fas fa-shield-alt mr-2"></i>
                    {checking ? "Checking..." : "Check Interactions"}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-md font-medium"
                  >
                    Clear Selection
                  </button>
                </div>
              </form>
            </div>

            {/* Results Section */}
            {results && (
              <>
                {/* Overall Risk Assessment */}
                <div className={`mb-6 p-6 rounded-lg text-white ${getRiskColor(results.overallRisk.level)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Overall Risk Assessment</h3>
                      <p className="text-lg">{results.overallRisk.message}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl mb-2">
                        <i className={getRiskIcon(results.overallRisk.level)}></i>
                      </div>
                      <div className="text-lg font-bold">{results.overallRisk.level}</div>
                    </div>
                  </div>
                </div>

                {/* Interactions Found */}
                {results.interactions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                      Drug Interactions Found ({results.interactions.length})
                    </h3>
                    <div className="space-y-4">
                      {results.interactions.map((interaction) => (
                        <div 
                          key={interaction.id}
                          className={`interaction-card bg-white rounded-lg shadow p-6 ${getSeverityColor(interaction.severity)}`}
                          style={{
                            transition: "all 0.3s ease",
                            borderLeft: "4px solid transparent"
                          }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">
                                {interaction.medicines.join(" + ")}
                              </h4>
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                                interaction.severity === "MAJOR" ? "bg-red-100 text-red-800" :
                                interaction.severity === "MODERATE" ? "bg-orange-100 text-orange-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {interaction.severity}
                              </span>
                            </div>
                            <i className="fas fa-pills text-gray-400 text-xl"></i>
                          </div>
                          
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Description</h5>
                              <p className="text-sm text-gray-600">{interaction.description}</p>
                            </div>
                            
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Mechanism</h5>
                              <p className="text-sm text-gray-600">{interaction.mechanism}</p>
                            </div>
                            
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Recommendation</h5>
                              <p className="text-sm text-gray-600">{interaction.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* No Interactions */}
                {results.interactions.length === 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center">
                      <i className="fas fa-check-circle text-green-500 text-2xl mr-3"></i>
                      <div>
                        <h4 className="text-lg font-medium text-green-800">No Interactions Found</h4>
                        <p className="text-sm text-green-600">The selected medications can be taken together safely.</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Info Panel */}
          <div className="lg:col-span-1">
            {/* Risk Levels Guide */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Risk Levels</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Safe</p>
                    <p className="text-xs text-gray-600">No significant interactions</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Caution</p>
                    <p className="text-xs text-gray-600">Monitor for side effects</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Moderate</p>
                    <p className="text-xs text-gray-600">May require dosage adjustment</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">High</p>
                    <p className="text-xs text-gray-600">Avoid combination if possible</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Common Interactions */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Common Interactions</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Warfarin + Aspirin</p>
                  <p className="text-xs text-gray-600">Increased bleeding risk</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">NSAIDs + ACE Inhibitors</p>
                  <p className="text-xs text-gray-600">Reduced kidney function</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900">Statins + Grapefruit</p>
                  <p className="text-xs text-gray-600">Increased statin levels</p>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-sm font-bold text-yellow-800 mb-2">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Medical Disclaimer
              </h3>
              <p className="text-xs text-yellow-700">
                This tool provides general information about potential drug interactions. 
                Always consult with your healthcare provider before making any changes to your medication regimen.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .interaction-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .risk-safe { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
        .risk-caution { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .risk-moderate { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
        .risk-high { background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); }
        .risk-contraindicated { background: linear-gradient(135deg, #7c2d12 0%, #451a03 100%); }
        .severity-minor { border-left-color: #f59e0b; }
        .severity-moderate { border-left-color: #f97316; }
        .severity-major { border-left-color: #ef4444; }
        .severity-contraindicated { border-left-color: #991b1b; }
      `}</style>
    </BaseLayout>
  );
};

export default InteractionChecker;
