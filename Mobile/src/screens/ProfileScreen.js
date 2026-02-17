import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Card, Button, TextInput, Avatar, Switch } from 'react-native-paper';
import { launchImageLibrary } from 'react-native-image-picker';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { userAPI, authAPI } from '../services/api';

const ProfileScreen = () => {
  const { t, language, setLanguage, languages } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const { user, signOut, updateProfile: updateAuthProfile } = useAuth();
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    username: '',
    ageCategory: 'adult',
    gender: 'male',
    pregnant: false,
    weight: '',
    height: '',
    phone: '',
    medicalConditions: '',
    allergies: '',
    timezone: 'UTC+2',
    preferredLanguage: language,
  });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [avatarUri, setAvatarUri] = useState(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load profile data from API or AuthContext on mount
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await userAPI.getProfile();
      if (profile) {
        setFormData(prev => ({
          ...prev,
          username: profile.username || profile.user?.username || '',
          ageCategory: profile.age_category || profile.ageCategory || 'adult',
          gender: profile.gender || 'male',
          pregnant: profile.pregnant || false,
          weight: profile.weight ? String(profile.weight) : '',
          height: profile.height ? String(profile.height) : '',
          phone: profile.phone || profile.phone_number || '',
          medicalConditions: profile.medical_conditions || profile.medicalConditions || '',
          allergies: profile.allergies || '',
          timezone: profile.timezone || 'UTC+2',
          preferredLanguage: profile.preferred_language || profile.preferredLanguage || language,
        }));
        if (profile.avatar || profile.avatar_url) {
          setAvatarUri(profile.avatar || profile.avatar_url);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      // Fall back to AuthContext user data
      if (user) {
        setFormData(prev => ({
          ...prev,
          username: user.username || '',
        }));
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleSelectAvatar = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1000,
      maxHeight: 1000,
    };

    launchImageLibrary(options, async (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        console.log('ImagePicker Error: ', response.errorMessage);
        Alert.alert(t('common.error'), t('profile.avatarFailed'));
      } else if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        
        // Set local preview
        setAvatarUri(asset.uri);
        
        // Upload to server
        try {
          setLoading(true);
          const formData = new FormData();
          formData.append('avatar', {
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'avatar.jpg',
          });

          const result = await userAPI.uploadAvatar(formData);
          Alert.alert(t('common.success'), t('profile.avatarUploaded'));
        } catch (error) {
          console.error('Avatar upload error:', error);
          Alert.alert(t('common.error'), t('profile.avatarFailed'));
          setAvatarUri(null); // Revert on error
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleRemoveAvatar = async () => {
    Alert.alert(
      t('common.confirm'),
      t('profile.removePhotoConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await userAPI.removeAvatar();
              setAvatarUri(null);
              Alert.alert(t('common.success'), t('profile.avatarRemoved'));
            } catch (error) {
              console.error('Remove avatar error:', error);
              Alert.alert(t('common.error'), t('profile.avatarFailed'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const profilePayload = {
        username: formData.username,
        age_category: formData.ageCategory,
        gender: formData.gender,
        pregnant: formData.pregnant,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        phone: formData.phone,
        medical_conditions: formData.medicalConditions,
        allergies: formData.allergies,
        timezone: formData.timezone,
        preferred_language: formData.preferredLanguage,
      };

      await userAPI.updateProfile(profilePayload);

      // Update language if changed
      if (formData.preferredLanguage !== language) {
        setLanguage(formData.preferredLanguage);
      }

      Alert.alert(t('common.success'), t('profile.profileUpdated'));
      setEditing(false);
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert(t('common.error'), error.message || t('profile.profileUpdateFailed'));
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
      t('profile.logoutConfirmTitle'),
      t('profile.logoutConfirmMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('profile.logout'), 
          onPress: async () => {
            await signOut();
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Alert.alert(t('common.error'), t('profile.enterPasswordConfirm'));
      return;
    }

    Alert.alert(
      t('profile.deleteAccountConfirmTitle'),
      t('profile.deleteAccountPermanent'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.permanentlyDelete'),
          style: 'destructive',
          onPress: async () => {
            setDeleteLoading(true);
            try {
              await authAPI.deleteAccount(deletePassword);
              Alert.alert(t('profile.accountDeleted'), t('profile.accountDeletedMessage'));
              await signOut();
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert(t('common.error'), error.message || t('profile.deleteAccountFailed'));
            } finally {
              setDeleteLoading(false);
              setDeletePassword('');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header with Avatar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleSelectAvatar} activeOpacity={0.7}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatarImage}
              />
            ) : (
              <Avatar.Text 
                size={80} 
                label={formData.username.substring(0, 2).toUpperCase()} 
                style={styles.avatar}
              />
            )}
            <View style={styles.cameraIconContainer}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          
          {avatarUri && (
            <TouchableOpacity onPress={handleRemoveAvatar} style={styles.removeAvatarButton}>
              <Text style={styles.removeAvatarText}>{t('profile.removePhoto')}</Text>
            </TouchableOpacity>
          )}
          
          <Text style={styles.username}>{formData.username}</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
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

              {/* Dark Mode Toggle */}
              <View style={styles.themeToggleContainer}>
                <View style={styles.themeToggleText}>
                  <Text style={styles.label}>{t('profile.darkMode') || 'Dark Mode'}</Text>
                  <Text style={styles.themeToggleSubtext}>
                    {isDark ? t('profile.darkModeEnabled') || 'Dark theme enabled' : t('profile.lightModeEnabled') || 'Light theme enabled'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  color="#14b8a6"
                />
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

          {/* Danger Zone - Delete Account */}
          <Card style={[styles.card, styles.dangerCard]}>
            <View style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: '#dc2626' }]}>{t('profile.dangerZone')}</Text>
              
              {!showDeleteSection ? (
                <Button
                  mode="outlined"
                  onPress={() => setShowDeleteSection(true)}
                  style={styles.deleteToggleButton}
                  textColor="#dc2626"
                >
                  {t('profile.deleteAccount')}
                </Button>
              ) : (
                <View style={styles.deleteSection}>
                  <Text style={styles.deleteWarning}>
                    {t('profile.deleteAccountWarning')}
                  </Text>
                  <TextInput
                    label={t('profile.enterPasswordConfirm')}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry
                    style={styles.input}
                  />
                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowDeleteSection(false);
                        setDeletePassword('');
                      }}
                      style={styles.cancelButton}
                      disabled={deleteLoading}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleDeleteAccount}
                      style={styles.deleteButton}
                      buttonColor="#dc2626"
                      loading={deleteLoading}
                      disabled={deleteLoading || !deletePassword.trim()}
                    >
                      {t('profile.deleteAccount')}
                    </Button>
                  </View>
                </View>
              )}
            </View>
          </Card>
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#14b8a6',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#14b8a6',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cameraIcon: {
    fontSize: 16,
  },
  removeAvatarButton: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  removeAvatarText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '500',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 8,
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
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  themeToggleText: {
    flex: 1,
  },
  themeToggleSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dangerCard: {
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  deleteToggleButton: {
    borderColor: '#dc2626',
    marginTop: 8,
  },
  deleteSection: {
    marginTop: 8,
  },
  deleteWarning: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  deleteButton: {
    flex: 1,
  },
});

export default ProfileScreen;
