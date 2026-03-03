import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Dimensions, RefreshControl, Animated,
} from 'react-native';
import { Card } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { analyticsAPI, medicineAPI } from '../services/api';

const CHART_COLORS = ['#0d9488','#14b8a6','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#10b981','#f97316','#6366f1'];
const screenW = Dimensions.get('window').width;

// ─── Donut Ring (View-based) ────────────────────────────────────────────────
const DonutRing = ({ data, colors: themeColors, centerValue, centerLabel }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <View style={donutStyles.wrapper}>
      {/* Center value */}
      <View style={donutStyles.centerWrap}>
        <Text style={[donutStyles.centerValue, { color: themeColors.text }]}>{centerValue}</Text>
        <Text style={[donutStyles.centerLabel, { color: themeColors.textSecondary }]}>{centerLabel}</Text>
      </View>
      {/* Proportional ring segments as a horizontal bar */}
      <View style={donutStyles.ringTrack}>
        {data.map((d, i) => {
          const pct = (d.value / total) * 100;
          return (
            <View key={i} style={[donutStyles.ringSegment, { width: `${pct}%`, backgroundColor: d.color }]} />
          );
        })}
      </View>
      {/* Legend */}
      <View style={donutStyles.legend}>
        {data.map((d, i) => (
          <View key={i} style={donutStyles.legendRow}>
            <View style={[donutStyles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[donutStyles.legendLabel, { color: themeColors.text }]} numberOfLines={1}>{d.label}</Text>
            <View style={donutStyles.legendBarTrack}>
              <View style={[donutStyles.legendBarFill, { width: `${(d.value / total) * 100}%`, backgroundColor: d.color }]} />
            </View>
            <Text style={[donutStyles.legendPct, { color: themeColors.textSecondary }]}>
              {d.value} ({((d.value / total) * 100).toFixed(0)}%)
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const donutStyles = StyleSheet.create({
  wrapper: { padding: 16 },
  centerWrap: { alignItems: 'center', marginBottom: 14 },
  centerValue: { fontSize: 32, fontWeight: '800' },
  centerLabel: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  ringTrack: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 16 },
  ringSegment: { height: 14 },
  legend: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { fontSize: 13, fontWeight: '600', width: 85 },
  legendBarTrack: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginHorizontal: 8, overflow: 'hidden' },
  legendBarFill: { height: 6, borderRadius: 3 },
  legendPct: { fontSize: 11, fontWeight: '600', width: 64, textAlign: 'right' },
});

// ─── View-based Bar Chart (Histogram) ────────────────────────────────────────
const BarChartView = ({ data, colors: themeColors, barColor = '#0d9488', label = '%' }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barMaxH = 130;
  return (
    <View style={barStyles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={barStyles.scroll}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / maxVal) * barMaxH);
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
  bar: { width: 22, borderRadius: 5 },
  dateLabel: { fontSize: 8, marginTop: 4, textAlign: 'center' },
});

// ─── Progress Ring (View-based) ──────────────────────────────────────────────
const ProgressCircle = ({ value, max, size = 76, color = '#fff' }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={[progressStyles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: 'rgba(255,255,255,0.25)' }]}>
      <View style={[progressStyles.inner, {
        width: size - 12, height: size - 12, borderRadius: (size - 12) / 2,
      }]}>
        <Text style={[progressStyles.txt, { color }]}>{value}/{max}</Text>
      </View>
      {/* Filled arc indicator - simplified as a colored border portion */}
      <View style={[progressStyles.arcFill, {
        width: size, height: size, borderRadius: size / 2,
        borderColor: color, borderTopColor: pct > 0.25 ? color : 'transparent',
        borderRightColor: pct > 0.5 ? color : 'transparent',
        borderBottomColor: pct > 0.75 ? color : 'transparent',
        borderLeftColor: pct > 0 ? color : 'transparent',
        transform: [{ rotate: '-90deg' }],
      }]} />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  ring: { borderWidth: 5, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  inner: { justifyContent: 'center', alignItems: 'center', position: 'absolute' },
  txt: { fontSize: 16, fontWeight: '800' },
  arcFill: { position: 'absolute', borderWidth: 5 },
});

// ─── Main Component ──────────────────────────────────────────────────────────
const AnalyticsDashboard = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [trendRange, setTrendRange] = useState(14);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => loadData(true), [loadData]);

  // ── Computed data ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = medicines.filter(m => m.is_active && !m.completed).length;
    const completed = medicines.filter(m => m.completed).length;
    const lowStock = medicines.filter(m => m.is_active && !m.completed && (m.stock_count || 0) < 10).length;
    const adherenceRate = dashboardData?.stats?.adherence_rate;
    const dosesTaken = dashboardData?.stats?.doses_taken_today ?? 0;
    const dosesToday = dashboardData?.stats?.doses_today ?? 0;
    const streakDays = dashboardData?.stats?.streak_days ?? 0;
    const missedWeek = dashboardData?.stats?.missed_doses_week ?? 0;
    return { total: medicines.length, active, completed, lowStock, adherenceRate, dosesTaken, dosesToday, streakDays, missedWeek };
  }, [medicines, dashboardData]);

  const freqLabel = (f) => {
    const map = {
      once_daily: t('analytics.onceDaily') || 'Once Daily',
      twice_daily: t('analytics.twiceDaily') || 'Twice Daily',
      three_times_daily: t('analytics.threeTimesDaily') || '3× Daily',
      four_times_daily: t('analytics.fourTimesDaily') || '4× Daily',
      as_needed: t('analytics.asNeeded') || 'As Needed',
      weekly: t('analytics.weekly') || 'Weekly',
      monthly: t('analytics.monthly') || 'Monthly',
    };
    return map[f] || f || '—';
  };

  const frequencyPieData = useMemo(() => {
    const counts = {};
    medicines.forEach(m => { const f = m.frequency || 'unknown'; counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).map(([k, v], i) => ({ label: freqLabel(k), value: v, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [medicines, t]);

  const statusPieData = useMemo(() => {
    let a = 0, c = 0, n = 0;
    medicines.forEach(m => { if (m.completed) c++; else if (m.is_active) a++; else n++; });
    return [
      { label: t('analytics.active') || 'Active', value: a, color: '#10b981' },
      { label: t('analytics.completed') || 'Completed', value: c, color: '#6366f1' },
      { label: t('analytics.inactive') || 'Inactive', value: n, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [medicines, t]);

  const adherenceTrends = useMemo(() => {
    if (!dashboardData?.adherence_trends?.length) return [];
    return dashboardData.adherence_trends.slice(-trendRange).map(item => ({
      label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(item.adherence_percentage || 0),
    }));
  }, [dashboardData, trendRange]);

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

  // Insight
  const insight = useMemo(() => {
    if (stats.adherenceRate == null) return null;
    const r = Math.round(stats.adherenceRate);
    if (r >= 90) return { icon: 'star-shooting', color: '#10b981', msg: t('analytics.insightGreat') || `Excellent! ${r}% adherence — keep it up!` };
    if (r >= 70) return { icon: 'trending-up', color: '#f59e0b', msg: t('analytics.insightGood') || `Good progress at ${r}%. A bit more consistency!` };
    return { icon: 'target', color: '#ef4444', msg: t('analytics.insightNeedsWork') || `${r}% adherence — try setting reminders.` };
  }, [stats.adherenceRate, t]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <MaterialCommunityIcons name="chart-line" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
        <Text style={{ color: colors.text, fontSize: 14 }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
    >
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{t('analytics.title')}</Text>
          <Text style={styles.heroSubtitle}>{t('analytics.subtitle') || 'Real-time medication insights'}</Text>
        </View>
        <MaterialCommunityIcons name="chart-line" size={36} color="rgba(255,255,255,0.5)" />
      </View>

      <View style={styles.content}>

        {/* ─── Today Banner + Streak ─────────────────────────────────── */}
        <View style={styles.bannerRow}>
          {/* Today's Progress */}
          <View style={[styles.todayCard, { flex: 2 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <ProgressCircle value={stats.dosesTaken} max={stats.dosesToday} size={68} />
              <View style={{ flex: 1 }}>
                <Text style={styles.todayLabel}>{t('analytics.todayProgress') || "Today's Progress"}</Text>
                <Text style={styles.todayValue}>
                  {stats.dosesTaken} / {stats.dosesToday}{' '}
                  <Text style={styles.todayUnit}>{t('analytics.doses') || 'doses'}</Text>
                </Text>
                {stats.dosesToday > 0 && (
                  <View style={styles.todayBar}>
                    <View style={[styles.todayBarFill, { width: `${Math.min(100, (stats.dosesTaken / stats.dosesToday) * 100)}%` }]} />
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Streak */}
          <View style={[styles.streakCard, {
            backgroundColor: stats.streakDays > 0 ? '#f59e0b' : '#94a3b8',
          }]}>
            <MaterialCommunityIcons name="fire" size={26} color="#fff" />
            <Text style={styles.streakNumber}>{stats.streakDays}</Text>
            <Text style={styles.streakLabel}>{t('analytics.dayStreak') || 'Day\nStreak'}</Text>
          </View>
        </View>

        {/* ─── Insight Banner ────────────────────────────────────────── */}
        {insight && (
          <View style={[styles.insightCard, { borderColor: insight.color + '40', backgroundColor: insight.color + '10' }]}>
            <MaterialCommunityIcons name={insight.icon} size={22} color={insight.color} />
            <Text style={[styles.insightText, { color: insight.color }]} numberOfLines={2}>{insight.msg}</Text>
          </View>
        )}

        {/* ─── Stats Grid ────────────────────────────────────────────── */}
        <View style={styles.statsContainer}>
          {[
            { label: t('analytics.totalMedicines') || 'Total', value: stats.total, icon: 'pill', color: '#0d9488', bg: '#0d948815' },
            { label: t('analytics.activeMedications') || 'Active', value: stats.active, icon: 'check-circle-outline', color: '#10b981', bg: '#10b98115' },
            { label: t('analytics.adherenceRate') || 'Adherence', value: stats.adherenceRate != null ? `${Math.round(stats.adherenceRate)}%` : '—', icon: 'percent-outline', color: colors.primary, bg: colors.primary + '15' },
            { label: t('analytics.lowStock') || 'Low Stock', value: stats.lowStock, icon: 'alert-outline', color: stats.lowStock > 0 ? '#ef4444' : '#10b981', bg: stats.lowStock > 0 ? '#ef444415' : '#10b98115' },
          ].map((s, i) => (
            <Card key={i} style={[styles.statCard, { backgroundColor: colors.surface }]}>
              <View style={styles.statContent}>
                <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                  <MaterialCommunityIcons name={s.icon} size={18} color={s.color} />
                </View>
                <Text style={[styles.statNumber, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* ─── Frequency Distribution ─────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-pie" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('analytics.frequencyDistribution') || 'Frequency Distribution'}
            </Text>
          </View>
          {frequencyPieData.length > 0 ? (
            <DonutRing data={frequencyPieData} colors={colors}
              centerValue={String(stats.total)} centerLabel={t('analytics.totalLabel') || 'Total'} />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-pie" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
            </View>
          )}
        </Card>

        {/* ─── Status Distribution ────────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-donut" size={20} color="#6366f1" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('analytics.statusDistribution') || 'Medicine Status'}
            </Text>
          </View>
          {statusPieData.length > 0 ? (
            <DonutRing data={statusPieData} colors={colors}
              centerValue={String(stats.active)} centerLabel={t('analytics.activeLabel') || 'Active'} />
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="chart-donut" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
            </View>
          )}
        </Card>

        {/* ─── Adherence Trend ────────────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="chart-bar" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('analytics.adherenceOverTime') || 'Adherence Trend'}
            </Text>
          </View>
          {/* Time period tabs */}
          <View style={styles.trendTabs}>
            {[{ v: 7, l: '7D' }, { v: 14, l: '14D' }, { v: 30, l: '30D' }].map(({ v, l }) => (
              <TouchableOpacity key={v} onPress={() => setTrendRange(v)}
                style={[styles.trendTab, trendRange === v && { backgroundColor: colors.primary }]}>
                <Text style={[styles.trendTabText, trendRange === v ? { color: '#fff', fontWeight: '800' } : { color: colors.textSecondary }]}>{l}</Text>
              </TouchableOpacity>
            ))}
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

        {/* ─── Stock Levels ───────────────────────────────────────────── */}
        {stockBarData.length > 0 && (
          <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
              <MaterialCommunityIcons name="package-variant" size={20} color="#f59e0b" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('analytics.stockLevels') || 'Stock Levels'}
              </Text>
            </View>
            <BarChartView data={stockBarData} colors={colors} label="" />
          </Card>
        )}

        {/* ─── Medicine List ──────────────────────────────────────────── */}
        <Card style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.cardHeader, { borderBottomColor: colors.border }]}>
            <MaterialCommunityIcons name="format-list-bulleted" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('analytics.medicinePerformance') || 'Your Medicines'}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>{medicines.length}</Text>
            </View>
          </View>
          {medicines.length > 0 ? (
            <View style={{ padding: 12 }}>
              {medicines.map((med, i) => (
                <View key={med.id || i} style={[styles.medRow, { borderBottomColor: colors.border }]}>
                  {/* Avatar */}
                  <View style={[styles.medAvatar, { backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]}>
                    <Text style={styles.medAvatarText}>{(med.name || '?').charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
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
                      <View style={styles.stockRow}>
                        <View style={styles.stockBarTrack}>
                          <View style={[styles.stockBarFill, {
                            width: `${Math.min(100, ((med.stock_count || 0) / 100) * 100)}%`,
                            backgroundColor: (med.stock_count || 0) < 10 ? '#ef4444' : (med.stock_count || 0) < 30 ? '#f59e0b' : '#10b981',
                          }]} />
                        </View>
                        <Text style={[styles.stockText, {
                          color: (med.stock_count || 0) < 10 ? '#ef4444' : (med.stock_count || 0) < 30 ? '#f59e0b' : '#10b981'
                        }]}>{med.stock_count}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <MaterialCommunityIcons name="pill-off" size={40} color={colors.textMuted || '#ccc'} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('analytics.noMedicines') || 'No medicines added yet'}</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>{t('analytics.addMedicineTip') || 'Add your first medicine to see analytics'}</Text>
            </View>
          )}
        </Card>

        {/* Bottom spacer */}
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  // Today + Streak
  bannerRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  todayCard: {
    borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#0d9488',
  },
  todayLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  todayValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  todayUnit: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  todayBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  todayBarFill: { height: 5, backgroundColor: '#fff', borderRadius: 3 },

  streakCard: {
    flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingVertical: 10,
  },
  streakNumber: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 2 },
  streakLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textAlign: 'center' },

  // Insight
  insightCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1, marginBottom: 14,
  },
  insightText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Stats
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: { width: '47%', borderRadius: 16, elevation: 2, overflow: 'hidden' },
  statContent: { alignItems: 'center', padding: 14 },
  statIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  statNumber: { fontSize: 24, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, textAlign: 'center', fontWeight: '500' },

  // Chart cards
  chartCard: { marginBottom: 14, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  countBadgeText: { fontSize: 12, fontWeight: '800' },

  // Trend tabs
  trendTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 10, gap: 6 },
  trendTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e5e7eb20' },
  trendTabText: { fontSize: 12, fontWeight: '600' },

  // Empty
  emptyChart: { padding: 30, alignItems: 'center' },
  emptyText: { fontSize: 14, marginTop: 8, fontWeight: '500' },
  emptySubtext: { fontSize: 12, marginTop: 4 },

  // Medicine list
  medRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  medAvatar: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  medAvatarText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  medName: { fontSize: 15, fontWeight: '700' },
  medSci: { fontSize: 11, fontStyle: 'italic', marginTop: 1 },
  medInfo: { fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: '700' },
  stockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 },
  stockBarTrack: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  stockBarFill: { height: 4, borderRadius: 2 },
  stockText: { fontSize: 10, fontWeight: '700' },
});

export default AnalyticsDashboard;
