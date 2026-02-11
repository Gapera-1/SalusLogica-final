// Internationalization service for React frontend
// Integrates with Django backend multilingual support

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Available languages
export const LANGUAGES = {
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' },
  rw: { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
};

// Default language
export const DEFAULT_LANGUAGE = 'en';

// Get current language from localStorage or browser
export const getCurrentLanguage = () => {
  const stored = localStorage.getItem('saluslogica_language');
  if (stored && LANGUAGES[stored]) {
    return stored;
  }
  
  // Fallback to browser language
  const browserLang = navigator.language.split('-')[0];
  return LANGUAGES[browserLang] ? browserLang : DEFAULT_LANGUAGE;
};

// Set language preference
export const setLanguage = async (languageCode) => {
  try {
    // Store in localStorage
    localStorage.setItem('saluslogica_language', languageCode);
    
    // Update backend user preference if authenticated
    const token = localStorage.getItem('access_token');
    if (token) {
      await axios.post(
        `${API_BASE_URL}/api/user/language/`,
        { preferred_language: languageCode },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Reload page to apply language changes
    window.location.reload();
    
  } catch (error) {
    console.error('Failed to set language:', error);
    // Still update local storage even if backend fails
    localStorage.setItem('saluslogica_language', languageCode);
  }
};

// Get translations from backend
export const getTranslations = async (languageCode) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/translations/${languageCode}/`,
      {
        headers: {
          'Accept-Language': languageCode,
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch translations:', error);
    return {};
  }
};

// Translation cache
let translationCache = {};

// Translate function
export const t = (key, params = {}) => {
  const currentLang = getCurrentLanguage();
  const translations = translationCache[currentLang] || {};
  
  let translation = translations[key] || key;
  
  // Replace parameters
  Object.keys(params).forEach(param => {
    translation = translation.replace(`%(${param})s`, params[param]);
  });
  
  return translation;
};

// Load translations for current language
export const loadTranslations = async () => {
  const currentLang = getCurrentLanguage();
  
  if (!translationCache[currentLang]) {
    try {
      const translations = await getTranslations(currentLang);
      translationCache[currentLang] = translations;
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }
  
  return translationCache[currentLang] || {};
};

// Format date according to language
export const formatDate = (date, options = {}) => {
  const currentLang = getCurrentLanguage();
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat(currentLang, defaultOptions).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
};

// Format time according to language
export const formatTime = (date, options = {}) => {
  const currentLang = getCurrentLanguage();
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  
  try {
    return new Intl.DateTimeFormat(currentLang, defaultOptions).format(date);
  } catch (error) {
    return date.toLocaleTimeString();
  }
};

// Format number according to language
export const formatNumber = (number, options = {}) => {
  const currentLang = getCurrentLanguage();
  
  try {
    return new Intl.NumberFormat(currentLang, options).format(number);
  } catch (error) {
    return number.toString();
  }
};

// Language switcher component data
export const getLanguageOptions = () => {
  return Object.values(LANGUAGES).map(lang => ({
    value: lang.code,
    label: `${lang.flag} ${lang.name}`,
    ...lang
  }));
};

// Initialize i18n
export const initializeI18n = async () => {
  await loadTranslations();
  
  // Set HTML lang attribute
  document.documentElement.lang = getCurrentLanguage();
  
  // Set direction for RTL languages (if needed in future)
  const rtlLanguages = ['ar', 'he', 'fa'];
  if (rtlLanguages.includes(getCurrentLanguage())) {
    document.documentElement.dir = 'rtl';
  } else {
    document.documentElement.dir = 'ltr';
  }
};

// React hook for translations
export const useTranslation = () => {
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLang = async () => {
      setLoading(true);
      try {
        const trans = await loadTranslations();
        setTranslations(trans);
      } catch (error) {
        console.error('Failed to load translations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLang();
  }, [currentLanguage]);

  const changeLanguage = async (languageCode) => {
    setCurrentLanguage(languageCode);
    await setLanguage(languageCode);
  };

  return {
    currentLanguage,
    translations,
    loading,
    t: (key, params = {}) => t(key, params),
    changeLanguage,
    formatDate,
    formatTime,
    formatNumber,
    languages: LANGUAGES,
    languageOptions: getLanguageOptions(),
  };
};

// Export default for convenience
export default {
  LANGUAGES,
  DEFAULT_LANGUAGE,
  getCurrentLanguage,
  setLanguage,
  getTranslations,
  t,
  loadTranslations,
  formatDate,
  formatTime,
  formatNumber,
  getLanguageOptions,
  initializeI18n,
  useTranslation,
};
