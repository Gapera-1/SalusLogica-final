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

// Light theme colors - Healthcare Teal palette (matching medicine-reminder web app)
export const lightTheme = {
  dark: false,
  colors: {
    // Primary healthcare teal
    primary: '#0d9488',
    primaryLight: '#14b8a6',
    primaryDark: '#0f766e',
    // Accent coral (for CTAs)
    accent: '#f97316',
    accentLight: '#fb923c',
    // Backgrounds
    background: '#f1f5f9',
    surface: '#ffffff',
    card: '#ffffff',
    // Text
    text: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#94a3b8',
    // Borders
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    // Semantic colors
    error: '#dc2626',
    errorLight: '#fee2e2',
    success: '#059669',
    successLight: '#d1fae5',
    warning: '#d97706',
    warningLight: '#fef3c7',
    info: '#0284c7',
    infoLight: '#e0f2fe',
    // Status
    notification: '#dc2626',
    // Healthcare specific
    safe: '#059669',
    danger: '#dc2626',
    caution: '#d97706',
  },
};

// Dark theme colors - Healthcare Teal palette
export const darkTheme = {
  dark: true,
  colors: {
    // Primary healthcare teal (lighter for dark mode)
    primary: '#2dd4bf',
    primaryLight: '#5eead4',
    primaryDark: '#14b8a6',
    // Accent coral
    accent: '#fb923c',
    accentLight: '#fdba74',
    // Backgrounds
    background: '#0f172a',
    surface: '#1e293b',
    card: '#1e293b',
    // Text
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    textMuted: '#64748b',
    // Borders
    border: '#334155',
    borderLight: '#1e293b',
    // Semantic colors
    error: '#f87171',
    errorLight: '#450a0a',
    success: '#34d399',
    successLight: '#064e3b',
    warning: '#fbbf24',
    warningLight: '#451a03',
    info: '#38bdf8',
    infoLight: '#0c4a6e',
    // Status
    notification: '#f87171',
    // Healthcare specific
    safe: '#34d399',
    danger: '#f87171',
    caution: '#fbbf24',
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
