// API Service for SalusLogica Backend Integration
// This service provides all the API calls to match SalusLogica Django backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Get token from localStorage
  const token = localStorage.getItem('access_token');
  
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Token ${token}` }),
    },
    credentials: 'include', // For cookies/session authentication
  };

  const config = { ...defaultOptions, ...options };

  try {
    console.log(`API Request: ${config.method || 'GET'} ${url}`, config.body ? JSON.parse(config.body) : {});
    let response = await fetch(url, config);

    // If unauthorized, try to refresh token once and retry
    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_BASE_URL}/auth/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ refresh: refreshToken }),
          });

          if (refreshResp.ok) {
            const refreshData = await refreshResp.json().catch(() => ({}));
            // Update tokens if present
            if (refreshData.access) {
              localStorage.setItem('access_token', refreshData.access);
            }
            if (refreshData.refresh) {
              localStorage.setItem('refresh_token', refreshData.refresh);
            }

            // Retry original request with new token
            const newToken = localStorage.getItem('access_token');
            if (newToken) {
              config.headers = { ...config.headers, Authorization: `Token ${newToken}` };
            }
            response = await fetch(url, config);
          } else {
            // Refresh failed - clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            const err = new Error('Session expired');
            err.status = 401;
            throw err;
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          const err = new Error('Session expired');
          err.status = 401;
          throw err;
        }
      } else {
        // No refresh token available
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`API Error Response:`, errorData);
      const error = new Error(
        errorData.error || errorData.message || errorData.non_field_errors?.[0] || errorData.detail || `HTTP error! status: ${response.status}`
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

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    return await apiCall('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  logout: async () => {
    return await apiCall('/auth/logout/', {
      method: 'POST',
    });
  },

  register: async (userData) => {
    return await apiCall('/auth/register/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getCurrentUser: async () => {
    return await apiCall('/auth/user/');
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

  deleteAccount: async (password) => {
    return await apiCall('/auth/delete-account/', {
      method: 'POST',
      body: JSON.stringify({ password }),
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
};

// Medicine Management API
export const medicineAPI = {
  // Get all medicines for current user
  getAll: async () => {
    return await apiCall('/medicines/');
  },

  // Get single medicine
  getById: async (id) => {
    return await apiCall(`/medicines/${id}/`);
  },

  // Create new medicine
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

  // Delete medicine
  delete: async (id) => {
    return await apiCall(`/medicines/${id}/`, {
      method: 'DELETE',
    });
  },

  // Get medicines for a specific patient (for pharmacy admins)
  getPatientMedicines: async (patientId) => {
    return await apiCall(`/medicines/patient/${patientId}/`);
  },

  // Search medicines by name
  search: async (query, activeOnly = false) => {
    const params = new URLSearchParams({ q: query });
    if (activeOnly) {
      params.append('active_only', 'true');
    }
    return await apiCall(`/medicines/search_by_name/?${params.toString()}`);
  },
};

// Dose Management API
export const doseAPI = {
  // Get dose history
  getHistory: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    return await apiCall(`/doses/history/?${params}`);
  },

  // Mark dose as taken
  markTaken: async (doseId) => {
    return await apiCall(`/doses/${doseId}/taken/`, {
      method: 'POST',
    });
  },

  // Mark dose as missed
  markMissed: async (doseId) => {
    return await apiCall(`/doses/${doseId}/missed/`, {
      method: 'POST',
    });
  },

  // Snooze dose
  snooze: async (doseId, minutes = 30) => {
    return await apiCall(`/doses/${doseId}/snooze/`, {
      method: 'POST',
      body: JSON.stringify({ snooze_minutes: minutes }),
    });
  },

  // Get pending doses
  getPending: async () => {
    return await apiCall('/doses/pending/');
  },

  // Check for missed doses
  checkMissed: async () => {
    return await apiCall('/doses/check-missed/');
  },

  // Send immediate reminder
  sendReminder: async (doseId) => {
    return await apiCall(`/doses/send-reminder/${doseId}/`, {
      method: 'POST',
    });
  },
};

// Analytics API
export const analyticsAPI = {
  // Get dashboard data
  getDashboard: async () => {
    return await apiCall('/analytics/dashboard/');
  },

  // Get patient adherence report
  getPatientAdherence: async (patientId, period = '30days') => {
    return await apiCall(`/analytics/patient-adherence/?patient_id=${patientId}&period=${period}`);
  },

  // Get pharmacy performance report
  getPharmacyPerformance: async (period = '30days') => {
    return await apiCall(`/analytics/pharmacy-performance/?period=${period}`);
  },

  // Get medicine usage report
  getMedicineUsage: async (period = '30days') => {
    return await apiCall(`/analytics/medicine-usage/?period=${period}`);
  },

  // Get adherence trends
  getAdherenceTrends: async (period = '90days') => {
    return await apiCall(`/analytics/adherence-trends/?period=${period}`);
  },

  // Get export center data
  getExportCenter: async () => {
    return await apiCall('/analytics/export-center/');
  },

  // Download export file
  downloadExport: async (exportId) => {
    const response = await fetch(`${API_BASE_URL}/analytics/download/${exportId}/`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to download export');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${exportId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// Interaction Checker API
export const interactionAPI = {
  // Check drug interactions
  check: async (medicineIds) => {
    return await apiCall('/interactions/check/', {
      method: 'POST',
      body: JSON.stringify({ medicine_ids: medicineIds }),
    });
  },
  // Get interaction history
  getHistory: async () => {
    return await apiCall('/interactions/history/');
  },
  // Get interaction details
  getDetails: async (checkId) => {
    return await apiCall(`/interactions/details/${checkId}/`);
  },
  // Add allergy
  addAllergy: async (allergyData) => {
    return await apiCall('/interactions/add-allergy/', {
      method: 'POST',
      body: JSON.stringify(allergyData),
    });
  },
  // Delete allergy
  deleteAllergy: async (allergyId) => {
    return await apiCall(`/interactions/delete-allergy/${allergyId}/`, {
      method: 'DELETE',
    });
  },
  // Initialize drug database
  initializeDatabase: async () => {
    return await apiCall('/interactions/initialize-drug-database/', {
      method: 'POST',
    });
  },
};

// Safety Check API
export const safetyAPI = {
  // Safety check for a specific medicine
  safetyCheck: async (medicineId, populationType) => {
    return await apiCall('/api/safety-check/safety_check/', {
      method: 'POST',
      body: JSON.stringify({ 
        medicine_id: medicineId, 
        population_type: populationType 
      }),
    });
  },
  
  // Get food advice for user's medicines
  foodAdvice: async () => {
    return await apiCall('/api/safety-check/food_advice/');
  },
  
  // Get contraindications for user's population type
  contraindications: async (populationType) => {
    return await apiCall('/api/safety-check/contraindications/', {
      method: 'GET',
      params: { population_type: populationType }
    });
  },
};

// Notification API
export const notificationAPI = {
  // Get notification center data
  getCenter: async () => {
    return await apiCall('/notifications/');
  },

  // Get notification settings
  getSettings: async () => {
    return await apiCall('/notifications/settings/');
  },

  // Update notification settings
  updateSettings: async (settings) => {
    return await apiCall('/notifications/settings/', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  // Check for pending notifications
  checkPending: async () => {
    return await apiCall('/notifications/check-pending/');
  },

  // Check for missed dose notifications
  checkMissedDoses: async () => {
    return await apiCall('/notifications/check-missed-doses/');
  },
};

// Alarm/Reminder System API
export const alarmAPI = {
  // Get active alarms
  getActive: async () => {
    return await apiCall('/alarms/active/');
  },

  // Get alarm details
  getDetails: async (groupId) => {
    return await apiCall(`/alarms/${groupId}/`);
  },

  // Mark group as taken
  markGroupTaken: async (groupId) => {
    return await apiCall(`/alarms/${groupId}/taken/`, {
      method: 'POST',
    });
  },

  // Dismiss alarm
  dismiss: async (groupId) => {
    return await apiCall(`/alarms/${groupId}/dismiss/`, {
      method: 'POST',
    });
  },

  // Snooze alarm
  snooze: async (groupId, minutes = 30) => {
    return await apiCall(`/alarms/${groupId}/snooze/`, {
      method: 'POST',
      body: JSON.stringify({ snooze_minutes: minutes }),
    });
  },

  // Check reminders (real-time)
  checkReminders: async () => {
    return await apiCall('/check-reminders/');
  },
};

// Chatbot API
export const chatbotAPI = {
  // Send message to chatbot
  sendMessage: async (message, sessionId = null) => {
    return await apiCall('/chat/send/', {
      method: 'POST',
      body: JSON.stringify({ 
        message: message,
        session_id: sessionId 
      }),
    });
  },

  // Get chat history
  getHistory: async () => {
    return await apiCall('/chat/history/');
  },

  // Get chatbot view
  getView: async () => {
    return await apiCall('/chat/');
  },
};

// User Profile API
export const profileAPI = {
  // Get user profile
  get: async () => {
    return await apiCall('/auth/profile/');
  },

  // Update user profile
  update: async (profileData) => {
    return await apiCall('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = localStorage.getItem('access_token');
    const url = `${API_BASE_URL}/auth/upload-avatar/`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Token ${token}` }),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.detail || 'Failed to upload avatar');
    }

    return await response.json();
  },

  // Remove avatar
  removeAvatar: async () => {
    return await apiCall('/auth/remove-avatar/', {
      method: 'DELETE',
    });
  },
};

// Dashboard Stats API
export const dashboardAPI = {
  // Get dashboard statistics
  getStats: async () => {
    return await apiCall('/dashboard-stats/');
  },
};

// Export all APIs for easy import
export default {
  auth: authAPI,
  medicine: medicineAPI,
  dose: doseAPI,
  analytics: analyticsAPI,
  interaction: interactionAPI,
  notification: notificationAPI,
  alarm: alarmAPI,
  chatbot: chatbotAPI,
  profile: profileAPI,
  dashboard: dashboardAPI,
};
