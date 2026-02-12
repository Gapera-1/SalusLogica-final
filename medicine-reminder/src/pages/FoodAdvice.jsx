import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/BaseLayout';
import { useLanguage } from '../i18n';
import { medicineAPI } from '../services/api';

const FoodAdvice = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [foodAdvice, setFoodAdvice] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMedicinesWithFoodAdvice();
  }, []);

  const loadMedicinesWithFoodAdvice = async () => {
    try {
      const response = await medicineAPI.getAll();
      const medicines = response.data || [];
      setMedicines(medicines);
      
      // Generate food advice for each medicine
      const adviceMap = {};
      medicines.forEach(medicine => {
        adviceMap[medicine.id] = generateFoodAdvice(medicine);
      });
      
      setFoodAdvice(adviceMap);
    } catch (error) {
      console.error('Failed to load medicines:', error);
    }
  };

  const generateFoodAdvice = (medicine) => {
    const advice = {
      foods_to_avoid: [],
      foods_advised: [],
      general_advice: [],
      timing_advice: []
    };

    // Generate advice based on medicine type and common interactions
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
    let category = 'general';
    if (medicineName.includes('antibiotic') || medicineName.includes('amoxicillin') || medicineName.includes('doxycycline')) {
      category = 'antibiotics';
    } else if (medicineName.includes('warfarin') || medicineName.includes('coumadin')) {
      category = 'blood thinners';
    } else if (medicineName.includes('aspirin') || medicineName.includes('ibuprofen') || medicineName.includes('naproxen')) {
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

  return (
    <BaseLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🍽 {t("foodAdvice.title")}
          </h1>
          <p className="text-gray-600 mb-6">
            {t("foodAdvice.foodRecommendations", { drug: "medications" })}
          </p>
        </div>

        {/* Medicine Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t("foodAdvice.selectMedicine")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {medicines.map(medicine => (
              <div key={medicine.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">
                  💊 {medicine.name}
                </h3>
                <p className="text-sm text-gray-600 mb-3">{medicine.dosage}</p>
                <p className="text-sm text-gray-600 mb-4">{medicine.frequency}</p>
                
                <button
                  onClick={() => setFoodAdvice(prev => ({
                    ...prev,
                    [medicine.id]: generateFoodAdvice(medicine)
                  }))}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
                >
                  {t("foodAdvice.selectMedicine")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Food Advice Display */}
        {Object.keys(foodAdvice).length > 0 && (
          <div className="space-y-6">
            {Object.entries(foodAdvice).map(([medicineId, advice]) => {
              const medicine = medicines.find(m => m.id === parseInt(medicineId));
              if (!medicine) return null;

              return (
                <div key={medicineId} className="bg-white rounded-lg shadow-lg p-6">
                  {/* Header */}
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-3">💊</span>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {medicine.name} - {t("foodAdvice.foodInteractions")}
                      </h2>
                      <p className="text-gray-600">{medicine.dosage} • {medicine.frequency}</p>
                    </div>
                  </div>

                  {/* Foods to Avoid */}
                  {advice.foods_to_avoid.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-red-600 mb-3">
                        🚫 {t("foodAdvice.foodsToAvoid") || "Foods to Avoid"}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {advice.foods_to_avoid.map((food, index) => (
                          <div key={index} className="flex items-center p-3 bg-red-50 rounded-lg border border-red-200">
                            <span className="text-2xl mr-2">{getFoodIcon(food)}</span>
                            <div>
                              <p className="font-medium text-red-800">{food}</p>
                              <p className="text-sm text-red-600">Avoid while taking this medication</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Foods */}
                  {advice.foods_advised.length > 0 && (
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
                              <p className="text-sm text-green-600">Recommended with this medication</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timing Advice */}
                  {advice.timing_advice.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-blue-600 mb-3">
                        ⏰ Timing Instructions
                      </h3>
                      <div className="space-y-2">
                        {advice.timing_advice.map((timing, index) => (
                          <div key={index} className="flex items-start p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <span className="text-xl mr-3">⏰</span>
                            <div>
                              <p className="font-medium text-blue-800">{timing}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Advice */}
                  <div className="mb-6">
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
                </div>
              );
            })}
          </div>
        )}

        {/* Educational Content */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            🎓 Understanding Food-Drug Interactions
          </h3>
          <div className="prose text-blue-800 space-y-3">
            <p>
              Food can significantly affect how your body absorbs and processes medications. 
              Some foods can enhance drug effectiveness, while others may reduce it or cause side effects.
            </p>
            <p>
              <strong>Key Principles:</strong>
            </p>
            <ul className="list-disc list-inside space-y-2 ml-6">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-300"
          >
            Back to Medicines
          </button>
          <button
            onClick={() => navigate('/safety-check')}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            Run Safety Check
          </button>
        </div>
      </div>
    </BaseLayout>
  );
};

export default FoodAdvice;
