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
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const moreMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    console.log("Logout clicked");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("lastVisitedRoute");
    if (typeof setIsAuthenticated === "function") {
      setIsAuthenticated(false);
    }
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
    <nav className="sticky top-0 z-50 border-b shadow-lg" style={{ background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)', borderColor: 'rgba(255,255,255,0.1)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Left: Hamburger + Logo */}
          <div className="flex items-center">
            {/* Mobile hamburger button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden inline-flex items-center justify-center p-2 mr-2 rounded-lg text-white/90 hover:text-white hover:bg-white/15 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
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
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.dashboard')}
                </Link>

                <Link
                  to="/medicine-list"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/medicine-list")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.medicines')}
                </Link>

                <Link
                  to="/analytics"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/analytics")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.analytics')}
                </Link>

                <Link
                  to="/interaction-checker"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/interaction-checker")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.interactionChecker')}
                </Link>

                <Link
                  to="/dose-history"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/dose-history")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.doseHistory')}
                </Link>

                <Link
                  to="/safety-check"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/safety-check")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.safetyCheck')}
                </Link>

                <Link
                  to="/food-advice"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/food-advice")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.foodAdvice')}
                </Link>

                {/* More Menu Dropdown */}
                <div ref={moreMenuRef} className="relative">
                  <button
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1 ${
                      isActive("/side-effects") || isActive("/export-reports") || isActive("/notifications")
                        ? "bg-white/25 text-white"
                        : "text-white/90 hover:text-white hover:bg-white/15"
                    }`}
                  >
                    <span>{t('navigation.more') || 'More'}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${moreMenuOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg z-50 border border-gray-200 overflow-hidden">
                      <Link
                        to="/side-effects"
                        onClick={() => setMoreMenuOpen(false)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                          isActive("/side-effects") ? "bg-amber-50 text-amber-700" : "text-gray-700"
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm font-medium">{t('navigation.sideEffects')}</span>
                      </Link>
                      <Link
                        to="/notifications"
                        onClick={() => setMoreMenuOpen(false)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 border-t border-gray-100 ${
                          isActive("/notifications") ? "bg-teal-50 text-teal-700" : "text-gray-700"
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <span className="text-sm font-medium">{t('navigation.notifications')}</span>
                      </Link>
                      <Link
                        to="/export-reports"
                        onClick={() => setMoreMenuOpen(false)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center space-x-3 border-t border-gray-100 ${
                          isActive("/export-reports") ? "bg-teal-50 text-teal-700" : "text-gray-700"
                        }`}
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm font-medium">{t('navigation.exportReports')}</span>
                      </Link>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Pharmacy Admin Navigation Links */}
            {isPharmacyAdmin && (
              <>
                <Link
                  to="/pharmacy-admin/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/dashboard")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.dashboard')}
                </Link>

                <Link
                  to="/pharmacy-admin/patients"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/patients")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.patients')}
                </Link>

                <Link
                  to="/pharmacy-admin/adverse-reactions"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/pharmacy-admin/adverse-reactions")
                      ? "bg-amber-400/30 text-amber-100"
                      : "text-white/90 hover:text-amber-100 hover:bg-amber-400/20"
                  }`}
                >
                  {t('navigation.adverseReactions')}
                </Link>

                <Link
                  to="/export-reports"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive("/export-reports")
                      ? "bg-white/25 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/15"
                  }`}
                >
                  {t('navigation.exportReports')}
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
                className="p-0.5 rounded-full hover:ring-2 hover:ring-white/50 hover:ring-offset-2 hover:ring-offset-teal-600 transition-all"
                title={t('navigation.profileMenu')}
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt="Profile"
                    className="h-9 w-9 rounded-full object-cover border-2 border-white/50"
                  />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-white/90 to-teal-100 flex items-center justify-center border-2 border-white/50">
                    <span className="text-teal-700 text-sm font-semibold">
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

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div ref={mobileMenuRef} className="sm:hidden border-t border-white/20 animate-fade-in">
          <div className="px-4 py-3 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">

            {/* Language Switcher */}
            <div className="pb-2 mb-2 border-b border-white/20">
              <LanguageSwitcher variant="compact" />
            </div>

            {/* Patient Mobile Links */}
            {isPatient && (
              <>
                <Link to="/dashboard"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/dashboard") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.dashboard')}
                </Link>
                <Link to="/medicine-list"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/medicine-list") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.medicines')}
                </Link>
                <Link to="/analytics"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/analytics") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.analytics')}
                </Link>
                <Link to="/interaction-checker"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/interaction-checker") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.interactionChecker')}
                </Link>
                <Link to="/dose-history"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/dose-history") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.doseHistory')}
                </Link>
                <Link to="/safety-check"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/safety-check") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.safetyCheck')}
                </Link>
                <Link to="/food-advice"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/food-advice") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.foodAdvice')}
                </Link>

                {/* More section items shown inline on mobile */}
                <div className="pt-2 mt-2 border-t border-white/20">
                  <p className="px-3 py-1 text-xs font-semibold text-white/60 uppercase tracking-wider">{t('navigation.more') || 'More'}</p>
                  <Link to="/side-effects"
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/side-effects") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                  >
                    {t('navigation.sideEffects')}
                  </Link>
                  <Link to="/notifications"
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/notifications") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                  >
                    {t('navigation.notifications')}
                  </Link>
                  <Link to="/export-reports"
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/export-reports") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                  >
                    {t('navigation.exportReports')}
                  </Link>
                </div>
              </>
            )}

            {/* Pharmacy Admin Mobile Links */}
            {isPharmacyAdmin && (
              <>
                <Link to="/pharmacy-admin/dashboard"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/pharmacy-admin/dashboard") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.dashboard')}
                </Link>
                <Link to="/pharmacy-admin/patients"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/pharmacy-admin/patients") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.patients')}
                </Link>
                <Link to="/pharmacy-admin/adverse-reactions"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/pharmacy-admin/adverse-reactions") ? "bg-amber-400/30 text-amber-100" : "text-white/90 hover:text-amber-100 hover:bg-amber-400/20"}`}
                >
                  {t('navigation.adverseReactions')}
                </Link>
                <Link to="/export-reports"
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive("/export-reports") ? "bg-white/25 text-white" : "text-white/90 hover:text-white hover:bg-white/15"}`}
                >
                  {t('navigation.exportReports')}
                </Link>
              </>
            )}

            {/* Mobile Profile Actions */}
            <div className="pt-2 mt-2 border-t border-white/20">
              <button onClick={handleViewProfile}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white/90 hover:text-white hover:bg-white/15 transition-colors flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t('navigation.viewProfile')}</span>
              </button>
              <button onClick={handleLogout}
                className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-200 hover:text-red-100 hover:bg-red-500/20 transition-colors flex items-center space-x-2"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t('navigation.signOut')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
