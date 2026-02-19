import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const navigation = useNavigation();

  const handleGetStarted = () => {
    navigation.navigate('Login');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const handleSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo and Welcome Section */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.primary }]}>{t('common.appName')}</Text>
          <Text style={[styles.welcome, { color: colors.text }]}>{t('home.welcome')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t('home.subtitle')}</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{t('home.description')}</Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.featuresTitle, { color: colors.text }]}>{t('home.features.title')}</Text>
          <Text style={[styles.featuresSubtitle, { color: colors.textSecondary }]}>{t('home.features.subtitle')}</Text>
          
          <View style={styles.featureGrid}>
            <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('home.features.medicineManagement.title')}</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{t('home.features.medicineManagement.description')}</Text>
            </View>
            
            <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('home.features.smartReminders.title')}</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{t('home.features.smartReminders.description')}</Text>
            </View>
            
            <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('home.features.doseTracking.title')}</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{t('home.features.doseTracking.description')}</Text>
            </View>
            
            <View style={[styles.featureItem, { backgroundColor: colors.surface }]}>
              <Text style={[styles.featureTitle, { color: colors.text }]}>{t('home.features.patientProfiles.title')}</Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{t('home.features.patientProfiles.description')}</Text>
            </View>
          </View>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <Text style={[styles.ctaTitle, { color: colors.text }]}>{t('home.cta.title')}</Text>
          <Text style={[styles.ctaSubtitle, { color: colors.textSecondary }]}>{t('home.cta.subtitle')}</Text>
          
          <TouchableOpacity style={[styles.getStartedButton, { backgroundColor: colors.primary }]} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>{t('home.getStarted')}</Text>
          </TouchableOpacity>
        </View>

        {/* Auth Buttons */}
        <View style={styles.authSection}>
          <TouchableOpacity 
            style={[styles.authButton, styles.loginButton, { backgroundColor: colors.surface, borderColor: colors.primary }]} 
            onPress={handleLogin}
          >
            <Text style={[styles.loginButtonText, { color: colors.primary }]}>{t('home.login')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.authButton, styles.signupButton, { backgroundColor: colors.primary }]} 
            onPress={handleSignup}
          >
            <Text style={styles.signupButtonText}>{t('home.signup')}</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0d9488',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  featuresSection: {
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  featuresSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  featureGrid: {
    gap: 16,
  },
  featureItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  ctaSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  getStartedButton: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 300,
  },
  getStartedText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  authSection: {
    gap: 12,
  },
  authButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#0d9488',
  },
  signupButton: {
    backgroundColor: '#0d9488',
  },
  loginButtonText: {
    color: '#0d9488',
    fontSize: 16,
    fontWeight: '600',
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
