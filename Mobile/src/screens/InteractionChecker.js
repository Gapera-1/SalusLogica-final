import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI, interactionAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const InteractionChecker = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [selectedMedicines, setSelectedMedicines] = useState([]);
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
      logError('InteractionChecker.loadMedicines', error);
    }
  };

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
      const response = await interactionAPI.check(selectedMedicines);
      setResults(response.data || response);
    } catch (error) {
      logError('InteractionChecker.handleCheckInteractions', error);
      const errorMessage = getErrorMessage(error, t);
      Alert.alert(t('common.error'), errorMessage);
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
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('interactionChecker.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('interactionChecker.checkSafety')}</Text>
        </View>

        {/* Medicine Selection */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.headerRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('interactionChecker.chooseToCheck')}</Text>
              <TouchableOpacity onPress={clearSelection} style={[styles.clearButton, { backgroundColor: colors.border }]}>
                <Text style={[styles.clearText, { color: colors.text }]}>{t('common.clear')}</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.medicineGrid}>
            {availableMedicines.map((medicine) => (
              <TouchableOpacity
                key={medicine}
                style={[
                  styles.medicineOption,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedMedicines.includes(medicine) && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => handleMedicineToggle(medicine)}
              >
                <Text style={[styles.medicineText, { color: selectedMedicines.includes(medicine) ? '#ffffff' : colors.text }]}>{medicine}</Text>
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
          buttonColor={colors.primary}
          icon="shield-check"
        >
          {t('interactionChecker.checkInteractions')}
        </Button>

        {/* Results */}
        {results && (
          <Card style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('interactionChecker.interactionResults')} ({selectedMedicines.length} {t('interactionChecker.interaction')})
              </Text>
            </View>

            {/* No Interactions */}
            {results.interactions && results.interactions.length === 0 && (
              <View style={styles.noInteractionsSection}>
                <Text style={[styles.noInteractionsText, { color: colors.success }]}>{t('interactionChecker.noInteractions')}</Text>
                <Text style={[styles.noInteractionsSubtext, { color: colors.textSecondary }]}>
                  {selectedMedicines.join(' + ')} {t('interactionChecker.noInteractions')}
                </Text>
              </View>
            )}

            {/* Interactions List */}
            {results.interactions && results.interactions.length > 0 && (
              <View style={styles.interactionsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('interactionChecker.interactions')}</Text>
                {results.interactions.map((interaction, index) => (
                  <View key={index} style={styles.interactionItem}>
                    <View style={styles.interactionHeader}>
                      <Text style={[styles.interactionMedicines, { color: colors.text }]}>
                        {interaction.medicines.join(' ↔ ')}
                      </Text>
                      <View style={styles.severityContainer}>
                        <Text style={[styles.severityLabel, { color: colors.textSecondary }]}>{t('interactionChecker.severity')}: </Text>
                        <Text style={[styles.severityValue, { color: getSeverityColor(interaction.severity) }]}>
                          {interaction.severity}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.interactionDescription, { color: colors.text }]}>{interaction.description}</Text>
                    <View style={[styles.recommendationContainer, { backgroundColor: colors.background }]}>
                      <Text style={[styles.recommendationLabel, { color: colors.text }]}>{t('interactionChecker.recommendation')}: </Text>
                      <Text style={[styles.recommendationText, { color: colors.text }]}>{interaction.recommendation}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Overall Risk Assessment */}
            {results.overallRisk && (
              <View style={styles.riskSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('interactionChecker.riskLevel')}</Text>
                <View style={[styles.overallRiskContainer, { backgroundColor: colors.border }]}>
                  <View style={[styles.riskIndicator, { backgroundColor: colors.surface }]}>
                    <Text style={[
                      styles.riskLevel,
                      { color: getRiskLevelColor(results.overallRisk.level) }
                    ]}>
                      {results.overallRisk.level}
                    </Text>
                  </View>
                  <View style={styles.riskDetails}>
                    <Text style={[styles.riskDescription, { color: colors.text }]}>{results.overallRisk.description}</Text>
                    <Text style={[styles.riskAdvice, { color: colors.textSecondary }]}>{results.overallRisk.advice}</Text>
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
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
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
