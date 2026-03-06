import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, Button, TextInput, Snackbar } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { sideEffectAPI, medicineAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const SEVERITY_OPTIONS = [
  { value: 'mild', color: '#dcfce7', textColor: '#166534' },
  { value: 'moderate', color: '#fef9c3', textColor: '#854d0e' },
  { value: 'severe', color: '#fed7aa', textColor: '#9a3412' },
  { value: 'life_threatening', color: '#fecaca', textColor: '#991b1b' },
];

const REACTION_TYPES = [
  { value: 'side_effect', icon: '💊' },
  { value: 'allergic', icon: '🤧' },
  { value: 'adverse_event', icon: '⚠️' },
  { value: 'medication_error', icon: '❌' },
  { value: 'other', icon: '📝' },
];

const OUTCOME_OPTIONS = ['recovered', 'recovering', 'not_recovered', 'unknown'];

const SideEffectTrackerScreen = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [sideEffects, setSideEffects] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [filterSeverity, setFilterSeverity] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const defaultForm = {
    reaction_type: 'side_effect',
    severity: 'mild',
    medication_name: '',
    medication_dosage: '',
    symptoms: '',
    onset_time: new Date().toISOString().slice(0, 16),
    duration: '',
    treatment_given: '',
    outcome: 'unknown',
    reported_by: 'patient',
  };

  const [form, setForm] = useState(defaultForm);

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message, type });
  };

  const fetchSideEffects = useCallback(async () => {
    try {
      const filters = {};
      if (filterSeverity) filters.severity = filterSeverity;
      const data = await sideEffectAPI.getAll(filters);
      setSideEffects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      logError('SideEffectTrackerScreen.fetchSideEffects', err);
      const errorMessage = getErrorMessage(err, t);
      showSnackbar(errorMessage, 'error');
    }
  }, [filterSeverity, t]);

  const fetchMedicines = useCallback(async () => {
    try {
      const data = await medicineAPI.getAll();
      setMedicines(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      logError('SideEffectTrackerScreen.fetchMedicines', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSideEffects(), fetchMedicines()]);
      setLoading(false);
    };
    init();
  }, [fetchSideEffects, fetchMedicines]);

  const handleSubmit = async () => {
    if (!form.symptoms.trim()) {
      showSnackbar(t('sideEffects.symptomsRequired'), 'error');
      return;
    }
    setSubmitting(true);
    try {
      await sideEffectAPI.create(form);
      showSnackbar(t('sideEffects.reportSuccess'));
      setForm(defaultForm);
      setShowForm(false);
      fetchSideEffects();
    } catch (err) {
      logError('SideEffectTrackerScreen.handleSubmit', err);
      const errorMessage = getErrorMessage(err, t);
      showSnackbar(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await sideEffectAPI.update(id, { is_resolved: true, resolved_date: new Date().toISOString().split('T')[0] });
      showSnackbar(t('sideEffects.resolved'));
      fetchSideEffects();
    } catch (err) {
      logError('SideEffectTrackerScreen.handleResolve', err);
      const errorMessage = getErrorMessage(err, t);
      showSnackbar(errorMessage, 'error');
    }
  };

  const getSeverityStyle = (severity) => {
    const option = SEVERITY_OPTIONS.find(o => o.value === severity);
    return option || { color: '#f3f4f6', textColor: '#374151' };
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        data={sideEffects}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
                <Text style={[styles.backText, { color: colors.primary }]}>← {t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>{t('sideEffects.title')}</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('sideEffects.subtitle')}</Text>
            </View>

            {/* Add Button */}
            <Button
              mode="contained"
              onPress={() => setShowForm(true)}
              style={styles.addButton}
              buttonColor={colors.primary}
              icon="plus"
            >
              {t('sideEffects.reportNew')}
            </Button>

            {/* Severity Filter */}
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>{t('sideEffects.filterBySeverity')}</Text>
              <View style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    !filterSeverity && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setFilterSeverity('')}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }, !filterSeverity && styles.chipTextActive]}>
                    {t('sideEffects.all')}
                  </Text>
                </TouchableOpacity>
                {SEVERITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.chip,
                      filterSeverity === opt.value && { backgroundColor: opt.color, borderColor: opt.textColor },
                    ]}
                    onPress={() => setFilterSeverity(opt.value)}
                  >
                    <Text style={[styles.chipText, filterSeverity === opt.value && { color: opt.textColor }]}>
                      {t(`sideEffects.${opt.value}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const severity = getSeverityStyle(item.severity);
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)} accessibilityLabel="Toggle details" accessibilityRole="button">
              <Card style={[styles.itemCard, { borderLeftColor: severity.textColor, backgroundColor: colors.surface }]}>
                <View style={styles.itemContent}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: severity.color }]}>
                      <Text style={[styles.severityText, { color: severity.textColor }]}>
                        {t(`sideEffects.${item.severity}`)}
                      </Text>
                    </View>
                    <Text style={[styles.itemDate, { color: colors.textMuted }]}>
                      {item.onset_time ? new Date(item.onset_time).toLocaleDateString() : ''}
                    </Text>
                  </View>
                  <Text style={[styles.itemSymptoms, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 2}>
                    {item.symptoms}
                  </Text>
                  {item.medication_name && (
                    <Text style={[styles.itemMedicine, { color: colors.textSecondary }]}>💊 {item.medication_name}</Text>
                  )}
                  {isExpanded && (
                    <View style={[styles.expandedContent, { borderTopColor: colors.border }]}>
                      {item.treatment_given ? (
                        <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                          {t('sideEffects.treatmentGiven')}: {item.treatment_given}
                        </Text>
                      ) : null}
                      <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                        {t('sideEffects.outcome')}: {t(`sideEffects.${item.outcome || 'unknown'}`)}
                      </Text>
                      {!item.is_resolved && (
                        <Button
                          mode="outlined"
                          onPress={() => handleResolve(item.id)}
                          style={[styles.resolveButton, { borderColor: colors.primary }]}
                          compact
                        >
                          {t('sideEffects.markResolved')}
                        </Button>
                      )}
                      {item.is_resolved && (
                        <View style={styles.resolvedBadge}>
                          <Text style={styles.resolvedText}>✅ {t('sideEffects.resolvedLabel')}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('sideEffects.noRecords')}</Text>
          </View>
        }
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
      />

      {/* New Side Effect Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <ScrollView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{t('sideEffects.reportNew')}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} accessibilityLabel="Close form" accessibilityRole="button">
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Reaction Type */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('sideEffects.reactionType')}</Text>
            <View style={styles.reactionRow}>
              {REACTION_TYPES.map((rt) => (
                <TouchableOpacity
                  key={rt.value}
                  style={[
                    styles.reactionChip,
                    { backgroundColor: colors.background, borderColor: colors.border },
                    form.reaction_type === rt.value && { backgroundColor: colors.primaryLight, borderColor: colors.primary },
                  ]}
                  onPress={() => setForm((p) => ({ ...p, reaction_type: rt.value }))}
                >
                  <Text style={styles.reactionIcon}>{rt.icon}</Text>
                  <Text
                    style={[
                      styles.reactionText,
                      { color: colors.textSecondary },
                      form.reaction_type === rt.value && { color: colors.primary, fontWeight: '600' },
                    ]}
                  >
                    {t(`sideEffects.${rt.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Severity */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('sideEffects.severity')}</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((sev) => (
                <TouchableOpacity
                  key={sev.value}
                  style={[
                    styles.severityOption,
                    { backgroundColor: form.severity === sev.value ? sev.color : '#f9fafb' },
                  ]}
                  onPress={() => setForm((p) => ({ ...p, severity: sev.value }))}
                >
                  <Text
                    style={[
                      styles.severityOptionText,
                      { color: form.severity === sev.value ? sev.textColor : '#6b7280' },
                    ]}
                  >
                    {t(`sideEffects.${sev.value}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Medicine Picker */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('sideEffects.medicine')}</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Picker
                selectedValue={form.medication_name}
                onValueChange={(value) => {
                  const med = medicines.find((m) => m.name === value);
                  setForm((p) => ({
                    ...p,
                    medication_name: value,
                    medication_dosage: med?.dosage || p.medication_dosage,
                  }));
                }}
                style={styles.picker}
              >
                <Picker.Item label={t('sideEffects.selectMedicine')} value="" />
                {medicines.map((m) => (
                  <Picker.Item key={m.id} label={`${m.name} (${m.dosage})`} value={m.name} />
                ))}
              </Picker>
            </View>

            {/* Symptoms */}
            <TextInput
              label={t('sideEffects.symptoms') + ' *'}
              placeholder={t('sideEffects.symptomsPlaceholder')}
              value={form.symptoms}
              onChangeText={(value) => setForm((p) => ({ ...p, symptoms: value }))}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />

            {/* Duration */}
            <TextInput
              label={t('sideEffects.duration')}
              placeholder={t('sideEffects.durationPlaceholder')}
              value={form.duration}
              onChangeText={(value) => setForm((p) => ({ ...p, duration: value }))}
              mode="outlined"
              style={styles.input}
            />

            {/* Treatment Given */}
            <TextInput
              label={t('sideEffects.treatmentGiven')}
              placeholder={t('sideEffects.treatmentPlaceholder')}
              value={form.treatment_given}
              onChangeText={(value) => setForm((p) => ({ ...p, treatment_given: value }))}
              mode="outlined"
              multiline
              numberOfLines={2}
              style={styles.input}
            />

            {/* Outcome */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>{t('sideEffects.outcome')}</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Picker
                selectedValue={form.outcome}
                onValueChange={(value) => setForm((p) => ({ ...p, outcome: value }))}
                style={styles.picker}
              >
                {OUTCOME_OPTIONS.map((o) => (
                  <Picker.Item key={o} label={t(`sideEffects.${o}`)} value={o} />
                ))}
              </Picker>
            </View>

            {/* Submit / Cancel */}
            <View style={styles.formButtons}>
              <Button
                mode="outlined"
                onPress={() => { setForm(defaultForm); setShowForm(false); }}
                style={styles.cancelButton}
              >
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmit}
                loading={submitting}
                disabled={submitting}
                style={styles.submitButton}
                buttonColor={colors.primary}
              >
                {submitting ? t('sideEffects.submitting') : t('sideEffects.submit')}
              </Button>
            </View>
          </View>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '', type: 'success' })}
        duration={3000}
        style={{ backgroundColor: snackbar.type === 'error' ? colors.error : colors.success }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 16 },
  backButton: { marginBottom: 12 },
  backText: { color: '#0d9488', fontSize: 14, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  addButton: { backgroundColor: '#0d9488', marginBottom: 16, borderRadius: 10 },
  filterRow: { marginBottom: 16 },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  chipActive: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#ffffff' },
  emptyContainer: { alignItems: 'center', paddingVertical: 50 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6b7280' },
  itemCard: { marginBottom: 12, borderRadius: 12, borderLeftWidth: 4 },
  itemContent: { padding: 14 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  severityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  severityText: { fontSize: 12, fontWeight: '600' },
  itemDate: { fontSize: 12, color: '#9ca3af' },
  itemSymptoms: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 4 },
  itemMedicine: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  expandedContent: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  detailText: { fontSize: 13, color: '#6b7280', marginBottom: 6 },
  resolveButton: { marginTop: 8, borderColor: '#0d9488' },
  resolvedBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#dcfce7' },
  resolvedText: { fontSize: 12, color: '#166534', fontWeight: '500' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalContent: { padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1f2937' },
  closeText: { fontSize: 24, color: '#6b7280', padding: 4 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  reactionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reactionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb',
  },
  reactionChipActive: { backgroundColor: '#f0fdfa', borderColor: '#0d9488' },
  reactionIcon: { fontSize: 16 },
  reactionText: { fontSize: 12, color: '#6b7280' },
  reactionTextActive: { color: '#0d9488', fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityOption: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  severityOptionText: { fontSize: 12, fontWeight: '500' },
  pickerContainer: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
    backgroundColor: '#ffffff', marginBottom: 8,
  },
  picker: { height: 50 },
  input: { marginBottom: 8 },
  formButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelButton: { flex: 1 },
  submitButton: { flex: 1, backgroundColor: '#0d9488' },
  snackbarSuccess: { backgroundColor: '#10b981' },
  snackbarError: { backgroundColor: '#ef4444' },
});

export default SideEffectTrackerScreen;
