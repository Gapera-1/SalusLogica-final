import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [loading, setLoading] = useState(true);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const initTheme = () => {
      try {
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        } else {
          // Check system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Error loading theme:', error);
        setTheme('light');
      } finally {
        setLoading(false);
      }
    };

    initTheme();
  }, []);

  // Apply theme to document root
  useEffect(() => {
    if (!loading) {
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, loading]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Theme changed to:', newTheme);
  };

  const setThemeMode = (mode) => {
    if (mode === 'light' || mode === 'dark') {
      setTheme(mode);
      localStorage.setItem('theme', mode);
    }
  };

  const value = {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme: setThemeMode,
    loading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
