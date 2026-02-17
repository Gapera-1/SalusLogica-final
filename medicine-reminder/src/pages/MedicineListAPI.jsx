import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/BaseLayout';
import MedicineCard from '../components/MedicineCard';
import MedicineSearchAutocomplete from '../components/MedicineSearchAutocomplete';
import { useAppContext } from '../contexts/AppContext';
import analytics from '../services/analytics';
import toast from 'react-hot-toast';

const MedicineListAPI = () => {
  const navigate = useNavigate();
  const {
    medicines,
    loading,
    error,
    addMedicine,
    deleteMedicine,
    updateMedicine,
    getMedicine,
    clearError,
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Filter medicines based on search and filter
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = medicine.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'low-stock' && (medicine.stock_count || 0) < 10) ||
      (filter === 'today' && medicine.nextDose === 'Today');
    
    return matchesSearch && matchesFilter;
  });

  // Handle medicine actions
  const handleEditMedicine = (medicine) => {
    navigate(`/edit-medicine/${medicine.id}`, { state: { medicine } });
  };

  const handleDeleteMedicine = async (medicine) => {
    if (window.confirm(`Delete "${medicine.name}" from your medicines?`)) {
      try {
        await deleteMedicine(medicine.id);
        toast.success(`"${medicine.name}" has been deleted`);
      } catch (error) {
        console.error('Failed to delete medicine:', error);
        toast.error(error?.message || 'Failed to delete medicine');
      }
    }
  };

  const handleAddMedicine = async (medicineData) => {
    try {
      await addMedicine(medicineData);
      toast.success('Medicine added successfully');
      setShowAddModal(false);
    } catch (error) {
      toast.error('Failed to add medicine');
    }
  };

  const handleAutocompleteSelect = (medicine) => {
    // Navigate to medicine details
    analytics.trackMedicineView(medicine, 'autocomplete');
    navigate(`/medicine/${medicine.id}`);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    analytics.trackFilterUsage('medicine_list', newFilter);
  };

  useEffect(() => {
    // Fetch medicines on component mount
    clearError();
  }, [clearError]);

  if (error) {
    return (
      <BaseLayout showNavigation={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Error loading medicines</div>
            <p className="text-gray-600">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700"
            >
              Retry
            </button>
          </div>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">My Medicines</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your medication schedule
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Medicine
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigate('/analytics')}
                className="flex items-center p-4 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <i className="fas fa-chart-line text-teal-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Analytics Dashboard</h4>
                  <p className="text-xs text-gray-500">View adherence insights</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/interaction-checker')}
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <i className="fas fa-pills text-green-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Interaction Checker</h4>
                  <p className="text-xs text-gray-500">Check drug interactions</p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/dose-history')}
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <i className="fas fa-history text-purple-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Dose History</h4>
                  <p className="text-xs text-gray-500">View your medication history</p>
                </div>
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex gap-4 mb-4 flex-wrap">
              <div className="flex-1 min-w-64">
                <MedicineSearchAutocomplete
                  onSelect={handleAutocompleteSelect}
                  placeholder="Search medicines by name or scientific name..."
                  activeOnly={false}
                  minSearchLength={2}
                />
              </div>
              
              <div className="min-w-40">
                <select 
                  value={filter} 
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20"
                >
                  <option value="all">All Medicines</option>
                  <option value="low-stock">Low Stock</option>
                  <option value="today">Due Today</option>
                </select>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading.medicines ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-gray-300 border-t-teal-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            /* Medicine Cards */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMedicines.length === 0 ? (
                <div className="col-span-full bg-gray-50 rounded-lg p-12 text-center">
                  <div className="text-5xl mb-4">💊</div>
                  <h3 className="text-gray-900 text-xl font-semibold mb-2">No medicines found</h3>
                  <p className="text-gray-600 text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                filteredMedicines.map(medicine => (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onEdit={handleEditMedicine}
                    onDelete={handleDeleteMedicine}
                    showActions={true}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Medicine Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Add New Medicine</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const medicineData = {
                name: formData.get('name'),
                dosage: formData.get('dosage'),
                frequency: formData.get('frequency'),
                duration: formData.get('duration'),
                times: formData.get('times').split(',').map(t => t.trim()),
                prescribedFor: formData.get('prescribedFor'),
                doctor: formData.get('doctor'),
              };
              handleAddMedicine(medicineData);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Name</label>
                <input name="name" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                <input name="dosage" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select name="frequency" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500">
                  <option value="">Select frequency</option>
                  <option value="Once Daily">Once Daily</option>
                  <option value="Twice Daily">Twice Daily</option>
                  <option value="Three Times Daily">Three Times Daily</option>
                  <option value="Four Times Daily">Four Times Daily</option>
                  <option value="As Needed">As Needed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (days)</label>
                <input name="duration" type="number" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Times (comma separated)</label>
                <input name="times" type="text" required placeholder="08:00, 14:00, 20:00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed For</label>
                <input name="prescribedFor" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                <input name="doctor" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700">
                  Add Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BaseLayout>
  );
};

export default MedicineListAPI;
