import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlarmProvider } from './src/contexts/AlarmContext';
import { DataSyncProvider } from './src/contexts/DataSyncContext';
import AlarmModal from './src/components/AlarmModal';

// Import screens
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import MedicinesScreen from './src/screens/MedicinesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddMedicineScreen from './src/screens/AddMedicineScreen';
import AnalyticsDashboard from './src/screens/AnalyticsDashboard';
import DoseHistory from './src/screens/DoseHistory';
import SafetyCheck from './src/screens/SafetyCheck';
import FoodAdvice from './src/screens/FoodAdvice';
import InteractionChecker from './src/screens/InteractionChecker';
import ContraIndications from './src/screens/ContraIndications';
import NotificationCenter from './src/screens/NotificationCenter';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ExportReportsScreen from './src/screens/ExportReportsScreen';
import SideEffectTrackerScreen from './src/screens/SideEffectTrackerScreen';
import MoreScreen from './src/screens/MoreScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Create stack navigators for each tab
const DashboardStack = createNativeStackNavigator();
const MedicinesStack = createNativeStackNavigator();
const AnalyticsStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Auth Stack for login/signup
function AuthStackScreens() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// Dashboard Tab Stack
function DashboardStackScreen() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name="AddMedicine" component={AddMedicineScreen} />
    </DashboardStack.Navigator>
  );
}

// Medicines Tab Stack
function MedicinesStackScreen() {
  return (
    <MedicinesStack.Navigator screenOptions={{ headerShown: false }}>
      <MedicinesStack.Screen name="MedicinesMain" component={MedicinesScreen} />
      <MedicinesStack.Screen name="AddMedicine" component={AddMedicineScreen} />
    </MedicinesStack.Navigator>
  );
}

// Analytics Tab Stack
function AnalyticsStackScreen() {
  return (
    <AnalyticsStack.Navigator screenOptions={{ headerShown: false }}>
      <AnalyticsStack.Screen name="AnalyticsMain" component={AnalyticsDashboard} />
      <AnalyticsStack.Screen name="DoseHistory" component={DoseHistory} />
    </AnalyticsStack.Navigator>
  );
}

// More Tab Stack - contains all additional features
function MoreStackScreen() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMain" component={MoreScreen} />
      <MoreStack.Screen name="InteractionChecker" component={InteractionChecker} />
      <MoreStack.Screen name="FoodAdvice" component={FoodAdvice} />
      <MoreStack.Screen name="SafetyCheck" component={SafetyCheck} />
      <MoreStack.Screen name="ContraIndications" component={ContraIndications} />
      <MoreStack.Screen name="DoseHistory" component={DoseHistory} />
      <MoreStack.Screen name="SideEffects" component={SideEffectTrackerScreen} />
      <MoreStack.Screen name="ExportReports" component={ExportReportsScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationCenter} />
    </MoreStack.Navigator>
  );
}

// Profile Tab Stack
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationCenter} />
    </ProfileStack.Navigator>
  );
}

// Main Tab Navigator for authenticated users
function MainTabs() {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Medicines') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'More') iconName = focused ? 'apps' : 'apps-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'help';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted || '#94a3b8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardStackScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Medicines" component={MedicinesStackScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsStackScreen} />
      <Tab.Screen name="More" component={MoreStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}

// Navigation component that handles auth state
function Navigation() {
  const { user, isLoading } = useAuth();
  const { currentTheme, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: currentTheme.colors.background }}>
        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? (
        <DataSyncProvider>
          <AlarmProvider>
            <MainTabs />
            <AlarmModal />
          </AlarmProvider>
        </DataSyncProvider>
      ) : (
        <AuthStackScreens />
      )}
    </NavigationContainer>
  );
}

// Themed App Wrapper
function ThemedApp() {
  const { currentTheme } = useTheme();

  return (
    <PaperProvider theme={currentTheme}>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ThemedApp />
      </LanguageProvider>
    </ThemeProvider>
  );
}
