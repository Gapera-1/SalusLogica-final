import { useState, useEffect, useCallback } from 'react';
import { notificationAPI } from '../services/api';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get notification center data
  const getNotificationCenter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.getCenter();
      setNotifications(data.notifications || []);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get notification center:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get notification settings
  const getNotificationSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get notification settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update notification settings
  const updateNotificationSettings = useCallback(async (newSettings) => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.updateSettings(newSettings);
      setSettings(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update notification settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for pending notifications
  const checkPendingNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.checkPending();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to check pending notifications:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for missed dose notifications
  const checkMissedDoseNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationAPI.checkMissedDoses();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to check missed dose notifications:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Update local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        )
      );
      
      // Call API to mark as read
      await notificationAPI.markAsRead(notificationId);
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark notification as read:', err);
      throw err;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      // Update local state
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Call API to delete
      await notificationAPI.delete(notificationId);
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete notification:', err);
      throw err;
    }
  }, []);

  // Get unread count
  const getUnreadCount = useCallback(() => {
    return notifications.filter(notif => !notif.read).length;
  }, [notifications]);

  // Auto-fetch notification center on mount
  useEffect(() => {
    getNotificationCenter();
    getNotificationSettings();
  }, [getNotificationCenter, getNotificationSettings]);

  return {
    notifications,
    settings,
    loading,
    error,
    getNotificationCenter,
    getNotificationSettings,
    updateNotificationSettings,
    checkPendingNotifications,
    checkMissedDoseNotifications,
    markAsRead,
    deleteNotification,
    getUnreadCount,
  };
};
