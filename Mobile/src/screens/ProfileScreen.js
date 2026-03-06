import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image, Platform, Clipboard, KeyboardAvoidingView } from 'react-native';
import { Card, Button, TextInput, Avatar, Switch } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { userAPI, authAPI, pharmacyAdminAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

const ProfileScreen = () => {
  const { t, language, setLanguage, languages } = useLanguage();
  const { isDark, toggleTheme, colors } = useTheme();
  const { user, signOut, updateProfile: updateAuthProfile } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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
  const [pharmacyProfile, setPharmacyProfile] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const isPharmacyAdmin = user?.user_type === 'pharmacy_admin';

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

      // Load pharmacy admin profile if applicable
      if (isPharmacyAdmin) {
        try {
          const paProfile = await pharmacyAdminAPI.getProfile();
          if (paProfile) setPharmacyProfile(paProfile);
        } catch (paErr) {
          logError('ProfileScreen.loadPharmacyProfile', paErr);
        }
      }
    } catch (error) {
      logError('ProfileScreen.loadProfile', error);
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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Hero Header */}
      <View style={[styles.heroHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={handleSelectAvatar} activeOpacity={0.7} style={styles.avatarWrap} accessibilityLabel="Change profile photo" accessibilityRole="button">
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

        {/* Pharmacy Admin Facility Info */}
        {isPharmacyAdmin && pharmacyProfile && (
          <>
            {/* Pharmacy ID Card */}
            <Card style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="key" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyProfile.pharmacyId') || 'Pharmacy ID'}
                    </Text>
                  </View>
                </View>
                <View style={[paStyles.idRow, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5', borderColor: colors.border }]}>
                  <Text style={[paStyles.idValue, { color: colors.text }]}>
                    {pharmacyProfile.pharmacy_id || '—'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(pharmacyProfile.pharmacy_id || '');
                      setCopiedId(true);
                      setTimeout(() => setCopiedId(false), 2000);
                    }}
                    style={[paStyles.copyBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name={copiedId ? 'checkmark' : 'copy'} size={16} color="#fff" />
                    <Text style={paStyles.copyText}>{copiedId ? 'Copied!' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[paStyles.idHint, { color: colors.textMuted }]}>
                  {t('pharmacyProfile.idHint') || 'Share this ID with patients so they can link to your pharmacy'}
                </Text>
              </View>
            </Card>

            {/* Facility Information */}
            <Card style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="business" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyProfile.facilityInfo') || 'Facility Information'}
                    </Text>
                  </View>
                </View>

                {[
                  { icon: 'storefront', label: t('pharmacyProfile.facilityName') || 'Facility Name', value: pharmacyProfile.facility_name },
                  { icon: 'medical', label: t('pharmacyProfile.facilityType') || 'Facility Type', value: pharmacyProfile.facility_type ? pharmacyProfile.facility_type.charAt(0).toUpperCase() + pharmacyProfile.facility_type.slice(1) : '—' },
                  { icon: 'call', label: t('pharmacyProfile.phone') || 'Phone', value: pharmacyProfile.phone_number },
                  { icon: 'mail', label: t('pharmacyProfile.email') || 'Email', value: pharmacyProfile.email },
                  { icon: 'location', label: t('pharmacyProfile.address') || 'Address', value: pharmacyProfile.address },
                ].map((item, i) => (
                  <View key={i} style={[paStyles.infoRow, { borderColor: colors.border }]}>
                    <View style={[paStyles.infoIcon, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                      <Ionicons name={item.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[paStyles.infoLabel, { color: colors.textMuted }]}>{item.label}</Text>
                      <Text style={[paStyles.infoValue, { color: colors.text }]}>{item.value || '—'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* Location */}
            <Card style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="globe" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyProfile.location') || 'Location'}
                    </Text>
                  </View>
                </View>

                {[
                  { icon: 'flag', label: t('pharmacyProfile.country') || 'Country', value: pharmacyProfile.country },
                  { icon: 'map', label: t('pharmacyProfile.province') || 'Province', value: pharmacyProfile.province },
                  { icon: 'navigate', label: t('pharmacyProfile.district') || 'District', value: pharmacyProfile.district },
                ].map((item, i) => (
                  <View key={i} style={[paStyles.infoRow, { borderColor: colors.border }]}>
                    <View style={[paStyles.infoIcon, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                      <Ionicons name={item.icon} size={16} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[paStyles.infoLabel, { color: colors.textMuted }]}>{item.label}</Text>
                      <Text style={[paStyles.infoValue, { color: colors.text }]}>{item.value || '—'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </Card>

            {/* License Information */}
            <Card style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyProfile.licenseInfo') || 'License Information'}
                    </Text>
                  </View>
                </View>

                <View style={[paStyles.infoRow, { borderColor: colors.border }]}>
                  <View style={[paStyles.infoIcon, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                    <Ionicons name="document-text" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[paStyles.infoLabel, { color: colors.textMuted }]}>
                      {t('pharmacyProfile.licenseNumber') || 'License Number'}
                    </Text>
                    <Text style={[paStyles.infoValue, { color: colors.text }]}>
                      {pharmacyProfile.license_number || '—'}
                    </Text>
                  </View>
                </View>

                <View style={[paStyles.infoRow, { borderColor: colors.border }]}>
                  <View style={[paStyles.infoIcon, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[paStyles.infoLabel, { color: colors.textMuted }]}>
                      {t('pharmacyProfile.licenseExpiry') || 'License Expiry'}
                    </Text>
                    <Text style={[paStyles.infoValue, { color: pharmacyProfile.license_expiry && new Date(pharmacyProfile.license_expiry) < new Date() ? '#ef4444' : colors.text }]}>
                      {pharmacyProfile.license_expiry ? new Date(pharmacyProfile.license_expiry).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                </View>

                {/* Verification Status */}
                <View style={[paStyles.statusRow, { backgroundColor: pharmacyProfile.is_verified ? (isDark ? '#064e3b' : '#ecfdf5') : (isDark ? '#451a03' : '#fffbeb') }]}>
                  <Ionicons
                    name={pharmacyProfile.is_verified ? 'checkmark-circle' : 'time'}
                    size={18}
                    color={pharmacyProfile.is_verified ? '#10b981' : '#f59e0b'}
                  />
                  <Text style={[paStyles.statusText, { color: pharmacyProfile.is_verified ? '#10b981' : '#f59e0b' }]}>
                    {pharmacyProfile.is_verified
                      ? (t('pharmacyProfile.verified') || 'Verified')
                      : (t('pharmacyProfile.pendingVerification') || 'Pending Verification')}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Stats */}
            <Card style={[styles.card, { backgroundColor: colors.surface, marginBottom: 14 }]}>
              <View style={styles.cardContent}>
                <View style={styles.sectionHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="stats-chart" size={20} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t('pharmacyProfile.stats') || 'Statistics'}
                    </Text>
                  </View>
                </View>

                <View style={paStyles.statsGrid}>
                  <View style={[paStyles.statCard, { backgroundColor: isDark ? '#1e3a5f' : '#eff6ff' }]}>
                    <Ionicons name="people" size={22} color="#3b82f6" />
                    <Text style={[paStyles.statValue, { color: colors.text }]}>
                      {pharmacyProfile.patient_count ?? pharmacyProfile.total_patients ?? 0}
                    </Text>
                    <Text style={[paStyles.statLabel, { color: colors.textMuted }]}>
                      {t('pharmacyProfile.totalPatients') || 'Total Patients'}
                    </Text>
                  </View>
                  <View style={[paStyles.statCard, { backgroundColor: isDark ? '#064e3b' : '#ecfdf5' }]}>
                    <Ionicons name="heart" size={22} color="#10b981" />
                    <Text style={[paStyles.statValue, { color: colors.text }]}>
                      {pharmacyProfile.active_patient_count ?? pharmacyProfile.active_patients ?? 0}
                    </Text>
                    <Text style={[paStyles.statLabel, { color: colors.textMuted }]}>
                      {t('pharmacyProfile.activePatients') || 'Active Patients'}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </>
        )}

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
    </KeyboardAvoidingView>
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

const paStyles = StyleSheet.create({
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  idValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  idHint: {
    fontSize: 11,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});

export default ProfileScreen;
