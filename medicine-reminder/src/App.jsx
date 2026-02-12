import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { authAPI } from "./services/api";
import { LanguageProvider } from "./i18n";

/* ================= PAGES ================= */
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import MedicineList from "./pages/MedicineList";
import AddMedicine from "./pages/AddMedicine";
import Profile from "./pages/Profile";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import InteractionChecker from "./pages/InteractionChecker";
import DoseHistory from "./pages/DoseHistory";
import EditMedicine from "./pages/EditMedicine";
import ContraIndicationsPage from "./pages/ContraIndicationsPage";
import FoodAdvice from "./pages/FoodAdvice";

/* ============ PHARMACY ADMIN ============ */
import PharmacyAdminDashboard from "./pages/PharmacyAdminDashboard";
import PharmacyAdminPatients from "./pages/PharmacyAdminPatients";
import PharmacyAdminAdverseReactions from "./pages/PharmacyAdminAdverseReactions";

/* ============ COMPONENTS ============ */
import AlarmContainer from "./components/AlarmContainer";

/* ================= ROLE HELPERS ================= */
const isPharmacyAdmin = (user) =>
  user && user.user_type === "pharmacy_admin";

const isPatient = (user) =>
  user && user.user_type === "patient";

/* ================= ROUTE HISTORY TRACKER ================= */
const RouteHistoryTracker = ({ isAuthenticated }) => {
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && location.pathname !== "/") {
      localStorage.setItem("lastVisitedRoute", location.pathname);
    } else if (!isAuthenticated) {
      localStorage.removeItem("lastVisitedRoute");
    }
  }, [location, isAuthenticated]);

  return null;
};

/* ================= ROLE PROTECTED ROUTE ================= */
const RoleProtectedRoute = ({
  isAuthenticated,
  user,
  allowedRoles,
  redirectPath,
  children,
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user?.user_type)) {
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};

/* ================= MAIN APP ================= */

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRoute, setLastRoute] = useState(null);

  /* ========== CHECK AUTH ========== */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const savedRoute = localStorage.getItem("lastVisitedRoute");

        if (token) {
          const currentUser = await authAPI.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);

          // Smart redirect based on role
          if (currentUser.user_type === "pharmacy_admin") {
            setLastRoute(savedRoute || "/pharmacy-admin/dashboard");
          } else {
            setLastRoute(savedRoute || "/dashboard");
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth error:", error);
        localStorage.clear();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /* ========== LOGOUT ========== */
  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.clear();
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  /* ========== LOADING SCREEN ========== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <LanguageProvider>
      <Router>
        <AlarmContainer />
        <RouteHistoryTracker isAuthenticated={isAuthenticated} />

        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}

          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to={lastRoute} replace />
              ) : (
                <Home
                  setIsAuthenticated={setIsAuthenticated}
                  setUser={setUser}
                />
              )
            }
          />

          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate
                  to={
                    isPharmacyAdmin(user)
                      ? "/pharmacy-admin/dashboard"
                      : "/dashboard"
                  }
                  replace
                />
              ) : (
                <Login
                  setIsAuthenticated={setIsAuthenticated}
                  setUser={setUser}
                />
              )
            }
          />

          <Route
            path="/signup"
            element={
              isAuthenticated ? (
                <Navigate
                  to={
                    isPharmacyAdmin(user)
                      ? "/pharmacy-admin/dashboard"
                      : "/dashboard"
                  }
                  replace
                />
              ) : (
                <Signup
                  setIsAuthenticated={setIsAuthenticated}
                  setUser={setUser}
                />
              )
            }
          />

          {/* ================= PATIENT ROUTES ================= */}

          <Route
            path="/dashboard"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <Dashboard user={user} handleLogout={handleLogout} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/medicine-list"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <MedicineList user={user} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/add-medicine"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <AddMedicine user={user} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <Profile user={user} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <AnalyticsDashboard user={user} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/interaction-checker"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <InteractionChecker />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/dose-history"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <DoseHistory />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/edit-medicine/:id"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <EditMedicine />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/contra-indications/:name"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <ContraIndicationsPage />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/food-advice"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <FoodAdvice />
              </RoleProtectedRoute>
            }
          />

          {/* ================= ADMIN ROUTES ================= */}

          <Route
            path="/pharmacy-admin/dashboard"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["pharmacy_admin"]}
                redirectPath="/dashboard"
              >
                <PharmacyAdminDashboard user={user} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/pharmacy-admin/patients"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["pharmacy_admin"]}
                redirectPath="/dashboard"
              >
                <PharmacyAdminPatients />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/pharmacy-admin/adverse-reactions"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["pharmacy_admin"]}
                redirectPath="/dashboard"
              >
                <PharmacyAdminAdverseReactions />
              </RoleProtectedRoute>
            }
          />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;
