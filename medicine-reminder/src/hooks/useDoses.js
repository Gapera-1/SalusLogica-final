import { useState, useEffect, useCallback } from 'react';
import { doseAPI } from '../services/api';

export const useDoses = () => {
  const [doses, setDoses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get dose history
  const getDoseHistory = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await doseAPI.getHistory(filters);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get dose history:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark dose as taken
  const markDoseTaken = useCallback(async (doseId) => {
    setLoading(true);
    setError(null);
    try {
      await doseAPI.markTaken(doseId);
      // Update local state if doses are loaded
      setDoses(prev => 
        prev.map(dose => 
          dose.id === doseId 
            ? { ...dose, status: 'TAKEN', taken_at: new Date().toISOString() }
            : dose
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark dose as taken:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark dose as missed
  const markDoseMissed = useCallback(async (doseId) => {
    setLoading(true);
    setError(null);
    try {
      await doseAPI.markMissed(doseId);
      setDoses(prev => 
        prev.map(dose => 
          dose.id === doseId 
            ? { ...dose, status: 'MISSED', dismissed_at: new Date().toISOString() }
            : dose
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to mark dose as missed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Snooze dose
  const snoozeDose = useCallback(async (doseId, minutes = 30) => {
    setLoading(true);
    setError(null);
    try {
      await doseAPI.snooze(doseId, minutes);
      const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      setDoses(prev => 
        prev.map(dose => 
          dose.id === doseId 
            ? { ...dose, status: 'SNOOZED', snoozed_until: snoozeUntil, snooze_count: (dose.snooze_count || 0) + 1 }
            : dose
        )
      );
    } catch (err) {
      setError(err.message);
      console.error('Failed to snooze dose:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get pending doses
  const getPendingDoses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doseAPI.getPending();
      setDoses(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get pending doses:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for missed doses
  const checkMissedDoses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doseAPI.checkMissed();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to check missed doses:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Send immediate reminder
  const sendReminder = useCallback(async (doseId) => {
    setLoading(true);
    setError(null);
    try {
      await doseAPI.sendReminder(doseId);
    } catch (err) {
      setError(err.message);
      console.error('Failed to send reminder:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    doses,
    loading,
    error,
    getDoseHistory,
    markDoseTaken,
    markDoseMissed,
    snoozeDose,
    getPendingDoses,
    checkMissedDoses,
    sendReminder,
  };
};
