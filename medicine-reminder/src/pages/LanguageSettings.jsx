import React, { useState } from 'react';
import { useTranslation } from '../services/i18n';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useAppContext } from '../contexts/AppContext';

const LanguageSettings = () => {
    const { currentLanguage, changeLanguage, languageOptions, formatDate } = useTranslation();
    const { user, updateProfile } = useAppContext();
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState('');

    const handleLanguageChange = async (languageCode) => {
        setIsUpdating(true);
        setMessage('');
        
        try {
            // Change frontend language
            await changeLanguage(languageCode);
            
            // Update backend preference
            if (user) {
                await updateProfile({ preferred_language: languageCode });
                setMessage('Language preference updated successfully!');
            }
        } catch (error) {
            console.error('Failed to update language:', error);
            setMessage('Failed to update language preference');
        } finally {
            setIsUpdating(false);
        }
    };

    const getCurrentLanguageInfo = () => {
        return languageOptions.find(lang => lang.value === currentLanguage) || languageOptions[0];
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Language Settings
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Choose your preferred language for the app interface
                    </p>
                </div>

                {/* Current Language Display */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Current Language
                    </h2>
                    <div className="flex items-center space-x-4">
                        <span className="text-4xl">{getCurrentLanguageInfo().flag}</span>
                        <div>
                            <div className="text-xl font-medium text-gray-900">
                                {getCurrentLanguageInfo().name}
                            </div>
                            <div className="text-sm text-gray-500">
                                Code: {currentLanguage}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Language Switcher */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Quick Switch
                    </h2>
                    <LanguageSwitcher variant="buttons" />
                </div>

                {/* Available Languages */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        All Languages
                    </h2>
                    <div className="space-y-3">
                        {languageOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleLanguageChange(option.value)}
                                disabled={isUpdating}
                                className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                                    option.value === currentLanguage
                                        ? 'border-teal-500 bg-teal-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center space-x-4">
                                    <span className="text-3xl">{option.flag}</span>
                                    <div className="text-left">
                                        <div className="font-medium text-gray-900">
                                            {option.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {option.code}
                                        </div>
                                    </div>
                                </div>
                                {option.value === currentLanguage && (
                                    <div className="flex items-center space-x-2 text-teal-600">
                                        <span className="text-sm font-medium">Active</span>
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Message */}
                {message && (
                    <div className={`rounded-lg p-4 mb-6 ${
                        message.includes('successfully') 
                            ? 'bg-green-50 text-green-800 border border-green-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message}
                    </div>
                )}

                {/* Loading Overlay */}
                {isUpdating && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
                            <p className="text-gray-600">Updating language preference...</p>
                        </div>
                    </div>
                )}

                {/* Additional Information */}
                <div className="bg-teal-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-teal-900 mb-3">
                        💡 Language Information
                    </h3>
                    <div className="space-y-2 text-teal-800">
                        <p>
                            <strong>English:</strong> Default language, full support
                        </p>
                        <p>
                            <strong>Français:</strong> Complete French translation
                        </p>
                        <p>
                            <strong>Kinyarwanda:</strong> Complete Kinyarwanda translation
                        </p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-teal-200">
                        <p className="text-sm text-teal-700">
                            Your language preference is saved and will be used across all your devices.
                        </p>
                    </div>
                </div>

                {/* Test Section */}
                <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        🧪 Test Translations
                    </h3>
                    <div className="space-y-3">
                        <div className="p-3 bg-gray-50 rounded">
                            <strong>Dashboard:</strong> {useTranslation().t('Medicine Dashboard')}
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                            <strong>Welcome:</strong> {useTranslation().t('Welcome, %(name)s', { name: 'John' })}
                        </div>
                        <div className="p-3 bg-gray-50 rounded">
                            <strong>Date:</strong> {formatDate(new Date())}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LanguageSettings;
