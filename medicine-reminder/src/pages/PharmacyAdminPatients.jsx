import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";

const PharmacyAdminPatients = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterActive !== "all") {
          params.append("is_active", filterActive === "active" ? "true" : "false");
        }

        const response = await fetch(
          `http://127.0.0.1:8000/api/pharmacy-admin/patients/?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${localStorage.getItem("access_token")}`
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch patients");
        }

        const data = await response.json();
        setPatients(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError(err.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [filterActive]);

  const filteredPatients = patients.filter(
    (patient) =>
      patient.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-teal-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">{t('pharmacyAdminPatients.loading')}</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('pharmacyAdminPatients.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('pharmacyAdminPatients.subtitle')}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('pharmacyAdminPatients.searchPatients')}
              </label>
              <input
                type="text"
                placeholder={t('pharmacyAdminPatients.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('pharmacyAdminPatients.filterStatus')}
              </label>
              <select
                value={filterActive}
                onChange={(e) => setFilterActive(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">{t('pharmacyAdminPatients.allPatients')}</option>
                <option value="active">{t('pharmacyAdminPatients.active')}</option>
                <option value="inactive">{t('pharmacyAdminPatients.inactive')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Patients Table */}
        {filteredPatients.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pharmacyAdminPatients.username')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pharmacyAdminPatients.email')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pharmacyAdminPatients.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pharmacyAdminPatients.joinedDate')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pharmacyAdminPatients.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patient.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {patient.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            patient.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {patient.is_active ? t('pharmacyAdminPatients.active') : t('pharmacyAdminPatients.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {patient.date_joined
                          ? new Date(patient.date_joined).toLocaleDateString()
                          : t('common.na')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => alert(`View details for ${patient.username}`)}
                          className="text-teal-600 hover:text-teal-900 mr-4"
                        >
                          {t('pharmacyAdminPatients.view')}
                        </button>
                        <button
                          onClick={() => alert(`View medicines for ${patient.username}`)}
                          className="text-green-600 hover:text-green-900"
                        >
                          {t('pharmacyAdminPatients.medicines')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                {t('pharmacyAdminPatients.showing')} <span className="font-semibold">{filteredPatients.length}</span> {t('pharmacyAdminPatients.of')}{" "}
                <span className="font-semibold">{patients.length}</span> {t('pharmacyAdminPatients.patients')}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">{t('pharmacyAdminPatients.noPatients')}</h3>
            <p className="mt-1 text-sm text-gray-600">
              {searchTerm
                ? t('pharmacyAdminPatients.noMatchSearch')
                : t('pharmacyAdminPatients.noRegistered')}
            </p>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default PharmacyAdminPatients;
