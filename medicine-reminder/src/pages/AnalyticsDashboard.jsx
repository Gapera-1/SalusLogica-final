import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";
import useLanguage from "../i18n/useLanguage";

const AnalyticsDashboard = ({ setIsAuthenticated, setUser, user }) => {
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState("PATIENT");
  const [adherenceData, setAdherenceData] = useState({
    average_adherence: 92.5,
    current_trend: "IMPROVING",
    risk_score: 15,
    active_medications: 5
  });
  const [medicinePerformance, setMedicinePerformance] = useState([
    { name: "Aspirin", adherence: 95, doses_taken: 285, total_doses: 300 },
    { name: "Metformin", adherence: 88, doses_taken: 264, total_doses: 300 },
    { name: "Lisinopril", adherence: 92, doses_taken: 276, total_doses: 300 },
    { name: "Atorvastatin", adherence: 85, doses_taken: 255, total_doses: 300 },
    { name: "Vitamin D", adherence: 98, doses_taken: 294, total_doses: 300 }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      setUserRole(user.role?.toUpperCase() || "PATIENT");
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const getTrendColor = (trend) => {
    switch (trend) {
      case "IMPROVING": return "adherence-good";
      case "DECLINING": return "adherence-danger";
      default: return "adherence-warning";
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "IMPROVING": return "fas fa-trending-up";
      case "DECLINING": return "fas fa-trending-down";
      default: return "fas fa-minus";
    }
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">{t('analytics.loadingAnalytics')}</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="mt-2 text-gray-600">
            {userRole === "PATIENT" ? t('analytics.patientSubtitle') : userRole === "PHARMACY_ADMIN" ? t('analytics.pharmacyAdminSubtitle') : t('analytics.adminSubtitle')}
          </p>
        </div>

        {userRole === "PATIENT" && (
          <>
            {/* PATIENT DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Overall Adherence</p>
                    <p className="text-3xl font-bold">{adherenceData.average_adherence}%</p>
                    <p className="text-white/60 text-xs mt-1">Last 30 days</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-chart-line text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className={`stat-card ${getTrendColor(adherenceData.current_trend)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Current Trend</p>
                    <p className="text-2xl font-bold">{adherenceData.current_trend}</p>
                    <p className="text-white/60 text-xs mt-1">Risk Score: {adherenceData.risk_score}</p>
                  </div>
                  <div className="text-white/20">
                    <i className={`${getTrendIcon(adherenceData.current_trend)} text-4xl`}></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">{t('analytics.activeMedications')}</p>
                    <p className="text-3xl font-bold">{adherenceData.active_medications}</p>
                    <p className="text-white/60 text-xs mt-1">{t('analytics.currentlyTracking')}</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-pills text-4xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Adherence Chart */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('analytics.adherenceTrend')}</h2>
              <div className="chart-container" style={{
                position: "relative",
                height: "300px",
                margin: "20px 0"
              }}>
                <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <i className="fas fa-chart-line text-6xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500">Chart visualization would go here</p>
                    <p className="text-sm text-gray-400 mt-2">Integrate Chart.js or similar library</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medicine Performance */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('analytics.medicinePerformance')}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('analytics.medicine')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('analytics.adherence')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('analytics.dosesTaken')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('analytics.totalDoses')}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('analytics.status')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {medicinePerformance.map((medicine, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {medicine.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="mr-2">{medicine.adherence}%</span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  medicine.adherence >= 90 ? 'bg-green-500' : 
                                  medicine.adherence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${medicine.adherence}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medicine.doses_taken}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {medicine.total_doses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            medicine.adherence >= 90 ? 'bg-green-100 text-green-800' : 
                            medicine.adherence >= 70 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'
                          }`}>
                            {medicine.adherence >= 90 ? 'Excellent' : 
                             medicine.adherence >= 70 ? 'Good' : 'Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <i className="fas fa-check-circle text-green-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Best Performing Medicine</p>
                      <p className="text-xs text-gray-600">Vitamin D with 98% adherence</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-exclamation-triangle text-yellow-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Needs Attention</p>
                      <p className="text-xs text-gray-600">Atorvastatin adherence dropped below 90%</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-trending-up text-green-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Positive Trend</p>
                      <p className="text-xs text-gray-600">Overall adherence improving by 3% this month</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <i className="fas fa-lightbulb text-yellow-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Optimize Timing</p>
                      <p className="text-xs text-gray-600">Consider setting reminders for Atorvastatin</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-calendar-check text-blue-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Schedule Review</p>
                      <p className="text-xs text-gray-600">Monthly medication review with doctor</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <i className="fas fa-bell text-purple-500 mt-1 mr-3"></i>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Enhanced Reminders</p>
                      <p className="text-xs text-gray-600">Enable multiple reminder times for better adherence</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}

        {userRole === "PHARMACY_ADMIN" && (
          <>
            {/* PHARMACY ADMIN DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Patients</p>
                    <p className="text-3xl font-bold">156</p>
                    <p className="text-white/60 text-xs mt-1">Active patients</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-users text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Avg Adherence</p>
                    <p className="text-3xl font-bold">87.3%</p>
                    <p className="text-white/60 text-xs mt-1">Across all patients</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-chart-line text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">At Risk Patients</p>
                    <p className="text-3xl font-bold">12</p>
                    <p className="text-white/60 text-xs mt-1">Need intervention</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-exclamation-triangle text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Prescriptions</p>
                    <p className="text-3xl font-bold">892</p>
                    <p className="text-white/60 text-xs mt-1">This month</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-prescription text-4xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Patient Performance Overview */}
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('analytics.patientPerformance')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics.topPerformingPatients')}</h3>
                  <div className="space-y-3">
                    {["John Doe", "Jane Smith", "Robert Johnson"].map((name, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                            <i className="fas fa-user text-green-600"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-600">{95 - index * 2}% adherence</p>
                          </div>
                        </div>
                        <i className="fas fa-trophy text-yellow-500"></i>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">{t('analytics.patientsNeedingAttention')}</h3>
                  <div className="space-y-3">
                    {["Alice Brown", "Charlie Wilson", "Diana Prince"].map((name, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                            <i className="fas fa-user text-red-600"></i>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-600">{65 - index * 5}% adherence</p>
                          </div>
                        </div>
                        <button className="px-3 py-1 bg-red-600 text-white text-xs rounded-full hover:bg-red-700">
                          {t('analytics.contact')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {userRole === "ADMIN" && (
          <>
            {/* SYSTEM ADMIN DASHBOARD */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Total Users</p>
                    <p className="text-3xl font-bold">2,847</p>
                    <p className="text-white/60 text-xs mt-1">All roles</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-users text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">System Health</p>
                    <p className="text-3xl font-bold">99.8%</p>
                    <p className="text-white/60 text-xs mt-1">Uptime</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-server text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Daily Active Users</p>
                    <p className="text-3xl font-bold">1,234</p>
                    <p className="text-white/60 text-xs mt-1">Last 24 hours</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-chart-bar text-4xl"></i>
                  </div>
                </div>
              </div>
              
              <div className="stat-card" style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "20px",
                transition: "transform 0.3s ease"
              }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-sm">Data Processed</p>
                    <p className="text-3xl font-bold">45.2TB</p>
                    <p className="text-white/60 text-xs mt-1">This month</p>
                  </div>
                  <div className="text-white/20">
                    <i className="fas fa-database text-4xl"></i>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .stat-card:hover {
          transform: translateY(-5px);
        }
        .adherence-good { 
          background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); 
        }
        .adherence-warning { 
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); 
        }
        .adherence-danger { 
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); 
        }
      `}</style>
    </BaseLayout>
  );
};

export default AnalyticsDashboard;
