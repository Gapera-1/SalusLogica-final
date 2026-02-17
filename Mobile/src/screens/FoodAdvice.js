import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI, safetyAPI } from '../services/api';

const FoodAdvice = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [results, setResults] = useState(null);

  const [availableMedicines, setAvailableMedicines] = useState([]);

  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    try {
      const medicines = await medicineAPI.getAll();
      const names = (medicines || []).map(m => m.name || m.medicine_name);
      setAvailableMedicines(names);
    } catch (error) {
      console.error('Failed to load medicines:', error);
    }
  };

  const handleMedicineSelect = async (medicine) => {
    if (!medicine) return;
    
    setLoading(true);
    try {
      const response = await safetyAPI.foodAdvice();
      setResults(response.data || response);
      setSelectedMedicine(medicine);
    } catch (error) {
      console.error('Failed to get food advice:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const getFoodInteractionIcon = (interaction) => {
    switch (interaction) {
      case 'with_food': return '🍽️';
      case 'without_food': return '🚫';
      case 'anytime': return '⏰';
      default: return '❓';
    }
  };

  const getInteractionColor = (interaction) => {
    switch (interaction) {
      case 'with_food': return '#10b981';
      case 'without_food': return '#f59e0b';
      case 'anytime': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('foodAdvice.title')}</Text>
          <Text style={styles.subtitle}>{t('foodAdvice.foodRecommendations', { drug: selectedMedicine || t('foodAdvice.selectMedicine') })}</Text>
        </View>

        {/* Medicine Selection */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>{t('foodAdvice.selectMedicine')}</Text>
          </View>
          <Picker
            selectedValue={selectedMedicine}
            onValueChange={handleMedicineSelect}
            style={styles.picker}
          >
            <Picker.Item label={t('foodAdvice.selectMedicine')} value="" />
            {availableMedicines.map((medicine) => (
              <Picker.Item key={medicine} label={medicine} value={medicine} />
            ))}
          </Picker>
        </Card>

        {/* Results */}
        {results && (
          <Card style={styles.resultsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>{t('foodAdvice.foodInteractions')}</Text>
            </View>
            
            {/* Main Interaction */}
            <View style={styles.interactionSection}>
              <View style={styles.interactionHeader}>
                <Text style={getInteractionIcon(results.mainInteraction)}>
                  {results.mainInteraction}
                </Text>
                <Text style={styles.interactionText}>
                  {t(`foodAdvice.${results.mainInteraction.toLowerCase().replace(' ', '')}`)}
                </Text>
              </View>
              <Text style={styles.interactionDescription}>
                {results.mainInteractionDescription}
              </Text>
            </View>

            {/* Detailed Recommendations */}
            <View style={styles.recommendationsSection}>
              <Text style={styles.recommendationsTitle}>{t('foodAdvice.recommendations')}</Text>
              
              {results.recommendations && results.recommendations.map((recommendation, index) => (
                <View key={index} style={styles.recommendationItem}>
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
              ))}
            </View>

            {/* Foods to Avoid */}
            {results.foodsToAvoid && results.foodsToAvoid.length > 0 && (
              <View style={styles.avoidSection}>
                <Text style={styles.avoidTitle}>{t('foodAdvice.foodsToAvoid')}</Text>
                <View style={styles.avoidList}>
                  {results.foodsToAvoid.map((food, index) => (
                    <View key={index} style={styles.avoidItem}>
                      <Text style={styles.avoidText}>🚫 {food}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Timing Recommendations */}
            <View style={styles.timingSection}>
              <Text style={styles.timingTitle}>{t('foodAdvice.timingRecommendations')}</Text>
              
              <View style={styles.timingOptions}>
                <View style={styles.timingOption}>
                  <Text style={[styles.timingText, { color: getInteractionColor('with_food') }]}>
                    🍽️ {t('foodAdvice.withFood')}
                  </Text>
                  <Text style={styles.timingDescription}>{results.timing?.withFood || t('foodAdvice.takeWithMeal')}</Text>
                </View>

                <View style={styles.timingOption}>
                  <Text style={[styles.timingText, { color: getInteractionColor('without_food') }]}>
                    🚫 {t('foodAdvice.withoutFood')}
                  </Text>
                  <Text style={styles.timingDescription}>{results.timing?.withoutFood || t('foodAdvice.takeOnEmptyStomach')}</Text>
                </View>

                <View style={styles.timingOption}>
                  <Text style={[styles.timingText, { color: getInteractionColor('anytime') }]}>
                    ⏰ {t('foodAdvice.anytime')}
                  </Text>
                  <Text style={styles.timingDescription}>{results.timing?.anytime || t('foodAdvice.noTimingRestrictions')}</Text>
                </View>
              </View>
            </View>
          </Card>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  picker: {
    height: 50,
  },
  resultsCard: {
    marginBottom: 16,
  },
  interactionSection: {
    marginBottom: 20,
  },
  interactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  interactionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  interactionDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  avoidSection: {
    marginBottom: 20,
  },
  avoidTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 12,
  },
  avoidList: {
    gap: 8,
  },
  avoidItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  avoidText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
  timingSection: {
    marginBottom: 20,
  },
  timingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  timingOptions: {
    gap: 12,
  },
  timingOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timingText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  timingDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
});

export default FoodAdvice;
