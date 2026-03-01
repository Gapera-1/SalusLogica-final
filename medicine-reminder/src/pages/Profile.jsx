import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import AvatarUpload from "../components/AvatarUpload";
import { SkeletonProfile } from "../components/SkeletonLoaders";
import { profileAPI, authAPI } from "../services/api";
import { useLanguage } from "../i18n";
import toast from 'react-hot-toast';

// Function to detect user's browser timezone
const detectUserTimezone = () => {
  try {
    // Use Intl API to get browser timezone
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (err) {
    console.warn('Could not detect timezone:', err);
    return 'Africa/Kigali'; // Default to Rwanda timezone
  }
};

const Profile = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { setLanguage, t } = useLanguage();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    ageCategory: "",
    age: "",
    gender: "",
    isPregnant: false,
    isLactating: false,
    weight: "",
    height: "",
    phone: "",
    timezone: detectUserTimezone(), // Auto-detect on first load
    medicalConditions: "",
    allergies: "",
    preferredLanguage: "en"
  });
  const [originalData, setOriginalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const ageCategories = [
    { value: "young_child", label: t('profile.youngChild') },
    { value: "older_child", label: t('profile.olderChild') },
    { value: "adult", label: t('profile.adult') },
    { value: "elderly", label: t('profile.elderly') }
  ];

  const genderOptions = [
    { value: "male", label: t('profile.male') },
    { value: "female", label: t('profile.female') },
    { value: "other", label: t('profile.other') }
  ];

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
        
        // Detect user's actual timezone from browser
        const detectedTz = detectUserTimezone();
        
        // If profile has UTC and we detected something else, use detected timezone
        const userTz = (profile.timezone === 'UTC' || !profile.timezone) ? detectedTz : profile.timezone;
        
        // Map API response to component state
        const data = {
          ageCategory: profile.age_category || "",
          age: profile.age ? String(profile.age) : "",
          gender: profile.gender || "",
          isPregnant: profile.is_pregnant || false,
          isLactating: profile.is_lactating || false,
          weight: profile.weight_kg ? String(profile.weight_kg) : "",
          height: profile.height_cm ? String(profile.height_cm) : "",
          phone: profile.phone || "",
          timezone: userTz,
          medicalConditions: profile.medical_conditions || "",
          allergies: profile.allergies || "",
          preferredLanguage: profile.preferred_language || "en"
        };
        
        // Set avatar URL if available
        if (profile.avatar) {
          setAvatarUrl(profile.avatar);
        }
        
        setProfileData(data);
        setOriginalData(data);
        
        // If timezone was UTC and we detected a different one, auto-save the correction
        if (profile.timezone === 'UTC' && userTz !== 'UTC') {
          console.info(`Auto-updating timezone from UTC to ${userTz}`);
          // Will be saved when user saves profile or auto-save on mount
        }
        
      } catch (error) {
        console.error('Error loading profile:', error);
        // Load from localStorage as fallback
        const savedProfile = JSON.parse(localStorage.getItem("userProfile"));
        if (savedProfile) {
          setProfileData(savedProfile);
          setOriginalData(savedProfile);
        } else {
          // Use default empty data
          const defaultData = {
            ageCategory: "",
            age: "",
            gender: "",
            isPregnant: false,
            isLactating: false,
            weight: "",
            height: "",
            phone: "",
            timezone: detectUserTimezone(),
            medicalConditions: "",
            allergies: "",
            preferredLanguage: "en"
          };
          setProfileData(defaultData);
          setOriginalData(defaultData);
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

  const handleAvatarUpload = async (file) => {
    try {
      if (file === null) {
        // Remove avatar
        const response = await profileAPI.removeAvatar();
        setAvatarUrl(null);
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.avatar = null;
        localStorage.setItem('user', JSON.stringify(user));
        
        return Promise.resolve();
      } else {
        // Upload new avatar
        const response = await profileAPI.uploadAvatar(file);
        setAvatarUrl(response.avatar);
        
        // Update user in localStorage
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.avatar = response.avatar;
        localStorage.setItem('user', JSON.stringify(user));
        
        return Promise.resolve();
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      return Promise.reject(error);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Prepare profile data for API
      const updateData = {
        age_category: profileData.ageCategory || null,
        age: profileData.age ? parseInt(profileData.age, 10) : null,
        gender: profileData.gender || null,
        is_pregnant: profileData.isPregnant,
        is_lactating: profileData.isLactating,
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
      
      setOriginalData(profileData);
      setIsEditing(false);
      toast.success(t('profile.profileUpdated'));
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.message || t('profile.profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setDeleteError(t('profile.typeDeleteError'));
      return;
    }
    if (!deletePassword) {
      setDeleteError(t('profile.passwordRequired'));
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      await authAPI.deleteAccount(deletePassword);
      localStorage.removeItem("loggedIn");
      localStorage.removeItem("user");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setIsAuthenticated(false);
      toast.success(t('profile.accountDeleted'));
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      const msg = error?.response?.data?.error || error.message || t('profile.deleteAccountFailed');
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("lastVisitedRoute");
    setIsAuthenticated(false);
    navigate("/");
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonProfile />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-4xl mx-auto">
        {/* Header with Avatar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar Upload */}
            <div className="flex-shrink-0">
              <AvatarUpload
                currentAvatar={avatarUrl}
                onUpload={handleAvatarUpload}
                size="xl"
                editable={true}
              />
            </div>
            
            {/* Header Text */}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-gray-900 text-2xl font-bold mb-1">{t('profile.title')}</h2>
              <p className="text-gray-600 text-sm mb-2">
                {t('profile.subtitle')}
              </p>
              <div className="text-gray-700 font-medium">
                <i className="fas fa-user mr-2"></i>
                {user?.username}
              </div>
            </div>
            
            {/* Logout Button */}
            <button 
              onClick={handleLogout} 
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-300 text-sm flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              {t('common.logout')}
            </button>
          </div>
        </div>

        {/* Read-only View */}
        {!isEditing && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">👤</span>
                  {t('profile.personalInfo')}
                </h3>
                
                <div className="space-y-4">
                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.username')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">{user?.username || "-"}</p>
                  </div>

                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.ageCategory')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">
                      {profileData.ageCategory ? ageCategories.find(cat => cat.value === profileData.ageCategory)?.label : "-"}
                    </p>
                  </div>

                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.age')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">
                      {profileData.age ? `${profileData.age} ${t('profile.years')}` : "-"}
                    </p>
                  </div>

                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.gender')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">
                      {profileData.gender ? genderOptions.find(opt => opt.value === profileData.gender)?.label : "-"}
                    </p>
                  </div>

                  {profileData.gender === "female" && (
                    <>
                      <div className="py-2 border-b border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.pregnant')}</p>
                        <p className="text-gray-900 text-lg font-medium mt-1">
                          {profileData.isPregnant ? t('profile.yes') : t('profile.no')}
                        </p>
                      </div>

                      <div className="py-2 border-b border-gray-200">
                        <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.lactating')}</p>
                        <p className="text-gray-900 text-lg font-medium mt-1">
                          {profileData.isLactating ? t('profile.yes') : t('profile.no')}
                        </p>
                      </div>
                    </>
                  )}

                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.weight')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">{profileData.weight ? `${profileData.weight} kg` : "-"}</p>
                  </div>

                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.height')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">{profileData.height ? `${profileData.height} cm` : "-"}</p>
                  </div>

                  <div className="py-2">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.phone')}</p>
                    <p className="text-gray-900 text-lg font-medium mt-1">{profileData.phone || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="text-xl">🏥</span>
                  {t('profile.medicalInfo')}
                </h3>
                
                <div className="space-y-4">
                  <div className="py-2 border-b border-gray-200">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.medicalConditions')}</p>
                    <p className="text-gray-900 font-medium mt-1 whitespace-pre-wrap">{profileData.medicalConditions || "-"}</p>
                  </div>

                  <div className="py-2">
                    <p className="text-gray-500 text-xs font-semibold uppercase">{t('profile.allergies')}</p>
                    <p className="text-gray-900 font-medium mt-1 whitespace-pre-wrap">{profileData.allergies || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preferences Read-only View */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mt-6">
              <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                {t('profile.preferences')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="py-2 border-b border-gray-200">
                  <p className="text-gray-500 text-xs font-semibold uppercase flex items-center gap-2">
                    <span className="text-lg">🌍</span>
                    {t('profile.preferredLanguage')}
                  </p>
                  <p className="text-gray-900 text-lg font-medium mt-1">
                    {languages.find(lang => lang.value === profileData.preferredLanguage)?.label}
                  </p>
                </div>

                <div className="py-2 border-b border-gray-200">
                  <p className="text-gray-500 text-xs font-semibold uppercase flex items-center gap-2">
                    <span className="text-lg">🕐</span>
                    {t('profile.timezone')}
                  </p>
                  <p className="text-gray-900 text-lg font-medium mt-1">{profileData.timezone}</p>
                </div>
              </div>
            </div>

            {/* Edit Button */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleEdit}
                className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-300 font-medium hover:-translate-y-0.5 min-w-40"
              >
                {t('profile.editProfile')}
              </button>
            </div>
          </>
        )}

        {/* Edit Form View */}
        {isEditing && (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">👤</span>
                {t('profile.personalInfo')}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.username')}</label>
                  <input
                    type="text"
                    value={user?.username || ""}
                    disabled
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.ageCategory')}</label>
                  <select
                    name="ageCategory"
                    value={profileData.ageCategory}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
                  >
                    <option value="">{t('profile.selectAgeCategory')}</option>
                    {ageCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.ageYears')}</label>
                  <input
                    type="number"
                    name="age"
                    value={profileData.age}
                    onChange={handleInputChange}
                    min="0"
                    max="150"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder={t('profile.exactAge')}
                  />
                  <p className="text-xs text-gray-500">{t('profile.exactAgeHelper')}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.gender')}</label>
                  <select
                    name="gender"
                    value={profileData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
                  >
                    <option value="">{t('profile.selectGender')}</option>
                    {genderOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {profileData.gender === "female" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-gray-700 text-sm font-medium flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="isPregnant"
                          checked={profileData.isPregnant}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            isPregnant: e.target.checked
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 cursor-pointer"
                        />
                        <span>{t('profile.areYouPregnant')}</span>
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-gray-700 text-sm font-medium flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="isLactating"
                          checked={profileData.isLactating}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            isLactating: e.target.checked
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 focus:ring-opacity-20 cursor-pointer"
                        />
                        <span>{t('profile.areYouBreastfeeding')}</span>
                      </label>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.weightKg')}</label>
                  <input
                    type="number"
                    name="weight"
                    value={profileData.weight}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder={t('profile.yourWeight')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.heightCm')}</label>
                  <input
                    type="number"
                    name="height"
                    value={profileData.height}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder={t('profile.yourHeight')}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.phone')}</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileData.phone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300"
                    placeholder="+250..."
                  />
                </div>
              </div>
            </div>

            {/* Medical Information */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-gray-900 text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">🏥</span>
                {t('profile.medicalInfo')}
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.medicalConditions')}</label>
                  <textarea
                    name="medicalConditions"
                    value={profileData.medicalConditions}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
                    placeholder={t('profile.listMedicalConditions')}
                    rows="3"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-gray-700 text-sm font-medium">{t('profile.allergies')}</label>
                  <textarea
                    name="allergies"
                    value={profileData.allergies}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 resize-vertical min-h-20"
                    placeholder={t('profile.listAllergies')}
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
              {t('profile.preferences')}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-medium flex items-center gap-2">
                  <span className="text-lg">🌍</span>
                  {t('profile.preferredLanguage')}
                </label>
                <select
                  name="preferredLanguage"
                  value={profileData.preferredLanguage}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
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
                  {t('profile.timezone')}
                </label>
                <select
                  name="timezone"
                  value={profileData.timezone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:border-teal-500 focus:ring-3 focus:ring-teal-500 focus:ring-opacity-20 transition-all duration-300 cursor-pointer"
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

          {/* Save and Cancel Buttons */}
          <div className="flex justify-center gap-4 pt-4">
            <button
              type="submit"
              className="px-8 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all duration-300 font-medium hover:-translate-y-0.5 min-w-40 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              disabled={saving}
            >
              {saving ? t('profile.saving') : t('profile.saveProfile')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-8 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-all duration-300 font-medium hover:-translate-y-0.5 min-w-40"
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
        )}

        {/* Danger Zone - Delete Account */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8 border border-red-200">
          <h3 className="text-red-600 text-lg font-semibold mb-2 flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('profile.dangerZone')}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            {t('profile.deleteAccountWarning')}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowDeleteModal(true);
              setDeletePassword("");
              setDeleteConfirmText("");
              setDeleteError("");
            }}
            className="px-6 py-2.5 bg-white text-red-600 border-2 border-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-300 font-medium text-sm"
          >
            {t('profile.deleteMyAccount')}
          </button>
        </div>

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('profile.deleteAccountConfirmTitle')}</h3>
              </div>

              <p className="text-gray-600 text-sm mb-4">
                {t('profile.deleteAccountPermanent')}
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1 list-disc list-inside">
                <li>{t('profile.deleteDataProfile')}</li>
                <li>{t('profile.deleteDataMedicines')}</li>
                <li>{t('profile.deleteDataAlarms')}</li>
                <li>{t('profile.deleteDataAnalytics')}</li>
              </ul>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {t('profile.typeDeleteConfirm')} <span className="font-bold text-red-600">DELETE</span>
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20"
                    placeholder="DELETE"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    {t('profile.enterPasswordConfirm')}
                  </label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20"
                    placeholder={t('profile.yourPassword')}
                  />
                </div>
              </div>

              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                  <p className="text-sm text-red-700">{deleteError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-sm font-medium"
                  disabled={deleting}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirmText !== "DELETE" || !deletePassword}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? t('profile.deleting') : t('profile.permanentlyDelete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default Profile;
