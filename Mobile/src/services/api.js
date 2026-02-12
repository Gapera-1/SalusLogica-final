import axios from 'axios';

// API base configuration
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear it
      clearAuthToken();
      // You could implement token refresh here
    }
    return Promise.reject(error);
  }
);

// Token management functions
export const getAuthToken = () => {
  try {
    // For React Native, we'll use AsyncStorage
    // This will be implemented in the auth service
    return null; // Placeholder
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    // For React Native, we'll use AsyncStorage
    // This will be implemented in the auth service
    console.log('Setting auth token:', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const clearAuthToken = () => {
  try {
    // For React Native, we'll use AsyncStorage
    // This will be implemented in the auth service
    console.log('Clearing auth token');
  } catch (error) {
    console.error('Error clearing auth token:', error);
  }
};

export default api;
