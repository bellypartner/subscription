import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { useState, useEffect, useRef } from "react";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import CustomerProfile from "./pages/CustomerProfile";
import KitchenDashboard from "./pages/KitchenDashboard";
import DeliveryDashboard from "./pages/DeliveryDashboard";
import SalesManagerDashboard from "./pages/SalesManagerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CityManagerDashboard from "./pages/CityManagerDashboard";
import DeliveryTracking from "./pages/DeliveryTracking";
import SubscriptionManagement from "./pages/SubscriptionManagement";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function AuthCallback() {
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const hash = window.location.hash;
      const sessionId = new URLSearchParams(hash.substring(1)).get("session_id");

      if (!sessionId) {
        setError("No session ID found");
        return;
      }

      try {
        const response = await fetch(`${API}/auth/google-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId }),
          credentials: "include",
        });

        if (!response.ok) throw new Error("Auth failed");

        const user = await response.json();
        
        const roleRoutes = {
          super_admin: "/super-admin",
          admin: "/admin",
          sales_manager: "/sales",
          sales_executive: "/sales",
          city_manager: "/city-manager",
          kitchen_manager: "/kitchen",
          delivery_boy: "/delivery",
          customer: "/dashboard",
        };
        
        window.location.href = roleRoutes[user.role] || "/dashboard";
      } catch (err) {
        setError(err.message);
      }
    };

    processAuth();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-destructive mb-4">Authentication failed: {error}</p>
          <a href="/login" className="text-primary hover:underline">Back to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Not authenticated");
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user must change password
  if (user?.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const roleRoutes = {
      super_admin: "/super-admin",
      admin: "/admin",
      sales_manager: "/sales",
      sales_executive: "/sales",
      city_manager: "/city-manager",
      kitchen_manager: "/kitchen",
      delivery_boy: "/delivery",
      customer: "/dashboard",
    };
    return <Navigate to={roleRoutes[user?.role] || "/dashboard"} replace />;
  }

  return typeof children === "function" ? children({ user }) : children;
}

function AppRouter() {
  const location = useLocation();

  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      
      {/* Customer Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={["customer"]}>
          {({ user }) => <CustomerDashboard user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={["customer"]}>
          {({ user }) => <CustomerProfile user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute allowedRoles={["customer"]}>
          {({ user }) => <SubscriptionManagement user={user} />}
        </ProtectedRoute>
      } />
      <Route path="/tracking/:deliveryId" element={
        <ProtectedRoute allowedRoles={["customer"]}>
          {({ user }) => <DeliveryTracking user={user} />}
        </ProtectedRoute>
      } />
      
      {/* Kitchen Manager Routes */}
      <Route path="/kitchen" element={
        <ProtectedRoute allowedRoles={["kitchen_manager", "super_admin", "admin"]}>
          {({ user }) => <KitchenDashboard user={user} />}
        </ProtectedRoute>
      } />
      
      {/* Delivery Boy Routes */}
      <Route path="/delivery" element={
        <ProtectedRoute allowedRoles={["delivery_boy", "super_admin", "admin"]}>
          {({ user }) => <DeliveryDashboard user={user} />}
        </ProtectedRoute>
      } />
      
      {/* Sales Routes */}
      <Route path="/sales" element={
        <ProtectedRoute allowedRoles={["sales_manager", "sales_executive", "super_admin", "admin"]}>
          {({ user }) => <SalesManagerDashboard user={user} />}
        </ProtectedRoute>
      } />
      
      {/* City Manager Routes */}
      <Route path="/city-manager" element={
        <ProtectedRoute allowedRoles={["city_manager", "super_admin", "admin"]}>
          {({ user }) => <CityManagerDashboard user={user} />}
        </ProtectedRoute>
      } />
      
      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
          {({ user }) => <AdminDashboard user={user} />}
        </ProtectedRoute>
      } />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={
        <ProtectedRoute allowedRoles={["super_admin"]}>
          {({ user }) => <SuperAdminDashboard user={user} />}
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

export default App;
