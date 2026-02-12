import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Avatar, ProgressBar } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const DashboardScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalMedicines: 0,
    activeAlarms: 0,
    adherenceRate: 0,
    nextMedicines: [],
    recentActivity: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setDashboardData({
        totalMedicines: 5,
        activeAlarms: 3,
        adherenceRate: 85,
        nextMedicines: [
          { id: 1, name: 'Aspirin', time: '08:00 AM', dosage: '100mg' },
          { id: 2, name: 'Vitamin D', time: '02:00 PM', dosage: '1000 IU' },
        ],
        recentActivity: [
          { id: 1, action: 'Medicine taken', medicine: 'Aspirin', time: '2 hours ago' },
          { id: 2, action: 'Medicine missed', medicine: 'Vitamin C', time: '5 hours ago' },
        ],
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMedicinePress = (medicine) => {
    Alert.alert(
      t('medicines.title'),
      `${medicine.name} - ${medicine.dosage}\n${t('medicines.nextDose')}: ${medicine.time}`
    );
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('dashboard.loadingDashboard')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <Text style={styles.welcome}>
            {t('dashboard.welcomeBack', { patient: 'John' })}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{dashboardData.totalMedicines}</Text>
              <Text style={styles.statLabel}>{t('dashboard.totalMedicines')}</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{dashboardData.activeAlarms}</Text>
              <Text style={styles.statLabel}>{t('dashboard.activeAlarms')}</Text>
            </View>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{dashboardData.adherenceRate}%</Text>
              <Text style={styles.statLabel}>{t('dashboard.adherenceRate')}</Text>
            </View>
          </Card>
        </View>

        {/* Next Medicines */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.nextMedicines')}</Text>
          </View>
          {dashboardData.nextMedicines.map((medicine) => (
            <TouchableOpacity
              key={medicine.id}
              style={styles.medicineItem}
              onPress={() => handleMedicinePress(medicine)}
            >
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{medicine.name}</Text>
                <Text style={styles.medicineDetails}>
                  {medicine.dosage} • {medicine.time}
                </Text>
              </View>
              <Avatar.Icon size={24} icon="chevron-right" />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Recent Activity */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
          </View>
          {dashboardData.recentActivity.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityAction}>{activity.action}</Text>
                <Text style={styles.activityDetails}>
                  {activity.medicine} • {activity.time}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* Add Medicine Button */}
        <Button
          mode="contained"
          onPress={handleAddMedicine}
          style={styles.addButton}
          icon="plus"
        >
          {t('medicines.addMedicine')}
        </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  welcome: {
    fontSize: 16,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  medicineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  medicineDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  activityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  activityInfo: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 4,
  },
  activityDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    marginVertical: 16,
  },
});

export default DashboardScreen;
