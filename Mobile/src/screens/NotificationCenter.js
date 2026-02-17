import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Card, Button, Avatar, Checkbox } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI } from '../services/api';

const NotificationCenter = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationAPI.getNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleNotificationPress = (notification) => {
    Alert.alert(
      t('notifications.title'),
      `${notification.title}\n\n${notification.message}\n\n${notification.time}`
    );
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      Alert.alert(t('common.error'), t('common.failed'));
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'reminder': return '⏰';
      case 'refill': return '💊';
      case 'appointment': return '📅';
      case 'safety': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getNotificationColor = (type, read) => {
    if (read) return '#e5e7eb';
    
    switch (type) {
      case 'reminder': return '#0d9488';
      case 'refill': return '#f59e0b';
      case 'appointment': return '#10b981';
      case 'safety': return '#ef4444';
      case 'success': return '#10b981';
      case 'info': return '#6b7280';
      default: return '#9ca3af';
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    if (filter === 'reminder') return notification.type === 'reminder';
    if (filter === 'refill') return notification.type === 'refill';
    if (filter === 'appointment') return notification.type === 'appointment';
    if (filter === 'safety') return notification.type === 'safety';
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('navigation.notifications')}</Text>
          <Text style={styles.subtitle}>
            {filteredNotifications.length} {t('notifications.notifications')}
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {['all', 'unread', 'reminder', 'refill', 'appointment', 'safety'].map((filterOption) => (
            <TouchableOpacity
              key={filterOption}
              style={[
                styles.filterTab,
                filter === filterOption && styles.activeFilter
              ]}
              onPress={() => handleFilterChange(filterOption)}
            >
              <Text style={styles.filterText}>
                {filterOption === 'all' && t('notifications.all')}
                {filterOption === 'unread' && t('notifications.unread')}
                {filterOption === 'reminder' && t('notifications.reminders')}
                {filterOption === 'refill' && t('notifications.refills')}
                {filterOption === 'appointment' && t('notifications.appointments')}
                {filterOption === 'safety' && t('notifications.safety')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('notifications.noNotifications')}</Text>
          </View>
        ) : (
          filteredNotifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationItem,
                { backgroundColor: getNotificationColor(notification.type, notification.read) }
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.iconContainer}>
                    <Text style={styles.notificationIcon}>
                      {getNotificationIcon(notification.type)}
                    </Text>
                  </View>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationTime}>{notification.time}</Text>
                  </View>
                  {!notification.read && (
                    <View style={styles.unreadIndicator} />
                  )}
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
              </View>
              
              {notification.type === 'reminder' && (
                <View style={styles.notificationActions}>
                  <Button
                    mode="outlined"
                    onPress={() => handleMarkAsRead(notification.id)}
                    style={styles.actionButton}
                    compact
                  >
                    {t('notifications.markAsTaken')}
                  </Button>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}

        {/* Action Buttons */}
        {notifications.some(n => !n.read) && (
          <View style={styles.actionContainer}>
            <Button
              mode="outlined"
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
            >
              {t('notifications.markAllAsRead')}
            </Button>
          </View>
        )}
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFilter: {
    backgroundColor: '#0d9488',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 14,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6b7280',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  markAllButton: {
    flex: 1,
  },
});

export default NotificationCenter;
