import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";
import { authAPI, API_BASE_URL } from "../services/api";

const Signup = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password1: "",
    password2: "",
    role: "",
    pharmacy_admin_id: "",
    remember_me: false,
    // Pharmacy admin fields
    country: "",
    province: "",
    district: "",
    facility_name: "",
    facility_type: "",
    phone_number: "",
    address: "",
    license_number: "",
    license_expiry: ""
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [locationOptions, setLocationOptions] = useState(null);
  const [showPharmacyFields, setShowPharmacyFields] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const roleDescriptions = {
    PATIENT: t('roleDescriptions.patient'),
    PHARMACY_ADMIN: t('roleDescriptions.pharmacyAdmin'),
    ADMIN: t('roleDescriptions.admin')
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Show/hide pharmacy fields based on role
    if (name === 'role') {
      setShowPharmacyFields(value === 'PHARMACY_ADMIN');
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  useEffect(() => {
    // Load location options when pharmacy admin fields are shown
    if (showPharmacyFields) {
      loadLocationOptions();
    }
  }, [showPharmacyFields]);

  const loadLocationOptions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pharmacy-admin/location-options/`);
      const data = await response.json();
      setLocationOptions(data);
    } catch (error) {
      console.error('Failed to load location options:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = t('signup.usernameRequired');
    }
    if (!formData.email.trim()) {
      newErrors.email = t('signup.emailRequired');
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('signup.emailInvalid');
    }
    if (!formData.password1) {
      newErrors.password1 = t('signup.passwordRequired');
    } else if (formData.password1.length < 8) {
      newErrors.password1 = t('signup.passwordMinLength');
    }
    if (!formData.password2) {
      newErrors.password2 = t('signup.confirmPasswordRequired');
    } else if (formData.password1 !== formData.password2) {
      newErrors.password2 = t('signup.passwordsMustMatch');
    }
    if (!formData.role) {
      newErrors.role = t('signup.roleRequired');
    }
    
    // Pharmacy admin specific validations
    if (formData.role === 'PHARMACY_ADMIN') {
      if (!formData.country.trim()) {
        newErrors.country = t('pharmacyAdmin.countryRequired');
      }
      if (!formData.province.trim()) {
        newErrors.province = t('pharmacyAdmin.provinceRequired');
      }
      if (!formData.district.trim()) {
        newErrors.district = t('pharmacyAdmin.districtRequired');
      }
      if (!formData.facility_name.trim()) {
        newErrors.facility_name = t('pharmacyAdmin.facilityNameRequired');
      }
      if (!formData.facility_type) {
        newErrors.facility_type = t('pharmacyAdmin.facilityTypeRequired');
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    try {
      let response;
      
      if (formData.role === 'PHARMACY_ADMIN') {
        // Pharmacy admin signup - use pharmacy admin endpoint
        const pharmacyData = {
          username: formData.username,
          email: formData.email,
          password: formData.password1,
          confirm_password: formData.password2,
          country: formData.country,
          province: formData.province,
          district: formData.district,
          facility_name: formData.facility_name,
          facility_type: formData.facility_type,
          phone_number: formData.phone_number,
          address: formData.address,
          license_number: formData.license_number,
          license_expiry: formData.license_expiry
        };
        
        // Log the request data for debugging
        console.log('Sending pharmacy data:', pharmacyData);
        
        response = await fetch(`${API_BASE_URL}/pharmacy-admin/signup/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pharmacyData)
        });
      } else {
        // Regular user signup - use auth endpoint
        const userData = {
          username: formData.username,
          email: formData.email,
          password: formData.password1,
          password_confirm: formData.password2,
          role: formData.role,
          pharmacy_admin_id: formData.pharmacy_admin_id
        };
        
        // Log the request data for debugging
        console.log('Sending user data:', userData);
        
        response = await fetch(`${API_BASE_URL}/auth/register/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData)
        });
      }
      
      const data = await response.json();
      
      // Log the response for debugging
      console.log('Signup Response:', {
        status: response.status,
        ok: response.ok,
        data: data
      });
      
      // Log detailed error if 400
      if (response.status === 400) {
        console.log('400 Error Details:', {
          errors: data.errors,
          non_field_errors: data.non_field_errors,
          error: data.error,
          full_response: data
        });
        
        // Log the specific error message - check both locations
        let errorMessage = null;
        if (data.non_field_errors && data.non_field_errors.length > 0) {
          errorMessage = data.non_field_errors[0];
          console.log('Non-field Error Message:', errorMessage);
        } else if (data.errors && data.errors.non_field_errors && data.errors.non_field_errors.length > 0) {
          errorMessage = data.errors.non_field_errors[0];
          console.log('Errors Non-field Message:', errorMessage);
        }
        
        // Log field-specific errors
        if (data.errors) {
          console.log('Field Validation Errors:', data.errors);
          Object.keys(data.errors).forEach(field => {
            if (field !== 'non_field_errors') {
              console.log(`${field}:`, data.errors[field]);
            }
          });
        }
        
        // Log full error response
        console.log('Full error response:', data);
      }
      
      if (response.ok) {
        if (formData.role === 'PHARMACY_ADMIN') {
          // Show pharmacy admin ID
          const successText = t('common.success') || 'Success';
          const pharmacyIdText = t('auth.pharmacyAdminIdSuccess') || 'Your Pharmacy Admin ID is: %(pharmacy_id)s';
          const pharmacyIdMsg = pharmacyIdText.replace('%(pharmacy_id)s', data.pharmacy_id);
          setMessage(successText + "! " + pharmacyIdMsg);
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        } else {
          // Regular user - show persistent verification screen
          setRegisteredEmail(formData.email);
          setRegistrationSuccess(true);
        }
      } else {
        // Handle validation errors
        console.log('Full error response:', data);
        
        // Handle the new error format: {success: false, errors: {}, non_field_errors: []}
        if (data.non_field_errors && data.non_field_errors.length > 0) {
          // New format with non_field_errors at root level
          const errorMessage = data.non_field_errors[0];
          console.log('Setting non_field error:', errorMessage);
          setErrors({ non_field: errorMessage });
          setMessage(null);
        } else if (data.errors && Object.keys(data.errors).length > 0) {
          // Handle field-specific errors
          const flatErrors = {};
          Object.keys(data.errors).forEach(field => {
            const fieldErrors = data.errors[field];
            if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
              flatErrors[field] = fieldErrors[0];
            } else if (typeof fieldErrors === 'string') {
              flatErrors[field] = fieldErrors;
            }
          });
          setErrors(flatErrors);
          setMessage(null);
        } else if (data.error) {
          // Single error message
          setErrors({ non_field: data.error });
          setMessage(null);
        } else {
          // Fallback error
          const failedMsg = t('auth.failedToCreateAccount') || 'Failed to create account';
          setErrors({ non_field: failedMsg });
          setMessage(null);
        }
      }
      
    } catch (error) {
      console.error("Signup error:", error);
      const errorMsg = t('auth.failedToCreateAccount') || 'Failed to create account';
      setErrors({ non_field: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  const getRoleHelpText = () => {
    return roleDescriptions[formData.role] || t('emailVerification.selectRoleDescription');
  };

  const showPharmacyAdminField = formData.role === "PATIENT";

  // Show persistent verification screen after successful registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-page)' }}>
        <div className="max-w-md w-full space-y-6">
          <div className="hc-card p-8 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-emerald-100 mb-4">
              <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('emailVerification.checkYourEmail')}</h2>
            <p className="text-gray-600 mb-4">
              {t('emailVerification.verificationSentTo')}
            </p>
            <p className="text-teal-600 font-semibold text-lg mb-4">{registeredEmail}</p>
            <p className="text-sm text-gray-500 mb-6">
              {t('emailVerification.clickLinkToVerify')}
            </p>

            <div className="border-t border-gray-200 pt-4 space-y-3">
              <p className="text-sm text-gray-500">{t('emailVerification.didntReceive')}</p>
              <button
                type="button"
                disabled={resendLoading}
                onClick={async () => {
                  setResendLoading(true);
                  setResendMessage("");
                  try {
                    await authAPI.resendVerification(registeredEmail);
                    setResendMessage({ text: t('emailVerification.resentSuccess'), success: true });
                  } catch (err) {
                    setResendMessage({ text: err.message || t('emailVerification.resentFailedShort'), success: false });
                  } finally {
                    setResendLoading(false);
                  }
                }}
                className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-teal-300 text-sm font-medium rounded-xl text-teal-700 bg-teal-50 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
              >
                {resendLoading ? t('emailVerification.sending') : t('emailVerification.resendVerification')}
              </button>
              {resendMessage && (
                <p className={`text-sm ${resendMessage.success ? 'text-green-600' : 'text-red-600'}`}>
                  {resendMessage.text}
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="w-full inline-flex justify-center items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
              >
                {t('emailVerification.goToLogin')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div>
          <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-teal-100">
            <i className="fas fa-pills text-teal-600 text-xl"></i>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
            {t('signup.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            {t('common.or')}{' '}
            <a href="/login" className="font-medium text-teal-600 hover:text-teal-500">
              {t('signup.alreadyHave')}
            </a>
          </p>
        </div>
        
        {message && (
          <div className="rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-check-circle text-green-400"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {message}
                </p>
              </div>
            </div>
          </div>
        )}

        {errors.non_field && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-exclamation-circle text-red-400"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  {errors.non_field}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <input type="hidden" name="remember" value="true" />
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">{t('signup.username')}</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm ${
                  errors.username ? "border-red-300" : "border-gray-300"
                }`}
                placeholder={t('signup.username')}
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600">{errors.username}</p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="sr-only">{t('signup.email')}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm ${
                  errors.email ? "border-red-300" : "border-gray-300"
                }`}
                placeholder={t('signup.email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>
            <div>
              <label htmlFor="password1" className="sr-only">{t('signup.password')}</label>
              <input
                id="password1"
                name="password1"
                type="password"
                required
                value={formData.password1}
                onChange={handleInputChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm ${
                  errors.password1 ? "border-red-300" : "border-gray-300"
                }`}
                placeholder={t('signup.password')}
              />
              {errors.password1 && (
                <p className="mt-1 text-sm text-red-600">{errors.password1}</p>
              )}
            </div>
            <div>
              <label htmlFor="password2" className="sr-only">{t('signup.confirmPassword')}</label>
              <input
                id="password2"
                name="password2"
                type="password"
                required
                value={formData.password2}
                onChange={handleInputChange}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm ${
                  errors.password2 ? "border-red-300" : "border-gray-300"
                }`}
                placeholder={t('signup.confirmPassword')}
              />
              {errors.password2 && (
                <p className="mt-1 text-sm text-red-600">{errors.password2}</p>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="mt-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700">{t('signup.role')}</label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={handleInputChange}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${
                errors.role ? "border-red-300" : "border-gray-300"
              }`}
            >
              <option value="">{t('signup.chooseRole')}</option>
              <option value="PATIENT">{t('signup.patient')}</option>
              <option value="PHARMACY_ADMIN">{t('signup.pharmacyAdmin')}</option>
              <option value="ADMIN">{t('signup.systemAdministrator')}</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">{getRoleHelpText()}</p>
          </div>

          {/* Pharmacy Admin Fields */}
          {showPharmacyFields && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium text-gray-900">{t('pharmacyAdmin.title')}</h3>
              
              {/* Location Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.country')}</label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  >
                    <option value="">{t('pharmacyAdmin.selectCountry')}</option>
                    {locationOptions?.countries?.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="province" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.province')}</label>
                  <select
                    id="province"
                    name="province"
                    value={formData.province}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  >
                    <option value="">{t('pharmacyAdmin.selectProvince')}</option>
                    {locationOptions?.provinces?.map(province => (
                      <option key={province} value={province}>{province}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="district" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.district')}</label>
                  <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  >
                    <option value="">{t('pharmacyAdmin.selectDistrict')}</option>
                    {locationOptions?.districts?.[formData.province]?.map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Facility Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="facility_name" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.facilityName')}</label>
                  <input
                    id="facility_name"
                    name="facility_name"
                    type="text"
                    value={formData.facility_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder={t('pharmacyAdmin.enterFacilityName')}
                  />
                </div>
                
                <div>
                  <label htmlFor="facility_type" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.facilityType')}</label>
                  <select
                    id="facility_type"
                    name="facility_type"
                    value={formData.facility_type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  >
                    <option value="">{t('pharmacyAdmin.selectType')}</option>
                    <option value="pharmacy">{t('pharmacyAdmin.pharmacy')}</option>
                    <option value="hospital">{t('pharmacyAdmin.hospital')}</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.phoneNumber')}</label>
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder={t('pharmacyAdmin.enterPhoneNumber')}
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.address')}</label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder={t('pharmacyAdmin.enterAddress')}
                  />
                </div>
              </div>

              {/* License Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="license_number" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.licenseNumber')}</label>
                  <input
                    id="license_number"
                    name="license_number"
                    type="text"
                    value={formData.license_number}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    placeholder={t('pharmacyAdmin.enterLicenseNumber')}
                  />
                </div>
                
                <div>
                  <label htmlFor="license_expiry" className="block text-sm font-medium text-gray-700">{t('pharmacyAdmin.licenseExpiryDate')}</label>
                  <input
                    id="license_expiry"
                    name="license_expiry"
                    type="date"
                    value={formData.license_expiry}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Pharmacy Admin ID (shown only for patients) */}
          {showPharmacyAdminField && (
            <div className="mt-4">
              <label htmlFor="pharmacy_admin_id" className="block text-sm font-medium text-gray-700">{t('signup.pharmacyAdminId')}</label>
              <input
                id="pharmacy_admin_id"
                name="pharmacy_admin_id"
                type="text"
                value={formData.pharmacy_admin_id}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder={t('signup.pharmacyAdminPlaceholder')}
              />
              {errors.pharmacy_admin_id && (
                <p className="mt-1 text-sm text-red-600">{errors.pharmacy_admin_id}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">{t('pharmacyAdmin.adminIdOptional')}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={formData.remember_me}
                onChange={handleInputChange}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                {t('login.rememberMe')}
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <i className="fas fa-user-plus text-teal-500 group-hover:text-teal-400"></i>
              </span>
              {loading ? t('signup.signingUp') : t('signup.signupButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
