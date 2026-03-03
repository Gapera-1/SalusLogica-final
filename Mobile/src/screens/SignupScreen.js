import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Text, Snackbar } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { authAPI, pharmacyAdminAPI } from '../services/api';
import { getErrorMessage, logError } from '../utils/errorHandler';

export default function SignupScreen({ navigation }) {
  const { signUp, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [registeredEmail, setRegisteredEmail] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  // Pharmacy admin fields
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityType, setFacilityType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [locationOptions, setLocationOptions] = useState(null);

  // Patient pharmacy admin ID
  const [pharmacyAdminId, setPharmacyAdminId] = useState('');

  // Pharmacy admin success state
  const [pharmacyIdSuccess, setPharmacyIdSuccess] = useState(null);

  const roles = [
    { label: t('signup.patient') || 'Patient', value: 'patient' },
    { label: t('signup.pharmacyAdmin') || 'Pharmacy Admin', value: 'pharmacy_admin' },
  ];

  const isPharmacyAdmin = role === 'pharmacy_admin';
  const isPatient = role === 'patient';

  // Load location options when pharmacy admin is selected
  useEffect(() => {
    if (isPharmacyAdmin && !locationOptions) {
      loadLocationOptions();
    }
  }, [role]);

  const loadLocationOptions = async () => {
    try {
      const data = await pharmacyAdminAPI.getLocationOptions();
      setLocationOptions(data);
    } catch (error) {
      console.error('Failed to load location options:', error);
    }
  };

  // Validate email format
  const validateEmail = (mail) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(mail);
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = t('signup.firstNameRequired') || 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = t('signup.lastNameRequired') || 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = t('signup.emailRequired') || 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = t('signup.emailInvalid') || 'Please enter a valid email';
    }

    if (!username.trim()) {
      newErrors.username = t('signup.usernameRequired') || 'Username is required';
    }

    if (!password.trim()) {
      newErrors.password = t('signup.passwordRequired') || 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = t('signup.passwordMinLength') || 'Password must be at least 8 characters';
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = t('signup.confirmPasswordRequired') || 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('signup.passwordsMustMatch') || 'Passwords must match';
    }

    // Pharmacy admin specific validations
    if (isPharmacyAdmin) {
      if (!country.trim()) {
        newErrors.country = t('pharmacyAdmin.countryRequired') || 'Country is required';
      }
      if (!province.trim()) {
        newErrors.province = t('pharmacyAdmin.provinceRequired') || 'Province is required';
      }
      if (!district.trim()) {
        newErrors.district = t('pharmacyAdmin.districtRequired') || 'District is required';
      }
      if (!facilityName.trim()) {
        newErrors.facilityName = t('pharmacyAdmin.facilityNameRequired') || 'Facility name is required';
      }
      if (!facilityType) {
        newErrors.facilityType = t('pharmacyAdmin.facilityTypeRequired') || 'Facility type is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message, type });
  };

  // Handle signup
  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isPharmacyAdmin) {
        // Pharmacy admin signup - use pharmacy admin endpoint
        const pharmacyData = {
          username,
          email,
          password,
          confirm_password: confirmPassword,
          country,
          province,
          district,
          facility_name: facilityName,
          facility_type: facilityType,
          phone_number: phoneNumber,
          address,
          license_number: licenseNumber,
          license_expiry: licenseExpiry,
        };

        const result = await pharmacyAdminAPI.signup(pharmacyData);
        
        // Show pharmacy ID success
        const pharmacyIdMsg = (t('auth.pharmacyAdminIdSuccess') || 'Your Pharmacy Admin ID is: %(pharmacy_id)s')
          .replace('%(pharmacy_id)s', result.pharmacy_id);
        setPharmacyIdSuccess({ message: pharmacyIdMsg, pharmacyId: result.pharmacy_id });
      } else {
        // Regular user signup - use auth endpoint
        const userData = {
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          password,
          password_confirm: confirmPassword,
          role,
          pharmacy_admin_id: pharmacyAdminId || undefined,
        };

        const result = await signUp(userData);

        if (result.success) {
          if (result.requiresVerification) {
            setRegisteredEmail(email);
          } else {
            showSnackbar(t('auth.signupSuccess') || 'Signup successful! Please login.', 'success');
            setTimeout(() => {
              navigation.navigate('Login');
            }, 1500);
          }
        } else {
          showSnackbar(result.error || t('errors.registrationFailed') || 'Signup failed', 'error');
        }
      }
    } catch (error) {
      logError('SignupScreen.handleSignup', error);
      const errorMessage = getErrorMessage(error, t);
      showSnackbar(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendVerification = async () => {
    if (!registeredEmail) return;
    setResendLoading(true);
    try {
      await authAPI.resendVerification(registeredEmail);
      showSnackbar(t('emailVerification.resentSuccess'), 'success');
    } catch (error) {
      logError('SignupScreen.handleResendVerification', error);
      const errorMessage = getErrorMessage(error, t);
      showSnackbar(errorMessage, 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const isFormLoading = loading || authLoading;

  // Show Pharmacy Admin ID success screen
  if (pharmacyIdSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.verificationCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.verificationIcon}>🏥</Text>
            <Text style={[styles.verificationTitle, { color: colors.text }]}>
              {t('common.success') || 'Success'}!
            </Text>
            <Text style={[styles.verificationMessage, { color: colors.textSecondary }]}>
              {pharmacyIdSuccess.message}
            </Text>
            <View style={[styles.pharmacyIdBox, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
              <Text style={[styles.pharmacyIdLabel, { color: colors.textSecondary }]}>
                {t('signup.pharmacyAdminId') || 'Pharmacy Admin ID'}
              </Text>
              <Text style={[styles.pharmacyIdValue, { color: colors.primary }]}>
                {pharmacyIdSuccess.pharmacyId}
              </Text>
            </View>
            <Text style={[styles.verificationSubtext, { color: colors.textMuted }]}>
              {t('pharmacyAdmin.adminIdOptional') || 'Share this ID with patients so they can link to your pharmacy.'}
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              style={[styles.goToLoginButton, { backgroundColor: colors.primary }]}
            >
              {t('emailVerification.goToLogin') || 'Go to Login'}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show "Check Your Email" screen after successful registration
  if (registeredEmail) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.verificationCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.verificationIcon}>📧</Text>
            <Text style={[styles.verificationTitle, { color: colors.text }]}>{t('emailVerification.checkYourEmail')}</Text>
            <Text style={[styles.verificationMessage, { color: colors.textSecondary }]}>
              {t('emailVerification.verificationSentTo')}{' '}
              <Text style={{ fontWeight: 'bold', color: colors.text }}>{registeredEmail}</Text>.{' '}
              {t('emailVerification.clickLinkToVerify')}
            </Text>
            <Text style={[styles.verificationSubtext, { color: colors.textMuted }]}>
              {t('emailVerification.didntReceive')}
            </Text>

            <Button
              mode="outlined"
              onPress={handleResendVerification}
              loading={resendLoading}
              disabled={resendLoading}
              style={[styles.resendVerificationButton, { borderColor: colors.primary }]}
              textColor={colors.primary}
            >
              {resendLoading ? t('emailVerification.sending') : t('emailVerification.resendVerification')}
            </Button>

            <Button
              mode="contained"
              onPress={() => navigation.navigate('Login')}
              style={[styles.goToLoginButton, { backgroundColor: colors.primary }]}
            >
              {t('emailVerification.goToLogin')}
            </Button>
          </View>
        </ScrollView>

        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={3000}
          style={[
            styles.snackbar,
            { backgroundColor: snackbar.type === 'error' ? colors.error : colors.success },
          ]}
        >
          {snackbar.message}
        </Snackbar>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.primary }]}>SalusLogica</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('signup.title') || 'Create Account'}</Text>
        </View>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.surface, borderRadius: 16, padding: 20 }]}>
          {/* Name Fields */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.firstName') || 'First Name'}</Text>
              <TextInput
                mode="outlined"
                placeholder={t('auth.firstNamePlaceholder')}
                value={firstName}
                onChangeText={(text) => {
                  setFirstName(text);
                  if (errors.firstName) setErrors({ ...errors, firstName: null });
                }}
                disabled={isFormLoading}
                error={!!errors.firstName}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.firstName && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.firstName}</Text>
              )}
            </View>

            <View style={styles.halfWidth}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.lastName') || 'Last Name'}</Text>
              <TextInput
                mode="outlined"
                placeholder={t('auth.lastNamePlaceholder')}
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  if (errors.lastName) setErrors({ ...errors, lastName: null });
                }}
                disabled={isFormLoading}
                error={!!errors.lastName}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              {errors.lastName && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.lastName}</Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.email') || 'Email'}</Text>
            <TextInput
              mode="outlined"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              disabled={isFormLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!errors.email}
              style={[styles.input, { backgroundColor: colors.surface }]}
              textColor={colors.text}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
            )}
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.username') || 'Username'}</Text>
            <TextInput
              mode="outlined"
              placeholder={t('auth.usernamePlaceholder')}
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors({ ...errors, username: null });
              }}
              disabled={isFormLoading}
              autoCapitalize="none"
              error={!!errors.username}
              style={[styles.input, { backgroundColor: colors.surface }]}
              textColor={colors.text}
              outlineColor={colors.border}
              activeOutlineColor={colors.primary}
            />
            {errors.username && (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.username}</Text>
            )}
          </View>

          {/* Password Fields */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.password') || 'Password'}</Text>
              <TextInput
                mode="outlined"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors({ ...errors, password: null });
                }}
                disabled={isFormLoading}
                secureTextEntry={secureTextEntry}
                error={!!errors.password}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                right={
                  <TextInput.Icon
                    icon={secureTextEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureTextEntry(!secureTextEntry)}
                    iconColor={colors.textSecondary}
                  />
                }
              />
              {errors.password && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>
              )}
            </View>

            <View style={styles.halfWidth}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.confirmPassword') || 'Confirm'}</Text>
              <TextInput
                mode="outlined"
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null });
                }}
                disabled={isFormLoading}
                secureTextEntry={secureConfirmEntry}
                error={!!errors.confirmPassword}
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                right={
                  <TextInput.Icon
                    icon={secureConfirmEntry ? 'eye-off' : 'eye'}
                    onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}
                    iconColor={colors.textSecondary}
                  />
                }
              />
              {errors.confirmPassword && (
                <Text style={[styles.errorText, { color: colors.error }]}>{errors.confirmPassword}</Text>
              )}
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t('signup.role') || 'Role'}</Text>
            <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Picker
                selectedValue={role}
                onValueChange={(val) => {
                  setRole(val);
                  setErrors({});
                }}
                style={[styles.picker, { color: colors.text }]}
                enabled={!isFormLoading}
              >
                {roles.map((roleItem) => (
                  <Picker.Item key={roleItem.value} label={roleItem.label} value={roleItem.value} />
                ))}
              </Picker>
            </View>
            <Text style={[styles.roleHelpText, { color: colors.textMuted }]}>
              {isPharmacyAdmin
                ? (t('roleDescriptions.pharmacyAdmin') || 'Manage multiple patients and their medication adherence')
                : (t('roleDescriptions.patient') || 'Create an account to manage your personal medications and health records')}
            </Text>
          </View>

          {/* ========== Pharmacy Admin Fields ========== */}
          {isPharmacyAdmin && (
            <View style={[styles.sectionContainer, { borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('pharmacyAdmin.title') || 'Pharmacy Information'}
              </Text>

              {/* Country */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('pharmacyAdmin.country') || 'Country'} *
                </Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: errors.country ? colors.error : colors.border }]}>
                  <Picker
                    selectedValue={country}
                    onValueChange={(val) => {
                      setCountry(val);
                      if (errors.country) setErrors({ ...errors, country: null });
                    }}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={!isFormLoading}
                  >
                    <Picker.Item label={t('pharmacyAdmin.selectCountry') || 'Select Country'} value="" />
                    {locationOptions?.countries?.map((c) => (
                      <Picker.Item key={c} label={c} value={c} />
                    ))}
                  </Picker>
                </View>
                {errors.country && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.country}</Text>
                )}
              </View>

              {/* Province */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('pharmacyAdmin.province') || 'Province'} *
                </Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: errors.province ? colors.error : colors.border }]}>
                  <Picker
                    selectedValue={province}
                    onValueChange={(val) => {
                      setProvince(val);
                      setDistrict('');
                      if (errors.province) setErrors({ ...errors, province: null });
                    }}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={!isFormLoading}
                  >
                    <Picker.Item label={t('pharmacyAdmin.selectProvince') || 'Select Province'} value="" />
                    {locationOptions?.provinces?.map((p) => (
                      <Picker.Item key={p} label={p} value={p} />
                    ))}
                  </Picker>
                </View>
                {errors.province && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.province}</Text>
                )}
              </View>

              {/* District */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>
                  {t('pharmacyAdmin.district') || 'District'} *
                </Text>
                <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: errors.district ? colors.error : colors.border }]}>
                  <Picker
                    selectedValue={district}
                    onValueChange={(val) => {
                      setDistrict(val);
                      if (errors.district) setErrors({ ...errors, district: null });
                    }}
                    style={[styles.picker, { color: colors.text }]}
                    enabled={!isFormLoading}
                  >
                    <Picker.Item label={t('pharmacyAdmin.selectDistrict') || 'Select District'} value="" />
                    {(locationOptions?.districts?.[province] || []).map((d) => (
                      <Picker.Item key={d} label={d} value={d} />
                    ))}
                  </Picker>
                </View>
                {errors.district && (
                  <Text style={[styles.errorText, { color: colors.error }]}>{errors.district}</Text>
                )}
              </View>

              {/* Facility Name & Type */}
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.facilityName') || 'Facility Name'} *
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t('pharmacyAdmin.enterFacilityName') || 'Enter facility name'}
                    value={facilityName}
                    onChangeText={(text) => {
                      setFacilityName(text);
                      if (errors.facilityName) setErrors({ ...errors, facilityName: null });
                    }}
                    disabled={isFormLoading}
                    error={!!errors.facilityName}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                  {errors.facilityName && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.facilityName}</Text>
                  )}
                </View>

                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.facilityType') || 'Facility Type'} *
                  </Text>
                  <View style={[styles.pickerContainer, { backgroundColor: colors.surface, borderColor: errors.facilityType ? colors.error : colors.border }]}>
                    <Picker
                      selectedValue={facilityType}
                      onValueChange={(val) => {
                        setFacilityType(val);
                        if (errors.facilityType) setErrors({ ...errors, facilityType: null });
                      }}
                      style={[styles.picker, { color: colors.text }]}
                      enabled={!isFormLoading}
                    >
                      <Picker.Item label={t('pharmacyAdmin.selectType') || 'Select Type'} value="" />
                      <Picker.Item label={t('pharmacyAdmin.pharmacy') || 'Pharmacy'} value="pharmacy" />
                      <Picker.Item label={t('pharmacyAdmin.hospital') || 'Hospital'} value="hospital" />
                    </Picker>
                  </View>
                  {errors.facilityType && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.facilityType}</Text>
                  )}
                </View>
              </View>

              {/* Phone & Address */}
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.phoneNumber') || 'Phone Number'}
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t('pharmacyAdmin.enterPhoneNumber') || 'Enter phone number'}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    disabled={isFormLoading}
                    keyboardType="phone-pad"
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.address') || 'Address'}
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t('pharmacyAdmin.enterAddress') || 'Enter address'}
                    value={address}
                    onChangeText={setAddress}
                    disabled={isFormLoading}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>
              </View>

              {/* License Number & Expiry */}
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.licenseNumber') || 'License Number'}
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t('pharmacyAdmin.enterLicenseNumber') || 'Enter license number'}
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                    disabled={isFormLoading}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>
                    {t('pharmacyAdmin.licenseExpiryDate') || 'License Expiry Date'}
                  </Text>
                  <TextInput
                    mode="outlined"
                    placeholder="YYYY-MM-DD"
                    value={licenseExpiry}
                    onChangeText={setLicenseExpiry}
                    disabled={isFormLoading}
                    style={[styles.input, { backgroundColor: colors.surface }]}
                    textColor={colors.text}
                    outlineColor={colors.border}
                    activeOutlineColor={colors.primary}
                  />
                </View>
              </View>
            </View>
          )}

          {/* ========== Patient Pharmacy Admin ID ========== */}
          {isPatient && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                {t('signup.pharmacyAdminId') || 'Pharmacy Admin ID (Optional)'}
              </Text>
              <TextInput
                mode="outlined"
                placeholder={t('signup.pharmacyAdminPlaceholder') || 'Enter pharmacy admin ID (optional)'}
                value={pharmacyAdminId}
                onChangeText={setPharmacyAdminId}
                disabled={isFormLoading}
                autoCapitalize="none"
                style={[styles.input, { backgroundColor: colors.surface }]}
                textColor={colors.text}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
              />
              <Text style={[styles.roleHelpText, { color: colors.textMuted }]}>
                {t('pharmacyAdmin.adminIdOptional') || 'Optional: Get this ID from your pharmacy administrator if you want to be managed by a pharmacy.'}
              </Text>
            </View>
          )}

          {/* Signup Button */}
          <Button
            mode="contained"
            onPress={handleSignup}
            disabled={isFormLoading}
            loading={isFormLoading}
            style={[styles.signupButton, { backgroundColor: colors.primary }]}
            contentStyle={styles.signupButtonContent}
            labelStyle={styles.signupButtonLabel}
          >
            {isFormLoading
              ? t('signup.signingUp') || 'Creating account...'
              : t('signup.signupButton') || 'Create Account'}
          </Button>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              {t('signup.alreadyHave') || 'Already have an account?'}{' '}
            </Text>
            <TouchableOpacity onPress={handleLogin} disabled={isFormLoading}>
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                {t('signup.login') || 'Sign in'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={[
          styles.snackbar,
          { backgroundColor: snackbar.type === 'error' ? colors.error : colors.success },
        ]}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0d9488',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
  },
  form: {
    width: '100%',
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
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  roleHelpText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 16,
  },
  pharmacyIdBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    width: '100%',
  },
  pharmacyIdLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  pharmacyIdValue: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signupButton: {
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#0d9488',
    borderRadius: 8,
  },
  signupButtonContent: {
    paddingVertical: 8,
  },
  signupButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  loginText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 14,
    color: '#0d9488',
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: '#10b981',
  },
  snackbarError: {
    backgroundColor: '#ef4444',
  },
  verificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  verificationIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  verificationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  verificationMessage: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  verificationSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  resendVerificationButton: {
    marginBottom: 12,
    width: '100%',
    borderColor: '#0d9488',
  },
  goToLoginButton: {
    width: '100%',
    backgroundColor: '#0d9488',
    borderRadius: 8,
  },
});

