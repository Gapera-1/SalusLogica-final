import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Picker } from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const AddMedicineScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    name: '',
    scientificName: '',
    dosage: '',
    frequency: 'once_daily',
    times: ['08:00'],
    stock: '',
    prescribedFor: '',
    provider: '',
    notes: '',
    reminderEnabled: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    instructions: '',
  });
  const [loading, setLoading] = useState(false);

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
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('addMedicine.medicineNameRequired'));
      return false;
    }
    if (!formData.dosage.trim()) {
      Alert.alert(t('common.error'), t('addMedicine.dosageRequired'));
      return false;
    }
    if (!formData.stock.trim()) {
      Alert.alert(t('common.error'), t('addMedicine.stockRequired'));
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(t('common.success'), t('addMedicine.success'));
      
      // Navigate back to medicines list
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('addMedicine.error'));
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('addMedicine.title')}</Text>
          <Text style={styles.subtitle}>{t('addMedicine.subtitle')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.sectionTitle}>{t('addMedicine.medicineName')}</Text>
              <TextInput
                label={t('addMedicine.medicinePlaceholder')}
                value={formData.name}
                onChangeText={(value) => handleInputChange('name', value)}
                style={styles.input}
              />

              <TextInput
                label={t('medicines.scientificName')}
                value={formData.scientificName}
                onChangeText={(value) => handleInputChange('scientificName', value)}
                style={styles.input}
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <TextInput
                    label={t('addMedicine.dosage')}
                    value={formData.dosage}
                    onChangeText={(value) => handleInputChange('dosage', value)}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <TextInput
                    label={t('addMedicine.stock')}
                    value={formData.stock}
                    onChangeText={(value) => handleInputChange('stock', value)}
                    keyboardType="numeric"
                    style={styles.input}
                  />
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
                  <Text style={styles.label}>{t('addMedicine.times')}</Text>
                  <TouchableOpacity onPress={addTimeSlot} style={styles.addTimeButton}>
                    <Text style={styles.addTimeText}>+ {t('addMedicine.addTimeSlot')}</Text>
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
                      style={[styles.input, styles.timeInput]}
                    />
                    {formData.times.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeTimeSlot(index)}
                        style={styles.removeTimeButton}
                      >
                        <Text style={styles.removeTimeText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>

              <TextInput
                label={t('addMedicine.prescribedFor')}
                value={formData.prescribedFor}
                onChangeText={(value) => handleInputChange('prescribedFor', value)}
                style={styles.input}
              />

              <TextInput
                label={t('addMedicine.provider')}
                value={formData.provider}
                onChangeText={(value) => handleInputChange('provider', value)}
                style={styles.input}
              />

              <TextInput
                label={t('addMedicine.notes')}
                value={formData.notes}
                onChangeText={(value) => handleInputChange('notes', value)}
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </View>
          </Card>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={handleCancel}
              style={styles.cancelButton}
              disabled={loading}
            >
              {t('addMedicine.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
              loading={loading}
              disabled={loading}
            >
              {t('addMedicine.submit')}
            </Button>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

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
  },
});

export default AddMedicineScreen;
