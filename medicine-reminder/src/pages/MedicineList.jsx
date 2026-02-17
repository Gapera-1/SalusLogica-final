import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { SkeletonMedicineList } from "../components/SkeletonLoaders";
import { medicineAPI } from "../services/api";
import { useLanguage } from "../i18n";

const MedicineList = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load medicines from backend API
    const loadMedicines = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('access_token');
        if (!token) {
          console.log('No authentication token found, using fallback mock data');
          throw new Error('Not authenticated');
        }
        
        console.log('Loading medicines...');
        const data = await medicineAPI.getAll();
        console.log('Raw API response:', data);
        console.log('Response type:', typeof data);
        console.log('Is array?', Array.isArray(data));
        console.log('Has results?', data.results);
        console.log('Results array?', Array.isArray(data.results));
        console.log('Medicines array length:', Array.isArray(data) ? data.length : 'N/A');
        
        // Handle different response formats
        if (data.results && Array.isArray(data.results)) {
          console.log('Using data.results format, setting medicines:', data.results.length);
          setMedicines(data.results);
        } else if (Array.isArray(data)) {
          console.log('Using direct array format, setting medicines:', data.length);
          setMedicines(data);
        } else {
          console.log('Unexpected data format, using empty array');
          setMedicines([]);
        }
        setError(null);
      } catch (error) {
        console.error("Failed to load medicines:", error);
        setError(`${error.message} - ${t('medicines.demoData')}`);
        // Fallback to mock data if API fails
        console.log('Using fallback mock data');
        setMedicines([
          { 
            id: 1, 
            name: "Aspirin", 
            dosage: "100mg", 
            frequency: "Once daily", 
            nextDose: "2:00 PM",
            stock: 15,
            prescribedFor: "Headaches",
            startDate: "2024-01-15",
            doctor: "Dr. Smith"
          },
          { 
            id: 2, 
            name: "Vitamin D", 
            dosage: "1000IU", 
            frequency: "Once daily", 
            nextDose: "8:00 AM",
            stock: 30,
            prescribedFor: "Vitamin deficiency",
            startDate: "2024-01-01",
            doctor: "Dr. Johnson"
          },
          { 
            id: 3, 
            name: "Omega-3", 
            dosage: "500mg", 
            frequency: "Twice daily", 
            nextDose: "12:00 PM",
            stock: 45,
            prescribedFor: "Heart health",
            startDate: "2024-01-10",
            doctor: "Dr. Williams"
          },
          { 
            id: 4, 
            name: "Lisinopril", 
            dosage: "10mg", 
            frequency: "Once daily", 
            nextDose: "9:00 AM",
            stock: 20,
            prescribedFor: "Blood pressure",
            startDate: "2023-12-01",
            doctor: "Dr. Brown"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    loadMedicines();
  }, []);

  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         medicine.prescribedFor.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "low-stock") return matchesSearch && medicine.stock < 20;
    if (filter === "today") return matchesSearch; // Filter for medicines due today
    
    return matchesSearch;
  });

  const handleAddMedicine = () => {
    navigate("/add-medicine");
  };

  const handleEditMedicine = (id) => {
    navigate(`/edit-medicine/${id}`);
  };

  const handleDeleteMedicine = async (id) => {
    if (window.confirm("Are you sure you want to delete this medicine?")) {
      try {
        await medicineAPI.delete(id);
        setMedicines(medicines.filter(m => m.id !== id));
      } catch (error) {
        console.error("Failed to delete medicine:", error);
        alert("Failed to delete medicine. Please try again.");
      }
    }
  };

  const getStockColor = (stock) => {
    if (stock < 10) return "text-red-500";
    if (stock < 20) return "text-orange-500";
    return "text-green-500";
  };

  if (loading) {
    console.log('MedicineList: Loading state');
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonMedicineList />
      </BaseLayout>
    );
  }

  // Don't block UI if we have fallback data, just show a warning
  const isUsingFallbackData = error && medicines.length > 0;

  console.log('MedicineList: Rendering with medicines:', medicines.length);
  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('medicines.title')}</h1>
            <p className="mt-1 text-sm text-gray-600">
              {t('medicines.subtitle')}
            </p>
          </div>
          <button
            onClick={handleAddMedicine}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center"
          >
            <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
            {t('medicines.addMedicine')}
          </button>
        </div>

        {/* Warning Banner for Demo Data */}
        {isUsingFallbackData && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-amber-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  {t('medicines.demoData')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-6 bg-gradient-to-r from-teal-50 to-teal-50 border border-teal-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('medicines.quickActions')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <i className="fas fa-chart-line text-2xl text-teal-600"></i>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Analytics Dashboard</h4>
                <p className="text-xs text-gray-500">View your medication adherence trends</p>
              </div>
            </button>
            <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <i className="fas fa-pills text-2xl text-green-600"></i>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Interaction Checker</h4>
                <p className="text-xs text-gray-500">Check for drug interactions</p>
              </div>
            </button>
            <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <i className="fas fa-history text-2xl text-teal-600"></i>
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Dose History</h4>
                <p className="text-xs text-gray-500">View your medication history</p>
              </div>
            </button>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search medicines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
              />
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</div>
            </div>
            
            <div className="min-w-40">
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
              >
                <option value="all">All Medicines</option>
                <option value="low-stock">Low Stock</option>
                <option value="today">Due Today</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medicine Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {filteredMedicines.length === 0 ? (
            <div className="col-span-full bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
              <div className="text-5xl mb-5">💊</div>
              <h3 className="text-gray-900 text-xl font-semibold mb-2">No medicines found</h3>
              <p className="text-gray-600 text-sm mb-4">
                {medicines.length === 0 
                  ? "Start by adding your first medication" 
                  : "Try adjusting your search or filters"
                }
              </p>
              {medicines.length === 0 && (
                <button
                  onClick={handleAddMedicine}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Add Your First Medicine
                </button>
              )}
            </div>
          ) : (
            filteredMedicines.map(medicine => (
              <div key={medicine.id} className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:-translate-y-1 hover:shadow-card transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-gray-900 text-lg font-semibold mb-1">{medicine.name}</h3>
                    <span className="bg-teal-600 text-white px-2 py-1 rounded text-xs font-medium">{medicine.dosage}</span>
                  </div>
                  <div className={`font-semibold text-sm px-3 py-1 rounded-lg ${getStockColor(medicine.stock)}`}>
                    Stock: {medicine.stock}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-gray-600 text-sm"><strong className="text-gray-900">Frequency:</strong> {medicine.frequency}</p>
                  <p className="text-gray-600 text-sm"><strong className="text-gray-900">Next Dose:</strong> {medicine.nextDose}</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditMedicine(medicine.id)}
                    className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteMedicine(medicine.id)}
                    className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 border border-white border-opacity-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="stat-item">
              <span className="block text-white text-2xl font-bold mb-1">{medicines.length}</span>
              <span className="text-gray-400 text-sm">Total Medicines</span>
            </div>
            <div className="stat-item">
              <span className="block text-white text-2xl font-bold mb-1">{medicines.filter(m => m.stock < 20).length}</span>
              <span className="text-gray-400 text-sm">Low Stock Items</span>
            </div>
            <div className="stat-item">
              <span className="block text-white text-2xl font-bold mb-1">{medicines.filter(m => m.stock < 10).length}</span>
              <span className="text-gray-400 text-sm">Critical Stock</span>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default MedicineList;
