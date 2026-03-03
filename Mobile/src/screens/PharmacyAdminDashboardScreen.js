import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { pharmacyAdminAPI } from '../services/api';
import { logError } from '../utils/errorHandler';

export default function PharmacyAdminDashboardScreen() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDashboard = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const result = await pharmacyAdminAPI.getDashboard();
      setData(result);
    } catch (err) {
      logError('PharmacyAdminDashboard.loadDashboard', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard(true);
  };

  const kpis = data ? [
    {
      label: t('pharmacyAdminDashboard.totalPatients') || 'Total Patients',
      value: data.total_patients ?? data.patients_count ?? 0,
      icon: 'people', color: '#3b82f6', bg: isDark ? '#1e3a5f' : '#eff6ff',
    },
    {
      label: t('pharmacyAdminDashboard.activePatients') || 'Active Patients',
      value: data.active_patients ?? 0,
      icon: 'heart', color: '#10b981', bg: isDark ? '#064e3b' : '#ecfdf5',
    },
    {
      label: t('pharmacyAdminDashboard.adverseReactions') || 'Adverse Reactions',
      value: data.adverse_reactions_count ?? data.total_adverse_reactions ?? 0,
      icon: 'warning', color: '#f59e0b', bg: isDark ? '#451a03' : '#fffbeb',
    },
    {
      label: t('pharmacyAdminDashboard.unresolvedReactions') || 'Unresolved',
      value: data.unresolved_reactions ?? 0,
      icon: 'alert-circle', color: '#ef4444', bg: isDark ? '#450a0a' : '#fef2f2',
    },
  ] : [];

  const menuItems = [
    {
      title: t('pharmacyAdminDashboard.viewPatients') || 'View Patients',
      subtitle: t('pharmacyAdminDashboard.viewPatientsDesc') || 'Manage your linked patients',
      icon: 'people', color: '#3b82f6', bg: '#eff6ff', screen: 'PharmacyAdminPatients',
    },
    {
      title: t('pharmacyAdminDashboard.adverseReactionsMenu') || 'Adverse Reactions',
      subtitle: t('pharmacyAdminDashboard.adverseReactionsDesc') || 'Monitor reported reactions',
      icon: 'warning', color: '#f59e0b', bg: '#fffbeb', screen: 'PharmacyAdminAdverseReactions',
    },
    {
      title: t('pharmacyAdminDashboard.reports') || 'Reports & Analytics',
      subtitle: t('pharmacyAdminDashboard.reportsDesc') || 'Comprehensive pharmacy reports',
      icon: 'bar-chart', color: '#8b5cf6', bg: '#f5f3ff', screen: 'PharmacyAdminReports',
    },
  ];

  if (loading && !data) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('common.loading') || 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.heroTitle}>
            {t('pharmacyAdminDashboard.welcome') || 'Welcome,'}{' '}
            {user?.first_name || user?.username || ''}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('pharmacyAdminDashboard.subtitle') || 'Pharmacy Administration'}
          </Text>
        </View>
        <MaterialCommunityIcons name="pharmacy" size={36} color="rgba(255,255,255,0.7)" />
      </View>

      <View style={styles.content}>
        {/* Error */}
        {error && (
          <Card style={[styles.errorCard, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={[styles.errorText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>{error}</Text>
            </View>
          </Card>
        )}

        {/* KPI Cards */}
        {data && (
          <View style={styles.kpiGrid}>
            {kpis.map((kpi, i) => (
              <View key={i} style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.kpiIconContainer, { backgroundColor: kpi.bg }]}>
                  <Ionicons name={kpi.icon} size={22} color={kpi.color} />
                </View>
                <Text style={[styles.kpiValue, { color: colors.text }]}>{kpi.value}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Pharmacy ID */}
        {data?.pharmacy_id && (
          <Card style={[styles.idCard, { backgroundColor: colors.surface }]}>
            <View style={styles.idContent}>
              <View style={[styles.idIconBg, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                <Ionicons name="key" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.idLabel, { color: colors.textMuted }]}>
                  {t('pharmacyAdminDashboard.pharmacyId') || 'Your Pharmacy ID'}
                </Text>
                <Text style={[styles.idValue, { color: colors.text }]}>{data.pharmacy_id}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('pharmacyAdminDashboard.quickActions') || 'Quick Actions'}
        </Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(item.screen)}
            >
              <Card style={[styles.menuCard, { backgroundColor: colors.surface }]}>
                <View style={styles.menuContent}>
                  <View style={[styles.menuIconContainer, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{item.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  heroHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  content: { padding: 16 },
  errorCard: { borderRadius: 14, marginBottom: 16 },
  errorContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  errorText: { fontSize: 13, flex: 1 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  kpiCard: {
    width: '48%', flexGrow: 1, borderRadius: 16, padding: 16,
    borderWidth: 1, marginBottom: 2,
  },
  kpiIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  kpiValue: { fontSize: 28, fontWeight: '800', marginBottom: 2 },
  kpiLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  idCard: { borderRadius: 14, marginBottom: 20 },
  idContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  idIconBg: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  idLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  idValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  menuGrid: { gap: 10, marginBottom: 24 },
  menuCard: { borderRadius: 14, elevation: 1, overflow: 'hidden' },
  menuContent: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  menuSubtitle: { fontSize: 12, opacity: 0.7 },
});
