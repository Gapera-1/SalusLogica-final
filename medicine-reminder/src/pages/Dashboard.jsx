import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { analyticsAPI } from "../services/api";
import useAlarmManager from "../hooks/useAlarmManager"; // ✅ FIXED IMPORT
import { useLanguage } from "../i18n";

const Dashboard = ({ setIsAuthenticated, user }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [medicines, setMedicines] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const { activeAlarms = [] } = useAlarmManager(); // ✅ safe fallback

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const data = await analyticsAPI.getDashboard();

        setUser(data.user || { username: "Demo User", role: "patient" });
        setMedicines(data.medicines || []);
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);

        // Fallback mock data - don't set user since it's a prop now
        
        setMedicines([
          { id: 1, name: "Aspirin", dosage: "100mg", frequency: "Once daily", nextDose: "2:00 PM" },
          { id: 2, name: "Vitamin D", dosage: "1000IU", frequency: "Once daily", nextDose: "8:00 AM" },
          { id: 3, name: "Omega-3", dosage: "500mg", frequency: "Twice daily", nextDose: "12:00 PM" }
        ]);

        setNotifications([
          { id: 1, type: "reminder", message: "Time to take Aspirin", time: "2:00 PM", read: false },
          { id: 2, type: "refill", message: "Vitamin D running low", time: "Yesterday", read: false },
          { id: 3, type: "appointment", message: "Doctor appointment tomorrow", time: "2 days ago", read: true }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/");
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white mt-4">{t('dashboard.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.welcomeBack', { name: user?.username || "User" })}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('dashboard.role')}: <span className="font-medium capitalize">{user?.role || "patient"}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.totalMedicines')}</h3>
            <p className="text-sm text-gray-600">{medicines.length}</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.activeAlarms')}</h3>
            <p className="text-sm text-gray-600">{activeAlarms.length} {t('dashboard.pending')}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.adherenceRate')}</h3>
            <p className="text-sm text-gray-600">95%</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900">{t('dashboard.nextDose')}</h3>
            <p className="text-sm text-gray-600">2:00 PM</p>
          </div>

        </div>

      </div>
    </BaseLayout>
  );
};

export default Dashboard;
