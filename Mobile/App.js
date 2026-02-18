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

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator();

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

// Main Tab Navigator for authenticated users
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Medicines') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else iconName = 'help';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Medicines" component={MedicinesScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsDashboard} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// Main App Stack with authenticated screens
function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
      <Stack.Screen name="DoseHistory" component={DoseHistory} />
      <Stack.Screen name="SafetyCheck" component={SafetyCheck} />
      <Stack.Screen name="FoodAdvice" component={FoodAdvice} />
      <Stack.Screen name="InteractionChecker" component={InteractionChecker} />
      <Stack.Screen name="ContraIndications" component={ContraIndications} />
      <Stack.Screen name="Notifications" component={NotificationCenter} />
      <Stack.Screen name="ExportReports" component={ExportReportsScreen} />
      <Stack.Screen name="SideEffects" component={SideEffectTrackerScreen} />
    </Stack.Navigator>
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
      {user ? <AppStack /> : <AuthStackScreens />}
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
