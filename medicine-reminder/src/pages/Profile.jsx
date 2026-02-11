import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { profileAPI } from "../services/api";
import { useLanguage } from "../i18n";
import toast from 'react-hot-toast';

const Profile = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { setLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({
    age: "",
    weight: "",
    height: "",
    phone: "",
    timezone: "",
    medicalConditions: "",
    allergies: "",
    preferredLanguage: "en"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const languages = [
    { value: "en", label: "English" },
    { value: "rw", label: "Kinyarwanda" },
    { value: "fr", label: "French" }
  ];

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "Europe/London",
    "Asia/Tokyo",
    "Africa/Kigali"
  ];

  useEffect(() => {
    // Get user from localStorage
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) {
      setUser(savedUser);
    } else {
      navigate("/");
      return;
    }

    // Load profile data from API
    const loadProfileData = async () => {
      try {
        const profile = await profileAPI.get();
        console.log('Loaded profile:', profile);
        
        // Map API response to component state
        setProfileData({
          age: profile.age ? String(profile.age) : "",
          weight: profile.weight_kg ? String(profile.weight_kg) : "",
          height: profile.height_cm ? String(profile.height_cm) : "",
          phone: profile.phone || "",
          timezone: profile.timezone || "Africa/Kigali",
          medicalConditions: profile.medical_conditions || "",
          allergies: profile.allergies || "",
          preferredLanguage: profile.preferred_language || "en"
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        // Load from localStorage as fallback
        const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
        if (savedProfile) {
          setProfileData(savedProfile);
        } else {
          // Use default empty data
          setProfileData({
            age: "",
            weight: "",
            height: "",
            phone: "",
            timezone: "Africa/Kigali",
            medicalConditions: "",
            allergies: "",
            preferredLanguage: "en"
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Prepare profile data for API
      const updateData = {
        age: profileData.age ? parseInt(profileData.age) : null,
        weight_kg: profileData.weight ? parseFloat(profileData.weight) : null,
        height_cm: profileData.height ? parseFloat(profileData.height) : null,
        phone: profileData.phone || '',
        timezone: profileData.timezone || 'UTC',
        medical_conditions: profileData.medicalConditions || '',
        allergies: profileData.allergies || '',
        preferred_language: profileData.preferredLanguage || 'en'
      };
      
      // Call the API to update profile
      const response = await profileAPI.update(updateData);
      console.log('Profile updated successfully:', response);
      
      // Update the language in the app
      setLanguage(profileData.preferredLanguage);
      
      // Store in localStorage as backup
      localStorage.setItem("userProfile", JSON.stringify(profileData));
      
      toast.success(t('profile.profileUpdated'));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t('profile.profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-gray-900 text-2xl font-bold mb-1">Profile Settings</h2>
              <p className="text-gray-600 text-sm">Manage your personal information and preferences</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 text-sm"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">👤</span>
                Personal Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Username</label>
                  <input
                    type="text"
                    value={user?.username || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Age</label>
                  <input
                    type="number"
                    name="age"
                    value={profileData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder="Your age"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={profileData.weight}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder="Your weight"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={profileData.height}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder="Your height"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder="+250..."
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">🏥</span>
                Medical Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Medical Conditions</label>
                  <textarea
                    name="medicalConditions"
                    value={profileData.medicalConditions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
                    placeholder="List any medical conditions..."
                    rows="3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">Allergies</label>
                  <textarea
                    name="allergies"
                    value={profileData.allergies}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
                    placeholder="List any allergies..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              Preferences
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🌍</span>
                  Preferred Language
                </label>
                <select
                  name="preferredLanguage"
                  value={profileData.preferredLanguage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
                >
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🕐</span>
                  Timezone
                </label>
                <select
                  name="timezone"
                  value={profileData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
                >
                  {timezones.map(tz => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-300 font-medium hover:-translate-y-0.5 min-w-40 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </BaseLayout>
  );
};

export default Profile;
