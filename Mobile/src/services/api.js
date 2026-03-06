import { Platform } from 'react-native';
import { DeviceEventEmitter } from 'react-native';
import { tokenStorage, userStorage } from './storage';

// ============ AUTH EVENT EMITTER ============
// Fires 'auth:forceLogout' when a 401 is received after token refresh fails,
// so AuthContext can clear state and redirect to login.
export const AUTH_FORCE_LOGOUT_EVENT = 'auth:forceLogout';

const emitForceLogout = (reason = 'Session expired') => {
  DeviceEventEmitter.emit(AUTH_FORCE_LOGOUT_EVENT, { reason });
};

// ============ API CONFIGURATION ============
// For web: use localhost, for Android emulator: use 10.0.2.2, for iOS simulator/physical devices: use your computer's IP
const getBaseUrl = () => {
  if (__DEV__) console.log('[API] Platform.OS:', Platform.OS);
  if (Platform.OS === 'web') {
    return 'https://saluslogica-api-c5sl.onrender.com/api'; // Production backend
  } else if (Platform.OS === 'android') {
    return 'https://saluslogica-api-c5sl.onrender.com/api'; // Production backend
  } else {
    return 'https://saluslogica-api-c5sl.onrender.com/api'; // Production backend
  }
};
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  getBaseUrl();
if (__DEV__) console.log('[API] Using API_BASE_URL:', API_BASE_URL);

/**
 * Helper function for unified API calls
 * Matches web app behavior exactly
 */
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from secure storage (falls back to AsyncStorage)
  const { accessToken, refreshToken } = await tokenStorage.getTokens();
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Token ${accessToken}` }),
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    if (__DEV__) {
      console.log(
        `API Request: ${config.method || 'GET'} ${url}`,
        config.body ? JSON.parse(config.body) : {},
      );
    }
    
    let response = await fetch(url, config);

    // If unauthorized, try to refresh token once and retry
    if (response.status === 401) {
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
              await tokenStorage.setTokens(refreshData.access, refreshData.refresh || null);
            }

            // Retry original request with new token
            const { accessToken: newToken } = await tokenStorage.getTokens();
            if (newToken) {
              config.headers = { ...config.headers, Authorization: `Token ${newToken}` };
            }
            response = await fetch(url, config);
          } else {
            // Refresh failed - clear tokens and force logout
            await clearAuthData();
            emitForceLogout('Session expired');
            const err = new Error('Session expired');
            err.status = 401;
            throw err;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          await clearAuthData();
          emitForceLogout('Session expired');
          const err = new Error('Session expired');
          err.status = 401;
          throw err;
        }
      } else {
        // No refresh token available
        await clearAuthData();
        emitForceLogout('Unauthorized');
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error Response:`, JSON.stringify(errorData, null, 2));
      
      // Handle the structured error response from backend
      // Backend format: { success: false, error: { message, type, fields: { non_field_errors: [...] } } }
      let errorMessage = 'Request failed';
      if (errorData.error?.fields?.non_field_errors?.[0]) {
        errorMessage = errorData.error.fields.non_field_errors[0];
      } else if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.non_field_errors?.[0]) {
        errorMessage = errorData.non_field_errors[0];
      } else if (errorData.detail) {
        errorMessage = errorData.detail;
      }
      
      const error = new Error(errorMessage);
      error.response = { data: errorData, status: response.status };
      throw error;
    }

    // Handle 204 No Content or empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      if (__DEV__) console.log(`API Response: (No Content)`);
      return {};
    }

    const data = await response.json().catch(() => ({}));
    if (__DEV__) console.log(`API Response:`, data);
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
    await Promise.all([tokenStorage.clearTokens(), userStorage.clearUser()]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

/**
 * Store authentication tokens
 */
export const storeAuthTokens = async (accessToken, refreshToken) => {
  try {
    await tokenStorage.setTokens(accessToken, refreshToken);
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
    const { accessToken } = await tokenStorage.getTokens();
    return accessToken;
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

  // Mark a specific dose as taken (uses backend stock reduction logic)
  markTaken: async (id) => {
    return await apiCall(`/doses/${id}/mark_taken/`, {
      method: 'POST',
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
  markGroupTaken: async (groupId) => {
    return await apiCall('/alarms/taken/', {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId }),
    });
  },

  // Dismiss alarm
  dismiss: async (groupId) => {
    return await apiCall('/alarms/dismiss/', {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId }),
    });
  },

  // Snooze alarm
  snooze: async (groupId, minutes = 5) => {
    return await apiCall('/alarms/snooze/', {
      method: 'POST',
      body: JSON.stringify({ group_id: groupId, snooze_minutes: minutes }),
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

// ============ PHARMACY ADMIN API ============
export const pharmacyAdminAPI = {
  // Pharmacy admin signup
  signup: async (data) => {
    return await apiCall('/pharmacy-admin/signup/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Location options for signup dropdowns
  getLocationOptions: async () => {
    return await apiCall('/pharmacy-admin/location-options/');
  },

  // Dashboard stats
  getDashboard: async () => {
    return await apiCall('/pharmacy-admin/dashboard/');
  },

  // Patients list
  getPatients: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/pharmacy-admin/patients/${query ? '?' + query : ''}`);
  },

  // Patient detail
  getPatientDetail: async (patientId) => {
    return await apiCall(`/pharmacy-admin/patients/${patientId}/`);
  },

  // Patient medicines
  getPatientMedicines: async (patientId) => {
    return await apiCall(`/pharmacy-admin/patients/${patientId}/medicines/`);
  },

  // Adverse reactions list
  getAdverseReactions: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return await apiCall(`/pharmacy-admin/adverse-reactions/${query ? '?' + query : ''}`);
  },

  // Adverse reaction detail
  getAdverseReactionDetail: async (id) => {
    return await apiCall(`/pharmacy-admin/adverse-reactions/${id}/`);
  },

  // Mark adverse reaction as resolved
  resolveAdverseReaction: async (id) => {
    return await apiCall(`/pharmacy-admin/adverse-reactions/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ is_resolved: true, resolved_date: new Date().toISOString() }),
    });
  },

  // Reports data
  getReports: async () => {
    return await apiCall('/pharmacy-admin/reports/');
  },

  // Link patient
  linkPatient: async (data) => {
    return await apiCall('/pharmacy-admin/link-patient/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Get pharmacy admin profile
  getProfile: async () => {
    return await apiCall('/pharmacy-admin/profile/');
  },

  // Update pharmacy admin profile
  updateProfile: async (data) => {
    return await apiCall('/pharmacy-admin/profile/', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Drug lookup
  drugLookup: async (query) => {
    return await apiCall(`/pharmacy-admin/drug-lookup/?q=${encodeURIComponent(query)}`);
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

// ============ SAFETY API ============
export const safetyAPI = {
  safetyCheck: async (medicine, population) => {
    return await apiCall('/safety/check/', {
      method: 'POST',
      body: JSON.stringify({ medicine, population }),
    });
  },

  foodAdvice: async (medicineId) => {
    if (medicineId) {
      return await apiCall(`/medicines/${medicineId}/food-advice/`);
    }
    return await apiCall('/safety/food-advice/');
  },

  contraindications: async (medicineName) => {
    return await apiCall(`/safety/contraindications/?medicine=${encodeURIComponent(medicineName)}`);
  },
};

// ============ INTERACTION API ============
export const interactionAPI = {
  check: async (medicines) => {
    return await apiCall('/interactions/check/', {
      method: 'POST',
      body: JSON.stringify({ medicines }),
    });
  },
};

// ============ CHATBOT API ============
export const chatbotAPI = {
  // Send message to chatbot
  sendMessage: async (message, sessionId = null) => {
    return await apiCall('/chat/send/', {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        session_id: sessionId,
      }),
    });
  },

  // Get chat history
  getHistory: async (sessionId = null) => {
    const query = sessionId ? `?session_id=${sessionId}` : '';
    return await apiCall(`/chat/history/${query}`);
  },

  // Get chat sessions
  getSessions: async () => {
    return await apiCall('/chat/');
  },

  // Start a new chat session
  newSession: async () => {
    return await apiCall('/chat/new/', {
      method: 'POST',
    });
  },

  // Delete a chat session
  deleteSession: async (sessionId) => {
    return await apiCall(`/chat/delete/${sessionId}/`, {
      method: 'DELETE',
    });
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
  pharmacyAdminAPI,
  exportReportAPI,
  dashboardAPI,
  safetyAPI,
  interactionAPI,
  chatbotAPI,
};
