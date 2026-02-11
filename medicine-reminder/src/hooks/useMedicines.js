import { useState, useEffect, useCallback } from 'react';
import { medicineAPI } from '../services/api';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch medicines from API
  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineAPI.getAll();
      setMedicines(data);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch medicines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new medicine
  const addMedicine = useCallback(async (medicineData) => {
    setLoading(true);
    setError(null);
    try {
      const newMedicine = await medicineAPI.create(medicineData);
      setMedicines(prev => [...prev, newMedicine]);
      return newMedicine;
    } catch (err) {
      setError(err.message);
      console.error('Failed to add medicine:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update medicine
  const updateMedicine = useCallback(async (id, medicineData) => {
    setLoading(true);
    setError(null);
    try {
      const updatedMedicine = await medicineAPI.update(id, medicineData);
      setMedicines(prev => 
        prev.map(med => med.id === id ? updatedMedicine : med)
      );
      return updatedMedicine;
    } catch (err) {
      setError(err.message);
      console.error('Failed to update medicine:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete medicine
  const deleteMedicine = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      await medicineAPI.delete(id);
      setMedicines(prev => prev.filter(med => med.id !== id));
    } catch (err) {
      setError(err.message);
      console.error('Failed to delete medicine:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single medicine
  const getMedicine = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const medicine = await medicineAPI.getById(id);
      return medicine;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get medicine:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get patient medicines (for pharmacy admins)
  const getPatientMedicines = useCallback(async (patientId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicineAPI.getPatientMedicines(patientId);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Failed to get patient medicines:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  return {
    medicines,
    loading,
    error,
    fetchMedicines,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    getMedicine,
    getPatientMedicines,
  };
};
