import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { SkeletonTable } from "../components/SkeletonLoaders";
import { useLanguage } from "../i18n";

const DoseHistory = ({ setIsAuthenticated, setUser, user }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [doseHistory, setDoseHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [filters, setFilters] = useState({
    medicine: "",
    status: "",
    dateRange: "30days"
  });
  const [statistics, setStatistics] = useState({
    total_doses: 0,
    taken_doses: 0,
    pending_doses: 0,
    missed_doses: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterHistory();
  }, [doseHistory, filters]);

  const loadData = async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock data
    const mockMedicines = [
      { id: 1, name: "Aspirin" },
      { id: 2, name: "Metformin" },
      { id: 3, name: "Lisinopril" },
      { id: 4, name: "Atorvastatin" },
      { id: 5, name: "Vitamin D" }
    ];

    const mockHistory = generateMockDoseHistory(mockMedicines);
    
    setMedicines(mockMedicines);
    setDoseHistory(mockHistory);
    calculateStatistics(mockHistory);
    setLoading(false);
  };

  const generateMockDoseHistory = (medicines) => {
    const history = [];
    const statuses = ["TAKEN", "MISSED", "PENDING"];
    const today = new Date();
    
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      medicines.forEach(medicine => {
        // Generate 2-3 doses per day per medicine
        const dosesPerDay = Math.floor(Math.random() * 2) + 2;
        for (let j = 0; j < dosesPerDay; j++) {
          const hour = 8 + (j * 6); // 8 AM, 2 PM, 8 PM
          const doseTime = new Date(date);
          doseTime.setHours(hour, 0, 0, 0);
          
          // Future doses are pending
          let status;
          if (doseTime > today) {
            status = "PENDING";
          } else {
            // Random status for past doses (70% taken, 20% missed, 10% pending)
            const rand = Math.random();
            if (rand < 0.7) status = "TAKEN";
            else if (rand < 0.9) status = "MISSED";
            else status = "PENDING";
          }
          
          history.push({
            id: history.length + 1,
            medicine_id: medicine.id,
            medicine_name: medicine.name,
            scheduled_time: doseTime.toISOString(),
            status: status,
            dose_time: `${hour.toString().padStart(2, '0')}:00`,
            notes: status === "MISSED" ? "Forgot to take" : status === "TAKEN" ? "Taken on time" : ""
          });
        }
      });
    }
    
    return history.sort((a, b) => new Date(b.scheduled_time) - new Date(a.scheduled_time));
  };

  const calculateStatistics = (history) => {
    const stats = {
      total_doses: history.length,
      taken_doses: history.filter(d => d.status === "TAKEN").length,
      pending_doses: history.filter(d => d.status === "PENDING").length,
      missed_doses: history.filter(d => d.status === "MISSED").length
    };
    setStatistics(stats);
  };

  const filterHistory = () => {
    let filtered = [...doseHistory];
    
    // Filter by medicine
    if (filters.medicine) {
      filtered = filtered.filter(d => d.medicine_id.toString() === filters.medicine);
    }
    
    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(d => d.status === filters.status);
    }
    
    // Filter by date range
    const today = new Date();
    const daysBack = filters.dateRange === "7days" ? 7 : 
                    filters.dateRange === "30days" ? 30 : 
                    filters.dateRange === "90days" ? 90 : 365;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    filtered = filtered.filter(d => new Date(d.scheduled_time) >= cutoffDate);
    
    setFilteredHistory(filtered);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "TAKEN": return "text-green-600 bg-green-100";
      case "MISSED": return "text-red-600 bg-red-100";
      case "PENDING": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "TAKEN": return "fas fa-check-circle";
      case "MISSED": return "fas fa-times-circle";
      case "PENDING": return "fas fa-clock";
      default: return "fas fa-question-circle";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonTable rows={10} />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t("doseHistory.title")}</h1>
                <p className="mt-1 text-sm text-gray-500">{t("doseHistory.subtitle")}</p>
              </div>
              <button
                onClick={() => navigate("/medicine-list")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                {t("doseHistory.backToMedicines")}
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-pills text-teal-600 text-2xl"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t("doseHistory.totalDoses")}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics.total_doses}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-check-circle text-green-600 text-2xl"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t("doseHistory.takenDoses")}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics.taken_doses}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-clock text-yellow-600 text-2xl"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t("doseHistory.pendingDoses")}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics.pending_doses}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <i className="fas fa-times-circle text-red-600 text-2xl"></i>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {t("doseHistory.missedDoses")}
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {statistics.missed_doses}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Section */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t("doseHistory.filters")}</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="medicine" className="block text-sm font-medium text-gray-700">
                      {t("doseHistory.filterByMedicine")}
                    </label>
                    <select
                      id="medicine"
                      value={filters.medicine}
                      onChange={(e) => handleFilterChange("medicine", e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                      <option value="">{t("doseHistory.allMedicines")}</option>
                      {medicines.map(med => (
                        <option key={med.id} value={med.id}>
                          {med.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                      {t("doseHistory.filterByStatus")}
                    </label>
                    <select
                      id="status"
                      value={filters.status}
                      onChange={(e) => handleFilterChange("status", e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                      <option value="">{t("doseHistory.allStatuses")}</option>
                      <option value="TAKEN">{t("doseHistory.taken")}</option>
                      <option value="MISSED">{t("doseHistory.missed")}</option>
                      <option value="PENDING">{t("doseHistory.pending")}</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                      {t("doseHistory.filterByDateRange")}
                    </label>
                    <select
                      id="dateRange"
                      value={filters.dateRange}
                      onChange={(e) => handleFilterChange("dateRange", e.target.value)}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                    >
                      <option value="7days">{t("doseHistory.days7")}</option>
                      <option value="30days">{t("doseHistory.days30")}</option>
                      <option value="90days">{t("doseHistory.days90")}</option>
                      <option value="1year">{t("doseHistory.allTime")}</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({ medicine: "", status: "", dateRange: "30days" })}
                      className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dose History Table */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Dose History ({filteredHistory.length} records)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicine
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredHistory.slice(0, 50).map((dose) => (
                      <tr key={dose.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{formatDate(dose.scheduled_time)}</div>
                            <div className="text-gray-500">{formatTime(dose.scheduled_time)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {dose.medicine_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dose.status)}`}>
                            <i className={`${getStatusIcon(dose.status)} mr-1`}></i>
                            {dose.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {dose.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredHistory.length > 50 && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-500">
                    Showing first 50 of {filteredHistory.length} records
                  </p>
                </div>
              )}

              {filteredHistory.length === 0 && (
                <div className="text-center py-8">
                  <i className="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                  <p className="text-gray-500">No dose history found matching your filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Adherence Summary */}
          <div className="mt-8 bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Adherence Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-teal-600">
                  {statistics.total_doses > 0 ? 
                    Math.round((statistics.taken_doses / statistics.total_doses) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Overall Adherence</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {statistics.total_doses > 0 ? 
                    Math.round((statistics.taken_doses / (statistics.taken_doses + statistics.missed_doses)) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {statistics.total_doses > 0 ? 
                    Math.round((statistics.missed_doses / statistics.total_doses) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Missed Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default DoseHistory;
