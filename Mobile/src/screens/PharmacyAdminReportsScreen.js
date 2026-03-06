import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, ActivityIndicator,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { pharmacyAdminAPI } from '../services/api';
import { logError } from '../utils/errorHandler';

const SEV_BAR_COLORS = {
  mild: '#0d9488', moderate: '#f59e0b', severe: '#ef4444', life_threatening: '#dc2626',
};

const TYPE_LABELS = {
  allergic: 'Allergic Reaction', side_effect: 'Side Effect',
  adverse_event: 'Adverse Event', medication_error: 'Medication Error', other: 'Other',
};

const pct = (v, max) => (max > 0 ? Math.round((v / max) * 100) : 0);

export default function PharmacyAdminReportsScreen() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const loadData = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const result = await pharmacyAdminAPI.getReports();
      setData(result);
    } catch (err) {
      logError('PharmacyAdminReports.load', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = () => { setRefreshing(true); loadData(true); };

  const TABS = [
    { key: 'overview', icon: 'pie-chart', label: t('pharmacyAdminReports.tabOverview') || 'Overview' },
    { key: 'reactions', icon: 'warning', label: t('pharmacyAdminReports.tabReactions') || 'Side Effects' },
    { key: 'patients', icon: 'people', label: t('pharmacyAdminReports.tabPatients') || 'Patients' },
    { key: 'medicines', icon: 'medkit', label: t('pharmacyAdminReports.tabMedicines') || 'Medications' },
  ];

  /* ── helpers ── */
  const BarRow = ({ label, value, max, color, labelColor }) => {
    const w = Math.max(pct(value, max), value > 0 ? 6 : 0);
    return (
      <View style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={[s.barLabel, { color: labelColor || colors.textSecondary }]}>{label}</Text>
          <Text style={[s.barValue, { color: colors.text }]}>{value}</Text>
        </View>
        <View style={[s.barTrack, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]}>
          <View style={[s.barFill, { width: `${w}%`, backgroundColor: color }]} />
        </View>
      </View>
    );
  };

  const KpiCard = ({ icon, iconColor, bgColor, value, label }) => (
    <View style={[s.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.kpiIconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[s.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[s.kpiLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );

  /* ═══════ LOADING / ERROR ═══════ */
  if (loading && !data) {
    return (
      <View style={[s.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[s.loadingText, { color: colors.textSecondary }]}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Hero */}
      <View style={[s.heroHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.heroTitle}>{t('pharmacyAdminReports.title') || 'Reports & Analytics'}</Text>
          <Text style={s.heroSubtitle}>{t('pharmacyAdminReports.subtitle') || 'Comprehensive insights'}</Text>
        </View>
        <Ionicons name="bar-chart" size={28} color="rgba(255,255,255,0.6)" />
      </View>

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBarContent}
        style={[s.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              s.tabBtn,
              activeTab === tab.key
                ? { backgroundColor: '#0d9488' }
                : { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
            ]}
          >
            <Ionicons name={tab.icon} size={14} color={activeTab === tab.key ? '#fff' : colors.textSecondary} />
            <Text style={[s.tabBtnText, { color: activeTab === tab.key ? '#fff' : colors.textSecondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={s.body}
      >
        {error && (
          <Card style={[s.errorCard, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
            <View style={s.errorRow}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={[s.errorText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>{error}</Text>
            </View>
          </Card>
        )}

        {data && (
          <>
            {/* ══════ OVERVIEW TAB ══════ */}
            {activeTab === 'overview' && (
              <View>
                {/* KPI row */}
                <View style={s.kpiRow}>
                  <KpiCard
                    icon="people" iconColor="#3b82f6"
                    bgColor={isDark ? '#1e3a5f' : '#eff6ff'}
                    value={data.patients?.total ?? 0}
                    label={t('pharmacyAdminReports.totalPatients') || 'Total Patients'}
                  />
                  <KpiCard
                    icon="heart" iconColor="#10b981"
                    bgColor={isDark ? '#064e3b' : '#ecfdf5'}
                    value={data.patients?.active ?? 0}
                    label={t('pharmacyAdminReports.activePatients') || 'Active'}
                  />
                </View>
                <View style={s.kpiRow}>
                  <KpiCard
                    icon="warning" iconColor="#f59e0b"
                    bgColor={isDark ? '#451a03' : '#fffbeb'}
                    value={data.adverse_reactions?.total ?? 0}
                    label={t('pharmacyAdminReports.totalReactions') || 'Side Effects'}
                  />
                  <KpiCard
                    icon="shield" iconColor="#ef4444"
                    bgColor={isDark ? '#450a0a' : '#fef2f2'}
                    value={data.adverse_reactions?.unresolved ?? 0}
                    label={t('pharmacyAdminReports.unresolvedReactions') || 'Unresolved'}
                  />
                </View>

                {/* Severity breakdown */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="warning" size={16} color="#f59e0b" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.severityBreakdown') || 'Severity Breakdown'}
                    </Text>
                  </View>
                  {['mild', 'moderate', 'severe', 'life_threatening'].map(sev => (
                    <BarRow
                      key={sev}
                      label={sev.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
                      value={data.adverse_reactions?.by_severity?.[sev] ?? 0}
                      max={data.adverse_reactions?.total ?? 1}
                      color={SEV_BAR_COLORS[sev]}
                    />
                  ))}
                </Card>

                {/* Resolution status */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.resolutionStatus') || 'Resolution Status'}
                    </Text>
                  </View>
                  <BarRow label={t('pharmacyAdminReports.resolved') || 'Resolved'}
                    value={data.adverse_reactions?.resolved ?? 0}
                    max={data.adverse_reactions?.total ?? 1} color="#10b981" />
                  <BarRow label={t('pharmacyAdminReports.unresolved') || 'Unresolved'}
                    value={data.adverse_reactions?.unresolved ?? 0}
                    max={data.adverse_reactions?.total ?? 1} color="#ef4444" />
                  <BarRow label={t('pharmacyAdminReports.followUpNeeded') || 'Follow-up Needed'}
                    value={data.adverse_reactions?.follow_up_needed ?? 0}
                    max={data.adverse_reactions?.total ?? 1} color="#f59e0b" />

                  <View style={[s.quickStatsRow, { borderTopColor: isDark ? '#374151' : '#e5e7eb' }]}>
                    <View style={s.quickStat}>
                      <Text style={[s.quickStatValue, { color: colors.text }]}>{data.medications?.total ?? 0}</Text>
                      <Text style={[s.quickStatLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminReports.totalMedications') || 'Total Meds'}
                      </Text>
                    </View>
                    <View style={s.quickStat}>
                      <Text style={[s.quickStatValue, { color: colors.text }]}>{data.patients?.with_consent ?? 0}</Text>
                      <Text style={[s.quickStatLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminReports.withConsent') || 'With Consent'}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Monthly trend chart */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="trending-up" size={16} color="#6366f1" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.monthlyTrend') || 'Monthly Side Effects Trend'}
                    </Text>
                  </View>
                  {data.adverse_reactions?.monthly_trend?.length > 0 ? (
                    <View style={s.chartContainer}>
                      {(() => {
                        const trend = data.adverse_reactions.monthly_trend;
                        const maxCnt = Math.max(...trend.map(m => m.count), 1);
                        return trend.map((m, i) => {
                          const h = Math.max((m.count / maxCnt) * 100, m.count > 0 ? 8 : 3);
                          return (
                            <View key={i} style={s.chartBar}>
                              <Text style={[s.chartBarCount, { color: colors.text }]}>{m.count}</Text>
                              <View style={[s.chartBarInner, {
                                height: `${h}%`,
                                backgroundColor: '#0d9488',
                              }]} />
                              <Text style={[s.chartBarLabel, { color: colors.textMuted }]} numberOfLines={1}>
                                {m.month?.split(' ')[0] || ''}
                              </Text>
                            </View>
                          );
                        });
                      })()}
                    </View>
                  ) : (
                    <Text style={[s.noData, { color: colors.textMuted }]}>
                      {t('pharmacyAdminReports.noData') || 'No data'}
                    </Text>
                  )}
                </Card>
              </View>
            )}

            {/* ══════ REACTIONS TAB ══════ */}
            {activeTab === 'reactions' && (
              <View>
                {/* By Reaction Type */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="pulse" size={16} color="#6366f1" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.byReactionType') || 'By Reaction Type'}
                    </Text>
                  </View>
                  {data.adverse_reactions?.by_type && Object.entries(data.adverse_reactions.by_type).map(([type, cnt]) => (
                    <BarRow key={type}
                      label={TYPE_LABELS[type] || type}
                      value={cnt}
                      max={data.adverse_reactions.total ?? 1}
                      color="#6366f1"
                    />
                  ))}
                </Card>

                {/* By Outcome */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="heart" size={16} color="#f43f5e" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.byOutcome') || 'By Outcome'}
                    </Text>
                  </View>
                  <View style={s.outcomeGrid}>
                    {data.adverse_reactions?.by_outcome && Object.entries(data.adverse_reactions.by_outcome).map(([outcome, cnt]) => (
                      <View key={outcome} style={[s.outcomeCell, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
                        <Text style={[s.outcomeCnt, { color: colors.text }]}>{cnt}</Text>
                        <Text style={[s.outcomeLabel, { color: colors.textMuted }]}>
                          {outcome.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>

                {/* Top Medications with Reactions */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="medkit" size={16} color="#f59e0b" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.topMedsReactions') || 'Top Medications with Side Effects'}
                    </Text>
                  </View>
                  {(data.adverse_reactions?.top_medications?.length ?? 0) === 0 ? (
                    <Text style={[s.noData, { color: colors.textMuted }]}>{t('pharmacyAdminReports.noData') || 'No data'}</Text>
                  ) : data.adverse_reactions.top_medications.map((med, i) => {
                    const maxMed = data.adverse_reactions.top_medications[0]?.count || 1;
                    return (
                      <BarRow key={i}
                        label={med.medication_name}
                        value={med.count}
                        max={maxMed}
                        color="#f59e0b"
                      />
                    );
                  })}
                </Card>

                {/* Recent Reactions list */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="time" size={16} color="#0d9488" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.recentReactions') || 'Recent Adverse Reactions'}
                    </Text>
                  </View>
                  {(data.adverse_reactions?.recent?.length ?? 0) === 0 ? (
                    <Text style={[s.noData, { color: colors.textMuted }]}>{t('pharmacyAdminReports.noData') || 'No data'}</Text>
                  ) : data.adverse_reactions.recent.map((rx, i) => {
                    const sevColor = SEV_BAR_COLORS[rx.severity] || '#0d9488';
                    return (
                      <View key={rx.id || i} style={[s.recentRow, { borderColor: colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.recentPatient, { color: colors.text }]}>{rx.patient_name || '—'}</Text>
                          <Text style={[s.recentMed, { color: colors.textSecondary }]}>{rx.medication_name || '—'}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={[s.recentBadge, { backgroundColor: sevColor + '20' }]}>
                            <Text style={[s.recentBadgeText, { color: sevColor }]}>
                              {rx.severity?.replace('_', ' ')}
                            </Text>
                          </View>
                          <View style={[s.recentBadge, {
                            backgroundColor: rx.is_resolved ? '#10b98120' : '#ef444420',
                          }]}>
                            <Ionicons
                              name={rx.is_resolved ? 'checkmark-circle' : 'time'}
                              size={10}
                              color={rx.is_resolved ? '#10b981' : '#ef4444'}
                            />
                            <Text style={[s.recentBadgeText, { color: rx.is_resolved ? '#10b981' : '#ef4444' }]}>
                              {rx.is_resolved ? 'Resolved' : 'Unresolved'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>
            )}

            {/* ══════ PATIENTS TAB ══════ */}
            {activeTab === 'patients' && (
              <View>
                {/* Distribution cards */}
                <View style={s.kpiRow}>
                  <KpiCard icon="people" iconColor="#3b82f6"
                    bgColor={isDark ? '#1e3a5f' : '#eff6ff'}
                    value={data.patients?.total ?? 0}
                    label={t('pharmacyAdminReports.totalPatients') || 'Total'} />
                  <KpiCard icon="heart" iconColor="#10b981"
                    bgColor={isDark ? '#064e3b' : '#ecfdf5'}
                    value={data.patients?.active ?? 0}
                    label={t('pharmacyAdminReports.activePatients') || 'Active'} />
                </View>
                <View style={s.kpiRow}>
                  <KpiCard icon="person" iconColor="#6b7280"
                    bgColor={isDark ? '#334155' : '#f9fafb'}
                    value={data.patients?.inactive ?? 0}
                    label={t('pharmacyAdminReports.inactivePatients') || 'Inactive'} />
                  <KpiCard icon="checkmark-circle" iconColor="#0d9488"
                    bgColor={isDark ? '#064e3b' : '#f0fdfa'}
                    value={data.patients?.with_consent ?? 0}
                    label={t('pharmacyAdminReports.withConsent') || 'With Consent'} />
                </View>

                {/* Top by reactions */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="warning" size={16} color="#f59e0b" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.patientsByReactions') || 'Patients with Most Side Effects'}
                    </Text>
                  </View>
                  {(data.patients?.top_by_reactions?.length ?? 0) === 0 ? (
                    <Text style={[s.noData, { color: colors.textMuted }]}>{t('pharmacyAdminReports.noData') || 'No data'}</Text>
                  ) : data.patients.top_by_reactions.map((p, i) => {
                    const maxR = data.patients.top_by_reactions[0]?.reaction_count || 1;
                    return (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={s.avatarMini}>
                              <Text style={s.avatarMiniText}>{p.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                            </View>
                            <Text style={[s.barLabel, { color: colors.text }]} numberOfLines={1}>{p.full_name}</Text>
                          </View>
                          <Text style={[s.barValue, { color: colors.text }]}>{p.reaction_count}</Text>
                        </View>
                        <View style={[s.barTrack, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]}>
                          <View style={[s.barFill, { width: `${Math.max(pct(p.reaction_count, maxR), 8)}%`, backgroundColor: '#f59e0b' }]} />
                        </View>
                      </View>
                    );
                  })}
                </Card>

                {/* Top by medicines */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="medkit" size={16} color="#10b981" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.patientsByMedicines') || 'Patients with Most Medications'}
                    </Text>
                  </View>
                  {(data.patients?.top_by_medicines?.length ?? 0) === 0 ? (
                    <Text style={[s.noData, { color: colors.textMuted }]}>{t('pharmacyAdminReports.noData') || 'No data'}</Text>
                  ) : data.patients.top_by_medicines.map((p, i) => {
                    const maxM = data.patients.top_by_medicines[0]?.medicine_count || 1;
                    return (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={[s.avatarMini, { backgroundColor: '#10b981' }]}>
                              <Text style={s.avatarMiniText}>{p.full_name?.charAt(0)?.toUpperCase() || '?'}</Text>
                            </View>
                            <Text style={[s.barLabel, { color: colors.text }]} numberOfLines={1}>{p.full_name}</Text>
                          </View>
                          <Text style={[s.barValue, { color: colors.text }]}>{p.medicine_count}</Text>
                        </View>
                        <View style={[s.barTrack, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]}>
                          <View style={[s.barFill, { width: `${Math.max(pct(p.medicine_count, maxM), 8)}%`, backgroundColor: '#10b981' }]} />
                        </View>
                      </View>
                    );
                  })}
                </Card>
              </View>
            )}

            {/* ══════ MEDICATIONS TAB ══════ */}
            {activeTab === 'medicines' && (
              <View>
                {/* 3 KPI cards */}
                <View style={s.kpiRow}>
                  <KpiCard icon="medkit" iconColor="#6366f1"
                    bgColor={isDark ? '#312e81' : '#eef2ff'}
                    value={data.medications?.total ?? 0}
                    label={t('pharmacyAdminReports.totalMedications') || 'Total'} />
                  <KpiCard icon="checkmark-circle" iconColor="#10b981"
                    bgColor={isDark ? '#064e3b' : '#ecfdf5'}
                    value={data.medications?.active ?? 0}
                    label={t('pharmacyAdminReports.activeMedications') || 'Active'} />
                </View>
                <View style={[s.kpiRow, { marginBottom: 0 }]}>
                  <KpiCard icon="time" iconColor="#6b7280"
                    bgColor={isDark ? '#334155' : '#f9fafb'}
                    value={data.medications?.inactive ?? 0}
                    label={t('pharmacyAdminReports.inactiveMedications') || 'Inactive'} />
                  <View style={{ flex: 1 }} />
                </View>

                {/* Top prescribed */}
                <Card style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 12 }]}>
                  <View style={s.sectionHeader}>
                    <Ionicons name="bar-chart" size={16} color="#6366f1" />
                    <Text style={[s.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyAdminReports.topPrescribed') || 'Most Common Medications'}
                    </Text>
                  </View>
                  {(data.medications?.top_prescribed?.length ?? 0) === 0 ? (
                    <Text style={[s.noData, { color: colors.textMuted }]}>{t('pharmacyAdminReports.noData') || 'No data'}</Text>
                  ) : data.medications.top_prescribed.map((med, i) => {
                    const maxP = data.medications.top_prescribed[0]?.count || 1;
                    return (
                      <View key={i} style={{ marginBottom: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                            <View style={[s.medIcon, { backgroundColor: isDark ? '#312e81' : '#eef2ff' }]}>
                              <Ionicons name="medkit" size={10} color="#6366f1" />
                            </View>
                            <Text style={[s.barLabel, { color: colors.text }]} numberOfLines={1}>{med.name}</Text>
                          </View>
                          <Text style={[s.barValue, { color: colors.text }]}>
                            {med.count} {med.count === 1 ? 'patient' : 'patients'}
                          </Text>
                        </View>
                        <View style={[s.barTrack, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]}>
                          <View style={[s.barFill, { width: `${Math.max(pct(med.count, maxP), 8)}%`, backgroundColor: '#6366f1' }]} />
                        </View>
                      </View>
                    );
                  })}
                </Card>

                {/* Medication Summary */}
                <View style={[s.summaryCard, { overflow: 'hidden' }]}>
                  <View style={s.summaryHeader}>
                    <Ionicons name="document-text" size={16} color="#fff" />
                    <Text style={s.summaryHeaderText}>
                      {t('pharmacyAdminReports.medicationSummary') || 'Medication Summary'}
                    </Text>
                  </View>
                  <View style={[s.summaryBody, { backgroundColor: colors.surface }]}>
                    <View style={s.summaryGrid}>
                      <View style={[s.summaryGridItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                        <Text style={[s.summaryBigNum, { color: colors.text }]}>
                          {data.medications?.total > 0
                            ? ((data.medications.active / data.medications.total) * 100).toFixed(0)
                            : 0}%
                        </Text>
                        <Text style={[s.summarySmallLabel, { color: colors.textMuted }]}>
                          {t('pharmacyAdminReports.activeRate') || 'Active Rate'}
                        </Text>
                      </View>
                      <View style={[s.summaryGridItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                        <Text style={[s.summaryBigNum, { color: colors.text }]}>
                          {data.patients?.total > 0
                            ? (data.medications.total / data.patients.total).toFixed(1)
                            : 0}
                        </Text>
                        <Text style={[s.summarySmallLabel, { color: colors.textMuted }]}>
                          {t('pharmacyAdminReports.avgPerPatient') || 'Avg per Patient'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Generated timestamp */}
            <Text style={[s.timestamp, { color: colors.textMuted }]}>
              {t('pharmacyAdminReports.generatedAt') || 'Report generated at'}{' '}
              {data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },

  heroHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    backgroundColor: '#0d9488',
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  tabBar: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 16, borderWidth: 1, padding: 4 },
  tabBarContent: { flexDirection: 'row', gap: 4 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  tabBtnText: { fontSize: 11, fontWeight: '700' },

  body: { padding: 16 },

  errorCard: { borderRadius: 14, marginBottom: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  errorText: { fontSize: 13, flex: 1 },

  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  kpiCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, elevation: 1 },
  kpiIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 26, fontWeight: '800' },
  kpiLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },

  barLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  barValue: { fontSize: 12, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },

  noData: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },

  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 },
  chartBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  chartBarCount: { fontSize: 8, fontWeight: '700', marginBottom: 2 },
  chartBarInner: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 3 },
  chartBarLabel: { fontSize: 7, marginTop: 3, textAlign: 'center', fontWeight: '600' },

  quickStatsRow: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderStyle: 'dashed' },
  quickStat: { flex: 1, alignItems: 'center' },
  quickStatValue: { fontSize: 20, fontWeight: '800' },
  quickStatLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: 2 },

  outcomeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outcomeCell: { width: '47%', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1 },
  outcomeCnt: { fontSize: 20, fontWeight: '800' },
  outcomeLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },

  recentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  recentPatient: { fontSize: 13, fontWeight: '600' },
  recentMed: { fontSize: 11, marginTop: 1 },
  recentBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  recentBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },

  avatarMini: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0d9488', justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  medIcon: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },

  summaryCard: { borderRadius: 16, marginBottom: 12, elevation: 2 },
  summaryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#6366f1',
  },
  summaryHeaderText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  summaryBody: { padding: 14 },
  summaryGrid: { flexDirection: 'row', gap: 10 },
  summaryGridItem: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryBigNum: { fontSize: 28, fontWeight: '800' },
  summarySmallLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase', marginTop: 4 },

  timestamp: { textAlign: 'center', fontSize: 10, fontWeight: '500', marginTop: 16, marginBottom: 8 },
});
