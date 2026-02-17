import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Centralized AsyncStorage management
 * Provides typed access to stored data
 */

// Storage keys
const STORAGE_KEYS = {
  USER: 'user',
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  MEDICINES: 'medicines_cache',
  DOSE_LOGS: 'dose_logs_cache',
  ALARMS: 'alarms_cache',
  SETTINGS: 'app_settings',
  LANGUAGE: 'app_language',
  TIMEZONE: 'user_timezone',
  LAST_SYNC: 'last_sync_time',
};

/**
 * User Storage
 */
export const userStorage = {
  async getUser() {
    try {
      const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  async setUser(user) {
    try {
      if (user) {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
      }
    } catch (error) {
      console.error('Error setting user:', error);
    }
  },

  async clearUser() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    } catch (error) {
      console.error('Error clearing user:', error);
    }
  },
};

/**
 * Token Storage
 */
export const tokenStorage = {
  async getTokens() {
    try {
      const [accessToken, refreshToken] = await AsyncStorage.multiGet([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
      return {
        accessToken: accessToken[1],
        refreshToken: refreshToken[1],
      };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  },

  async setTokens(accessToken, refreshToken) {
    try {
      const items = [];
      if (accessToken) items.push([STORAGE_KEYS.ACCESS_TOKEN, accessToken]);
      if (refreshToken) items.push([STORAGE_KEYS.REFRESH_TOKEN, refreshToken]);

      if (items.length > 0) {
        await AsyncStorage.multiSet(items);
      }
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
      ]);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },
};

/**
 * Medicines Cache Storage
 */
export const medicinesStorage = {
  async getMedicines() {
    try {
      const medicines = await AsyncStorage.getItem(STORAGE_KEYS.MEDICINES);
      return medicines ? JSON.parse(medicines) : [];
    } catch (error) {
      console.error('Error getting medicines cache:', error);
      return [];
    }
  },

  async setMedicines(medicines) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.MEDICINES,
        JSON.stringify(medicines)
      );
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error setting medicines cache:', error);
    }
  },

  async clearMedicines() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MEDICINES);
    } catch (error) {
      console.error('Error clearing medicines cache:', error);
    }
  },
};

/**
 * Dose Logs Cache Storage
 */
export const doseLogsStorage = {
  async getDoseLogs() {
    try {
      const logs = await AsyncStorage.getItem(STORAGE_KEYS.DOSE_LOGS);
      return logs ? JSON.parse(logs) : [];
    } catch (error) {
      console.error('Error getting dose logs cache:', error);
      return [];
    }
  },

  async setDoseLogs(logs) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DOSE_LOGS, JSON.stringify(logs));
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_SYNC,
        new Date().toISOString()
      );
    } catch (error) {
      console.error('Error setting dose logs cache:', error);
    }
  },

  async clearDoseLogs() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.DOSE_LOGS);
    } catch (error) {
      console.error('Error clearing dose logs cache:', error);
    }
  },
};

/**
 * Alarms Cache Storage
 */
export const alarmsStorage = {
  async getAlarms() {
    try {
      const alarms = await AsyncStorage.getItem(STORAGE_KEYS.ALARMS);
      return alarms ? JSON.parse(alarms) : [];
    } catch (error) {
      console.error('Error getting alarms cache:', error);
      return [];
    }
  },

  async setAlarms(alarms) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ALARMS, JSON.stringify(alarms));
    } catch (error) {
      console.error('Error setting alarms cache:', error);
    }
  },

  async clearAlarms() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ALARMS);
    } catch (error) {
      console.error('Error clearing alarms cache:', error);
    }
  },
};

/**
 * Settings Storage
 */
export const settingsStorage = {
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
      return settings ? JSON.parse(settings) : {};
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  },

  async setSetting(key, value) {
    try {
      const settings = await this.getSettings();
      settings[key] = value;
      await AsyncStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(settings)
      );
    } catch (error) {
      console.error('Error setting setting:', error);
    }
  },

  async getSetting(key, defaultValue = null) {
    try {
      const settings = await this.getSettings();
      return settings[key] ?? defaultValue;
    } catch (error) {
      console.error('Error getting setting:', error);
      return defaultValue;
    }
  },

  async clearSettings() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SETTINGS);
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  },
};

/**
 * Language Storage
 */
export const languageStorage = {
  async getLanguage() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE) || 'en';
    } catch (error) {
      console.error('Error getting language:', error);
      return 'en';
    }
  },

  async setLanguage(language) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch (error) {
      console.error('Error setting language:', error);
    }
  },
};

/**
 * Timezone Storage
 */
export const timezoneStorage = {
  async getTimezone() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.TIMEZONE) || 'UTC';
    } catch (error) {
      console.error('Error getting timezone:', error);
      return 'UTC';
    }
  },

  async setTimezone(timezone) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIMEZONE, timezone);
    } catch (error) {
      console.error('Error setting timezone:', error);
    }
  },
};

/**
 * Clear all storage (for logout)
 */
export const clearAllStorage = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER,
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.MEDICINES,
      STORAGE_KEYS.DOSE_LOGS,
      STORAGE_KEYS.ALARMS,
      STORAGE_KEYS.LAST_SYNC,
    ]);
    // Keep settings, language, and timezone
  } catch (error) {
    console.error('Error clearing all storage:', error);
  }
};

/**
 * Get last sync time
 */
export const getLastSyncTime = async () => {
  try {
    const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return time ? new Date(time) : null;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

export default {
  STORAGE_KEYS,
  userStorage,
  tokenStorage,
  medicinesStorage,
  doseLogsStorage,
  alarmsStorage,
  settingsStorage,
  languageStorage,
  timezoneStorage,
  clearAllStorage,
  getLastSyncTime,
};
