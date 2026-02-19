import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { useLanguage } from "../i18n";

const Login = ({ setIsAuthenticated, setUser }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember_me: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = t('login.emailRequired');
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = t('login.emailInvalid');
    }
    if (!formData.password.trim()) {
      newErrors.password = t('login.passwordRequired');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Use real backend API
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password
      });
      
      // Store authentication data
      localStorage.setItem("access_token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      
      setIsAuthenticated(true);
      setUser(response.user);
      
      // Redirect to saved route or default based on user type
      const savedRoute = localStorage.getItem("lastVisitedRoute");
      if (savedRoute && savedRoute !== "/" && savedRoute !== "/login") {
        navigate(savedRoute);
      } else if (response.user.user_type === 'pharmacy_admin') {
        navigate("/pharmacy-admin/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Login error:", error);
      const msg = error.message || t('login.invalidCredentials');
      // Detect email-not-verified error
      if (msg.toLowerCase().includes('not verified') || msg.toLowerCase().includes('verification')) {
        setShowResendVerification(true);
        setResendMessage("");
      } else {
        setShowResendVerification(false);
      }
      setErrors({ non_field: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8" style={{ background: 'var(--bg-page)' }}>
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div>
          <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900 tracking-tight">
            {t('login.signInToYourAccount')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-500">
            {t('common.or')} <a href="/signup" className="font-medium text-teal-600 hover:text-teal-500">
              {t('login.createNewAccount')}
            </a>
          </p>
        </div>
        
        <div className="hc-card">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.non_field && (
              <div className={`border rounded-md p-4 ${showResendVerification ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className={`h-5 w-5 ${showResendVerification ? 'text-yellow-400' : 'text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className={`text-sm font-medium ${showResendVerification ? 'text-yellow-800' : 'text-red-800'}`}>
                      {showResendVerification ? t('login.emailNotVerified') || 'Email Not Verified' : t('login.errorWithSubmission')}
                    </h3>
                    <div className={`mt-2 text-sm ${showResendVerification ? 'text-yellow-700' : 'text-red-700'}`}>
                      {errors.non_field}
                    </div>
                    {showResendVerification && (
                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={resendLoading}
                          onClick={async () => {
                            setResendLoading(true);
                            setResendMessage(null);
                            try {
                              await authAPI.resendVerification(formData.email);
                              setResendMessage({ text: t('emailVerification.verificationSent'), success: true });
                            } catch (err) {
                              setResendMessage({ text: err.message || t('emailVerification.resentFailedShort'), success: false });
                            } finally {
                              setResendLoading(false);
                            }
                          }}
                          className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                        >
                          {resendLoading ? t('emailVerification.sending') : t('emailVerification.resendVerification')}
                        </button>
                        {resendMessage && (
                          <p className={`mt-2 text-sm ${resendMessage.success ? 'text-green-700' : 'text-red-700'}`}>
                            {resendMessage.text}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t('forgotPassword.emailPlaceholder')}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {t('login.passwordField')}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`mt-1 block w-full px-3 py-2.5 border rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:text-sm transition-colors ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder={t('login.enterPassword')}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="remember_me"
                    name="remember_me"
                    checked={formData.remember_me}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-900">
                    {t('login.rememberMe')}
                  </label>
                </div>
                <div className="text-sm">
                  <Link to="/forgot-password" className="font-medium text-teal-600 hover:text-teal-500">
                    {t('login.forgotPassword')}
                  </Link>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                disabled={loading}
              >
                {loading ? t('login.signingIn') : t('login.signinButton')}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            {t('profile.adminAccess')} 
            <a href="#" className="font-medium text-teal-600 hover:text-teal-500">
              {t('profile.clickHere')}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
