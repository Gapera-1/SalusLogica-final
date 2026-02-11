import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { authAPI } from "./services/api";
import { LanguageProvider } from "./i18n";

import AuthPage from "./pages/AuthPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AppPage from "./pages/AppPage";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MedicineList from "./pages/MedicineList";
import AddMedicine from "./pages/AddMedicine";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import InteractionChecker from "./pages/InteractionChecker";
import DoseHistory from "./pages/DoseHistory";
import EditMedicine from "./pages/EditMedicine";
import NotificationCenter from "./pages/NotificationCenter";
import ContraIndicationsPage from "./pages/ContraIndicationsPage";
import AlarmContainer from "./components/AlarmContainer";
import SafetyCheck from "./pages/SafetyCheck";
import FoodAdvice from "./pages/FoodAdvice";

// Route History Tracker Component
const RouteHistoryTracker = ({ isAuthenticated }) => {
  const location = useLocation();

  useEffect(() => {
    // Save the current path for authenticated users
    if (isAuthenticated && location.pathname !== "/") {
      localStorage.setItem("lastVisitedRoute", location.pathname);
      console.log("Saved route:", location.pathname);
    } else if (!isAuthenticated) {
      // Clear saved route for unauthenticated users
      localStorage.removeItem("lastVisitedRoute");
    }
  }, [location, isAuthenticated]);

  return null;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRoute, setLastRoute] = useState(null);

  // Check authentication status with backend
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Get the last visited route before processing
        const savedRoute = localStorage.getItem("lastVisitedRoute");
        
        const token = localStorage.getItem("access_token");
        if (token) {
          // Verify token with backend
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
          
          // Set the last route if available, otherwise use dashboard
          setLastRoute(savedRoute || "/dashboard");
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setLastRoute(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        // Clear invalid token
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
        localStorage.removeItem("lastVisitedRoute");
        setIsAuthenticated(false);
        setUser(null);
        setLastRoute(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLogout = () => {
    authAPI.logout().then(() => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      localStorage.removeItem("lastVisitedRoute");
      setIsAuthenticated(false);
      setUser(null);
    }).catch(error => {
      console.error("Logout error:", error);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <LanguageProvider>
      <Router>
        {/* Global Alarm Container */}
        <AlarmContainer />
        
        {/* Route History Tracker */}
        <RouteHistoryTracker isAuthenticated={isAuthenticated} />
        
        <Routes>
          {/* ==================== PUBLIC ROUTES =================== */}
        
        {/* Home/Landing Page */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={lastRoute || "/dashboard"} replace />
            ) : (
              <Home setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            )
          }
        />
        
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
            )
          }
        />
        
        <Route
          path="/signup"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Signup setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
            )
          }
        />

        <Route
          path="/home"
          element={
            isAuthenticated ? (
              <Home setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Protected App Page */}
        <Route
          path="/app"
          element={
            isAuthenticated ? (
              <AppPage setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* =================== PROTECTED ROUTES ================== */}
        
        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Dashboard setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Medicine List */}
        <Route
          path="/medicine-list"
          element={
            isAuthenticated ? (
              <MedicineList setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Add Medicine */}
        <Route
          path="/add-medicine"
          element={
            isAuthenticated ? (
              <AddMedicine setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Safety Check */}
        <Route
          path="/safety-check"
          element={
            isAuthenticated ? (
              <SafetyCheck setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Food Advice */}
        <Route
          path="/food-advice"
          element={
            isAuthenticated ? (
              <FoodAdvice setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Profile */}
        <Route
          path="/profile"
          element={
            isAuthenticated ? (
              <Profile setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Notifications */}
        <Route
          path="/notifications"
          element={
            isAuthenticated ? (
              <Notifications setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Contra Indications - Fixed with auth guard */}
        <Route 
          path="/contra-indications/:name" 
          element={
            isAuthenticated ? (
              <ContraIndicationsPage />
            ) : (
              <Navigate to="/" replace />
            )
          } 
        />

        {/* Analytics Dashboard */}
        <Route
          path="/analytics"
          element={
            isAuthenticated ? (
              <AnalyticsDashboard setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Interaction Checker */}
        <Route
          path="/interaction-checker"
          element={
            isAuthenticated ? (
              <InteractionChecker setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Dose History */}
        <Route
          path="/dose-history"
          element={
            isAuthenticated ? (
              <DoseHistory setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Edit Medicine */}
        <Route
          path="/edit-medicine/:id"
          element={
            isAuthenticated ? (
              <EditMedicine setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Notification Center */}
        <Route
          path="/notification-center"
          element={
            isAuthenticated ? (
              <NotificationCenter setIsAuthenticated={setIsAuthenticated} setUser={setUser} user={user} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
        
        {/* Debug Test Route */}
        <Route 
          path="/test-routing" 
          element={
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <h1>🎯 Routing Test Successful!</h1>
              <p>If you can see this page, React Router is working correctly.</p>
              <button 
                onClick={() => window.history.back()}
                style={{ padding: '10px 20px', background: '#3B82F6', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
              >
                Go Back
              </button>
            </div>
          } 
        />
      </Routes>
    </Router>
    </LanguageProvider>
  );
}

export default App;
