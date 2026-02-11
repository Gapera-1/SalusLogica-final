import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "../components/Navigation";
import Logo from "../components/Logo";
import { authAPI } from "../services/api";

const Home = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("access_token");
    if (token) {
      // Verify token with backend
      authAPI.getCurrentUser().then(currentUser => {
        setUser(currentUser);
      }).catch(error => {
        console.error("Auth check failed:", error);
        // Clear invalid token
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        setUser(null);
      });
    }
    
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Show navigation only if user is authenticated */}
      {user && <Navigation setIsAuthenticated={setIsAuthenticated} />}
      
      {/* Hero Section - Exact match to SalusLogica */}
      <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center">
            <div className="pt-20 pb-16 text-center">
              <Logo className="h-16 w-auto mb-4" />
              <h1 className="text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl">
                Never Miss Your
                <span className="block text-yellow-300">Medicine Again</span>
              </h1>
              <p className="mt-6 text-xl text-blue-100 max-w-3xl mx-auto">
                SalusLogica is your intelligent medicine reminder system that helps you stay on track with your medications, 
                manage your health, and improve adherence to your treatment plans.
              </p>
              <div className="mt-10 flex justify-center space-x-4">
                {user ? (
                  <button
                    onClick={() => navigate("/dashboard")}
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition duration-200"
                  >
                    Go to Dashboard
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => navigate("/signup")}
                      className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition duration-200 mr-4"
                    >
                      Get Started
                    </button>
                    <button
                      onClick={() => navigate("/login")}
                      className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition duration-200"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Everything You Need to Manage Your Health
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Comprehensive features designed to make medication management simple and effective
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 - Medicine Management */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                <i className="fas fa-pills text-blue-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Medicine Management</h3>
              <p className="text-gray-600">
                Add, edit, and organize all your medications in one place with detailed dosage instructions and schedules.
              </p>
            </div>

            {/* Feature 2 - Smart Reminders */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <i className="fas fa-bell text-green-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Smart Reminders</h3>
              <p className="text-gray-600">
                Get timely notifications for your medications through SMS, email, or push notifications.
              </p>
            </div>

            {/* Feature 3 - Dose Tracking */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-6">
                <i className="fas fa-chart-line text-purple-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Dose Tracking</h3>
              <p className="text-gray-600">
                Track your medication adherence with detailed history and compliance statistics.
              </p>
            </div>

            {/* Feature 4 - Patient Profiles */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
                <i className="fas fa-user-md text-yellow-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Patient Profiles</h3>
              <p className="text-gray-600">
                Create comprehensive patient profiles with medical history, allergies, and personalized care plans.
              </p>
            </div>

            {/* Feature 5 - Pharmacy Management */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                <i className="fas fa-hospital text-red-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Pharmacy Management</h3>
              <p className="text-gray-600">
                Pharmacy administrators can manage multiple patients and monitor their medication adherence.
              </p>
            </div>

            {/* Feature 6 - Mobile Compatible */}
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-6">
                <i className="fas fa-mobile-alt text-indigo-600 text-2xl"></i>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Mobile Compatible</h3>
              <p className="text-gray-600">
                Access your medication schedule and receive reminders on any device with our responsive design.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white">
              Ready to Take Control of Your Health?
            </h2>
            <p className="mt-4 text-xl text-blue-100">
              Join thousands of users who trust SalusLogica for their medication management.
            </p>
            <div className="mt-8">
              {user ? (
                <button
                  onClick={() => navigate("/medicine-list")}
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition duration-200"
                >
                  Manage Your Medicines
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/signup")}
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition duration-200 mr-4"
                  >
                    Get Started
                  </button>
                  <button
                    onClick={() => navigate("/login")}
                    className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition duration-200"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
