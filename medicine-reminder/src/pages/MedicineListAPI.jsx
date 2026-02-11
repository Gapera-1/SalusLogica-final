import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BaseLayout from '../components/BaseLayout';
import { useAppContext } from '../contexts/AppContext';
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
    const matchesSearch = medicine.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'low-stock' && medicine.stock < 10) ||
      (filter === 'today' && medicine.nextDose === 'Today');
    
    return matchesSearch && matchesFilter;
  });

  // Handle medicine actions
  const handleEditMedicine = async (id) => {
    try {
      const medicine = await getMedicine(id);
      // Navigate to edit page with medicine data
      navigate(`/edit-medicine/${id}`, { state: { medicine } });
    } catch (error) {
      toast.error('Failed to load medicine for editing');
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (window.confirm('Are you sure you want to delete this medicine?')) {
      try {
        await deleteMedicine(id);
        toast.success('Medicine deleted successfully');
      } catch (error) {
        toast.error('Failed to delete medicine');
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

  const handleMarkDoseTaken = async (medicineId, time) => {
    try {
      // This would typically create a dose log entry
      // For now, we'll update the medicine's taken times
      const medicine = medicines.find(m => m.id === medicineId);
      if (medicine) {
        const updatedMedicine = {
          ...medicine,
          takenTimes: {
            ...medicine.takenTimes,
            [time]: new Date().toISOString(),
          },
        };
        await updateMedicine(medicineId, updatedMedicine);
        toast.success('Dose marked as taken');
      }
    } catch (error) {
      toast.error('Failed to mark dose as taken');
    }
  };

  // Get stock color
  const getStockColor = (stock) => {
    if (stock <= 5) return 'text-red-600 bg-red-100';
    if (stock <= 10) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  // Get next dose color
  const getNextDoseColor = (nextDose) => {
    if (nextDose === 'Overdue') return 'text-red-600';
    if (nextDose === 'Today') return 'text-orange-600';
    return 'text-blue-600';
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
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
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
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <i className="fas fa-chart-line text-blue-600 text-xl"></i>
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
              <div className="relative flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="Search medicines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">🔍</div>
              </div>
              
              <div className="min-w-40">
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
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
              <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
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
                  <div key={medicine.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-gray-900 text-lg font-semibold mb-1">{medicine.name}</h3>
                        <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">{medicine.dosage}</span>
                      </div>
                      <div className={`font-semibold text-sm px-3 py-1 rounded-lg ${getStockColor(medicine.stock)}`}>
                        {medicine.stock} left
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">Frequency:</span>
                        <span className="text-gray-900 font-medium text-sm">{medicine.frequency}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">Next Dose:</span>
                        <span className={`font-medium text-sm ${getNextDoseColor(medicine.nextDose)}`}>
                          {medicine.nextDose}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">Prescribed for:</span>
                        <span className="text-gray-900 font-medium text-sm">{medicine.prescribedFor}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 text-sm">Doctor:</span>
                        <span className="text-gray-900 font-medium text-sm">{medicine.doctor}</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 text-sm">Started:</span>
                        <span className="text-gray-900 font-medium text-sm">{medicine.startDate}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditMedicine(medicine.id)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <i className="fas fa-edit mr-2"></i>
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteMedicine(medicine.id)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        <i className="fas fa-trash mr-2"></i>
                        Delete
                      </button>
                    </div>
                  </div>
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
                <input name="name" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                <input name="dosage" type="text" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select name="frequency" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500">
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
                <input name="duration" type="number" required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Times (comma separated)</label>
                <input name="times" type="text" required placeholder="08:00, 14:00, 20:00" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed For</label>
                <input name="prescribedFor" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
                <input name="doctor" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
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
