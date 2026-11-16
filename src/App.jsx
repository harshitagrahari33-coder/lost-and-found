import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Compass } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { ItemsProvider } from "@/lib/ItemsContext";
import AppLayout from "@/components/layout/AppLayout";
import LoginScreen from "@/components/auth/LoginScreen";
import Home from "@/pages/Home";
import AddItem from "@/pages/AddItem";
import ItemDetail from "@/pages/ItemDetail";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import NotFound from "@/pages/NotFound";

function AppRoutes() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-cream-surface shadow-card animate-pulse">
          <Compass className="h-6 w-6 text-accentGold" />
        </div>
        <p className="font-serif text-sm font-medium text-ink">Verifying campus session...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/item/:id" element={<ItemDetail />} />
        <Route
          path="/add"
          element={isAuthenticated ? <AddItem /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/profile"
          element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={
            currentUser?.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ItemsProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </ItemsProvider>
    </AuthProvider>
  );
}
