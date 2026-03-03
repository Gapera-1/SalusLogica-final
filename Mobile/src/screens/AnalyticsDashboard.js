import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Dimensions } from 'react-native';
import { Card, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { analyticsAPI, medicineAPI } from '../services/api';

const CHART_COLORS = ['#0d9488', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f97316', '#6366f1'];
const screenWidth = Dimensions.get('window').width;

// ─── View-based Pie Chart (Horizontal Legend Bars) ──────────────────────────
const PieChartView = ({ data, colors: themeColors }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  return (
    <View style={pieStyles.container}>
      {data.map((d, i) => {
        const pct = ((d.value / total) * 100).toFixed(1);
        return (
          <View key={i} style={pieStyles.row}>
            <View style={[pieStyles.dot, { backgroundColor: d.color }]} />
            <Text style={[pieStyles.label, { color: themeColors.text }]} numberOfLines={1}>{d.label}</Text>
            <View style={pieStyles.barTrack}>
              <View style={[pieStyles.barFill, { width: `${pct}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={[pieStyles.pct, { color: themeColors.textSecondary }]}>{d.value} ({pct}%)</Text>
          </View>
        );
      })}
    </View>
  );
};

const pieStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 8 },
  label: { fontSize: 13, fontWeight: '600', width: 90 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  pct: { fontSize: 11, fontWeight: '600', width: 70, textAlign: 'right' },
});

// ─── View-based Bar Chart (Histogram) ────────────────────────────────────────
const BarChartView = ({ data, colors: themeColors, barColor = '#0d9488', label = '%' }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barMaxHeight = 140;
  return (
    <View style={barStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={barStyles.scroll}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / maxVal) * barMaxHeight);
          const color = d.color || barColor;
          return (
            <View key={i} style={barStyles.barCol}>
              <Text style={[barStyles.valLabel, { color: themeColors.text }]}>{d.value}{label === '%' ? '%' : ''}</Text>
              <View style={[barStyles.bar, { height: h, backgroundColor: color }]} />
              <Text style={[barStyles.dateLabel, { color: themeColors.textSecondary }]} numberOfLines={1}>{d.label}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const barStyles = StyleSheet.create({
  container: { paddingVertical: 12 },
  scroll: { paddingHorizontal: 16, alignItems: 'flex-end', gap: 6 },
  barCol: { alignItems: 'center', width: 36 },
  valLabel: { fontSize: 9, fontWeight: '700', marginBottom: 4 },
  bar: { width: 24, borderRadius: 4 },
  dateLabel: { fontSize: 9, marginTop: 4, textAlign: 'center' },
});

// ─── Main Component ──────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [medsRes, dashRes] = await Promise.allSettled([
        medicineAPI.getAll(),
        analyticsAPI.getDashboard(),
      ]);
      if (medsRes.status === 'fulfilled') {
        const list = Array.isArray(medsRes.value) ? medsRes.value : (medsRes.value?.results || []);
        setMedicines(list);
      }
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── Computed data ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = medicines.filter(m => m.is_active && !m.completed).length;
    const completed = medicines.filter(m => m.completed).length;
    const lowStock = medicines.filter(m => m.is_active && !m.completed && (m.stock_count || 0) < 10).length;
    const adherenceRate = dashboardData?.stats?.adherence_rate;
    const dosesTaken = dashboardData?.stats?.doses_taken_today ?? 0;
    const dosesToday = dashboardData?.stats?.doses_today ?? 0;
    const streakDays = dashboardData?.stats?.streak_days ?? 0;
    return { total: medicines.length, active, completed, lowStock, adherenceRate, dosesTaken, dosesToday, streakDays };
  }, [medicines, dashboardData]);

  const freqLabel = (f) => {
    const map = { once_daily: 'Once Daily', twice_daily: 'Twice Daily', three_times_daily: '3× Daily', four_times_daily: '4× Daily', as_needed: 'As Needed', weekly: 'Weekly', monthly: 'Monthly' };
    return map[f] || f || 'Unknown';
  };

  const frequencyPieData = useMemo(() => {
    const counts = {};
    medicines.forEach(m => {
      const freq = m.frequency || 'unknown';
      counts[freq] = (counts[freq] || 0) + 1;
    });
    return Object.entries(counts).map(([key, val], i) => ({
      label: freqLabel(key),
      value: val,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [medicines]);

  const statusPieData = useMemo(() => {
    let active = 0, completed = 0, inactive = 0;
    medicines.forEach(m => {
      if (m.completed) completed++;
      else if (m.is_active) active++;
      else inactive++;
    });
    return [
      { label: t('analytics.active') || 'Active', value: active, color: '#10b981' },
      { label: t('analytics.completed') || 'Completed', value: completed, color: '#6366f1' },
      { label: t('analytics.inactive') || 'Inactive', value: inactive, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [medicines, t]);

  const adherenceTrends = useMemo(() => {
    if (!dashboardData?.adherence_trends?.length) return [];
    return dashboardData.adherence_trends.slice(-14).map(item => ({
      label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(item.adherence_percentage || 0),
    }));
  }, [dashboardData]);

  const stockBarData = useMemo(() => {
    return medicines
      .filter(m => m.is_active && !m.completed)
      .sort((a, b) => (a.stock_count || 0) - (b.stock_count || 0))
      .slice(0, 10)
      .map(m => ({
        label: m.name?.length > 6 ? m.name.slice(0, 6) + '…' : (m.name || '?'),
        value: m.stock_count || 0,
        color: (m.stock_count || 0) < 10 ? '#ef4444' : (m.stock_count || 0) < 30 ? '#f59e0b' : '#10b981',
      }));
  }, [medicines]);

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
              <View style={[styles.statIconWrap, { backgroundColor: '#0d948818' }]}>
                <MaterialCommunityIcons name="pill" size={20} color="#0d9488" />
              </View>
              <Text style={[styles.statNumber, { color: '#0d9488' }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.totalMedicines') || 'Total Medicines'}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: '#10b98118' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={20} color="#10b981" />
              </View>
              <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.active}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.activeMedications') || 'Active'}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: colors.primary + '18' }]}>
                <MaterialCommunityIcons name="percent-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {stats.adherenceRate != null ? `${Math.round(stats.adherenceRate)}%` : '—'}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.adherenceRate') || 'Adherence'}</Text>
            </View>
          </Card>

          <Card style={[styles.statCard, { backgroundColor: colors.surface }]}>
            <View style={styles.statContent}>
              <View style={[styles.statIconWrap, { backgroundColor: stats.lowStock > 0 ? '#ef444418' : '#10b98118' }]}>
                <MaterialCommunityIcons name="alert-outline" size={20} color={stats.lowStock > 0 ? '#ef4444' : '#10b981'} />
              </View>
              <Text style={[styles.statNumber, { color: stats.lowStock > 0 ? '#ef4444' : '#10b981' }]}>{stats.lowStock}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('analytics.lowStock') || 'Low Stock'}</Text>
            </View>
          </Card>
        </View>

        {/* ─── Frequency Distribution Pie Chart ────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-pie" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
              {t('analytics.frequencyDistribution') || 'Frequency Distribution'}
            </Text>
          </View>
          {frequencyPieData.length > 0 ? (
            <PieChartView data={frequencyPieData} colors={colors} />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-pie" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
            </View>
          )}
        </Card>

        {/* ─── Status Pie Chart ────────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-donut" size={20} color="#6366f1" />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
              {t('analytics.statusDistribution') || 'Medicine Status'}
            </Text>
          </View>
          {statusPieData.length > 0 ? (
            <PieChartView data={statusPieData} colors={colors} />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-donut" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
            </View>
          )}
        </Card>

        {/* ─── Adherence Trend Bar Chart ───────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
              {t('analytics.adherenceOverTime') || 'Adherence Trend'}
            </Text>
          </View>
          {adherenceTrends.length > 0 ? (
            <BarChartView data={adherenceTrends} colors={colors} barColor="#0d9488" label="%" />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-bar" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noAdherenceData') || 'No adherence data yet'}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>{t('analytics.startTakingDoses') || 'Start taking your doses to see trends'}</Text>
            </View>
          )}
        </Card>

        {/* ─── Stock Levels Bar Chart ──────────────────────────────── */}
        {stockBarData.length > 0 && (
          <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#f59e0b" />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
                {t('analytics.stockLevels') || 'Stock Levels'}
              </Text>
            </View>
            <BarChartView data={stockBarData} colors={colors} label="" />
          </Card>
        )}

        {/* ─── Medicine List ───────────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>
              {t('analytics.medicinePerformance') || 'Your Medicines'}
            </Text>
          </View>
          {medicines.length > 0 ? (
            <View style={{ padding: 12 }}>
              {medicines.map((med, i) => (
                <View key={med.id || i} style={[styles.medRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.medName, { color: colors.text }]}>{med.name}</Text>
                    {med.scientific_name ? <Text style={[styles.medSci, { color: colors.textSecondary }]}>{med.scientific_name}</Text> : null}
                    <Text style={[styles.medInfo, { color: colors.textMuted }]}>
                      {med.dosage || '—'} · {freqLabel(med.frequency)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge, {
                      backgroundColor: med.completed ? '#eef2ff' : med.is_active ? '#ecfdf5' : '#f1f5f9'
                    }]}>
                      <Text style={[styles.statusText, {
                        color: med.completed ? '#6366f1' : med.is_active ? '#10b981' : '#94a3b8'
                      }]}>
                        {med.completed ? (t('analytics.completed') || 'Done') : med.is_active ? (t('analytics.active') || 'Active') : (t('analytics.inactive') || 'Inactive')}
                      </Text>
                    </View>
                    {med.stock_count != null && (
                      <Text style={[styles.stockText, {
                        color: (med.stock_count || 0) < 10 ? '#ef4444' : (med.stock_count || 0) < 30 ? '#f59e0b' : '#10b981'
                      }]}>
                        {t('analytics.stock') || 'Stock'}: {med.stock_count}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="pill-off" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
            </View>
          )}
        </Card>
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
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  emptyChart: {
    padding: 30,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  medRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
  },
  medSci: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 1,
  },
  medInfo: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default AnalyticsDashboard;
