import React, { createContext, useState, useEffect } from 'react';
import en from './en.json';
import fr from './fr.json';
import rw from './rw.json';

const LanguageContext = createContext();

const translations = {
  en,
  fr,
  rw
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loadingLanguage, setLoadingLanguage] = useState(true);

  // Load language preference from localStorage and API on mount
  useEffect(() => {
    const initLanguage = async () => {
      try {
        // First check localStorage
        const savedLanguage = localStorage.getItem('preferredLanguage');
        if (savedLanguage && translations[savedLanguage]) {
          setLanguage(savedLanguage);
        } else {
          // Default to English
          setLanguage('en');
        }
      } catch (error) {
        console.error('Error loading language:', error);
        setLanguage('en');
      } finally {
        setLoadingLanguage(false);
      }
    };

    initLanguage();
  }, []);

  const changeLanguage = (newLanguage) => {
    if (translations[newLanguage]) {
      setLanguage(newLanguage);
      localStorage.setItem('preferredLanguage', newLanguage);
      console.log('Language changed to:', newLanguage);
    }
  };

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if translation not found
        value = translations.en;
        for (const fallbackK of keys) {
          if (value && typeof value === 'object' && fallbackK in value) {
            value = value[fallbackK];
          } else {
            return key; // Return the key if not found
          }
        }
        return value;
      }
    }

    return value;
  };

  const value = {
    language,
    setLanguage: changeLanguage,
    t,
    languages: ['en', 'fr', 'rw'],
    loadingLanguage,
    translationData: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export default LanguageContext;
