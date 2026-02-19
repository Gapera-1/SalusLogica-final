import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { TextInput, Button, Text, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { timezoneStorage } from '../services/storage';

/**
 * LoginScreen
 * Mirrors web app's Login.jsx functionality
 * Uses new AuthContext for authentication
 */
export default function LoginScreen({ navigation }) {
  const { signIn, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  /**
   * Validate email format
   */
  const validateEmail = (mail) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(mail);
  };

  /**
   * Validate form inputs
   */
  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle login
   */
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);

      if (result.success) {
        // Auto-detect and store timezone on first login
        const detectedTz = await getDeviceTimezone();
        if (detectedTz) {
          await timezoneStorage.setTimezone(detectedTz);
        }

        // Navigate to home (AuthContext handles this)
        showSnackbar('Login successful!');
        // Navigation will be handled by the app navigator
        // based on auth context state
      } else {
        showSnackbar(result.error || 'Login failed', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      showSnackbar(error.message || 'An error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get device timezone
   * Uses native APIs to detect user's local timezone
   */
  const getDeviceTimezone = async () => {
    try {
      // For React Native, we can use timezone detection
      // This is a simplified version - production should use react-native-localize
      const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      return zone || 'UTC';
    } catch (error) {
      console.error('Error detecting timezone:', error);
      return 'UTC';
    }
  };

  /**
   * Show snackbar message
   */
  const showSnackbar = (message, type = 'success') => {
    setSnackbar({ visible: true, message });
    setTimeout(() => {
      setSnackbar({ visible: false, message: '' });
    }, 3000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>SalusLogica</Text>
          <Text style={styles.subtitle}>Medicine Reminder</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[
                styles.input,
                errors.email && styles.inputError,
              ]}
              outlineColor={errors.email ? '#e74c3c' : '#bbb'}
              activeOutlineColor={errors.email ? '#e74c3c' : '#0d9488'}
            />
            {errors.email && (
              <Text style={styles.errorText}>{errors.email}</Text>
            )}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              mode="outlined"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
              secureTextEntry={secureTextEntry}
              style={[
                styles.input,
                errors.password && styles.inputError,
              ]}
              outlineColor={errors.password ? '#e74c3c' : '#bbb'}
              activeOutlineColor={errors.password ? '#e74c3c' : '#0d9488'}
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
            disabled={loading || isLoading}
            loading={loading || isLoading}
            style={styles.loginButton}
            contentStyle={styles.loginButtonContent}
            labelStyle={styles.loginButtonLabel}
          >
            {loading || isLoading ? 'Logging in...' : 'Login'}
          </Button>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Don't have an account?</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Signup Link */}
          <Button
            mode="outlined"
            onPress={() => navigation.navigate('Signup')}
            disabled={loading || isLoading}
            style={styles.signupButton}
            contentStyle={styles.signupButtonContent}
            labelStyle={styles.signupButtonLabel}
          >
            Create New Account
          </Button>
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By logging in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        style={[
          styles.snackbar,
          snackbar.message?.includes('error') && styles.snackbarError,
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0d9488',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: '#0d9488',
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
  },
  signupButton: {
    borderRadius: 8,
    borderColor: '#0d9488',
  },
  signupButtonContent: {
    paddingVertical: 8,
  },
  signupButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d9488',
  },
  footer: {
    marginTop: 20,
    gap: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  snackbar: {
    backgroundColor: '#4caf50',
  },
  snackbarError: {
    backgroundColor: '#e74c3c',
  },
});
