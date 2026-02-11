import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI } from '../services/api';

export const useAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get dashboard data
  const getDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dashboardData = await analyticsAPI.getDashboard();
      setData(dashboardData);
      return dashboardData;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get dashboard data:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get patient adherence report
  const getPatientAdherence = useCallback(async (patientId, period = '30days') => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsAPI.getPatientAdherence(patientId, period);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get patient adherence:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get pharmacy performance report
  const getPharmacyPerformance = useCallback(async (period = '30days') => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsAPI.getPharmacyPerformance(period);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get pharmacy performance:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get medicine usage report
  const getMedicineUsage = useCallback(async (period = '30days') => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsAPI.getMedicineUsage(period);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get medicine usage:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get adherence trends
  const getAdherenceTrends = useCallback(async (period = '90days') => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsAPI.getAdherenceTrends(period);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get adherence trends:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get export center data
  const getExportCenter = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsAPI.getExportCenter();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get export center:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Download export file
  const downloadExport = useCallback(async (exportId) => {
    try {
      await analyticsAPI.downloadExport(exportId);
    } catch (err) {
      setError(err.message);
      console.error('Failed to download export:', err);
      throw err;
    }
  }, []);

  return {
    data,
    loading,
    error,
    getDashboard,
    getPatientAdherence,
    getPharmacyPerformance,
    getMedicineUsage,
    getAdherenceTrends,
    getExportCenter,
    downloadExport,
  };
};
