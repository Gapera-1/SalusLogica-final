# 📱 Mobile App Developer Implementation Guide

## Quick Start

### Step 1: Install New Dependencies
```bash
cd Mobile
npm install expo-notifications expo-audio expo-speech
```

### Step 2: Understand the Architecture

#### New Files Created ✅
- `src/services/api.js` - Web app API service (synced!)
- `src/services/storage.js` - AsyncStorage centralization
- `src/contexts/AuthContext.js` - Authentication state management
- `src/hooks/useAlarmManager.js` - Alarm polling & notifications
- `src/screens/LoginScreen_NEW.js` - Template login screen

#### Key Changes
- ✅ All API calls now match web app exactly
- ✅ AsyncStorage properly integrated for tokens/user data
- ✅ Alarm system with proper notification handling
- ✅ Timezone auto-detection
- ✅ Session persistence

---

## Architecture Overview

### Data Flow

```
User Interaction
    ↓
Screen Component (e.g., LoginScreen)
    ↓
Custom Hook (useAlarmManager) / Context (AuthContext)
    ↓
API Service (authAPI, medicineAPI, etc.)
    ↓
AsyncStorage (for offline + persistence)
    ↓
Backend API
```

### Authentication Flow

```
1. User enters email/password
   ↓
2. LoginScreen calls authContext.signIn(email, password)
   ↓
3. authAPI.login() makes API call
   ↓
4. Backend returns { access_token, refresh_token, user }
   ↓
5. storeAuthTokens() saves tokens to AsyncStorage
   ↓
6. userStorage.setUser() saves user data
   ↓
7. AuthContext updates state → Navigation changes
```

### Alarm Flow

```
1. App starts: useAlarmManager initializes
   ↓
2. Requests notification permissions
   ↓
3. Starts polling every 30 seconds
   ↓
4. Each poll: alarmAPI.getActive()
   ↓
5. If new alarm detected:
   ├─ Send local notification
   ├─ Play alarm sound
   ├─ Announce via TTS
   └─ Show AlarmScreen
```

---

## How to Implement Each Screen

### Template Pattern

```javascript
// 1. IMPORTS
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { medicineAPI } from '../services/api';
import { medicinesStorage } from '../services/storage';

// 2. COMPONENT
export default function YourScreen({ navigation }) {
  // 3. HOOKS
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 4. EFFECTS
  useEffect(() => {
    fetchData();
  }, []);

  // 5. FUNCTIONS
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await medicineAPI.getAll();
      
      // Cache locally
      await medicinesStorage.setMedicines(result);
      
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
      
      // Fallback to cached data
      const cached = await medicinesStorage.getMedicines();
      setData(cached);
    } finally {
      setLoading(false);
    }
  };

  // 6. RENDER
  if (loading) return <ActivityIndicator size="large" style={styles.center} />;
  
  if (error && !data) {
    return (
      <View style={styles.center}>
        <Text>Error: {error}</Text>
        <Button onPress={fetchData}>Retry</Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Your UI here */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

---

## API Usage Examples

### Authentication API
```javascript
import { authAPI } from '../services/api';
import { storeAuthTokens } from '../services/api';

// Login
const result = await authAPI.login({
  email: 'user@example.com',
  password: 'password123',
});
await storeAuthTokens(result.access, result.refresh);

// Get current user
const user = await authAPI.getCurrentUser();

// Update profile
const updated = await authAPI.updateProfile({
  timezone: 'Africa/Nairobi',
  language: 'en',
});
```

### Medicine API
```javascript
import { medicineAPI } from '../services/api';
import { medicinesStorage } from '../services/storage';

// Get all medicines
const medicines = await medicineAPI.getAll();

// Create new medicine
const newMedicine = await medicineAPI.create({
  name: 'Aspirin',
  dosage: '500mg',
  frequency: 'Twice daily',
  reminder_times: ['08:00', '20:00'],
  stock_level: 30,
});

// Update medicine
const updated = await medicineAPI.update(medicineId, {
  stock_level: 25,
});

// Delete medicine
await medicineAPI.delete(medicineId);

// Cache locally
await medicinesStorage.setMedicines(medicines);
```

### Alarm API
```javascript
import { alarmAPI } from '../services/api';
import useAlarmManager from '../hooks/useAlarmManager';

// In a screen component
const { markDoseTaken, dismissAlarm, snoozeAlarm } = useAlarmManager();

// Mark dose as taken
const result = await markDoseTaken([doseLodId1, doseLodId2]);

// Dismiss alarm
await dismissAlarm(alarmId);

// Snooze for 5 minutes
await snoozeAlarm(alarmId, 5);

// Get diagnostic info
const diag = await alarmAPI.diagnose();
console.log('User timezone:', diag.user_timezone);
console.log('Minutes until next alarm:', diag.next_alarm.minutes_until_alarm);
```

### Dose History API
```javascript
import { doseAPI } from '../services/api';

// Get dose history for last 7 days
const logs = await doseAPI.getHistory({
  days: 7,
});

// Log a dose taken now
const newLog = await doseAPI.logDose({
  medicine_id: medicineId,
  timestamp: new Date().toISOString(),
  notes: 'Taken with food',
});
```

### Analytics API
```javascript
import { analyticsAPI } from '../services/api';

// Get dashboard data
const dashboard = await analyticsAPI.getDashboard();

// Get adherence rate
const adherence = await analyticsAPI.getAdherence({
  days: 30,
});

// Get trends
const trends = await analyticsAPI.getTrends({
  type: 'adherence',
});
```

### Medicine Info API
```javascript
import { medicineInfoAPI } from '../services/api';

// Check drug interactions
const interactions = await medicineInfoAPI.checkInteractions([
  medicineId1,
  medicineId2,
]);

// Get food advice for medicine
const foodAdvice = await medicineInfoAPI.getFoodAdvice(medicineId);

// Get contra-indications
const contraIndications = await medicineInfoAPI.getContraIndications(medicineId);

// Get safety information
const safety = await medicineInfoAPI.getSafetyInfo(medicineId);
```

---

## Storage Usage Examples

### User Storage
```javascript
import { userStorage } from '../services/storage';

// Get stored user
const user = await userStorage.getUser();

// Store user after login
await userStorage.setUser(userData);

// Clear on logout
await userStorage.clearUser();
```

### Settings Storage
```javascript
import { settingsStorage } from '../services/storage';

// Get specific setting
const theme = await settingsStorage.getSetting('theme', 'light');

// Set a setting
await settingsStorage.setSetting('notifications_enabled', true);

// Get all settings
const allSettings = await settingsStorage.getSettings();

// Clear all settings
await settingsStorage.clearSettings();
```

### Cache Management
```javascript
import { medicinesStorage } from '../services/storage';

// Cache medicines after API call
const medicines = await medicineAPI.getAll();
await medicinesStorage.setMedicines(medicines);

// Use cached data if offline
const cached = await medicinesStorage.getMedicines();

// Clear cache (rarely needed)
await medicinesStorage.clearMedicines();
```

---

## Common Implementation Patterns

### Pattern 1: Fetch + Cache
```javascript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetch = async () => {
    try {
      // Try API
      const result = await medicineAPI.getAll();
      await medicinesStorage.setMedicines(result);
      setData(result);
    } catch (error) {
      // Fallback to cache
      const cached = await medicinesStorage.getMedicines();
      setData(cached || []);
    } finally {
      setLoading(false);
    }
  };
  
  fetch();
}, []);
```

### Pattern 2: Form Submission
```javascript
const [loading, setLoading] = useState(false);
const [errors, setErrors] = useState({});

const handleSubmit = async () => {
  // Validate
  if (!validateForm()) return;

  setLoading(true);
  try {
    const result = await medicineAPI.create(formData);
    
    // Show success
    showSnackbar('Medicine added successfully!');
    
    // Navigate or refresh
    navigation.goBack();
  } catch (error) {
    showSnackbar(error.message, 'error');
  } finally {
    setLoading(false);
  }
};
```

### Pattern 3: Delete with Confirmation
```javascript
const handleDelete = async (medicineId) => {
  Alert.alert(
    'Delete Medicine',
    'Are you sure you want to delete this medicine?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await medicineAPI.delete(medicineId);
            showSnackbar('Medicine deleted');
            // Refresh list
            fetchMedicines();
          } catch (error) {
            showSnackbar(error.message, 'error');
          }
        },
      },
    ]
  );
};
```

### Pattern 4: Alarm Handling
```javascript
import useAlarmManager from '../hooks/useAlarmManager';

export default function AlarmScreen({ route }) {
  const { alarm } = route.params;
  const { markDoseTaken, snoozeAlarm } = useAlarmManager();

  const handleTake = async () => {
    const result = await markDoseTaken(alarm.dose_log_ids);
    if (result.success) {
      navigation.goBack();
    }
  };

  const handleSnooze = async () => {
    await snoozeAlarm(alarm.id, 5);
    navigation.goBack();
  };

  return (
    <View>
      <Text>{alarm.medicines.map(m => m.name).join(', ')}</Text>
      <Button onPress={handleTake}>Take Now</Button>
      <Button onPress={handleSnooze}>Snooze 5 min</Button>
    </View>
  );
}
```

---

## Debugging & Troubleshooting

### Check API Connection
```javascript
import { alarmAPI } from '../services/api';

// Test endpoint
const diag = await alarmAPI.diagnose();
console.log('Diagnose:', diag);
```

### Check Stored Data
```javascript
import { medicinesStorage, userStorage } from '../services/storage';

const medicines = await medicinesStorage.getMedicines();
const user = await userStorage.getUser();
console.log('Stored medicines:', medicines);
console.log('Stored user:', user);
```

### Check Device Timezone
```javascript
const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('Device timezone:', tz);
```

### Monitor Alarm Polling
```javascript
// In useAlarmManager hook, it logs:
console.log('Starting alarm polling (every 30 seconds)');
console.log('New alarm detected:', alarm);
console.log('Stopped alarm polling');
```

---

## Next Steps After Implementation

1. **Test on Device:** Use physical iPhone or Android device
2. **Use Debugger:** Enable Expo debugger for console.logs
3. **Check Logs:** Monitor both Android logcat and iOS console
4. **Performance:** Profile app for memory leaks
5. **Build:** Create production APK/IPA for app stores

---

## File Locations Quick Reference

| Task | File | Status |
|------|------|--------|
| Authentication | `contexts/AuthContext.js` | ✅ Ready |
| API Calls | `services/api.js` | ✅ Ready |
| Data Caching | `services/storage.js` | ✅ Ready |
| Alarm System | `hooks/useAlarmManager.js` | ✅ Ready |
| Login Example | `screens/LoginScreen_NEW.js` | ✅ Template |
| Global Config | `App.js` | 🟡 Update needed |

---

## Support & References

### Web App Reference Files
- Medicine form: `medicine-reminder/src/components/MedicineForm.jsx`
- Alarm UI: `medicine-reminder/src/components/ActiveAlarm.jsx`
- API patterns: `medicine-reminder/src/services/api.js`
- Auth logic: `medicine-reminder/src/pages/Login.jsx`

### Expo Documentation
- Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Audio: https://docs.expo.dev/versions/latest/sdk/audio/
- Speech: https://docs.expo.dev/versions/latest/sdk/speech/

### React Native Paper
- Components: https://callstack.github.io/react-native-paper/
- Theming: https://callstack.github.io/react-native-paper/theming.html

---

**Questions?** Check `MOBILE_IMPLEMENTATION_STATUS.md` for progress tracking  
**Need help?** Review `MOBILE_SYNC_PLAN.md` for architecture overview
