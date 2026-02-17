# 📱 Mobile App - Web Parity Synchronization Plan

## Current Status

### Web App (React + Vite) ✅ COMPLETE
- ✅ Authentication (Login/Signup with token auth)
- ✅ Medicine Management (Add, Edit, Delete, List)
- ✅ Alarm System (Real-time notifications + sound)
- ✅ Dose History & Tracking
- ✅ Analytics Dashboard
- ✅ Interaction Checker
- ✅ Food Advice
- ✅ Contra Indications
- ✅ Safety Check
- ✅ Notifications Center
- ✅ Multi-language Support (i18n)
- ✅ Profile Management with Timezone Auto-Detection
- ✅ Pharmacy Admin Dashboard

### Mobile App (React Native + Expo) ⚠️ NEEDS SYNC
- ⚠️ All screens exist but many lack full functionality
- ⚠️ API calls need to match web app exactly
- ⚠️ UI/UX patterns need consistency
- ⚠️ Alarm system not fully implemented
- ⚠️ Storage (AsyncStorage) needs setup
- ⚠️ i18n partially implemented

---

## Phase 1: Core Infrastructure Setup

### 1.1 API Service Unification
**File:** `Mobile/src/services/api.js`

Update the Mobile API service to match web app exactly:
- ✅ Same base URL configuration
- ✅ Token-based authentication
- ✅ Same endpoints for medicines, alarms, auth, etc.
- ✅ Error handling matching web version
- ✅ AsyncStorage for token persistence

**Changes Needed:**
```javascript
// Current: Uses placeholders for token storage
// Needed: Implement with AsyncStorage
- AsyncStorage.getItem('access_token')
- AsyncStorage.setItem('access_token', token)
- AsyncStorage.removeItem('access_token')
```

### 1.2 Authentication Context
**File:** `Mobile/src/services/authService.js` (CREATE)

Create unified auth service for both web and mobile:
- Login with credentials → returns tokens
- Signup with user data
- Token refresh logic
- Session persistence
- Logout

### 1.3 Async Storage Setup
**File:** `Mobile/src/services/storage.js` (CREATE)

Centralized async storage management:
- User profile
- Medicines list (offline cache)
- Alarms
- Settings/Preferences

---

## Phase 2: Screen-by-Screen Sync

### 2.1 Authentication Screens
| Web App | Mobile App | Status |
|---------|-----------|---------|
| Login.jsx | LoginScreen.js | ⚠️ Needs API sync |
| Signup.jsx | SignupScreen.js | ⚠️ Needs API sync |
| Profile.jsx | ProfileScreen.js | ⚠️ Missing timezone detection |

**Action Items:**
- [ ] Ensure LoginScreen uses API service correctly
- [ ] Add timezone auto-detection to ProfileScreen
- [ ] Implement token storage after login
- [ ] Add error handling for auth errors

### 2.2 Medicine Management
| Web App | Mobile App | Status |
|---------|-----------|---------|
| Home.jsx | HomeScreen.js | ⚠️ Different UI approach |
| MedicineList.jsx | MedicinesScreen.js | ⚠️ Missing features |
| AddMedicine.jsx | AddMedicineScreen.js | ⚠️ Needs updating |
| EditMedicine.jsx | *(embedded in MedicinesScreen)* | ⚠️ Create separate screen |

**Key Features to Sync:**
- [ ] List all medicines with same fields
- [ ] Edit medicine functionality
- [ ] Delete with confirmation
- [ ] Auto-delete when stock = 0
- [ ] Same form validation
- [ ] Proper error handling

### 2.3 Alarm/Reminder System
| Web App | Mobile App | Status |
|---------|-----------|---------|
| ActiveAlarm.jsx | *(Uses native notifications)* | ⚠️ Needs implementation |
| AlarmContainer.jsx | *(Check logic exists)* | ⚠️ Partial implementation |
| useAlarmManager.js | *(Check logic)* | ⚠️ Needs React Native adaptation |

**Key Features to Sync:**
- [ ] Implement alarm polling (every 30 seconds)
- [ ] Use Expo.Notifications for push notifications
- [ ] Text-to-speech for alarm announcement
- [ ] Audio playback for alarm sound
- [ ] Same UI/UX for alarm display
- [ ] Action buttons: Take Now, Snooze, Dismiss

### 2.4 Analytics & Tracking
| Web App | Mobile App | Status |
|---------|-----------|---------|
| AnalyticsDashboard.jsx | AnalyticsDashboard.js | ⚠️ Missing charts |
| DoseHistory.jsx | DoseHistory.js | ⚠️ Needs API sync |

**Action Items:**
- [ ] Sync dose history API calls
- [ ] Add same analytics visualizations
- [ ] Use react-native-chart-kit for charts

### 2.5 Info/Reference Screens
| Web App | Mobile App | Status |
|---------|-----------|---------|
| InteractionChecker.jsx | InteractionChecker.js | ⚠️ Needs API sync |
| FoodAdvice.jsx | FoodAdvice.js | ⚠️ Needs API sync |
| ContraIndicationsPage.jsx | ContraIndications.js | ⚠️ Needs API sync |
| SafetyCheck.jsx | SafetyCheck.js | ⚠️ Needs API sync |

**Action Items:**
- [ ] Sync all API endpoints
- [ ] Ensure same response data handling
- [ ] Add loading states
- [ ] Add error handling

### 2.6 Notifications & Settings
| Web App | Mobile App | Status |
|---------|-----------|---------|
| NotificationCenter.jsx | NotificationCenter.js | ⚠️ Needs update |
| LanguageSettings.jsx | LanguageContext.js | ✅ Exists |

**Action Items:**
- [ ] Implement notification center matching web
- [ ] Sync language settings
- [ ] Add notification preferences

---

## Phase 3: Feature Implementation

### 3.1 Real-Time Alarm System for Mobile

**Required Setup:**
```javascript
// Install:
npm install expo-notifications expo-audio expo-speech

// Core Implementation:
1. Request notification permissions on app start
2. Poll /api/alarms/active/ every 30 seconds
3. When alarm appears:
   - Show local notification (top bar + sound)
   - Play audio alert (expo-audio)
   - Text-to-speech announcement (expo-speech)
   - Show full-screen AlarmScreen
4. Actions on AlarmScreen:
   - "Take Now" → Call markGroupTaken() API
   - "Snooze" → Close alarm (appears in 5 mins)
   - "Dismiss" → Call dismiss() API
```

**Files to Create:**
- `Mobile/src/screens/AlarmScreen.js` - Full screen alarm
- `Mobile/src/hooks/useAlarmManager.js` - Alarm polling logic
- `Mobile/src/services/audioService.js` - Audio/TTS management

### 3.2 Offline Support

**Caching Strategy:**
- Cache medicines list locally
- Store dose logs locally
- Sync when online

**Files to Create:**
- `Mobile/src/services/offlineQueue.js` - Queue failed requests

### 3.3 Background Tasks

**Required:**
```javascript
// Install:
npm install expo-background-fetch expo-task-manager

// Setup periodic alarm check even when app closed
// Check alarms every 15 minutes in background
```

---

## Phase 4: UI/UX Consistency

### Design System Sync

#### Colors & Theming
- [ ] Match color palette between web and mobile
- [ ] Implement React Native Paper theme consistently
- [ ] Ensure dark mode support

#### Typography
- [ ] Use same font sizes/weights
- [ ] Match heading styles between platforms
- [ ] Consistent spacing/padding

#### Component Library Migration
- Web: Uses Tailwind CSS
- Mobile: Uses React Native Paper + custom styling

**Migration Strategy:**
- Create reusable components for both
- Component directory:
  ```
  Mobile/src/components/
    ├── Common/
    │   ├── Button.js
    │   ├── Card.js
    │   ├── Input.js
    │   ├── Modal.js
    │   └── Loading.js
    ├── Medicine/
    │   ├── MedicineCard.js
    │   ├── MedicineForm.js
    │   └── MedicineList.js
    ├── Alarm/
    │   ├── AlarmNotification.js
    │   └── AlarmActions.js
    └── Auth/
        ├── LoginForm.js
        └── SignupForm.js
  ```

### Navigation Consistency
**Web:** React Router (page-based)
**Mobile:** React Navigation (tab + stack-based)

Current Mobile structure:
```
Bottom Tabs:
├── Home
├── Dashboard
├── Medicines
├── Analytics
├── Profile
└── Icons for other features
```

**Needed Improvement:**
- Add more quick-access features
- Improve navigation flow
- Add Android back button handling
- Add deep linking for notifications

---

## Phase 5: Testing & QA

### Unit Tests
- [ ] API service functions
- [ ] Auth logic
- [ ] Storage operations
- [ ] Alarm timing logic

### Integration Tests
- [ ] Full auth flow (login → medicine → alarm)
- [ ] Alarm notification flow
- [ ] Offline-to-online sync
- [ ] Medicine CRUD operations

### Device Testing
- [ ] iOS (iPhone)
- [ ] Android (Multiple devices)
- [ ] Different screen sizes
- [ ] Battery/performance impact
- [ ] Notification permissions

---

## Implementation Priority

### 🔴 CRITICAL (Week 1)
1. API Service sync with AsyncStorage
2. Authentication (login/signup/token)
3. Medicine CRUD operations
4. Alarm system (polling + notifications)
5. Profile with timezone detection

### 🟡 HIGH (Week 2)
6. Dose History tracking
7. Analytics Dashboard
8. Error handling & retry logic
9. Loading/skeleton states
10. Offline support

### 🟢 MEDIUM (Week 3+)
11. Interaction Checker
12. Food Advice
13. Contra Indications
14. Safety Check
15. Advanced features

---

## File Checklist

### Use Web App as Reference

#### **Copy & Adapt Patterns From Web:**
- [ ] `medicine-reminder/src/services/api.js` → `Mobile/src/services/api.js`
- [ ] `medicine-reminder/src/i18n/` → `Mobile/src/i18n/`
- [ ] `medicine-reminder/src/components/MedicineCard.jsx` → `Mobile/src/components/MedicineCard.js`
- [ ] `medicine-reminder/src/components/ActiveAlarm.jsx` → `Mobile/src/components/AlarmNotification.js`
- [ ] `medicine-reminder/src/hooks/` → `Mobile/src/hooks/`

#### **Key Web App Files to Reference:**
1. `medicine-reminder/src/services/api.js` - Complete API endpoints
2. `medicine-reminder/src/pages/Profile.jsx` - Timezone detection logic
3. `medicine-reminder/src/components/MedicineForm.jsx` - Form validation
4. `medicine-reminder/src/i18n/` - Language strings

---

## Dependencies to Add/Update

```json
{
  "expo-notifications": "~0.20.1",
  "expo-audio": "~13.5.4",
  "expo-speech": "~12.4.0",
  "expo-background-fetch": "~1.11.1",
  "expo-task-manager": "~11.7.0",
  "react-native-chart-kit": "^6.12.0",
  "@react-native-camera-roll/camera-roll": "^7.4.0",
  "date-fns": "^3.6.0",
  "@tanstack/react-query": "^5.0.0"
}
```

---

## Success Criteria

✅ **Completion when:**
1. All screens have same functionality as web
2. API calls produce identical responses
3. Alarm system triggers on schedule
4. UI/UX patterns match web app
5. Authentication persists across app restarts
6. Works offline with local caching
7. Tests pass for critical flows
8. Works on iOS and Android
9. Performance is acceptable (< 100MB, fast startup)
10. Users can do everything they can in web app

---

## Quick Start Commands

```bash
# Install dependencies
cd Mobile
npm install

# Run on Android emulator
expo start --android

# Run on iOS simulator
expo start --ios

# Build APK for Android
expo build:android

# Build for iOS
expo build:ios
```

