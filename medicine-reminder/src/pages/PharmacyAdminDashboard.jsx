import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { API_BASE_URL } from "../services/api";

const PharmacyAdminDashboard = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const [pharmacyAdmin, setPharmacyAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    adverseReactions: 0,
    lastUpdate: new Date(),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPharmacyAdminData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Authentication token not found.");
          return;
        }

        /* ================= PROFILE ================= */
        const profileResponse = await fetch(
          `${API_BASE_URL}/pharmacy-admin/profile/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
          }
        );

        if (!profileResponse.ok) {
          throw new Error("Failed to fetch pharmacy admin profile.");
        }

        const profileData = await profileResponse.json();
        setPharmacyAdmin(profileData);

        setStats((prev) => ({
          ...prev,
          totalPatients: profileData.patient_count || 0,
          activePatients: profileData.active_patient_count || 0,
        }));

        /* ================= ADVERSE REACTIONS ================= */
        const reactionsResponse = await fetch(
          `${API_BASE_URL}/pharmacy-admin/adverse-reactions/`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${token}`,
            },
          }
        );

        if (reactionsResponse.ok) {
          const reactionsData = await reactionsResponse.json();
          const count = Array.isArray(reactionsData)
            ? reactionsData.length
            : reactionsData.count || 0;

          setStats((prev) => ({
            ...prev,
            adverseReactions: count,
          }));
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacyAdminData();
  }, []);

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-teal-600 rounded-full animate-spin" />
          <p className="mt-4 text-gray-600">
            {t('pharmacyAdminDashboard.loading')}
          </p>
        </div>
      </BaseLayout>
    );
  }

  /* ================= ERROR ================= */
  if (error) {
    return (
      <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('pharmacyAdminDashboard.title')}
          </h1>
          {pharmacyAdmin && (
            <p className="mt-2 text-gray-600">
              {t('pharmacyAdminDashboard.welcome')} {pharmacyAdmin.facility_name} (
              {pharmacyAdmin.pharmacy_id})
            </p>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t('pharmacyAdminDashboard.totalPatients')}
            value={stats.totalPatients}
            color="blue"
          />
          <StatCard
            title={t('pharmacyAdminDashboard.activePatients')}
            value={stats.activePatients}
            color="green"
          />
          <StatCard
            title={t('pharmacyAdminDashboard.adverseReactions')}
            value={stats.adverseReactions}
            color="red"
          />
        </div>

        {/* QUICK ACTIONS */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {t('pharmacyAdminDashboard.quickActions')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickLink
              to="/pharmacy-admin/patients"
              title={t('pharmacyAdminDashboard.viewPatients')}
              description={t('pharmacyAdminDashboard.viewPatientsDesc')}
            />

            <QuickLink
              to="/pharmacy-admin/adverse-reactions"
              title={t('pharmacyAdminDashboard.adverseReactions')}
              description={t('pharmacyAdminDashboard.adverseReactionsDesc')}
            />

            <QuickLink
              to="/profile"
              title={t('pharmacyAdminDashboard.profileSettings')}
              description={t('pharmacyAdminDashboard.profileSettingsDesc')}
            />
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

/* ================= SMALL REUSABLE COMPONENTS ================= */

const StatCard = ({ title, value, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <p className="text-gray-600 text-sm font-medium">{title}</p>
    <p className={`text-3xl font-bold text-${color}-600 mt-2`}>
      {value}
    </p>
  </div>
);

const QuickLink = ({ to, title, description }) => (
  <Link
    to={to}
    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
  >
    <p className="font-semibold text-gray-900">{title}</p>
    <p className="text-sm text-gray-600">{description}</p>
  </Link>
);

export default PharmacyAdminDashboard;
