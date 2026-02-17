import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import MedicineCard from "../components/MedicineCard";
import { SkeletonDashboard } from "../components/SkeletonLoaders";
import { analyticsAPI, medicineAPI } from "../services/api";
import useAlarmManager from "../hooks/useAlarmManager"; // ✅ FIXED IMPORT
import { useLanguage } from "../i18n";
import toast from 'react-hot-toast';

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
        // Fetch medicines from the API
        const medicinesData = await medicineAPI.getAll();
        // Backend already filters out zero-stock items, but ensure local state is clean
        const activeMedicines = (medicinesData || []).filter(m => 
          m.stock_count && m.stock_count > 0
        );
        setMedicines(activeMedicines);

        // Try to fetch dashboard analytics if available
        try {
          const data = await analyticsAPI.getDashboard();
          setNotifications(data.notifications || []);
        } catch (analyticsError) {
          console.log("Analytics not available, using basic data");
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
        toast.error("Failed to load medicines");
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

  const handleEditMedicine = (medicine) => {
    navigate(`/edit-medicine/${medicine.id}`, { state: { medicine } });
  };

  const handleDeleteMedicine = async (medicine) => {
    if (window.confirm(`Delete "${medicine.name}" from your medicines?`)) {
      try {
        await medicineAPI.delete(medicine.id);
        setMedicines(prev => prev.filter(m => m.id !== medicine.id));
        toast.success(`"${medicine.name}" has been deleted`);
      } catch (error) {
        console.error('Failed to delete medicine:', error);
        toast.error(error?.response?.data?.detail || 'Failed to delete medicine');
      }
    }
  };

  const markNotificationRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonDashboard />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('dashboard.welcomeBack', { patient: user?.username || "User" })}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('dashboard.role')}: <span className="font-medium capitalize">{user?.role || "patient"}</span>
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">

          <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-teal-100 flex items-center justify-center">
                <i className="fas fa-pills text-teal-600"></i>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{t('dashboard.totalMedicines')}</h3>
            </div>
            <p className="text-3xl font-bold text-teal-600 mt-2">{medicines.length}</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <i className="fas fa-bell text-emerald-600"></i>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{t('dashboard.activeAlarms')}</h3>
            </div>
            <p className="text-3xl font-bold text-emerald-600 mt-2">{activeAlarms.length}</p>
          </div>

          <div className="bg-sky-50 border border-sky-200 rounded-2xl p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <i className="fas fa-chart-line text-sky-600"></i>
              </div>
              <h3 className="text-sm font-medium text-gray-600">{t('dashboard.adherenceRate')}</h3>
            </div>
            <p className="text-3xl font-bold text-sky-600 mt-2">95%</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <i className="fas fa-exclamation-triangle text-amber-600"></i>
              </div>
              <h3 className="text-sm font-medium text-gray-600">Low Stock</h3>
            </div>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {medicines.filter(m => m.stock_count <= 10).length}
            </p>
          </div>

        </div>

        {/* My Medicines Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">My Medicines</h2>
            <button
              onClick={() => navigate('/add-medicine')}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors duration-200 flex items-center gap-2 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Medicine
            </button>
          </div>

          {medicines.length === 0 ? (
            <div className="rounded-2xl p-12 text-center border-2 border-dashed border-gray-300" style={{ background: 'var(--bg-secondary)' }}>
              <div className="text-6xl mb-4">💊</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No medicines yet</h3>
              <p className="text-gray-500 mb-6">Add your first medicine to get started with tracking</p>
              <button
                onClick={() => navigate('/add-medicine')}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors duration-200 shadow-sm"
              >
                Add Your First Medicine
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {medicines.map(medicine => (
                <MedicineCard
                  key={medicine.id}
                  medicine={medicine}
                  onEdit={handleEditMedicine}
                  onDelete={handleDeleteMedicine}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </BaseLayout>
  );
};

export default Dashboard;
