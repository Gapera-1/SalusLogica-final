import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI, userAPI, storeAuthTokens, clearAuthData } from '../services/api';
import { userStorage, tokenStorage, clearAllStorage } from '../services/storage';

/**
 * AuthContext - Manages authentication state and user data
 * Mirrors web app's authentication logic
 */
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignout, setIsSignout] = useState(false);

  // Initialize auth state on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        // Try to restore session from storage
        const [savedUser, { accessToken }] = await Promise.all([
          userStorage.getUser(),
          tokenStorage.getTokens(),
        ]);

        if (savedUser && accessToken) {
          setUser(savedUser);
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  /**
   * Login handler
   */
  const signIn = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });

      // Store tokens
      if (response.access) {
        await storeAuthTokens(response.access, response.refresh || null);
      }

      // Store user data
      if (response.user) {
        await userStorage.setUser(response.user);
        setUser(response.user);
      }

      return { success: true, user: response.user };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Signup handler
   * Note: Backend requires email verification before login,
   * so registration does NOT return tokens.
   */
  const signUp = async (userData) => {
    setIsLoading(true);
    try {
      const response = await authAPI.register(userData);

      // Backend requires email verification - do NOT store tokens or auto-login
      return {
        success: true,
        requiresVerification: true,
        message: response.message || 'Please check your email to verify your account.',
        email: userData.email,
      };
    } catch (error) {
      console.error('Signup error:', error);
      return {
        success: false,
        error: error.message || 'Signup failed',
      };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout handler
   */
  const signOut = async () => {
    setIsLoading(true);
    try {
      await authAPI.logout();
      await clearAllStorage();
      setUser(null);
      setIsSignout(true);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local data even if API fails
      await clearAllStorage();
      setUser(null);
      setIsSignout(true);
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Refresh user profile
   */
  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response) {
        await userStorage.setUser(response);
        setUser(response);
        return response;
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      if (error.status === 401) {
        // Token expired
        await clearAllStorage();
        setUser(null);
      }
    }
    return null;
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      if (response) {
        await userStorage.setUser(response);
        setUser(response);
        return { success: true, user: response };
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      return {
        success: false,
        error: error.message || 'Failed to update profile',
      };
    }
  };

  /**
   * Get current user
   */
  const authContext = {
    signIn,
    signUp,
    signOut,
    refreshUser,
    updateProfile,
    user,
    isLoading,
    isSignout,
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
