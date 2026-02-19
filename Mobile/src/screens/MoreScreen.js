import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../i18n/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';

const MoreScreen = () => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const menuItems = [
    {
      id: 'interactionChecker',
      title: t('navigation.interactionChecker') || 'Interaction Checker',
      subtitle: t('interactionChecker.subtitle') || 'Check drug interactions',
      icon: 'flask',
      screen: 'InteractionChecker',
      color: '#dc2626',
      bgColor: '#fef2f2',
    },
    {
      id: 'foodAdvice',
      title: t('navigation.foodAdvice') || 'Food Advice',
      subtitle: t('foodAdvice.subtitle') || 'Food & medicine guidance',
      icon: 'restaurant',
      screen: 'FoodAdvice',
      color: '#16a34a',
      bgColor: '#f0fdf4',
    },
    {
      id: 'safetyCheck',
      title: t('navigation.safetyCheck') || 'Safety Check',
      subtitle: t('safetyCheck.subtitle') || 'Check medicine safety',
      icon: 'shield-checkmark',
      screen: 'SafetyCheck',
      color: '#0d9488',
      bgColor: '#f0fdfa',
    },
    {
      id: 'contraIndications',
      title: t('navigation.contraIndications') || 'Contraindications',
      subtitle: t('contraIndications.subtitle') || 'View contraindications',
      icon: 'warning',
      screen: 'ContraIndications',
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    {
      id: 'doseHistory',
      title: t('navigation.doseHistory') || 'Dose History',
      subtitle: t('doseHistory.subtitle') || 'View dose records',
      icon: 'time',
      screen: 'DoseHistory',
      color: '#3b82f6',
      bgColor: '#eff6ff',
    },
    {
      id: 'sideEffects',
      title: t('navigation.sideEffects') || 'Side Effects',
      subtitle: t('sideEffects.subtitle') || 'Track side effects',
      icon: 'bandage',
      screen: 'SideEffects',
      color: '#f97316',
      bgColor: '#fff7ed',
    },
    {
      id: 'exportReports',
      title: t('navigation.exportReports') || 'Export Reports',
      subtitle: t('exportReports.subtitle') || 'Download PDF reports',
      icon: 'document-text',
      screen: 'ExportReports',
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
    },
    {
      id: 'notifications',
      title: t('navigation.notifications') || 'Notifications',
      subtitle: t('notifications.subtitle') || 'Manage notifications',
      icon: 'notifications',
      screen: 'Notifications',
      color: '#06b6d4',
      bgColor: '#ecfeff',
    },
  ];

  const handlePress = (screen) => {
    navigation.navigate(screen);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('more.title') || 'More'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('more.subtitle') || 'Access all features'}
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handlePress(item.screen)}
              activeOpacity={0.7}
            >
              <Card style={[styles.menuCard, { backgroundColor: colors.surface }]}>
                <View style={styles.menuContent}>
                  <View style={[styles.iconContainer, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Card>
            </TouchableOpacity>
          ))}
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
  header: {
    marginBottom: 24,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  menuGrid: {
    gap: 12,
  },
  menuItem: {
    width: '100%',
  },
  menuCard: {
    borderRadius: 12,
  },
  menuContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
});

export default MoreScreen;
