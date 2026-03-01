import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { Card, Button, Avatar, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.heroTitle}>{t('analytics.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('analytics.subtitle')}</Text>
        </View>
        <MaterialCommunityIcons name="chart-line" size={36} color="rgba(255,255,255,0.7)" />
      </View>

      <View style={styles.content}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: '#10b98118' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10b981" />
              </View>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{analyticsData.dosesTaken}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesTaken')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: '#ef444418' }]}>
                <MaterialCommunityIcons name="close-circle-outline" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.statNumber, { color: '#ef4444' }]}>{analyticsData.dosesMissed}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesMissed')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: '#f59e0b18' }]}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#f59e0b" />
              </View>
              <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{analyticsData.dosesPending}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.dosesPending')}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="percent-outline" size={20} color={colors.primary} />
              </View>
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
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '47%',
    borderRadius: 14,
    elevation: 1,
    overflow: 'hidden',
  },
  statContent: {
    alignItems: 'center',
    padding: 14,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  chartCard: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    padding: 20,
    alignItems: 'center',
  },
  chartPlaceholder: {
    fontSize: 16,
    marginBottom: 8,
  },
  chartNote: {
    fontSize: 12,
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
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 4,
    height: 6,
  },
  adherencePercent: {
    width: 40,
    fontSize: 12,
    fontWeight: '700',
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
    borderRadius: 12,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AnalyticsDashboard;
