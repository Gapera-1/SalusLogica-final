import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI, safetyAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const SafetyCheck = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    selectedPopulation: 'young',
    selectedMedicines: [],
  });
  const [results, setResults] = useState(null);

  const populations = [
    { label: t('safetyCheck.young'), value: 'young' },
    { label: t('safetyCheck.pregnant'), value: 'pregnant' },
    { label: t('safetyCheck.elderly'), value: 'elderly' },
    { label: t('safetyCheck.extreme'), value: 'extreme' },
  ];

  const availableMedicines = [
    'Aspirin',
    'Vitamin D',
    'Lisinopril',
    'Metformin',
    'Ibuprofen',
    'Amoxicillin',
  ];

  const handleMedicineToggle = (medicine) => {
    setFormData(prev => ({
      ...prev,
      selectedMedicines: prev.selectedMedicines.includes(medicine)
        ? prev.selectedMedicines.filter(m => m !== medicine)
        : [...prev.selectedMedicines, medicine]
    }));
  };

  const handleCheckSafety = async () => {
    if (formData.selectedMedicines.length < 2) {
      Alert.alert(t('common.error'), t('interactionChecker.selectAtLeast2'));
      return;
    }

    setLoading(true);
    try {
      const response = await safetyAPI.safetyCheck(
        formData.selectedMedicines[0],
        formData.selectedPopulation,
      );
      
      setResults(response.data || response);
    } catch (error) {
      logError('SafetyCheck.handleCheckSafety', error);
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

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('safetyCheck.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('safetyCheck.clinicalValidation', { drug: 'Selected Medicines' })}</Text>
        </View>

        {/* Population Selection */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('safetyCheck.selectPopulation')}</Text>
          </View>
          <View style={styles.populationGrid}>
            {populations.map((population) => (
              <TouchableOpacity
                key={population.value}
                style={[
                  styles.populationOption,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  formData.selectedPopulation === population.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setFormData(prev => ({ ...prev, selectedPopulation: population.value }))}
              >
                <Text style={[styles.populationText, { color: formData.selectedPopulation === population.value ? '#ffffff' : colors.text }]}>{population.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Medicine Selection */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('safetyCheck.selectMedicines')}</Text>
          </View>
          <View style={styles.medicineGrid}>
            {availableMedicines.map((medicine) => (
              <TouchableOpacity
                key={medicine}
                style={[
                  styles.medicineOption,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  formData.selectedMedicines.includes(medicine) && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => handleMedicineToggle(medicine)}
              >
                <Text style={[styles.medicineText, { color: formData.selectedMedicines.includes(medicine) ? '#ffffff' : colors.text }]}>{medicine}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Check Button */}
        <Button
          mode="contained"
          onPress={handleCheckSafety}
          loading={loading}
          disabled={formData.selectedMedicines.length < 2}
          style={styles.checkButton}
          buttonColor={colors.primary}
          icon="shield-check"
        >
          {t('safetyCheck.checkSafety')}
        </Button>

        {/* Results */}
        {results && (
          <Card style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('interactionChecker.interactionResults')}</Text>
            </View>
            
            {/* Interactions */}
            {results.interactions && results.interactions.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>{t('safetyCheck.interactions')}</Text>
                {results.interactions.map((interaction, index) => (
                  <View key={index} style={styles.interactionItem}>
                    <Text style={[styles.interactionMedicines, { color: colors.text }]}>
                      {interaction.medicines.join(' + ')}
                    </Text>
                    <View style={styles.interactionDetails}>
                      <Text style={[styles.severityLabel, { color: colors.textSecondary }]}>{t('interactionChecker.severity')}: </Text>
                      <Text style={[styles.severityValue, { color: getSeverityColor(interaction.severity) }]}>
                        {interaction.severity}
                      </Text>
                      <Text style={[styles.description, { color: colors.text }]}>{interaction.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Contraindications */}
            {results.contraindications && results.contraindications.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>{t('safetyCheck.contraindications')}</Text>
                {results.contraindications.map((contraindication, index) => (
                  <View key={index} style={styles.contraindicationItem}>
                    <Text style={styles.contraindicationText}>{contraindication}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Warnings */}
            {results.warnings && results.warnings.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>{t('safetyCheck.warnings')}</Text>
                {results.warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Text style={styles.warningText}>⚠️ {warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Risk Assessment */}
            {results.riskAssessment && (
              <View style={styles.resultSection}>
                <Text style={[styles.resultTitle, { color: colors.text }]}>{t('interactionChecker.riskLevel')}</Text>
                <View style={[styles.riskContainer, { backgroundColor: colors.border }]}>
                  <Text style={[
                    styles.riskLevel,
                    { color: getRiskLevelColor(results.riskAssessment.level) }
                  ]}>
                    {results.riskAssessment.level}
                  </Text>
                  <Text style={styles.riskDescription}>{results.riskAssessment.description}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  populationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  populationOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    minWidth: 100,
  },
  selectedPopulation: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  populationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
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
  resultSection: {
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  interactionItem: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  interactionMedicines: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  interactionDetails: {
    marginLeft: 8,
  },
  severityLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  severityValue: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    color: '#374151',
  },
  contraindicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  contraindicationText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#d97706',
    flex: 1,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  riskLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 12,
  },
  riskDescription: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});

export default SafetyCheck;
