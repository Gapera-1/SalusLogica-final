import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LanguageProvider } from './src/i18n/LanguageContext';

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Dashboard') iconName = focused ? 'grid' : 'grid-outline';
          else if (route.name === 'Medicines') iconName = focused ? 'medkit' : 'medkit-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          else if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          else if (route.name === 'DoseHistory') iconName = focused ? 'clock' : 'clock-outline';
          else if (route.name === 'SafetyCheck') iconName = focused ? 'shield-check' : 'shield-check-outline';
          else if (route.name === 'FoodAdvice') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'InteractionChecker') iconName = focused ? 'pulse' : 'pulse-outline';
          else if (route.name === 'ContraIndications') iconName = focused ? 'alert' : 'alert-outline';
          else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
          else iconName = 'help';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Medicines" component={MedicinesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsDashboard} />
      <Tab.Screen name="DoseHistory" component={DoseHistory} />
      <Tab.Screen name="SafetyCheck" component={SafetyCheck} />
      <Tab.Screen name="FoodAdvice" component={FoodAdvice} />
      <Tab.Screen name="InteractionChecker" component={InteractionChecker} />
      <Tab.Screen name="ContraIndications" component={ContraIndications} />
      <Tab.Screen name="Notifications" component={NotificationCenter} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PaperProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddMedicine" component={AddMedicineScreen} />
            <Stack.Screen name="SafetyCheck" component={SafetyCheck} />
            <Stack.Screen name="FoodAdvice" component={FoodAdvice} />
            <Stack.Screen name="InteractionChecker" component={InteractionChecker} />
            <Stack.Screen name="ContraIndications" component={ContraIndications} />
            <Stack.Screen name="DoseHistory" component={DoseHistory} />
            <Stack.Screen name="Analytics" component={AnalyticsDashboard} />
            <Stack.Screen name="Notifications" component={NotificationCenter} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </LanguageProvider>
  );
}
