import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Storage keys
const AUTH_TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

// Authentication API functions
export const authAPI = {
  // Login user
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login/', credentials);
      const { access, refresh, user } = response.data;
      
      // Store token and user data
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, access);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      
      return { success: true, user, token: access };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Register user
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register/', userData);
      const { access, refresh, user } = response.data;
      
      // Store token and user data
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, access);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      
      return { success: true, user, token: access };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await api.get('/auth/user/');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async () => {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
};

// Medicine API functions
export const medicineAPI = {
  // Get all medicines for current user
  getAll: async () => {
    try {
      const response = await api.get('/medicines/');
      return response.data;
    } catch (error) {
      console.error('Get medicines error:', error);
      throw error;
    }
  },

  // Add new medicine
  create: async (medicineData) => {
    try {
      const response = await api.post('/medicines/', medicineData);
      return response.data;
    } catch (error) {
      console.error('Create medicine error:', error);
      throw error;
    }
  },

  // Update medicine
  update: async (id, medicineData) => {
    try {
      const response = await api.put(`/medicines/${id}/`, medicineData);
      return response.data;
    } catch (error) {
      console.error('Update medicine error:', error);
      throw error;
    }
  },

  // Delete medicine
  delete: async (id) => {
    try {
      await api.delete(`/medicines/${id}/`);
      return { success: true };
    } catch (error) {
      console.error('Delete medicine error:', error);
      throw error;
    }
  },

  // Get dose history
  getDoseHistory: async (filters) => {
    try {
      const response = await api.get('/medicines/dose-history/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Get dose history error:', error);
      throw error;
    }
  },

  // Get food advice
  getFoodAdvice: async (medicine) => {
    try {
      const response = await api.get(`/medicines/food-advice/${medicine}/`);
      return response.data;
    } catch (error) {
      console.error('Get food advice error:', error);
      throw error;
    }
  },

  // Check safety
  checkSafety: async (data) => {
    try {
      const response = await api.post('/medicines/safety-check/', data);
      return response.data;
    } catch (error) {
      console.error('Check safety error:', error);
      throw error;
    }
  },

  // Check interactions
  checkInteractions: async (medicines) => {
    try {
      const response = await api.post('/medicines/interactions/', { medicines });
      return response.data;
    } catch (error) {
      console.error('Check interactions error:', error);
      throw error;
    }
  },

  // Get contraindications
  getContraIndications: async (medicine) => {
    try {
      const response = await api.get(`/medicines/contra-indications/${medicine}/`);
      return response.data;
    } catch (error) {
      console.error('Get contraindications error:', error);
      throw error;
    }
  },

  // Get notifications
  getNotifications: async () => {
    try {
      const response = await api.get('/medicines/notifications/');
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId) => {
    try {
      await api.patch(`/medicines/notifications/${notificationId}/`, { read: true });
      return { success: true };
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllNotificationsAsRead: async () => {
    try {
      await api.patch('/medicines/notifications/mark-all-read/', {});
      return { success: true };
    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      throw error;
    }
  }
};

// Dashboard API functions
export const dashboardAPI = {
  // Get dashboard data
  getDashboard: async () => {
    try {
      const response = await api.get('/dashboard/');
      return response.data;
    } catch (error) {
      console.error('Get dashboard error:', error);
      throw error;
    }
  }
};

// Profile API functions
export const profileAPI = {
  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/auth/profile/');
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/auth/profile/', profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  }
};

// Analytics API functions
export const analyticsAPI = {
  // Get analytics data
  getAnalytics: async () => {
    try {
      const response = await api.get('/analytics/');
      return response.data;
    } catch (error) {
      console.error('Get analytics error:', error);
      throw error;
    }
  }
};
