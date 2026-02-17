import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import { useLanguage } from "../i18n";
import { authAPI } from "../services/api";

const Home = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (token) {
          const currentUser = await authAPI.getCurrentUser();
          if (!cancelled) setUser(currentUser);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    checkAuth();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Show navigation only if user is authenticated */}
      {user && <Navigation setIsAuthenticated={setIsAuthenticated} />}
      
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="absolute right-0 top-0 h-full w-1/2" viewBox="0 0 400 400" fill="none">
            <circle cx="300" cy="100" r="200" stroke="white" strokeWidth="0.5"/>
            <circle cx="350" cy="200" r="150" stroke="white" strokeWidth="0.5"/>
            <circle cx="250" cy="300" r="100" stroke="white" strokeWidth="0.5"/>
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="pt-24 pb-20 text-center">
              <Logo className="h-16 w-auto mb-6 mx-auto" />
              <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl tracking-tight">
                {t("home.neverMissYour")}
                <span className="block text-teal-200 mt-2">{t("home.medicineAgain")}</span>
              </h1>
              <p className="mt-6 text-lg text-teal-100 max-w-2xl mx-auto leading-relaxed">
                {t("home.fullDescription")}
              </p>
              <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
                {user ? (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="bg-white text-teal-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-teal-50 transition duration-200 shadow-lg"
                  >
                    {t("home.goToDashboard")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/signup")}
                      className="bg-white text-teal-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-teal-50 transition duration-200 shadow-lg"
                    >
                      {t("home.getStarted")}
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="border-2 border-white/80 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition duration-200"
                    >
                      {t("home.signIn")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl tracking-tight">
              {t("home.features.title")}
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              {t("home.features.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {/* Feature 1 - Medicine Management */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-teal-100 mb-5 group-hover:bg-teal-200 transition-colors">
                <i className="fas fa-pills text-teal-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.medicineManagement.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.medicineManagement.description")}
              </p>
            </div>

            {/* Feature 2 - Smart Reminders */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-100 mb-5 group-hover:bg-emerald-200 transition-colors">
                <i className="fas fa-bell text-emerald-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.smartReminders.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.smartReminders.description")}
              </p>
            </div>

            {/* Feature 3 - Dose Tracking */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-sky-100 mb-5 group-hover:bg-sky-200 transition-colors">
                <i className="fas fa-chart-line text-sky-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.doseTracking.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.doseTracking.description")}
              </p>
            </div>

            {/* Feature 4 - Patient Profiles */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-amber-100 mb-5 group-hover:bg-amber-200 transition-colors">
                <i className="fas fa-user-md text-amber-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.patientProfiles.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.patientProfiles.description")}
              </p>
            </div>

            {/* Feature 5 - Pharmacy Management */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-rose-100 mb-5 group-hover:bg-rose-200 transition-colors">
                <i className="fas fa-hospital text-rose-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.pharmacyManagement.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.pharmacyManagement.description")}
              </p>
            </div>

            {/* Feature 6 - Mobile Compatible */}
            <div className="hc-card text-center hover:shadow-card-hover group">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-2xl bg-violet-100 mb-5 group-hover:bg-violet-200 transition-colors">
                <i className="fas fa-mobile-alt text-violet-600 text-xl"></i>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("home.features.mobileCompatible.title")}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {t("home.features.mobileCompatible.description")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              {t("home.cta.title")}
            </h2>
            <p className="mt-4 text-lg text-teal-100">
              {t("home.cta.subtitle")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              {user ? (
                <button
                  onClick={() => navigate("/medicine-list")}
                  className="bg-white text-teal-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-teal-50 transition duration-200 shadow-lg"
                >
                  {t("home.cta.manageYourMedicines")}
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signup")}
                    className="bg-white text-teal-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-teal-50 transition duration-200 shadow-lg"
                  >
                    {t("home.getStarted")}
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="border-2 border-white/80 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/10 transition duration-200"
                  >
                    {t("home.signIn")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
