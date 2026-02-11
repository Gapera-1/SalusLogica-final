import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";

const InteractionChecker = ({ setIsAuthenticated, setUser, user }) => {
  const [medicines, setMedicines] = useState([
    { id: 1, name: "Aspirin", dosage: "100mg", category: "NSAID" },
    { id: 2, name: "Metformin", dosage: "500mg", category: "Antidiabetic" },
    { id: 3, name: "Lisinopril", dosage: "10mg", category: "ACE Inhibitor" },
    { id: 4, name: "Atorvastatin", dosage: "20mg", category: "Statin" },
    { id: 5, name: "Vitamin D", dosage: "1000 IU", category: "Supplement" },
    { id: 6, name: "Warfarin", dosage: "5mg", category: "Anticoagulant" },
    { id: 7, name: "Ibuprofen", dosage: "400mg", category: "NSAID" },
    { id: 8, name: "Amoxicillin", dosage: "500mg", category: "Antibiotic" }
  ]);
  
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading medicines
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
      alert("Please select at least 2 medications to check for interactions");
      return;
    }

    setChecking(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock interaction results
    const mockResults = {
      overallRisk: getOverallRisk(selectedMedicines),
      interactions: getMockInteractions(selectedMedicines),
      allergies: [],
      contraindications: []
    };
    
    setResults(mockResults);
    setChecking(false);
  };

  const getOverallRisk = (selectedIds) => {
    const selectedMedNames = selectedIds.map(id => 
      medicines.find(m => m.id === id)?.name
    );
    
    // Mock risk assessment logic
    if (selectedMedNames.includes("Warfarin") && selectedMedNames.includes("Aspirin")) {
      return { level: "HIGH", message: "High risk of bleeding", color: "risk-high" };
    } else if (selectedMedNames.includes("Ibuprofen") && selectedMedNames.includes("Aspirin")) {
      return { level: "MODERATE", message: "Moderate risk of stomach irritation", color: "risk-moderate" };
    } else if (selectedMedNames.includes("Metformin") && selectedMedNames.includes("Ibuprofen")) {
      return { level: "CAUTION", message: "Use with caution - monitor kidney function", color: "risk-caution" };
    } else {
      return { level: "SAFE", message: "No significant interactions detected", color: "risk-safe" };
    }
  };

  const getMockInteractions = (selectedIds) => {
    const selectedMedNames = selectedIds.map(id => 
      medicines.find(m => m.id === id)?.name
    );
    
    const interactions = [];
    
    if (selectedMedNames.includes("Warfarin") && selectedMedNames.includes("Aspirin")) {
      interactions.push({
        id: 1,
        medicines: ["Warfarin", "Aspirin"],
        severity: "MAJOR",
        description: "Increased risk of bleeding when used together",
        recommendation: "Consider alternative pain reliever or adjust warfarin dosage",
        mechanism: "Both medications affect blood clotting"
      });
    }
    
    if (selectedMedNames.includes("Ibuprofen") && selectedMedNames.includes("Aspirin")) {
      interactions.push({
        id: 2,
        medicines: ["Ibuprofen", "Aspirin"],
        severity: "MODERATE",
        description: "Increased risk of gastrointestinal side effects",
        recommendation: "Take with food and monitor for stomach pain",
        mechanism: "Both can irritate stomach lining"
      });
    }
    
    if (selectedMedNames.includes("Metformin") && selectedMedNames.includes("Ibuprofen")) {
      interactions.push({
        id: 3,
        medicines: ["Metformin", "Ibuprofen"],
        severity: "MINOR",
        description: "Potential impact on kidney function",
        recommendation: "Monitor kidney function tests regularly",
        mechanism: "Ibuprofen may affect kidney clearance of metformin"
      });
    }
    
    return interactions;
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
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading medication database...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Medication Interaction Checker</h1>
          <p className="mt-2 text-gray-600">
            Check for drug interactions, allergy alerts, and contraindications to ensure medication safety
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Medicine Selection */}
          <div className="lg:col-span-2">
            {/* Medicine Selection */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Medications</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose medications to check for interactions
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
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{medicine.name}</div>
                          <div className="text-xs text-gray-500">{medicine.dosage} • {medicine.category}</div>
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
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium disabled:cursor-not-allowed"
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
