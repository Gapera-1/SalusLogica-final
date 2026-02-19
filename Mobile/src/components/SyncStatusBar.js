import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDataSync } from '../contexts/DataSyncContext';

/**
 * Compact sync status bar showing connection and last sync time
 */
const SyncStatusBar = ({ onPress }) => {
  const { isOnline, isSyncing, getLastSyncFormatted, syncAll } = useDataSync();
  
  const lastSync = getLastSyncFormatted();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (!isSyncing && isOnline) {
      syncAll();
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View style={[styles.container, !isOnline && styles.offlineContainer]}>
        {/* Connection status */}
        <View style={styles.statusSection}>
          <Icon 
            name={isOnline ? 'wifi' : 'wifi-off'} 
            size={14} 
            color={isOnline ? '#4CAF50' : '#f44336'} 
          />
          <Text style={[styles.statusText, !isOnline && styles.offlineText]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Sync status */}
        <View style={styles.statusSection}>
          {isSyncing ? (
            <>
              <ActivityIndicator size={12} color="#2196F3" />
              <Text style={styles.syncText}>Syncing...</Text>
            </>
          ) : (
            <>
              <Icon name="sync" size={14} color="#666" />
              <Text style={styles.syncText}>
                {lastSync || 'Not synced'}
              </Text>
            </>
          )}
        </View>

        {/* Sync button hint */}
        {isOnline && !isSyncing && (
          <Icon name="chevron-right" size={14} color="#999" style={styles.chevron} />
        )}
      </View>
    </TouchableOpacity>
  );
};

/**
 * Floating sync button for quick refresh
 */
export const SyncButton = ({ style }) => {
  const { isOnline, isSyncing, syncAll } = useDataSync();

  return (
    <TouchableOpacity
      style={[styles.floatingButton, style, !isOnline && styles.disabledButton]}
      onPress={() => isOnline && !isSyncing && syncAll()}
      disabled={!isOnline || isSyncing}
      activeOpacity={0.7}
    >
      {isSyncing ? (
        <ActivityIndicator size={20} color="#fff" />
      ) : (
        <Icon name="sync" size={20} color="#fff" />
      )}
    </TouchableOpacity>
  );
};

/**
 * Offline banner to show at top of screens
 */
export const OfflineBanner = () => {
  const { isOnline } = useDataSync();

  if (isOnline) return null;

  return (
    <View style={styles.offlineBanner}>
      <Icon name="wifi-off" size={16} color="#fff" />
      <Text style={styles.offlineBannerText}>
        You're offline. Data shown may not be up to date.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  offlineContainer: {
    backgroundColor: '#ffebee',
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
    fontWeight: '500',
  },
  offlineText: {
    color: '#f44336',
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
  },
  syncText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  chevron: {
    marginLeft: 4,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#bdbdbd',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff9800',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  offlineBannerText: {
    fontSize: 12,
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
});

export default SyncStatusBar;
