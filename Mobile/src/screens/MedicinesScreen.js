import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { Card, Button, Avatar, Searchbar } from 'react-native-paper';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';

const MedicinesScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [filteredMedicines, setFilteredMedicines] = useState([]);

  useEffect(() => {
    loadMedicines();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = medicines.filter(medicine =>
        medicine.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        medicine.scientificName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMedicines(filtered);
    } else {
      setFilteredMedicines(medicines);
    }
  }, [searchQuery, medicines]);

  const loadMedicines = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockMedicines = [
        {
          id: 1,
          name: 'Aspirin',
          scientificName: 'Acetylsalicylic acid',
          dosage: '100mg',
          frequency: 'Once daily',
          stock: 20,
          nextDose: '08:00 AM',
          prescribedFor: 'Headache',
          provider: 'Dr. Smith',
        },
        {
          id: 2,
          name: 'Vitamin D',
          scientificName: 'Cholecalciferol',
          dosage: '1000 IU',
          frequency: 'Once daily',
          stock: 45,
          nextDose: '02:00 PM',
          prescribedFor: 'Vitamin deficiency',
          provider: 'Dr. Johnson',
        },
        {
          id: 3,
          name: 'Lisinopril',
          scientificName: 'Lisinopril dihydrate',
          dosage: '10mg',
          frequency: 'Twice daily',
          stock: 8,
          nextDose: '06:00 PM',
          prescribedFor: 'Hypertension',
          provider: 'Dr. Brown',
        },
      ];
      
      setMedicines(mockMedicines);
      setFilteredMedicines(mockMedicines);
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleMedicinePress = (medicine) => {
    Alert.alert(
      t('medicines.medicineAboutDrug', { drug: medicine.name }),
      `${t('medicines.name')}: ${medicine.name}\n${t('medicines.scientificName')}: ${medicine.scientificName}\n${t('medicines.dosage')}: ${medicine.dosage}\n${t('medicines.frequency')}: ${medicine.frequency}\n${t('medicines.stock')}: ${medicine.stock}\n${t('medicines.nextDose')}: ${medicine.nextDose}`
    );
  };

  const handleAddMedicine = () => {
    navigation.navigate('AddMedicine');
  };

  const getStockColor = (stock) => {
    if (stock <= 10) return '#ef4444'; // Red
    if (stock <= 20) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>{t('medicines.loadingMedicines')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('medicines.title')}</Text>
        <Text style={styles.subtitle}>{t('medicines.subtitle')}</Text>
      </View>

      {/* Search Bar */}
      <Searchbar
        placeholder={t('medicines.searchMedicines')}
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      {/* Medicines List */}
      <ScrollView style={styles.scrollView}>
        {filteredMedicines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? t('medicines.noMedicines') : t('medicines.noMedicines')}
            </Text>
          </View>
        ) : (
          filteredMedicines.map((medicine) => (
            <TouchableOpacity
              key={medicine.id}
              onPress={() => handleMedicinePress(medicine)}
            >
              <Card style={styles.medicineCard}>
                <View style={styles.medicineContent}>
                  <View style={styles.medicineInfo}>
                    <Text style={styles.medicineName}>{medicine.name}</Text>
                    <Text style={styles.medicineScientific}>{medicine.scientificName}</Text>
                    <Text style={styles.medicineDetails}>
                      {medicine.dosage} • {medicine.frequency}
                    </Text>
                    <Text style={styles.medicineProvider}>
                      {t('medicines.provider')}: {medicine.provider}
                    </Text>
                  </View>
                  <View style={styles.medicineStatus}>
                    <Text style={styles.nextDose}>{t('medicines.nextDose')}</Text>
                    <Text style={styles.nextDoseTime}>{medicine.nextDose}</Text>
                    <View style={styles.stockContainer}>
                      <Text style={styles.stockLabel}>{t('medicines.stock')}: </Text>
                      <Text style={[styles.stockValue, { color: getStockColor(medicine.stock) }]}>
                        {medicine.stock}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Medicine Button */}
      <View style={styles.addButtonContainer}>
        <Button
          mode="contained"
          onPress={handleAddMedicine}
          style={styles.addButton}
          icon="plus"
        >
          {t('medicines.addMedicine')}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
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
  searchBar: {
    margin: 16,
    marginBottom: 8,
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
    color: '#6b7280',
    textAlign: 'center',
  },
  medicineCard: {
    marginHorizontal: 16,
    marginVertical: 4,
  },
  medicineContent: {
    flexDirection: 'row',
    padding: 16,
  },
  medicineInfo: {
    flex: 1,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  medicineScientific: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  medicineDetails: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  medicineProvider: {
    fontSize: 12,
    color: '#6b7280',
  },
  medicineStatus: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  nextDose: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  nextDoseTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  addButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  addButton: {
    margin: 0,
  },
});

export default MedicinesScreen;
