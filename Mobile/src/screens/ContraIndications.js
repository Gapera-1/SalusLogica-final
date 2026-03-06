import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { safetyAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const ContraIndications = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    if (!medicineName.trim()) {
      Alert.alert(t('common.error'), t('contraIndications.enterMedicineName'));
      return;
    }

    setLoading(true);
    try {
      const response = await safetyAPI.contraindications(medicineName);
      setResults(response.data || response);
    } catch (error) {
      logError('ContraIndications.handleSearch', error);
      const errorMessage = getErrorMessage(error, t);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Absolute': return '#dc2626';
      case 'Major': return '#f59e0b';
      case 'Moderate': return '#f97316';
      case 'Minor': return '#fbbf24';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Pregnancy': return '🤰';
      case 'Breastfeeding': return '🤱';
      case 'Pediatrics': return '👶';
      case 'Geriatrics': return '👴';
      case 'Renal Impairment': return '🪱';
      case 'Hepatic Impairment': return '🪱';
      case 'Cardiovascular': return '❤️';
      default: return '⚠️';
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('contraIndications.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('contraIndications.loadingInformation')}</Text>
        </View>

        {/* Search */}
        <Card style={[styles.searchCard, { backgroundColor: colors.surface }]}>
          <View style={styles.searchContainer}>
            <TextInput
              label={t('contraIndications.enterMedicineName')}
              value={medicineName}
              onChangeText={setMedicineName}
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              placeholder={t('contraIndications.searchPlaceholder')}
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={() => {}}
            />
            <Button
              mode="contained"
              onPress={handleSearch}
              loading={loading}
              style={styles.searchButton}
              buttonColor={colors.primary}
              icon="magnify"
            >
              {t('contraIndications.search')}
            </Button>
          </View>
        </Card>

        {/* Results */}
        {results && (
          <Card style={[styles.resultsCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('contraIndications.contraIndicationsSection')} - {results.medicineName}
              </Text>
            </View>

            {/* Contraindications List */}
            {results.contraindications && results.contraindications.length > 0 && (
              <View style={styles.contraindicationsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contraIndications.contraIndicationsSection')}</Text>
                {results.contraindications.map((contraIndication, index) => (
                  <View key={index} style={styles.contraindicationItem}>
                    <View style={styles.contraindicationHeader}>
                      <View style={styles.severityContainer}>
                        <Text style={[styles.severityLabel, { color: colors.textSecondary }]}>{t('interactionChecker.severity')}: </Text>
                        <Text style={[styles.severityValue, { color: getSeverityColor(contraIndication.severity) }]}>
                          {contraIndication.severity}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.categoryButton, { backgroundColor: colors.border }]}
                        onPress={() => Alert.alert(
                          `${getCategoryIcon(contraIndication.category)} ${contraIndication.category}`,
                          contraIndication.categoryDescription || t('contraIndications.noDescription')
                        )}
                      >
                        <Text style={styles.categoryText}>{getCategoryIcon(contraIndication.category)}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.contraindicationText}>{contraIndication.text}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Drug Interactions */}
            {results.drugInteractions && results.drugInteractions.length > 0 && (
              <View style={styles.interactionsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contraIndications.drugInteractions')}</Text>
                {results.drugInteractions.map((interaction, index) => (
                  <View key={index} style={styles.interactionItem}>
                    <View style={styles.interactionHeader}>
                      <Text style={[styles.interactionMedicines, { color: colors.text }]}>
                        {interaction.medicines.join(' + ')}
                      </Text>
                      <View style={styles.severityContainer}>
                        <Text style={[styles.severityLabel, { color: colors.textSecondary }]}>{t('interactionChecker.severity')}: </Text>
                        <Text style={[styles.severityValue, { color: getSeverityColor(interaction.severity) }]}>
                          {interaction.severity}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.interactionDescription, { color: colors.text }]}>{interaction.description}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Warnings */}
            {results.warnings && results.warnings.length > 0 && (
              <View style={styles.warningsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contraIndications.warnings')}</Text>
                {results.warnings.map((warning, index) => (
                  <View key={index} style={styles.warningItem}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>{warning}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Precautions */}
            {results.precautions && results.precautions.length > 0 && (
              <View style={styles.precautionsSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contraIndications.precautions')}</Text>
                {results.precautions.map((precaution, index) => (
                  <View key={index} style={styles.precautionItem}>
                    <Text style={styles.precautionIcon}>ℹ️</Text>
                    <Text style={styles.precautionText}>{precaution}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Monitoring Requirements */}
            {results.monitoring && results.monitoring.length > 0 && (
              <View style={styles.monitoringSection}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('contraIndications.monitoring')}</Text>
                {results.monitoring.map((item, index) => (
                  <View key={index} style={styles.monitoringItem}>
                    <Text style={[styles.monitoringText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
  searchCard: {
    marginBottom: 16,
  },
  searchContainer: {
    gap: 12,
  },
  searchInput: {
    marginBottom: 8,
  },
  searchButton: {
    alignSelf: 'flex-end',
  },
  resultsCard: {
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
  contraindicationsSection: {
    marginBottom: 20,
  },
  contraindicationItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  contraindicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
  categoryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 16,
  },
  contraindicationText: {
    fontSize: 14,
    color: '#dc2626',
    flex: 1,
    lineHeight: 20,
  },
  interactionsSection: {
    marginBottom: 20,
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
  interactionDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
    lineHeight: 20,
  },
  warningsSection: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#d97706',
    flex: 1,
  },
  precautionsSection: {
    marginBottom: 20,
  },
  precautionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
  },
  precautionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  precautionText: {
    fontSize: 14,
    color: '#115e59',
    flex: 1,
  },
  monitoringSection: {
    marginBottom: 20,
  },
  monitoringItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  monitoringText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
});

export default ContraIndications;
