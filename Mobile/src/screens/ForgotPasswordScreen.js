import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { authAPI } from '../services/api';

const ForgotPasswordScreen = ({ navigation }) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    setError('');

    if (!email.trim()) {
      setError(t('forgotPassword.emailRequired'));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t('forgotPassword.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || t('forgotPassword.failedToSend');
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.center}>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.successHeader}>
              <Text style={styles.successIcon}>📧</Text>
              <Text style={styles.successTitle}>{t('emailVerification.checkYourEmail')}</Text>
            </View>

            <Text style={styles.successText}>
              {t('emailVerification.verificationSentTo')} <Text style={styles.bold}>{email}</Text>
            </Text>
            <Text style={styles.successSubtext}>
              {t('emailVerification.clickLinkToVerify')}
            </Text>

            <View style={styles.buttonGroup}>
              <Button
                mode="contained"
                onPress={() => {
                  setSubmitted(false);
                  setEmail('');
                }}
                style={styles.button}
              >
                {t('emailVerification.resendVerification')}
              </Button>

              <Button
                mode="outlined"
                onPress={() => navigation.navigate('Login')}
                style={styles.button}
              >
                {t('emailVerification.goToLogin')}
              </Button>
            </View>
          </View>
        </Card>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.center}>
        <Card style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.header}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.title}>{t('forgotPassword.title')}</Text>
              <Text style={styles.subtitle}>
                {t('forgotPassword.subtitle')}
              </Text>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextInput
              label={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="email" />}
            />

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading || !email.trim()}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
            >
              {loading ? t('forgotPassword.sending') : t('forgotPassword.sendLink')}
            </Button>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>← {t('forgotPassword.backToLogin')}</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  cardContent: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  input: {
    marginBottom: 16,
  },
  submitButton: {
    marginBottom: 16,
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 6,
  },
  backLink: {
    alignItems: 'center',
    padding: 8,
  },
  backLinkText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '500',
  },
  // Success state styles
  successHeader: {
    alignItems: 'center',
    backgroundColor: '#14b8a6',
    marginHorizontal: -24,
    marginTop: -24,
    paddingVertical: 32,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 24,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  successText: {
    fontSize: 15,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  successSubtext: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  bold: {
    fontWeight: 'bold',
  },
  buttonGroup: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
});

export default ForgotPasswordScreen;
