import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { Card, Button, TextInput, Snackbar, Chip, Divider } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

// ─── Section Header Component ───────────────────────────────────────────────
const SectionHeader = ({ icon, title, subtitle, colors }) => (
  <View style={sectionStyles.header}>
    <View style={[sectionStyles.iconCircle, { backgroundColor: colors.primaryLight + '22' }]}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
    </View>
    <View style={sectionStyles.headerText}>
      <Text style={[sectionStyles.title, { color: colors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[sectionStyles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      )}
    </View>
  </View>
);

const sectionStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f020',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

// ─── Tag/Chip Input Component ───────────────────────────────────────────────
const TagInput = ({ label, placeholder, tags, onTagsChange, colors }) => {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onTagsChange([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (index) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <View style={tagStyles.container}>
      <View style={tagStyles.inputRow}>
        <TextInput
          label={label}
          placeholder={placeholder}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={addTag}
          mode="outlined"
          dense
          style={[tagStyles.input, { backgroundColor: colors.surface }]}
          textColor={colors.text}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          right={
            <TextInput.Icon
              icon="plus-circle"
              color={colors.primary}
              onPress={addTag}
            />
          }
        />
      </View>
      {tags.length > 0 && (
        <View style={tagStyles.chipRow}>
          {tags.map((tag, index) => (
            <Chip
              key={index}
              onClose={() => removeTag(index)}
              style={[tagStyles.chip, { backgroundColor: colors.primaryLight + '20' }]}
              textStyle={{ color: colors.primary, fontSize: 13 }}
              closeIconAccessibilityLabel="Remove"
            >
              {tag}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
};

const tagStyles = StyleSheet.create({
  container: { marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  chip: { marginBottom: 4 },
});

// ─── Main Screen ────────────────────────────────────────────────────────────
export default function AddMedicineScreen({ route }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { medicine } = route?.params || {};

  const isEditMode = !!medicine;

  // ── Form State ──────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    // Basic
    name: '',
    scientific_name: '',
    dosage: '',
    frequency: 'once_daily',
    times: ['08:00'],
    stock: '',
    // Schedule
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    duration: '',
    reminder_enabled: true,
    // Clinical
    dose_mg: '',
    posology: '',
    instructions: '',
    // Doctor
    prescribed_for: '',
    doctor: '',
    // Food
    food_to_avoid: [],
    food_advised: [],
    // Notes
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [medicinePhoto, setMedicinePhoto] = useState(null);
  const [showClinical, setShowClinical] = useState(false);
  const [disclaimerData, setDisclaimerData] = useState(null);

  // ── Load edit data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (medicine && isEditMode) {
      setFormData({
        name: medicine.name || '',
        scientific_name: medicine.scientific_name || '',
        dosage: medicine.dosage || '',
        frequency: medicine.frequency || 'once_daily',
        times: medicine.times || ['08:00'],
        stock: medicine.stock_count?.toString() || medicine.stock?.toString() || '',
        start_date: medicine.start_date || new Date().toISOString().split('T')[0],
        end_date: medicine.end_date || '',
        duration: medicine.duration?.toString() || '',
        reminder_enabled: medicine.reminder_enabled !== false,
        dose_mg: medicine.dose_mg?.toString() || '',
        posology: medicine.posology || '',
        instructions: medicine.instructions || '',
        prescribed_for: medicine.prescribed_for || '',
        doctor: medicine.prescribing_doctor || medicine.doctor || '',
        food_to_avoid: medicine.food_to_avoid || [],
        food_advised: medicine.food_advised || [],
        notes: medicine.notes || '',
      });
      if (medicine.dose_mg || medicine.posology) {
        setShowClinical(true);
      }
    }
  }, [medicine, isEditMode]);

  // ── Frequencies ─────────────────────────────────────────────────────────
  const frequencies = [
    { label: t('addMedicine.onceDaily'), value: 'once_daily' },
    { label: t('addMedicine.twiceDaily'), value: 'twice_daily' },
    { label: t('addMedicine.threeTimesDaily'), value: 'three_times_daily' },
    { label: t('addMedicine.fourTimesDaily'), value: 'four_times_daily' },
    { label: t('addMedicine.asNeeded'), value: 'as_needed' },
    { label: t('addMedicine.weekly'), value: 'weekly' },
    { label: t('addMedicine.monthly'), value: 'monthly' },
  ];

  // ── Helpers ─────────────────────────────────────────────────────────────
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('addMedicine.medicineNameRequired');
    if (!formData.dosage.trim()) newErrors.dosage = t('addMedicine.dosageRequired');
    if (!formData.stock.trim()) {
      newErrors.stock = t('addMedicine.stockRequired');
    } else if (isNaN(parseInt(formData.stock))) {
      newErrors.stock = t('addMedicine.stockMustBeNumber');
    }
    if (!formData.start_date.trim()) {
      newErrors.start_date = 'Start date is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message, type });
  };

  // ── Auto-calculate end date from start date + duration ──────────────────
  useEffect(() => {
    if (formData.start_date && formData.duration && !isNaN(parseInt(formData.duration))) {
      try {
        const start = new Date(formData.start_date);
        if (!isNaN(start.getTime())) {
          const end = new Date(start);
          end.setDate(end.getDate() + parseInt(formData.duration));
          setFormData(prev => ({ ...prev, end_date: end.toISOString().split('T')[0] }));
        }
      } catch (e) {
        // ignore invalid date
      }
    }
  }, [formData.start_date, formData.duration]);

  // ── Barcode handlers ────────────────────────────────────────────────────
  const handleBarcodeScan = async (barcode) => {
    setBarcodeLookupLoading(true);
    setBarcodeResult(null);
    try {
      const data = await medicineAPI.barcodeLookup(barcode);
      if (data && data.name) {
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          dosage: data.dosage || prev.dosage,
          instructions: data.instructions || prev.instructions,
          notes: data.notes ? `${prev.notes ? prev.notes + '\n' : ''}${data.notes}` : prev.notes,
        }));
        setBarcodeResult(data);
        showSnackbar(t('scanner.autoFillSuccess'), 'success');
      } else {
        showSnackbar(t('scanner.notFound'), 'error');
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      showSnackbar(t('scanner.lookupError'), 'error');
    } finally {
      setBarcodeLookupLoading(false);
    }
  };

  const handleManualBarcode = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        t('scanner.title'),
        t('scanner.enterManually'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.search'),
            onPress: (barcode) => {
              if (barcode && barcode.trim()) handleBarcodeScan(barcode.trim());
            },
          },
        ],
        'plain-text',
        '',
        'number-pad'
      );
    } else {
      Alert.alert(
        t('scanner.title'),
        t('scanner.enterManually'),
        [{ text: t('common.cancel'), style: 'cancel' }, { text: 'OK' }]
      );
    }
  };

  // ── Photo picker ────────────────────────────────────────────────────────
  const handlePickPhoto = async (useCamera = false) => {
    try {
      const ImagePicker = require('expo-image-picker');
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('medicinePhoto.cameraPermission'));
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.error'), t('medicinePhoto.galleryPermission'));
          return;
        }
      }
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [4, 3] })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [4, 3] });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setMedicinePhoto({ uri: asset.uri, fileName: asset.fileName || 'medicine_photo.jpg', mimeType: asset.mimeType || 'image/jpeg' });
      }
    } catch (err) {
      console.warn('Image picker not available:', err.message);
      Alert.alert(t('medicinePhoto.label'), t('medicinePhoto.notAvailable'));
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const durationVal = parseInt(formData.duration) || parseInt(formData.stock) || 30;
      const medicineData = {
        name: formData.name,
        scientific_name: formData.scientific_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        times: formData.times,
        duration: durationVal,
        stock_count: parseInt(formData.stock) || 30,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        reminder_enabled: formData.reminder_enabled,
        dose_mg: formData.dose_mg ? parseFloat(formData.dose_mg) : null,
        posology: formData.posology || null,
        instructions: formData.instructions || null,
        prescribed_for: formData.prescribed_for,
        prescribing_doctor: formData.doctor,
        food_to_avoid: formData.food_to_avoid,
        food_advised: formData.food_advised,
        notes: formData.notes,
        barcode: barcodeResult?.barcode || '',
      };

      if (isEditMode) {
        await medicineAPI.update(medicine.id, medicineData);
        if (medicinePhoto) {
          try {
            await medicineAPI.uploadPhoto(medicine.id, medicinePhoto.uri, medicinePhoto.fileName, medicinePhoto.mimeType);
          } catch (e) {
            console.error('Photo upload failed:', e);
          }
        }
        showSnackbar(t('notifications.medicineUpdateSuccess'), 'success');
      } else {
        const response = await medicineAPI.create(medicineData);
        if (medicinePhoto && response.id) {
          try {
            await medicineAPI.uploadPhoto(response.id, medicinePhoto.uri, medicinePhoto.fileName, medicinePhoto.mimeType);
          } catch (e) {
            console.error('Photo upload failed:', e);
          }
        }

        // Check for contraindication / safety warnings from backend
        if (response.safety_warnings && response.safety_warnings.length > 0) {
          setDisclaimerData(response.safety_warnings);
          setLoading(false);
          return; // Don't navigate yet — show disclaimer first
        }

        showSnackbar(t('notifications.medicineAddSuccess'), 'success');
      }

      setTimeout(() => navigation.goBack(), 1500);
    } catch (error) {
      logError('AddMedicineScreen.handleSave', error);
      showSnackbar(getErrorMessage(error, t), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Time slot helpers ───────────────────────────────────────────────────
  const addTimeSlot = () => {
    setFormData(prev => ({ ...prev, times: [...prev.times, '12:00'] }));
  };

  const removeTimeSlot = (index) => {
    if (formData.times.length > 1) {
      setFormData(prev => ({ ...prev, times: prev.times.filter((_, i) => i !== index) }));
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //   RENDER
  // ═══════════════════════════════════════════════════════════════════════

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Page Header ─────────────────────────────────────────── */}
        <View style={[styles.pageHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextWrap}>
            <Text style={styles.pageTitle}>
              {isEditMode ? (t('common.edit') || 'Edit') + ' ' + (t('medicines.title') || 'Medicine') : t('addMedicine.title')}
            </Text>
            <Text style={styles.pageSubtitle}>
              {isEditMode ? (t('addMedicine.editSubtitle') || 'Update your medicine details') : t('addMedicine.subtitle')}
            </Text>
          </View>
          <MaterialCommunityIcons name="pill" size={48} color="rgba(255,255,255,0.25)" style={styles.headerIcon} />
        </View>

        <View style={styles.body}>
          {/* ─── Quick Fill (Barcode) ──────────────────────────────── */}
          <Card style={[styles.scanCard, { backgroundColor: isDark ? colors.surface : '#f0fdfa' }]} mode="contained">
            <View style={styles.scanInner}>
              <View style={styles.scanLeft}>
                <MaterialCommunityIcons name="barcode-scan" size={28} color={colors.primary} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={[styles.scanTitle, { color: colors.primary }]}>{t('scanner.quickFill') || 'Quick Fill'}</Text>
                  <Text style={[styles.scanHint, { color: colors.textMuted }]}>
                    Scan barcode to auto-fill medicine details
                  </Text>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={handleManualBarcode}
                loading={barcodeLookupLoading}
                disabled={barcodeLookupLoading}
                style={[styles.scanBtn, { backgroundColor: colors.primary }]}
                labelStyle={{ fontSize: 12 }}
                compact
                icon="barcode-scan"
              >
                Scan
              </Button>
            </View>
            {barcodeResult && (
              <View style={styles.scanSuccess}>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.scanSuccessText, { color: colors.success }]}>{t('scanner.autoFillSuccess')}</Text>
              </View>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 1: Basic Information
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.sectionInner}>
              <SectionHeader
                icon="pill"
                title="Basic Information"
                subtitle="Medicine name, dosage, and stock"
                colors={colors}
              />

              <TextInput
                label={t('addMedicine.medicineName')}
                placeholder={t('addMedicine.medicinePlaceholder')}
                value={formData.name}
                onChangeText={(v) => handleInputChange('name', v)}
                disabled={loading}
                error={!!errors.name}
                mode="outlined"
                left={<TextInput.Icon icon="pill" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}

              <TextInput
                label={t('medicines.scientificName') || 'Scientific Name'}
                placeholder="e.g., Acetylsalicylic acid"
                value={formData.scientific_name}
                onChangeText={(v) => handleInputChange('scientific_name', v)}
                disabled={loading}
                mode="outlined"
                left={<TextInput.Icon icon="flask" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <TextInput
                    label={t('addMedicine.dosage')}
                    placeholder={t('addMedicine.dosagePlaceholder')}
                    value={formData.dosage}
                    onChangeText={(v) => handleInputChange('dosage', v)}
                    disabled={loading}
                    error={!!errors.dosage}
                    mode="outlined"
                    left={<TextInput.Icon icon="eyedropper" color={colors.textMuted} />}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                  {errors.dosage && <Text style={[styles.errorText, { color: colors.error }]}>{errors.dosage}</Text>}
                </View>

                <View style={styles.halfWidth}>
                  <TextInput
                    label={t('addMedicine.stock')}
                    placeholder={t('addMedicine.stockPlaceholder')}
                    value={formData.stock}
                    onChangeText={(v) => handleInputChange('stock', v)}
                    disabled={loading}
                    keyboardType="numeric"
                    error={!!errors.stock}
                    mode="outlined"
                    left={<TextInput.Icon icon="package-variant" color={colors.textMuted} />}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                  {errors.stock && <Text style={[styles.errorText, { color: colors.error }]}>{errors.stock}</Text>}
                </View>
              </View>
            </View>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 2: Schedule & Timing
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.sectionInner}>
              <SectionHeader
                icon="clock-outline"
                title="Schedule & Timing"
                subtitle="Frequency, times, dates and reminders"
                colors={colors}
              />

              {/* Frequency Picker */}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{t('addMedicine.frequency')}</Text>
              <View style={[styles.pickerWrapper, { borderColor: colors.border, backgroundColor: isDark ? colors.surface : '#fff' }]}>
                <Picker
                  selectedValue={formData.frequency}
                  onValueChange={(v) => handleInputChange('frequency', v)}
                  style={[styles.picker, { color: colors.text }]}
                  dropdownIconColor={colors.textSecondary}
                >
                  {frequencies.map((f) => (
                    <Picker.Item key={f.value} label={f.label} value={f.value} />
                  ))}
                </Picker>
              </View>

              {/* Time Slots */}
              <View style={styles.timeSection}>
                <View style={styles.timeSectionHeader}>
                  <View style={styles.timeLabelRow}>
                    <MaterialCommunityIcons name="clock-time-four-outline" size={18} color={colors.primary} />
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginLeft: 6, marginBottom: 0 }]}>
                      {t('addMedicine.times')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={addTimeSlot} style={[styles.addTimeBtn, { backgroundColor: colors.primaryLight + '20' }]}>
                    <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                    <Text style={[styles.addTimeBtnText, { color: colors.primary }]}>{t('addMedicine.addTimeSlot')}</Text>
                  </TouchableOpacity>
                </View>

                {formData.times.map((time, index) => (
                  <View key={index} style={styles.timeSlotRow}>
                    <View style={[styles.timeChip, { backgroundColor: colors.primaryLight + '15', borderColor: colors.primaryLight + '40' }]}>
                      <MaterialCommunityIcons name="clock-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                      <TextInput
                        value={time}
                        onChangeText={(v) => {
                          const newTimes = [...formData.times];
                          newTimes[index] = v;
                          handleInputChange('times', newTimes);
                        }}
                        style={[styles.timeTextInput, { color: colors.text }]}
                        placeholder="HH:MM"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                    {formData.times.length > 1 && (
                      <TouchableOpacity onPress={() => removeTimeSlot(index)} style={[styles.removeTimeBtn, { backgroundColor: colors.error + '15' }]}>
                        <MaterialCommunityIcons name="close" size={16} color={colors.error} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <Divider style={{ marginVertical: 12, backgroundColor: colors.border }} />

              {/* Start Date + Duration + End Date */}
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <TextInput
                    label={t('addMedicine.startDate') || 'Start Date'}
                    placeholder="YYYY-MM-DD"
                    value={formData.start_date}
                    onChangeText={(v) => handleInputChange('start_date', v)}
                    disabled={loading}
                    error={!!errors.start_date}
                    mode="outlined"
                    left={<TextInput.Icon icon="calendar-start" color={colors.textMuted} />}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                  {errors.start_date && <Text style={[styles.errorText, { color: colors.error }]}>{errors.start_date}</Text>}
                </View>
                <View style={styles.halfWidth}>
                  <TextInput
                    label="Duration (days)"
                    placeholder="e.g., 30"
                    value={formData.duration}
                    onChangeText={(v) => handleInputChange('duration', v)}
                    disabled={loading}
                    keyboardType="numeric"
                    mode="outlined"
                    left={<TextInput.Icon icon="timer-sand" color={colors.textMuted} />}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>
              </View>

              <TextInput
                label={t('addMedicine.endDate') || 'End Date'}
                placeholder="YYYY-MM-DD (auto-calculated)"
                value={formData.end_date}
                onChangeText={(v) => handleInputChange('end_date', v)}
                disabled={loading}
                mode="outlined"
                left={<TextInput.Icon icon="calendar-end" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <Divider style={{ marginVertical: 12, backgroundColor: colors.border }} />

              {/* Reminder Toggle */}
              <View style={[styles.toggleRow, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}>
                <View style={styles.toggleLeft}>
                  <MaterialCommunityIcons name="bell-ring-outline" size={22} color={colors.primary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.toggleLabel, { color: colors.text }]}>
                      {t('addMedicine.reminderEnabled') || 'Reminders'}
                    </Text>
                    <Text style={[styles.toggleHint, { color: colors.textMuted }]}>
                      {t('addMedicine.enableReminders') || "Get notified when it's time"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={formData.reminder_enabled}
                  onValueChange={(v) => handleInputChange('reminder_enabled', v)}
                  trackColor={{ false: colors.border, true: colors.primaryLight }}
                  thumbColor={formData.reminder_enabled ? colors.primary : '#f4f3f4'}
                  ios_backgroundColor={colors.border}
                />
              </View>
            </View>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 3: Clinical Details (Collapsible)
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <TouchableOpacity
              onPress={() => setShowClinical(!showClinical)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionInner}>
                <View style={styles.collapsibleHeader}>
                  <SectionHeader
                    icon="shield-check-outline"
                    title="Clinical Safety"
                    subtitle="Dose details for safety checks (optional)"
                    colors={colors}
                  />
                  <MaterialCommunityIcons
                    name={showClinical ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={colors.textMuted}
                  />
                </View>
              </View>
            </TouchableOpacity>
            {showClinical && (
              <View style={[styles.sectionInner, { paddingTop: 0 }]}>
                <TextInput
                  label="Dose (mg)"
                  placeholder="e.g., 500"
                  value={formData.dose_mg}
                  onChangeText={(v) => handleInputChange('dose_mg', v)}
                  disabled={loading}
                  keyboardType="decimal-pad"
                  mode="outlined"
                  left={<TextInput.Icon icon="scale" color={colors.textMuted} />}
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  textColor={colors.text}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />

                <TextInput
                  label="Posology / Directions"
                  placeholder="e.g., Take with food, 30 min before meals"
                  value={formData.posology}
                  onChangeText={(v) => handleInputChange('posology', v)}
                  disabled={loading}
                  multiline
                  numberOfLines={2}
                  mode="outlined"
                  left={<TextInput.Icon icon="clipboard-text-outline" color={colors.textMuted} />}
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  textColor={colors.text}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />

                <TextInput
                  label={t('addMedicine.instructions') || 'Special Instructions'}
                  placeholder="e.g., Do not crush, take on empty stomach"
                  value={formData.instructions}
                  onChangeText={(v) => handleInputChange('instructions', v)}
                  disabled={loading}
                  multiline
                  numberOfLines={2}
                  mode="outlined"
                  left={<TextInput.Icon icon="alert-circle-outline" color={colors.textMuted} />}
                  style={[styles.input, { backgroundColor: colors.surface }]}
                  textColor={colors.text}
                  outlineColor={colors.border}
                  activeOutlineColor={colors.primary}
                />

                <View style={[styles.infoBox, { backgroundColor: colors.infoLight || '#e0f2fe', borderColor: colors.info || '#0ea5e9' }]}>
                  <MaterialCommunityIcons name="information-outline" size={18} color={colors.info || '#0ea5e9'} />
                  <Text style={[styles.infoText, { color: colors.info || '#0284c7' }]}>
                    Adding dose in mg enables automatic safety checks against your patient profile (weight, age, pregnancy status).
                  </Text>
                </View>
              </View>
            )}
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 4: Doctor & Prescription
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.sectionInner}>
              <SectionHeader
                icon="doctor"
                title="Doctor & Prescription"
                subtitle="Healthcare provider details"
                colors={colors}
              />

              <TextInput
                label={t('addMedicine.prescribedFor') || 'Prescribed For'}
                placeholder="e.g., Headache, Hypertension"
                value={formData.prescribed_for}
                onChangeText={(v) => handleInputChange('prescribed_for', v)}
                disabled={loading}
                mode="outlined"
                left={<TextInput.Icon icon="medical-bag" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label={t('addMedicine.doctor') || 'Healthcare Provider'}
                placeholder="e.g., Dr. Smith"
                value={formData.doctor}
                onChangeText={(v) => handleInputChange('doctor', v)}
                disabled={loading}
                mode="outlined"
                left={<TextInput.Icon icon="stethoscope" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
            </View>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 5: Food Guidance
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.sectionInner}>
              <SectionHeader
                icon="food-apple-outline"
                title="Food Guidance"
                subtitle="Foods to avoid or recommended with this medicine"
                colors={colors}
              />

              <TagInput
                label="Foods to Avoid"
                placeholder="e.g., Grapefruit"
                tags={formData.food_to_avoid}
                onTagsChange={(tags) => handleInputChange('food_to_avoid', tags)}
                colors={colors}
              />

              <TagInput
                label="Recommended Foods"
                placeholder="e.g., Milk, Water"
                tags={formData.food_advised}
                onTagsChange={(tags) => handleInputChange('food_advised', tags)}
                colors={colors}
              />
            </View>
          </Card>

          {/* ═══════════════════════════════════════════════════════════
               SECTION 6: Notes & Photo
             ═══════════════════════════════════════════════════════════ */}
          <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]} mode="elevated">
            <View style={styles.sectionInner}>
              <SectionHeader
                icon="note-text-outline"
                title="Notes & Photo"
                subtitle="Additional information and medicine image"
                colors={colors}
              />

              <TextInput
                label={t('addMedicine.notes') || 'Notes'}
                placeholder="Any additional notes about this medicine..."
                value={formData.notes}
                onChangeText={(v) => handleInputChange('notes', v)}
                disabled={loading}
                multiline
                numberOfLines={3}
                mode="outlined"
                left={<TextInput.Icon icon="text" color={colors.textMuted} />}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              {/* Medicine Photo */}
              <View style={[styles.photoSection, { borderTopColor: colors.border }]}>
                <View style={styles.photoLabelRow}>
                  <MaterialCommunityIcons name="camera" size={18} color={colors.textSecondary} />
                  <Text style={[styles.photoLabel, { color: colors.text }]}>
                    {t('medicinePhoto.label') || 'Medicine Photo'}
                  </Text>
                </View>
                <Text style={[styles.photoHint, { color: colors.textMuted }]}>
                  {t('medicinePhoto.hint') || 'Take a photo of the medicine for easy identification'}
                </Text>

                {medicinePhoto ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: medicinePhoto.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoBtn}
                      onPress={() => setMedicinePhoto(null)}
                    >
                      <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
                      <Text style={styles.removePhotoText}>{t('medicinePhoto.remove') || 'Remove'}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={[styles.photoButton, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}
                      onPress={() => handlePickPhoto(true)}
                    >
                      <MaterialCommunityIcons name="camera" size={28} color={colors.primary} />
                      <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                        {t('medicinePhoto.takePhoto') || 'Camera'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoButton, { backgroundColor: isDark ? colors.background : '#f8fafc', borderColor: colors.border }]}
                      onPress={() => handlePickPhoto(false)}
                    >
                      <MaterialCommunityIcons name="image-outline" size={28} color={colors.primary} />
                      <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>
                        {t('medicinePhoto.fromGallery') || 'Gallery'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* ─── Action Buttons ────────────────────────────────────── */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t('addMedicine.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            >
              {loading ? (
                <Text style={styles.submitBtnText}>{t('addMedicine.submitting')}</Text>
              ) : (
                <>
                  <MaterialCommunityIcons name={isEditMode ? 'content-save' : 'plus-circle'} size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {isEditMode ? (t('common.update') || 'Update') : t('addMedicine.submit')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 32 }} />
        </View>

        {/* ─── Snackbar ────────────────────────────────────────────── */}
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '', type: 'success' })}
          duration={3000}
          style={{ backgroundColor: snackbar.type === 'error' ? colors.error : colors.success }}
        >
          {snackbar.message}
        </Snackbar>
      </ScrollView>

      {/* ─── Contraindication Disclaimer Modal ────────────────────── */}
      {disclaimerData && (
        <Modal
          visible={!!disclaimerData}
          animationType="slide"
          transparent={true}
          statusBarTranslucent
          onRequestClose={() => {
            setDisclaimerData(null);
            navigation.goBack();
          }}
        >
          <View style={disclaimerStyles.overlay}>
            <View style={[disclaimerStyles.modal, { backgroundColor: colors.surface }]}>
              {/* Header */}
              <View style={disclaimerStyles.header}>
                <MaterialCommunityIcons name="alert-circle" size={32} color="#fff" />
                <Text style={disclaimerStyles.headerTitle}>
                  {t('safety.disclaimerTitle') || 'Safety Warning'}
                </Text>
                <Text style={disclaimerStyles.headerSubtitle}>
                  {t('safety.disclaimerSubtitle') || 'Contraindications detected for your profile'}
                </Text>
              </View>

              {/* Warning List */}
              <ScrollView style={disclaimerStyles.content} showsVerticalScrollIndicator={false}>
                {disclaimerData.map((warning, index) => {
                  const isCritical = typeof warning === 'string'
                    ? warning.toLowerCase().includes('contraindic') || warning.toLowerCase().includes('allerg')
                    : false;
                  return (
                    <View
                      key={index}
                      style={[
                        disclaimerStyles.warningCard,
                        { borderLeftColor: isCritical ? '#dc2626' : '#f59e0b' },
                      ]}
                    >
                      <Text style={disclaimerStyles.warningIcon}>
                        {isCritical ? '🚨' : '⚠️'}
                      </Text>
                      <Text style={[disclaimerStyles.warningText, { color: colors.text }]}>
                        {typeof warning === 'string' ? warning : warning.message || JSON.stringify(warning)}
                      </Text>
                    </View>
                  );
                })}

                {/* Legal disclaimer */}
                <View style={disclaimerStyles.legalBox}>
                  <Text style={disclaimerStyles.legalText}>
                    {t('safety.legalDisclaimer') ||
                      'This information is for reference only. Always consult your healthcare provider before making changes to your medication.'}
                  </Text>
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={disclaimerStyles.actions}>
                <Button
                  mode="contained"
                  onPress={() => {
                    setDisclaimerData(null);
                    showSnackbar(t('notifications.medicineAddSuccess'), 'success');
                    setTimeout(() => navigation.goBack(), 1200);
                  }}
                  style={[disclaimerStyles.primaryBtn, { backgroundColor: colors.primary }]}
                  labelStyle={{ fontWeight: '700' }}
                  icon="check"
                >
                  {t('safety.understand') || 'I Understand, Continue'}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setDisclaimerData(null);
                  }}
                  style={[disclaimerStyles.secondaryBtn, { borderColor: colors.primary }]}
                  icon="pencil"
                >
                  {t('safety.reviewMedicines') || 'Review My Medicines'}
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//   STYLES
// ═══════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Page Header ────────────────────────────────────────────────────
  pageHeader: {
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTextWrap: {
    maxWidth: '75%',
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  headerIcon: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },

  // ── Body ───────────────────────────────────────────────────────────
  body: {
    padding: 16,
    marginTop: -12,
  },

  // ── Scan Card ──────────────────────────────────────────────────────
  scanCard: {
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
  },
  scanInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  scanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  scanTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  scanHint: {
    fontSize: 11,
    marginTop: 1,
  },
  scanBtn: {
    borderRadius: 10,
  },
  scanSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 6,
  },
  scanSuccessText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Section Card ───────────────────────────────────────────────────
  sectionCard: {
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  sectionInner: {
    padding: 18,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Inputs ─────────────────────────────────────────────────────────
  input: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: -6,
    marginBottom: 8,
    marginLeft: 4,
  },

  // ── Picker ─────────────────────────────────────────────────────────
  pickerWrapper: {
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },

  // ── Time Slots ─────────────────────────────────────────────────────
  timeSection: {
    marginBottom: 4,
  },
  timeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addTimeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  timeTextInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    padding: 0,
    backgroundColor: 'transparent',
  },
  removeTimeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Toggle Row ─────────────────────────────────────────────────────
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 1,
  },

  // ── Info Box ───────────────────────────────────────────────────────
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 10,
    marginTop: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },

  // ── Photo ──────────────────────────────────────────────────────────
  photoSection: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  photoLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoHint: {
    fontSize: 12,
    marginBottom: 12,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderWidth: 1.5,
    borderRadius: 14,
    borderStyle: 'dashed',
    gap: 6,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },

  // ── Action Buttons ─────────────────────────────────────────────────
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

const disclaimerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    backgroundColor: '#dc2626',
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    maxHeight: 300,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderLeftWidth: 4,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    marginBottom: 10,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  legalBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  legalText: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
  },
  actions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 10,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 4,
  },
  secondaryBtn: {
    borderRadius: 12,
  },
});
