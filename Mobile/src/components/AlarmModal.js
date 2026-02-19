import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Button, IconButton, Surface } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import { useAlarm } from '../contexts/AlarmContext';

const AlarmModal = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const {
    currentAlarm,
    isAlarmModalVisible,
    isOnline,
    markDoseTaken,
    dismissAlarm,
    snoozeAlarm,
    repeatAnnouncement,
    setIsAlarmModalVisible,
  } = useAlarm();

  const [loading, setLoading] = useState(false);
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  if (!currentAlarm) return null;

  const medicines = currentAlarm.medicines || [];
  const scheduledTime = currentAlarm.scheduled_time || currentAlarm.time || '';

  const handleMarkTaken = async () => {
    setLoading(true);
    try {
      await markDoseTaken(currentAlarm);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    setLoading(true);
    try {
      await dismissAlarm(currentAlarm);
    } finally {
      setLoading(false);
    }
  };

  const handleSnooze = async (minutes) => {
    setLoading(true);
    setShowSnoozeOptions(false);
    try {
      await snoozeAlarm(currentAlarm, minutes);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      // Handle different time formats
      if (timeString.includes('T')) {
        const date = new Date(timeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  return (
    <Modal
      visible={isAlarmModalVisible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Surface style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
          {/* Header with pulse animation */}
          <View style={[styles.header, { backgroundColor: colors.error }]}>
            <View style={styles.iconContainer}>
              <Text style={styles.alarmIcon}>💊</Text>
            </View>
            <Text style={styles.headerTitle}>{t('alarms.medicineReminder') || 'Medicine Reminder'}</Text>
            <Text style={styles.headerTime}>{formatTime(scheduledTime)}</Text>
          </View>

          {/* Offline Indicator */}
          {!isOnline && (
            <View style={[styles.offlineBar, { backgroundColor: '#f59e0b' }]}>
              <Text style={styles.offlineText}>
                📴 {t('alarms.offlineMode') || 'Offline Mode - Actions will sync when online'}
              </Text>
            </View>
          )}

          {/* Medicine List */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('alarms.timeToTake') || "It's time to take:"}
            </Text>

            {medicines.map((medicine, index) => (
              <View 
                key={medicine.id || index} 
                style={[styles.medicineCard, { backgroundColor: isDark ? colors.border : '#f0fdf4' }]}
              >
                <View style={styles.medicineInfo}>
                  <Text style={[styles.medicineName, { color: colors.text }]}>
                    {medicine.name}
                  </Text>
                  {medicine.dosage && (
                    <Text style={[styles.medicineDosage, { color: colors.textSecondary }]}>
                      {medicine.dosage}
                    </Text>
                  )}
                  {medicine.dose_amount && (
                    <Text style={[styles.medicineAmount, { color: colors.primary }]}>
                      {t('alarms.doseAmount') || 'Amount'}: {medicine.dose_amount} {medicine.unit || 'unit(s)'}
                    </Text>
                  )}
                </View>
                <View style={styles.pillIcon}>
                  <Text style={styles.pillEmoji}>💊</Text>
                </View>
              </View>
            ))}

            {medicines.length === 0 && (
              <Text style={[styles.noMedicines, { color: colors.textSecondary }]}>
                {t('alarms.noMedicinesScheduled') || 'No medicines scheduled'}
              </Text>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Mark as Taken - Primary Action */}
            <Button
              mode="contained"
              onPress={handleMarkTaken}
              loading={loading}
              disabled={loading}
              style={[styles.primaryButton, { backgroundColor: '#10b981' }]}
              labelStyle={styles.primaryButtonLabel}
              icon="check-circle"
            >
              {t('alarms.markAsTaken') || 'Mark as Taken'}
            </Button>

            {/* Snooze Options */}
            {showSnoozeOptions ? (
              <View style={styles.snoozeOptions}>
                <Text style={[styles.snoozeTitle, { color: colors.text }]}>
                  {t('alarms.snoozeFor') || 'Snooze for:'}
                </Text>
                <View style={styles.snoozeButtons}>
                  {[5, 10, 15, 30].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={[styles.snoozeOption, { backgroundColor: colors.primary }]}
                      onPress={() => handleSnooze(mins)}
                      disabled={loading}
                    >
                      <Text style={styles.snoozeOptionText}>{mins} {t('common.min') || 'min'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button
                  mode="text"
                  onPress={() => setShowSnoozeOptions(false)}
                  style={styles.cancelSnooze}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </View>
            ) : (
              <View style={styles.secondaryActions}>
                <Button
                  mode="outlined"
                  onPress={() => setShowSnoozeOptions(true)}
                  disabled={loading}
                  style={[styles.secondaryButton, { borderColor: colors.primary }]}
                  icon="alarm-snooze"
                >
                  {t('alarms.snooze') || 'Snooze'}
                </Button>

                <Button
                  mode="outlined"
                  onPress={handleDismiss}
                  disabled={loading}
                  style={[styles.secondaryButton, { borderColor: '#ef4444' }]}
                  labelStyle={{ color: '#ef4444' }}
                  icon="close-circle"
                >
                  {t('alarms.dismiss') || 'Dismiss'}
                </Button>
              </View>
            )}

            {/* Repeat Announcement */}
            <TouchableOpacity
              style={styles.repeatButton}
              onPress={repeatAnnouncement}
              disabled={loading}
            >
              <Text style={[styles.repeatText, { color: colors.primary }]}>
                🔊 {t('alarms.repeatAnnouncement') || 'Repeat Announcement'}
              </Text>
            </TouchableOpacity>
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmIcon: {
    fontSize: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerTime: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  offlineBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  content: {
    maxHeight: 300,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
  },
  medicineDosage: {
    fontSize: 14,
    marginTop: 4,
  },
  medicineAmount: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  pillIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillEmoji: {
    fontSize: 24,
  },
  noMedicines: {
    textAlign: 'center',
    fontSize: 16,
    paddingVertical: 20,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  primaryButton: {
    marginBottom: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  primaryButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
  },
  snoozeOptions: {
    alignItems: 'center',
  },
  snoozeTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  snoozeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  snoozeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  snoozeOptionText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  cancelSnooze: {
    marginTop: 12,
  },
  repeatButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  repeatText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default AlarmModal;
