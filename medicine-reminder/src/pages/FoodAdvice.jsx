import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/BaseLayout';
import { useLanguage } from '../i18n';
import { medicineAPI, safetyAPI } from '../services/api';

const FoodAdvice = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [foodAdvice, setFoodAdvice] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMedicinesWithFoodAdvice();
  }, []);

  const loadMedicinesWithFoodAdvice = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load medicines and food advice from backend in parallel
      const [medicinesResponse, foodAdviceResponse] = await Promise.all([
        medicineAPI.getAll(),
        safetyAPI.foodAdvice()
      ]);
      
      const medicineList = medicinesResponse.results || medicinesResponse || [];
      setMedicines(medicineList);
      
      // Backend returns food_advice map
      const adviceData = foodAdviceResponse.food_advice || {};
      
      // Merge backend advice with generated advice for medicines without data
      const fullAdvice = {};
      medicineList.forEach(medicine => {
        if (adviceData[medicine.id]) {
          fullAdvice[medicine.id] = adviceData[medicine.id];
        } else {
          // Generate advice for medicines without backend data
          fullAdvice[medicine.id] = generateFoodAdvice(medicine);
        }
      });
      
      setFoodAdvice(fullAdvice);
    } catch (err) {
      console.error('Failed to load medicines:', err);
      setError(err.message || 'Failed to load food advice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateFoodAdvice = (medicine) => {
    const advice = {
      medicine_name: medicine.name,
      foods_to_avoid: [],
      foods_advised: [],
      general_advice: [],
      timing_advice: []
    };

    // Use medicine's stored food data if available
    if (medicine.food_to_avoid && medicine.food_to_avoid.length > 0) {
      advice.foods_to_avoid = medicine.food_to_avoid;
    }
    
    if (medicine.food_advised && medicine.food_advised.length > 0) {
      advice.foods_advised = medicine.food_advised;
    }

    const medicineName = medicine.name.toLowerCase();
    
    // Common food interactions by medicine category
    const foodInteractions = {
      'antibiotics': {
        avoid: ['dairy products', 'calcium-fortified foods', 'iron supplements'],
        advised: ['probiotic foods', 'light meals'],
        timing: 'Take 1 hour before or 2 hours after meals'
      },
      'blood thinners': {
        avoid: ['vitamin K-rich foods', 'leafy greens', 'broccoli', 'spinach', 'kale'],
        advised: ['consistent vitamin K intake'],
        timing: 'Maintain consistent diet'
      },
      'nsaids': {
        avoid: ['alcohol', 'spicy foods', 'caffeine'],
        advised: ['take with food', 'milk or antacids'],
        timing: 'Take with food to reduce stomach irritation'
      },
      'statins': {
        avoid: ['grapefruit', 'grapefruit juice', 'pomelo'],
        advised: ['avoid grapefruit products'],
        timing: 'Take at night, avoid grapefruit for 12 hours'
      },
      'thyroid medications': {
        avoid: ['soy products', 'high-fiber foods', 'iron supplements'],
        advised: ['separate medication and food intake by 4 hours'],
        timing: 'Take on empty stomach'
      }
    };

    // Determine medicine category based on name
    let category = null;
    if (medicineName.includes('antibiotic') || medicineName.includes('amoxicillin') || medicineName.includes('doxycycline') || medicineName.includes('azithromycin')) {
      category = 'antibiotics';
    } else if (medicineName.includes('warfarin') || medicineName.includes('coumadin') || medicineName.includes('heparin')) {
      category = 'blood thinners';
    } else if (medicineName.includes('aspirin') || medicineName.includes('ibuprofen') || medicineName.includes('naproxen') || medicineName.includes('diclofenac')) {
      category = 'nsaids';
    } else if (medicineName.includes('statin') || medicineName.includes('atorvastatin') || medicineName.includes('simvastatin')) {
      category = 'statins';
    } else if (medicineName.includes('levothyroxine') || medicineName.includes('synthroid')) {
      category = 'thyroid medications';
    }

    // Apply category-specific advice
    if (foodInteractions[category]) {
      advice.foods_to_avoid = foodInteractions[category].avoid;
      advice.foods_advised = foodInteractions[category].advised;
      advice.timing_advice = [foodInteractions[category].timing];
    }

    // Add medicine-specific advice from database
    if (medicine.food_to_avoid && medicine.food_to_avoid.length > 0) {
      advice.foods_to_avoid = [...new Set([...advice.foods_to_avoid, ...medicine.food_to_avoid])];
    }
    
    if (medicine.food_advised && medicine.food_advised.length > 0) {
      advice.foods_advised = [...new Set([...advice.foods_advised, ...medicine.food_advised])];
    }

    // Generate general advice
    advice.general_advice = [
      'Always take medications with a full glass of water unless otherwise directed',
      'Store medications at room temperature away from moisture and heat',
      'Keep a medication diary to track effectiveness and side effects',
      'Consult your pharmacist if you experience unusual symptoms'
    ];

    if (medicine.instructions) {
      advice.general_advice.push(`Follow specific instructions: ${medicine.instructions}`);
    }

    return advice;
  };

  const getFoodIcon = (food) => {
    const foodIcons = {
      'dairy': '🥛',
      'citrus': '🍊',
      'leafy greens': '🥬',
      'grapefruit': '🍊',
      'alcohol': '🍷',
      'spicy': '🌶',
      'caffeine': '☕',
      'soy': '🥜',
      'fiber': '🌾',
      'iron': '🩸'
    };
    
    const foodLower = food.toLowerCase();
    for (const [key, icon] of Object.entries(foodIcons)) {
      if (foodLower.includes(key)) {
        return icon;
      }
    }
    return '🍽';
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div>
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="animate-spin h-10 w-10 border-4 border-teal-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading food advice for your medicines...</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  if (error) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-3 block">⚠️</span>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Food Advice</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadMedicinesWithFoodAdvice}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div>
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍽 {t("foodAdvice.title") || "Food & Medicine Interactions"}
          </h1>
          <p className="text-gray-600">
            {t("foodAdvice.foodRecommendations", { drug: "medications" }) || "Learn what foods to avoid or include when taking your medications."}
          </p>
        </div>

        {/* No medicines message */}
        {medicines.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <span className="text-4xl mb-3 block">💊</span>
            <h3 className="text-lg font-medium text-yellow-800 mb-2">No Medicines Found</h3>
            <p className="text-yellow-600 mb-4">Add medicines to see food interaction advice.</p>
            <button
              onClick={() => navigate('/add-medicine')}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              + Add Medicine
            </button>
          </div>
        ) : (
          /* Food Advice Display */
          <div className="space-y-6">
            {medicines.map(medicine => {
              const advice = foodAdvice[medicine.id];
              if (!advice) return null;

              return (
                <div key={medicine.id} className="bg-white rounded-lg shadow-lg p-6">
                  {/* Header */}
                  <div className="flex items-center mb-4 pb-4 border-b">
                    <span className="text-3xl mr-3">💊</span>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {medicine.name}
                      </h2>
                      <p className="text-gray-600">{medicine.dosage} • {medicine.frequency}</p>
                    </div>
                  </div>

                  {/* Foods to Avoid */}
                  {advice.foods_to_avoid && advice.foods_to_avoid.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-red-600 mb-3">
                        🚫 Foods to Avoid
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {advice.foods_to_avoid.map((food, index) => (
                          <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <span className="text-2xl mr-2">{getFoodIcon(food)}</span>
                            <div>
                              <p className="font-medium text-red-800">{food}</p>
                              <p className="text-xs text-red-600">Avoid while taking this medication</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Foods */}
                  {advice.foods_advised && advice.foods_advised.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-green-600 mb-3">
                        ✅ Recommended Foods
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {advice.foods_advised.map((food, index) => (
                          <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                            <span className="text-2xl mr-2">{getFoodIcon(food)}</span>
                            <div>
                              <p className="font-medium text-green-800">{food}</p>
                              <p className="text-xs text-green-600">Recommended with this medication</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timing Advice */}
                  {advice.timing_advice && advice.timing_advice.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-teal-600 mb-3">
                        ⏰ Timing Instructions
                      </h3>
                      <div className="space-y-2">
                        {advice.timing_advice.map((timing, index) => (
                          <div key={index} className="flex items-start p-3 bg-teal-50 rounded-lg border border-teal-200">
                            <span className="text-xl mr-3">⏰</span>
                            <p className="font-medium text-teal-800">{timing}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Advice */}
                  {advice.general_advice && advice.general_advice.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        📋 General Guidelines
                      </h3>
                      <div className="space-y-2">
                        {advice.general_advice.map((tip, index) => (
                          <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                            <span className="text-xl mr-3">💡</span>
                            <p className="text-gray-700">{tip}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No advice available message */}
                  {(!advice.foods_to_avoid || advice.foods_to_avoid.length === 0) &&
                   (!advice.foods_advised || advice.foods_advised.length === 0) &&
                   (!advice.timing_advice || advice.timing_advice.length === 0) && (
                    <div className="text-center py-6 bg-gray-50 rounded-lg">
                      <span className="text-4xl mb-3 block">✅</span>
                      <p className="text-gray-600">No specific food restrictions for this medicine.</p>
                      <p className="text-sm text-gray-500 mt-2">Take as directed by your healthcare provider.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Educational Content */}
        <div className="bg-teal-50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-teal-900 mb-4">
            🎓 Understanding Food-Drug Interactions
          </h3>
          <div className="text-teal-800 space-y-3">
            <p>
              Food can significantly affect how your body absorbs and processes medications. 
              Some foods can enhance drug effectiveness, while others may reduce it or cause side effects.
            </p>
            <p className="font-semibold">Key Principles:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Take medications at consistent times relative to meals</li>
              <li>Separate food and medication by recommended time intervals</li>
              <li>Avoid foods that are known to interact with your specific medications</li>
              <li>Stay hydrated with water unless otherwise directed</li>
              <li>Consult healthcare providers for personalized dietary recommendations</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => navigate('/medicine-list')}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back to Medicines
          </button>
          <button
            onClick={() => navigate('/safety-check')}
            className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            Run Safety Check
          </button>
        </div>
      </div>
    </BaseLayout>
  );
};

export default FoodAdvice;
