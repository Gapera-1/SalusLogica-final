import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  TouchableOpacity, 
  RefreshControl,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Card, Button, Avatar, Searchbar, Snackbar, IconButton, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SkeletonMedicineList } from '../components/SkeletonLoaders';
import SyncStatusBar, { OfflineBanner } from '../components/SyncStatusBar';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useDataSync } from '../contexts/DataSyncContext';
import { useAlarm } from '../contexts/AlarmContext';
import { medicineAPI } from '../services/api';
import { medicinesStorage } from '../services/storage';
import analytics from '../services/analytics';
import { getErrorMessage, logError } from '../utils/errorHandler';

export default function MedicinesScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { colors } = useTheme();
  const { 
    medicines: syncedMedicines, 
    syncMedicines, 
    isSyncing, 
    isOnline,
    addSyncListener 
  } = useDataSync();
  const { updateMedicinesFromSync } = useAlarm();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  
  const searchTimeoutRef = useRef(null);

  // Update medicines when synced data changes
  useEffect(() => {
    if (syncedMedicines && syncedMedicines.length > 0) {
      setMedicines(syncedMedicines);
      if (!searchQuery.trim()) {
        setFilteredMedicines(syncedMedicines);
      }
      setLoading(false);
    }
  }, [syncedMedicines]);

  // Listen for sync events and update alarm schedules
  useEffect(() => {
    const unsubscribe = addSyncListener(async (data) => {
      if (data.medicines) {
        setMedicines(data.medicines);
        if (!searchQuery.trim()) {
          setFilteredMedicines(data.medicines);
        }
        // Update alarm schedules with new medicines
        await updateMedicinesFromSync(data.medicines);
        showSnackbar(t('sync.syncComplete') || 'Data synced from server');
      }
    });
    return unsubscribe;
  }, [addSyncListener, updateMedicinesFromSync, searchQuery, t]);

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
        const results = response.results || response.data?.results || [];
        
        setFilteredMedicines(results);
        
        // Track search analytics
        analytics.trackSearch(searchQuery, results.length, false);
        
        if (results.length === 0) {
          analytics.trackEmptySearchResults(searchQuery);
        }
      } catch (error) {
        logError('MedicinesScreen.search', error);
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
      logError('MedicinesScreen.loadMedicines', error);
      const errorMessage = getErrorMessage(error, t);
      
      // Try to load from cache on error
      const cached = await medicinesStorage.getMedicines();
      if (cached && cached.length > 0) {
        setMedicines(cached);
        setFilteredMedicines(cached);
        showSnackbar(t('common.loadedFromCache') || 'Loaded from cache');
      } else {
        showSnackbar(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pull to refresh handler - uses sync context
  const onRefresh = async () => {
    setRefreshing(true);
    if (isOnline) {
      await syncMedicines();
    } else {
      await loadMedicines();
    }
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
              logError('MedicinesScreen.deleteMedicine', error);
              const errorMessage = getErrorMessage(error, t);
              showSnackbar(errorMessage);
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
    const details = [
      `${t('medicines.dosage')}: ${medicine.dosage}`,
      `${t('medicines.frequency')}: ${medicine.frequency || 'As needed'}`,
      `${t('medicines.stock')}: ${medicine.stock_count ?? medicine.stock ?? 'N/A'}`,
    ];
    if (medicine.prescribed_for) details.push(`${t('medicines.prescribedFor')}: ${medicine.prescribed_for}`);
    if (medicine.prescribing_doctor) details.push(`${t('medicines.doctor')}: ${medicine.prescribing_doctor}`);
    if (medicine.start_date) details.push(`${t('addMedicine.startDate')}: ${medicine.start_date}`);
    if (medicine.end_date) details.push(`${t('addMedicine.endDate')}: ${medicine.end_date}`);
    if (medicine.instructions) details.push(`${t('addMedicine.instructions')}: ${medicine.instructions}`);
    if (medicine.food_to_avoid?.length) details.push(`${t('addMedicine.foodToAvoid') || 'Foods to avoid'}: ${medicine.food_to_avoid.join(', ')}`);

    Alert.alert(
      medicine.name,
      details.join('\n'),
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
    if (stock <= 10) return colors.error;
    if (stock <= 20) return colors.warning;
    return colors.success;
  };

  if (loading && medicines.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SkeletonMedicineList />
      </View>
    );
  }

  const renderMedicineItem = ({ item: medicine, index }) => {
    const stockVal = medicine.stock_count ?? medicine.stock;
    const hasFood = medicine.food_to_avoid?.length > 0 || medicine.food_advised?.length > 0;

    return (
      <Card style={[styles.medicineCard, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => handleMedicinePress(medicine, index)} activeOpacity={0.7}>
          <View style={styles.medicineContent}>
            {/* Left accent bar */}
            <View style={[styles.accentBar, { backgroundColor: medicine.is_active !== false ? colors.primary : colors.textMuted }]} />

            <View style={styles.medicineBody}>
              {/* Top row: Name + Stock badge */}
              <View style={styles.medicineTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.medicineName, { color: colors.text }]} numberOfLines={1}>
                    {medicine.name}
                  </Text>
                  {medicine.scientific_name ? (
                    <Text style={[styles.medicineScientific, { color: colors.textMuted }]} numberOfLines={1}>
                      {medicine.scientific_name}
                    </Text>
                  ) : null}
                </View>
                {stockVal != null && (
                  <View style={[styles.stockBadge, { backgroundColor: getStockColor(stockVal) + '18' }]}>
                    <MaterialCommunityIcons name="package-variant" size={13} color={getStockColor(stockVal)} />
                    <Text style={[styles.stockBadgeText, { color: getStockColor(stockVal) }]}>{stockVal}</Text>
                  </View>
                )}
              </View>

              {/* Info chips row */}
              <View style={styles.chipRow}>
                <View style={[styles.infoChip, { backgroundColor: colors.primaryLight + '15' }]}>
                  <MaterialCommunityIcons name="eyedropper" size={13} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.primary }]}>{medicine.dosage}</Text>
                </View>
                <View style={[styles.infoChip, { backgroundColor: colors.primaryLight + '15' }]}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color={colors.primary} />
                  <Text style={[styles.chipText, { color: colors.primary }]}>
                    {medicine.frequency?.replace(/_/g, ' ') || t('addMedicine.asNeeded')}
                  </Text>
                </View>
                {medicine.reminder_enabled !== false && (
                  <View style={[styles.infoChip, { backgroundColor: colors.successLight || '#d1fae520' }]}>
                    <MaterialCommunityIcons name="bell-ring-outline" size={13} color={colors.success} />
                  </View>
                )}
                {hasFood && (
                  <View style={[styles.infoChip, { backgroundColor: colors.warningLight || '#fef3c720' }]}>
                    <MaterialCommunityIcons name="food-apple-outline" size={13} color={colors.warning} />
                  </View>
                )}
              </View>

              {/* Bottom row: Provider + dates + actions */}
              <View style={styles.medicineBottomRow}>
                <View style={{ flex: 1 }}>
                  {medicine.prescribed_for ? (
                    <Text style={[styles.medicineSubInfo, { color: colors.textSecondary }]} numberOfLines={1}>
                      <MaterialCommunityIcons name="medical-bag" size={12} color={colors.textMuted} />{' '}
                      {medicine.prescribed_for}
                    </Text>
                  ) : null}
                  {medicine.start_date ? (
                    <Text style={[styles.medicineDateRange, { color: colors.textMuted }]}>
                      {medicine.start_date}{medicine.end_date ? ` → ${medicine.end_date}` : ''}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actionRow}>
                  <TouchableOpacity onPress={() => handleEditMedicine(medicine)} style={[styles.iconBtn, { backgroundColor: colors.primaryLight + '15' }]}>
                    <MaterialCommunityIcons name="pencil-outline" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteMedicine(medicine)} style={[styles.iconBtn, { backgroundColor: colors.error + '12' }]}>
                    <MaterialCommunityIcons name="delete-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.title}>{t('medicines.title')}</Text>
          <Text style={styles.subtitle}>{t('medicines.subtitle')}</Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{filteredMedicines.length}</Text>
        </View>
      </View>

      {/* Sync Status Bar */}
      <SyncStatusBar />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t('medicines.searchMedicines')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchBar, { backgroundColor: colors.surface }]}
          iconColor={colors.textSecondary}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.textSecondary}
        />
        {searching && (
          <View style={styles.searchingIndicator}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.searchingText, { color: colors.textSecondary }]}>{t('medicines.searching')}</Text>
          </View>
        )}
      </View>

      {/* Medicines List */}
      <FlatList
        style={styles.scrollView}
        data={filteredMedicines}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMedicineItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {t('medicines.noMedicines')}
            </Text>
          </View>
        }
        initialNumToRender={10}
        windowSize={7}
        removeClippedSubviews
      />

      {/* Add Medicine Button */}
      <View style={[styles.addButtonContainer, { backgroundColor: colors.background }]}>
        <Button
          mode="contained"
          onPress={handleAddMedicine}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          icon="plus"
          labelStyle={{ fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}
          contentStyle={{ height: 48 }}
        >
          {t('medicines.addMedicine')}
        </Button>
      </View>

      {/* Snackbar for messages */}
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        style={{ backgroundColor: colors.surface }}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    minWidth: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  searchContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  searchBar: {
    marginBottom: 4,
    elevation: 0,
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
    textAlign: 'center',
  },
  medicineCard: {
    marginHorizontal: 16,
    marginVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  medicineContent: {
    flexDirection: 'row',
  },
  accentBar: {
    width: 5,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  medicineBody: {
    flex: 1,
    padding: 14,
  },
  medicineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  medicineName: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  medicineScientific: {
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13,148,136,0.08)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stockBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  medicineBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  medicineSubInfo: {
    flex: 1,
  },
  medicineDateRange: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
  },
  iconBtn: {
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonContainer: {
    padding: 16,
  },
  addButton: {
    margin: 0,
    borderRadius: 14,
    paddingVertical: 4,
  },
});
