import React, { useState } from 'react';
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
import { authAPI } from '../services/api';
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

  const roles = [
    { label: t('signup.patient') || 'Patient', value: 'patient' },
    { label: t('signup.pharmacyAdmin') || 'Pharmacy Admin', value: 'pharmacy_admin' },
  ];

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
      const userData = {
        first_name: firstName,
        last_name: lastName,
        email,
        username,
        password,
        password_confirm: confirmPassword,
        role,
      };

      const result = await signUp(userData);

      if (result.success) {
        if (result.requiresVerification) {
          // Show "check your email" screen
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
                onValueChange={setRole}
                style={[styles.picker, { color: colors.text }]}
                enabled={!isFormLoading}
              >
                {roles.map((roleItem) => (
                  <Picker.Item key={roleItem.value} label={roleItem.label} value={roleItem.value} />
                ))}
              </Picker>
            </View>
          </View>

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

