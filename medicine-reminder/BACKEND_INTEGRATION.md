# SalusLogica Backend Integration Guide

This guide explains how to integrate the React medicine-reminder app with the SalusLogica Django backend.

## 🚀 Quick Start

### 1. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit .env with your backend URL
VITE_API_URL=http://your-saluslogica-backend.com/api
```

### 2. Install Dependencies
```bash
npm install axios date-fns react-query react-hot-toast
```

### 3. Start Development
```bash
npm run dev
```

## 📁 Project Structure

```
src/
├── services/
│   └── api.js              # Complete API service layer
├── hooks/
│   ├── useAuth.js           # Authentication hooks
│   ├── useMedicines.js     # Medicine management hooks
│   ├── useDoses.js         # Dose tracking hooks
│   ├── useAnalytics.js      # Analytics hooks
│   ├── useInteractions.js   # Drug interaction hooks
│   ├── useNotifications.js  # Notification hooks
│   └── useAlarms.js        # Alarm/reminder hooks
├── contexts/
│   └── AppContext.jsx       # Global state management
└── pages/
    └── MedicineListAPI.jsx  # Example API integration
```

## 🔌 API Services

### Authentication (`authAPI`)
- `login(credentials)` - User login
- `register(userData)` - User registration
- `logout()` - User logout
- `getCurrentUser()` - Get current user
- `refreshToken()` - Refresh JWT token

### Medicine Management (`medicineAPI`)
- `getAll()` - Get user's medicines
- `getById(id)` - Get single medicine
- `create(data)` - Add new medicine
- `update(id, data)` - Update medicine
- `delete(id)` - Delete medicine
- `getPatientMedicines(patientId)` - For pharmacy admins

### Dose Management (`doseAPI`)
- `getHistory(filters)` - Get dose history
- `markTaken(doseId)` - Mark dose as taken
- `markMissed(doseId)` - Mark dose as missed
- `snooze(doseId, minutes)` - Snooze dose
- `getPending()` - Get pending doses
- `checkMissed()` - Check for missed doses
- `sendReminder(doseId)` - Send immediate reminder

### Analytics (`analyticsAPI`)
- `getDashboard()` - Dashboard analytics
- `getPatientAdherence(patientId, period)` - Patient adherence
- `getPharmacyPerformance(period)` - Pharmacy performance
- `getMedicineUsage(period)` - Medicine usage stats
- `getAdherenceTrends(period)` - Adherence trends
- `getExportCenter()` - Export center data
- `downloadExport(exportId)` - Download export file

### Interaction Checker (`interactionAPI`)
- `check(medicineIds)` - Check drug interactions
- `getHistory()` - Interaction history
- `getDetails(checkId)` - Interaction details
- `addAllergy(data)` - Add allergy
- `deleteAllergy(allergyId)` - Delete allergy
- `initializeDatabase()` - Initialize drug database

### Notifications (`notificationAPI`)
- `getCenter()` - Notification center
- `getSettings()` - Notification settings
- `updateSettings(settings)` - Update settings
- `checkPending()` - Check pending notifications
- `checkMissedDoses()` - Check missed dose notifications

### Alarm System (`alarmAPI`)
- `getActive()` - Get active alarms
- `getDetails(groupId)` - Get alarm details
- `markGroupTaken(groupId)` - Mark group as taken
- `dismiss(groupId)` - Dismiss alarm
- `snooze(groupId, minutes)` - Snooze alarm
- `checkReminders()` - Real-time reminder check

### Chatbot (`chatbotAPI`)
- `sendMessage(message, sessionId)` - Send message
- `getHistory()` - Chat history
- `getView()` - Chatbot view

## 🎣 Custom Hooks

### useAuth()
```javascript
const { user, isAuthenticated, login, register, logout } = useAuth();
```

### useMedicines()
```javascript
const { 
  medicines, 
  loading, 
  addMedicine, 
  updateMedicine, 
  deleteMedicine 
} = useMedicines();
```

### useDoses()
```javascript
const { 
  doses, 
  markDoseTaken, 
  markDoseMissed, 
  snoozeDose 
} = useDoses();
```

### useAnalytics()
```javascript
const { 
  data, 
  getDashboard, 
  getPatientAdherence 
} = useAnalytics();
```

### useInteractions()
```javascript
const { 
  interactions, 
  checkInteractions, 
  getInteractionHistory 
} = useInteractions();
```

### useNotifications()
```javascript
const { 
  notifications, 
  getNotificationCenter, 
  updateNotificationSettings 
} = useNotifications();
```

### useAlarms()
```javascript
const { 
  activeAlarms, 
  getActiveAlarms, 
  markGroupTaken, 
  snoozeAlarm 
} = useAlarms();
```

## 🌐 Global State Management

### AppContext
Provides centralized state management combining all hooks:

```javascript
const {
  // Auth
  user, isAuthenticated, login, logout,
  
  // Medicines
  medicines, addMedicine, updateMedicine,
  
  // Doses
  doses, markDoseTaken, snoozeDose,
  
  // Notifications
  notifications, getNotificationCenter,
  
  // Alarms
  activeAlarms, getActiveAlarms,
  
  // Loading states
  loading, error, clearError
} = useAppContext();
```

## 🔄 Real-time Features

### WebSocket Integration
```javascript
// Example WebSocket connection for real-time updates
const ws = new WebSocket(WS_URL);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'NEW_DOSE':
      // Handle new dose
      break;
    case 'DOSE_REMINDER':
      // Handle dose reminder
      break;
    case 'MEDICINE_UPDATE':
      // Handle medicine update
      break;
  }
};
```

### Alarm Checking
```javascript
const { startRealTimeChecking } = useAlarms();

// Start real-time alarm checking
const stopChecking = startRealTimeChecking();

// Stop checking when component unmounts
useEffect(() => {
  return stopChecking;
}, [startRealTimeChecking]);
```

## 🔐 Authentication Flow

### Login
```javascript
const { login } = useAuth();

const handleLogin = async (credentials) => {
  try {
    const response = await login({
      email: credentials.email,
      password: credentials.password
    });
    
    // Tokens are automatically stored
    // User is set in context
    navigate('/dashboard');
  } catch (error) {
    setError(error.message);
  }
};
```

### Token Management
- JWT tokens are automatically stored in localStorage
- Access token: `localStorage.getItem('access_token')`
- Refresh token: `localStorage.getItem('refresh_token')`
- Automatic token refresh on 401 errors
- Automatic logout on refresh failure

## 📊 Data Models

### Medicine
```javascript
{
  id: number,
  name: string,
  dosage: string,
  frequency: string,
  times: string[], // ["08:00", "14:00", "20:00"]
  posology: string,
  duration: number,
  dose_mg: number,
  weight_kg: number,
  dose_per_kg: number,
  start_date: string,
  end_date: string,
  taken_times: object,
  last_notified: object,
  is_active: boolean,
  completed: boolean,
  created_at: string,
  updated_at: string
}
```

### DoseLog
```javascript
{
  id: number,
  medicine: number,
  scheduled_time: string, // UTC
  local_time: string, // User's local time
  user_timezone: string,
  status: string, // PENDING, TAKEN, MISSED, SNOOZED
  taken_at: string,
  dismissed_at: string,
  snoozed_until: string,
  snooze_count: number,
  trigger_minute: string,
  alarm_group_id: string,
  notes: string,
  created_at: string,
  updated_at: string
}
```

### Notification
```javascript
{
  id: number,
  user: number,
  notification_type: string, // EMAIL, SMS, PUSH
  recipient: string,
  subject: string,
  message: string,
  status: string, // SENT, DELIVERED, FAILED, PENDING
  sent_at: string,
  read_at: string,
  created_at: string,
  updated_at: string
}
```

## 🎯 API Endpoints

### Base URL
```
${VITE_API_URL}/
```

### Authentication
```
POST /auth/login/
POST /auth/register/
POST /auth/logout/
GET  /auth/user/
POST /auth/refresh/
```

### Medicines
```
GET    /medicines/
POST   /medicines/
GET    /medicines/{id}/
PUT    /medicines/{id}/
DELETE /medicines/{id}/
GET    /medicines/patient/{patient_id}/
```

### Doses
```
GET    /doses/history/
POST   /doses/{id}/taken/
POST   /doses/{id}/missed/
POST   /doses/{id}/snooze/
GET    /doses/pending/
POST   /doses/check-missed/
POST   /doses/send-reminder/{id}/
```

### Analytics
```
GET    /analytics/dashboard/
GET    /analytics/patient-adherence/
GET    /analytics/pharmacy-performance/
GET    /analytics/medicine-usage/
GET    /analytics/adherence-trends/
GET    /analytics/export-center/
GET    /analytics/download/{export_id}/
```

### Interactions
```
POST   /interactions/check/
GET    /interactions/history/
GET    /interactions/details/{check_id}/
POST   /interactions/add-allergy/
DELETE /interactions/delete-allergy/{allergy_id}/
POST   /interactions/initialize-drug-database/
```

## 🔧 Configuration

### Environment Variables
```bash
# Required
VITE_API_URL=http://localhost:8000/api

# Optional
VITE_WS_URL=ws://localhost:8000/ws
VITE_ENV=development
VITE_DEBUG=true
VITE_TIMEZONE=UTC
VITE_ENABLE_NOTIFICATIONS=true
VITE_NOTIFICATION_SOUND=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_CHATBOT=true
VITE_ENABLE_VOICE_NOTIFICATIONS=true
VITE_API_TIMEOUT=30000
VITE_RETRY_ATTEMPTS=3
VITE_ENABLE_CACHE=true
VITE_CACHE_DURATION=300000
```

## 🚨 Error Handling

### API Errors
```javascript
try {
  const data = await medicineAPI.create(medicineData);
  // Success
} catch (error) {
  // Error handling
  console.error('API Error:', error);
  // Error is automatically logged
  // Show user-friendly message
}
```

### Loading States
```javascript
const { loading } = useAppContext();

if (loading.medicines) {
  return <LoadingSpinner />;
}
```

## 📱 Mobile App Integration

The same API services can be used in mobile apps:

### React Native
```javascript
import { medicineAPI } from './services/api';

const getMedicines = async () => {
  try {
    const medicines = await medicineAPI.getAll();
    return medicines;
  } catch (error) {
    console.error('Failed to fetch medicines:', error);
    throw error;
  }
};
```

### Flutter
```dart
import 'package:your_app/services/api.dart';

Future<List<Medicine>> getMedicines() async {
  try {
    final response = await MedicineApi.getAll();
    return response;
  } catch (e) {
    print('Failed to fetch medicines: $e');
    rethrow;
  }
}
```

## 🔍 Testing

### API Testing
```javascript
// Test API connection
import { authAPI } from '../services/api';

const testConnection = async () => {
  try {
    const user = await authAPI.getCurrentUser();
    console.log('API Connection successful:', user);
  } catch (error) {
    console.error('API Connection failed:', error);
  }
};
```

### Mock Data
For development without backend, the hooks include fallback mock data.

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Configuration
```bash
# Production
VITE_API_URL=https://your-production-api.com/api
VITE_ENV=production
VITE_DEBUG=false
VITE_REQUIRE_HTTPS=true
```

## 📚 Additional Resources

- [SalusLogica Backend Documentation](./backend-docs.md)
- [API Reference](./api-reference.md)
- [Mobile App Guide](./mobile-integration.md)
- [Troubleshooting](./troubleshooting.md)

## 🤝 Contributing

1. Follow the existing code patterns
2. Add proper error handling
3. Include loading states
4. Write tests for new features
5. Update documentation

## 📞 Support

For issues with backend integration:
1. Check the API URL in `.env`
2. Verify backend is running
3. Check network connectivity
4. Review browser console for errors
5. Check this guide for solutions
