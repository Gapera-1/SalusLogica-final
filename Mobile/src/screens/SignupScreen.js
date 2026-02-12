import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, Picker } from 'react-native';
import { useLanguage } from '../i18n/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';

const SignupScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { register, loading } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    role: 'patient',
    pharmacyAdminId: '',
    // Pharmacy admin fields
    country: '',
    province: '',
    district: '',
    facilityName: '',
    facilityType: '',
    phoneNumber: '',
    address: '',
    licenseNumber: '',
    licenseExpiry: '',
  });
  const [showPharmacyFields, setShowPharmacyFields] = useState(false);
  const [locationOptions, setLocationOptions] = useState(null);

  const roles = [
    { label: t('signup.patient'), value: 'patient' },
    { label: t('signup.pharmacyAdmin'), value: 'pharmacy_admin' },
    { label: t('signup.systemAdministrator'), value: 'system_admin' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Show/hide pharmacy fields based on role
    if (field === 'role') {
      setShowPharmacyFields(value === 'pharmacy_admin');
      if (value === 'pharmacy_admin') {
        loadLocationOptions();
      }
    }
  };

  const loadLocationOptions = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/pharmacy-admin/location-options/');
      const data = await response.json();
      setLocationOptions(data);
    } catch (error) {
      console.error('Failed to load location options:', error);
    }
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      Alert.alert(t('common.error'), t('signup.firstName') + ' ' + t('common.error'));
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert(t('common.error'), t('signup.emailRequired'));
      return false;
    }
    if (!formData.username.trim()) {
      Alert.alert(t('common.error'), t('signup.usernameRequired'));
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert(t('common.error'), t('signup.passwordRequired'));
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert(t('common.error'), t('signup.passwordMinLength'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert(t('common.error'), t('signup.passwordsMustMatch'));
      return false;
    }
    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      let result;
      
      if (formData.role === 'pharmacy_admin') {
        // Pharmacy admin signup
        const pharmacyData = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirm_password: formData.confirmPassword,
          country: formData.country,
          province: formData.province,
          district: formData.district,
          facility_name: formData.facilityName,
          facility_type: formData.facilityType,
          phone_number: formData.phoneNumber,
          address: formData.address,
          license_number: formData.licenseNumber,
          license_expiry: formData.licenseExpiry
        };
        
        const response = await fetch('http://127.0.0.1:8000/api/pharmacy-admin/signup/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pharmacyData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          Alert.alert(
            t('common.success'),
            t('signup.pharmacyAdminSuccess') + '\n\n' + t('signup.pharmacyId') + ': ' + data.pharmacy_id
          );
          navigation.navigate('Login');
        } else {
          Alert.alert(t('common.error'), data.error || t('common.failed'));
        }
      } else {
        // Regular user signup
        result = await register({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          username: formData.username,
          password: formData.password,
          password_confirm: formData.confirmPassword,
          role: formData.role,
          pharmacy_admin_id: formData.pharmacyAdminId || null,
        });
        
        if (result.success) {
          Alert.alert(t('common.success'), t('auth.signupSuccess'));
          navigation.navigate('Login');
        } else {
          Alert.alert(t('common.error'), result.error || t('common.failed'));
        }
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('common.failed'));
    }
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('signup.title')}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('signup.firstName')}</Text>
              <TextInput
                style={styles.input}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                placeholder="John"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('signup.lastName')}</Text>
              <TextInput
                style={styles.input}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                placeholder="Doe"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.email')}</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="john.doe@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.username')}</Text>
            <TextInput
              style={styles.input}
              value={formData.username}
              onChangeText={(value) => handleInputChange('username', value)}
              placeholder="johndoe"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('signup.password')}</Text>
              <TextInput
                style={styles.input}
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                placeholder="•••••••••"
                secureTextEntry
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>{t('signup.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                placeholder="•••••••••"
                secureTextEntry
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('signup.role')}</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.role}
                onValueChange={(value) => handleInputChange('role', value)}
                style={styles.picker}
              >
                {roles.map((role) => (
                  <Picker.Item key={role.value} label={role.label} value={role.value} />
                ))}
              </Picker>
            </View>
          </View>

          {showPharmacyFields && (
            <View style={styles.pharmacySection}>
              <Text style={styles.sectionTitle}>Pharmacy Information</Text>
              
              {/* Location Fields */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Country</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.country}
                      onValueChange={(value) => handleInputChange('country', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Country" value="" />
                      {locationOptions?.countries?.map(country => (
                        <Picker.Item key={country} label={country} value={country} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Province</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.province}
                      onValueChange={(value) => handleInputChange('province', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Province" value="" />
                      {locationOptions?.provinces?.map(province => (
                        <Picker.Item key={province} label={province} value={province} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>District</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.district}
                    onValueChange={(value) => handleInputChange('district', value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select District" value="" />
                    {locationOptions?.districts?.[formData.province]?.map(district => (
                      <Picker.Item key={district} label={district} value={district} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Facility Details */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Facility Name</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.facilityName}
                    onChangeText={(value) => handleInputChange('facilityName', value)}
                    placeholder="Enter facility name"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Facility Type</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={formData.facilityType}
                      onValueChange={(value) => handleInputChange('facilityType', value)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Select Type" value="" />
                      <Picker.Item label="Pharmacy" value="pharmacy" />
                      <Picker.Item label="Hospital" value="hospital" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Contact Information */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phoneNumber}
                    onChangeText={(value) => handleInputChange('phoneNumber', value)}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>License Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.licenseNumber}
                    onChangeText={(value) => handleInputChange('licenseNumber', value)}
                    placeholder="Enter license number"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={styles.input}
                  value={formData.address}
                  onChangeText={(value) => handleInputChange('address', value)}
                  placeholder="Enter address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Expiry Date</Text>
                <TextInput
                  style={styles.input}
                  value={formData.licenseExpiry}
                  onChangeText={(value) => handleInputChange('licenseExpiry', value)}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>
          )}

          {formData.role === 'patient' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('signup.pharmacyAdminId')}</Text>
              <TextInput
                style={styles.input}
                value={formData.pharmacyAdminId}
                onChangeText={(value) => handleInputChange('pharmacyAdminId', value)}
                placeholder={t('signup.pharmacyAdminPlaceholder')}
              />
            </View>
          )}

          <TouchableOpacity 
            style={[styles.button, styles.signupButton]}
            onPress={handleSignup}
            disabled={loading}
          >
            <Text style={styles.signupButtonText}>
              {loading ? t('signup.signingUp') : t('signup.signupButton')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('signup.alreadyHave')}</Text>
          <TouchableOpacity onPress={handleLogin}>
            <Text style={styles.loginText}>{t('signup.login')}</Text>
          </TouchableOpacity>
        </View>
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
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  form: {
    marginBottom: 32,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  picker: {
    height: 50,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signupButton: {
    backgroundColor: '#2563eb',
  },
  signupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
    marginRight: 4,
  },
  loginText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  pharmacySection: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
});

export default SignupScreen;
