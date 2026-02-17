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
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { authAPI } from '../services/api';
import { timezoneStorage } from '../services/storage';

export default function LoginScreen({ navigation }) {
  const { signIn, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Validate email format
  const validateEmail = (mail) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(mail);
  };

  // Validate form inputs
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = t('login.emailRequired') || 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = t('login.emailInvalid') || 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = t('login.passwordRequired') || 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Get device timezone
  const getDeviceTimezone = async () => {
    try {
      const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      return zone || 'UTC';
    } catch (error) {
      console.error('Error detecting timezone:', error);
      return 'UTC';
    }
  };

  // Show snackbar message
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message, type });
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setNeedsVerification(false);
    try {
      const result = await signIn(email, password);

      if (result.success) {
        // Auto-detect and store timezone on login
        const detectedTz = await getDeviceTimezone();
        if (detectedTz) {
          await timezoneStorage.setTimezone(detectedTz);
        }

        showSnackbar(t('common.success') || 'Login successful!', 'success');
        // Navigation handled automatically by App.js
      } else {
        // Check if the error is about email verification
        const errorMsg = result.error || '';
        if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verification')) {
          setNeedsVerification(true);
        }
        showSnackbar(errorMsg || t('login.invalidCredentials') || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showSnackbar(error.message || t('common.error') || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle resend verification email
  const handleResendVerification = async () => {
    if (!email.trim()) {
      showSnackbar(t('emailVerification.enterEmailFirst'), 'error');
      return;
    }
    setResendLoading(true);
    try {
      await authAPI.resendVerification(email);
      showSnackbar(t('emailVerification.verificationSent'), 'success');
    } catch (error) {
      showSnackbar(error.message || t('emailVerification.resentFailed'), 'error');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  const isFormLoading = loading || authLoading;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>SalusLogica</Text>
          <Text style={styles.title}>{t('login.title') || 'Sign In'}</Text>
          <Text style={styles.subtitle}>
            {t('login.signInToYourAccount') || 'Sign in to your account'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('login.email') || 'Email'}</Text>
            <TextInput
              mode="outlined"
              placeholder={t('login.enterUsername') || 'Enter your email'}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: null });
              }}
              disabled={isFormLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              error={!!errors.email}
              style={styles.input}
              outlineColor="#d1d5db"
              activeOutlineColor="#0d9488"
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('login.password') || 'Password'}</Text>
            <TextInput
              mode="outlined"
              placeholder={t('login.enterPassword') || 'Enter your password'}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: null });
              }}
              disabled={isFormLoading}
              secureTextEntry={secureTextEntry}
              error={!!errors.password}
              style={styles.input}
              outlineColor="#d1d5db"
              activeOutlineColor="#0d9488"
              right={
                <TextInput.Icon
                  icon={secureTextEntry ? 'eye-off' : 'eye'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
            />
            {errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {/* Login Button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            disabled={isFormLoading}
            loading={isFormLoading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            {isFormLoading
              ? t('login.signingIn') || 'Signing in...'
              : t('login.loginButton') || 'Sign In'}
          </Button>

          {/* Email Verification Resend */}
          {needsVerification && (
            <View style={styles.verificationContainer}>
              <Text style={styles.verificationText}>
                {t('emailVerification.notVerifiedMessage')}
              </Text>
              <Button
                mode="outlined"
                onPress={handleResendVerification}
                loading={resendLoading}
                disabled={resendLoading}
                style={styles.resendButton}
                compact
              >
                {resendLoading ? t('emailVerification.sending') : t('emailVerification.resendVerification')}
              </Button>
            </View>
          )}

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={isFormLoading}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>
              {t('login.forgotPassword') || 'Forgot your password?'}
            </Text>
          </TouchableOpacity>

          {/* Signup Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>
              {t('login.noAccount') || "Don't have an account?"}{' '}
            </Text>
            <TouchableOpacity onPress={handleSignup} disabled={isFormLoading}>
              <Text style={styles.signupLink}>
                {t('login.createNewAccount') || 'Sign up'}
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
          snackbar.type === 'error' && styles.snackbarError,
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
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
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
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#0d9488',
    borderRadius: 8,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signupLink: {
    fontSize: 14,
    color: '#0d9488',
    fontWeight: '600',
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#0d9488',
    fontWeight: '500',
  },
  verificationContainer: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  verificationText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    marginBottom: 8,
  },
  resendButton: {
    borderColor: '#f59e0b',
  },
  snackbar: {
    backgroundColor: '#10b981',
  },
  snackbarError: {
    backgroundColor: '#ef4444',
  },
});

