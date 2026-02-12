import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Picker } from 'react-native';
import { Card, Button, TextInput, Avatar } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const { t, language, setLanguage, languages } = useLanguage();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: 'johndoe',
    ageCategory: 'adult',
    gender: 'male',
    pregnant: false,
    weight: '70',
    height: '175',
    phone: '+250788123456',
    medicalConditions: 'Hypertension',
    allergies: 'Penicillin',
    timezone: 'UTC+2',
    preferredLanguage: language,
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  const ageCategories = [
    { label: t('profile.youngChild'), value: 'young_child' },
    { label: t('profile.olderChild'), value: 'older_child' },
    { label: t('profile.adult'), value: 'adult' },
    { label: t('profile.elderly'), value: 'elderly' },
  ];

  const genders = [
    { label: t('profile.male'), value: 'male' },
    { label: t('profile.female'), value: 'female' },
    { label: t('profile.other'), value: 'other' },
  ];

  const timezones = [
    { label: 'UTC+0', value: 'UTC+0' },
    { label: 'UTC+1', value: 'UTC+1' },
    { label: 'UTC+2', value: 'UTC+2' },
    { label: 'UTC+3', value: 'UTC+3' },
  ];

  const languageOptions = [
    { label: 'English', value: 'en' },
    { label: 'Français', value: 'fr' },
    { label: 'Kinyarwanda', value: 'rw' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update language if changed
      if (formData.preferredLanguage !== language) {
        setLanguage(formData.preferredLanguage);
      }
      
      Alert.alert(t('common.success'), t('profile.profileUpdated'));
      setEditing(false);
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.profileUpdateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    // Reset form to original values
    setFormData(prev => ({
      ...prev,
      preferredLanguage: language,
    }));
  };

  const handleLogout = () => {
    Alert.alert(
      t('navigation.signOut'),
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: () => {
            // In real app, this would clear auth state
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar.Text size={80} label="JD" style={styles.avatar} />
          <Text style={styles.username}>{formData.username}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>{t('navigation.signOut')}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Form */}
        <View style={styles.sections}>
          {/* Personal Information */}
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('profile.personalInfo')}</Text>
                {!editing && (
                  <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
                    <Text style={styles.editText}>{t('profile.editProfile')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                label={t('profile.username')}
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                disabled={!editing}
                style={styles.input}
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('profile.ageCategory')}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.ageCategory}
                      onValueChange={(value) => handleInputChange('ageCategory', value)}
                      style={styles.picker}
                      enabled={editing}
                    >
                      {ageCategories.map((category) => (
                        <Picker.Item key={category.value} label={category.label} value={category.value} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>{t('profile.gender')}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                      style={styles.picker}
                      enabled={editing}
                    >
                      {genders.map((gender) => (
                        <Picker.Item key={gender.value} label={gender.label} value={gender.value} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <TextInput
                    label={t('profile.weight')}
                    value={formData.weight}
                    onChangeText={(value) => handleInputChange('weight', value)}
                    keyboardType="numeric"
                    disabled={!editing}
                    style={styles.input}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <TextInput
                    label={t('profile.height')}
                    value={formData.height}
                    onChangeText={(value) => handleInputChange('height', value)}
                    keyboardType="numeric"
                    disabled={!editing}
                    style={styles.input}
                  />
                </View>
              </View>

              <TextInput
                label={t('profile.phone')}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                disabled={!editing}
                style={styles.input}
              />
            </View>
          </Card>

          {/* Medical Information */}
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.sectionTitle}>{t('profile.medicalInfo')}</Text>

              <TextInput
                label={t('profile.medicalConditions')}
                value={formData.medicalConditions}
                onChangeText={(value) => handleInputChange('medicalConditions', value)}
                multiline
                numberOfLines={3}
                disabled={!editing}
                style={styles.input}
              />

              <TextInput
                label={t('profile.allergies')}
                value={formData.allergies}
                onChangeText={(value) => handleInputChange('allergies', value)}
                multiline
                numberOfLines={2}
                disabled={!editing}
                style={styles.input}
              />
            </View>
          </Card>

          {/* Preferences */}
          <Card style={styles.card}>
            <View style={styles.cardContent}>
              <Text style={styles.sectionTitle}>{t('profile.preferences')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('profile.timezone')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.timezone}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                    style={styles.picker}
                    enabled={editing}
                  >
                    {timezones.map((tz) => (
                      <Picker.Item key={tz.value} label={tz.label} value={tz.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('profile.preferredLanguage')}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.preferredLanguage}
                    onValueChange={(value) => handleInputChange('preferredLanguage', value)}
                    style={styles.picker}
                    enabled={editing}
                  >
                    {languageOptions.map((lang) => (
                      <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </Card>

          {/* Action Buttons */}
          {editing && (
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handleCancelEdit}
                style={styles.cancelButton}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                style={styles.saveButton}
                loading={loading}
                disabled={loading}
              >
                {t('profile.saveProfile')}
              </Button>
            </View>
          )}
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
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    marginBottom: 12,
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  sections: {
    gap: 16,
  },
  card: {
    padding: 0,
  },
  cardContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
  },
  editText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
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
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default ProfileScreen;
