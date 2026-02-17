import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative inline-flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${className}`}
      style={{
        backgroundColor: isDark ? 'var(--btn-secondary-bg)' : 'var(--btn-secondary-bg)',
      }}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <Sun 
          size={20} 
          className="text-yellow-400 animate-spin-slow"
          style={{ animation: 'spin 20s linear infinite' }}
        />
      ) : (
        <Moon 
          size={20} 
          className="text-teal-600"
        />
      )}
    </button>
  );
};

export default ThemeToggle;
