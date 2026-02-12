# SalusLogica Mobile App

A React Native mobile application for SalusLogica medicine reminder system.

## Features

- **Multilingual Support**: English, French, and Kinyarwanda
- **Medicine Management**: Add, edit, and track medications
- **Dose Reminders**: Smart reminders for medication schedules
- **Dashboard**: Overview of medication adherence and upcoming doses
- **User Profiles**: Personal and medical information management
- **Responsive Design**: Optimized for mobile devices

## Technology Stack

- **React Native** with Expo
- **React Navigation** for navigation
- **React Native Paper** for UI components
- **Multilingual i18n** system
- **AsyncStorage** for local data persistence

## Project Structure

```
Mobile/
├── App.js                    # Main app component with navigation
├── index.js                  # App entry point
├── package.json              # Dependencies and scripts
├── app.json                 # Expo configuration
├── babel.config.js           # Babel configuration
└── src/
    ├── i18n/
    │   ├── LanguageContext.js    # Language context and provider
    │   ├── useTranslation.js     # Translation hook
    │   └── translations/
    │       ├── en.json          # English translations
    │       ├── fr.json          # French translations
    │       └── rw.json          # Kinyarwanda translations
    └── screens/
        ├── HomeScreen.js        # Landing screen
        ├── LoginScreen.js       # User authentication
        ├── SignupScreen.js      # User registration
        ├── DashboardScreen.js   # Main dashboard
        ├── MedicinesScreen.js   # Medicine management
        ├── ProfileScreen.js     # User profile
        └── AddMedicineScreen.js # Add new medicine
```

## Getting Started

1. Install dependencies:
   ```bash
   cd Mobile
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Run on specific platforms:
   ```bash
   npm run android    # For Android
   npm run ios        # For iOS
   npm run web        # For web
   ```

## API Integration

The mobile app is designed to connect to the same Django backend as the web application. API endpoints should be configured to point to your backend server.

## Key Screens

- **Home**: Welcome screen with app features overview
- **Login/Signup**: User authentication and registration
- **Dashboard**: Main dashboard with stats and upcoming medicines
- **Medicines**: Medicine list with search and filtering
- **Add Medicine**: Form to add new medications
- **Profile**: User profile management with preferences
- **Analytics Dashboard**: Medicine adherence analytics and charts
- **Dose History**: Detailed medication dose tracking
- **Safety Check**: Drug safety validation for different populations
- **Food Advice**: Medication-food interaction recommendations
- **Interaction Checker**: Drug-drug interaction analysis
- **Contra-indications**: Medication contraindications and warnings
- **Notification Center**: Medicine reminders and alerts management

## Notes

- The app uses the same translation keys as the web application for consistency
- Navigation uses React Navigation with bottom tabs and stack navigation
- UI components from React Native Paper for consistent design
- Supports offline functionality with local storage
