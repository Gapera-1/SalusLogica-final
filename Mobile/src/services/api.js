import AsyncStorage from '@react-native-async-storage/async-storage';

// ============ API CONFIGURATION ============
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://10.0.2.2:8000/api'; // Use 10.0.2.2 for Android emulator

/**
 * Helper function for unified API calls
 * Matches web app behavior exactly
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from AsyncStorage
  const token = await AsyncStorage.getItem('access_token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    console.log(`API Request: ${config.method || 'GET'} ${url}`, config.body ? JSON.parse(config.body) : {});
    
    let response = await fetch(url, config);

    // If unauthorized, try to refresh token once and retry
    if (response.status === 401) {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResp.ok) {
            const refreshData = await refreshResp.json().catch(() => ({}));
            // Update tokens if present
            if (refreshData.access) {
              await AsyncStorage.setItem('access_token', refreshData.access);
            }
            if (refreshData.refresh) {
              await AsyncStorage.setItem('refresh_token', refreshData.refresh);
            }

            // Retry original request with new token
            const newToken = await AsyncStorage.getItem('access_token');
            if (newToken) {
              config.headers = { ...config.headers, Authorization: `Token ${newToken}` };
            }
            response = await fetch(url, config);
          } else {
            // Refresh failed - clear tokens
            await clearAuthData();
            const err = new Error('Session expired');
            err.status = 401;
            throw err;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          await clearAuthData();
          const err = new Error('Session expired');
          err.status = 401;
          throw err;
        }
      } else {
        // No refresh token available
        await clearAuthData();
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error Response:`, errorData);
      const error = new Error(
        errorData.error ||
        errorData.message || 
        errorData.non_field_errors?.[0] || 
        errorData.detail || 
        `HTTP error! status: ${response.status}`
      );
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    // Handle 204 No Content or empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      console.log(`API Response: (No Content)`);
      return {};
    }

    const data = await response.json().catch(() => ({}));
    console.log(`API Response:`, data);
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

/**
 * Clear authentication data from AsyncStorage
 */
export const clearAuthData = async () => {
  try {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Store authentication tokens
 */
export const storeAuthTokens = async (accessToken, refreshToken) => {
  try {
    if (accessToken) {
      await AsyncStorage.setItem('access_token', accessToken);
    }
    if (refreshToken) {
      await AsyncStorage.setItem('refresh_token', refreshToken);
    }
  } catch (error) {
    console.error('Error storing auth tokens:', error);
    throw error;
  }
};

/**
 * Get stored access token
 */
export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// ============ AUTHENTICATION API ============
export const authAPI = {
  login: async (credentials) => {
    return await apiCall('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async () => {
    try {
      await apiCall('/auth/logout/', {
        method: 'POST',
      });
    } catch (e) {
      // Ignore error — we clear local data regardless
      console.error('Logout API error (ignored):', e);
    }
    await clearAuthData();
  },

  register: async (userData) => {
    return await apiCall('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getCurrentUser: async () => {
    return await apiCall('/auth/profile/');
  },

  refreshToken: async () => {
    return await apiCall('/auth/refresh/', {
      method: 'POST',
    });
  },

  verifyEmail: async (token) => {
    return await apiCall(`/auth/verify-email/${token}/`);
  },

  resendVerification: async (email) => {
    return await apiCall('/auth/resend-verification/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  forgotPassword: async (email) => {
    return await apiCall('/auth/forgot-password/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  validateResetToken: async (token) => {
    return await apiCall(`/auth/validate-reset-token/${token}/`);
  },

  resetPassword: async (token, newPassword, confirmPassword) => {
    return await apiCall(`/auth/reset-password/${token}/`, {
      method: 'POST',
      body: JSON.stringify({
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
  },

  deleteAccount: async (password) => {
    return await apiCall('/auth/delete-account/', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  },
};

// ============ MEDICINE MANAGEMENT API ============
export const medicineAPI = {
  // Get all medicines for current user
  getAll: async () => {
    return await apiCall('/medicines/');
  },

  // Get single medicine
  getById: async (id) => {
    return await apiCall(`/medicines/${id}/`);
  },

  // Add new medicine
  create: async (medicineData) => {
    return await apiCall('/medicines/', {
      method: 'POST',
      body: JSON.stringify(medicineData),
    });
  },

  // Update medicine
  update: async (id, medicineData) => {
    return await apiCall(`/medicines/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(medicineData),
    });
  },

  // Partial update
  patch: async (id, medicineData) => {
    return await apiCall(`/medicines/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(medicineData),
    });
  },

  // Delete medicine
  delete: async (id) => {
    return await apiCall(`/medicines/${id}/`, {
      method: 'DELETE',
    });
  },

  // Search medicines by name or scientific name
  search: async (query, activeOnly = false) => {
    const params = new URLSearchParams({ q: query });
    if (activeOnly) {
      params.append('active_only', 'true');
    }
    return await apiCall(`/medicines/search_by_name/?${params.toString()}`);
  },

  // Barcode lookup via OpenFDA
  barcodeLookup: async (barcode) => {
    return await apiCall(`/medicines/barcode-lookup/?barcode=${encodeURIComponent(barcode)}`);
  },

  // External medicine search
  searchExternal: async (query) => {
    return await apiCall(`/medicines/medicine-search-external/?q=${encodeURIComponent(query)}`);
  },

  // Upload medicine photo (multipart)
  uploadPhoto: async (medicineId, uri, fileName, mimeType) => {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}/medicines/${medicineId}/upload-photo/`;
    const formData = new FormData();
    formData.append('photo', {
      uri,
      name: fileName || 'medicine_photo.jpg',
      type: mimeType || 'image/jpeg',
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Token ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to upload photo');
    }

    return await response.json();
  },

  // Delete medicine photo
  deletePhoto: async (medicineId) => {
    return await apiCall(`/medicines/${medicineId}/delete-photo/`, {
      method: 'DELETE',
    });
  },
};

// ============ DOSE LOGGING API ============
export const doseAPI = {
  // Get dose history
  getHistory: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/doses/${query ? '?' + query : ''}`);
  },

  // Log a dose taken
  logDose: async (doseData) => {
    return await apiCall('/doses/', {
      method: 'POST',
      body: JSON.stringify(doseData),
    });
  },

  // Update dose log
  updateDose: async (id, doseData) => {
    return await apiCall(`/doses/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(doseData),
    });
  },

  // Delete dose log
  deleteDose: async (id) => {
    return await apiCall(`/doses/${id}/`, {
      method: 'DELETE',
    });
  },
};

// ============ ALARM SYSTEM API ============
export const alarmAPI = {
  // Get active alarms
  getActive: async () => {
    return await apiCall('/alarms/active/');
  },

  // Get all alarms
  getAll: async () => {
    return await apiCall('/alarms/');
  },

  // Mark dose group as taken
  markGroupTaken: async (doseLogIds) => {
    return await apiCall('/alarms/mark-group-taken/', {
      method: 'POST',
      body: JSON.stringify({ dose_log_ids: doseLogIds }),
    });
  },

  // Dismiss alarm
  dismiss: async (alarmId) => {
    return await apiCall(`/alarms/${alarmId}/dismiss/`, {
      method: 'POST',
    });
  },

  // Snooze alarm
  snooze: async (alarmId, minutes = 5) => {
    return await apiCall(`/alarms/${alarmId}/snooze/`, {
      method: 'POST',
      body: JSON.stringify({ minutes }),
    });
  },

  // Diagnose endpoint for debugging
  diagnose: async () => {
    return await apiCall('/alarms/diagnose/');
  },
};

// ============ ANALYTICS API ============
export const analyticsAPI = {
  // Get analytics dashboard data
  getDashboard: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/analytics/dashboard/${query ? '?' + query : ''}`);
  },

  // Get adherence data
  getAdherence: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/analytics/adherence/${query ? '?' + query : ''}`);
  },

  // Get trends
  getTrends: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/analytics/trends/${query ? '?' + query : ''}`);
  },
};

// ============ MEDICINE INFORMATION API ============
export const medicineInfoAPI = {
  // Get interactions for a medicine
  checkInteractions: async (medicineIds) => {
    return await apiCall('/interactions/check/', {
      method: 'POST',
      body: JSON.stringify({ medicine_ids: medicineIds }),
    });
  },

  // Get food advice
  getFoodAdvice: async (medicineId) => {
    return await apiCall(`/medicines/${medicineId}/food-advice/`);
  },

  // Get contra-indications
  getContraIndications: async (medicineId) => {
    return await apiCall(`/medicines/${medicineId}/contra-indications/`);
  },

  // Get safety information
  getSafetyInfo: async (medicineId) => {
    return await apiCall(`/medicines/${medicineId}/safety/`);
  },
};

// ============ PROFILE/USER API ============
export const userAPI = {
  // Get full user profile
  getProfile: async () => {
    return await apiCall('/auth/profile/');
  },

  // Update profile
  updateProfile: async (profileData) => {
    return await apiCall('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Partial update profile
  patchProfile: async (profileData) => {
    return await apiCall('/auth/profile/', {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  },

  // Upload avatar
  uploadAvatar: async (formData) => {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}/auth/avatar/upload/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Token ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || errorData.detail || 'Failed to upload avatar');
    }

    return await response.json();
  },

  // Remove avatar
  removeAvatar: async () => {
    return await apiCall('/auth/remove-avatar/', {
      method: 'DELETE',
    });
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    return await apiCall('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    });
  },
};

// ============ NOTIFICATION API ============
export const notificationAPI = {
  // Get notifications
  getNotifications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/notifications/${query ? '?' + query : ''}`);
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    return await apiCall(`/notifications/${notificationId}/mark-read/`, {
      method: 'POST',
    });
  },

  // Mark all as read
  markAllAsRead: async () => {
    return await apiCall('/notifications/mark-all-read/', {
      method: 'POST',
    });
  },

  // Delete notification
  delete: async (notificationId) => {
    return await apiCall(`/notifications/${notificationId}/`, {
      method: 'DELETE',
    });
  },
};

// ============ FCM DEVICE REGISTRATION API ============
export const fcmDeviceAPI = {
  // Register FCM device token
  register: async (registrationId, deviceType = 'android') => {
    return await apiCall('/fcm-devices/', {
      method: 'POST',
      body: JSON.stringify({
        registration_id: registrationId,
        type: deviceType,
      }),
    });
  },

  // Unregister device
  unregister: async (registrationId) => {
    return await apiCall('/fcm-devices/unregister/', {
      method: 'POST',
      body: JSON.stringify({ registration_id: registrationId }),
    });
  },

  // Send test push
  sendTestPush: async () => {
    return await apiCall('/fcm-devices/test-push/', {
      method: 'POST',
    });
  },
};

// ============ SIDE EFFECT / SYMPTOM TRACKING API ============
export const sideEffectAPI = {
  // Get all side effects for the current patient
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.reaction_type) params.append('reaction_type', filters.reaction_type);
    if (filters.is_resolved !== undefined) params.append('is_resolved', filters.is_resolved);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiCall(`/side-effects/${query}`);
  },

  // Log a new side effect
  create: async (data) => {
    return await apiCall('/side-effects/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get a single side effect by ID
  getById: async (id) => {
    return await apiCall(`/side-effects/${id}/`);
  },

  // Update a side effect (e.g., mark as resolved)
  update: async (id, data) => {
    return await apiCall(`/side-effects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};

// ============ EXPORT REPORTS API ============
export const exportReportAPI = {
  // Download PDF report (returns blob-like response)
  downloadPDF: async (reportType, days = 30) => {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}/analytics/reports/download/?type=${reportType}&days=${days}`;

    const response = await fetch(url, {
      headers: {
        ...(token && { 'Authorization': `Token ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to generate report');
    }

    return response;
  },
};

// ============ DASHBOARD API ============
export const dashboardAPI = {
  getStats: async () => {
    return await apiCall('/analytics/dashboard/');
  },
};

export default {
  authAPI,
  medicineAPI,
  doseAPI,
  alarmAPI,
  analyticsAPI,
  medicineInfoAPI,
  userAPI,
  notificationAPI,
  fcmDeviceAPI,
  sideEffectAPI,
  exportReportAPI,
  dashboardAPI,
};
