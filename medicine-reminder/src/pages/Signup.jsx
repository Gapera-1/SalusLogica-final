import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";

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
    remember_me: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const roleDescriptions = {
    PATIENT: "Create an account to manage your personal medications and health records",
    PHARMACY_ADMIN: "Manage multiple patients and their medication adherence",
    ADMIN: "System-wide administration and user management"
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
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
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Store in localStorage for demo
      const userData = {
        username: formData.username,
        email: formData.email,
        role: formData.role.toLowerCase(),
        pharmacy_admin_id: formData.pharmacy_admin_id
      };
      
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("user", JSON.stringify(userData));
      
      setMessage(t('common.success')).concat(", " + t('common.loading'));
      
      setTimeout(() => {
        setIsAuthenticated(true);
        navigate("/dashboard");
      }, 2000);
      
    } catch (error) {
      console.error("Signup error:", error);
      setErrors({ non_field: "Failed to create account. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const getRoleHelpText = () => {
    return roleDescriptions[formData.role] || "Select your role to see description";
  };

  const showPharmacyAdminField = formData.role === "PATIENT";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <i className="fas fa-pills text-blue-600 text-xl"></i>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('signup.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or 
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-500">
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
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
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm ${
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
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder={t('signup.pharmacyAdminPlaceholder')}
              />
              {errors.pharmacy_admin_id && (
                <p className="mt-1 text-sm text-red-600">{errors.pharmacy_admin_id}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Optional: Get this ID from your pharmacy administrator if you want to be managed by a pharmacy.</p>
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                {t('login.rememberMe')}
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <i className="fas fa-user-plus text-blue-500 group-hover:text-blue-400"></i>
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
