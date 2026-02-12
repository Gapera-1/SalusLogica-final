import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import en from './translations/en.json';
import fr from './translations/fr.json';
import rw from './translations/rw.json';

const translations = {
  en,
  fr,
  rw,
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loadingLanguage, setLoadingLanguage] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage && translations[savedLanguage]) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setLoadingLanguage(false);
    }
  };

  const changeLanguage = async (lang) => {
    try {
      if (translations[lang]) {
        setLanguage(lang);
        await AsyncStorage.setItem('language', lang);
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }
    
    // Replace parameters in the string
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      let result = value;
      for (const [param, val] of Object.entries(params)) {
        result = result.replace(new RegExp(`%\\(${param}\\)s`, 'g'), val);
      }
      return result;
    }
    
    return value || key;
  };

  const languages = Object.keys(translations);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: changeLanguage,
        t,
        languages,
        loadingLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = React.useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
