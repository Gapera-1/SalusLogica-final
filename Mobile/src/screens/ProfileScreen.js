import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Card, Button, TextInput, Avatar, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { userAPI, authAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const ProfileScreen = () => {
  const { t, language, setLanguage, languages } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
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
      logError('ProfileScreen.loadProfile', error);
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
          logError('ProfileScreen.uploadAvatar', error);
          const errorMessage = getErrorMessage(error, t);
          Alert.alert(t('common.error'), errorMessage);
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
              logError('ProfileScreen.removeAvatar', error);
              const errorMessage = getErrorMessage(error, t);
              Alert.alert(t('common.error'), errorMessage);
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
      logError('ProfileScreen.saveProfile', error);
      const errorMessage = getErrorMessage(error, t);
      Alert.alert(t('common.error'), errorMessage);
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
              logError('ProfileScreen.deleteAccount', error);
              const errorMessage = getErrorMessage(error, t);
              Alert.alert(t('common.error'), errorMessage);
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
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={handleSelectAvatar} activeOpacity={0.7} style={styles.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Avatar.Text 
              size={88} 
              label={formData.username.substring(0, 2).toUpperCase()} 
              style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              labelStyle={{ fontSize: 32, fontWeight: '700' }}
            />
          )}
          <View style={styles.cameraIconContainer}>
            <MaterialCommunityIcons name="camera" size={16} color="#fff" />
          </View>
        </TouchableOpacity>
        
        <Text style={styles.heroUsername}>{formData.username}</Text>
        
        {avatarUri && (
          <TouchableOpacity onPress={handleRemoveAvatar} style={styles.removeAvatarButton}>
            <Text style={styles.removeAvatarText}>{t('profile.removePhoto')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={handleLogout} style={styles.logoutPill}>
          <MaterialCommunityIcons name="logout" size={16} color="#fff" />
          <Text style={styles.logoutPillText}>{t('profile.logout')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>

        {/* Profile Form */}
        <View style={styles.sections}>
          {/* Personal Information */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardContent}>
              <View style={styles.sectionHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="account-outline" size={20} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.personalInfo')}</Text>
                </View>
                {!editing && (
                  <TouchableOpacity onPress={handleEditProfile} style={[styles.editButton, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.editText, { color: colors.primary }]}>{t('profile.edit')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                label={t('profile.username')}
                value={formData.username}
                onChangeText={(value) => handleInputChange('username', value)}
                disabled={!editing}
                style={styles.input}
                textColor={colors.text}
              />

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={[styles.label, { color: colors.text }]}>{t('profile.ageCategory')}</Text>
                  <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.gender')}</Text>
                  <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Picker
                      selectedValue={formData.gender}
                      onValueChange={(value) => handleInputChange('gender', value)}
                      style={[styles.picker, { color: colors.text }]}
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
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    activeOutlineColor={colors.primary}
                    outlineColor={colors.border}
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <TextInput
                    label={t('profile.height')}
                    value={formData.height}
                    onChangeText={(value) => handleInputChange('height', value)}
                    keyboardType="numeric"
                    disabled={!editing}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    activeOutlineColor={colors.primary}
                    outlineColor={colors.border}
                  />
                </View>
              </View>

              <TextInput
                label={t('profile.phone')}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                keyboardType="phone-pad"
                disabled={!editing}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                activeOutlineColor={colors.primary}
                outlineColor={colors.border}
              />
            </View>
          </Card>

          {/* Medical Information */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <MaterialCommunityIcons name="medical-bag" size={18} color={colors.primary} />{' '}
                {t('profile.medicalInfo')}
              </Text>

              <TextInput
                label={t('profile.medicalConditions')}
                value={formData.medicalConditions}
                onChangeText={(value) => handleInputChange('medicalConditions', value)}
                multiline
                numberOfLines={3}
                disabled={!editing}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                activeOutlineColor={colors.primary}
                outlineColor={colors.border}
              />

              <TextInput
                label={t('profile.allergies')}
                value={formData.allergies}
                onChangeText={(value) => handleInputChange('allergies', value)}
                multiline
                numberOfLines={2}
                disabled={!editing}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                activeOutlineColor={colors.primary}
                outlineColor={colors.border}
              />
            </View>
          </Card>

          {/* Preferences */}
          <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                <MaterialCommunityIcons name="cog-outline" size={18} color={colors.primary} />{' '}
                {t('profile.preferences')}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.timezone')}</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Picker
                    selectedValue={formData.timezone}
                    onValueChange={(value) => handleInputChange('timezone', value)}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={editing}
                  >
                    {timezones.map((tz) => (
                      <Picker.Item key={tz.value} label={tz.label} value={tz.value} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.preferredLanguage')}</Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Picker
                    selectedValue={formData.preferredLanguage}
                    onValueChange={(value) => handleInputChange('preferredLanguage', value)}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={editing}
                  >
                    {languageOptions.map((lang) => (
                      <Picker.Item key={lang.value} label={lang.label} value={lang.value} />
                    ))}
                  </Picker>
                </View>

              {/* Dark Mode Toggle */}
              <View style={[styles.themeToggleContainer, { borderTopColor: colors.border }]}>
                <View style={styles.themeToggleText}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>{t('profile.darkMode') || 'Dark Mode'}</Text>
                  <Text style={[styles.themeToggleSubtext, { color: colors.textMuted }]}>
                    {isDark ? t('profile.darkModeEnabled') || 'Dark theme enabled' : t('profile.lightModeEnabled') || 'Light theme enabled'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  color={colors.primary}
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
                style={[styles.cancelButton, { borderColor: colors.border }]}
                textColor={colors.text}
                disabled={loading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                style={styles.saveButton}
                buttonColor={colors.primary}
                loading={loading}
                disabled={loading}
              >
                {t('profile.saveProfile')}
              </Button>
            </View>
          )}

          {/* Danger Zone - Delete Account */}
          <Card style={[styles.card, styles.dangerCard, { backgroundColor: colors.surface }]}>
            <View style={styles.cardContent}>
              <Text style={[styles.sectionTitle, { color: colors.error }]}>{t('profile.dangerZone')}</Text>
              
              {!showDeleteSection ? (
                <Button
                  mode="outlined"
                  onPress={() => setShowDeleteSection(true)}
                  style={[styles.deleteToggleButton, { borderColor: colors.error }]}
                  textColor={colors.error}
                >
                  {t('profile.deleteAccount')}
                </Button>
              ) : (
                <View style={styles.deleteSection}>
                  <Text style={[styles.deleteWarning, { color: colors.error }]}>
                    {t('profile.deleteAccountWarning')}
                  </Text>
                  <TextInput
                    label={t('profile.enterPasswordConfirm')}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    secureTextEntry
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    activeOutlineColor={colors.error}
                    outlineColor={colors.border}
                  />
                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setShowDeleteSection(false);
                        setDeletePassword('');
                      }}
                      style={[styles.cancelButton, { borderColor: colors.border }]}
                      textColor={colors.text}
                      disabled={deleteLoading}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleDeleteAccount}
                      style={styles.deleteButton}
                      buttonColor={colors.error}
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
  },
  content: {
    padding: 16,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 28,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    // backgroundColor set dynamically
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  heroUsername: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  removeAvatarButton: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  removeAvatarText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  logoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 10,
  },
  logoutPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  sections: {
    gap: 14,
  },
  card: {
    padding: 0,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 1,
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
    fontSize: 17,
    fontWeight: '700',
  },
  editButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
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
    borderRadius: 10,
  },
  saveButton: {
    flex: 1,
    borderRadius: 10,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    marginTop: 8,
  },
  themeToggleText: {
    flex: 1,
  },
  themeToggleSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  dangerCard: {
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  deleteToggleButton: {
    borderColor: '#dc2626',
    marginTop: 8,
    borderRadius: 10,
  },
  deleteSection: {
    marginTop: 8,
  },
  deleteWarning: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  deleteButton: {
    flex: 1,
    borderRadius: 10,
  },
});

export default ProfileScreen;
