import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Avatar, DataTable } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { doseAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const DoseHistory = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [doseHistory, setDoseHistory] = useState([]);
  const [filters, setFilters] = useState({
    medicine: 'all',
    status: 'all',
    dateRange: '7',
  });

  const medicines = [t('doseHistory.allMedicines'), t('doseHistory.aspirin'), t('doseHistory.vitaminD'), t('doseHistory.lisinopril')];
  const statuses = [t('doseHistory.allStatuses'), t('doseHistory.taken'), t('doseHistory.missed'), t('doseHistory.pending')];
  const dateRanges = [
    { label: t('doseHistory.last7Days'), value: '7' },
    { label: t('doseHistory.last30Days'), value: '30' },
    { label: t('doseHistory.last90Days'), value: '90' },
    { label: t('doseHistory.allTime'), value: 'all' },
  ];

  useEffect(() => {
    loadDoseHistory();
  }, [filters]);

  const loadDoseHistory = async () => {
    try {
      setLoading(true);
      // In a real app, this would call the API with filters
      const data = await doseAPI.getHistory(filters);
      setDoseHistory(data || []);
    } catch (error) {
      logError('DoseHistory.loadDoseHistory', error);
      const errorMessage = getErrorMessage(error, t);
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleMedicinePress = (medicine) => {
    Alert.alert(
      t('doseHistory.title'),
      `${t('doseHistory.medicineAboutDrug')}: ${medicine}`
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Taken': return '#10b981';
      case 'Missed': return '#ef4444';
      case 'Pending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('doseHistory.loadingHistory')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{t('doseHistory.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('doseHistory.subtitle')}</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>{t('doseHistory.backToMedicines')}</Text>
          </TouchableOpacity>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{doseHistory.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('doseHistory.totalDoses')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {doseHistory.filter(d => d.status === 'Taken').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('doseHistory.takenDoses')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {doseHistory.filter(d => d.status === 'Missed').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('doseHistory.missedDoses')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {doseHistory.filter(d => d.status === 'Pending').length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('doseHistory.pendingDoses')}</Text>
            </View>
          </Card>
        </View>

        {/* Filters */}
        <Card style={[styles.filterCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.filterHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>{t('doseHistory.filters')}</Text>
          </View>
          
          <View style={styles.filterRow}>
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{t('doseHistory.filterByMedicine')}</Text>
              <Picker
                selectedValue={filters.medicine}
                onValueChange={(value) => handleFilterChange('medicine', value)}
                style={styles.picker}
              >
                {medicines.map((medicine) => (
                  <Picker.Item key={medicine} label={medicine} value={medicine} />
                ))}
              </Picker>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{t('doseHistory.filterByStatus')}</Text>
              <Picker
                selectedValue={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
                style={styles.picker}
              >
                {statuses.map((status) => (
                  <Picker.Item key={status} label={status} value={status} />
                ))}
              </Picker>
            </View>

            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{t('doseHistory.filterByDateRange')}</Text>
              <Picker
                selectedValue={filters.dateRange}
                onValueChange={(value) => handleFilterChange('dateRange', value)}
                style={styles.picker}
              >
                {dateRanges.map((range) => (
                  <Picker.Item key={range.value} label={range.label} value={range.value} />
                ))}
              </Picker>
            </View>
          </View>
        </Card>

        {/* Dose History List */}
        <Card style={[styles.listCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.listTitle, { color: colors.text }]}>{t('doseHistory.doseHistory')}</Text>
          </View>
          
          {doseHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('doseHistory.noDoseHistory')}</Text>
            </View>
          ) : (
            doseHistory.map((dose, index) => (
              <TouchableOpacity
                key={dose.id}
                style={[styles.doseItem, { borderBottomColor: colors.border }]}
                onPress={() => handleMedicinePress(dose.medicine)}
              >
                <View style={styles.doseContent}>
                  <View style={styles.doseInfo}>
                    <Text style={[styles.medicineName, { color: colors.text }]}>{dose.medicine}</Text>
                    <Text style={[styles.doseDetails, { color: colors.textSecondary }]}>
                      {dose.dosage} • {dose.time}
                    </Text>
                    <Text style={[styles.doseDate, { color: colors.textMuted }]}>{formatDate(dose.date)}</Text>
                  </View>
                  <View style={styles.doseStatus}>
                    <Text style={[styles.statusText, { color: getStatusColor(dose.status) }]}>
                      {t(`doseHistory.${dose.status.toLowerCase()}`)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </Card>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backText: {
    color: '#0d9488',
    fontSize: 14,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d9488',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  filterCard: {
    marginBottom: 16,
  },
  filterHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterRow: {
    gap: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  picker: {
    height: 50,
  },
  listCard: {
    marginBottom: 16,
  },
  listHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  doseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doseInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  doseDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  doseDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  doseStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default DoseHistory;
