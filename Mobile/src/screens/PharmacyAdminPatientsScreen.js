import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, ActivityIndicator, TextInput,
  Modal, FlatList,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { pharmacyAdminAPI } from '../services/api';
import { logError } from '../utils/errorHandler';

export default function PharmacyAdminPatientsScreen() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  // Modals
  const [detailModal, setDetailModal] = useState(null);
  const [medicinesModal, setMedicinesModal] = useState(null);

  const loadPatients = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const params = {};
      if (filterActive !== 'all') params.is_active = filterActive === 'active' ? 'true' : 'false';
      const result = await pharmacyAdminAPI.getPatients(params);
      setPatients(Array.isArray(result) ? result : result.results || []);
    } catch (err) {
      logError('PharmacyAdminPatients.loadPatients', err);
      setError(err.message || 'Failed to load patients');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadPatients(); }, [filterActive]));

  const onRefresh = () => { setRefreshing(true); loadPatients(true); };

  const filteredPatients = patients.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const name = `${p.first_name || ''} ${p.last_name || ''} ${p.username || ''} ${p.email || ''}`.toLowerCase();
    return name.includes(term);
  });

  // View patient detail
  const handleViewPatient = async (patient) => {
    setDetailModal({ ...patient, _loading: true });
    try {
      const detail = await pharmacyAdminAPI.getPatientDetail(patient.id || patient.patient_id);
      setDetailModal({ ...detail, _loading: false });
    } catch {
      setDetailModal({ ...patient, _loading: false });
    }
  };

  // View patient medicines
  const handleViewMedicines = async (patient) => {
    setMedicinesModal({ patient, medicines: [], _loading: true });
    try {
      const meds = await pharmacyAdminAPI.getPatientMedicines(patient.id || patient.patient_id);
      setMedicinesModal({ patient, medicines: Array.isArray(meds) ? meds : meds.medicines || [], _loading: false });
    } catch {
      setMedicinesModal({ patient, medicines: [], _loading: false });
    }
  };

  const getInitials = (p) => {
    const f = (p.first_name || p.username || '?')[0]?.toUpperCase() || '?';
    const l = (p.last_name || '')[0]?.toUpperCase() || '';
    return f + l;
  };

  // Filter chips
  const filters = [
    { key: 'all', label: t('pharmacyAdminPatients.allPatients') || 'All' },
    { key: 'active', label: t('pharmacyAdminPatients.active') || 'Active' },
    { key: 'inactive', label: t('pharmacyAdminPatients.inactive') || 'Inactive' },
  ];

  if (loading && patients.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t('pharmacyAdminPatients.loading') || 'Loading patients...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: '#3b82f6' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{t('pharmacyAdminPatients.title') || 'My Patients'}</Text>
          <Text style={styles.heroSubtitle}>
            {t('pharmacyAdminPatients.subtitle') || 'Manage patients linked to your pharmacy'}
          </Text>
        </View>
        <Ionicons name="people" size={32} color="rgba(255,255,255,0.6)" />
      </View>

      {/* Search + Filters */}
      <View style={[styles.filterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchText, { color: colors.text }]}
            placeholder={t('pharmacyAdminPatients.searchPlaceholder') || 'Search patients...'}
            placeholderTextColor={colors.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilterActive(f.key)}
              style={[
                styles.chip,
                filterActive === f.key
                  ? { backgroundColor: '#3b82f6' }
                  : { backgroundColor: isDark ? '#334155' : '#f1f5f9' },
              ]}
            >
              <Text style={[
                styles.chipText,
                filterActive === f.key ? { color: '#fff' } : { color: colors.textSecondary },
              ]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={(item, i) => String(item.id || item.patient_id || i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
              <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t('pharmacyAdminPatients.noPatients') || 'No patients found'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchTerm
                ? (t('pharmacyAdminPatients.noMatchSearch') || 'No patients match your search')
                : (t('pharmacyAdminPatients.noRegistered') || 'No patients registered yet')}
            </Text>
          </View>
        }
        renderItem={({ item: p }) => {
          const isActive = p.is_active !== false;
          return (
            <Card style={[styles.patientCard, { backgroundColor: colors.surface }]}>
              <View style={styles.patientRow}>
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: isActive ? '#0d9488' : '#94a3b8' }]}>
                  <Text style={styles.avatarText}>{getInitials(p)}</Text>
                </View>

                {/* Info */}
                <View style={styles.patientInfo}>
                  <Text style={[styles.patientName, { color: colors.text }]}>
                    {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.username || 'Unknown'}
                  </Text>
                  <Text style={[styles.patientEmail, { color: colors.textSecondary }]} numberOfLines={1}>
                    {p.email || p.username || ''}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: isActive ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#450a0a' : '#fef2f2') },
                    ]}>
                      <View style={[styles.statusDot, { backgroundColor: isActive ? '#10b981' : '#ef4444' }]} />
                      <Text style={[styles.badgeText, { color: isActive ? '#10b981' : '#ef4444' }]}>
                        {isActive ? (t('pharmacyAdminPatients.active') || 'Active') : (t('pharmacyAdminPatients.inactive') || 'Inactive')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actionBtns}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}
                    onPress={() => handleViewPatient(p)}
                  >
                    <Ionicons name="eye" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}
                    onPress={() => handleViewMedicines(p)}
                  >
                    <Ionicons name="medkit" size={16} color="#0d9488" />
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Patient Detail Modal */}
      <Modal visible={!!detailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: '#3b82f6' }]}>
              <Text style={styles.modalHeaderTitle}>
                {t('pharmacyAdminPatients.patientDetails') || 'Patient Details'}
              </Text>
              <TouchableOpacity onPress={() => setDetailModal(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {detailModal?._loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : detailModal && (
              <ScrollView style={styles.modalBody}>
                {/* Avatar + Name */}
                <View style={styles.detailHeader}>
                  <View style={[styles.detailAvatar, { backgroundColor: '#0d9488' }]}>
                    <Text style={styles.detailAvatarText}>{getInitials(detailModal)}</Text>
                  </View>
                  <Text style={[styles.detailName, { color: colors.text }]}>
                    {`${detailModal.first_name || ''} ${detailModal.last_name || ''}`.trim() || detailModal.username}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: detailModal.is_active !== false ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#450a0a' : '#fef2f2') },
                  ]}>
                    <View style={[styles.statusDot, { backgroundColor: detailModal.is_active !== false ? '#10b981' : '#ef4444' }]} />
                    <Text style={[styles.badgeText, { color: detailModal.is_active !== false ? '#10b981' : '#ef4444' }]}>
                      {detailModal.is_active !== false ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>

                {/* Info rows */}
                {[
                  { icon: 'person', label: t('pharmacyAdminPatients.username') || 'Username', value: detailModal.username },
                  { icon: 'mail', label: t('pharmacyAdminPatients.email') || 'Email', value: detailModal.email },
                  { icon: 'calendar', label: t('pharmacyAdminPatients.joinedDate') || 'Joined', value: detailModal.date_joined ? new Date(detailModal.date_joined).toLocaleDateString() : detailModal.linked_date ? new Date(detailModal.linked_date).toLocaleDateString() : '—' },
                  { icon: 'medkit', label: t('pharmacyAdminPatients.medicines') || 'Medicines', value: detailModal.medicine_count ?? detailModal.medicines_count ?? '—' },
                ].map((row, i) => (
                  <View key={i} style={[styles.infoRow, { borderColor: colors.border }]}>
                    <View style={[styles.infoIconBg, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                      <Ionicons name={row.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{row.label}</Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>{row.value || '—'}</Text>
                    </View>
                  </View>
                ))}

                {/* View Medicines button */}
                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { setDetailModal(null); handleViewMedicines(detailModal); }}
                >
                  <Ionicons name="medkit" size={18} color="#fff" />
                  <Text style={styles.modalActionBtnText}>
                    {t('pharmacyAdminPatients.viewMedicines') || 'View Medicines'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Medicines Modal */}
      <Modal visible={!!medicinesModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { backgroundColor: '#0d9488' }]}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {t('pharmacyAdminPatients.medicines') || 'Medicines'}
                </Text>
                {medicinesModal?.patient && (
                  <Text style={styles.modalHeaderSubtitle}>
                    {`${medicinesModal.patient.first_name || ''} ${medicinesModal.patient.last_name || ''}`.trim() || medicinesModal.patient.username}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setMedicinesModal(null)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {medicinesModal?._loading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : (
              <FlatList
                data={medicinesModal?.medicines || []}
                keyExtractor={(item, i) => String(item.id || i)}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="medkit-outline" size={40} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 12 }]}>
                      {t('pharmacyAdminPatients.noMedicines') || 'No medicines found'}
                    </Text>
                  </View>
                }
                renderItem={({ item: med }) => (
                  <Card style={[styles.medCard, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
                    <View style={styles.medContent}>
                      <View style={[styles.medIcon, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                        <Ionicons name="medkit" size={20} color="#0d9488" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.medName, { color: colors.text }]}>{med.name || med.medicine_name || '—'}</Text>
                        <Text style={[styles.medDosage, { color: colors.textSecondary }]}>
                          {med.dosage || ''} {med.frequency ? `• ${med.frequency}` : ''}
                        </Text>
                        <View style={[
                          styles.medStatusBadge,
                          { backgroundColor: med.is_active !== false ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#450a0a' : '#fef2f2') },
                        ]}>
                          <Text style={[styles.medStatusText, { color: med.is_active !== false ? '#10b981' : '#ef4444' }]}>
                            {med.is_active !== false ? 'Active' : 'Inactive'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Card>
                )}
              />
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
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  filterSection: {
    margin: 16, marginBottom: 8, padding: 14, borderRadius: 16,
    borderWidth: 1, elevation: 2,
  },
  searchInput: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 10,
  },
  searchText: { flex: 1, fontSize: 14 },
  chips: { flexDirection: 'row' },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, paddingTop: 8 },
  patientCard: { borderRadius: 14, marginBottom: 10, elevation: 1 },
  patientRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  patientEmail: { fontSize: 12, marginBottom: 4 },
  badgeRow: { flexDirection: 'row' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actionBtns: { gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  modalClose: { padding: 4 },
  modalLoading: { padding: 48, alignItems: 'center' },
  modalBody: { padding: 16 },

  detailHeader: { alignItems: 'center', marginBottom: 20 },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  detailAvatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  detailName: { fontSize: 20, fontWeight: '700', marginBottom: 6 },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  infoIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 1 },

  modalActionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 20, paddingVertical: 14, borderRadius: 14,
  },
  modalActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  medCard: { borderRadius: 12, marginBottom: 10 },
  medContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  medIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  medName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  medDosage: { fontSize: 12, marginBottom: 4 },
  medStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  medStatusText: { fontSize: 10, fontWeight: '700' },
});
