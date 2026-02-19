import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { medicineAPI, userAPI, analyticsAPI } from '../services/api';
import { medicinesStorage } from '../services/storage';

// Storage keys for sync
const SYNC_KEYS = {
  LAST_SYNC: '@sync/last_sync',
  MEDICINES: '@sync/medicines',
  PROFILE: '@sync/profile',
  ANALYTICS: '@sync/analytics',
  SYNC_QUEUE: '@sync/pending_queue',
};

const DataSyncContext = createContext(null);

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};

export const DataSyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [profile, setProfile] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  
  const appStateRef = useRef(AppState.currentState);
  const syncListenersRef = useRef([]);

  // ==================== STORAGE HELPERS ====================

  const saveToStorage = useCallback(async (key, data) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error saving to ${key}:`, error);
    }
  }, []);

  const loadFromStorage = useCallback(async (key, defaultValue = null) => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error loading from ${key}:`, error);
      return defaultValue;
    }
  }, []);

  // ==================== SYNC FUNCTIONS ====================

  /**
   * Sync medicines from backend
   */
  const syncMedicines = useCallback(async () => {
    try {
      const data = await medicineAPI.getAll();
      if (data && Array.isArray(data)) {
        setMedicines(data);
        await saveToStorage(SYNC_KEYS.MEDICINES, data);
        await medicinesStorage.setMedicines(data);
        return data;
      }
    } catch (error) {
      console.error('Error syncing medicines:', error);
      // Load from cache on error
      const cached = await loadFromStorage(SYNC_KEYS.MEDICINES, []);
      setMedicines(cached);
      throw error;
    }
    return null;
  }, [saveToStorage, loadFromStorage]);

  /**
   * Sync profile from backend
   */
  const syncProfile = useCallback(async () => {
    try {
      const data = await userAPI.getProfile();
      if (data) {
        setProfile(data);
        await saveToStorage(SYNC_KEYS.PROFILE, data);
        return data;
      }
    } catch (error) {
      console.error('Error syncing profile:', error);
      const cached = await loadFromStorage(SYNC_KEYS.PROFILE, null);
      setProfile(cached);
      throw error;
    }
    return null;
  }, [saveToStorage, loadFromStorage]);

  /**
   * Sync analytics from backend
   */
  const syncAnalytics = useCallback(async () => {
    try {
      const data = await analyticsAPI.getDashboard();
      if (data) {
        setAnalytics(data);
        await saveToStorage(SYNC_KEYS.ANALYTICS, data);
        return data;
      }
    } catch (error) {
      console.error('Error syncing analytics:', error);
      const cached = await loadFromStorage(SYNC_KEYS.ANALYTICS, null);
      setAnalytics(cached);
      throw error;
    }
    return null;
  }, [saveToStorage, loadFromStorage]);

  /**
   * Full sync - syncs all data from backend
   */
  const syncAll = useCallback(async (options = {}) => {
    const { silent = false } = options;
    
    if (!isOnline) {
      console.log('Offline - skipping sync');
      return { success: false, reason: 'offline' };
    }

    if (isSyncing) {
      console.log('Sync already in progress');
      return { success: false, reason: 'in_progress' };
    }

    setIsSyncing(true);
    setSyncError(null);

    const results = {
      medicines: null,
      profile: null,
      analytics: null,
      errors: [],
    };

    try {
      // Sync all data in parallel for faster sync
      const [medicinesResult, profileResult, analyticsResult] = await Promise.allSettled([
        syncMedicines(),
        syncProfile(),
        syncAnalytics(),
      ]);

      if (medicinesResult.status === 'fulfilled') {
        results.medicines = medicinesResult.value;
      } else {
        results.errors.push('medicines');
      }

      if (profileResult.status === 'fulfilled') {
        results.profile = profileResult.value;
      } else {
        results.errors.push('profile');
      }

      if (analyticsResult.status === 'fulfilled') {
        results.analytics = analyticsResult.value;
      } else {
        results.errors.push('analytics');
      }

      // Update last sync time
      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      await saveToStorage(SYNC_KEYS.LAST_SYNC, syncTime);

      // Notify listeners
      notifySyncListeners(results);

      return { success: true, results };
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError(error.message || 'Sync failed');
      return { success: false, error };
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncMedicines, syncProfile, syncAnalytics, saveToStorage]);

  /**
   * Sync only medicines (lighter sync)
   */
  const syncMedicinesOnly = useCallback(async () => {
    if (!isOnline || isSyncing) return null;
    
    setIsSyncing(true);
    try {
      const data = await syncMedicines();
      const syncTime = new Date().toISOString();
      setLastSyncTime(syncTime);
      await saveToStorage(SYNC_KEYS.LAST_SYNC, syncTime);
      notifySyncListeners({ medicines: data });
      return data;
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncMedicines, saveToStorage]);

  // ==================== SYNC LISTENERS ====================

  /**
   * Register a listener to be notified when sync completes
   */
  const addSyncListener = useCallback((listener) => {
    syncListenersRef.current.push(listener);
    return () => {
      syncListenersRef.current = syncListenersRef.current.filter(l => l !== listener);
    };
  }, []);

  /**
   * Notify all sync listeners
   */
  const notifySyncListeners = useCallback((data) => {
    syncListenersRef.current.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }, []);

  // ==================== LOAD CACHED DATA ====================

  const loadCachedData = useCallback(async () => {
    const [cachedMedicines, cachedProfile, cachedAnalytics, cachedLastSync] = await Promise.all([
      loadFromStorage(SYNC_KEYS.MEDICINES, []),
      loadFromStorage(SYNC_KEYS.PROFILE, null),
      loadFromStorage(SYNC_KEYS.ANALYTICS, null),
      loadFromStorage(SYNC_KEYS.LAST_SYNC, null),
    ]);

    setMedicines(cachedMedicines);
    setProfile(cachedProfile);
    setAnalytics(cachedAnalytics);
    setLastSyncTime(cachedLastSync);
  }, [loadFromStorage]);

  // ==================== NETWORK & APP STATE ====================

  const handleNetworkChange = useCallback(async (state) => {
    const wasOffline = !isOnline;
    const nowOnline = state.isConnected && state.isInternetReachable;
    
    setIsOnline(nowOnline);

    // Auto-sync when coming back online
    if (wasOffline && nowOnline) {
      console.log('Back online - auto-syncing');
      await syncAll({ silent: true });
    }
  }, [isOnline, syncAll]);

  const handleAppStateChange = useCallback(async (nextAppState) => {
    // Sync when app comes to foreground
    if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
      console.log('App foregrounded - checking for sync');
      
      // Check if enough time has passed since last sync (5 minutes)
      const lastSync = lastSyncTime ? new Date(lastSyncTime) : null;
      const now = new Date();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (!lastSync || (now - lastSync) > fiveMinutes) {
        console.log('Auto-syncing on foreground');
        await syncAll({ silent: true });
      }
    }
    appStateRef.current = nextAppState;
  }, [lastSyncTime, syncAll]);

  // ==================== INITIALIZATION ====================

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      // Load cached data first
      await loadCachedData();

      // Check network state
      const netState = await NetInfo.fetch();
      setIsOnline(netState.isConnected && netState.isInternetReachable);

      // Initial sync if online
      if (netState.isConnected && isMounted) {
        await syncAll({ silent: true });
      }
    };

    initialize();

    // Network listener
    const unsubscribeNetwork = NetInfo.addEventListener(handleNetworkChange);

    // App state listener
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      isMounted = false;
      unsubscribeNetwork();
      appStateSubscription.remove();
    };
  }, []);

  // ==================== CONTEXT VALUE ====================

  const value = {
    // State
    isOnline,
    isSyncing,
    lastSyncTime,
    syncError,
    medicines,
    profile,
    analytics,
    
    // Sync functions
    syncAll,
    syncMedicines: syncMedicinesOnly,
    syncProfile,
    syncAnalytics,
    
    // Listeners
    addSyncListener,
    
    // Helpers
    getLastSyncFormatted: () => {
      if (!lastSyncTime) return null;
      const date = new Date(lastSyncTime);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      
      return date.toLocaleDateString();
    },
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
};

export default DataSyncContext;
