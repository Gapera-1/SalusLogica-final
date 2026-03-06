import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/i18n/LanguageContext';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AlarmProvider } from './src/contexts/AlarmContext';
import { DataSyncProvider } from './src/contexts/DataSyncContext';
import AlarmModal from './src/components/AlarmModal';
import ErrorBoundary from './src/components/ErrorBoundary';
import ChatBotFAB from './src/components/ChatBotFAB';

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
import ChatBotScreen from './src/screens/ChatBotScreen';

// Pharmacy Admin screens
import PharmacyAdminDashboardScreen from './src/screens/PharmacyAdminDashboardScreen';
import PharmacyAdminPatientsScreen from './src/screens/PharmacyAdminPatientsScreen';
import PharmacyAdminAdverseReactionsScreen from './src/screens/PharmacyAdminAdverseReactionsScreen';
import PharmacyAdminReportsScreen from './src/screens/PharmacyAdminReportsScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();

// Create stack navigators for each tab
const DashboardStack = createNativeStackNavigator();
const MedicinesStack = createNativeStackNavigator();
const AnalyticsStack = createNativeStackNavigator();
const MoreStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

// Pharmacy Admin stacks
const PADashboardStack = createNativeStackNavigator();
const PAPatientsStack = createNativeStackNavigator();
const PAReactionsStack = createNativeStackNavigator();
const PAReportsStack = createNativeStackNavigator();
const PAProfileStack = createNativeStackNavigator();

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
      <DashboardStack.Screen name="ChatBot" component={ChatBotScreen} />
    </DashboardStack.Navigator>
  );
}

// Medicines Tab Stack
function MedicinesStackScreen() {
  return (
    <MedicinesStack.Navigator screenOptions={{ headerShown: false }}>
      <MedicinesStack.Screen name="MedicinesMain" component={MedicinesScreen} />
      <MedicinesStack.Screen name="AddMedicine" component={AddMedicineScreen} />
      <MedicinesStack.Screen name="ChatBot" component={ChatBotScreen} />
    </MedicinesStack.Navigator>
  );
}

// Analytics Tab Stack
function AnalyticsStackScreen() {
  return (
    <AnalyticsStack.Navigator screenOptions={{ headerShown: false }}>
      <AnalyticsStack.Screen name="AnalyticsMain" component={AnalyticsDashboard} />
      <AnalyticsStack.Screen name="DoseHistory" component={DoseHistory} />
      <AnalyticsStack.Screen name="ChatBot" component={ChatBotScreen} />
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
      <MoreStack.Screen name="ChatBot" component={ChatBotScreen} />
    </MoreStack.Navigator>
  );
}

// Profile Tab Stack
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="Notifications" component={NotificationCenter} />
      <ProfileStack.Screen name="ChatBot" component={ChatBotScreen} />
    </ProfileStack.Navigator>
  );
}

// ── Pharmacy Admin Stack Screens ──
function PADashboardStackScreen() {
  return (
    <PADashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <PADashboardStack.Screen name="PADashboardMain" component={PharmacyAdminDashboardScreen} />
      <PADashboardStack.Screen name="PharmacyAdminPatients" component={PharmacyAdminPatientsScreen} />
      <PADashboardStack.Screen name="PharmacyAdminAdverseReactions" component={PharmacyAdminAdverseReactionsScreen} />
      <PADashboardStack.Screen name="PharmacyAdminReports" component={PharmacyAdminReportsScreen} />
    </PADashboardStack.Navigator>
  );
}
function PAPatientsStackScreen() {
  return (
    <PAPatientsStack.Navigator screenOptions={{ headerShown: false }}>
      <PAPatientsStack.Screen name="PAPatientsMain" component={PharmacyAdminPatientsScreen} />
    </PAPatientsStack.Navigator>
  );
}
function PAReactionsStackScreen() {
  return (
    <PAReactionsStack.Navigator screenOptions={{ headerShown: false }}>
      <PAReactionsStack.Screen name="PAReactionsMain" component={PharmacyAdminAdverseReactionsScreen} />
    </PAReactionsStack.Navigator>
  );
}
function PAReportsStackScreen() {
  return (
    <PAReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <PAReportsStack.Screen name="PAReportsMain" component={PharmacyAdminReportsScreen} />
    </PAReportsStack.Navigator>
  );
}
function PAProfileStackScreen() {
  return (
    <PAProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <PAProfileStack.Screen name="PAProfileMain" component={ProfileScreen} />
      <PAProfileStack.Screen name="Notifications" component={NotificationCenter} />
    </PAProfileStack.Navigator>
  );
}

// Pharmacy Admin Tab Navigator
function PharmacyAdminTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'PADashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'PAPatients') iconName = focused ? 'people' : 'people-outline';
          else if (route.name === 'PAReactions') iconName = focused ? 'shield-checkmark' : 'shield-checkmark-outline';
          else if (route.name === 'PAReports') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'PAProfile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'help';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted || '#94a3b8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="PADashboard" component={PADashboardStackScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <Tab.Screen name="PAPatients" component={PAPatientsStackScreen} options={{ tabBarLabel: 'Patients' }} />
      <Tab.Screen name="PAReactions" component={PAReactionsStackScreen} options={{ tabBarLabel: 'Reactions' }} />
      <Tab.Screen name="PAReports" component={PAReportsStackScreen} options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen name="PAProfile" component={PAProfileStackScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// Main Tab Navigator for authenticated users
function MainTabs() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  
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
          
          return <Ionicons name={iconName} size={22} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted || '#94a3b8',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
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

// Splash screen component
function SplashScreen() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={[splashStyles.content, { opacity: fadeAnim }]}>  
        <View style={splashStyles.logoCircle}>
          <Text style={splashStyles.logoEmoji}>💊</Text>
        </View>
        <Text style={splashStyles.appName}>SalusLogica</Text>
        <Text style={splashStyles.tagline}>Your Health Companion</Text>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={{ marginTop: 32 }} />
        <Text style={splashStyles.poweredBy}>powered by MF HealthTech</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  poweredBy: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 48,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

// Navigation component that handles auth state
function Navigation() {
  const { user, isLoading } = useAuth();
  const { currentTheme, isDark } = useTheme();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash || isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style={isDark ? "light" : "dark"} />
      {user ? (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <DataSyncProvider>
            <AlarmProvider>
              {user.user_type === 'pharmacy_admin' ? <PharmacyAdminTabs /> : <MainTabs />}
              <ChatBotFAB />
              <AlarmModal />
            </AlarmProvider>
          </DataSyncProvider>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
          <AuthStackScreens />
        </SafeAreaView>
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
    <ErrorBoundary>
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ThemedApp />
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
