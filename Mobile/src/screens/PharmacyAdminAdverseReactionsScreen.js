import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, ActivityIndicator, Modal, Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { pharmacyAdminAPI } from '../services/api';
import { logError } from '../utils/errorHandler';

const SEV_CONFIG = {
  severe:           { color: '#ef4444', bg: '#fef2f2', darkBg: '#450a0a', icon: 'shield', label: 'Severe' },
  life_threatening: { color: '#dc2626', bg: '#fef2f2', darkBg: '#450a0a', icon: 'alert-circle', label: 'Life Threatening' },
  moderate:         { color: '#f59e0b', bg: '#fffbeb', darkBg: '#451a03', icon: 'warning', label: 'Moderate' },
  mild:             { color: '#0d9488', bg: '#f0fdfa', darkBg: '#064e3b', icon: 'pulse', label: 'Mild' },
};

export default function PharmacyAdminAdverseReactionsScreen() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterResolved, setFilterResolved] = useState('all');

  // Detail modal
  const [detailData, setDetailData] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const loadReactions = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const params = {};
      if (filterSeverity !== 'all') params.severity = filterSeverity;
      if (filterResolved !== 'all') params.is_resolved = filterResolved === 'resolved' ? 'true' : 'false';
      const result = await pharmacyAdminAPI.getAdverseReactions(params);
      setReactions(Array.isArray(result) ? result : result.results || []);
    } catch (err) {
      logError('PharmacyAdminAdverseReactions.loadReactions', err);
      setError(err.message || 'Failed to load adverse reactions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadReactions(); }, [filterSeverity, filterResolved]));

  const onRefresh = () => { setRefreshing(true); loadReactions(true); };

  // View detail
  const handleViewDetail = async (rx) => {
    setDetailData({ ...rx, _loading: true });
    try {
      const detail = await pharmacyAdminAPI.getAdverseReactionDetail(rx.id);
      setDetailData({ ...detail, _loading: false });
    } catch {
      setDetailData({ ...rx, _loading: false });
    }
  };

  // Mark as resolved
  const handleMarkResolved = async (rxId) => {
    setResolvingId(rxId);
    try {
      await pharmacyAdminAPI.resolveAdverseReaction(rxId);
      setReactions(prev => prev.map(r => r.id === rxId ? { ...r, is_resolved: true, resolved_date: new Date().toISOString() } : r));
      if (detailData && detailData.id === rxId) {
        setDetailData(prev => ({ ...prev, is_resolved: true, resolved_date: new Date().toISOString() }));
      }
      Alert.alert(t('common.success') || 'Success', t('pharmacyAdminAdverseReactions.resolvedSuccess') || 'Marked as resolved');
    } catch (err) {
      logError('PharmacyAdminAdverseReactions.resolve', err);
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to resolve');
    } finally {
      setResolvingId(null);
    }
  };

  const getSev = (severity) => SEV_CONFIG[severity] || SEV_CONFIG.mild;

  // Filter chips
  const severityFilters = [
    { key: 'all', label: t('pharmacyAdminAdverseReactions.allSeverities') || 'All' },
    { key: 'mild', label: t('pharmacyAdminAdverseReactions.mild') || 'Mild' },
    { key: 'moderate', label: t('pharmacyAdminAdverseReactions.moderate') || 'Moderate' },
    { key: 'severe', label: t('pharmacyAdminAdverseReactions.severe') || 'Severe' },
  ];

  const statusFilters = [
    { key: 'all', label: t('pharmacyAdminAdverseReactions.allStatus') || 'All' },
    { key: 'unresolved', label: t('pharmacyAdminAdverseReactions.unresolved') || 'Unresolved' },
    { key: 'resolved', label: t('pharmacyAdminAdverseReactions.resolved') || 'Resolved' },
  ];

  if (loading && reactions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('pharmacyAdminAdverseReactions.loading') || 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header */}
      <View style={[styles.heroHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>
            {t('pharmacyAdminAdverseReactions.title') || 'Adverse Reactions'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('pharmacyAdminAdverseReactions.subtitle') || 'Monitor reported reactions'}
          </Text>
        </View>
        <Ionicons name="shield-checkmark" size={32} color="rgba(255,255,255,0.6)" />
      </View>

      {/* Filters */}
      <View style={[styles.filterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.filterLabel, { color: colors.textMuted }]}>
          {t('pharmacyAdminAdverseReactions.filterBySeverity') || 'Severity'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {severityFilters.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilterSeverity(f.key)}
              style={[
                styles.chip,
                filterSeverity === f.key
                  ? { backgroundColor: '#e11d48' }
                  : { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.chipText, filterSeverity === f.key ? { color: '#fff' } : { color: colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.filterLabel, { color: colors.textMuted, marginTop: 8 }]}>
          {t('pharmacyAdminAdverseReactions.filterByStatus') || 'Status'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {statusFilters.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilterResolved(f.key)}
              style={[
                styles.chip,
                filterResolved === f.key
                  ? { backgroundColor: '#0d9488' }
                  : { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
              ]}
            >
              <Text style={[styles.chipText, filterResolved === f.key ? { color: '#fff' } : { color: colors.textSecondary }]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Reactions List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
      >
        {error && (
          <Card style={[styles.errorCard, { backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
            <View style={styles.errorContent}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={[styles.errorText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>{error}</Text>
            </View>
          </Card>
        )}

        {reactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
              <Ionicons name="shield-checkmark-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('pharmacyAdminAdverseReactions.noReactions') || 'No adverse reactions'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {filterSeverity !== 'all' || filterResolved !== 'all'
                ? (t('pharmacyAdminAdverseReactions.noMatchFilters') || 'No reactions match your filters')
                : (t('pharmacyAdminAdverseReactions.noReported') || 'No reactions reported yet')}
            </Text>
          </View>
        ) : (
          reactions.map((rx, idx) => {
            const sev = getSev(rx.severity);
            const isResolving = resolvingId === rx.id;
            return (
              <Card
                key={rx.id || idx}
                style={[styles.rxCard, { backgroundColor: colors.surface, opacity: rx.is_resolved ? 0.7 : 1 }]}
              >
                {/* Severity strip */}
                <View style={[styles.sevStrip, { backgroundColor: sev.color }]} />

                <View style={styles.rxContent}>
                  {/* Top row */}
                  <View style={styles.rxTopRow}>
                    <View style={[styles.sevIconBg, { backgroundColor: isDark ? sev.darkBg : sev.bg }]}>
                      <Ionicons name={sev.icon} size={20} color={sev.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.rxNameRow}>
                        <Ionicons name="person" size={14} color={colors.textMuted} />
                        <Text style={[styles.rxPatient, { color: colors.text }]}>
                          {rx.patient_name || rx.patient_username || t('pharmacyAdminAdverseReactions.patient') || 'Patient'}
                        </Text>
                      </View>
                      <View style={styles.rxNameRow}>
                        <Ionicons name="medkit" size={13} color={colors.textMuted} />
                        <Text style={[styles.rxMedicine, { color: colors.textSecondary }]}>
                          {rx.medication_name || t('pharmacyAdminAdverseReactions.unknownMedicine') || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Badges */}
                  <View style={styles.badgeRow}>
                    <View style={[styles.sevBadge, { backgroundColor: isDark ? sev.darkBg : sev.bg }]}>
                      <Text style={[styles.sevBadgeText, { color: sev.color }]}>
                        {rx.severity?.charAt(0).toUpperCase() + rx.severity?.slice(1).replace('_', ' ')}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      {
                        backgroundColor: rx.is_resolved
                          ? (isDark ? '#064e3b' : '#ecfdf5')
                          : (isDark ? '#334155' : '#f1f5f9'),
                      },
                    ]}>
                      <Ionicons
                        name={rx.is_resolved ? 'checkmark-circle' : 'time'}
                        size={12}
                        color={rx.is_resolved ? '#10b981' : colors.textMuted}
                      />
                      <Text style={[styles.statusText, { color: rx.is_resolved ? '#10b981' : colors.textSecondary }]}>
                        {rx.is_resolved
                          ? (t('pharmacyAdminAdverseReactions.resolved') || 'Resolved')
                          : (t('pharmacyAdminAdverseReactions.unresolved') || 'Unresolved')}
                      </Text>
                    </View>
                  </View>

                  {/* Description preview */}
                  {rx.symptoms && (
                    <View style={[styles.symptomBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <Text style={[styles.symptomLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.description') || 'Description'}
                      </Text>
                      <Text style={[styles.symptomText, { color: colors.text }]} numberOfLines={2}>
                        {rx.symptoms}
                      </Text>
                    </View>
                  )}

                  {/* Info row */}
                  <View style={styles.infoRow}>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoItemLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.reactionType') || 'Type'}
                      </Text>
                      <Text style={[styles.infoItemValue, { color: colors.text }]}>
                        {rx.reaction_type?.replace(/_/g, ' ') || '—'}
                      </Text>
                    </View>
                    <View style={styles.infoItem}>
                      <Text style={[styles.infoItemLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.reported') || 'Reported'}
                      </Text>
                      <Text style={[styles.infoItemValue, { color: colors.text }]}>
                        {rx.reported_date ? new Date(rx.reported_date).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.viewBtn, { backgroundColor: isDark ? '#0d948820' : '#f0fdfa' }]}
                      onPress={() => handleViewDetail(rx)}
                    >
                      <Ionicons name="document-text" size={14} color="#0d9488" />
                      <Text style={[styles.viewBtnText, { color: '#0d9488' }]}>
                        {t('pharmacyAdminAdverseReactions.viewDetails') || 'View Details'}
                      </Text>
                    </TouchableOpacity>
                    {!rx.is_resolved && (
                      <TouchableOpacity
                        style={[styles.resolveBtn, { backgroundColor: isDark ? '#10b98120' : '#ecfdf5', opacity: isResolving ? 0.6 : 1 }]}
                        onPress={() => handleMarkResolved(rx.id)}
                        disabled={isResolving}
                      >
                        {isResolving ? (
                          <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                          <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                        )}
                        <Text style={[styles.resolveBtnText, { color: '#10b981' }]}>
                          {isResolving ? 'Resolving...' : (t('pharmacyAdminAdverseReactions.markResolved') || 'Mark Resolved')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailData} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header with severity gradient */}
            {detailData && (() => {
              const sev = getSev(detailData.severity);
              return (
                <View style={[styles.modalHeader, { backgroundColor: sev.color }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalHeaderTitle}>
                      {t('pharmacyAdminAdverseReactions.reactionDetails') || 'Reaction Details'}
                    </Text>
                    <View style={styles.modalBadges}>
                      <View style={[styles.modalBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Text style={styles.modalBadgeText}>
                          {detailData.severity?.charAt(0).toUpperCase() + detailData.severity?.slice(1).replace('_', ' ')}
                        </Text>
                      </View>
                      <View style={[styles.modalBadge, {
                        backgroundColor: detailData.is_resolved ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.2)',
                      }]}>
                        <Ionicons
                          name={detailData.is_resolved ? 'checkmark-circle' : 'time'}
                          size={12} color="#fff"
                        />
                        <Text style={styles.modalBadgeText}>
                          {detailData.is_resolved ? 'Resolved' : 'Unresolved'}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setDetailData(null)} style={styles.modalClose}>
                    <Ionicons name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              );
            })()}

            {detailData?._loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : detailData && (
              <ScrollView style={styles.modalBody}>
                {/* Patient & Medicine */}
                <Card style={[styles.detailSection, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                  <View style={styles.detailSectionRow}>
                    <View style={styles.detailAvatarSmall}>
                      <Text style={styles.detailAvatarSmallText}>
                        {(detailData.patient_name || detailData.patient_username || '?')[0]?.toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailSectionLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.patient') || 'Patient'}
                      </Text>
                      <Text style={[styles.detailSectionValue, { color: colors.text }]}>
                        {detailData.patient_name || detailData.patient_username || '—'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.detailSectionRow, { marginTop: 10 }]}>
                    <View style={[styles.detailIconSmall, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                      <Ionicons name="medkit" size={16} color="#0d9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailSectionLabel, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.medicine') || 'Medicine'}
                      </Text>
                      <Text style={[styles.detailSectionValue, { color: colors.text }]}>
                        {detailData.medication_name || '—'}
                        {detailData.medication_dosage ? ` (${detailData.medication_dosage})` : ''}
                      </Text>
                    </View>
                  </View>
                </Card>

                {/* Symptoms */}
                <Card style={[styles.detailSection, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                  <View style={styles.detailSectionHeader}>
                    <Ionicons name="clipboard" size={16} color="#f59e0b" />
                    <Text style={[styles.detailSectionHeaderText, { color: colors.textMuted }]}>
                      {t('pharmacyAdminAdverseReactions.symptomsDescription') || 'Symptoms / Description'}
                    </Text>
                  </View>
                  <Text style={[styles.detailSymptomsText, { color: colors.text }]}>
                    {detailData.symptoms || '—'}
                  </Text>
                </Card>

                {/* Detail grid */}
                <View style={styles.detailGrid}>
                  {[
                    { icon: 'pulse', label: t('pharmacyAdminAdverseReactions.reactionType') || 'Type', value: detailData.reaction_type?.replace(/_/g, ' ') },
                    { icon: 'heart', label: t('pharmacyAdminAdverseReactions.outcome') || 'Outcome', value: detailData.outcome?.replace(/_/g, ' ') },
                    { icon: 'calendar', label: t('pharmacyAdminAdverseReactions.reported') || 'Reported', value: detailData.reported_date ? new Date(detailData.reported_date).toLocaleDateString() : '—' },
                    { icon: 'time', label: t('pharmacyAdminAdverseReactions.onset') || 'Onset', value: detailData.onset_time ? new Date(detailData.onset_time).toLocaleString() : '—' },
                    { icon: 'hourglass', label: t('pharmacyAdminAdverseReactions.duration') || 'Duration', value: detailData.duration || '—' },
                    { icon: 'person', label: t('pharmacyAdminAdverseReactions.reportedBy') || 'Reported By', value: detailData.reported_by?.replace(/_/g, ' ') || '—' },
                  ].map((item, i) => (
                    <View key={i} style={[styles.detailGridItem, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                      <Ionicons name={item.icon} size={14} color={colors.primary} />
                      <Text style={[styles.detailGridLabel, { color: colors.textMuted }]}>{item.label}</Text>
                      <Text style={[styles.detailGridValue, { color: colors.text }]} numberOfLines={1}>
                        {item.value || '—'}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Treatment */}
                {detailData.treatment_given && (
                  <Card style={[styles.detailSection, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="medkit" size={16} color="#3b82f6" />
                      <Text style={[styles.detailSectionHeaderText, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.treatment') || 'Treatment Given'}
                      </Text>
                    </View>
                    <Text style={[styles.detailSymptomsText, { color: colors.text }]}>
                      {detailData.treatment_given}
                    </Text>
                  </Card>
                )}

                {/* Medication Batch */}
                {detailData.medication_batch && (
                  <Card style={[styles.detailSection, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="barcode" size={16} color="#8b5cf6" />
                      <Text style={[styles.detailSectionHeaderText, { color: colors.textMuted }]}>
                        {t('pharmacyAdminAdverseReactions.batchInfo') || 'Medication Batch'}
                      </Text>
                    </View>
                    <Text style={[styles.detailSymptomsText, { color: colors.text }]}>
                      {detailData.medication_batch}
                    </Text>
                  </Card>
                )}

                {/* Drug Registry Info */}
                {detailData.drug_info && detailData.drug_info.is_registered_in_rwanda && (
                  <Card style={[styles.drugRegistryCard, { backgroundColor: isDark ? '#1e293b' : '#f0fdf4', borderColor: isDark ? '#064e3b' : '#bbf7d0' }]}>
                    <View style={styles.detailSectionHeader}>
                      <MaterialCommunityIcons name="certificate" size={16} color="#16a34a" />
                      <Text style={[styles.detailSectionHeaderText, { color: '#16a34a' }]}>
                        {t('pharmacyAdminAdverseReactions.rwandaFDA') || 'Rwanda FDA Registry'}
                      </Text>
                    </View>

                    {[
                      { label: t('pharmacyAdminAdverseReactions.brandName') || 'Brand Name', value: detailData.drug_info.brand_name },
                      { label: t('pharmacyAdminAdverseReactions.genericName') || 'Generic Name', value: detailData.drug_info.generic_name },
                      { label: t('pharmacyAdminAdverseReactions.strength') || 'Strength', value: detailData.drug_info.strength },
                      { label: t('pharmacyAdminAdverseReactions.form') || 'Form', value: detailData.drug_info.form },
                      { label: t('pharmacyAdminAdverseReactions.manufacturer') || 'Manufacturer', value: detailData.drug_info.manufacturer },
                      { label: t('pharmacyAdminAdverseReactions.regNumber') || 'Registration No.', value: detailData.drug_info.registration_number },
                    ].filter(item => item.value).map((item, i) => (
                      <View key={i} style={styles.drugInfoRow}>
                        <Text style={[styles.drugInfoLabel, { color: colors.textMuted }]}>{item.label}</Text>
                        <Text style={[styles.drugInfoValue, { color: colors.text }]}>{item.value}</Text>
                      </View>
                    ))}
                  </Card>
                )}

                {/* Follow-up */}
                {detailData.requires_follow_up && (
                  <Card style={[styles.followUpCard, { borderColor: '#f59e0b', backgroundColor: isDark ? '#451a0320' : '#fffbeb' }]}>
                    <View style={styles.detailSectionHeader}>
                      <Ionicons name="warning" size={16} color="#f59e0b" />
                      <Text style={[styles.detailSectionHeaderText, { color: '#f59e0b' }]}>
                        {t('pharmacyAdminAdverseReactions.followUpRequired') || 'Follow-up Required'}
                      </Text>
                    </View>
                    {detailData.follow_up_date && (
                      <Text style={[styles.followUpDate, { color: colors.text }]}>
                        Date: {new Date(detailData.follow_up_date).toLocaleDateString()}
                      </Text>
                    )}
                    {detailData.follow_up_notes && (
                      <Text style={[styles.detailSymptomsText, { color: colors.textSecondary }]}>
                        {detailData.follow_up_notes}
                      </Text>
                    )}
                  </Card>
                )}

                {/* Resolved info */}
                {detailData.is_resolved && detailData.resolved_date && (
                  <View style={[styles.resolvedInfo, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                    <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                    <View>
                      <Text style={[styles.resolvedLabel, { color: colors.textMuted }]}>Resolved on</Text>
                      <Text style={[styles.resolvedDate, { color: colors.text }]}>
                        {new Date(detailData.resolved_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Resolve CTA */}
                {!detailData.is_resolved && (
                  <TouchableOpacity
                    style={[styles.resolveCta, { opacity: resolvingId === detailData.id ? 0.6 : 1 }]}
                    onPress={() => handleMarkResolved(detailData.id)}
                    disabled={resolvingId === detailData.id}
                  >
                    {resolvingId === detailData.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    )}
                    <Text style={styles.resolveCtaText}>
                      {resolvingId === detailData.id ? 'Resolving...' : (t('pharmacyAdminAdverseReactions.markResolved') || 'Mark as Resolved')}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 32 }} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14 },
  heroHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    backgroundColor: '#e11d48',
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  filterSection: {
    margin: 16, marginBottom: 8, padding: 14, borderRadius: 16,
    borderWidth: 1, elevation: 2,
  },
  filterLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  chips: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 8 },
  errorCard: { borderRadius: 14, marginBottom: 12 },
  errorContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  errorText: { fontSize: 13, flex: 1 },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  rxCard: { borderRadius: 16, marginBottom: 12, elevation: 2, overflow: 'hidden' },
  sevStrip: { height: 4 },
  rxContent: { padding: 16 },
  rxTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  sevIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rxNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  rxPatient: { fontSize: 15, fontWeight: '700' },
  rxMedicine: { fontSize: 13 },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  sevBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },

  symptomBox: { borderRadius: 12, padding: 12, marginBottom: 10 },
  symptomLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  symptomText: { fontSize: 13, lineHeight: 18 },

  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  infoItem: { flex: 1, borderRadius: 10, padding: 8 },
  infoItemLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 },
  infoItemValue: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  actionRow: { flexDirection: 'row', gap: 8 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  viewBtnText: { fontSize: 12, fontWeight: '700' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  resolveBtnText: { fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 8 },
  modalBadges: { flexDirection: 'row', gap: 6 },
  modalBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  modalClose: { padding: 4 },
  modalLoading: { padding: 48, alignItems: 'center' },
  modalBody: { padding: 16 },

  detailSection: { borderRadius: 16, padding: 14, marginBottom: 12 },
  detailSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailAvatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
  detailAvatarSmallText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  detailIconSmall: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  detailSectionLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  detailSectionValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },
  detailSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  detailSectionHeaderText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  detailSymptomsText: { fontSize: 13, lineHeight: 20 },

  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  detailGridItem: { width: '48%', borderRadius: 12, padding: 10 },
  detailGridLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', marginTop: 4, marginBottom: 2 },
  detailGridValue: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  followUpCard: { borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 2 },
  followUpDate: { fontSize: 13, fontWeight: '600', marginTop: 4 },

  resolvedInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginBottom: 12 },
  resolvedLabel: { fontSize: 10, fontWeight: '600' },
  resolvedDate: { fontSize: 13, fontWeight: '600' },

  resolveCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: 14,
    backgroundColor: '#0d9488',
  },
  resolveCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Drug Registry
  drugRegistryCard: {
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1,
  },
  drugInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  drugInfoLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', flex: 1 },
  drugInfoValue: { fontSize: 13, fontWeight: '600', flex: 1.5, textAlign: 'right' },
});
