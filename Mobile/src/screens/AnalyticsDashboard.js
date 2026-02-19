import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Avatar, ProgressBar } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { analyticsAPI } from '../services/api';

const AnalyticsDashboard = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    adherenceOverTime: [],
    dosesTaken: 0,
    dosesMissed: 0,
    dosesPending: 0,
    adherenceRate: 0,
    dailyAdherence: [],
    weeklyAdherence: [],
    monthlyAdherence: [],
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const data = await analyticsAPI.getDashboard();
      setAnalyticsData(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to load analytics:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMedicineFilter = (medicine) => {
    Alert.alert(
      t('analytics.title'),
      `${t('analytics.filterByMedicine')}: ${medicine}`
    );
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
          <Text style={[styles.title, { color: colors.text }]}>{t('analytics.title')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('analytics.subtitle')}</Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{analyticsData.dosesTaken}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesTaken')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{analyticsData.dosesMissed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesMissed')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{analyticsData.dosesPending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesPending')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{analyticsData.adherenceRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.adherenceRate')}</Text>
            </View>
          </Card>
        </View>

        {/* Adherence Over Time Chart */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('analytics.adherenceOverTime')}</Text>
            <TouchableOpacity 
              style={[styles.filterButton, { backgroundColor: colors.border }]}
              onPress={() => handleMedicineFilter('All Medicines')}
            >
              <Text style={[styles.filterText, { color: colors.text }]}>{t('analytics.allMedicines')}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.chartContainer}>
            <Text style={[styles.chartPlaceholder, { color: colors.textSecondary }]}>
              📊 {t('analytics.adherenceOverTime')}
            </Text>
            <Text style={[styles.chartNote, { color: colors.textMuted }]}>
              {t('analytics.chartPlaceholder')}
            </Text>
          </View>
        </Card>

        {/* Daily Adherence */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('analytics.dailyAdherence')}</Text>
          </View>
          <View style={styles.adherenceList}>
            {[t('analytics.mon'), t('analytics.tue'), t('analytics.wed'), t('analytics.thu'), t('analytics.fri'), t('analytics.sat'), t('analytics.sun')].map((day, index) => (
              <View key={index} style={styles.adherenceItem}>
                <Text style={[styles.dayLabel, { color: colors.text }]}>{day}</Text>
                <ProgressBar 
                  progress={0.8 + (index * 0.05)} 
                  color={colors.primary} 
                  style={styles.progressBar}
                />
                <Text style={[styles.adherencePercent, { color: colors.primary }]}>{Math.round((80 + index * 5))}%</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Weekly/Monthly Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabText, { color: colors.text }]}>{t('analytics.weeklyAdherence')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.tabText, { color: colors.text }]}>{t('analytics.monthlyAdherence')}</Text>
          </TouchableOpacity>
        </View>
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
  chartCard: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  filterText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  chartContainer: {
    padding: 20,
    alignItems: 'center',
  },
  chartPlaceholder: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 8,
  },
  chartNote: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  adherenceList: {
    padding: 16,
  },
  adherenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    width: 40,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  progressBar: {
    flex: 1,
    marginLeft: 12,
  },
  adherencePercent: {
    width: 40,
    fontSize: 12,
    fontWeight: '600',
    color: '#0d9488',
    textAlign: 'right',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default AnalyticsDashboard;
