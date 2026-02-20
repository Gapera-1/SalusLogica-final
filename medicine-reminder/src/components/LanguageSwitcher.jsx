import React, { useState } from 'react';
import { useLanguage } from '../i18n';

const LanguageSwitcher = ({ variant = 'dropdown' }) => {
    const { language, setLanguage, languages, loadingLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const handleLanguageChange = (languageCode) => {
        try {
            setLanguage(languageCode);
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

    if (loadingLanguage) {
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
                    className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                    <span className="text-lg">{getFlag(language)}</span>
                    <span className="font-medium">
                        {languages.find(lang => lang === language) || 'Language'}
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
                        {languages.map((option) => (
                            <button
                                key={option}
                                onClick={() => handleLanguageChange(option)}
                                className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-3 transition-colors ${
                                    option === language ? 'bg-teal-50 text-teal-600' : ''
                                }`}
                            >
                                <span className="text-lg">{getFlag(option)}</span>
                                <span className="font-medium">{option}</span>
                                {option === language && (
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
                {languages.map((option) => (
                    <button
                        key={option}
                        onClick={() => handleLanguageChange(option)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            option === language
                                ? 'bg-teal-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                        <span className="mr-2">{getFlag(option)}</span>
                        {option}
                    </button>
                ))}
            </div>
        );
    }

    // Compact Variant - shows current language, expands on click
    if (variant === 'compact') {
        return (
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                    title={language.toUpperCase()}
                >
                    <span className="text-lg">{getFlag(language)}</span>
                    <span className="text-xs font-medium uppercase">{language}</span>
                    <svg
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {isOpen && (
                    <>
                        {/* Backdrop to close dropdown when clicking outside */}
                        <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setIsOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                            {languages.map((option) => (
                                <button
                                    key={option}
                                    onClick={() => handleLanguageChange(option)}
                                    className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2 transition-colors ${
                                        option === language ? 'bg-teal-50 text-teal-600' : 'text-gray-700'
                                    }`}
                                >
                                    <span className="text-lg">{getFlag(option)}</span>
                                    <span className="text-sm font-medium uppercase">{option}</span>
                                    {option === language && (
                                        <svg className="w-4 h-4 ml-auto text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }

    return null;
};

export default LanguageSwitcher;
