import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image, Alert, Modal } from 'react-native';
import { Card, Button, TextInput, Snackbar } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { medicineAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

export default function AddMedicineScreen({ route }) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();
  const { medicine } = route?.params || {}; // For edit mode
  
  const isEditMode = !!medicine;
  
  const [formData, setFormData] = useState({
    name: '',
    scientific_name: '',
    dosage: '',
    frequency: 'once_daily',
    times: ['08:00'],
    stock: '',
    prescribed_for: '',
    doctor: '',
    notes: '',
    reminder_enabled: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    instructions: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeLookupLoading, setBarcodeLookupLoading] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);
  const [medicinePhoto, setMedicinePhoto] = useState(null); // { uri, fileName, mimeType }

  // Load medicine data if editing
  useEffect(() => {
    if (medicine && isEditMode) {
      setFormData({
        name: medicine.name || '',
        scientific_name: medicine.scientific_name || '',
        dosage: medicine.dosage || '',
        frequency: medicine.frequency || 'once_daily',
        times: medicine.times || ['08:00'],
        stock: medicine.stock?.toString() || '',
        prescribed_for: medicine.prescribed_for || '',
        doctor: medicine.doctor || '',
        notes: medicine.notes || '',
        reminder_enabled: medicine.reminder_enabled !== false,
        start_date: medicine.start_date || new Date().toISOString().split('T')[0],
        end_date: medicine.end_date || '',
        instructions: medicine.instructions || '',
      });
    }
  }, [medicine, isEditMode]);

  const frequencies = [
    { label: t('addMedicine.onceDaily'), value: 'once_daily' },
    { label: t('addMedicine.twiceDaily'), value: 'twice_daily' },
    { label: t('addMedicine.threeTimesDaily'), value: 'three_times_daily' },
    { label: t('addMedicine.fourTimesDaily'), value: 'four_times_daily' },
    { label: t('addMedicine.asNeeded'), value: 'as_needed' },
    { label: t('addMedicine.weekly'), value: 'weekly' },
    { label: t('addMedicine.monthly'), value: 'monthly' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = t('addMedicine.medicineNameRequired');
    }
    if (!formData.dosage.trim()) {
      newErrors.dosage = t('addMedicine.dosageRequired');
    }
    if (!formData.stock.trim()) {
      newErrors.stock = t('addMedicine.stockRequired');
    } else if (isNaN(parseInt(formData.stock))) {
      newErrors.stock = t('addMedicine.stockMustBeNumber');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message, type });
  };

  // Handle barcode scan result
  const handleBarcodeScan = async (barcode) => {
    setShowScanner(false);
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

  // Manual barcode entry (for devices without camera or as fallback)
  const handleManualBarcode = () => {
    Alert.prompt(
      t('scanner.title'),
      t('scanner.enterManually'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.search'),
          onPress: (barcode) => {
            if (barcode && barcode.trim()) {
              handleBarcodeScan(barcode.trim());
            }
          },
        },
      ],
      'plain-text',
      '',
      'number-pad'
    );
  };

  // Photo picker using standard React Native approach
  const handlePickPhoto = async (useCamera = false) => {
    try {
      // Dynamic import to avoid crash if expo-image-picker is not installed
      const ImagePicker = require('expo-image-picker');
      
      // Request permissions
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
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
            allowsEditing: true,
            aspect: [4, 3],
          });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setMedicinePhoto({
          uri: asset.uri,
          fileName: asset.fileName || 'medicine_photo.jpg',
          mimeType: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (err) {
      // expo-image-picker might not be installed
      console.warn('Image picker not available:', err.message);
      Alert.alert(
        t('medicinePhoto.label'),
        t('medicinePhoto.notAvailable')
      );
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const medicineData = {
        name: formData.name,
        scientific_name: formData.scientific_name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        times: formData.times,
        duration: parseInt(formData.stock) || 30,
        stock_count: parseInt(formData.stock) || 30,
        prescribed_for: formData.prescribed_for,
        prescribing_doctor: formData.doctor,
        notes: formData.notes,
        reminder_enabled: formData.reminder_enabled,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        instructions: formData.instructions,
        barcode: barcodeResult?.barcode || '',
      };

      if (isEditMode) {
        // Update existing medicine
        await medicineAPI.update(medicine.id, medicineData);

        // Upload photo if new one selected
        if (medicinePhoto) {
          try {
            await medicineAPI.uploadPhoto(medicine.id, medicinePhoto.uri, medicinePhoto.fileName, medicinePhoto.mimeType);
          } catch (photoErr) {
            console.error('Photo upload failed:', photoErr);
          }
        }

        showSnackbar(t('notifications.medicineUpdateSuccess'), 'success');
      } else {
        // Create new medicine
        const response = await medicineAPI.create(medicineData);

        // Upload photo after creation
        if (medicinePhoto && response.id) {
          try {
            await medicineAPI.uploadPhoto(response.id, medicinePhoto.uri, medicinePhoto.fileName, medicinePhoto.mimeType);
          } catch (photoErr) {
            console.error('Photo upload failed:', photoErr);
          }
        }

        showSnackbar(t('notifications.medicineAddSuccess'), 'success');
      }

      // Wait a bit for user to see the message
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      logError('AddMedicineScreen.handleSave', error);
      const errorMessage = getErrorMessage(error, t);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const addTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      times: [...prev.times, '12:00']
    }));
  };

  const removeTimeSlot = (index) => {
    if (formData.times.length > 1) {
      setFormData(prev => ({
        ...prev,
        times: prev.times.filter((_, i) => i !== index)
      }));
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {isEditMode ? t('common.edit') + ' ' + t('medicines.title') : t('addMedicine.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {isEditMode ? t('addMedicine.editSubtitle') : t('addMedicine.subtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Barcode Scanner Toolbar */}
          <Card style={[styles.scannerCard, { backgroundColor: colors.primaryLight }]}>
            <View style={styles.scannerContent}>
              <Text style={[styles.scannerLabel, { color: colors.primary }]}>📷 {t('scanner.quickFill')}</Text>
              <View style={styles.scannerButtons}>
                <Button
                  mode="contained"
                  onPress={() => {
                    // On Android, use Alert.prompt workaround
                    if (Platform.OS === 'ios') {
                      handleManualBarcode();
                    } else {
                      // Android doesn't support Alert.prompt, show simple input
                      Alert.alert(
                        t('scanner.title'),
                        t('scanner.enterManually'),
                        [
                          { text: t('common.cancel'), style: 'cancel' },
                          { text: 'OK' },
                        ]
                      );
                    }
                  }}
                  loading={barcodeLookupLoading}
                  disabled={barcodeLookupLoading}
                  style={[styles.scanButton, { backgroundColor: colors.primary }]}
                  compact
                  icon="barcode-scan"
                >
                  {t('scanner.scanBarcode')}
                </Button>
              </View>
              {barcodeResult && (
                <Text style={[styles.scanSuccess, { color: colors.primary }]}>✓ {t('scanner.autoFillSuccess')}</Text>
              )}
            </View>
          </Card>
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardContent}>
              <TextInput
                label={t('addMedicine.medicineName')}
                placeholder={t('addMedicine.medicinePlaceholder')}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                disabled={loading}
                error={!!errors.name}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.name && <Text style={[styles.errorText, { color: colors.error }]}>{errors.name}</Text>}

              <TextInput
                label={t('medicines.scientificName')}
                placeholder={t('addMedicine.scientificNamePlaceholder')}
                value={formData.scientific_name}
                onChangeText={(value) => handleInputChange('scientific_name', value)}
                disabled={loading}
                mode="outlined"
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
                    onChangeText={(value) => handleInputChange('dosage', value)}
                    disabled={loading}
                    error={!!errors.dosage}
                    mode="outlined"
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
                    onChangeText={(value) => handleInputChange('stock', value)}
                    disabled={loading}
                    keyboardType="numeric"
                    error={!!errors.stock}
                    mode="outlined"
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                  {errors.stock && <Text style={[styles.errorText, { color: colors.error }]}>{errors.stock}</Text>}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('addMedicine.frequency')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.frequency}
                    onValueChange={(value) => handleInputChange('frequency', value)}
                    style={styles.picker}
                  >
                    {frequencies.map((freq) => (
                      <Picker.Item key={freq.value} label={freq.label} value={freq.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.timeHeader}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('addMedicine.times')}</Text>
                  <TouchableOpacity onPress={addTimeSlot} style={styles.addTimeButton}>
                    <Text style={[styles.addTimeText, { color: colors.primary }]}>+ {t('addMedicine.addTimeSlot')}</Text>
                  </TouchableOpacity>
                </View>
                {formData.times.map((time, index) => (
                  <View key={index} style={styles.timeSlot}>
                    <TextInput
                      value={time}
                      onChangeText={(value) => {
                        const newTimes = [...formData.times];
                        newTimes[index] = value;
                        handleInputChange('times', newTimes);
                      }}
                      style={[styles.input, styles.timeInput, { backgroundColor: colors.surface }]}
                      textColor={colors.text}
                      outlineColor={colors.border}
                      activeOutlineColor={colors.primary}
                    />
                    {formData.times.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeTimeSlot(index)}
                        style={[styles.removeTimeButton, { backgroundColor: colors.error }]}
                      >
                        <Text style={styles.removeTimeText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TextInput
                label={t('addMedicine.prescribedFor')}
                placeholder={t('addMedicine.prescribedForPlaceholder')}
                value={formData.prescribed_for}
                onChangeText={(value) => handleInputChange('prescribed_for', value)}
                disabled={loading}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label={t('addMedicine.doctor')}
                placeholder={t('addMedicine.doctorPlaceholder')}
                value={formData.doctor}
                onChangeText={(value) => handleInputChange('doctor', value)}
                disabled={loading}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              <TextInput
                label={t('addMedicine.notes')}
                placeholder={t('addMedicine.instructionsPlaceholder')}
                value={formData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                disabled={loading}
                multiline
                numberOfLines={3}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />

              {/* Medicine Photo Section */}
              <View style={[styles.photoSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.photoLabel, { color: colors.text }]}>{t('medicinePhoto.label')}</Text>
                <Text style={[styles.photoHint, { color: colors.textMuted }]}>{t('medicinePhoto.hint')}</Text>
                
                {medicinePhoto ? (
                  <View style={styles.photoPreview}>
                    <Image source={{ uri: medicinePhoto.uri }} style={styles.photoImage} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => setMedicinePhoto(null)}
                    >
                      <Text style={styles.removePhotoText}>✕ {t('medicinePhoto.remove')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.photoButtons}>
                    <TouchableOpacity
                      style={[styles.photoButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handlePickPhoto(true)}
                    >
                      <Text style={styles.photoButtonIcon}>📷</Text>
                      <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>{t('medicinePhoto.takePhoto')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() => handlePickPhoto(false)}
                    >
                      <Text style={styles.photoButtonIcon}>🖼️</Text>
                      <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>{t('medicinePhoto.fromGallery')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={[styles.cancelButton, { borderColor: colors.border }]}
              textColor={colors.text}
              disabled={loading}
            >
              {t('addMedicine.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
              buttonColor={colors.primary}
              loading={loading}
              disabled={loading}
            >
              {loading ? t('addMedicine.submitting') : (isEditMode ? t('common.update') : t('addMedicine.submit'))}
            </Button>
          </View>
        </View>
      </View>

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '', type: 'success' })}
        duration={3000}
        style={[
          styles.snackbar,
          { backgroundColor: snackbar.type === 'error' ? colors.error : colors.success },
        ]}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
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
  form: {
    gap: 16,
  },
  card: {
    padding: 0,
  },
  cardContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addTimeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  addTimeText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeInput: {
    flex: 1,
    marginRight: 8,
  },
  removeTimeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTimeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#0d9488',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -4,
    marginBottom: 8,
  },
  snackbar: {
    backgroundColor: '#10b981',
  },
  snackbarError: {
    backgroundColor: '#ef4444',
  },
  // Barcode scanner styles
  scannerCard: {
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
  },
  scannerContent: {
    padding: 14,
  },
  scannerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0d9488',
    marginBottom: 10,
  },
  scannerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  scanButton: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
  },
  scanSuccess: {
    marginTop: 8,
    fontSize: 13,
    color: '#0d9488',
    fontWeight: '500',
  },
  // Photo styles
  photoSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  photoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  photoHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  photoButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  photoPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
});
