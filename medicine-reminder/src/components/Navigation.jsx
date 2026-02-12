import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import useAlarmManager from "../hooks/useAlarmManager"; // ✅ FIXED IMPORT
import { useLanguage } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";

const Navigation = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { activeAlarms = [] } = useAlarmManager(); // safe fallback
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Get user from localStorage
  const getUser = () => {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error parsing user from localStorage:", error);
      return null;
    }
  };

  const user = getUser();
  const isPharmacyAdmin = user?.user_type === "pharmacy_admin";
  const isPatient = user && user?.user_type !== "pharmacy_admin";

  console.log("Navigation component - Current location:", location.pathname);
  console.log("Navigation component - User:", user);
  console.log("Navigation component - Is Pharmacy Admin:", isPharmacyAdmin);
  console.log("Navigation component - Is Patient:", isPatient);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    console.log("Logout clicked");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    setIsAuthenticated(false);
    setProfileDropdownOpen(false);
    navigate("/");
  };

  const handleViewProfile = () => {
    navigate("/profile");
    setProfileDropdownOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-24">

          {/* Logo */}
          <div className="flex items-center">
            <Logo className="h-10 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex sm:space-x-8 items-center">

            {/* Language Switcher - Always visible */}
            <LanguageSwitcher variant="compact" />

            {/* Patient Navigation Links */}
            {isPatient && (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium ${
                    isActive("/dashboard")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {t('navigation.dashboard')}
                </Link>

                <Link
                  to="/medicine-list"
                  className={`text-sm font-medium ${
                    isActive("/medicine-list")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {t('navigation.medicines')}
                </Link>

                <Link
                  to="/analytics"
                  className={`text-sm font-medium ${
                    isActive("/analytics")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {t('navigation.analytics')}
                </Link>

                <Link
                  to="/interaction-checker"
                  className={`text-sm font-medium ${
                    isActive("/interaction-checker")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {t('navigation.interactionChecker')}
                </Link>

                <Link
                  to="/dose-history"
                  className={`text-sm font-medium ${
                    isActive("/dose-history")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  {t('navigation.doseHistory')}
                </Link>

                <Link
                  to="/safety-check"
                  className={`text-sm font-medium ${
                    isActive("/safety-check")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  🛡️ {t('navigation.safetyCheck')}
                </Link>

                <Link
                  to="/food-advice"
                  className={`text-sm font-medium ${
                    isActive("/food-advice")
                      ? "text-blue-600"
                      : "text-gray-900 hover:text-blue-600"
                  }`}
                >
                  🍽 {t('navigation.foodAdvice')}
                </Link>
              </>
            )}

            {/* Pharmacy Admin Navigation Links */}
            {isPharmacyAdmin && (
              <>
                <Link
                  to="/pharmacy-admin/dashboard"
                  className={`text-sm font-medium ${
                    isActive("/pharmacy-admin/dashboard")
                      ? "text-green-600"
                      : "text-gray-900 hover:text-green-600"
                  }`}
                >
                  🏪 Pharmacy Dashboard
                </Link>

                <Link
                  to="/pharmacy-admin/patients"
                  className={`text-sm font-medium ${
                    isActive("/pharmacy-admin/patients")
                      ? "text-green-600"
                      : "text-gray-900 hover:text-green-600"
                  }`}
                >
                  👥 Patients
                </Link>

                <Link
                  to="/pharmacy-admin/adverse-reactions"
                  className={`text-sm font-medium ${
                    isActive("/pharmacy-admin/adverse-reactions")
                      ? "text-green-600"
                      : "text-gray-900 hover:text-green-600"
                  }`}
                >
                  ⚠️ Adverse Reactions
                </Link>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">

            {/* Alarm Indicator - Always visible */}
            {activeAlarms.length > 0 && (
              <Link
                to="/notifications"
                className="relative px-3 py-2 rounded-md text-white bg-orange-600 hover:bg-orange-700 animate-pulse"
              >
                🔔 {t('navigation.alarms')}
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeAlarms.length}
                </span>
              </Link>
            )}

            {/* Profile Dropdown - Always visible */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                title={t('navigation.profileMenu')}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                  <button
                    onClick={handleViewProfile}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 border-b border-gray-100"
                  >
                    <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900">{t('navigation.viewProfile')}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center space-x-2 text-red-600"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm font-medium">{t('navigation.signOut')}</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
