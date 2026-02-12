import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Checkbox } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI } from '../services/apiService';

const InteractionChecker = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
  const [results, setResults] = useState(null);

  const availableMedicines = [
    'Aspirin',
    'Vitamin D',
    'Lisinopril',
    'Metformin',
    'Ibuprofen',
    'Amoxicillin',
    'Warfarin',
    'Lipitor',
    'Metoprolol',
  ];

  const handleMedicineToggle = (medicine) => {
    setSelectedMedicines(prev => {
      if (prev.includes(medicine)) {
        return prev.filter(m => m !== medicine);
      } else {
        return [...prev, medicine];
      }
    });
  };

  const handleCheckInteractions = async () => {
    if (selectedMedicines.length < 2) {
      Alert.alert(t('common.error'), t('interactionChecker.selectAtLeast2'));
      return;
    }

    setLoading(true);
    try {
      const response = await medicineAPI.checkInteractions(selectedMedicines);
      setResults(response.data);
    } catch (error) {
      console.error('Interaction check failed:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High': return '#dc2626';
      case 'Moderate': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getRiskLevelColor = (risk) => {
    switch (risk) {
      case 'High': return '#dc2626';
      case 'Moderate': return '#f59e0b';
      case 'Low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const clearSelection = () => {
    setSelectedMedicines([]);
    setResults(null);
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
          <Text style={styles.title}>{t('interactionChecker.title')}</Text>
          <Text style={styles.subtitle}>{t('interactionChecker.checkSafety')}</Text>
        </View>

        {/* Medicine Selection */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>{t('interactionChecker.chooseToCheck')}</Text>
              <TouchableOpacity onPress={clearSelection} style={styles.clearButton}>
                <Text style={styles.clearText}>{t('common.clear')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.medicineGrid}>
            {availableMedicines.map((medicine) => (
              <TouchableOpacity
                key={medicine}
                style={[
                  styles.medicineOption,
                  selectedMedicines.includes(medicine) && styles.selectedMedicine
                ]}
                onPress={() => handleMedicineToggle(medicine)}
              >
                <Text style={styles.medicineText}>{medicine}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Check Button */}
        <Button
          mode="contained"
          onPress={handleCheckInteractions}
          loading={loading}
          disabled={selectedMedicines.length < 2}
          style={styles.checkButton}
          icon="shield-check"
        >
          {t('interactionChecker.checkInteractions')}
        </Button>

        {/* Results */}
        {results && (
          <Card style={styles.resultsCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>
                {t('interactionChecker.interactionResults')} ({selectedMedicines.length} {t('interactionChecker.interaction')})
              </Text>
            </View>

            {/* No Interactions */}
            {results.interactions && results.interactions.length === 0 && (
              <View style={styles.noInteractionsSection}>
                <Text style={styles.noInteractionsText}>{t('interactionChecker.noInteractions')}</Text>
                <Text style={styles.noInteractionsSubtext}>
                  {selectedMedicines.join(' + ')} {t('interactionChecker.noInteractions')}
                </Text>
              </View>
            )}

            {/* Interactions List */}
            {results.interactions && results.interactions.length > 0 && (
              <View style={styles.interactionsSection}>
                <Text style={styles.sectionTitle}>{t('interactionChecker.interactions')}</Text>
                {results.interactions.map((interaction, index) => (
                  <View key={index} style={styles.interactionItem}>
                    <View style={styles.interactionHeader}>
                      <Text style={styles.interactionMedicines}>
                        {interaction.medicines.join(' ↔ ')}
                      </Text>
                      <View style={styles.severityContainer}>
                        <Text style={styles.severityLabel}>{t('interactionChecker.severity')}: </Text>
                        <Text style={[styles.severityValue, { color: getSeverityColor(interaction.severity) }]}>
                          {interaction.severity}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.interactionDescription}>{interaction.description}</Text>
                    <View style={styles.recommendationContainer}>
                      <Text style={styles.recommendationLabel}>{t('interactionChecker.recommendation')}: </Text>
                      <Text style={styles.recommendationText}>{interaction.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Overall Risk Assessment */}
            {results.overallRisk && (
              <View style={styles.riskSection}>
                <Text style={styles.sectionTitle}>{t('interactionChecker.riskLevel')}</Text>
                <View style={styles.overallRiskContainer}>
                  <View style={styles.riskIndicator}>
                    <Text style={[
                      styles.riskLevel,
                      { color: getRiskLevelColor(results.overallRisk.level) }
                    ]}>
                      {results.overallRisk.level}
                    </Text>
                  </View>
                  <View style={styles.riskDetails}>
                    <Text style={styles.riskDescription}>{results.overallRisk.description}</Text>
                    <Text style={styles.riskAdvice}>{results.overallRisk.advice}</Text>
                  </View>
                </View>
              </View>
            )}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  medicineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  medicineOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    minWidth: 100,
  },
  selectedMedicine: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  medicineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  checkButton: {
    marginVertical: 16,
  },
  resultsCard: {
    marginBottom: 16,
  },
  interactionsSection: {
    marginBottom: 20,
  },
  noInteractionsSection: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    marginBottom: 20,
  },
  noInteractionsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    textAlign: 'center',
    marginBottom: 8,
  },
  noInteractionsSubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  interactionItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  interactionMedicines: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  severityValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  interactionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  recommendationContainer: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  recommendationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 12,
    color: '#374151',
  },
  riskSection: {
    marginBottom: 20,
  },
  overallRiskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  riskIndicator: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riskLevel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  riskDetails: {
    flex: 1,
    marginLeft: 16,
  },
  riskDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  riskAdvice: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default InteractionChecker;
