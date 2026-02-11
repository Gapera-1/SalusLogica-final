import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useMedicines } from '../hooks/useMedicines';
import { useDoses } from '../hooks/useDoses';
import { useNotifications } from '../hooks/useNotifications';
import { useAlarms } from '../hooks/useAlarms';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  medicines: [],
  doses: [],
  notifications: [],
  activeAlarms: [],
  loading: {
    auth: false,
    medicines: false,
    doses: false,
    notifications: false,
    alarms: false,
  },
  error: null,
};

// Action types
const actionTypes = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_USER: 'SET_USER',
  SET_AUTHENTICATED: 'SET_AUTHENTICATED',
  LOGOUT: 'LOGOUT',
  SET_MEDICINES: 'SET_MEDICINES',
  ADD_MEDICINE: 'ADD_MEDICINE',
  UPDATE_MEDICINE: 'UPDATE_MEDICINE',
  DELETE_MEDICINE: 'DELETE_MEDICINE',
  SET_DOSES: 'SET_DOSES',
  UPDATE_DOSE: 'UPDATE_DOSE',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATION_READ: 'MARK_NOTIFICATION_READ',
  SET_ACTIVE_ALARMS: 'SET_ACTIVE_ALARMS',
  UPDATE_ALARM: 'UPDATE_ALARM',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.SET_LOADING:
      return {
        ...state,
        loading: {
          ...state.loading,
          [action.payload.key]: action.payload.value,
        },
      };

    case actionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };

    case actionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case actionTypes.SET_USER:
      return {
        ...state,
        user: action.payload,
      };

    case actionTypes.SET_AUTHENTICATED:
      return {
        ...state,
        isAuthenticated: action.payload,
      };

    case actionTypes.LOGOUT:
      return {
        ...initialState,
      };

    case actionTypes.SET_MEDICINES:
      return {
        ...state,
        medicines: action.payload,
      };

    case actionTypes.ADD_MEDICINE:
      return {
        ...state,
        medicines: [...state.medicines, action.payload],
      };

    case actionTypes.UPDATE_MEDICINE:
      return {
        ...state,
        medicines: state.medicines.map(med =>
          med.id === action.payload.id ? action.payload : med
        ),
      };

    case actionTypes.DELETE_MEDICINE:
      return {
        ...state,
        medicines: state.medicines.filter(med => med.id !== action.payload),
      };

    case actionTypes.SET_DOSES:
      return {
        ...state,
        doses: action.payload,
      };

    case actionTypes.UPDATE_DOSE:
      return {
        ...state,
        doses: state.doses.map(dose =>
          dose.id === action.payload.id ? action.payload : dose
        ),
      };

    case actionTypes.SET_NOTIFICATIONS:
      return {
        ...state,
        notifications: action.payload,
      };

    case actionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
      };

    case actionTypes.MARK_NOTIFICATION_READ:
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload
            ? { ...notif, read: true, read_at: new Date().toISOString() }
            : notif
        ),
      };

    case actionTypes.SET_ACTIVE_ALARMS:
      return {
        ...state,
        activeAlarms: action.payload,
      };

    case actionTypes.UPDATE_ALARM:
      return {
        ...state,
        activeAlarms: state.activeAlarms.map(alarm =>
          alarm.group_id === action.payload.group_id ? action.payload : alarm
        ),
      };

    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Custom hooks
  const auth = useAuth();
  const medicines = useMedicines();
  const doses = useDoses();
  const notifications = useNotifications();
  const alarms = useAlarms();

  // Sync hooks with context state
  useEffect(() => {
    dispatch({ type: actionTypes.SET_USER, payload: auth.user });
    dispatch({ type: actionTypes.SET_AUTHENTICATED, payload: auth.isAuthenticated });
  }, [auth.user, auth.isAuthenticated]);

  useEffect(() => {
    dispatch({ type: actionTypes.SET_MEDICINES, payload: medicines.medicines });
    dispatch({ 
      type: actionTypes.SET_LOADING, 
      payload: { key: 'medicines', value: medicines.loading } 
    });
  }, [medicines.medicines, medicines.loading]);

  useEffect(() => {
    dispatch({ type: actionTypes.SET_DOSES, payload: doses.doses });
    dispatch({ 
      type: actionTypes.SET_LOADING, 
      payload: { key: 'doses', value: doses.loading } 
    });
  }, [doses.doses, doses.loading]);

  useEffect(() => {
    dispatch({ type: actionTypes.SET_NOTIFICATIONS, payload: notifications.notifications });
    dispatch({ 
      type: actionTypes.SET_LOADING, 
      payload: { key: 'notifications', value: notifications.loading } 
    });
  }, [notifications.notifications, notifications.loading]);

  useEffect(() => {
    dispatch({ type: actionTypes.SET_ACTIVE_ALARMS, payload: alarms.activeAlarms });
    dispatch({ 
      type: actionTypes.SET_LOADING, 
      payload: { key: 'alarms', value: alarms.loading } 
    });
  }, [alarms.activeAlarms, alarms.loading]);

  // Combined actions
  const actions = {
    // Auth actions
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    checkAuthStatus: auth.checkAuthStatus,
    
    // Medicine actions
    addMedicine: medicines.addMedicine,
    updateMedicine: medicines.updateMedicine,
    deleteMedicine: medicines.deleteMedicine,
    getMedicine: medicines.getMedicine,
    fetchMedicines: medicines.fetchMedicines,
    
    // Dose actions
    markDoseTaken: doses.markDoseTaken,
    markDoseMissed: doses.markDoseMissed,
    snoozeDose: doses.snoozeDose,
    getDoseHistory: doses.getDoseHistory,
    getPendingDoses: doses.getPendingDoses,
    checkMissedDoses: doses.checkMissedDoses,
    sendReminder: doses.sendReminder,
    
    // Notification actions
    getNotificationCenter: notifications.getNotificationCenter,
    getNotificationSettings: notifications.getNotificationSettings,
    updateNotificationSettings: notifications.updateNotificationSettings,
    markNotificationRead: notifications.markAsRead,
    deleteNotification: notifications.deleteNotification,
    getUnreadCount: notifications.getUnreadCount,
    
    // Alarm actions
    getActiveAlarms: alarms.getActiveAlarms,
    getAlarmDetails: alarms.getAlarmDetails,
    markGroupTaken: alarms.markGroupTaken,
    dismissAlarm: alarms.dismissAlarm,
    snoozeAlarm: alarms.snoozeAlarm,
    checkReminders: alarms.checkReminders,
    startRealTimeChecking: alarms.startRealTimeChecking,
    getCriticalAlarms: alarms.getCriticalAlarms,
    getUpcomingAlarms: alarms.getUpcomingAlarms,
    
    // Utility actions
    clearError: () => dispatch({ type: actionTypes.CLEAR_ERROR }),
    setLoading: (key, value) => 
      dispatch({ type: actionTypes.SET_LOADING, payload: { key, value } }),
  };

  const value = {
    ...state,
    ...actions,
    dispatch,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
