import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl
} from 'react-native';
import { Card, Button, Avatar, Snackbar } from 'react-native-paper';
import { SkeletonDashboard } from '../components/SkeletonLoaders';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { medicineAPI, doseAPI, alarmAPI } from '../services/api';
import { medicinesStorage, doseLogsStorage } from '../services/storage';

export default function DashboardScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [upcomingDoses, setUpcomingDoses] = useState([]);
  const [adherenceRate, setAdherenceRate] = useState(0);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  // Load dashboard data from API
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch medicines
      const medicinesData = await fetchMedicines();
      
      // Fetch upcoming doses/alarms
      const dosesData = await fetchUpcomingDoses();
      
      // Calculate adherence from dose history
      const adherence = await calculateAdherence();
      
      setMedicines(medicinesData);
      setUpcomingDoses(dosesData);
      setAdherenceRate(adherence);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      // Try to load from cache on error
      const cached = await medicinesStorage.getMedicines();
      if (cached) {
        setMedicines(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch medicines from API
  const fetchMedicines = async () => {
    try {
      const data = await medicineAPI.getAll();
      // Cache the medicines
      await medicinesStorage.setMedicines(data);
      return data || [];
    } catch (error) {
      console.error('Error fetching medicines:', error);
      // Return cached data if API fails
      const cached = await medicinesStorage.getMedicines();
      return cached || [];
    }
  };

  // Fetch upcoming doses
  const fetchUpcomingDoses = async () => {
    try {
      // Get today's alarms/scheduled doses
      const alarms = await alarmAPI.getAll();
      
      // Filter and sort upcoming doses (next 24 hours)
      const now = new Date();
      const upcoming = alarms
        .filter(alarm => {
          const alarmTime = new Date(alarm.alarm_time);
          return alarmTime > now;
        })
        .sort((a, b) => new Date(a.alarm_time) - new Date(b.alarm_time))
        .slice(0, 5); // Get next 5 doses
      
      return upcoming;
    } catch (error) {
      console.error('Error fetching upcoming doses:', error);
      return [];
    }
  };

  // Calculate adherence rate from dose history
  const calculateAdherence = async () => {
    try {
      // Fetch dose history for last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
      
      const doseHistory = await doseAPI.getHistory(startDate, endDate);
      
      if (!doseHistory || doseHistory.length === 0) {
        return 0;
      }
      
      const takenDoses = doseHistory.filter(dose => dose.status === 'taken').length;
      const totalDoses = doseHistory.length;
      
      return Math.round((takenDoses / totalDoses) * 100);
    } catch (error) {
      console.error('Error calculating adherence:', error);
      return 0;
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Format time for display
  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return dateString;
    }
  };

  const handleMedicinePress = (medicine) => {
    navigation.navigate('Medicines', { selectedMedicine: medicine.id });
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine');
  };

  const handleViewAllMedicines = () => {
    navigation.navigate('Medicines');
  };

  const handleViewAnalytics = () => {
    navigation.navigate('Analytics');
  };

  if (loading) {
    return (
      <ScrollView style={styles.container}>
        <SkeletonDashboard />
      </ScrollView>
    );
  }

  const activeMedicines = medicines.filter(m => m.is_active !== false);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <Text style={styles.welcome}>
            {t('dashboard.welcomeBack').replace('%(patient)s', user?.first_name || user?.username || 'User')}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={handleViewAllMedicines}
            activeOpacity={0.7}
          >
            <Card style={styles.statCardInner}>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{activeMedicines.length}</Text>
                <Text style={styles.statLabel}>{t('dashboard.totalMedicines')}</Text>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard}
            activeOpacity={0.7}
          >
            <Card style={styles.statCardInner}>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{upcomingDoses.length}</Text>
                <Text style={styles.statLabel}>{t('dashboard.pending')}</Text>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statCard} 
            onPress={handleViewAnalytics}
            activeOpacity={0.7}
          >
            <Card style={styles.statCardInner}>
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{adherenceRate}%</Text>
                <Text style={styles.statLabel}>{t('dashboard.adherenceRate')}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        {/* Upcoming Doses */}
        {upcomingDoses.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('dashboard.upcomingReminders')}</Text>
            </View>
            {upcomingDoses.map((dose) => (
              <TouchableOpacity
                key={dose.id}
                style={styles.medicineItem}
                onPress={() => handleMedicinePress(dose.medicine)}
              >
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>
                    {dose.medicine_name || dose.medicine?.name}
                  </Text>
                  <Text style={styles.medicineDetails}>
                    {dose.dosage || dose.medicine?.dosage} • {formatTime(dose.alarm_time)}
                  </Text>
                </View>
                <Avatar.Icon size={24} icon="chevron-right" style={styles.iconBackground} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Active Medicines */}
        {activeMedicines.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('medicines.title')}</Text>
              <TouchableOpacity onPress={handleViewAllMedicines}>
                <Text style={styles.viewAllText}>{t('common.viewAll') || 'View All'}</Text>
              </TouchableOpacity>
            </View>
            {activeMedicines.slice(0, 3).map((medicine) => (
              <TouchableOpacity
                key={medicine.id}
                style={styles.medicineItem}
                onPress={() => handleMedicinePress(medicine)}
              >
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{medicine.name}</Text>
                  <Text style={styles.medicineDetails}>
                    {medicine.dosage} • {medicine.frequency || t('addMedicine.asNeeded')}
                  </Text>
                </View>
                <Avatar.Icon size={24} icon="chevron-right" style={styles.iconBackground} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Empty State */}
        {activeMedicines.length === 0 && (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <Avatar.Icon size={64} icon="pill" style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>
                {t('medicines.noMedicines') || 'No Medicines'}
              </Text>
              <Text style={styles.emptyText}>
                {t('medicines.addFirstMedicine') || 'Add your first medicine to get started'}
              </Text>
            </View>
          </Card>
        )}

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

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </ScrollView>
  );
}

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
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    marginBottom: 24,
    marginTop: 8,
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
  },
  statCardInner: {
    padding: 16,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0d9488',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  viewAllText: {
    fontSize: 14,
    color: '#0d9488',
    fontWeight: '500',
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
  iconBackground: {
    backgroundColor: 'transparent',
  },
  emptyCard: {
    marginBottom: 16,
    padding: 32,
  },
  emptyContent: {
    alignItems: 'center',
  },
  emptyIcon: {
    backgroundColor: '#e0e7ff',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  addButton: {
    marginVertical: 16,
    backgroundColor: '#0d9488',
  },
});

