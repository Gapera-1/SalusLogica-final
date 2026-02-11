
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MedicineForm from '../components/MedicineForm';
import MedicineList from '../components/MedicineList';
import Snackbar from '../components/Snackbar';
import ReminderChecker from '../ReminderChecker';

function AppPage({ setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 min-h-screen bg-blue-500 p-10"
    style={{
      backgroundImage: "url('/images/AppPage-image.jpg')"
    }}
    >

  {/* Logout button */}
  <button
    className="fixed bottom-4 right-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-4 rounded transition"
    onClick={handleLogout}
  >
    Log Out
  </button>

  <h1 className="text-2xl font-bold mb-6 text-black">Medicine Reminder</h1>

  {/* ✅ Two-column layout wrapper */}
  <div className="flex gap-6 max-w-5xl mx-auto">

   <div className="w-1/2"><MedicineForm /> </div>
    <div className="w-1/2"><MedicineList /></div>

  </div>

  <Snackbar />
  <ReminderChecker />
</div>
  )}
export default AppPage;
