import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Logo from "./Logo";
import useAlarmManager from "../hooks/useAlarmManager"; // ✅ FIXED IMPORT
import { useLanguage } from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";

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
    <nav className="sticky top-0 z-50 border-b" style={{ background: 'var(--nav-bg)', borderColor: 'var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo */}
          <div className="flex items-center">
            <Logo className="h-9 w-auto" />
          </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex sm:space-x-1 items-center">

            {/* Language Switcher - Always visible */}
            <LanguageSwitcher variant="compact" />

            {/* Patient Navigation Links */}
            {isPatient && (
              <>
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/dashboard")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.dashboard')}
                </Link>

                <Link
                  to="/medicine-list"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/medicine-list")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.medicines')}
                </Link>

                <Link
                  to="/analytics"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/analytics")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.analytics')}
                </Link>

                <Link
                  to="/interaction-checker"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/interaction-checker")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.interactionChecker')}
                </Link>

                <Link
                  to="/dose-history"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/dose-history")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.doseHistory')}
                </Link>

                <Link
                  to="/safety-check"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/safety-check")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.safetyCheck')}
                </Link>

                <Link
                  to="/food-advice"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/food-advice")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.foodAdvice')}
                </Link>
              </>
            )}

            {/* Pharmacy Admin Navigation Links */}
            {isPharmacyAdmin && (
              <>
                <Link
                  to="/pharmacy-admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/dashboard")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.dashboard')}
                </Link>

                <Link
                  to="/pharmacy-admin/patients"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/patients")
                      ? "bg-teal-50 text-teal-700"
                      : "text-gray-600 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {t('navigation.patients')}
                </Link>

                <Link
                  to="/pharmacy-admin/adverse-reactions"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/adverse-reactions")
                      ? "bg-amber-50 text-amber-700"
                      : "text-gray-600 hover:text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {t('navigation.adverseReactions')}
                </Link>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-3">

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Alarm Indicator */}
            {activeAlarms.length > 0 && (
              <Link
                to="/notifications"
                className="relative px-3 py-2 rounded-xl text-white bg-amber-500 hover:bg-amber-600 transition-colors"
              >
                🔔 {t('navigation.alarms')}
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                  {activeAlarms.length}
                </span>
              </Link>
            )}

            {/* Profile Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="p-0.5 rounded-full hover:ring-2 hover:ring-teal-400 hover:ring-offset-2 transition-all"
                title={t('navigation.profileMenu')}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover border-2 border-teal-200"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {user?.username ? user.username.charAt(0).toUpperCase() : '?'}
                    </span>
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg z-50 border border-gray-200 overflow-hidden animate-fade-in">
                  {/* User info header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-100">
                    <p className="text-sm font-semibold text-teal-800">{user?.username || 'User'}</p>
                    <p className="text-xs text-teal-600 capitalize">{user?.user_type || 'Patient'}</p>
                  </div>
                  <button
                    onClick={handleViewProfile}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-2 border-b border-gray-100"
                  >
                    <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{t('navigation.viewProfile')}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors flex items-center space-x-2 text-red-600"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
