import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Light theme colors
export const lightTheme = {
  dark: false,
  colors: {
    primary: '#2563eb',
    accent: '#3b82f6',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1f2937',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    info: '#3b82f6',
    card: '#ffffff',
    notification: '#ef4444',
  },
};

// Dark theme colors
export const darkTheme = {
  dark: true,
  colors: {
    primary: '#60a5fa',
    accent: '#3b82f6',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#d1d5db',
    border: '#374151',
    error: '#f87171',
    success: '#10b981',
    warning: '#fbbf24',
    info: '#60a5fa',
    card: '#374151',
    notification: '#f87171',
  },
};

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  // Load theme preference from AsyncStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        } else {
          // Use system preference
          setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setTheme('light');
      } finally {
        setLoading(false);
      }
    };

    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
      console.log('Theme changed to:', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setThemeMode = async (mode) => {
    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
      try {
        await AsyncStorage.setItem('theme', mode);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const currentTheme = theme === 'dark' ? darkTheme : lightTheme;

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: setThemeMode,
    loading,
    colors: currentTheme.colors,
    currentTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
