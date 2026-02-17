import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native';
import { Card, Button, Avatar, Searchbar, Snackbar, IconButton } from 'react-native-paper';
import { SkeletonMedicineList } from '../components/SkeletonLoaders';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { medicineAPI } from '../services/api';
import { medicinesStorage } from '../services/storage';
import analytics from '../services/analytics';

export default function MedicinesScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  
  const searchTimeoutRef = useRef(null);

  // Reload when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadMedicines();
    }, [])
  );

  // Handle search with debouncing and API call
  useEffect(() => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If no search query, show all medicines
    if (!searchQuery.trim()) {
      setFilteredMedicines(medicines);
      return;
    }

    // If search query is too short, do local filtering
    if (searchQuery.trim().length < 2) {
      const filtered = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMedicines(filtered);
      return;
    }

    // Debounce API search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const response = await medicineAPI.search(searchQuery, false);
        const results = response.data?.results || [];
        
        setFilteredMedicines(results);
        
        // Track search analytics
        analytics.trackSearch(searchQuery, results.length, false);
        
        if (results.length === 0) {
          analytics.trackEmptySearchResults(searchQuery);
        }
      } catch (error) {
        console.error('Search error:', error);
        // Fallback to local filtering on search error
        const filtered = medicines.filter(medicine =>
          medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          medicine.scientific_name?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredMedicines(filtered);
      } finally {
        setSearching(false);
      }
    }, 300); // 300ms debounce

    // Cleanup on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, medicines]);

  // Load medicines from API
  const loadMedicines = async () => {
    try {
      setLoading(true);
      const data = await medicineAPI.getAll();
      
      // Cache the medicines
      await medicinesStorage.setMedicines(data);
      
      setMedicines(data || []);
      setFilteredMedicines(data || []);
    } catch (error) {
      console.error('Error loading medicines:', error);
      
      // Try to load from cache on error
      const cached = await medicinesStorage.getMedicines();
      if (cached && cached.length > 0) {
        setMedicines(cached);
        setFilteredMedicines(cached);
        showSnackbar(t('common.loadedFromCache'));
      } else {
        showSnackbar(t('medicines.loadError'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicines();
    setRefreshing(false);
  };

  // Show snackbar message
  const showSnackbar = (message) => {
    setSnackbar({ visible: true, message });
  };

  // Delete medicine
  const handleDeleteMedicine = async (medicine) => {
    Alert.alert(
      t('common.confirm'),
      t('medicines.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await medicineAPI.delete(medicine.id);
              showSnackbar(t('medicines.deleteSuccess'));
              loadMedicines();
            } catch (error) {
              console.error('Error deleting medicine:', error);
              showSnackbar(t('medicines.deleteError'));
            }
          },
        },
      ]
    );
  };

  const handleMedicinePress = (medicine, index) => {
    // Track analytics
    const source = searchQuery.trim() ? 'search' : 'list';
    analytics.trackMedicineView(medicine, source);
    
    if (searchQuery.trim() && source === 'search') {
      analytics.trackSearchResultClick(searchQuery, medicine, index);
    }
    
    // Navigate to medicine details or show details modal
    Alert.alert(
      medicine.name,
      `${t('medicines.dosage')}: ${medicine.dosage}\n${t('medicines.frequency')}: ${medicine.frequency || 'As needed'}\n${t('medicines.stock')}: ${medicine.stock || 'N/A'}`,
      [
        { text: t('common.cancel') },
        { text: t('common.edit'), onPress: () => handleEditMedicine(medicine) },
        { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteMedicine(medicine) },
      ]
    );
  };

  const handleEditMedicine = (medicine) => {
    navigation.navigate('AddMedicine', { medicine });
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine');
  };

  const getStockColor = (stock) => {
    if (stock <= 10) return '#ef4444'; // Red
    if (stock <= 20) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  if (loading && medicines.length === 0) {
    return (
      <ScrollView style={styles.container}>
        <SkeletonMedicineList />
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('medicines.title')}</Text>
        <Text style={styles.subtitle}>{t('medicines.subtitle')}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('medicines.searchMedicines')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color="#0d9488" />
            <Text style={styles.searchingText}>{t('medicines.searching')}</Text>
          </View>
        )}
      </View>

      {/* Medicines List */}
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredMedicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? t('medicines.noMedicines') : t('medicines.noMedicines')}
            </Text>
          </View>
        ) : (
          filteredMedicines.map((medicine, index) => (
            <Card key={medicine.id} style={styles.medicineCard}>
              <TouchableOpacity onPress={() => handleMedicinePress(medicine, index)}>
                <View style={styles.medicineContent}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    {medicine.scientific_name && (
                      <Text style={styles.medicineScientific}>{medicine.scientific_name}</Text>
                    )}
                    <Text style={styles.medicineDetails}>
                      {medicine.dosage} • {medicine.frequency || t('addMedicine.asNeeded')}
                    </Text>
                    {medicine.prescribed_for && (
                      <Text style={styles.medicineProvider}>
                        {t('medicines.prescribedFor')}: {medicine.prescribed_for}
                      </Text>
                    )}
                  </View>
                  <View style={styles.medicineActions}>
                    {medicine.stock != null && (
                      <View style={styles.stockContainer}>
                        <Text style={styles.stockLabel}>{t('medicines.stock')}: </Text>
                        <Text style={[styles.stockValue, { color: getStockColor(medicine.stock) }]}>
                          {medicine.stock}
                        </Text>
                      </View>
                    )}
                    <IconButton
                      icon="delete"
                      size={20}
                      iconColor="#ef4444"
                      onPress={() => handleDeleteMedicine(medicine)}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Add Medicine Button */}
      <View style={styles.addButtonContainer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 4,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  medicineCard: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  medicineContent: {
    flexDirection: 'row',
    padding: 16,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  medicineScientific: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  medicineDetails: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  medicineProvider: {
    fontSize: 12,
    color: '#6b7280',
  },
  medicineActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  addButton: {
    margin: 0,
    backgroundColor: '#0d9488',
  },
});
