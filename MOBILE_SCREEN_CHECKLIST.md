# ⚡ Quick Reference: Screen Implementation Checklist

## Before You Start
- [ ] Run `npm install expo-notifications expo-audio expo-speech`
- [ ] Read `MOBILE_DEVELOPER_GUIDE.md`
- [ ] Update `App.js` to wrap app with `<AuthProvider>`
- [ ] Copy `LoginScreen_NEW.js` pattern for reference

---

## ✅ Implementation Template

Every screen should follow this pattern:

```javascript
// 1. IMPORTS
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Button, Text, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';  // For auth screens
import { medicineAPI } from '../services/api';       // For medicine screens
import { medicinesStorage } from '../services/storage';

// 2. COMPONENT DEFINITION
export default function ScreenName({ navigation, route }) {
  // 3. HOOKS
  const { user } = useAuth();  // Get auth user if needed
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
      await medicinesStorage.setMedicines(result); // Cache
      setData(result);
      setError(null);
    } catch (err) {
      // Fallback to cache
      const cached = await medicinesStorage.getMedicines();
      setData(cached || []);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 6. RENDER
  if (loading) return <ActivityIndicator />;
  if (error && !data) return <View><Text>{error}</Text></View>;

  return (
    <ScrollView>
      {/* YOUR UI HERE */}
    </ScrollView>
  );
}
```

---

## 📋 Screen-Specific Checklists

### 🔐 LoginScreen
**Copy:** LoginScreen_NEW.js  
**Status:** TEMPLATE PROVIDED ✅

```javascript
// Required imports
import { useAuth } from '../contexts/AuthContext';
import { timezoneStorage } from '../services/storage';

// Component needs:
☐ Email input field with validation
☐ Password input field with validation
☐ Login button (disabled while loading)
☐ Signup link/button
☐ Error message display
☐ Snackbar for showing messages
☐ Form validation function
☐ handleLogin() - calls authContext.signIn()
☐ Auto-detect timezone on success
☐ Navigation to home on success

// API used:
authAPI.login(credentials)

// Storage used:
timezoneStorage.setTimezone(timezone)
```

**Code snippet:**
```javascript
const handleLogin = async () => {
  if (!validateForm()) return;
  
  const result = await signIn(email, password);
  if (result.success) {
    const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    await timezoneStorage.setTimezone(tz);
    navigation.navigate('Home');
  } else {
    showSnackbar(result.error, 'error');
  }
};
```

---

### 📝 SignupScreen
**Similar to:** LoginScreen  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Full name input
☐ Email input with validation
☐ Password input with strength indicator
☐ Confirm password input
☐ Signup button
☐ Login link
☐ Terms agreement checkbox
☐ Form validation (matching fields, etc.)
☐ handleSignup() - calls authContext.signUp()
☐ Navigation to home on success

// API used:
authAPI.register(userData)
```

---

### 🏠 HomeScreen
**Reference:** Home.jsx, Dashboard.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Display all medicines list (medicineAPI.getAll())
☐ Show medicine name, dosage, frequency
☐ Show stock level for each medicine
☐ Show time until next alarm
☐ "Add Medicine" button → navigation to AddMedicineScreen
☐ "Take Now" quick action
☐ MedicineCard for list items
☐ Pull-to-refresh to fetch new data
☐ Offline indicator if using cached data
☐ Empty state message

// API used:
medicineAPI.getAll()

// Storage used:
medicinesStorage.getMedicines()
medicinesStorage.setMedicines()

// Code pattern:
const fetchMedicines = async () => {
  try {
    const medicines = await medicineAPI.getAll();
    await medicinesStorage.setMedicines(medicines);
    setData(medicines);
  } catch (err) {
    const cached = await medicinesStorage.getMedicines();
    setData(cached || []);
  }
};
```

---

### ➕ AddMedicineScreen
**Reference:** AddMedicine.jsx, MedicineForm.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Medicine name input (required)
☐ Dosage input (required, e.g., "500mg")
☐ Frequency dropdown (e.g., "Twice daily")
☐ Reminder times picker (multiple times)
☐ Stock level input (required, number)
☐ Food interaction checkbox
☐ Special instructions textarea
☐ Save button
☐ Cancel button
☐ Form validation
☐ Loading state while saving
☐ Success/error message
☐ Navigate back on success

// API used:
medicineAPI.create(medicineData)

// Validation needed:
- Medicine name not empty
- Dosage not empty
- Frequency selected
- At least one reminder time
- Stock level > 0
- Times in valid format

// Code pattern:
const handleSave = async () => {
  if (!validateForm()) return;
  
  try {
    const result = await medicineAPI.create({
      name: medicineName,
      dosage: dosage,
      frequency: frequency,
      reminder_times: times,
      stock_level: stockLevel,
      food_interaction: hasFoodInteraction,
      notes: instructions,
    });
    
    showSnackbar('Medicine added!');
    navigation.goBack();
  } catch (error) {
    showSnackbar(error.message, 'error');
  }
};
```

---

### ✏️ EditMedicineScreen
**Reference:** EditMedicine.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Load medicine data on mount
☐ Pre-fill all form fields
☐ Edit button to modify
☐ Delete button with confirmation
☐ Save button for updates
☐ Cancel button
☐ All same fields as AddMedicineScreen

// API used:
medicineAPI.getById(medicineId)
medicineAPI.update(medicineId, data)
medicineAPI.delete(medicineId)

// Code pattern:
useEffect(() => {
  const loadMedicine = async () => {
    const med = await medicineAPI.getById(route.params.medicineId);
    setFormData(med);
  };
  loadMedicine();
}, []);

const handleDelete = () => {
  Alert.alert('Delete?', 'Are you sure?', [
    { text: 'Cancel' },
    {
      text: 'Delete',
      onPress: async () => {
        await medicineAPI.delete(medicineId);
        navigation.goBack();
      },
    },
  ]);
};
```

---

### 🔔 ProfileScreen
**Reference:** Profile.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Display user email (read-only)
☐ Display user name (editable)
☐ Display current timezone
☐ Timezone selector dropdown
☐ Language selector dropdown
☐ Edit mode toggle
☐ Save button (when editing)
☐ Change password section
☐ Logout button
☐ Settings/preferences section
☐ Auto-detect timezone on load

// API used:
userAPI.getProfile()
userAPI.updateProfile(data)
userAPI.changePassword(current, new)
authAPI.logout()

// Storage used:
timezoneStorage.getTimezone()
timezoneStorage.setTimezone()
languageStorage.getLanguage()
languageStorage.setLanguage()

// Code pattern:
useEffect(() => {
  const detectTz = async () => {
    const device = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const stored = await timezoneStorage.getTimezone();
    if (stored === 'UTC') {
      setTimezone(device);
      await timezoneStorage.setTimezone(device);
    }
  };
  detectTz();
}, []);

const handleLogout = async () => {
  const result = await signOut();
  if (result.success) {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  }
};
```

---

### 🚨 AlarmScreen
**Reference:** ActiveAlarm.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Full screen alarm UI
☐ Medicine name(s) display
☐ Scheduled time display
☐ Current time display
☐ Animated alert visual
☐ "Take Now" button → mark taken
☐ "Snooze" button (5 min default)
☐ "Dismiss" button
☐ Sound playing + TTS
☐ Stop sound after action taken

// Hooks used:
const { markDoseTaken, snoozeAlarm, dismissAlarm } = useAlarmManager();

// Code pattern:
const handleTakeNow = async () => {
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
  <View style={styles.fullScreen}>
    <Text style={styles.title}>Time to take medicine!</Text>
    <Text style={styles.medicines}>
      {alarm.medicines.map(m => m.name).join(', ')}
    </Text>
    <Button onPress={handleTakeNow}>Take Now</Button>
    <Button onPress={handleSnooze}>Snooze 5 min</Button>
    <Button onPress={() => dismissAlarm(alarm.id)}>Dismiss</Button>
  </View>
);
```

---

### 📋 MedicinesScreen (List)
**Reference:** MedicineList.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Display all medicines in FlatList
☐ MedicineCard for each item (name, dosage, stock)
☐ Swipe to edit
☐ Delete confirmation on swipe
☐ Tap to view details
☐ Pull-to-refresh
☐ Add button → AddMedicineScreen
☐ Filter by status (active/inactive)
☐ Search/filter box

// API used:
medicineAPI.getAll()
medicineAPI.delete(id)

// Component pattern:
<FlatList
  data={medicines}
  keyExtractor={item => item.id.toString()}
  renderItem={({ item }) => (
    <MedicineCard
      medicine={item}
      onEdit={() => navigate('EditMedicine', { id: item.id })}
      onDelete={() => handleDelete(item.id)}
    />
  )}
  onRefresh={fetchMedicines}
  refreshing={loading}
/>
```

---

### 📊 DoseHistoryScreen
**Reference:** DoseHistory.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Display dose log history
☐ Filter by date range
☐ Filter by medicine
☐ Show: medicine name, scheduled time, actual time, status
☐ Mark as taken/not taken
☐ Delete dose log entry
☐ Calendar picker for date range
☐ Statistics: adherence %, on-time %

// API used:
doseAPI.getHistory(params)
doseAPI.updateDose(id, data)
doseAPI.deleteDose(id)

// Code pattern:
const fetchHistory = async () => {
  const history = await doseAPI.getHistory({
    start_date: startDate,
    end_date: endDate,
    medicine_id: selectedMedicine,
  });
  setHistory(history);
};
```

---

### 📈 AnalyticsDashboard
**Reference:** AnalyticsDashboard.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Install: npm install react-native-chart-kit
☐ Adherence rate card (%)
☐ On-time rate chart
☐ Weekly trend chart
☐ Monthly trend chart
☐ Top medicines list
☐ Date range selector
☐ Refresh button

// API used:
analyticsAPI.getDashboard(params)
analyticsAPI.getAdherence(params)
analyticsAPI.getTrends(params)

// Charts library:
LineChart from react-native-chart-kit
BarChart from react-native-chart-kit

// Code pattern:
import { LineChart } from 'react-native-chart-kit';

<LineChart
  data={{
    labels: dates,
    datasets: [{ data: adherenceData }],
  }}
  width={width}
  height={300}
/>
```

---

### 🔬 InteractionCheckerScreen
**Reference:** InteractionChecker.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Select multiple medicines
☐ "Check" button
☐ Display interactions (if any)
☐ Severity indicator (high/medium/low)
☐ Recommendations
☐ Link to more info

// API used:
medicineInfoAPI.checkInteractions(medicineIds)

// Code pattern:
const handleCheck = async () => {
  const interactions = await medicineInfoAPI.checkInteractions(
    selectedMedicines
  );
  setInteractions(interactions);
};
```

---

### 🍽️ FoodAdviceScreen
**Reference:** FoodAdvice.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Select medicine
☐ Display food advice
☐ Do's and Don'ts list
☐ Time restrictions
☐ Foods to avoid/prefer

// API used:
medicineInfoAPI.getFoodAdvice(medicineId)

// Code pattern:
const handleSelectMedicine = async (medicineId) => {
  const advice = await medicineInfoAPI.getFoodAdvice(medicineId);
  setAdvice(advice);
};
```

---

### ⚠️ ContraIndicationsScreen
**Reference:** ContraIndicationsPage.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Select medicine
☐ Display contra-indications
☐ Conditions to avoid
☐ Warnings
☐ Cautions

// API used:
medicineInfoAPI.getContraIndications(medicineId)

// Code pattern:
const handleSelectMedicine = async (medicineId) => {
  const contraIndications = await medicineInfoAPI.getContraIndications(medicineId);
  setContraIndications(contraIndications);
};
```

---

### 🛡️ SafetyCheckScreen
**Reference:** SafetyCheck.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Select medicine
☐ Display safety information
☐ Side effects list
☐ When to seek help
☐ Overdose info
☐ Storage instructions

// API used:
medicineInfoAPI.getSafetyInfo(medicineId)

// Code pattern:
const handleSelectMedicine = async (medicineId) => {
  const safety = await medicineInfoAPI.getSafetyInfo(medicineId);
  setSafety(safety);
};
```

---

### 🔔 NotificationCenterScreen
**Reference:** NotificationCenter.jsx  
**Status:** NEEDS IMPLEMENTATION

```javascript
// Component needs:
☐ Display notification history
☐ Mark as read/unread
☐ Delete notification
☐ Filter by type
☐ "Mark all as read" button
☐ Notification detail on tap

// API used:
notificationAPI.getNotifications(params)
notificationAPI.markAsRead(id)
notificationAPI.markAllAsRead()

// Code pattern:
const markAsRead = async (notificationId) => {
  await notificationAPI.markAsRead(notificationId);
  fetchNotifications();
};
```

---

## 🔧 Common Functions to Include

### Show Snackbar Message
```javascript
const showSnackbar = (message, type = 'success') => {
  setSnackbar({ visible: true, message });
  setTimeout(() => setSnackbar({ visible: false, message: '' }), 3000);
};
```

### Validate Form
```javascript
const validateForm = () => {
  const errors = {};
  if (!email) errors.email = 'Required';
  if (!password) errors.password = 'Required';
  setErrors(errors);
  return Object.keys(errors).length === 0;
};
```

### Handle Delete with Confirmation
```javascript
const handleDelete = (id, itemName) => {
  Alert.alert(
    'Delete?',
    `Delete ${itemName}?`,
    [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          await medicineAPI.delete(id);
          showSnackbar('Deleted successfully');
          fetchData();
        },
      },
    ]
  );
};
```

### Pull to Refresh
```javascript
<FlatList
  data={data}
  onRefresh={fetchData}
  refreshing={loading}
  // ... other props
/>
```

---

## 🎨 UI Components to Use

From `react-native-paper`:
- `Button` - All buttons
- `TextInput` - Form inputs
- `FAB` - Floating action button
- `Card` - Content containers
- `List.Item` - List items
- `ActivityIndicator` - Loading spinner
- `Snackbar` - Messages
- `Dialog` - Modals
- `Appbar` - Header
- `Checkbox` - Checkboxes
- `Switch` - Toggle switches
- `Chip` - Tags/labels

---

## 📞 Debugging Tips

### Test API Call
```javascript
import { medicineAPI } from '../services/api';
const result = await medicineAPI.getAll();
console.log('Result:', result);
```

### Check Stored Data
```javascript
import { medicinesStorage } from '../services/storage';
const cached = await medicinesStorage.getMedicines();
console.log('Cached medicines:', cached);
```

### Check Device Timezone
```javascript
const tz = new Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log('Device timezone:', tz);
```

### Monitor Alarms
```javascript
// useAlarmManager logs polling activities
// Check console output for:
// "Starting alarm polling"
// "New alarm detected"
// "Stopped alarm polling"
```

---

## ✅ Quality Checklist

Before submitting a screen:
- [ ] All form inputs validated
- [ ] Error messages shown
- [ ] Loading states present
- [ ] Offline fallback works
- [ ] API errors handled
- [ ] Navigation working
- [ ] Styled consistently
- [ ] No console warnings
- [ ] Tested on Android emulator
- [ ] Tested on iOS simulator

---

**Next Step:** Pick first screen to implement and follow its checklist above!

**Recommended Order:** LoginScreen → HomeScreen → AddMedicineScreen → ProfileScreen → AlarmScreen

**Questions?** Check MOBILE_DEVELOPER_GUIDE.md for more detailed examples
