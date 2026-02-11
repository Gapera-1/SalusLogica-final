import React, { useState } from 'react';
import { useTranslation } from '../services/i18n';

const LanguageSwitcher = ({ variant = 'dropdown' }) => {
    const { currentLanguage, changeLanguage, languageOptions, loading } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);

    const handleLanguageChange = async (languageCode) => {
        try {
            await changeLanguage(languageCode);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    const getFlag = (code) => {
        const flags = {
            en: '🇺🇸',
            fr: '🇫🇷',
            rw: '🇷🇼',
        };
        return flags[code] || '🌍';
    };

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 w-24 bg-gray-200 rounded"></div>
            </div>
        );
    }

    // Dropdown Variant
    if (variant === 'dropdown') {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <span className="text-lg">{getFlag(currentLanguage)}</span>
                    <span className="font-medium">
                        {languageOptions.find(lang => lang.value === currentLanguage)?.name || 'Language'}
                    </span>
                    <svg
                        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                        {languageOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleLanguageChange(option.value)}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                                    option.value === currentLanguage ? 'bg-blue-50 text-blue-600' : ''
                                }`}
                            >
                                <span className="text-lg">{option.flag}</span>
                                <span className="font-medium">{option.name}</span>
                                {option.value === currentLanguage && (
                                    <svg className="w-4 h-4 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Button Variant
    if (variant === 'buttons') {
        return (
            <div className="flex space-x-2">
                {languageOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleLanguageChange(option.value)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            option.value === currentLanguage
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <span className="mr-2">{option.flag}</span>
                        {option.name}
                    </button>
                ))}
            </div>
        );
    }

    // Compact Variant
    if (variant === 'compact') {
        return (
            <div className="flex space-x-1">
                {languageOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => handleLanguageChange(option.value)}
                        className={`p-2 rounded-lg text-lg transition-colors ${
                            option.value === currentLanguage
                                ? 'bg-blue-100 text-blue-600'
                                : 'hover:bg-gray-100'
                        }`}
                        title={option.name}
                    >
                        {option.flag}
                    </button>
                ))}
            </div>
        );
    }

    return null;
};

export default LanguageSwitcher;
