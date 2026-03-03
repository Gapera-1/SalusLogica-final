import React, { useState, useEffect, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { authAPI } from "./services/api";
import { LanguageProvider } from "./i18n";
import { ThemeProvider } from "./contexts/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";

/* ================= PAGES ================= */
const Login = React.lazy(() => import("./pages/Login"));
const Signup = React.lazy(() => import("./pages/Signup"));
const Home = React.lazy(() => import("./pages/Home"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const MedicineList = React.lazy(() => import("./pages/MedicineList"));
const AddMedicine = React.lazy(() => import("./pages/AddMedicine"));
const Profile = React.lazy(() => import("./pages/Profile"));
const AnalyticsDashboard = React.lazy(
  () => import("./pages/AnalyticsDashboard"),
);
const InteractionChecker = React.lazy(
  () => import("./pages/InteractionChecker"),
);
const DoseHistory = React.lazy(() => import("./pages/DoseHistory"));
const EditMedicine = React.lazy(() => import("./pages/EditMedicine"));
const ContraIndicationsPage = React.lazy(
  () => import("./pages/ContraIndicationsPage"),
);
const FoodAdvice = React.lazy(() => import("./pages/FoodAdvice"));
const SafetyCheck = React.lazy(() => import("./pages/SafetyCheck"));
const ExportReports = React.lazy(() => import("./pages/ExportReports"));
const SideEffectTracker = React.lazy(
  () => import("./pages/SideEffectTracker"),
);
const NotificationCenter = React.lazy(
  () => import("./pages/NotificationCenter"),
);
const VerifyEmail = React.lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/ResetPassword"));

/* ============ PHARMACY ADMIN ============ */
const PharmacyAdminDashboard = React.lazy(
  () => import("./pages/PharmacyAdminDashboard"),
);
const PharmacyAdminPatients = React.lazy(
  () => import("./pages/PharmacyAdminPatients"),
);
const PharmacyAdminAdverseReactions = React.lazy(
  () => import("./pages/PharmacyAdminAdverseReactions"),
);

/* ============ COMPONENTS ============ */
import AlarmContainer from "./components/AlarmContainer";
import ChatBot from "./components/ChatBot";

/* ================= ROLE HELPERS ================= */
const isPharmacyAdmin = (user) =>
  user && user.user_type === "pharmacy_admin";

/* ================= ROUTE HISTORY TRACKER ================= */
const RouteHistoryTracker = ({ isAuthenticated }) => {
  const location = useLocation();

  useEffect(() => {
    // Only save routes for authenticated users; do NOT clear on
    // unauthenticated — logout handler already handles that.
    // Clearing here would wipe the saved route before the user
    // can re-login and be returned to their previous page.
    if (
      isAuthenticated &&
      location.pathname !== "/" &&
      location.pathname !== "/login"
    ) {
      localStorage.setItem("lastVisitedRoute", location.pathname);
    }
  }, [location.pathname, isAuthenticated]);

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

          // Restore the route the user was on before refresh
          if (savedRoute && savedRoute !== "/") {
            setLastRoute(savedRoute);
          } else if (currentUser.user_type === "pharmacy_admin") {
            setLastRoute("/pharmacy-admin/dashboard");
          } else {
            setLastRoute("/dashboard");
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error("Auth error:", error);
        // Only clear tokens on actual auth failure (401), not throttling (429) or network errors
        if (error.status === 401) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user");
          setIsAuthenticated(false);
          setUser(null);
        } else if (localStorage.getItem("access_token")) {
          // For other errors (throttling, network), keep user logged in if token exists
          const savedUser = localStorage.getItem("user");
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser));
              setIsAuthenticated(true);
            } catch {
              setIsAuthenticated(false);
              setUser(null);
            }
          } else {
            // Token exists but no cached user - still consider authenticated
            setIsAuthenticated(true);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
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
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      localStorage.removeItem("lastVisitedRoute");
      setIsAuthenticated(false);
      setUser(null);
      setLastRoute(null);
    }
  };

  /* ========== LOADING SCREEN ========== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            {isAuthenticated && <AlarmContainer />}
            {isAuthenticated && <ChatBot />}
            <RouteHistoryTracker isAuthenticated={isAuthenticated} />

        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
        <Routes>
          {/* ================= PUBLIC ROUTES ================= */}

          <Route
            path="/"
            element={
              isAuthenticated && lastRoute ? (
                <Navigate to={lastRoute} replace />
              ) : isAuthenticated ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
                </div>
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

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

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
                <Dashboard user={user} handleLogout={handleLogout} setIsAuthenticated={setIsAuthenticated} />
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
                <MedicineList user={user} setIsAuthenticated={setIsAuthenticated} />
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
                <AddMedicine user={user} setIsAuthenticated={setIsAuthenticated} />
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
                <Profile user={user} setIsAuthenticated={setIsAuthenticated} />
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
                <AnalyticsDashboard user={user} setIsAuthenticated={setIsAuthenticated} />
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
                <InteractionChecker setIsAuthenticated={setIsAuthenticated} />
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
                <DoseHistory setIsAuthenticated={setIsAuthenticated} />
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
                <EditMedicine setIsAuthenticated={setIsAuthenticated} />
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
                <ContraIndicationsPage setIsAuthenticated={setIsAuthenticated} />
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
                <FoodAdvice setIsAuthenticated={setIsAuthenticated} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/safety-check"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <SafetyCheck setIsAuthenticated={setIsAuthenticated} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/export-reports"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient", "pharmacy_admin"]}
                redirectPath="/login"
              >
                <ExportReports setIsAuthenticated={setIsAuthenticated} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/side-effects"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <SideEffectTracker setIsAuthenticated={setIsAuthenticated} />
              </RoleProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <RoleProtectedRoute
                isAuthenticated={isAuthenticated}
                user={user}
                allowedRoles={["patient"]}
                redirectPath="/pharmacy-admin/dashboard"
              >
                <NotificationCenter setIsAuthenticated={setIsAuthenticated} />
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
                <PharmacyAdminDashboard user={user} setIsAuthenticated={setIsAuthenticated} />
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
                <PharmacyAdminPatients setIsAuthenticated={setIsAuthenticated} />
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
                <PharmacyAdminAdverseReactions setIsAuthenticated={setIsAuthenticated} />
              </RoleProtectedRoute>
            }
          />

          {/* ================= FALLBACK ================= */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </Router>
      </LanguageProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
