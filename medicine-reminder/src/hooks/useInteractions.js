import { useState, useEffect, useCallback } from 'react';
import { interactionAPI } from '../services/api';

export const useInteractions = () => {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check drug interactions
  const checkInteractions = useCallback(async (medicineIds) => {
    setLoading(true);
    setError(null);
    try {
      const data = await interactionAPI.check(medicineIds);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to check interactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get interaction history
  const getInteractionHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interactionAPI.getHistory();
      setInteractions(data);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get interaction history:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get interaction details
  const getInteractionDetails = useCallback(async (checkId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await interactionAPI.getDetails(checkId);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get interaction details:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add allergy
  const addAllergy = useCallback(async (allergyData) => {
    setLoading(true);
    setError(null);
    try {
      const data = await interactionAPI.addAllergy(allergyData);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to add allergy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete allergy
  const deleteAllergy = useCallback(async (allergyId) => {
    setLoading(true);
    setError(null);
    try {
      await interactionAPI.deleteAllergy(allergyId);
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete allergy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize drug database
  const initializeDatabase = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await interactionAPI.initializeDatabase();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to initialize drug database:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch interaction history on mount
  useEffect(() => {
    getInteractionHistory();
  }, [getInteractionHistory]);

  return {
    interactions,
    loading,
    error,
    checkInteractions,
    getInteractionHistory,
    getInteractionDetails,
    addAllergy,
    deleteAllergy,
    initializeDatabase,
  };
};
